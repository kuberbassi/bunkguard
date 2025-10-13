document.addEventListener('DOMContentLoaded', () => {
    const attendanceList = document.getElementById('attendanceList');
    const markAllPresentBtn = document.getElementById('markAllPresentBtn');
    const markAllAbsentBtn = document.getElementById('markAllAbsentBtn');

    let todaysClasses = [];

    // Utility to show toast notifications
    const showToast = (message, type = 'error') => {
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

    // API call to mark attendance for a single subject
    const markSingleAttendance = async (subjectId, status) => {
        try {
            const response = await fetch('/api/mark_attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject_id: subjectId, status: status }),
            });
            const result = await response.json();
            if (result.success) {
                return true;
            } else {
                showToast(result.error || 'Could not mark attendance.');
                return false;
            }
        } catch (error) {
            console.error('Error marking attendance:', error);
            showToast('A server error occurred.');
            return false;
        }
    };

    // Main function to load and render today's classes
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
                if(markAllPresentBtn) markAllPresentBtn.style.display = 'none';
                if(markAllAbsentBtn) markAllAbsentBtn.style.display = 'none';
                return;
            }

            attendanceList.className = 'attendance-list-container';
            if(markAllPresentBtn) markAllPresentBtn.style.display = 'inline-flex';
            if(markAllAbsentBtn) markAllAbsentBtn.style.display = 'inline-flex';

            todaysClasses.forEach((sub, index) => {
                const card = document.createElement('div');
                card.className = 'attendance-card';
                card.dataset.id = sub._id.$oid;
                card.style.setProperty('--animation-order', index);

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
                                <button class="action-btn-new more" data-menu-toggle="true"><i class='bx bx-dots-horizontal-rounded'></i></button>
                                <div class="more-options-links">
                                    <a href="#" data-status="pending_medical">Medical Leave</a>
                                    <a href="#" data-status="cancelled">Cancelled</a>
                                    <a href="#" data-status="substituted">Substituted</a>
                                </div>
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
                attendanceList.appendChild(card);
            });

        } catch (error) {
            console.error("Error loading today's classes:", error);
            attendanceList.innerHTML = `<p class="empty-state">Could not load today's schedule. Please set up your schedule first.</p>`;
        }
    };

    // Event listener to handle all clicks within the card list
    attendanceList.addEventListener('click', async (e) => {
        const card = e.target.closest('.attendance-card');
        if (!card) return;

        const subjectId = card.dataset.id;
        let status = null;

        if (e.target.matches('[data-status]')) {
            e.preventDefault();
            status = e.target.dataset.status;
        }

        if (e.target.closest('.action-btn-new.more')) {
            e.preventDefault();
            const menu = card.querySelector('.options-menu');
            if (menu) menu.classList.toggle('hidden');
            return;
        }

        if (status) {
            if (await markSingleAttendance(subjectId, status)) {
                const actionsContainer = card.querySelector('.card-actions-container');
                if (actionsContainer) {
                    actionsContainer.innerHTML = `<div class="marked-status ${status}">${status.replace('_', ' ')}</div>`;
                }
                const statusText = card.querySelector('.status-text');
                if (statusText) {
                    statusText.textContent = status;
                }
            }
        }
    });
    
    // Close dropdowns if clicking anywhere else on the page
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.action-more-wrapper')) {
            document.querySelectorAll('.more-menu').forEach(menu => menu.classList.add('hidden'));
        }
    });

    loadTodaysClasses();
});