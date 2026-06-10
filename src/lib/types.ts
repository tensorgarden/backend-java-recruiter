export type CandidateStatus =
  | "sourced"
  | "screening"
  | "coding_assessment"
  | "system_design"
  | "team_interview"
  | "offer"
  | "hired"
  | "declined"
  | "withdrawn";

export type SeniorityLevel = "junior" | "mid" | "senior" | "staff" | "principal";

export type SourceChannel =
  | "linkedin"
  | "referral"
  | "github"
  | "stack_overflow"
  | "agency"
  | "inbound"
  | "conference";

export type AssessmentType = "coding" | "system_design" | "behavioral" | "take_home";

export type AssessmentResult = "pass" | "marginal" | "fail" | "pending";

export interface Candidate {
  id: string;
  fullName: string;
  currentRole: string;
  currentCompany: string;
  yearsExperience: number;
  seniority: SeniorityLevel;
  location: string;
  skills: string[];
  status: CandidateStatus;
  jobReqId: string;
  source: SourceChannel;
  aiMatchScore: number;
  expectedSalary: number;
  recruiterId: string;
  appliedAt: string;
  lastContactAt: string | null;
  notes: string;
}

export interface JobReq {
  id: string;
  title: string;
  department: string;
  seniority: SeniorityLevel;
  location: string;
  requiredSkills: string[];
  targetSalaryMin: number;
  targetSalaryMax: number;
  candidatesNeeded: number;
  hiredCount: number;
  openedAt: string;
  targetFillDate: string;
  status: "open" | "on_hold" | "closed";
  priority: "high" | "medium" | "low";
}

export interface Assessment {
  id: string;
  candidateId: string;
  type: AssessmentType;
  result: AssessmentResult;
  score: number;
  maxScore: number;
  grader: string;
  completedAt: string;
  notes: string;
}

export interface Recruiter {
  id: string;
  fullName: string;
  email: string;
  role: string;
  activeReqs: number;
  candidatesInPipeline: number;
  hiresThisQuarter: number;
  timeToFillAvg: number;
}

export interface Activity {
  id: string;
  candidateId: string;
  type: "message_sent" | "interview_scheduled" | "assessment_graded" | "offer_sent" | "feedback_received" | "note_added" | "status_change";
  timestamp: string;
  summary: string;
  outcome: "positive" | "neutral" | "negative";
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  candidateCount: number;
  passRate: number;
}

export interface Analytics {
  activeReqs: number;
  totalCandidates: number;
  avgTimeToFill: number;
  offerAcceptanceRate: number;
  assessmentPassRate: number;
  interviewsThisWeek: number;
  avgMatchScore: number;
  pipelineValue: number;
}
