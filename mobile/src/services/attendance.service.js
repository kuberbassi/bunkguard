import api from './api';

// Simple In-Memory Cache
const CACHE = {};
const CACHE_TTL = 30000; // 30 seconds

// Helper to get/set cache
const getCached = (key) => {
    const item = CACHE[key];
    if (item && Date.now() < item.expiry) return item.data;
    return null;
};

const setCached = (key, data) => {
    CACHE[key] = { data, expiry: Date.now() + CACHE_TTL };
};

export const attendanceService = {
    // ==================== Preferences & Profile ====================
    uploadPfp: async (formData) => {
        const response = await api.post('/api/upload_pfp', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    updateProfile: async (data) => {
        const response = await api.post('/api/update_profile', data);
        return response.data;
    },

    // ==================== Dashboard ====================
    getDashboardData: async (semester = 1, force = false) => {
        const key = `dash_${semester}`;
        if (!force) {
            const cached = getCached(key);
            if (cached) return cached;
        }

        const response = await api.get(`/api/dashboard_data?semester=${semester}`);
        setCached(key, response.data);
        return response.data;
    },

    getDashboardSummary: async (semester = 1) => {
        const response = await api.get(`/api/dashboard_summary?semester=${semester}`);
        return response.data;
    },

    // ==================== Reports ====================
    getReportsData: async (semester = 1, force = false) => {
        const key = `reports_${semester}`;
        if (!force) {
            const cached = getCached(key);
            if (cached) return cached;
        }
        const response = await api.get(`/api/reports_data?semester=${semester}`);
        setCached(key, response.data);
        return response.data;
    },

    // ==================== Attendance Logs ====================
    getAttendanceLogs: async (page = 1, limit = 15) => {
        const response = await api.get(`/api/attendance_logs?page=${page}&limit=${limit}`);
        return response.data;
    },

    getLogsForDate: async (date) => {
        const response = await api.get(`/api/logs_for_date?date=${date}`);
        return response.data;
    },

    // ==================== Mark Attendance ====================
    markAttendance: async (subjectId, status, date, notes, substitutedById) => {
        await api.post('/api/mark_attendance', {
            subject_id: subjectId,
            status,
            date,
            notes,
            substituted_by_id: substitutedById,
        });
        // Invalidate Dashboard Cache
        delete CACHE[`dash_1`]; delete CACHE[`dash_2`];
    },

    markAllAttendance: async (subjectIds, status, date) => {
        await api.post('/api/mark_all_attendance', {
            subject_ids: subjectIds,
            status,
            date,
        });
    },

    editAttendance: async (logId, status, notes, date) => {
        await api.post(`/api/edit_attendance/${logId}`, {
            status,
            notes,
            date
        });
    },

    deleteAttendance: async (logId) => {
        await api.delete(`/api/delete_attendance/${logId}`);
    },

    // ==================== Calendar ====================
    getCalendarData: async (year, month, semester) => {
        const key = `cal_${year}_${month}_${semester}`;
        const cached = getCached(key);
        // Calendar data for past months usually doesn't change often, keep it longer? 
        // For now use standard TTL.
        if (cached) return cached;

        const url = semester
            ? `/api/calendar_data?year=${year}&month=${month}&semester=${semester}`
            : `/api/calendar_data?year=${year}&month=${month}`;
        const response = await api.get(url);
        setCached(key, response.data);
        return response.data;
    },

    // ==================== Classes ====================
    getTodaysClasses: async () => {
        const response = await api.get('/api/todays_classes');
        return response.data;
    },

    getClassesForDate: async (date, semester) => {
        const url = semester
            ? `/api/classes_for_date?date=${date}&semester=${semester}`
            : `/api/classes_for_date?date=${date}`;
        const response = await api.get(url);
        return response.data;
    },

    // ==================== Subjects ====================
    getSubjects: async (semester = 1) => {
        const response = await api.get(`/api/subjects?semester=${semester}`);
        return response.data;
    },

    getFullSubjectsData: async (semester = 1) => {
        const response = await api.get(`/api/full_subjects_data?semester=${semester}`);
        return response.data;
    },

    getSubjectDetails: async (subjectId) => {
        const response = await api.get(`/api/subject_details/${subjectId}`);
        return response.data;
    },

    addSubject: async (subjectName, semester, categories, code, professor, classroom) => {
        await api.post('/api/add_subject', {
            subject_name: subjectName,
            semester,
            categories,
            code,
            professor,
            classroom
        });
    },

    deleteSubject: async (subjectId) => {
        await api.delete(`/api/delete_subject/${subjectId}`);
    },

    updateSubjectDetails: async (subjectId, professor, classroom) => {
        await api.post('/api/update_subject_details', {
            subject_id: subjectId,
            professor,
            classroom,
        });
    },

    updateSubjectFullDetails: async (subjectId, data) => {
        await api.post('/api/update_subject_full_details', {
            subject_id: subjectId,
            ...data
        });
    },

    updateAttendanceCount: async (subjectId, attended, total) => {
        await api.post('/api/update_attendance_count', {
            subject_id: subjectId,
            attended,
            total,
        });
    },

    updatePracticals: async (subjectId, data) => {
        await api.put(`/api/subject/${subjectId}/practicals`, data);
    },

    updateAssignments: async (subjectId, data) => {
        await api.put(`/api/subject/${subjectId}/assignments`, data);
    },

    // ==================== Timetable ====================
    getTimetable: async (semester = 1) => {
        const response = await api.get(`/api/timetable?semester=${semester}`);
        return response.data;
    },

    saveTimetable: async (schedule, semester = 1) => {
        await api.post(`/api/timetable?semester=${semester}`, { schedule });
    },

    saveTimetableStructure: async (periods, semester = 1) => {
        await api.post(`/api/timetable/structure?semester=${semester}`, periods);
    },

    addTimetableSlot: async (slotData) => {
        await api.post('/api/timetable/slot', slotData);
    },

    updateTimetableSlot: async (slotId, slotData) => {
        await api.put(`/api/timetable/slot/${slotId}`, slotData);
    },

    deleteTimetableSlot: async (slotId, semester = 1) => {
        await api.delete(`/api/timetable/slot/${slotId}?semester=${semester}`);
    },

    // ==================== Analytics ====================
    getDayOfWeekAnalytics: async (semester = 1) => {
        const response = await api.get(`/api/analytics/day_of_week?semester=${semester}`);
        return response.data;
    },

    getMonthlyAnalytics: async (semester = 1, year) => {
        const response = await api.get(`/api/analytics/monthly_trend?year=${year || new Date().getFullYear()}&semester=${semester}`);
        return response.data;
    },

    getAllSemestersOverview: async () => {
        const response = await api.get('/api/all_semesters_overview');
        return response.data;
    },

    // ==================== Preferences ====================
    getPreferences: async () => {
        const response = await api.get('/api/preferences');
        return response.data;
    },

    updatePreferences: async (preferences) => {
        await api.post('/api/preferences', preferences);
    },

    // ==================== Holidays ====================
    getHolidays: async () => {
        const response = await api.get('/api/holidays');
        return response.data;
    },

    addHoliday: async (date, name) => {
        await api.post('/api/holidays', { date, name });
    },

    deleteHoliday: async (holidayId) => {
        await api.delete(`/api/holidays/${holidayId}`);
    },

    // ==================== Medical Leaves ====================
    getPendingLeaves: async () => {
        const response = await api.get('/api/pending_leaves');
        return response.data;
    },

    approveLeave: async (logId) => {
        await api.post(`/api/approve_leave/${logId}`);
    },

    // ==================== Substitutions ====================
    getUnresolvedSubstitutions: async () => {
        const response = await api.get('/api/unresolved_substitutions');
        return response.data;
    },

    markSubstituted: async (originalSubjectId, substituteSubjectId, date) => {
        await api.post('/api/mark_substituted', {
            original_subject_id: originalSubjectId,
            substitute_subject_id: substituteSubjectId,
            date,
        });
    },

    // ==================== Data Management ====================
    exportData: async () => {
        // Mobile needs JSON directly to write to file
        const response = await api.get('/api/export_data');
        return response.data;
    },

    importData: async (data) => {
        await api.post('/api/import_data', data);
    },

    deleteAllData: async () => {
        const response = await api.delete('/api/delete_all_data');
        return response.data;
    },

    // ==================== System Logs ====================
    getSystemLogs: async () => {
        const response = await api.get('/api/system_logs');
        return response.data;
    },

    // ==================== Academic Records ====================
    getAcademicRecords: async () => {
        const response = await api.get('/api/academic_records');
        return response.data;
    },

    updateAcademicRecord: async (data) => {
        await api.post('/api/update_academic_record', data);
    },

    // ==================== Semester Results (IPU Grading) ====================
    getSemesterResults: async () => {
        const response = await api.get('/api/semester_results');
        return response.data;
    },

    getSemesterResult: async (semester) => {
        const response = await api.get(`/api/semester_results/${semester}`);
        return response.data;
    },

    saveSemesterResult: async (data) => {
        const response = await api.post('/api/semester_results', data);
        return response.data;
    },

    deleteSemesterResult: async (semester) => {
        await api.delete(`/api/semester_results/${semester}`);
    },

    // ==================== Notices & Notifications ====================
    getNotices: async () => {
        const response = await api.get('/api/notices');
        return response.data;
    },

    getNotifications: async () => {
        const response = await api.get('/api/notifications');
        return response.data;
    },

    // ==================== Manual Course Manager ====================
    getManualCourses: async () => {
        const response = await api.get('/api/courses/manual');
        return response.data;
    },

    saveManualCourses: async (courses) => {
        const response = await api.post('/api/courses/manual', courses);
        return response.data;
    },
};
