import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
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
    const [scheduledClasses, setScheduledClasses] = useState<any[]>([]);

    const [googleEvents, setGoogleEvents] = useState<any[]>([]);

    useEffect(() => {
        loadData();
        loadGoogleEvents();
    }, [currentDate, currentSemester]);

    const loadGoogleEvents = async () => {
        try {
            const events = await attendanceService.getGoogleCalendarEvents();
            setGoogleEvents(events);
        } catch (error) {
            console.error("Failed to load google events", error);
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);
            // Fetch for current month view
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;

            const calendarData = await attendanceService.getCalendarData(year, month);
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
        const startingDayOfWeek = firstDay.getDay();

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

    const getGoogleEventsForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return googleEvents.filter(event => {
            const start = event.start.dateTime || event.start.date;
            return start.startsWith(dateStr);
        });
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
        setScheduledClasses([]);

        try {
            const classes = await attendanceService.getClassesForDate(dateString);
            setScheduledClasses(classes);
        } catch (error) {
            console.error("Failed to fetch scheduled classes", error);
        }
    };

    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        days.push(day);
    }

    if (loading) return <LoadingSpinner fullScreen />;

    return (
        <div className="pb-32 space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <div>
                    <h1 className="text-display-md font-bold text-on-surface dark:text-dark-surface-on mb-1">
                        Attendance History
                    </h1>
                    <p className="text-on-surface-variant text-lg">Track your attendance over time</p>
                </div>
            </motion.div>

            <GlassCard className="p-8 min-h-[600px] flex flex-col">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-8">
                    <Button
                        variant="ghost"
                        onClick={handlePrevMonth}
                        className="rounded-full w-12 h-12 !p-0"
                    >
                        <ChevronLeft size={24} />
                    </Button>

                    <h2 className="text-2xl font-display font-bold text-on-surface flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <CalendarIcon className="w-6 h-6" />
                        </div>
                        {monthName}
                    </h2>

                    <Button
                        variant="ghost"
                        onClick={handleNextMonth}
                        className="rounded-full w-12 h-12 !p-0"
                    >
                        <ChevronRight size={24} />
                    </Button>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-4 mb-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-sm font-bold text-on-surface-variant/70 uppercase tracking-wilder py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-4 flex-1">
                    {days.map((day, index) => {
                        if (typeof day !== 'number') return day;

                        const date = new Date(year, month, day);
                        const attendance = getAttendanceForDate(date);
                        const isToday = new Date().toDateString() === date.toDateString();
                        const presentCount = attendance.filter(a => a.status === 'present').length;
                        const absentCount = attendance.filter(a => a.status === 'absent').length;
                        const totalClasses = attendance.length;
                        const googleEventsForDay = getGoogleEventsForDate(date);

                        return (
                            <motion.button
                                key={index}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleDayClick(day)}
                                className={`aspect-square rounded-2xl p-2 relative flex flex-col items-center justify-start transition-all border ${isToday
                                    ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.3)]'
                                    : totalClasses > 0
                                        ? 'border-outline-variant/20 bg-surface-container-low hover:bg-surface-container'
                                        : 'border-transparent hover:bg-surface-dim'
                                    }`}
                            >
                                <span className={`text-base font-medium mt-1 ${isToday ? 'text-primary font-bold' : 'text-on-surface'}`}>
                                    {day}
                                </span>

                                <div className="mt-auto mb-2 flex gap-1 flex-wrap justify-center max-w-full">
                                    {new Array(Math.min(presentCount, 4)).fill(0).map((_, i) => (
                                        <div key={`p-${i}`} className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm" />
                                    ))}
                                    {new Array(Math.min(absentCount, 4)).fill(0).map((_, i) => (
                                        <div key={`a-${i}`} className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-sm" />
                                    ))}
                                    {googleEventsForDay.length > 0 && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm" title={`${googleEventsForDay.length} Google Calendar Events`} />
                                    )}
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="mt-8 pt-6 border-t border-outline-variant/10 flex flex-wrap justify-center gap-8 text-sm font-medium">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm" />
                        <span className="text-on-surface-variant">Present</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm" />
                        <span className="text-on-surface-variant">Absent</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm" />
                        <span className="text-on-surface-variant">Google Event</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded border-2 border-primary bg-primary/10" />
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
