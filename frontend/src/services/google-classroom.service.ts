// Types for Google Classroom API
export interface ClassroomCourse {
    id: string;
    name: string;
    section?: string;
    descriptionHeading?: string;
    room?: string;
    alternateLink: string;
    courseState: string;
}

export interface ClassroomCourseWork {
    id: string;
    courseId: string;
    title: string;
    description?: string;
    state: string;
    alternateLink: string;
    creationTime: string;
    updateTime: string;
    dueDate?: {
        year: number;
        month: number;
        day: number;
    };
    dueTime?: {
        hours: number;
        minutes: number;
    };
    maxPoints?: number;
    workType: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION';
}

export interface ClassroomMaterial {
    id: string;
    courseId: string;
    title: string;
    description?: string;
    materials: any[];
    alternateLink: string;
    topicId?: string;
}

// Service to interact with Google Classroom API directly from frontend (using the token)
// Note: In a production app, this might be better handled via backend to keep secrets safe,
// but for this personal dashboard, using the access token on frontend is acceptable if properly scoped.
// However, since we are doing backend-based auth verification primarily, we might need to proxy this or just use the token we have.
// Actually, our current auth flow sends the code to backend. The backend gets the tokens.
// WE NEED THE ACCESS TOKEN ON THE FRONTEND TO CALL GOOGLE APIS DIRECTLY.
// OR we proxy through our backend. Proxying is safer and avoids CORS issues often.
// BUT, `react-oauth/google` `useGoogleLogin` with `implicit` flow or extracting token from session is possible.
// Let's assume we will add a backend proxy for this to be robust.

// UPDATE: User asked for "link account then use classroom api".
// I will create a frontend service that calls OUR backend, which then calls Google.
// This matches the architecture of `api/api.py`.

import api from './api';

export const classroomService = {
    // Check if Classroom scope is granted
    checkLinkStatus: async () => {
        // This would be an endpoint to check if we have the refresh token with correct scopes
        // For now, we will assume if we can fetch courses, we are linked.
        try {
            await api.get('/api/classroom/courses');
            return true;
        } catch (error) {
            return false;
        }
    },

    getCourses: async (): Promise<ClassroomCourse[]> => {
        const response = await api.get('/api/classroom/courses');
        return response.data;
    },

    getCourseWork: async (courseId: string): Promise<ClassroomCourseWork[]> => {
        const response = await api.get(`/api/classroom/courses/${courseId}/coursework`);
        return response.data;
    },

    getAllAssignments: async (): Promise<ClassroomCourseWork[]> => {
        // Helper to fetch all assignments from all active courses
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
