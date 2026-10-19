export type PipelineStage =
  | 'Applied'
  | 'Screening'
  | 'Technical Interview'
  | 'Culture Fit'
  | 'Offer'
  | 'Rejected';

export const ALL_STAGES: PipelineStage[] = [
  'Applied',
  'Screening',
  'Technical Interview',
  'Culture Fit',
  'Offer',
  'Rejected',
];

export interface Candidate {
  id: number;
  name: string;
  email: string;
  role: string;
  stage: PipelineStage;
  created_at?: string;
}

export interface CandidateCreateInput {
  name: string;
  email: string;
  role: string;
  stage?: PipelineStage;
}

export interface CandidateUpdateInput {
  name?: string;
  email?: string;
  role?: string;
  stage?: PipelineStage;
}

export interface DashboardData {
  total: number;
  stages: Record<PipelineStage, number>;
}
