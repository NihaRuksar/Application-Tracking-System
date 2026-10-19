"""
Mini Applicant Tracking System (ATS) - FastAPI Backend
Implements the 5 core REST APIs with SQLite persistence and CORS support.
"""

from typing import List, Optional, Dict
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import Base, engine, get_db, init_db, Candidate

# Initialize database tables
init_db()

app = FastAPI(
    title="Mini ATS API",
    description="Applicant Tracking System REST API for intern assessment",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_STAGES = [
    "Applied",
    "Screening",
    "Technical Interview",
    "Culture Fit",
    "Offer",
    "Rejected",
]


# ==========================================
# Pydantic Schemas
# ==========================================

class CandidateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, example="Sarah Connor")
    email: EmailStr = Field(..., example="sarah.connor@example.com")
    role: str = Field(..., min_length=1, max_length=100, example="Full Stack Engineer")
    stage: Optional[str] = Field("Applied", example="Applied")


class CandidateCreate(CandidateBase):
    pass


class CandidateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    role: Optional[str] = Field(None, min_length=1, max_length=100)
    stage: Optional[str] = None


class CandidateResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    stage: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DashboardResponse(BaseModel):
    total: int
    stages: Dict[str, int]


# ==========================================
# Seed Initial Data on Startup (Helper)
# ==========================================

@app.on_event("startup")
def seed_initial_data():
    db = next(get_db())
    try:
        count = db.query(Candidate).count()
        if count == 0:
            sample_candidates = [
                Candidate(name="Alex Rivera", email="alex.rivera@example.com", role="Full Stack Intern", stage="Applied"),
                Candidate(name="Samira Khan", email="samira.k@example.com", role="Software Engineer Intern", stage="Applied"),
                Candidate(name="Elena Rostova", email="elena.r@example.com", role="Frontend Developer", stage="Screening"),
                Candidate(name="Lucas Silva", email="lucas.s@example.com", role="Full Stack Developer", stage="Screening"),
                Candidate(name="Marcus Chen", email="marcus.c@example.com", role="Backend Engineer (Python)", stage="Technical Interview"),
                Candidate(name="Priya Patel", email="priya.p@example.com", role="Full Stack Intern", stage="Technical Interview"),
                Candidate(name="David Kim", email="david.kim@example.com", role="DevOps / Cloud Specialist", stage="Culture Fit"),
                Candidate(name="Carlos Mendez", email="carlos.m@example.com", role="Mobile App Developer", stage="Culture Fit"),
                Candidate(name="Maya Lin", email="maya.lin@example.com", role="UI/UX Engineer", stage="Offer"),
                Candidate(name="Jordan Hayes", email="jordan.h@example.com", role="QA Automation Intern", stage="Rejected"),
            ]
            db.add_all(sample_candidates)
            db.commit()
    finally:
        db.close()


# ==========================================
# 5 Standard REST Endpoints
# ==========================================

# 1. POST /candidates - Add a new candidate
@app.post(
    "/candidates",
    response_model=CandidateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new candidate",
    tags=["Candidates"]
)
def create_candidate(candidate_in: CandidateCreate, db: Session = Depends(get_db)):
    # Validate stage if supplied
    if candidate_in.stage and candidate_in.stage not in VALID_STAGES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid stage '{candidate_in.stage}'. Must be one of: {', '.join(VALID_STAGES)}"
        )

    # Check for existing email to maintain unique constraint
    existing = db.query(Candidate).filter(Candidate.email == candidate_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A candidate with this email address already exists."
        )

    candidate = Candidate(
        name=candidate_in.name.strip(),
        email=candidate_in.email.strip().lower(),
        role=candidate_in.role.strip(),
        stage=candidate_in.stage or "Applied",
        created_at=datetime.utcnow()
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


# 2. GET /candidates?search= - List candidates with optional search
@app.get(
    "/candidates",
    response_model=List[CandidateResponse],
    status_code=status.HTTP_200_OK,
    summary="List and search candidates",
    tags=["Candidates"]
)
def list_candidates(
    search: Optional[str] = Query(None, description="Search keyword for name, role, or email"),
    db: Session = Depends(get_db)
):
    query = db.query(Candidate)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Candidate.name.ilike(term),
                Candidate.role.ilike(term),
                Candidate.email.ilike(term)
            )
        )
    return query.order_by(Candidate.id.desc()).all()


# 3. PUT /candidates/{id} - Update candidate details or stage
@app.put(
    "/candidates/{id}",
    response_model=CandidateResponse,
    status_code=status.HTTP_200_OK,
    summary="Update candidate details or stage",
    tags=["Candidates"]
)
def update_candidate(
    id: int,
    candidate_in: CandidateUpdate,
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.id == id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with ID {id} not found."
        )

    # Validate stage if being updated
    if candidate_in.stage is not None:
        if candidate_in.stage not in VALID_STAGES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid stage '{candidate_in.stage}'. Must be one of: {', '.join(VALID_STAGES)}"
            )
        candidate.stage = candidate_in.stage

    # Check for email conflict if email changed
    if candidate_in.email is not None and candidate_in.email.strip().lower() != candidate.email:
        email_clean = candidate_in.email.strip().lower()
        conflict = db.query(Candidate).filter(Candidate.email == email_clean, Candidate.id != id).first()
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Another candidate with this email address already exists."
            )
        candidate.email = email_clean

    if candidate_in.name is not None:
        candidate.name = candidate_in.name.strip()

    if candidate_in.role is not None:
        candidate.role = candidate_in.role.strip()

    db.commit()
    db.refresh(candidate)
    return candidate


# 4. DELETE /candidates/{id} - Remove candidate
@app.delete(
    "/candidates/{id}",
    status_code=status.HTTP_200_OK,
    summary="Remove a candidate",
    tags=["Candidates"]
)
def delete_candidate(id: int, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with ID {id} not found."
        )

    db.delete(candidate)
    db.commit()
    return {"message": "Candidate removed successfully", "id": id}


# 5. GET /dashboard - Get candidate counts per stage
@app.get(
    "/dashboard",
    response_model=DashboardResponse,
    status_code=status.HTTP_200_OK,
    summary="Get candidate counts per pipeline stage",
    tags=["Dashboard"]
)
def get_dashboard(db: Session = Depends(get_db)):
    # Initialize all stages with count 0
    stage_counts = {stage: 0 for stage in VALID_STAGES}

    candidates = db.query(Candidate).all()
    total = len(candidates)

    for c in candidates:
        if c.stage in stage_counts:
            stage_counts[c.stage] += 1
        else:
            stage_counts[c.stage] = 1

    return {
        "total": total,
        "stages": stage_counts
    }
