document.addEventListener('DOMContentLoaded', () => {
    const listEl = document.getElementById('subjectManagementList');

    const loadSubjects = async () => {
        listEl.innerHTML = `<div class="skeleton bunk-item-skeleton"></div>`;
        try {
            // This is the new, clean API endpoint
            const response = await fetch('/api/full_subjects_data');
            const subjects = JSON.parse(await response.text());
            renderSubjects(subjects);
        } catch (error) {
            console.error("Failed to load subjects:", error);
            listEl.innerHTML = `<p class="empty-state">Could not load subjects.</p>`;
        }
    };

    const renderSubjects = (subjects) => {
        listEl.innerHTML = '';
        if (subjects.length === 0) {
            listEl.innerHTML = `<p class="empty-state">No subjects found. Add some from the dashboard.</p>`;
            return;
        }

        subjects.forEach(sub => {
            const item = document.createElement('div');
            item.className = 'subject-management-item';
            item.dataset.id = sub._id.$oid;
            item.innerHTML = `
                <h4>${sub.name}</h4>
                <div class="count-editor">
                    <label for="attended-${sub._id.$oid}">Attended:</label>
                    <input type="number" class="attended-input" value="${sub.attended || 0}" min="0">
                </div>
                <div class="count-editor">
                    <label for="total-${sub._id.$oid}">Total:</label>
                    <input type="number" class="total-input" value="${sub.total || 0}" min="0">
                </div>
                <button class="save-changes-btn">Save</button>
            `;
            listEl.appendChild(item);
        });
    };

    listEl.addEventListener('click', async (e) => {
        if (e.target.classList.contains('save-changes-btn')) {
            const item = e.target.closest('.subject-management-item');
            const subjectId = item.dataset.id;
            const attended = item.querySelector('.attended-input').value;
            const total = item.querySelector('.total-input').value;

            if (parseInt(attended) > parseInt(total)) {
                alert('Error: Attended classes cannot be greater than total classes.');
                return;
            }

            try {
                const response = await fetch('/api/update_attendance_count', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subject_id: subjectId, attended: attended, total: total }),
                });
                const result = await response.json();
                if (result.success) {
                    alert('Update successful!');
                } else {
                    alert(`Error: ${result.error}`);
                }
            } catch (error) {
                console.error("Error updating counts:", error);
                alert('An error occurred. Please try again.');
            }
        }
    });

    loadSubjects();
});

// In static/settings.js, add this at the bottom

const loadSystemLogs = async () => {
    const logListEl = document.getElementById('systemLogList');
    try {
        const response = await fetch('/api/system_logs');
        const logs = JSON.parse(await response.text());
        
        logListEl.innerHTML = '';
        if (logs.length === 0) {
            logListEl.innerHTML = '<p class="empty-state">No system events have been logged yet.</p>';
            return;
        }

        const iconMap = {
            "Schedule Updated": "bx-calendar-edit",
            "Subject Added": "bx-book-add",
            "Data Overridden": "bx-error-alt"
        };

        logs.forEach(log => {
            const item = document.createElement('div');
            item.className = 'log-item';
            const icon = iconMap[log.action] || 'bx-info-circle';
            item.innerHTML = `
                <i class='bx ${icon} status-system'></i>
                <div class="log-details">
                    <p><strong>${log.action}:</strong> ${log.description}</p>
                    <span class="log-timestamp">${new Date(log.timestamp.$date).toLocaleString()}</span>
                </div>
            `;
            logListEl.appendChild(item);
        });

    } catch (error) {
        console.error('Failed to load system logs:', error);
        logListEl.innerHTML = '<p class="empty-state">Error loading logs.</p>';
    }
};

// Call the new function when the page loads
loadSystemLogs();