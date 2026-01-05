import api from './api';

export interface Skill {
    _id?: string;
    name: string;
    category: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    progress: number;
    notes?: string;
}

export const skillsService = {
    getSkills: async (): Promise<Skill[]> => {
        const response = await api.get('/api/skills');
        return response.data;
    },

    addSkill: async (skill: Omit<Skill, '_id'>): Promise<void> => {
        await api.post('/api/skills', skill);
    },

    updateSkill: async (id: string, skill: Partial<Skill>): Promise<void> => {
        await api.put(`/api/skills/${id}`, skill);
    },

    deleteSkill: async (id: string): Promise<void> => {
        await api.delete(`/api/skills/${id}`);
    },
};
