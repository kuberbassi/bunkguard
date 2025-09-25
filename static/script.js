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
        dailyDetailModal: document.getElementById('dailyDetailModal'),
        closeDailyDetailModalBtn: document.getElementById('closeDailyDetailModalBtn'),
        dailyDetailDate: document.getElementById('dailyDetailDate'),
        dailyDetailContent: document.getElementById('dailyDetailContent'),
    };

    // --- STATE ---
    // Reads the current semester from the browser's memory (set by global.js)
    let currentSemester = localStorage.getItem('selectedSemester') || 1;
    let calendarDate = new Date();

    // --- RENDER FUNCTIONS ---
    const render = {
        skeletons: () => {
            dom.bunkMeterList.innerHTML = Array(4).fill('<div class="skeleton bunk-item-skeleton"></div>').join('');
            dom.recentActivityList.innerHTML = Array(3).fill('<div class="skeleton activity-skeleton"></div>').join('');
            dom.allTimeStats.innerHTML = '<div class="skeleton stat-skeleton"></div>';
            dom.deadlineList.innerHTML = Array(3).fill('<div class="skeleton deadline-skeleton"></div>').join('');
        },
        overallAttendance: (p) => {
            const percentage = parseFloat(p) || 0;
            dom.radialProgress.style.setProperty('--progress', percentage);
            dom.progressValue.innerHTML = `${percentage.toFixed(1)}<span>%</span>`;
        },
        bunkMeter: (subjects) => {
            const bunkMeterContainer = dom.bunkMeterList;
            bunkMeterContainer.innerHTML = '';
            if (!subjects || subjects.length === 0) {
                bunkMeterContainer.innerHTML = `<p class="empty-state">No subjects for Semester ${currentSemester}.</p>`;
                return;
            }
            bunkMeterContainer.className = 'bunk-meter-card-grid';
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
                bunkMeterContainer.appendChild(item);
            });
        },
        recentActivity: (logs, container) => {
            container.innerHTML = '';
            if (!logs || logs.length === 0) { container.innerHTML = '<p class="empty-state">No recent activity.</p>'; return; }
            container.innerHTML = logs.map(log => {
                const icon = log.status === 'present' ? 'bx-check-circle' : 'bx-x-circle';
                const statusClass = log.status === 'present' ? 'status-present' : 'status-absent';
                return `<div class="activity-item"><i class='bx ${icon} ${statusClass}'></i><div class="activity-text"><p>Marked <strong>${log.subject_info.name}</strong> as ${log.status}</p><span>${new Date(log.timestamp.$date).toLocaleString()}</span></div></div>`;
            }).join('');
        },
        semesterStats: (stats) => {
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
            dom.deadlineList.innerHTML = '';
            if (!deadlines || deadlines.length === 0) { dom.deadlineList.innerHTML = '<p class="empty-state">No pending deadlines. 🎉</p>'; return; }
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
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const attendanceData = await (await fetch(`/api/calendar_data?month=${month + 1}&year=${year}`)).json();
            let html = '';
            for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) { html += '<div class="calendar-day empty"></div>'; }
            for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                const status = attendanceData[dateStr] || '';
                html += `<div class="calendar-day ${status}" data-date="${dateStr}"><span class="day-number">${i}</span></div>`;
            }
            dom.calendarGrid.innerHTML = html;
        },
        dailyDetails: (logs, date) => {
            const dateObj = new Date(date + 'T00:00:00');
            dom.dailyDetailDate.textContent = `Attendance for ${dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;
            if (!logs || logs.length === 0) { dom.dailyDetailContent.innerHTML = '<p class="empty-state">No attendance was marked for this day.</p>'; return; }
            dom.dailyDetailContent.innerHTML = logs.map(log => {
                const statusClass = log.status === 'present' ? 'status-present' : 'status-absent';
                const icon = log.status === 'present' ? 'bx-check' : 'bx-x';
                return `<div class="daily-log-item"><i class='bx ${icon} ${statusClass}'></i><span>${log.subject_name}</span><strong class="${statusClass}">${log.status}</strong></div>`;
            }).join('');
        }
    };

    // --- API & DATA LOADING ---
    const loadDashboard = async () => {
        render.skeletons();
        try {
            const [dashRes, summaryRes, logsRes] = await Promise.all([
                fetch(`/api/dashboard_data?semester=${currentSemester}`),
                fetch(`/api/dashboard_summary?semester=${currentSemester}`),
                fetch('/api/attendance_logs?limit=3')
            ]);
            const dashData = await dashRes.json();
            const summaryData = await summaryRes.json();
            const recentLogs = await logsRes.json();
            dom.systemStatus.textContent = `SYSTEM STATUS: ONLINE | ${dashData.current_date}`;
            render.overallAttendance(dashData.overall_attendance);
            render.bunkMeter(dashData.subjects_overview);
            render.semesterStats(summaryData.semester_stats);
            render.recentActivity(recentLogs, dom.recentActivityList);
            loadDeadlines();
        } catch (error) { console.error("Failed to load dashboard:", error); }
    };

    const loadDeadlines = async () => {
        try {
            const res = await fetch('/api/deadlines');
            render.deadlines(await res.json());
        } catch (error) { console.error("Failed to load deadlines:", error) }
    };

    // --- EVENT LISTENERS ---
    const setupEventListeners = () => {
        // NOTE: The Semester Selector logic has been moved to global.js
        // and is intentionally removed from this file to prevent conflicts.

        // Add Subject Modal
        dom.addNewBtn.addEventListener('click', () => dom.addModal.classList.remove('hidden'));
        dom.closeModalBtn.addEventListener('click', () => dom.addModal.classList.add('hidden'));
        dom.addModal.addEventListener('click', (e) => e.target === dom.addModal && dom.addModal.classList.add('hidden'));
        dom.addSubjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await fetch('/api/add_subject', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject_name: e.target.subjectName.value, semester: e.target.subjectSemester.value }) });
            dom.addModal.classList.add('hidden'); e.target.reset();
            if (e.target.subjectSemester.value == currentSemester) loadDashboard();
        });

        // Activity Modal
        dom.viewAllActivityBtn.addEventListener('click', async () => {
            dom.activityModal.classList.remove('hidden');
            render.recentActivity(await (await fetch('/api/attendance_logs')).json(), dom.fullActivityLog);
        });
        dom.closeActivityModalBtn.addEventListener('click', () => dom.activityModal.classList.add('hidden'));
        dom.activityModal.addEventListener('click', (e) => e.target === dom.activityModal && dom.activityModal.classList.add('hidden'));

        // Deadline Modal & Actions
        dom.addDeadlineBtn.addEventListener('click', () => dom.deadlineModal.classList.remove('hidden'));
        dom.closeDeadlineModalBtn.addEventListener('click', () => dom.deadlineModal.classList.add('hidden'));
        dom.deadlineModal.addEventListener('click', (e) => e.target === dom.deadlineModal && dom.deadlineModal.classList.add('hidden'));
        dom.addDeadlineForm.addEventListener('submit', async e => {
            e.preventDefault();
            await fetch('/api/add_deadline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: e.target.deadlineTitle.value, due_date: e.target.deadlineDate.value }) });
            dom.deadlineModal.classList.add('hidden'); e.target.reset();
            loadDeadlines();
        });
        dom.deadlineList.addEventListener('click', async e => {
            const btn = e.target.closest('.complete-btn');
            if (btn) {
                await fetch(`/api/toggle_deadline/${btn.dataset.id}`, { method: 'POST' });
                loadDeadlines();
            }
        });
        dom.addNewBtn.addEventListener('click', () => dom.addModal.classList.remove('hidden'));

        // Calendar Click & Daily Detail Modal
        dom.calendarGrid.addEventListener('click', async e => {
            const dayCell = e.target.closest('.calendar-day');
            if (dayCell && !dayCell.classList.contains('empty')) {
                const date = dayCell.dataset.date;
                dom.dailyDetailModal.classList.remove('hidden');
                dom.dailyDetailContent.innerHTML = '<div class="skeleton activity-skeleton"></div>';
                const res = await fetch(`/api/logs_for_date?date=${date}`);
                const logs = await res.json();
                render.dailyDetails(logs, date);
            }
        });
        dom.closeDailyDetailModalBtn.addEventListener('click', () => dom.dailyDetailModal.classList.add('hidden'));
        dom.dailyDetailModal.addEventListener('click', (e) => e.target === dom.dailyDetailModal && dom.dailyDetailModal.classList.add('hidden'));

        // Calendar Navigation
        dom.prevMonthBtn.addEventListener('click', () => {
            calendarDate.setMonth(calendarDate.getMonth() - 1);
            render.calendar();
        });
        dom.nextMonthBtn.addEventListener('click', () => {
            calendarDate.setMonth(calendarDate.getMonth() + 1);
            render.calendar();
        });
    };

    // --- INITIALIZE ---
    loadDashboard();
    render.calendar();
    setupEventListeners();
});