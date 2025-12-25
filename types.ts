
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

export interface Student extends AuditFields {
  id: string;
  name: string;
  grade: string;
  diagnoses: string[];
  goals: Goal[];
  isActive: boolean; // Added to handle student status
  lastSeen?: string;
  milestonePrediction?: MilestonePrediction;
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

export type View = 'home' | 'dashboard' | 'students' | 'notes' | 'planner' | 'profile' | 'onboarding';
