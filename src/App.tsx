import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api/client';
import { Candidate, CandidateCreateInput, CandidateUpdateInput, DashboardData, PipelineStage } from './types/candidate';
import { Navbar } from './components/Navbar';
import { CandidateTable } from './components/CandidateTable';
import { CandidateModal } from './components/CandidateModal';
import { DashboardView } from './components/DashboardView';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'candidates' | 'dashboard'>('candidates');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('All');
  
  // Modal states
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [candidateToEdit, setCandidateToEdit] = useState<Candidate | null>(null);

  // Notification toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Fetch dashboard counts
  const loadDashboardData = useCallback(async () => {
    try {
      const data = await api.getDashboard();
      setDashboardData(data);
    } catch (err: any) {
      console.error('Failed to load dashboard metrics:', err);
    }
  }, []);

  // Fetch candidates (with optional search)
  const loadCandidates = useCallback(async (query: string = '') => {
    setIsLoading(true);
    try {
      const data = await api.getCandidates(query);
      setCandidates(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load candidates', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadCandidates('');
    loadDashboardData();
  }, [loadCandidates, loadDashboardData]);

  // Debounced search query
  useEffect(() => {
    const timer = setTimeout(() => {
      loadCandidates(searchQuery);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, loadCandidates]);

  // Handle stage change directly from table dropdown
  const handleStageChange = async (id: number, newStage: PipelineStage) => {
    try {
      const updated = await api.updateCandidate(id, { stage: newStage });
      setCandidates((prev) =>
        prev.map((c) => (c.id === id ? { ...c, stage: updated.stage } : c))
      );
      loadDashboardData();
      showToast(`Stage changed to "${newStage}"`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update candidate stage', 'error');
      throw err;
    }
  };

  // Handle candidate add or edit submission
  const handleCandidateSubmit = async (data: CandidateCreateInput | CandidateUpdateInput) => {
    try {
      if (candidateToEdit) {
        // Edit mode (PUT /candidates/{id})
        const updated = await api.updateCandidate(candidateToEdit.id, data);
        setCandidates((prev) =>
          prev.map((c) => (c.id === candidateToEdit.id ? updated : c))
        );
        showToast('Candidate updated successfully', 'success');
      } else {
        // Add mode (POST /candidates)
        const created = await api.createCandidate(data as CandidateCreateInput);
        setCandidates((prev) => [created, ...prev]);
        showToast('Candidate added successfully', 'success');
      }
      loadDashboardData();
      setIsCandidateModalOpen(false);
      setCandidateToEdit(null);
    } catch (err: any) {
      throw err;
    }
  };

  // Handle candidate delete
  const handleDeleteCandidate = async (id: number) => {
    try {
      await api.deleteCandidate(id);
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      loadDashboardData();
      showToast('Candidate deleted successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete candidate', 'error');
      throw err;
    }
  };

  const handleEditClick = (candidate: Candidate) => {
    setCandidateToEdit(candidate);
    setIsCandidateModalOpen(true);
  };

  const handleAddClick = () => {
    setCandidateToEdit(null);
    setIsCandidateModalOpen(true);
  };

  // Navigating from Dashboard card or bar click to Candidates table with pre-selected stage filter
  const handleStageSelectFromDashboard = (stage: PipelineStage) => {
    setSelectedStageFilter(stage);
    setActiveTab('candidates');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 selection:bg-slate-900 selection:text-white">
      {/* 3-Zone Top Bar with ONLY single Add Candidate button */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
        }}
        onOpenAddModal={handleAddClick}
        totalCandidates={dashboardData?.total ?? candidates.length}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Context Banner */}
        <div className="mb-6 pb-4 border-b border-slate-200">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {activeTab === 'candidates' ? 'Candidate Pipeline' : 'Hiring Metrics Dashboard'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeTab === 'candidates'
              ? 'Manage applicant records, search candidates, and update hiring stages'
              : 'Pipeline distribution, stage counts, offer rate, and rejection metrics'}
          </p>
        </div>

        {/* Tab 1: Candidates View */}
        {activeTab === 'candidates' && (
          <CandidateTable
            candidates={candidates}
            isLoading={isLoading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedStageFilter={selectedStageFilter}
            onStageFilterChange={setSelectedStageFilter}
            onStageChange={handleStageChange}
            onEditCandidate={handleEditClick}
            onDeleteCandidate={handleDeleteCandidate}
          />
        )}

        {/* Tab 2: Dashboard View */}
        {activeTab === 'dashboard' && (
          <DashboardView
            data={dashboardData}
            isLoading={isLoading}
            onSelectStage={handleStageSelectFromDashboard}
            onNavigateToCandidates={() => {
              setSelectedStageFilter('All');
              setActiveTab('candidates');
            }}
          />
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-slate-200 bg-white/70 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <span>Mini ATS</span>
          <span>Applicant Tracking System</span>
        </div>
      </footer>

      {/* Add / Edit Candidate Modal */}
      <CandidateModal
        isOpen={isCandidateModalOpen}
        onClose={() => {
          setIsCandidateModalOpen(false);
          setCandidateToEdit(null);
        }}
        onSubmit={handleCandidateSubmit}
        candidateToEdit={candidateToEdit}
        existingCandidates={candidates}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg border text-xs font-medium bg-slate-900 text-white border-slate-800 animate-slide-up">
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
