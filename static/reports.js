document.addEventListener('DOMContentLoaded', () => {
    const renderSemesterOverview = (overviewData) => {
        const listEl = document.getElementById('semesterOverviewList');
        if (!listEl) return;
        listEl.innerHTML = '';
        if (overviewData.length === 0) { listEl.innerHTML = '<p class="empty-state">No semester data to display.</p>'; return; }
        overviewData.forEach(sem => {
            const item = document.createElement('div');
            item.className = 'semester-overview-item';
            item.innerHTML = `<div class="semester-info"><h4>Semester ${sem.semester}</h4><div class="progress-bar"><div class="progress" style="width: ${sem.percentage}%"></div></div></div><div class="semester-stats"><div class="stat-value">${sem.percentage.toFixed(1)}%</div><a href="/report/${sem.semester}/print" target="_blank" class="report-download-link"><i class='bx bxs-download'></i></a></div>`;
            listEl.appendChild(item);
        });
    };
    
    const renderDayOfWeekChart = (analyticsData) => {
        const loader = document.getElementById('dayOfWeekChartLoader');
        const canvas = document.getElementById('dayOfWeekChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!analyticsData || analyticsData.percentages.every(p => p === 0)) { 
            loader.innerHTML = '<p class="empty-state">Not enough data for weekly trends.</p>'; 
            return;
        }
        loader.style.display = 'none';
        canvas.style.display = 'block';
        new Chart(ctx, {
            type: 'line', data: { labels: analyticsData.labels, datasets: [{ label: 'Attendance %', data: analyticsData.percentages, borderColor: '#00FFAB', backgroundColor: 'rgba(0, 255, 171, 0.2)', fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, ticks: { color: '#AAAAAA', callback: (value) => value + '%' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }, x: { ticks: { color: '#AAAAAA' }, grid: { display: false } } } }
        });
    };

    const renderAttendanceLogs = (logs) => {
        const logListEl = document.getElementById('fullAttendanceLogList');
        if (!logListEl) return;
        logListEl.innerHTML = '';
        if (logs.length === 0) { logListEl.innerHTML = '<p class="empty-state">No attendance has been marked yet.</p>'; return; }
        logs.forEach(log => {
            const item = document.createElement('div');
            item.className = 'log-item';
            const icon = log.status === 'present' ? 'bx-check-circle' : 'bx-x-circle';
            const statusClass = log.status === 'present' ? 'status-present' : 'status-absent';
            item.innerHTML = `<i class='bx ${icon} ${statusClass}'></i><div class="log-details"><p>Marked <strong>${log.subject_info.name}</strong> as ${log.status}</p><span class="log-timestamp">${new Date(log.timestamp.$date).toLocaleString()}</span></div>`;
            logListEl.appendChild(item);
        });
    };

    const loadPageData = async () => {
        try {
            const [overviewRes, analyticsRes, logsRes] = await Promise.all([
                fetch('/api/all_semesters_overview'),
                fetch('/api/analytics/day_of_week'),
                fetch('/api/attendance_logs')
            ]);
            renderSemesterOverview(await overviewRes.json());
            renderDayOfWeekChart(await analyticsRes.json());
            renderAttendanceLogs(await logsRes.json());
        } catch (error) {
            console.error("Failed to load reports page:", error);
        }
    };
    
    loadPageData();
});