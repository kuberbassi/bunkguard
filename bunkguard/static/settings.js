document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const panes = document.querySelectorAll('.settings-pane');
    const importFileInput = document.getElementById('importFileInput');
    const importDataBtn = document.getElementById('importDataBtn');
    const fileNameSpan = document.getElementById('fileName');
    const importStatus = document.getElementById('importStatus');


    // Content containers
    const subjectListContainer = document.getElementById('subjectManagementList');
    const systemLogContainer = document.getElementById('systemLogList');
    const pendingLeavesContainer = document.getElementById('pendingLeavesList');

    // Preferences pane
    const attendanceThresholdInput = document.getElementById('attendanceThreshold');
    const savePrefsBtn = document.getElementById('savePrefsBtn');

    // Data Management pane
    const deleteAllDataBtn = document.getElementById('deleteAllDataBtn');

    // --- STATE ---
    const currentSemester = localStorage.getItem('selectedSemester') || 1;
    let loadedTabs = new Set();

    // --- API CALLS ---
    const api = {
        getSubjects: () => fetch(`/api/full_subjects_data?semester=${currentSemester}`).then(res => res.json()),
        getSystemLogs: () => fetch('/api/system_logs').then(res => res.json()),
        getPendingLeaves: () => fetch('/api/pending_leaves').then(res => res.json()),
        approveLeave: (logId) => fetch(`/api/approve_leave/${logId}`, { method: 'POST' }).then(res => res.json()),
        updateCounts: (subjectId, attended, total) => fetch('/api/update_attendance_count', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject_id: subjectId, attended, total })
        }).then(res => res.json()),
        getPreferences: () => fetch('/api/preferences').then(res => res.json()),
        savePreferences: (threshold) => fetch('/api/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ threshold: threshold })
        }).then(res => res.json()),
        importData: (jsonData) => fetch('/api/import_data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jsonData)
        }).then(res => res.json()),
    };

    // --- RENDER FUNCTIONS ---
    const render = {
        subjects: (subjects) => {
            subjectListContainer.innerHTML = '';
            if (!subjects || subjects.length === 0) {
                subjectListContainer.innerHTML = `<p class="empty-state">No subjects found for this semester.</p>`; return;
            }
            subjects.forEach(sub => {
                const item = document.createElement('div');
                item.className = 'subject-management-item';
                item.dataset.id = sub._id.$oid;
                item.innerHTML = `
                    <div class="subject-name-wrapper">
                        <h4 class="subject-title">${sub.name}</h4>
                    </div>
                    <div class="count-editor">
                        <label>Attended:</label>
                        <input type="number" class="attended-input" value="${sub.attended}" min="0">
                        <label>Total:</label>
                        <input type="number" class="total-input" value="${sub.total}" min="0">
                    </div>
                    <div class="subject-actions">
                        <button class="action-btn save-btn" title="Save Changes"><i class='bx bx-check'></i></button>
                    </div>
                `;
                subjectListContainer.appendChild(item);
            });
        },
        systemLogs: (logs) => { /* ... (same as before) ... */ },
        pendingLeaves: (leaves) => { /* ... (same as before) ... */ },
    };

    // --- MAIN LOGIC & EVENT HANDLERS ---
    const loadPaneContent = async (paneId) => {
        if (loadedTabs.has(paneId) && paneId !== 'subjects') return;

        switch (paneId) {
            case 'subjects':
                render.subjects(await api.getSubjects());
                break;
            case 'log':
                render.systemLogs(await api.getSystemLogs());
                break;
            case 'leaves':
                render.pendingLeaves(await api.getPendingLeaves());
                break;
            case 'prefs':
                const prefs = await api.getPreferences();
                if (prefs.threshold) {
                    attendanceThresholdInput.value = prefs.threshold;
                }
                break;
        }
        loadedTabs.add(paneId);
    };

    const handleTabClick = (e) => {
        e.preventDefault();
        const targetLink = e.currentTarget;
        const paneId = targetLink.dataset.pane;
        sidebarLinks.forEach(link => link.classList.remove('active'));
        targetLink.classList.add('active');
        panes.forEach(pane => pane.classList.remove('active'));
        document.getElementById(paneId).classList.add('active');
        loadPaneContent(paneId);
    };

    sidebarLinks.forEach(link => link.addEventListener('click', handleTabClick));

    // Event listener for saving subject count changes
    subjectListContainer.addEventListener('click', async (e) => {
        const saveBtn = e.target.closest('.save-btn');
        if (saveBtn) {
            const item = saveBtn.closest('.subject-management-item');
            const subjectId = item.dataset.id;
            const attended = item.querySelector('.attended-input').value;
            const total = item.querySelector('.total-input').value;

            const result = await api.updateCounts(subjectId, attended, total);
            if (result.success) {
                saveBtn.style.color = 'var(--status-safe)';
                setTimeout(() => saveBtn.style.color = '', 2000);
            } else {
                alert(result.error);
            }
        }
    });

    // Event listener for saving preferences
    savePrefsBtn.addEventListener('click', async () => {
        const threshold = attendanceThresholdInput.value;
        const result = await api.savePreferences(threshold);
        if (result.success) {
            savePrefsBtn.textContent = 'Saved!';
            setTimeout(() => savePrefsBtn.textContent = 'Save Preferences', 2000);
        }
    });

    // Event listener for deleting all data
    deleteAllDataBtn.addEventListener('click', () => {
        const confirmation = prompt('This action is IRREVERSIBLE. You will lose all subjects, logs, and settings. Type "DELETE" to confirm.');
        if (confirmation === 'DELETE') {
            fetch('/api/delete_all_data', { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert('All your data has been permanently deleted.');
                        window.location.href = '/logout'; // Log the user out
                    }
                });
        }
    });

    importDataBtn.addEventListener('click', () => {
        const file = importFileInput.files[0];
        if (!file) {
            importStatus.textContent = 'Please select a file to import.';
            importStatus.className = 'status-error';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const jsonData = JSON.parse(event.target.result);
                importDataBtn.textContent = 'Importing...';
                importDataBtn.disabled = true;
                importStatus.textContent = ''; // Clear previous messages

                const result = await api.importData(jsonData);

                if (result.success) {
                    importStatus.textContent = `Import complete! ${result.message}`;
                    importStatus.className = 'status-success';
                    // Optionally reload after a short delay
                    setTimeout(() => window.location.reload(), 2000);
                } else {
                    importStatus.textContent = `Import failed: ${result.error}`;
                    importStatus.className = 'status-error';
                }
            } catch (e) {
                importStatus.textContent = 'Invalid JSON file. Please select a valid BunkGuard export file.';
                importStatus.className = 'status-error';
            } finally {
                importDataBtn.textContent = 'Import';
                // Keep it disabled after an attempt to prevent re-clicks
            }
        };
        reader.readAsText(file);
    });

    // --- INITIALIZATION ---
    loadPaneContent('subjects');
});