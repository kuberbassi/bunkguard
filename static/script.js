document.addEventListener('DOMContentLoaded', () => {
    const dom = {
        systemStatus: document.getElementById('systemStatus'),
        progressValue: document.getElementById('progressValue'),
        radialProgress: document.querySelector('.radial-progress'),
        subjectPerformanceList: document.getElementById('subjectPerformanceList'),
        recentActivityList: document.getElementById('recentActivityList'),
        allTimeStats: document.getElementById('allTimeStats'),
        atRiskSubjectsList: document.getElementById('atRiskSubjectsList'),
        semesterSelect: document.getElementById('semesterSelect'),
        addNewBtn: document.getElementById('addNewBtn'),
        closeModalBtn: document.getElementById('closeModalBtn'),
        addModal: document.getElementById('addModal'),
        addSubjectForm: document.getElementById('addSubjectForm')
    };
    let currentSemester = 1;

    const render = {
        skeletons: () => {
            dom.subjectPerformanceList.innerHTML = Array(4).fill('<div class="skeleton subject-perf-skeleton"></div>').join('');
            dom.recentActivityList.innerHTML = Array(3).fill('<div class="skeleton activity-skeleton"></div>').join('');
            dom.allTimeStats.innerHTML = '<div class="skeleton stat-skeleton"></div>';
            dom.atRiskSubjectsList.innerHTML = '<div class="skeleton at-risk-skeleton"></div>';
        },
        overallAttendance: (p) => {
            dom.radialProgress.style.setProperty('--progress', parseFloat(p) || 0);
            dom.progressValue.innerHTML = `${(parseFloat(p) || 0).toFixed(1)}<span>%</span>`;
        },
        subjectPerformance: (subjects) => {
            dom.subjectPerformanceList.innerHTML = '';
            if (!subjects || subjects.length === 0) {
                dom.subjectPerformanceList.innerHTML = `<div class="empty-state-good"><i class='bx bx-party'></i><p>No subjects found for Semester ${currentSemester}.<br>Add some to get started!</p></div>`;
                return;
            }
            subjects.forEach(sub => {
                const item = document.createElement('div');
                item.className = `subject-perf-item status-${sub.status}`;
                // RE-INTEGRATED the Bunk Meter message (safe skips / attend next)
                item.innerHTML = `
            <div class="subject-info">
                <h4>${sub.name}</h4>
                <span>${sub.status_message}</span>
            </div>
            <div class="subject-stats">
                <div class="stat-value">${sub.percentage}%</div>
                <div class="stat-label">Attendance</div>
            </div>
        `;
                dom.subjectPerformanceList.appendChild(item);
            });
        },
        recentActivity: (logs) => {
            dom.recentActivityList.innerHTML = '';
            if (!logs || logs.length === 0) { dom.recentActivityList.innerHTML = '<p class="empty-state">No recent activity.</p>'; return; }
            const ul = document.createElement('ul'); ul.className = 'activity-list';
            logs.forEach(log => {
                const li = document.createElement('li'); li.className = 'activity-item';
                const icon = log.status === 'present' ? 'bx-check-circle' : 'bx-x-circle'; const statusClass = log.status === 'present' ? 'status-present' : 'status-absent';
                li.innerHTML = `<i class='bx ${icon} ${statusClass}'></i><div class="activity-text"><p>Marked <strong>${log.subject_info.name}</strong> as ${log.status}</p><span>${new Date(log.timestamp.$date).toLocaleString()}</span></div>`;
                ul.appendChild(li);
            });
            dom.recentActivityList.appendChild(ul);
        },
        allTimeStats: (stats) => {
            dom.allTimeStats.innerHTML = `<div class="stat-item"><span class="stat-value">${stats.percentage.toFixed(1)}%</span><span class="stat-label">All-Time Avg</span></div><div class="stat-item"><span class="stat-value">${stats.attended}/${stats.total}</span><span class="stat-label">Classes Attended</span></div>`;
        },
        atRiskSubjects: (subjects) => {
            if (!subjects || subjects.length === 0) {
                dom.atRiskSubjectsList.innerHTML = `<div class="empty-state-good"><i class='bx bxs-check-shield'></i> All subjects are in the safe zone. Keep it up!</div>`;
                return;
            }
            // FIXED the "sem1" typo here
            dom.atRiskSubjectsList.innerHTML = subjects.map(s => `
        <div class="at-risk-item">
            <div class="at-risk-info">
                <h4>${s.name}</h4>
                <span>Semester ${s.semester}</span>
            </div>
            <div class="at-risk-percent">${s.percentage}%</div>
        </div>
    `).join('');
        }
    };

    const loadDashboard = async () => {
        render.skeletons();
        try {
            const [dashRes, summaryRes, logsRes] = await Promise.all([
                fetch(`/api/dashboard_data?semester=${currentSemester}`),
                fetch('/api/dashboard_summary'),
                fetch('/api/attendance_logs?limit=3')
            ]);
            if (!dashRes.ok || !summaryRes.ok) throw new Error('Failed to load dashboard data');

            const dashData = await dashRes.json();
            const summaryData = await summaryRes.json();
            const recentLogs = await logsRes.json();

            dom.systemStatus.textContent = `SYSTEM STATUS: ONLINE | ${dashData.current_date}`;
            render.overallAttendance(dashData.overall_attendance);
            render.subjectPerformance(dashData.subjects_overview);
            render.allTimeStats(summaryData.all_time_stats);
            render.atRiskSubjects(summaryData.at_risk_subjects);
            render.recentActivity(recentLogs);
        } catch (error) {
            console.error("Failed to load dashboard:", error);
            dom.systemStatus.textContent = 'SYSTEM STATUS: FAILED TO LOAD DATA';
        }
    };

    dom.semesterSelect.addEventListener('change', (e) => { currentSemester = e.target.value; loadDashboard(); });
    dom.addNewBtn.addEventListener('click', () => dom.addModal.classList.remove('hidden'));
    dom.closeModalBtn.addEventListener('click', () => dom.addModal.classList.add('hidden'));
    dom.addModal.addEventListener('click', (e) => e.target === dom.addModal && dom.addModal.classList.add('hidden'));
    dom.addSubjectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const subjectName = document.getElementById('subjectName').value;
        const semester = document.getElementById('subjectSemester').value;
        const res = await fetch('/api/add_subject', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject_name: subjectName, semester: semester }) });
        if (res.ok) {
            dom.addModal.classList.add('hidden'); dom.addSubjectForm.reset();
            if (semester == currentSemester) loadDashboard();
        } else alert('Failed to add subject.');
    });

    loadDashboard();

    const NotificationManager = { /* ... Notification code from previous turn ... */ };
    NotificationManager.init();
});