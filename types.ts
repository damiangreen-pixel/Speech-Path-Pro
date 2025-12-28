
export interface Goal {
  text: string;
  isPrimary: boolean;
  masteryPercentage?: number; // Calculated progress
}

export interface AuditFields {
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type CuingLevel = 'Maximal' | 'Moderate' | 'Minimal' | 'Independent';
export type TaskSetting = 'Structured' | 'Spontaneous';

export interface SessionMetrics {
  accuracy: number;
  totalTrials: number;
  cuingLevel: CuingLevel;
  setting: TaskSetting;
  focusGoalId: string;
}

export interface MilestonePrediction {
  predictedDate: string;
  confidence: number;
  rationale: string;
}

export interface AvatarConfig {
  bgColor: string;
  shape: 'circle' | 'rounded' | 'squircle' | 'hexagon';
  icon: string;
}

export interface Student extends AuditFields {
  id: string;
  name: string;
  grade: string;
  diagnoses: string[];
  goals: Goal[];
  isActive: boolean;
  lastSeen?: string;
  milestonePrediction?: MilestonePrediction;
  avatarConfig?: AvatarConfig;
  customAvatarUrl?: string; // Base64 or URL
  severity: number; // 1-10 for Risk Matrix
  functionalImpact: number; // 1-10 for Risk Matrix
}

export interface SOAPNote extends AuditFields {
  id: string;
  studentId: string;
  groupSessionId?: string; // Links notes created in the same group session
  lessonPlanId?: string; 
  date: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  parentGuide?: string; 
  metrics?: SessionMetrics; 
}

export interface SessionAppointment extends AuditFields {
  id: string;
  studentIds: string[]; // Changed from studentId to studentIds for group support
  dateTime: string; // ISO string
  durationMinutes: number;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  linkedNoteIds?: string[]; // Multiple notes for a group session
  lessonPlanId?: string;
}

export interface LessonPlan extends AuditFields {
  id: string;
  title: string;
  targetGoal: string;
  gradeRange: string;
  materials: string[];
  procedure: string[];
}

export interface UserProfile {
  name: string;
  title: string;
  facility: string;
  initials: string;
  acceptedTermsDate?: string;
  micPermissionGranted?: boolean;
}

export type View = 'home' | 'dashboard' | 'students' | 'notes' | 'planner' | 'profile' | 'onboarding' | 'calendar';
