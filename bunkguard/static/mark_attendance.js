document.addEventListener('DOMContentLoaded', () => {
    const attendanceList = document.getElementById('attendanceList');
    const markAllPresentBtn = document.getElementById('markAllPresentBtn');
    const markAllAbsentBtn = document.getElementById('markAllAbsentBtn');

    let todaysClasses = []; // Store the classes to manage state

    // In static/mark_attendance.js, replace the entire loadTodaysClasses function

    const loadTodaysClasses = async () => {
        try {
            const response = await fetch('/api/todays_classes');
            todaysClasses = JSON.parse(await response.text());

            attendanceList.innerHTML = '';
            if (todaysClasses.length === 0) {
                // Display a much better empty state message
                attendanceList.innerHTML = `
                <div class="empty-state-container">
                    <i class='bx bx-calendar-check'></i>
                    <h3>All Clear for Today!</h3>
                    <p>No classes are scheduled, or you've already marked them all. Enjoy your day!</p>
                </div>`;
                // Modify the container to center the message
                attendanceList.className = 'attendance-list-empty';
                markAllPresentBtn.style.display = 'none';
                markAllAbsentBtn.style.display = 'none';
                return;
            }

            // If there are classes, ensure the grid layout is active
            attendanceList.className = 'attendance-list-container';
            markAllPresentBtn.style.display = 'inline-flex';
            markAllAbsentBtn.style.display = 'inline-flex';

            todaysClasses.forEach(sub => {
                const card = document.createElement('div');
                card.className = 'attendance-card';
                // Add a subtle animation delay for each card
                card.style.setProperty('--animation-order', todaysClasses.indexOf(sub));

                let actionsHtml = `
                <div class="attendance-actions">
                    <button class="btn-present" data-id="${sub._id.$oid}" data-status="present">Present</button>
                    <button class="btn-absent" data-id="${sub._id.$oid}" data-status="absent">Absent</button>
                </div>`;

                if (sub.marked_status !== 'pending') {
                    actionsHtml = `<div class="marked-status ${sub.marked_status}">${sub.marked_status}</div>`;
                }

                card.innerHTML = `
                <div class="card-info">
                    <h3>${sub.name}</h3>
                    <p>Status: <span class="status-text">${sub.marked_status}</span></p>
                </div>
                ${actionsHtml}
            `;
                attendanceList.appendChild(card);
            });

        } catch (error) {
            console.error("Error loading today's classes:", error);
            attendanceList.innerHTML = `<p class="empty-state">Could not load today's schedule. Please set up your schedule first.</p>`;
        }
    };

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
                console.warn(`Could not mark ${subjectId}: ${result.error}`);
                return false;
            }
        } catch (error) {
            console.error('Error marking attendance:', error);
            return false;
        }
    };

    const markAll = async (status) => {
        const pendingClasses = todaysClasses.filter(c => c.marked_status === 'pending');
        if (pendingClasses.length === 0) {
            alert('All classes for today have already been marked.');
            return;
        }

        for (const subject of pendingClasses) {
            await markSingleAttendance(subject._id.$oid, status);
        }

        // Refresh the list after all are marked
        loadTodaysClasses();
    };


    // static/mark_attendance.js

    attendanceList.addEventListener('click', async e => {
        e.preventDefault();
        const target = e.target;

        // Handle the main present/absent buttons
        if (target.matches('.btn-present, .btn-absent')) {
            const subjectId = target.dataset.id;
            const status = target.dataset.status;
            await markSingleAttendance(subjectId, status);
            // ... (update UI)
        }

        // Toggle the dropdown menu
        if (target.closest('.options-btn')) {
            const menu = target.closest('.more-options').querySelector('.options-menu');
            menu.classList.toggle('hidden');
        }

        // Handle dropdown menu clicks
        if (target.matches('.options-menu a')) {
            const subjectId = target.closest('.more-options').querySelector('.options-btn').dataset.id;
            const status = target.dataset.status;
            await markSingleAttendance(subjectId, status);
            // ... (update UI)
        }
    });

    markAllPresentBtn.addEventListener('click', () => markAll('present'));
    markAllAbsentBtn.addEventListener('click', () => markAll('absent'));

    loadTodaysClasses();
});