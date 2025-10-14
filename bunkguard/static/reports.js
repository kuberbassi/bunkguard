document.addEventListener('DOMContentLoaded', () => {
    const currentSemester = localStorage.getItem('selectedSemester') || 1;
    const semesterLabel = document.getElementById('currentSemesterLabel');
    if (semesterLabel) {
        semesterLabel.textContent = currentSemester;
    }

    // --- State for Log Pagination ---
    let logCurrentPage = 1;
    let isFetchingLogs = false;
    const loadMoreLogsBtn = document.getElementById('loadMoreLogsBtn');
    const logListEl = document.getElementById('fullAttendanceLogList');

    // --- RENDER FUNCTIONS (Hardened) ---
    const renderKPIs = (kpis = {}) => {
        document.getElementById('bestSubjectName').textContent = kpis.best_subject_name || '--';
        document.getElementById('bestSubjectPercent').textContent = kpis.best_subject_percent || '--%';
        document.getElementById('worstSubjectName').textContent = kpis.worst_subject_name || '--';
        document.getElementById('worstSubjectPercent').textContent = kpis.worst_subject_percent || '--%';
        document.getElementById('attendanceStreak').textContent = kpis.streak || '0';
        document.getElementById('totalAbsences').textContent = kpis.total_absences || '0';
    };

    const renderSubjectBreakdown = (subjects = []) => {
        const listEl = document.getElementById('subjectBreakdownList');
        if (!subjects || subjects.length === 0) {
            listEl.innerHTML = '<p class="empty-state" style="padding: 20px;">No subject data for this semester.</p>';
            return;
        }
        listEl.innerHTML = subjects.map(sub => `
            <div class="subject-breakdown-item">
                <div class="subject-breakdown-info">
                    <h5>${sub.name}</h5>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${sub.percentage}%"></div>
                    </div>
                </div>
                <div class="subject-breakdown-percent">${sub.percentage.toFixed(1)}%</div>
            </div>
        `).join('');
    };

    const renderHeatmap = (heatmapData = {}) => {
        const container = document.getElementById('heatmapContainer');
        if (!container) return;
        container.innerHTML = '';
        const today = new Date();
        for (let i = 34; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const statuses = heatmapData[dateStr] || [];
            let statusClass = '';
            if (statuses.includes('present') && statuses.includes('absent')) {
                statusClass = 'partial';
            } else if (statuses.includes('present')) {
                statusClass = 'present';
            } else if (statuses.includes('absent')) {
                statusClass = 'absent';
            }
            container.innerHTML += `<div class="heatmap-day ${statusClass}" title="${dateStr}"></div>`;
        }
    };

    const renderDayOfWeekChart = (analyticsData = { labels: [], percentages: [] }) => {
        const canvas = document.getElementById('dayOfWeekChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!analyticsData || analyticsData.percentages.every(p => p === 0)) {
            const parent = canvas.parentElement;
            if(parent) parent.innerHTML = '<p class="empty-state" style="padding: 20px;">Not enough data for weekly trends.</p>';
            return;
        }
        new Chart(ctx, {
            type: 'line', data: { labels: analyticsData.labels, datasets: [{ label: 'Attendance %', data: analyticsData.percentages, borderColor: '#00FFAB', backgroundColor: 'rgba(0, 255, 171, 0.2)', fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, ticks: { color: '#AAAAAA', callback: (value) => value + '%' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }, x: { ticks: { color: '#AAAAAA' }, grid: { display: false } } } }
        });
    };

    const renderAttendanceLogs = (logs = [], append = false) => {
        if (!logListEl) return;
        if (!append) {
            logListEl.innerHTML = '';
        }
        if (logs.length === 0 && !append) {
            logListEl.innerHTML = '<p class="empty-state" style="padding: 20px;">No attendance has been marked yet.</p>';
            return;
        }
        const logsHtml = logs.map(log => {
            const icon = log.status.includes('present') || log.status.includes('approved') ? 'bx-check-circle' : 'bx-x-circle';
            const statusClass = log.status.includes('present') || log.status.includes('approved') ? 'status-present' : 'status-absent';
            return `
                <div class="log-item">
                    <i class='bx ${icon} ${statusClass}'></i>
                    <div class="log-details">
                        <p>Marked <strong>${log.subject_info.name}</strong> as ${log.status.replace('_', ' ')}</p>
                        <span class="log-timestamp">${new Date(log.timestamp.$date).toLocaleString()}</span>
                    </div>
                </div>`;
        }).join('');
        logListEl.insertAdjacentHTML('beforeend', logsHtml);
    };

    // --- DATA FETCHING ---

    const fetchMoreLogs = async () => {
        if (isFetchingLogs) return;
        isFetchingLogs = true;
        loadMoreLogsBtn.textContent = 'Loading...';
        logCurrentPage++;

        try {
            const res = await fetch(`/api/attendance_logs?page=${logCurrentPage}&limit=15`);
            const data = await res.json();
            renderAttendanceLogs(data.logs, true); // Append new logs
            if (data.has_next_page) {
                loadMoreLogsBtn.style.display = 'block';
            } else {
                loadMoreLogsBtn.style.display = 'none';
            }
        } catch (error) {
            console.error("Failed to fetch more logs:", error);
        } finally {
            isFetchingLogs = false;
            loadMoreLogsBtn.textContent = 'Load More';
        }
    };

    // in bunkguard/static/reports.js

    const loadInitialData = async () => {
        try {
            const [reportsRes, analyticsRes, initialLogsRes] = await Promise.all([
                fetch(`/api/reports_data?semester=${currentSemester}`),
                fetch('/api/analytics/day_of_week'),
                // CORRECTED: Changed limit from 3 to 15 to show more logs initially.
                fetch(`/api/attendance_logs?page=1&limit=15`) 
            ]);

            if (!reportsRes.ok) throw new Error(`Reports API failed`);
            if (!analyticsRes.ok) throw new Error(`Analytics API failed`);
            if (!initialLogsRes.ok) throw new Error(`Logs API failed`);

            const reportsData = await reportsRes.json();
            const analyticsData = await analyticsRes.json();
            const initialLogsData = await initialLogsRes.json();

            // Render all components with the fetched data
            renderKPIs(reportsData.kpis);
            renderSubjectBreakdown(reportsData.subject_breakdown);
            renderHeatmap(reportsData.heatmap_data);
            renderDayOfWeekChart(analyticsData);
            renderAttendanceLogs(initialLogsData.logs, false);

            if (initialLogsData.has_next_page) {
                loadMoreLogsBtn.style.display = 'block';
            }

        } catch (error) {
            console.error("Failed to load initial reports page:", error);
            document.querySelector('.bento-grid-reports').innerHTML = `<p class="empty-state">Could not load report data. Please check the console and server logs.</p>`;
        }
    };

    // --- EVENT LISTENERS ---
    loadMoreLogsBtn.addEventListener('click', fetchMoreLogs);
    
    // --- INITIALIZE ---
    loadInitialData();
});