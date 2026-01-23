import api from './api';
import type {
    DashboardData,
    ReportsData,
    Subject,
    TimetableSchedule,
    Preferences,
    Holiday,
    SystemLog,
    AcademicRecord,
    SemesterResult
} from '@/types';

export const attendanceService = {
    // Preferences & Profile
    uploadPfp: async (formData: FormData): Promise<{ url: string }> => {
        const response = await api.post('/api/upload_pfp', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Dashboard
    getDashboardData: async (semester: number = 1): Promise<DashboardData> => {
        const response = await api.get(`/api/dashboard_data?semester=${semester}`);
        return response.data;
    },

    getDashboardSummary: async (semester: number = 1) => {
        const response = await api.get(`/api/dashboard_summary?semester=${semester}`);
        return response.data;
    },

    // Reports
    getReportsData: async (semester: number = 1): Promise<ReportsData> => {
        const response = await api.get(`/api/reports_data?semester=${semester}`);
        return response.data;
    },

    // Attendance logs
    getAttendanceLogs: async (page: number = 1, limit: number = 15) => {
        const response = await api.get(`/api/attendance_logs?page=${page}&limit=${limit}`);
        return response.data;
    },

    // Mark attendance
    markAttendance: async (
        subjectId: string,
        status: string,
        date?: string,
        notes?: string,
        substitutedById?: string // New param
    ): Promise<void> => {
        await api.post('/api/mark_attendance', {
            subject_id: subjectId,
            status,
            date,
            notes,
            substituted_by_id: substitutedById, // Send to backend
        });
    },

    markAllAttendance: async (
        subjectIds: string[],
        status: string,
        date?: string
    ): Promise<void> => {
        await api.post('/api/mark_all_attendance', {
            subject_ids: subjectIds,
            status,
            date,
        });
    },

    getCalendarData: async (year: number, month: number, semester?: number) => {
        const url = semester ? `/api/calendar_data?year=${year}&month=${month}&semester=${semester}` : `/api/calendar_data?year=${year}&month=${month}`;
        const response = await api.get(url);
        return response.data;
    },

    editAttendance: async (logId: string, status: string, notes?: string, date?: string): Promise<void> => {
        await api.post(`/api/edit_attendance/${logId}`, {
            status,
            notes,
            date
        });
    },

    deleteAttendance: async (logId: string): Promise<void> => {
        await api.delete(`/api/delete_attendance/${logId}`);
    },

    // Classes
    getTodaysClasses: async (): Promise<Subject[]> => {
        const response = await api.get('/api/todays_classes');
        return response.data;
    },

    getClassesForDate: async (date: string, semester?: number): Promise<Subject[]> => {
        const url = semester ? `/api/classes_for_date?date=${date}&semester=${semester}` : `/api/classes_for_date?date=${date}`;
        const response = await api.get(url);

        // Parse the date and get day name (Monday-first)
        const dateObj = new Date(date);
        const dayOfWeek = dateObj.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

        // Map to our timetable day names (Monday-first)
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[dayOfWeek];

        // Debug log to verify mapping
        console.log(`📅 Day mapping: ${date} → ${dayName} (dayOfWeek=${dayOfWeek})`);

        return response.data;
    },

    // Subjects
    getSubjects: async (semester: number = 1): Promise<Subject[]> => {
        const response = await api.get(`/api/subjects?semester=${semester}`);
        return response.data;
    },

    getFullSubjectsData: async (semester: number = 1): Promise<Subject[]> => {
        const response = await api.get(`/api/full_subjects_data?semester=${semester}`);
        return response.data;
    },

    getSubjectDetails: async (subjectId: string): Promise<Subject> => {
        const response = await api.get(`/api/subject_details/${subjectId}`);
        return response.data;
    },

    addSubject: async (
        subjectName: string,
        semester: number,
        categories?: string[],
        code?: string,
        professor?: string,
        classroom?: string
    ): Promise<void> => {
        await api.post('/api/add_subject', {
            subject_name: subjectName,
            semester,
            categories,
            code,
            professor,
            classroom
        });
    },

    deleteSubject: async (subjectId: string): Promise<void> => {
        await api.delete(`/api/delete_subject/${subjectId}`);
    },

    updateSubjectDetails: async (
        subjectId: string,
        professor?: string,
        classroom?: string
    ): Promise<void> => {
        await api.post('/api/update_subject_details', {
            subject_id: subjectId,
            professor,
            classroom,
        });
    },

    updateSubjectFullDetails: async (
        subjectId: string,
        data: Partial<Subject>
    ): Promise<void> => {
        await api.post('/api/update_subject_full_details', {
            subject_id: subjectId,
            ...data
        });
    },

    updateAttendanceCount: async (
        subjectId: string,
        attended: number,
        total: number
    ): Promise<void> => {
        await api.post('/api/update_attendance_count', {
            subject_id: subjectId,
            attended,
            total,
        });
    },

    updatePracticals: async (
        subjectId: string,
        data: { total?: number; completed?: number; hardcopy?: boolean }
    ): Promise<void> => {
        await api.put(`/api/subject/${subjectId}/practicals`, data);
    },

    updateAssignments: async (
        subjectId: string,
        data: { total?: number; completed?: number }
    ): Promise<void> => {
        await api.put(`/api/subject/${subjectId}/assignments`, data);
    },

    // Timetable
    // Timetable
    getTimetable: async (semester: number = 1): Promise<{ schedule: TimetableSchedule; periods?: any[] }> => {
        const response = await api.get(`/api/timetable?semester=${semester}`);
        return response.data;
    },

    saveTimetable: async (schedule: TimetableSchedule, semester: number = 1): Promise<void> => {
        await api.post(`/api/timetable?semester=${semester}`, { schedule });
    },

    saveTimetableStructure: async (periods: any[], semester: number = 1): Promise<void> => {
        await api.post(`/api/timetable/structure?semester=${semester}`, periods);
    },

    // New CRUD methods
    addTimetableSlot: async (slotData: any): Promise<void> => {
        await api.post('/api/timetable/slot', slotData);
    },

    updateTimetableSlot: async (slotId: string, slotData: any): Promise<void> => {
        await api.put(`/api/timetable/slot/${slotId}`, slotData);
    },

    deleteTimetableSlot: async (slotId: string, semester: number = 1): Promise<void> => {
        await api.delete(`/api/timetable/slot/${slotId}?semester=${semester}`);
    },


    getLogsForDate: async (date: string) => {
        const response = await api.get(`/api/logs_for_date?date=${date}`);
        return response.data;
    },

    // Analytics
    getDayOfWeekAnalytics: async (semester: number = 1) => {
        const response = await api.get(`/api/analytics/day_of_week?semester=${semester}`);
        return response.data;
    },

    getMonthlyAnalytics: async (semester: number = 1, year?: number) => {
        const response = await api.get(`/api/analytics/monthly_trend?year=${year || new Date().getFullYear()}&semester=${semester}`);
        return response.data;
    },

    getAllSemestersOverview: async () => {
        const response = await api.get('/api/all_semesters_overview');
        return response.data;
    },

    // Preferences
    getPreferences: async (): Promise<Preferences> => {
        const response = await api.get('/api/preferences');
        return response.data;
    },

    updatePreferences: async (preferences: Partial<Preferences>): Promise<void> => {
        await api.post('/api/preferences', preferences);
    },


    getHolidays: async (): Promise<Holiday[]> => {
        const response = await api.get('/api/holidays');
        return response.data;
    },

    addHoliday: async (date: string, name: string): Promise<void> => {
        await api.post('/api/holidays', { date, name });
    },

    deleteHoliday: async (holidayId: string): Promise<void> => {
        await api.delete(`/api/holidays/${holidayId}`);
    },

    // Medical leaves
    getPendingLeaves: async () => {
        const response = await api.get('/api/pending_leaves');
        return response.data;
    },

    approveLeave: async (logId: string): Promise<void> => {
        await api.post(`/api/approve_leave/${logId}`);
    },

    // Substitutions
    getUnresolvedSubstitutions: async () => {
        const response = await api.get('/api/unresolved_substitutions');
        return response.data;
    },

    markSubstituted: async (
        originalSubjectId: string,
        substituteSubjectId: string,
        date: string
    ): Promise<void> => {
        await api.post('/api/mark_substituted', {
            original_subject_id: originalSubjectId,
            substitute_subject_id: substituteSubjectId,
            date,
        });
    },

    // Data management
    exportData: async () => {
        const response = await api.get('/api/export_data', {
            responseType: 'blob',
        });
        return response.data;
    },

    importData: async (data: any): Promise<void> => {
        await api.post('/api/import_data', data);
    },

    deleteAllData: async () => {
        const response = await api.delete('/api/delete_all_data');
        return response.data;
    },

    // User Profile
    updateProfile: async (data: any) => {
        const response = await api.post('/api/update_profile', data);
        return response.data;
    },

    // System logs
    getSystemLogs: async (): Promise<SystemLog[]> => {
        const response = await api.get('/api/system_logs');
        return response.data;
    },

    // Academic Records
    getAcademicRecords: async (): Promise<AcademicRecord[]> => {
        const response = await api.get('/api/academic_records');
        return response.data;
    },

    updateAcademicRecord: async (data: AcademicRecord): Promise<void> => {
        await api.post('/api/update_academic_record', data);
    },

    // Semester Results (IPU Grading)
    getSemesterResults: async (): Promise<SemesterResult[]> => {
        const response = await api.get('/api/semester_results');
        return response.data;
    },

    getSemesterResult: async (semester: number): Promise<SemesterResult> => {
        const response = await api.get(`/api/semester_results/${semester}`);
        return response.data;
    },

    saveSemesterResult: async (data: Omit<SemesterResult, '_id' | 'timestamp'>): Promise<{ success: boolean; result: SemesterResult }> => {
        const response = await api.post('/api/semester_results', data);
        return response.data;
    },

    deleteSemesterResult: async (semester: number): Promise<void> => {
        await api.delete(`/api/semester_results/${semester}`);
    },

    // Notices
    getNotices: async () => {
        const response = await api.get('/api/notices');
        return response.data;
    },


    // Notifications
    getNotifications: async () => {
        const response = await api.get('/api/notifications');
        return response.data;
    },

    // Manual Course Manager
    getManualCourses: async () => {
        const response = await api.get('/api/courses/manual');
        return response.data;
    },
    saveManualCourses: async (courses: any[]) => {
        const response = await api.post('/api/courses/manual', courses);
        return response.data;
    },
};
