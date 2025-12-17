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


    // View Toggle State: 'attendance' | 'events'
    const [viewMode, setViewMode] = useState<'attendance' | 'events'>(() => {
        return localStorage.getItem('calendar_view_mode') as 'attendance' | 'events' || 'attendance';
    });

    useEffect(() => {
        localStorage.setItem('calendar_view_mode', viewMode);
    }, [viewMode]);

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


        try {
            await attendanceService.getClassesForDate(dateString);
        } catch (error) {
            console.error("Failed to fetch scheduled classes", error);
        }
    };

    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);


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
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-display-md text-on-surface dark:text-dark-surface-on">Calendar</h1>
                    <p className="text-on-surface-variant text-lg">Track your attendance history</p>
                </div>

                {/* View Controller */}
                <div className="flex items-center gap-4 bg-surface-container rounded-xl p-1 border border-outline-variant/20">
                    <button
                        onClick={() => setViewMode('attendance')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'attendance'
                            ? 'bg-primary text-on-primary shadow-sm'
                            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                            }`}
                    >
                        Attendance
                    </button>
                    <button
                        onClick={() => setViewMode('events')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'events'
                            ? 'bg-primary text-on-primary shadow-sm'
                            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                            }`}
                    >
                        Events
                    </button>
                </div>

                <div className="flex items-center gap-3 bg-surface-container-low rounded-xl p-1 border border-outline-variant/20">
                    <Button variant="ghost" onClick={handlePrevMonth} className="!p-2">
                        <ChevronLeft size={20} />
                    </Button>
                    <span className="font-bold min-w-[140px] text-center text-lg text-on-surface">
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <Button variant="ghost" onClick={handleNextMonth} className="!p-2">
                        <ChevronRight size={20} />
                    </Button>
                </div>
            </div>

            {viewMode === 'events' ? (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-surface-container-low/50 rounded-2xl border border-dashed border-outline-variant">
                    <div className="p-4 rounded-full bg-primary/10 mb-4 text-primary">
                        <CalendarIcon size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-on-surface mb-2">Events & Holidays</h3>
                    <p className="text-on-surface-variant max-w-md">
                        This view will show academic holidays, exam schedules, and synced Google Calendar events.
                        <br />🚧 <span className="text-sm font-bold opacity-80">Coming Soon</span>
                    </p>
                </div>
            ) : (
                <GlassCard className="p-6">
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
            )}

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
