document.addEventListener('DOMContentLoaded', () => {
    const attendanceList = document.getElementById('attendanceList');
    const markAllPresentBtn = document.getElementById('markAllPresentBtn');
    const markAllAbsentBtn = document.getElementById('markAllAbsentBtn');
    const noteModal = document.getElementById('noteModal');
    const closeNoteModalBtn = document.getElementById('closeNoteModalBtn');
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    const noteTextarea = document.getElementById('attendanceNote');

    let todaysClasses = [];
    let noteContext = {}; // To store subjectId, status, and logId for the modal

    // Global variable to store attendance dates
    let attendanceDates = new Set();

    // Calendar attendance data
    let calendarAttendanceData = {};

    // Load attendance for calendar
    async function loadCalendarAttendance(year, month) {
        try {
            const response = await fetch(`/api/attendance_calendar?year=${year}&month=${month}`);
            const data = await response.json();

            if (data.success) {
                calendarAttendanceData = data.dates;
                updateCalendarDots();
            }
        } catch (error) {
            console.error('Error loading calendar attendance:', error);
        }
    }

    // Update calendar dots based on attendance status
    function updateCalendarDots() {
        const calendarDays = document.querySelectorAll('.calendar-day');

        calendarDays.forEach(day => {
            const dateStr = day.dataset.date; // Format: "2025-10-21"

            // Remove existing dots
            const existingDot = day.querySelector('.attendance-dot');
            if (existingDot) {
                existingDot.remove();
            }

            // Check if this date has attendance
            if (calendarAttendanceData[dateStr]) {
                const status = calendarAttendanceData[dateStr];
                const dot = document.createElement('div');
                dot.className = 'attendance-dot';

                // Set color based on status
                if (status.all_present) {
                    dot.style.backgroundColor = '#10b981'; // Green - all present
                } else if (status.all_absent) {
                    dot.style.backgroundColor = '#ef4444'; // Red - all absent
                } else if (status.mixed) {
                    dot.style.backgroundColor = '#f59e0b'; // Orange - mixed
                }

                day.appendChild(dot);
            }
        });
    }

    // When calendar month changes
    function onCalendarMonthChange(year, month) {
        loadCalendarAttendance(year, month);
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', () => {
        const now = new Date();
        loadCalendarAttendance(now.getFullYear(), now.getMonth() + 1);
    });


    // Function to load attendance dates for a specific month
    async function loadAttendanceDates(year, month) {
        try {
            // API call to get all attendance logs for the specified month
            const response = await fetch(`/api/attendance_history?year=${year}&month=${month}`);
            const data = await response.json();

            if (data.success && data.dates) {
                // Clear existing dates
                attendanceDates.clear();

                // Add all dates with attendance to the Set
                data.dates.forEach(dateStr => {
                    attendanceDates.add(dateStr); // Format: "2025-10-21"
                });

                // Update calendar dots
                updateCalendarDots();
            }
        } catch (error) {
            console.error('Error loading attendance dates:', error);
        }
    }

    // Function to check if a date has attendance
    function hasAttendance(year, month, day) {
        // Create date string in format "YYYY-MM-DD"
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return attendanceDates.has(dateStr);
    }

    // Function to update calendar visual dots
    function updateCalendarDots() {
        // Get all calendar day cells
        const dayCells = document.querySelectorAll('.calendar-day');

        dayCells.forEach(cell => {
            const day = cell.dataset.day;
            const month = cell.dataset.month;
            const year = cell.dataset.year;

            // Check if this date has attendance
            if (hasAttendance(year, month, day)) {
                // Add green dot indicator
                if (!cell.querySelector('.attendance-dot')) {
                    const dot = document.createElement('div');
                    dot.className = 'attendance-dot';
                    cell.appendChild(dot);
                }
            } else {
                // Remove dot if it exists
                const existingDot = cell.querySelector('.attendance-dot');
                if (existingDot) {
                    existingDot.remove();
                }
            }
        });
    }

    // When calendar month changes, reload attendance dates
    function onMonthChange(year, month) {
        loadAttendanceDates(year, month + 1); // month is 0-indexed, so add 1
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', () => {
        const now = new Date();
        loadAttendanceDates(now.getFullYear(), now.getMonth() + 1);
    });


    // Utility to show toast notifications
    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    };

    // API call to mark initial attendance
    const markSingleAttendance = async (subjectId, status, notes = null) => {
        try {
            const response = await fetch('/api/mark_attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject_id: subjectId, status: status, notes: notes }),
            });
            const result = await response.json();
            if (result.success) {
                return true;
            } else {
                showToast(result.error || 'Could not mark attendance.', 'error');
                return false;
            }
        } catch (error) {
            console.error('Error marking attendance:', error);
            showToast('A server error occurred.');
            return false;
        }
    };

    const editSingleAttendance = async (logId, status, notes = null) => {
        try {
            const response = await fetch(`/api/edit_attendance/${logId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: status, notes: notes }),
            });
            const result = await response.json();
            if (result.success) {
                return true;
            } else {
                showToast(result.error || 'Could not edit attendance.', 'error');
                return false;
            }
        } catch (error) {
            console.error('Error editing attendance:', error);
            showToast('A server error occurred.');
            return false;
        }
    };

    const markAll = async (status) => {
        const unMarkedIds = todaysClasses
            .filter(c => c.marked_status === 'pending')
            .map(c => c._id.$oid);

        if (unMarkedIds.length === 0) {
            showToast("All classes have already been marked.", 'info');
            return;
        }

        const response = await fetch('/api/mark_all_attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject_ids: unMarkedIds, status: status }),
        });
        const result = await response.json();
        if (result.success) {
            showToast(result.message, 'success');
            loadTodaysClasses();
        }
    };

    const loadTodaysClasses = async () => {
        try {
            const response = await fetch('/api/todays_classes');
            todaysClasses = await response.json();
            attendanceList.innerHTML = '';

            if (todaysClasses.length === 0) {
                attendanceList.innerHTML = `
                <div class="empty-state-container">
                    <i class='bx bx-calendar-check'></i>
                    <h3>All Clear for Today!</h3>
                    <p>No classes are scheduled in your timetable for today.</p>
                </div>`;
                attendanceList.className = 'attendance-list-empty';
                if (markAllPresentBtn) markAllPresentBtn.style.display = 'none';
                if (markAllAbsentBtn) markAllAbsentBtn.style.display = 'none';
                return;
            }

            attendanceList.className = 'attendance-list-container';
            if (markAllPresentBtn) markAllPresentBtn.style.display = 'inline-flex';
            if (markAllAbsentBtn) markAllAbsentBtn.style.display = 'inline-flex';

            todaysClasses.forEach((sub, index) => {
                const card = document.createElement('div');
                card.className = 'attendance-card';
                card.dataset.id = sub._id.$oid;
                if (sub.log_id) card.dataset.logId = sub.log_id;
                card.style.setProperty('--animation-order', index);

                let actionsHtml;
                if (sub.marked_status !== 'pending') {
                    actionsHtml = `
                        <div class="marked-status-container">
                            <div class="marked-status ${sub.marked_status}">${sub.marked_status.replace('_', ' ')}</div>
                            <button class="edit-btn" data-action="edit"><i class='bx bx-pencil'></i></button>
                        </div>
                    `;
                } else {
                    actionsHtml = `
                        <div class="attendance-actions-new">
                            <div class="button-group">
                                <button class="action-btn-new present" data-status="present">Present</button>
                                <button class="action-btn-new absent" data-status="absent">Absent</button>
                            </div>
                            <div class="more-options-links">
                                <a href="#" data-status="pending_medical">Medical Leave</a>
                                <a href="#" data-status="cancelled">Cancelled</a>
                                <a href="#" data-status="substituted">Substituted</a>
                            </div>
                        </div>
                    `;
                }

                card.innerHTML = `
                    <div class="card-info">
                        <h3>${sub.name}</h3>
                        <p>Status: <span class="status-text">${sub.marked_status}</span></p>
                    </div>
                    <div class="card-actions-container">${actionsHtml}</div>`;
                attendanceList.appendChild(card);
            });

        } catch (error) {
            console.error("Error loading today's classes:", error);
            attendanceList.innerHTML = `<p class="empty-state">Could not load today's schedule. Please set up your schedule first.</p>`;
        }
    };

    const openNoteModal = (subjectId, status, logId = null) => {
        noteContext = { subjectId, status, logId };
        noteModal.classList.remove('hidden');
        noteTextarea.focus();
    };

    const closeNoteModal = () => {
        noteModal.classList.add('hidden');
        noteTextarea.value = '';
        noteContext = {};
    };

    attendanceList.addEventListener('click', async (e) => {
        const card = e.target.closest('.attendance-card');
        if (!card) return;

        const subjectId = card.dataset.id;
        const logId = card.dataset.logId;
        const status = e.target.dataset.status;
        const action = e.target.dataset.action;

        if (action === 'edit') {
            card.querySelector('.card-actions-container').innerHTML = `
                <div class="attendance-actions-new">
                    <div class="button-group">
                        <button class="action-btn-new present" data-status="present">Present</button>
                        <button class="action-btn-new absent" data-status="absent">Absent</button>
                    </div>
                    <div class="more-options-links">
                        <a href="#" data-status="pending_medical">Medical Leave</a>
                        <a href="#" data-status="cancelled">Cancelled</a>
                        <a href="#" data-status="substituted">Substituted</a>
                    </div>
                </div>
            `;
            return;
        }

        if (status) {
            e.preventDefault();
            if (status === 'absent' || status === 'pending_medical') {
                openNoteModal(subjectId, status, logId);
            } else {
                let success = false;
                if (logId) {
                    success = await editSingleAttendance(logId, status);
                } else {
                    success = await markSingleAttendance(subjectId, status);
                }
                if (success) {
                    loadTodaysClasses();
                }
            }
        }
    });

    if (markAllPresentBtn) markAllPresentBtn.addEventListener('click', () => markAll('present'));
    if (markAllAbsentBtn) markAllAbsentBtn.addEventListener('click', () => markAll('absent'));

    if (closeNoteModalBtn) closeNoteModalBtn.addEventListener('click', closeNoteModal);
    if (noteModal) noteModal.addEventListener('click', (e) => e.target === noteModal && closeNoteModal());

    if (saveNoteBtn) saveNoteBtn.addEventListener('click', async () => {
        const { subjectId, status, logId } = noteContext;
        const notes = noteTextarea.value;
        let success = false;
        if (logId) {
            success = await editSingleAttendance(logId, status, notes);
        } else {
            success = await markSingleAttendance(subjectId, status, notes);
        }

        if (success) {
            closeNoteModal();
            loadTodaysClasses();
        }
    });

    loadTodaysClasses();
});