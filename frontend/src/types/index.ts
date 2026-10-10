export type ProjectStatus = 
  | 'Researching' 
  | 'Watchlist' 
  | 'Active' 
  | 'Paused' 
  | 'Snapshot' 
  | 'Claim Open' 
  | 'Completed' 
  | 'Abandoned';

export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type TaskCategory = 
  | 'Social' 
  | 'Community' 
  | 'Testnet' 
  | 'On-chain' 
  | 'Swap' 
  | 'Bridge' 
  | 'Staking' 
  | 'Governance' 
  | 'Referral' 
  | 'Daily check-in' 
  | 'Weekly activity' 
  | 'Quest' 
  | 'Claim' 
  | 'Other';

export interface User {
  id: number;
  username: string;
  telegram_id?: string;
  telegram_username?: string;
  created_at: string;
}

export interface Project {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  official_website?: string;
  campaign_url?: string;
  platform?: string;
  blockchain?: string;
  category?: string;
  status: ProjectStatus;
  priority: Priority;
  start_date?: string;
  deadline?: string;
  reward_info?: string;
  eligibility_reqs?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  last_checked_at?: string;
  tasks_count?: number;
  completed_tasks_count?: number;
}

export interface Task {
  id: number;
  project_id: number;
  user_id: number;
  title: string;
  description?: string;
  category: TaskCategory;
  source_url?: string;
  original_task_url?: string;
  is_completed: boolean;
  deadline?: string;
  recurrence: 'None' | 'Daily' | 'Weekly' | 'Monthly';
  reward_info?: string;
  confidence_score: number;
  verification_status: 'Verified' | 'Partially verified' | 'Inferred' | 'Unknown' | 'Conflicting sources';
  actionability?: 'Actionable' | 'Informational' | 'Review Required';
  evidence_snippet?: string;
  extraction_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ExtractedTaskPreview {
  title: string;
  description?: string;
  category?: TaskCategory;
  source_url?: string;
  deadline?: string;
  recurrence?: 'None' | 'Daily' | 'Weekly' | 'Monthly';
  reward_info?: string;
  confidence_score: number;
  verification_status: string;
  actionability?: 'Actionable' | 'Informational' | 'Review Required';
  evidence_snippet?: string;
  extraction_method?: string;
}

export interface ScanPreviewResponse {
  url: string;
  normalized_url: string;
  platform: string;
  project_name: string;
  description?: string;
  official_website?: string;
  blockchain?: string;
  category?: string;
  deadline?: string;
  deadline_status: string;
  reward_info?: string;
  eligibility_reqs?: string;
  status_code: string;
  confidence_score: number;
  tasks: ExtractedTaskPreview[];
  source_attribution: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  project_id?: number;
  task_id?: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface DashboardStats {
  total_projects: number;
  active_projects: number;
  watchlist_projects: number;
  completed_projects: number;
  total_tasks: number;
  pending_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  tasks_due_today: number;
}

export interface FarmingCost {
  id: number;
  project_id: number;
  user_id: number;
  type: 'gas' | 'bridge' | 'tx_fee' | 'other';
  amount_usd?: number;
  native_amount?: number;
  native_currency?: string;
  tx_hash?: string;
  created_at: string;
}
