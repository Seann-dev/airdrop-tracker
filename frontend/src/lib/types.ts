// Types generated from openapi.yaml (single API contract)
export type AirdropStatus = 'Watching' | 'Active' | 'Completed' | 'Claimed' | 'Not eligible';

export interface TaskItem {
  id: string;
  title: string;
  done: boolean;
}

export interface Airdrop {
  id: string;
  projectName: string;
  network: string;
  status: AirdropStatus;
  deadline: string | null;
  officialLink: string;
  category: string;
  notes: string;
  tasks: TaskItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AirdropCreate {
  projectName: string;
  network?: string;
  status?: AirdropStatus;
  deadline?: string | null;
  officialLink?: string;
  category?: string;
  notes?: string;
  tasks?: TaskItem[];
}

export type AirdropUpdate = Partial<AirdropCreate>;

export interface ImportRecord extends AirdropCreate {
  legacyId: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
}

export interface Summary {
  total: number;
  active: number;
  completed: number;
  upcomingDeadlines: number;
  byStatus: Record<string, number>;
}

export interface Draft {
  projectName: string;
  description: string;
  officialLink: string;
  deadline: string | null;
  tasks: TaskItem[];
  foundDeadline: boolean;
  foundTasks: boolean;
  sourceAttribution: string;
}

export const STATUSES: AirdropStatus[] = ['Watching', 'Active', 'Completed', 'Claimed', 'Not eligible'];
