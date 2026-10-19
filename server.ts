import express, { Request, Response } from 'express';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(parsed)) return parsed;
  }
  return Number(process.env.PORT) || 3000;
}

const PORT = getPort();
app.use(express.json());

// Initialize SQLite Database
const dbPath = path.resolve(__dirname, 'candidates.db');
const db = new DatabaseSync(dbPath);

// Create candidates table according to schema
db.exec(`
  CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'Applied',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Valid pipeline stages
const VALID_STAGES = [
  'Applied',
  'Screening',
  'Technical Interview',
  'Culture Fit',
  'Offer',
  'Rejected',
];

// Seed 10 initial candidates spread across all stages
const initialCandidates = [
  { name: 'Alex Rivera', email: 'alex.rivera@example.com', role: 'Full Stack Intern', stage: 'Applied' },
  { name: 'Samira Khan', email: 'samira.k@example.com', role: 'Software Engineer Intern', stage: 'Applied' },
  { name: 'Elena Rostova', email: 'elena.r@example.com', role: 'Frontend Engineer', stage: 'Screening' },
  { name: 'Lucas Silva', email: 'lucas.s@example.com', role: 'Full Stack Developer', stage: 'Screening' },
  { name: 'Marcus Chen', email: 'marcus.c@example.com', role: 'Backend Engineer (Python)', stage: 'Technical Interview' },
  { name: 'Priya Patel', email: 'priya.p@example.com', role: 'Full Stack Intern', stage: 'Technical Interview' },
  { name: 'David Kim', email: 'david.kim@example.com', role: 'DevOps / Cloud Specialist', stage: 'Culture Fit' },
  { name: 'Carlos Mendez', email: 'carlos.m@example.com', role: 'Mobile App Developer', stage: 'Culture Fit' },
  { name: 'Maya Lin', email: 'maya.lin@example.com', role: 'UI/UX Systems Engineer', stage: 'Offer' },
  { name: 'Jordan Hayes', email: 'jordan.h@example.com', role: 'QA Automation Intern', stage: 'Rejected' },
];

const existingCountRow = db.prepare('SELECT COUNT(*) as count FROM candidates').get() as { count: number };
if (!existingCountRow || existingCountRow.count < 10) {
  const seedStmt = db.prepare(`
    INSERT OR IGNORE INTO candidates (name, email, role, stage, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);

  for (const c of initialCandidates) {
    try {
      seedStmt.run(c.name, c.email, c.role, c.stage);
    } catch {
      // Ignore conflict on seed
    }
  }
}

// ========================================================
// 5 REST Endpoints (Routed to both / and /api/ prefixes)
// ========================================================

