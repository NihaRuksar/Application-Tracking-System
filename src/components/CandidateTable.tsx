import React, { useState } from 'react';
import { Candidate, ALL_STAGES, PipelineStage } from '../types/candidate';
import { 
  Search, 
  Trash2, 
  Edit3, 
  ChevronDown,
  AlertTriangle,
  Loader2,
  X
} from 'lucide-react';

interface CandidateTableProps {
  candidates: Candidate[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStageFilter: string;
  onStageFilterChange: (stage: string) => void;
  onStageChange: (id: number, newStage: PipelineStage) => Promise<void>;
  onEditCandidate: (candidate: Candidate) => void;
  onDeleteCandidate: (id: number) => Promise<void>;
}

// Stage badge style mapping
const STAGE_STYLES: Record<PipelineStage, { bg: string; text: string; border: string; dot: string }> = {
  Applied: {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  },
  Screening: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    dot: 'bg-sky-500',
  },
  'Technical Interview': {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500',
  },
  'Culture Fit': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  Offer: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  Rejected: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
};

export const CandidateTable: React.FC<CandidateTableProps> = ({
  candidates,
  isLoading,
  searchQuery,
  onSearchChange,
  selectedStageFilter,
  onStageFilterChange,
  onStageChange,
  onEditCandidate,
  onDeleteCandidate,
}) => {
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingCandidateId, setUpdatingCandidateId] = useState<number | null>(null);

  // Search and stage filter work together simultaneously
  const filteredCandidates = candidates.filter((c) => {
    // 1. Stage filter check
    const matchesStage = selectedStageFilter === 'All' || c.stage === selectedStageFilter;
    
    // 2. Search query check (name, role, or email)
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || 
      c.name.toLowerCase().includes(query) ||
      c.role.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query);

    return matchesStage && matchesSearch;
  });

  const handleStageSelect = async (candidateId: number, newStage: PipelineStage) => {
    setUpdatingCandidateId(candidateId);
    try {
      await onStageChange(candidateId, newStage);
    } finally {
      setUpdatingCandidateId(null);
    }
  };

  const confirmDelete = async () => {
    if (!candidateToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteCandidate(candidateToDelete.id);
      setCandidateToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar & Quick Filter Chips */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        {/* Search Box */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search candidates by name, role, or email..."
            className="w-full pl-9 pr-9 py-2 text-sm bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 font-medium whitespace-nowrap mr-1">Stage:</span>
          <button
            onClick={() => onStageFilterChange('All')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
              selectedStageFilter === 'All'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            All <span className="font-mono text-[11px] opacity-80">({candidates.length})</span>
          </button>
          {ALL_STAGES.map((stg) => {
            const count = candidates.filter((c) => c.stage === stg).length;
            const isSelected = selectedStageFilter === stg;
            return (
              <button
                key={stg}
                onClick={() => onStageFilterChange(stg)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {stg} <span className="font-mono text-[11px] opacity-80">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Candidates Data Grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">ID</th>
                <th className="py-3 px-4">Candidate & Contact</th>
                <th className="py-3 px-4">Target Role</th>
                <th className="py-3 px-4 min-w-[200px]">Hiring Stage</th>
                <th className="py-3 px-4 hidden md:table-cell">Date Added</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                // Skeleton loading state
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3.5 px-4 text-center">
                      <div className="h-4 w-6 bg-slate-200 rounded mx-auto" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-4 w-32 bg-slate-200 rounded mb-1" />
                      <div className="h-3 w-44 bg-slate-100 rounded" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-4 w-28 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-7 w-36 bg-slate-200 rounded-lg" />
                    </td>
                    <td className="py-3.5 px-4 hidden md:table-cell">
                      <div className="h-4 w-20 bg-slate-100 rounded" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-6 w-16 bg-slate-200 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredCandidates.length === 0 ? (
                // Empty state: "No candidates found"
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                        <Search className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-semibold text-slate-900">No candidates found</h4>
                      <p className="text-xs text-slate-500">
                        {searchQuery || selectedStageFilter !== 'All'
                          ? 'No candidates matched your search or stage filter. Try adjusting your query.'
                          : 'Your candidate database is currently empty.'}
                      </p>
                      {(searchQuery || selectedStageFilter !== 'All') && (
                        <div className="pt-2 flex items-center justify-center">
                          <button
                            onClick={() => {
                              onSearchChange('');
                              onStageFilterChange('All');
                            }}
                            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            Reset Search & Filters
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                // Table rows
                filteredCandidates.map((candidate) => {
                  const stageStyle = STAGE_STYLES[candidate.stage] || STAGE_STYLES.Applied;
                  const isUpdating = updatingCandidateId === candidate.id;

                  return (
                    <tr
                      key={candidate.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* ID */}
                      <td className="py-3 px-4 text-center font-mono text-xs text-slate-600 tabular-nums">
                        #{candidate.id}
                      </td>

                      {/* Candidate Name & Email */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-semibold text-xs text-slate-700 shrink-0">
                            {candidate.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {candidate.name}
                            </div>
                            <div className="text-xs text-slate-500 font-mono">
                              {candidate.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Target Role */}
                      <td className="py-3 px-4">
                        <span className="text-slate-800 font-medium text-xs">
                          {candidate.role}
                        </span>
                      </td>

                      {/* Hiring Stage Dropdown */}
                      <td className="py-3 px-4">
                        <div className="relative inline-block w-full max-w-[190px]">
                          <select
                            value={candidate.stage}
                            disabled={isUpdating}
                            onChange={(e) => handleStageSelect(candidate.id, e.target.value as PipelineStage)}
                            className={`w-full appearance-none pl-3 pr-8 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${stageStyle.bg} ${stageStyle.text} ${stageStyle.border} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:opacity-50`}
                          >
                            {ALL_STAGES.map((s) => (
                              <option key={s} value={s} className="bg-white text-slate-900 py-1">
                                {s}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            {isUpdating ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Date Added */}
                      <td className="py-3 px-4 hidden md:table-cell text-xs text-slate-600 font-mono tabular-nums">
                        {formatDate(candidate.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditCandidate(candidate)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Edit Candidate Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setCandidateToDelete(candidate)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Delete Candidate"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Summary Count */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-t border-slate-200 text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold text-slate-900 font-mono tabular-nums">{filteredCandidates.length}</span> of{' '}
            <span className="font-semibold text-slate-900 font-mono tabular-nums">{candidates.length}</span> total applicants
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {candidateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-slate-900">Are you sure?</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to delete <span className="font-semibold text-slate-800">{candidateToDelete.name}</span> ({candidateToDelete.email})? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCandidateToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
