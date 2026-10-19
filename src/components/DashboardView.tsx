import React from 'react';
import { DashboardData, PipelineStage, ALL_STAGES } from '../types/candidate';
import { 
  Users, 
  UserCheck, 
  Briefcase, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  Filter,
  Layers,
  BarChart3
} from 'lucide-react';

interface DashboardViewProps {
  data: DashboardData | null;
  isLoading: boolean;
  onSelectStage: (stage: PipelineStage) => void;
  onNavigateToCandidates: () => void;
}

const STAGE_CONFIG: Record<
  PipelineStage, 
  { description: string; barColor: string; bgAccent: string; icon: React.ReactNode }
> = {
  Applied: {
    description: 'Initial applicant submissions awaiting review',
    barColor: 'bg-slate-400',
    bgAccent: 'bg-slate-100',
    icon: <Users className="w-4 h-4 text-slate-700" />,
  },
  Screening: {
    description: 'Recruiter resume check and preliminary call',
    barColor: 'bg-sky-500',
    bgAccent: 'bg-sky-50',
    icon: <Filter className="w-4 h-4 text-sky-700" />,
  },
  'Technical Interview': {
    description: 'In-depth engineering and coding assessment',
    barColor: 'bg-indigo-500',
    bgAccent: 'bg-indigo-50',
    icon: <Briefcase className="w-4 h-4 text-indigo-700" />,
  },
  'Culture Fit': {
    description: 'Team values alignment and behavioural evaluation',
    barColor: 'bg-amber-500',
    bgAccent: 'bg-amber-50',
    icon: <UserCheck className="w-4 h-4 text-amber-700" />,
  },
  Offer: {
    description: 'Formal employment offer delivered to candidate',
    barColor: 'bg-emerald-500',
    bgAccent: 'bg-emerald-50',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-700" />,
  },
  Rejected: {
    description: 'Archived applicants not proceeding at this time',
    barColor: 'bg-rose-500',
    bgAccent: 'bg-rose-50',
    icon: <XCircle className="w-4 h-4 text-rose-700" />,
  },
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  isLoading,
  onSelectStage,
  onNavigateToCandidates,
}) => {
  const total = data?.total || 0;
  const stages = data?.stages || {
    Applied: 0,
    Screening: 0,
    'Technical Interview': 0,
    'Culture Fit': 0,
    Offer: 0,
    Rejected: 0,
  };

  const activeInPipeline =
    (stages['Applied'] || 0) +
    (stages['Screening'] || 0) +
    (stages['Technical Interview'] || 0) +
    (stages['Culture Fit'] || 0);

  const offerCount = stages['Offer'] || 0;
  const rejectedCount = stages['Rejected'] || 0;

  // Percentage calculations
  const offerRate = total > 0 ? ((offerCount / total) * 100).toFixed(1) : '0';
  const rejectionRate = total > 0 ? ((rejectedCount / total) * 100).toFixed(1) : '0';

  // Find max count for relative bar scaling
  const maxStageCount = Math.max(...ALL_STAGES.map((s) => stages[s] || 0), 1);

  return (
    <div className="space-y-6">
      {/* 1. Summary Metric Cards: Total, Offer Rate, Rejection Rate, Active Pipeline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Candidates */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Total Candidates</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
              {isLoading ? '...' : total}
            </span>
            <span className="text-xs text-slate-500 font-medium">all applicants</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Total volume in recruitment database</p>
        </div>

        {/* Offer Rate (%) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Offer Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600 font-mono tabular-nums">
              {isLoading ? '...' : `${offerRate}%`}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({offerCount} {offerCount === 1 ? 'offer' : 'offers'})
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Percentage of candidates receiving offers</p>
        </div>

        {/* Rejection Rate (%) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Rejection Rate</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-rose-600 font-mono tabular-nums">
              {isLoading ? '...' : `${rejectionRate}%`}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({rejectedCount} {rejectedCount === 1 ? 'archived' : 'archived'})
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Candidates filtered or archived</p>
        </div>

        {/* Active Pipeline */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>In Pipeline</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-indigo-600 font-mono tabular-nums">
              {isLoading ? '...' : activeInPipeline}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {total > 0 ? `${Math.round((activeInPipeline / total) * 100)}%` : '0%'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Under active review or interviews</p>
        </div>
      </div>

      {/* 2. Simple Bar Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Candidates by Stage (Bar Chart)</h3>
              <p className="text-xs text-slate-500">Visual comparison of applicants across hiring stages</p>
            </div>
          </div>
          <button
            onClick={onNavigateToCandidates}
            className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <span>View Candidate Table</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bar Chart Container */}
        <div className="pt-4 pb-2">
          {total === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No candidates in the database.
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-48 border-b border-slate-200 px-2 pb-2">
              {ALL_STAGES.map((stg) => {
                const count = stages[stg] || 0;
                const config = STAGE_CONFIG[stg];
                // Scaled height percentage with minimum 8% for 0 count visibility
                const heightPercent = count === 0 ? 6 : Math.round((count / maxStageCount) * 85) + 10;

                return (
                  <div 
                    key={stg} 
                    onClick={() => onSelectStage(stg)}
                    className="flex flex-col items-center h-full justify-end group cursor-pointer"
                    title={`${stg}: ${count} candidate(s)`}
                  >
                    {/* Value Badge above bar */}
                    <div className="text-xs font-bold text-slate-800 font-mono tabular-nums mb-1 group-hover:scale-110 transition-transform">
                      {count}
                    </div>

                    {/* Bar Pill */}
                    <div className="w-full max-w-[48px] bg-slate-100 rounded-t-md overflow-hidden flex flex-col justify-end h-full">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full ${config.barColor} rounded-t-md transition-all duration-500 group-hover:opacity-90`}
                      />
                    </div>

                    {/* Label below bar */}
                    <div className="mt-2 text-center w-full">
                      <div className="text-[11px] font-medium text-slate-700 truncate group-hover:text-slate-900">
                        {stg === 'Technical Interview' ? 'Tech Interview' : stg}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. Stage Breakdown Cards (Candidates Per Stage) */}
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-900">Stage Breakdown Cards</h3>
          <p className="text-xs text-slate-500">Candidate counts per pipeline stage. Click any card to filter the candidate list.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALL_STAGES.map((stageName) => {
            const count = stages[stageName] || 0;
            const config = STAGE_CONFIG[stageName];
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;

            return (
              <div
                key={stageName}
                onClick={() => onSelectStage(stageName)}
                className="group bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-400 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${config.bgAccent} flex items-center justify-center shrink-0`}>
                      {config.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {stageName}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Stage #{ALL_STAGES.indexOf(stageName) + 1}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-medium text-slate-600 font-mono tabular-nums bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    {pct}%
                  </span>
                </div>

                <div className="mt-4 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
                      {isLoading ? '...' : count}
                    </span>
                    <span className="text-xs text-slate-500">
                      {count === 1 ? 'candidate' : 'candidates'}
                    </span>
                  </div>

                  <span className="text-xs font-medium text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all flex items-center gap-0.5">
                    Filter <ArrowRight className="w-3 h-3" />
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                  {config.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
