document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENT CACHE ---
    const dom = {
        // Core
        systemStatus: document.getElementById('systemStatus'),
        progressValue: document.getElementById('progressValue'),
        radialProgress: document.querySelector('.radial-progress'),
        // Widgets
        bunkMeterList: document.getElementById('bunkMeterList'),
        recentActivityList: document.getElementById('recentActivityList'),
        allTimeStats: document.getElementById('allTimeStats'),
        deadlineList: document.getElementById('deadlineList'),
        // Modals & Forms
        addModal: document.getElementById('addModal'),
        addNewBtn: document.getElementById('addNewBtn'),
        closeModalBtn: document.getElementById('closeModalBtn'),
        addSubjectForm: document.getElementById('addSubjectForm'),
        activityModal: document.getElementById('activityModal'),
        viewAllActivityBtn: document.getElementById('viewAllActivityBtn'),
        closeActivityModalBtn: document.getElementById('closeActivityModalBtn'),
        fullActivityLog: document.getElementById('fullActivityLog'),
        deadlineModal: document.getElementById('deadlineModal'),
        addDeadlineBtn: document.getElementById('addDeadlineBtn'),
        closeDeadlineModalBtn: document.getElementById('closeDeadlineModalBtn'),
        addDeadlineForm: document.getElementById('addDeadlineForm'),
        // Calendar & Daily Detail Modal
        calendarGrid: document.getElementById('calendarGrid'),
        monthYear: document.getElementById('monthYear'),
        prevMonthBtn: document.getElementById('prevMonthBtn'),
        nextMonthBtn: document.getElementById('nextMonthBtn'),
        
        // New Modal for Marking Attendance from Calendar
        markDateModal: document.getElementById('markDateModal'),
        closeMarkDateModalBtn: document.getElementById('closeMarkDateModalBtn'),
        markDateModalTitle: document.getElementById('markDateModalTitle'),
        markDateModalContent: document.getElementById('markDateModalContent'),
    };

    // --- STATE ---
    let currentSemester = localStorage.getItem('selectedSemester') || 1;
    let calendarDate = new Date();

    // --- RENDER FUNCTIONS ---
    const render = {
        skeletons: () => {
            if (dom.bunkMeterList) dom.bunkMeterList.innerHTML = Array(4).fill('<div class="skeleton bunk-item-skeleton"></div>').join('');
            if (dom.recentActivityList) dom.recentActivityList.innerHTML = Array(3).fill('<div class="skeleton activity-skeleton"></div>').join('');
            if (dom.allTimeStats) dom.allTimeStats.innerHTML = '<div class="skeleton stat-skeleton"></div>';
            if (dom.deadlineList) dom.deadlineList.innerHTML = Array(2).fill('<div class="skeleton deadline-skeleton"></div>').join('');
        },
        overallAttendance: (p) => {
            if (!dom.radialProgress) return;
            const percentage = parseFloat(p) || 0;
            dom.radialProgress.style.setProperty('--progress', percentage);
            dom.progressValue.innerHTML = `${percentage.toFixed(1)}<span>%</span>`;
        },
        bunkMeter: (subjects) => {
            if (!dom.bunkMeterList) return;
            dom.bunkMeterList.innerHTML = '';
            if (!subjects || subjects.length === 0) {
                dom.bunkMeterList.innerHTML = `<p class="empty-state" style="text-align:center; padding: 20px;">No subjects found for Semester ${currentSemester}. Add one to get started!</p>`;
                return;
            }
            dom.bunkMeterList.className = 'bunk-meter-card-grid';
            subjects.forEach(sub => {
                const item = document.createElement('div');
                item.className = `subject-card-item status-${sub.status}`;
                item.innerHTML = `
                    <div class="card-header">
                        <h5 class="subject-name">${sub.name}</h5>
                        <span class="percentage">${Math.round(sub.percentage)}%</span>
                    </div>
                    <div class="progress-bar-wrapper">
                        <div class="progress-bar-fill" style="width: ${sub.percentage}%"></div>
                    </div>
                    <p class="status-message">${sub.status_message}</p>`;
                dom.bunkMeterList.appendChild(item);
            });
        },
        recentActivity: (logs, container) => {
            if (!container) return;
            container.innerHTML = '';
            if (!logs || logs.length === 0) { container.innerHTML = '<p class="empty-state">No recent activity.</p>'; return; }
            container.innerHTML = logs.map(log => {
                const icon = log.status.includes('present') || log.status.includes('approved') ? 'bx-check-circle' : 'bx-x-circle';
                const statusClass = log.status.includes('present') || log.status.includes('approved') ? 'status-present' : 'status-absent';
                const subjectName = log.subject_info ? log.subject_info.name : 'Unknown Subject';
                return `<div class="activity-item"><i class='bx ${icon} ${statusClass}'></i><div class="activity-text"><p>Marked <strong>${subjectName}</strong> as ${log.status.replace('_',' ')}</p><span>${new Date(log.timestamp.$date).toLocaleString()}</span></div></div>`;
            }).join('');
        },
        semesterStats: (stats) => {
            if (!dom.allTimeStats || !stats) return;
            dom.allTimeStats.innerHTML = `
                <div class="stat-item">
                    <span class="stat-value">${stats.percentage.toFixed(1)}%</span>
                    <span class="stat-label">SEMESTER AVG</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.attended}/${stats.total}</span>
                    <span class="stat-label">CLASSES ATTENDED</span>
                </div>`;
        },
        deadlines: (deadlines) => {
            if (!dom.deadlineList) return;
            dom.deadlineList.innerHTML = '';
            if (!deadlines || deadlines.length === 0) { dom.deadlineList.innerHTML = '<li class="empty-state">No pending deadlines. 🎉</li>'; return; }
            deadlines.forEach(d => {
                const item = document.createElement('li');
                item.className = 'deadline-item';
                const dueDate = new Date(d.due_date);
                const isPast = new Date() > dueDate;
                item.innerHTML = `<div class="deadline-info"><span class="deadline-dot ${isPast ? 'past-due' : ''}"></span><div class="deadline-text"><p>${d.title}</p><span>Due: ${dueDate.toLocaleDateString()}</span></div></div><button class="complete-btn" data-id="${d._id.$oid}"><i class='bx bx-check'></i></button>`;
                dom.deadlineList.appendChild(item);
            });
        },
        calendar: async () => {
            if (!dom.calendarGrid) return;
            dom.calendarGrid.innerHTML = '';
            const month = calendarDate.getMonth();
            const year = calendarDate.getFullYear();
            dom.monthYear.textContent = `${calendarDate.toLocaleString('default', { month: 'long' })} ${year}`;
            const firstDayOfMonth = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const attendanceData = await (await fetch(`/api/calendar_data?month=${month + 1}&year=${year}`)).json();
            
            // Adjust for Sunday start (getDay() returns 0 for Sunday)
            const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

            let html = '';
            for (let i = 0; i < startingDay; i++) { html += '<div class="calendar-day empty"></div>'; }
            for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                const status = attendanceData[dateStr] || '';
                html += `<div class="calendar-day ${status}" data-date="${dateStr}"><span class="day-number">${i}</span></div>`;
            }
            dom.calendarGrid.innerHTML = html;
        },
    };

    // --- API & DATA LOADING ---
    const loadDashboard = async () => {
        render.skeletons();
        try {
            const [dashRes, summaryRes, logsRes, deadlinesRes] = await Promise.all([
                fetch(`/api/dashboard_data?semester=${currentSemester}`),
                fetch(`/api/dashboard_summary?semester=${currentSemester}`),
                fetch('/api/attendance_logs?page=1&limit=3'),
                fetch('/api/deadlines')
            ]);
            
            const dashData = await dashRes.json();
            const summaryData = await summaryRes.json();
            const recentLogsData = await logsRes.json();
            const deadlines = await deadlinesRes.json();
            
            if (dom.systemStatus) dom.systemStatus.textContent = `SYSTEM STATUS: ONLINE | ${new Date().toLocaleDateString()}`;
            render.overallAttendance(dashData.overall_attendance);
            render.bunkMeter(dashData.subjects_overview);
            render.semesterStats(summaryData.semester_stats);
            render.recentActivity(recentLogsData.logs, dom.recentActivityList);
            render.deadlines(deadlines);
        } catch (error) { console.error("Failed to load dashboard:", error); }
    };

    // --- NEW MODAL LOGIC ---
    const markSingleAttendanceForDate = async (subjectId, status, date) => {
        try {
            const response = await fetch('/api/mark_attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject_id: subjectId, status: status, date: date }),
            });
            const result = await response.json();
            if (result.success) return true;
            else {
                alert(`Error: ${result.error}`);
                return false;
            }
        } catch (error) {
            console.error('Error marking attendance:', error);
            return false;
        }
    };

    const openMarkingModalForDate = async (dateStr) => {
        dom.markDateModal.classList.remove('hidden');
        dom.markDateModalContent.innerHTML = '<div class="skeleton bunk-item-skeleton" style="height: 150px;"></div>';
        
        const dateObj = new Date(dateStr + 'T12:00:00Z'); // Use noon UTC to avoid timezone issues
        const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
        dom.markDateModalTitle.textContent = `Mark Attendance for ${formattedDate}`;
        dom.markDateModalContent.dataset.date = dateStr;

        const response = await fetch(`/api/classes_for_date?date=${dateStr}`);
        const classes = await response.json();

        dom.markDateModalContent.innerHTML = '';
        if (classes.length === 0) {
            dom.markDateModalContent.innerHTML = `<div class="empty-state-container" style="min-height: 20vh;"><i class='bx bx-calendar-exclamation'></i><h3>No Classes</h3><p>No classes were scheduled for this day in your timetable.</p></div>`;
            return;
        }

        classes.forEach((sub) => {
            const card = document.createElement('div');
            card.className = 'attendance-card';
            card.dataset.id = sub._id.$oid;
            let actionsHtml;
            const actionsContainerOpen = `<div class="card-actions-container">`;
            const actionsContainerClose = `</div>`;

            if (sub.marked_status !== 'pending') {
                actionsHtml = `<div class="marked-status ${sub.marked_status}">${sub.marked_status.replace('_', ' ')}</div>`;
            } else {
                 actionsHtml = `
                    <div class="attendance-actions-new">
                        <div class="button-group">
                            <button class="action-btn-new present" data-status="present">Present</button>
                            <button class="action-btn-new absent" data-status="absent">Absent</button>
                        </div>
                        <div class="more-options-container">
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
                ${actionsContainerOpen}${actionsHtml}${actionsContainerClose}
            `;
            dom.markDateModalContent.appendChild(card);
        });
    };

    // --- EVENT LISTENERS ---
    const setupEventListeners = () => {
        if (dom.addNewBtn) dom.addNewBtn.addEventListener('click', () => dom.addModal.classList.remove('hidden'));
        if (dom.closeModalBtn) dom.closeModalBtn.addEventListener('click', () => dom.addModal.classList.add('hidden'));
        if (dom.addModal) dom.addModal.addEventListener('click', (e) => e.target === dom.addModal && dom.addModal.classList.add('hidden'));
        
        if (dom.addSubjectForm) dom.addSubjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await fetch('/api/add_subject', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject_name: e.target.subjectName.value, semester: e.target.subjectSemester.value }) });
            dom.addModal.classList.add('hidden'); e.target.reset();
            if (e.target.subjectSemester.value == currentSemester) loadDashboard();
        });

        if (dom.viewAllActivityBtn) dom.viewAllActivityBtn.addEventListener('click', async () => {
            dom.activityModal.classList.remove('hidden');
            render.recentActivity(await (await fetch('/api/attendance_logs')).json().logs, dom.fullActivityLog);
        });
        if (dom.closeActivityModalBtn) dom.closeActivityModalBtn.addEventListener('click', () => dom.activityModal.classList.add('hidden'));

        if (dom.addDeadlineBtn) dom.addDeadlineBtn.addEventListener('click', () => dom.deadlineModal.classList.remove('hidden'));
        if (dom.closeDeadlineModalBtn) dom.closeDeadlineModalBtn.addEventListener('click', () => dom.deadlineModal.classList.add('hidden'));
        
        if (dom.addDeadlineForm) dom.addDeadlineForm.addEventListener('submit', async e => {
            e.preventDefault();
            await fetch('/api/add_deadline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: e.target.deadlineTitle.value, due_date: e.target.deadlineDate.value }) });
            dom.deadlineModal.classList.add('hidden'); e.target.reset();
            loadDashboard();
        });
        
        if (dom.deadlineList) dom.deadlineList.addEventListener('click', async e => {
            const btn = e.target.closest('.complete-btn');
            if (btn) {
                await fetch(`/api/toggle_deadline/${btn.dataset.id}`, { method: 'POST' });
                loadDashboard();
            }
        });

        // REVISED Calendar Click Listener
        if (dom.calendarGrid) dom.calendarGrid.addEventListener('click', e => {
            const dayCell = e.target.closest('.calendar-day');
            if (dayCell && !dayCell.classList.contains('empty')) {
                const date = dayCell.dataset.date;
                openMarkingModalForDate(date);
            }
        });

        // Listeners for the new modal
        if (dom.closeMarkDateModalBtn) dom.closeMarkDateModalBtn.addEventListener('click', () => dom.markDateModal.classList.add('hidden'));
        if (dom.markDateModal) dom.markDateModal.addEventListener('click', e => {
            if (e.target === dom.markDateModal) dom.markDateModal.classList.add('hidden');
        });

        // Event delegation for marking attendance inside the new modal
        if (dom.markDateModalContent) dom.markDateModalContent.addEventListener('click', async (e) => {
            const card = e.target.closest('.attendance-card');
            if (!card) return;

            const subjectId = card.dataset.id;
            const date = dom.markDateModalContent.dataset.date;
            let status = null;

            if (e.target.matches('[data-status]')) {
                e.preventDefault();
                status = e.target.dataset.status;
            }

            if (status) {
                if (await markSingleAttendanceForDate(subjectId, status, date)) {
                    const actionsContainer = card.querySelector('.card-actions-container');
                    if(actionsContainer) actionsContainer.innerHTML = `<div class="marked-status ${status}">${status.replace('_', ' ')}</div>`;
                    const statusText = card.querySelector('.status-text');
                    if(statusText) statusText.textContent = status;
                    render.calendar(); // Refresh calendar dot after marking
                }
            }
        });

        // Calendar Navigation
        if (dom.prevMonthBtn) dom.prevMonthBtn.addEventListener('click', () => {
            calendarDate.setMonth(calendarDate.getMonth() - 1);
            render.calendar();
        });
        if (dom.nextMonthBtn) dom.nextMonthBtn.addEventListener('click', () => {
            calendarDate.setMonth(calendarDate.getMonth() + 1);
            render.calendar();
        });
    };

    // --- INITIALIZE ---
    loadDashboard();
    render.calendar();
    setupEventListeners();
});