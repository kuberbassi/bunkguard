
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '@/services/attendance.service';

export const useNotices = () => {
    return useQuery({
        queryKey: ['notices'],
        queryFn: () => attendanceService.getNotices(),
        staleTime: 30 * 60 * 1000, // 30 minutes cache
        refetchOnWindowFocus: false,
    });
};
