import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AttendanceModal from '@/components/modals/AttendanceModal';
import { attendanceService } from '@/services/attendance.service';
import { useSemester } from '@/contexts/SemesterContext';
import { useToast } from '@/components/ui/Toast';

interface AttendanceRecord {
    date: string;
    subject_id: string;
    subject_name: string;
    status: 'present' | 'absent';
}

const Calendar: React.FC = () => {
    const { showToast } = useToast();
    const { currentSemester } = useSemester();
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    // attendanceData is now a map of date -> list of records
    const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord[]>>({});
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [currentDate, currentSemester]);


    const loadData = async () => {
        try {
            setLoading(true);
            // Fetch for current month view
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;

            const calendarData = await attendanceService.getCalendarData(year, month, currentSemester);
            setAttendanceData(calendarData as Record<string, AttendanceRecord[]> || {});
        } catch (error) {
            console.error(error);
            showToast('error', 'Failed to load calendar data');
        } finally {
            setLoading(false);
        }
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();

        // Convert to Monday-first week (0=Monday, 6=Sunday)
        let startingDayOfWeek = firstDay.getDay() - 1;
        if (startingDayOfWeek === -1) startingDayOfWeek = 6; // Sunday becomes 6

        return { daysInMonth, startingDayOfWeek, year, month };
    };

    const getAttendanceForDate = (date: Date) => {
        // Construct date string manually to match API format YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        return attendanceData[dateStr] || [];
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const handleDayClick = async (day: number) => {
        const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const year = clickedDate.getFullYear();
        const month = String(clickedDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(clickedDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${dayStr}`;

        setSelectedDate(clickedDate);
        setIsMarkModalOpen(true);


        try {
            await attendanceService.getClassesForDate(dateString, currentSemester);
        } catch (error) {
            console.error("Failed to fetch scheduled classes", error);
        }
    };

    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    if (loading) return <LoadingSpinner fullScreen />;

    return (
        <div className="pb-20 space-y-4 md:space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold font-display text-on-surface tracking-tight mb-1">Calendar</h1>
                    <p className="text-xs md:text-base text-on-surface-variant">Manage your academic schedule</p>
                </div>
                <div className="flex items-center gap-1 md:gap-2 bg-surface-container rounded-xl p-1 border border-outline-variant/30 self-start md:self-auto">
                    <button
                        onClick={handlePrevMonth}
                        className="p-1.5 md:p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-colors"
                    >
                        <ChevronLeft size={16} className="md:w-5 md:h-5" />
                    </button>
                    <span className="font-semibold text-sm md:text-base min-w-[100px] md:min-w-[120px] text-center">
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                        onClick={handleNextMonth}
                        className="p-1.5 md:p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-colors"
                    >
                        <ChevronRight size={16} className="md:w-5 md:h-5" />
                    </button>
                </div>
            </header>

            <GlassCard className="p-3 md:p-6">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 mb-2 md:mb-4">
                    {weekDays.map(day => (
                        <div key={day} className="text-center text-xs md:text-sm font-bold text-on-surface-variant uppercase tracking-wider py-1 md:py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 md:gap-3">
                    {/* Empty Slots */}
                    {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square" />
                    ))}

                    {/* Days */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const date = new Date(year, month, day);
                        const attendance = getAttendanceForDate(date);
                        const isToday = new Date().toDateString() === date.toDateString();
                        const presentCount = attendance.filter(a => a.status === 'present').length;
                        const absentCount = attendance.filter(a => a.status === 'absent').length;
                        const totalClasses = attendance.length;

                        return (
                            <motion.button
                                key={day}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleDayClick(day)}
                                className={`aspect-square rounded-xl md:rounded-2xl p-1 md:p-2 relative flex flex-col items-center justify-start transition-all border ${isToday
                                    ? 'border-primary bg-primary/10 shadow-[0_0_10px_rgba(var(--primary),0.2)] md:shadow-[0_0_20px_rgba(var(--primary),0.3)]'
                                    : totalClasses > 0
                                        ? 'border-outline-variant/20 bg-surface-container-low hover:bg-surface-container'
                                        : 'border-transparent hover:bg-surface-dim'
                                    }`}
                            >
                                <span className={`text-xs md:text-base font-medium mt-0.5 md:mt-1 ${isToday ? 'text-primary font-bold' : 'text-on-surface'}`}>
                                    {day}
                                </span>

                                <div className="mt-auto mb-1 md:mb-2 flex gap-0.5 md:gap-1 flex-wrap justify-center max-w-full px-0.5">
                                    {new Array(Math.min(presentCount, 4)).fill(0).map((_, idx) => (
                                        <div key={`p-${idx}`} className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-green-500 shadow-sm" />
                                    ))}
                                    {new Array(Math.min(absentCount, 4)).fill(0).map((_, idx) => (
                                        <div key={`a-${idx}`} className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-red-500 shadow-sm" />
                                    ))}
                                    {totalClasses > 8 && <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-on-surface-variant/30" />}
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="mt-4 md:mt-8 pt-4 md:pt-6 border-t border-outline-variant/10 flex flex-wrap justify-center gap-4 md:gap-8 text-xs md:text-sm font-medium">
                    <div className="flex items-center gap-1.5 md:gap-2">
                        <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-green-500 shadow-sm" />
                        <span className="text-on-surface-variant">Present</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2">
                        <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-red-500 shadow-sm" />
                        <span className="text-on-surface-variant">Absent</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2">
                        <div className="w-2 h-2 md:w-3 md:h-3 rounded border md:border-2 border-primary bg-primary/10" />
                        <span className="text-primary font-bold">Today</span>
                    </div>
                </div>
            </GlassCard>

            <AttendanceModal
                isOpen={isMarkModalOpen}
                onClose={() => setIsMarkModalOpen(false)}
                defaultDate={selectedDate || new Date()}
                onSuccess={() => {
                    loadData();
                    setIsMarkModalOpen(false);
                }}
            />
        </div>
    );
};

export default Calendar;
