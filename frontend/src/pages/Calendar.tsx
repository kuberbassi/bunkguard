import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, X, Calendar as CalendarIcon } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import { attendanceService } from '@/services/attendance.service';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/utils/formatters';

interface AttendanceRecord {
    date: string;
    subject_id: string;
    subject_name: string;
    status: 'present' | 'absent';
}

const Calendar: React.FC = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    // attendanceData is now a map of date -> list of records
    const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord[]>>({});
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
    const [scheduledClasses, setScheduledClasses] = useState<any[]>([]);
    const [modalLoading, setModalLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [currentDate]);

    const loadData = async () => {
        try {
            setLoading(true);
            // Fetch for current month view
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;

            const [dashData, calendarData] = await Promise.all([
                attendanceService.getDashboardData(),
                attendanceService.getCalendarData(year, month) // Must ensure this method exists and calls /api/calendar_data
            ]);
            setSubjects(dashData.subjects_overview || []);
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

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const handleDayClick = async (day: number) => {
        const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        // Correct for timezone offset to ensure we get the right date string
        // Actually, just creating date object with Y, M, D treats it as local time 00:00:00.
        // toISOString() converts to UTC. If local is GMT+5:30, 00:00 becomes previous day 18:30.
        // Fix: Use generic date string construction manually.
        const year = clickedDate.getFullYear();
        const month = String(clickedDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(clickedDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${dayStr}`;

        setSelectedDate(clickedDate);
        setIsMarkModalOpen(true);
        setModalLoading(true);
        setScheduledClasses([]);

        try {
            const classes = await attendanceService.getClassesForDate(dateString);
            setScheduledClasses(classes);
        } catch (error) {
            console.error("Failed to fetch scheduled classes", error);
        } finally {
            setModalLoading(false);
        }
    };

    const handleMarkAttendance = async (subjectId: string, status: 'present' | 'absent') => {
        if (!selectedDate) return;
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        try {
            await attendanceService.markAttendance(
                subjectId,
                status,
                dateStr
            );
            showToast('success', `Marked ${status}`);
            // Refresh local data
            loadData();
            // Refresh scheduled classes status
            const classes = await attendanceService.getClassesForDate(dateStr);
            setScheduledClasses(classes);
        } catch (error) {
            showToast('error', 'Failed to mark attendance');
        }
    };

    const handleBulkMark = async (status: 'present' | 'absent') => {
        if (!selectedDate || scheduledClasses.length === 0) return;

        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // Get IDs of scheduled classes only
        const subjectIds = scheduledClasses.map(s => s._id);

        try {
            await attendanceService.markAllAttendance(subjectIds, status, dateStr);
            showToast('success', `Marked all scheduled classes as ${status}`);
            // Refresh local data
            loadData();
            // Refresh scheduled classes status
            const classes = await attendanceService.getClassesForDate(dateStr);
            setScheduledClasses(classes);
        } catch (error) {
            showToast('error', 'Failed to bulk mark attendance');
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

                                {totalClasses > 0 && (
                                    <div className="mt-auto mb-2 flex gap-1">
                                        {new Array(Math.min(presentCount, 4)).fill(0).map((_, i) => (
                                            <div key={`p-${i}`} className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm" />
                                        ))}
                                        {new Array(Math.min(absentCount, 4)).fill(0).map((_, i) => (
                                            <div key={`a-${i}`} className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-sm" />
                                        ))}
                                        {totalClasses > 8 && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/50" />
                                        )}
                                    </div>
                                )}
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
                        <div className="w-3 h-3 rounded border-2 border-primary bg-primary/10" />
                        <span className="text-primary font-bold">Today</span>
                    </div>
                </div>
            </GlassCard>

            {/* Mark Attendance Modal */}
            <Modal
                isOpen={isMarkModalOpen}
                onClose={() => setIsMarkModalOpen(false)}
                title={`Mark Attendance - ${selectedDate ? formatDate(selectedDate) : ''}`}
            >
                <div className="space-y-4">
                    {modalLoading ? (
                        <div className="py-8 flex justify-center">
                            <LoadingSpinner />
                        </div>
                    ) : (
                        <>
                            {scheduledClasses.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex gap-3 mb-4">
                                        <Button variant="filled" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleBulkMark('present')}>Mark All Present</Button>
                                        <Button variant="filled" className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => handleBulkMark('absent')}>Mark All Absent</Button>
                                    </div>
                                    <p className="text-sm text-on-surface-variant font-medium">Scheduled Classes</p>
                                    <div className="space-y-3">
                                        {scheduledClasses.map((subject) => {
                                            const status = subject.marked_status || 'pending';
                                            return (
                                                <div key={subject._id} className="flex items-center justify-between p-4 rounded-xl bg-surface-container border border-outline-variant/20 hover:border-primary/30 transition-colors">
                                                    <span className="font-bold text-on-surface">{subject.name}</span>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant={status === 'present' ? 'filled' : 'outlined'}
                                                            size="sm"
                                                            icon={<Check size={16} />}
                                                            onClick={() => handleMarkAttendance(subject._id, 'present')}
                                                            className={`!px-4 !rounded-lg ${status === 'present' ? 'bg-green-600 hover:bg-green-700' : 'text-green-600 border-green-600/30 hover:bg-green-50'}`}
                                                        >
                                                            Present
                                                        </Button>
                                                        <Button
                                                            variant={status === 'absent' ? 'filled' : 'outlined'}
                                                            size="sm"
                                                            icon={<X size={16} />}
                                                            onClick={() => handleMarkAttendance(subject._id, 'absent')}
                                                            className={`!px-4 !rounded-lg ${status === 'absent' ? 'bg-red-600 hover:bg-red-700' : 'text-red-600 border-red-600/30 hover:bg-red-50'}`}
                                                        >
                                                            Absent
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-on-surface-variant bg-surface-container-low rounded-xl">
                                    No classes scheduled for this day.
                                </div>
                            )}

                            {/* Separator if needed, or just list all subjects below if user wants to mark extra classes */}
                            <div className="pt-4 border-t border-outline-variant/10">
                                <p className="text-sm text-on-surface-variant mb-3">Other Subjects (Manual Mark)</p>
                                <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {subjects.filter(s => !scheduledClasses.some(sc => sc._id === s.id)).map((subject) => {
                                        // Need to check if this subject has a log for this day manually since it's not in scheduledClasses which has "marked_status"
                                        const existingRecord = selectedDate
                                            ? getAttendanceForDate(selectedDate).find(r => r.subject_id === subject.id)
                                            : null;

                                        return (
                                            <div key={subject.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-dim/50 border border-transparent hover:border-outline-variant/20 transition-colors">
                                                <span className="text-on-surface text-sm">{subject.name}</span>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant={existingRecord?.status === 'present' ? 'filled' : 'ghost'}
                                                        size="sm"
                                                        onClick={() => handleMarkAttendance(subject.id, 'present')}
                                                        className={`h-8 px-3 ${existingRecord?.status === 'present' ? 'bg-green-600/80' : 'text-green-600'}`}
                                                    >
                                                        P
                                                    </Button>
                                                    <Button
                                                        variant={existingRecord?.status === 'absent' ? 'filled' : 'ghost'}
                                                        size="sm"
                                                        onClick={() => handleMarkAttendance(subject.id, 'absent')}
                                                        className={`h-8 px-3 ${existingRecord?.status === 'absent' ? 'bg-red-600/80' : 'text-red-600'}`}
                                                    >
                                                        A
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default Calendar;
