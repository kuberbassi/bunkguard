import axios from 'axios';

export const dashboardService = {
    getData: async (semester: number) => {
        const response = await axios.get(`/api/dashboard/data?semester=${semester}`, {
            withCredentials: true
        });
        return response.data;
    }
};