// 1. POST /candidates - Add candidate
const handleCreateCandidate = (req: Request, res: Response) => {
  const { name, email, role, stage } = req.body;

  if (!name || !name.trim() || !email || !email.trim() || !role || !role.trim()) {
    return res.status(400).json({ detail: 'Name, email, and role are required fields.' });
  }

  const cleanStage = stage ? stage.trim() : 'Applied';
  if (!VALID_STAGES.includes(cleanStage)) {
    return res.status(422).json({
      detail: `Invalid stage '${cleanStage}'. Must be one of: ${VALID_STAGES.join(', ')}`,
    });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Check email uniqueness
  const checkEmail = db.prepare('SELECT id FROM candidates WHERE LOWER(email) = ?').get(cleanEmail);
  if (checkEmail) {
    return res.status(400).json({ detail: 'A candidate with this email address already exists.' });
  }

  try {
    const insertStmt = db.prepare(`
      INSERT INTO candidates (name, email, role, stage, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);
    const result = insertStmt.run(name.trim(), cleanEmail, role.trim(), cleanStage);
    const newId = result.lastInsertRowid;

    const newCandidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(newId);
    return res.status(201).json(newCandidate);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message || 'Failed to insert candidate' });
  }
};

app.post('/candidates', handleCreateCandidate);
app.post('/api/candidates', handleCreateCandidate);

// 2. GET /candidates?search= - List & search candidates
const handleListCandidates = (req: Request, res: Response) => {
  const search = req.query.search as string | undefined;

  try {
    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      const query = db.prepare(`
        SELECT * FROM candidates
        WHERE LOWER(name) LIKE ? OR LOWER(role) LIKE ? OR LOWER(email) LIKE ?
        ORDER BY id DESC
      `);
      const candidates = query.all(term, term, term);
      return res.json(candidates);
    } else {
      const query = db.prepare('SELECT * FROM candidates ORDER BY id DESC');
      const candidates = query.all();
      return res.json(candidates);
    }
  } catch (err: any) {
    return res.status(500).json({ detail: err.message || 'Failed to retrieve candidates' });
  }
};

app.get('/candidates', handleListCandidates);
app.get('/api/candidates', handleListCandidates);

// 3. PUT /candidates/{id} - Update details or stage
const handleUpdateCandidate = (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ detail: 'Invalid candidate ID.' });
  }

  const existing = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ detail: `Candidate with ID ${id} not found.` });
  }

  const { name, email, role, stage } = req.body;

  let newStage = existing.stage;
  if (stage !== undefined) {
    if (!VALID_STAGES.includes(stage)) {
      return res.status(422).json({
        detail: `Invalid stage '${stage}'. Must be one of: ${VALID_STAGES.join(', ')}`,
      });
    }
    newStage = stage;
  }

  let newEmail = existing.email;
  if (email !== undefined && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail !== existing.email.toLowerCase()) {
      const emailConflict = db.prepare('SELECT id FROM candidates WHERE LOWER(email) = ? AND id != ?').get(cleanEmail, id);
      if (emailConflict) {
        return res.status(400).json({ detail: 'Another candidate with this email address already exists.' });
      }
      newEmail = cleanEmail;
    }
  }

  const newName = name !== undefined && name.trim() ? name.trim() : existing.name;
  const newRole = role !== undefined && role.trim() ? role.trim() : existing.role;

  try {
    const updateStmt = db.prepare(`
      UPDATE candidates
      SET name = ?, email = ?, role = ?, stage = ?
      WHERE id = ?
    `);
    updateStmt.run(newName, newEmail, newRole, newStage, id);

    const updated = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message || 'Failed to update candidate' });
  }
};

app.put('/candidates/:id', handleUpdateCandidate);
app.put('/api/candidates/:id', handleUpdateCandidate);

// 4. DELETE /candidates/{id} - Remove candidate
const handleDeleteCandidate = (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ detail: 'Invalid candidate ID.' });
  }

  const existing = db.prepare('SELECT id FROM candidates WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ detail: `Candidate with ID ${id} not found.` });
  }

  try {
    const deleteStmt = db.prepare('DELETE FROM candidates WHERE id = ?');
    deleteStmt.run(id);
    return res.json({ message: 'Candidate removed successfully', id });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message || 'Failed to delete candidate' });
  }
};

app.delete('/candidates/:id', handleDeleteCandidate);
app.delete('/api/candidates/:id', handleDeleteCandidate);

// 5. GET /dashboard - Candidate counts per stage
const handleGetDashboard = (_req: Request, res: Response) => {
  try {
    const stageCounts: Record<string, number> = {};
    for (const s of VALID_STAGES) {
      stageCounts[s] = 0;
    }

    const rows = db.prepare('SELECT stage, COUNT(*) as count FROM candidates GROUP BY stage').all() as Array<{ stage: string; count: number }>;
    let total = 0;

    for (const r of rows) {
      if (stageCounts[r.stage] !== undefined) {
        stageCounts[r.stage] = r.count;
      }
      total += r.count;
    }

    return res.json({
      total,
      stages: stageCounts,
    });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message || 'Failed to compute dashboard metrics' });
  }
};

app.get('/dashboard', handleGetDashboard);
app.get('/api/dashboard', handleGetDashboard);

// Read repository.md endpoint for the in-app documentation viewer
app.get('/api/repository-md', (_req: Request, res: Response) => {
  try {
    const repoPath = path.resolve(__dirname, 'repository.md');
    if (fs.existsSync(repoPath)) {
      const content = fs.readFileSync(repoPath, 'utf-8');
      return res.json({ content });
    }
    return res.status(404).json({ detail: 'repository.md not found' });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// Vite & Static file serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  VITE v8.3.0  ready in 150 ms\n`);
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://0.0.0.0:${PORT}/\n`);
  });
}

startServer();
