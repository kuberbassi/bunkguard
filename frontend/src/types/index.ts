export interface User {
    email: string;
    name: string;
    picture?: string;
}

export interface Subject {
    _id: string;
    owner_email: string;
    name: string;
    semester: number;
    attended: number;
    total: number;
    professor?: string;
    classroom?: string;
    created_at: string;
}

export interface AttendanceLog {
    _id: string;
    owner_email: string;
    subject_id: string;
    date: string;
    status: 'present' | 'absent' | 'pending_medical' | 'approved_medical' | 'substituted' | 'substitution_resolved';
    timestamp: string;
    semester: number;
    notes?: string;
    subject_info?: Subject;
}

export interface AcadHubStatus {
    status: 'safe' | 'danger' | 'neutral';
    status_message: string;
    percentage: number;
}

export interface SubjectOverview extends AcadHubStatus {
    id: string;
    name: string;
}

export interface DashboardData {
    current_date: string;
    overall_attendance: number;
    subjects_overview: SubjectOverview[];
}

export interface ReportsKPI {
    best_subject_name: string;
    best_subject_percent: string;
    worst_subject_name: string;
    worst_subject_percent: string;
    total_absences: number;
    streak: number;
}

export interface ReportsData {
    kpis: ReportsKPI;
    subject_breakdown: Array<Subject & { percentage: number }>;
    heatmap_data: Record<string, string[]>;
}

export interface Deadline {
    _id: string;
    owner_email: string;
    title: string;
    due_date: string;
    completed: boolean;
    created_at: string;
}

export interface Holiday {
    _id: string;
    owner_email: string;
    date: string;
    name: string;
}

export interface TimetableSlot {
    _id?: string;
    day: string;
    start_time: string;
    end_time: string;
    subject_id: string;
    subject_name?: string;
    type?: string;
    label?: string;
}

export type TimetableSchedule = Record<string, TimetableSlot[]>;

export interface Preferences {
    attendance_threshold?: number;
    warning_threshold?: number;
    counting_mode?: 'classes' | 'percentage';
    notifications_enabled?: boolean;
    accent_color?: string;
    threshold?: number; // legacy
}
