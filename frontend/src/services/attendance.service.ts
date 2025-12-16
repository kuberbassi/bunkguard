import api from './api';
import type {
    DashboardData,
    ReportsData,
    Subject,
    TimetableSchedule,
    Preferences,
    Deadline,
    Holiday,
} from '@/types';

export const attendanceService = {
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
        notes?: string
    ): Promise<void> => {
        await api.post('/api/mark_attendance', {
            subject_id: subjectId,
            status,
            date,
            notes,
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

    getCalendarData: async (year: number, month: number) => {
        const response = await api.get(`/api/calendar_data?year=${year}&month=${month}`);
        return response.data;
    },

    editAttendance: async (logId: string, status: string, notes?: string): Promise<void> => {
        await api.post(`/api/edit_attendance/${logId}`, {
            status,
            notes,
        });
    },

    // Classes
    getTodaysClasses: async (): Promise<Subject[]> => {
        const response = await api.get('/api/todays_classes');
        return response.data;
    },

    getClassesForDate: async (date: string): Promise<Subject[]> => {
        const response = await api.get(`/api/classes_for_date?date=${date}`);
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

    addSubject: async (subjectName: string, semester: number): Promise<void> => {
        await api.post('/api/add_subject', {
            subject_name: subjectName,
            semester,
        });
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

    // Timetable
    getTimetable: async (): Promise<{ schedule: TimetableSchedule }> => {
        const response = await api.get('/api/timetable');
        return response.data;
    },

    saveTimetable: async (schedule: TimetableSchedule): Promise<void> => {
        await api.post('/api/timetable', { schedule });
    },

    // New CRUD methods
    addTimetableSlot: async (slotData: any): Promise<void> => {
        await api.post('/api/timetable/slot', slotData);
    },

    updateTimetableSlot: async (slotId: string, slotData: any): Promise<void> => {
        await api.put(`/api/timetable/slot/${slotId}`, slotData);
    },

    deleteTimetableSlot: async (slotId: string): Promise<void> => {
        await api.delete(`/api/timetable/slot/${slotId}`);
    },


    getLogsForDate: async (date: string) => {
        const response = await api.get(`/api/logs_for_date?date=${date}`);
        return response.data;
    },

    // Analytics
    getDayOfWeekAnalytics: async () => {
        const response = await api.get('/api/analytics/day_of_week');
        return response.data;
    },

    getMonthlyAnalytics: async (year?: number) => {
        const response = await api.get(`/api/analytics/monthly_trend?year=${year || new Date().getFullYear()}`);
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

    updatePreferences: async (preferences: Preferences): Promise<void> => {
        await api.post('/api/preferences', preferences);
    },

    // Deadlines
    getDeadlines: async (): Promise<Deadline[]> => {
        const response = await api.get('/api/deadlines');
        return response.data;
    },

    addDeadline: async (title: string, dueDate: string): Promise<void> => {
        await api.post('/api/add_deadline', {
            title,
            due_date: dueDate,
        });
    },

    toggleDeadline: async (deadlineId: string): Promise<void> => {
        await api.post(`/api/toggle_deadline/${deadlineId}`);
    },

    // Holidays
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
        const response = await api.delete('/delete_all_data');
        return response.data;
    },

    // System logs
    getSystemLogs: async () => {
        const response = await api.get('/api/system_logs');
        return response.data;
    }
};
