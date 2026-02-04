
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '@/services/attendance.service';
import { useSemester } from '@/contexts/SemesterContext';
import type { DashboardData } from '@/types';


export const useDashboard = () => {
    const { currentSemester } = useSemester();
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['dashboard', currentSemester],
        queryFn: () => attendanceService.getDashboardData(currentSemester),
        staleTime: 5 * 60 * 1000, // 5 minutes fresh
        gcTime: 30 * 60 * 1000, // 30 minutes cache
        refetchOnWindowFocus: false,
    });

    const prefetchDashboard = (semester: number) => {
        queryClient.prefetchQuery({
            queryKey: ['dashboard', semester],
            queryFn: () => attendanceService.getDashboardData(semester),
        });
    };

    return { ...query, prefetchDashboard };
};

export const useMarkAttendance = () => {
    const queryClient = useQueryClient();
    const { currentSemester } = useSemester();

    return useMutation({
        mutationFn: async ({ subjectId, status }: { subjectId: string; status: 'present' | 'absent' }) => {
            await attendanceService.markAttendance(subjectId, status, new Date().toISOString().split('T')[0]);
        },
        onMutate: async ({ subjectId, status }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['dashboard', currentSemester] });

            // Snapshot previous data
            const previousData = queryClient.getQueryData<DashboardData>(['dashboard', currentSemester]);

            // Optimistically update
            if (previousData) {
                queryClient.setQueryData<DashboardData>(['dashboard', currentSemester], (old) => {
                    if (!old) return old;

                    const updatedSubjects = old.subjects.map((sub) => {
                        if (sub._id === subjectId) {
                            const newAttended = status === 'present' ? (sub.attended || 0) + 1 : (sub.attended || 0);
                            const newTotal = (sub.total || 0) + 1;
                            const newPercentage = newTotal > 0 ? (newAttended / newTotal) * 100 : 0;

                            // Estimate new status message (Simple guard)
                            let newStatusMsg = sub.status_message;
                            if (newPercentage < 75) newStatusMsg = "Low Attendance";
                            else newStatusMsg = "On Track";

                            return {
                                ...sub,
                                attended: newAttended,
                                total: newTotal,
                                attendance_percentage: newPercentage,
                                status_message: newStatusMsg,
                            };
                        }
                        return sub;
                    });

                    // Recalculate Overall (Simple Average for instant feedback)
                    // Note: Backend might use weighted, but simple avg is close enough for 1-second delay
                    // Actually, backend usually does Total Attended / Total Classes across all subjects
                    let totalAtt = 0;
                    let totalClasses = 0;
                    updatedSubjects.forEach(s => {
                        totalAtt += s.attended || 0;
                        totalClasses += s.total || 0;
                    });
                    const newOverall = totalClasses > 0 ? (totalAtt / totalClasses * 100) : 0;

                    return {
                        ...old,
                        subjects: updatedSubjects,
                        overall_attendance: newOverall
                    };
                });
            }

            return { previousData };
        },
        onError: (_err, _newTodo, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['dashboard', currentSemester], context.previousData);
            }
        },
        onSettled: () => {
            // Always refetch to ensure data consistency with server
            queryClient.invalidateQueries({ queryKey: ['dashboard', currentSemester] });
        },
    });
};
