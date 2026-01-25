import api from './api';

export const classroomService = {
    // Check if Classroom scope is granted
    checkLinkStatus: async () => {
        try {
            await api.get('/api/classroom/courses');
            return true;
        } catch (error) {
            return false;
        }
    },

    getCourses: async () => {
        const response = await api.get('/api/classroom/courses');
        return response.data;
    },

    getCourseWork: async (courseId) => {
        const response = await api.get(`/api/classroom/courses/${courseId}/coursework`);
        return response.data;
    },

    getAllAssignments: async () => {
        const response = await api.get('/api/classroom/all_assignments');
        return response.data;
    },

    getAnnouncements: async () => {
        const response = await api.get('/api/classroom/announcements');
        return response.data;
    },

    getMaterials: async () => {
        const response = await api.get('/api/classroom/materials');
        return response.data;
    }
};
