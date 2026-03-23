export type Severity = 'Critical' | 'Warning' | 'Informational';
export type ComplianceStatus = 'COMPLETE' | 'INCOMPLETE' | 'RESOLVED' | 'FLAGGED';
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';
export type AlertStatus = 'Pending' | 'Completed';
export type UserRole = 'Doctor' | 'Nurse' | 'MRD Officer';
export type RecordStatus = 'Processing' | 'Completed' | 'Failed';

export interface PatientInfo {
  name: string;
  age: string;
  gender: string;
  id: string;
  admissionDate: string;
  confidence?: ConfidenceLevel;
}

export interface Medication {
  id: string;
  drugName: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  alertTimes: { time: string; status: AlertStatus }[];
  confidence?: ConfidenceLevel;
}

export interface MRDItem {
  id: string;
  field: string;
  status: ComplianceStatus;
  severity: Severity;
  description: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export interface Vitals {
  bp?: string;
  pulse?: string;
  temp?: string;
  spo2?: string;
  respRate?: string;
  weight?: string;
}

export interface AnalysisResult {
  transcription: string;
  patientInfo: PatientInfo;
  vitals?: Vitals;
  medications: Medication[];
  mrdCompliance: MRDItem[];
  notes: string;
  overallConfidence: number;
}

export interface ClinicalRecord {
  id: string;
  fileName: string;
  imageUrl: string;
  status: RecordStatus;
  mrdStatus: ComplianceStatus;
  lastUpdated: string;
  data: AnalysisResult | null;
  auditLogs: AuditLog[];
}
