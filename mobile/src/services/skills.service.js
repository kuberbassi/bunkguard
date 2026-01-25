import api from './api';

export const skillsService = {
    getSkills: async () => {
        const response = await api.get('/api/skills');
        return response.data;
    },

    addSkill: async (skill) => {
        await api.post('/api/skills', skill);
    },

    updateSkill: async (id, skill) => {
        await api.put(`/api/skills/${id}`, skill);
    },

    deleteSkill: async (id) => {
        await api.delete(`/api/skills/${id}`);
    },
};
