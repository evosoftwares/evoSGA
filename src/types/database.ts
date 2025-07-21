export interface KanbanColumn {
  id: string;
  title: string;
  position: number;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  client_name?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  start_date?: string;
  deadline?: string;
  budget?: number;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  column_id: string;
  position: number;
  assignee?: string | null; // UUID referenciando profiles
  function_points: number;
  complexity: string; // Alterado para string ao invés do union type restritivo
  estimated_hours?: number;
  status_image_filenames: string[];
  project_id?: string | null;
  current_status_start_time?: string | null; // Novo campo para cronometragem
  last_column_id?: string | null; // Novo campo para controle
  last_assignee?: string | null; // Novo campo para controle
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  mentioned_users: string[];
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TaskTag {
  id: string;
  task_id: string;
  tag_id: string;
}

export interface FunctionPointsHistory {
  id: string;
  task_id: string;
  old_points?: number;
  new_points?: number;
  old_complexity?: string;
  new_complexity?: string;
  changed_by?: string;
  reason?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  entity_type: 'task' | 'project' | 'team_member' | 'column' | 'tag' | 'task_comment';
  entity_id: string;
  action_type: 'create' | 'update' | 'delete' | 'move';
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  changed_by?: string;
  user_id?: string;
  context?: Record<string, unknown>;
  created_at: string;
}

export interface UserPoints {
  id: string;
  user_id: string;
  total_points: number;
  created_at: string;
  updated_at: string;
}

export interface UserPointAward {
  id: string;
  user_id: string;
  task_id: string;
  points_awarded: number;
  awarded_at: string;
  task_title: string;
  task_complexity: string;
  from_column_id?: string;
  to_column_id: string;
  project_id?: string;
}

export interface UserPointsWithNames {
  id: string;
  user_id: string;
  user_name: string;
  email?: string;
  avatar?: string;
  total_points: number;
  created_at: string;
  updated_at: string;
  total_awards: number;
}

export interface UserPointAwardDetailed {
  id: string;
  user_id: string;
  user_name: string;
  task_id: string;
  task_title: string;
  points_awarded: number;
  task_complexity: string;
  awarded_at: string;
  from_column_name?: string;
  to_column_name: string;
  project_name?: string;
  project_color?: string;
}

// Sales System Types
export interface SalesColumn {
  id: string;
  title: string;
  position: number;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface SalesOpportunity {
  id: string;
  title: string;
  description?: string;
  column_id: string;
  position: number;
  assignee?: string | null;
  project_id?: string | null;
  
  // Sales-specific fields
  deal_value: number;
  currency: string;
  probability: number;
  expected_close_date?: string;
  source?: string;
  
  // Client information
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_company?: string;
  client_website?: string;
  client_industry?: string;
  
  // Status tracking
  lost_reason?: string;
  won_date?: string;
  lost_date?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
}



export interface SalesComment {
  id: string;
  opportunity_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface SalesActivity {
  id: string;
  opportunity_id: string;
  user_id: string;
  activity_type: 'call' | 'email' | 'meeting' | 'proposal_sent' | 'demo' | 'follow_up' | 'other';
  title?: string;
  description?: string;
  scheduled_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface SalesMetricsHistory {
  id: string;
  opportunity_id: string;
  user_id?: string;
  field_changed: string;
  old_value?: string;
  new_value?: string;
  changed_at: string;
}

// Sales Proposals Types
export interface SalesProposal {
  id: string;
  opportunity_id: string;
  
  // Proposal metadata
  title: string;
  version: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected';
  
  // Proposal content from AI generation
  executive_summary?: string;
  project_scope?: string;
  deliverables?: string[];
  timeline?: string;
  investment_text?: string;
  terms?: string;
  next_steps?: string;
  
  // IFPUG calculation data
  function_points?: any; // JSON object with function points analysis
  project_estimate?: any; // JSON object with project estimate
  
  // Team and pricing data
  team_experience: 'alpha' | 'beta' | 'omega';
  price_per_function_point?: number;
  total_price?: number;
  
  // PDF storage
  pdf_url?: string;
  pdf_filename?: string;
  
  // Tracking
  created_at: string;
  updated_at: string;
  created_by?: string;
  sent_at?: string;
  viewed_at?: string;
  responded_at?: string;
}

export interface ProposalDeliverable {
  id: string;
  proposal_id: string;
  deliverable_id: string;
  title: string;
  description?: string;
  price?: string;
  details?: string;
  selected: boolean;
  created_at: string;
}

export interface ProposalActivityLog {
  id: string;
  proposal_id: string;
  user_id?: string;
  activity_type: 'created' | 'updated' | 'sent' | 'viewed' | 'downloaded' | 'accepted' | 'rejected' | 'deleted' | 'status_changed';
  description?: string;
  metadata?: any; // JSON object with additional activity data
  created_at: string;
}

export interface ProposalSummary {
  id: string;
  title: string;
  version: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected';
  total_price?: number;
  team_experience: 'alpha' | 'beta' | 'omega';
  created_at: string;
  sent_at?: string;
  viewed_at?: string;
  opportunity_title?: string;
  client_name?: string;
  client_company?: string;
  created_by_name?: string;
  deliverable_count?: number;
}
