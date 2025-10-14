document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const panes = document.querySelectorAll('.settings-pane');

    // Content Containers
    const subjectListContainer = document.getElementById('subjectManagementList');
    const systemLogContainer = document.getElementById('systemLogList');
    const pendingLeavesContainer = document.getElementById('pendingLeavesList');
    const unresolvedSubstitutionsContainer = document.getElementById('unresolvedSubstitutionsList');

    // Modals
    const substitutionModal = document.getElementById('substitutionModal');
    const substitutionSubjectList = document.getElementById('substitutionSubjectList');
    const closeSubstitutionModalBtn = document.getElementById('closeSubstitutionModalBtn');

    // Preferences Pane
    const attendanceThresholdInput = document.getElementById('attendanceThreshold');
    const savePrefsBtn = document.getElementById('savePrefsBtn');

    // Data Management Pane
    const deleteAllDataBtn = document.getElementById('deleteAllDataBtn');
    const importFileInput = document.getElementById('importFileInput');
    const importDataBtn = document.getElementById('importDataBtn');
    const fileNameSpan = document.getElementById('fileName');
    const importStatus = document.getElementById('importStatus');

    // --- STATE ---
    const currentSemester = localStorage.getItem('selectedSemester') || 1;
    let loadedTabs = new Set();
    let substitutionContext = {}; // Stores info for the substitution modal

    // --- API CALLS ---
    const api = {
        getSubjects: (semester) => fetch(`/api/full_subjects_data?semester=${semester}`).then(res => res.json()),
        getAllSubjectsForSemester: (semester) => fetch(`/api/subjects?semester=${semester}`).then(res => res.json()),
        getSystemLogs: () => fetch('/api/system_logs').then(res => res.json()),
        getPendingLeaves: () => fetch('/api/pending_leaves').then(res => res.json()),
        getUnresolvedSubstitutions: () => fetch('/api/unresolved_substitutions').then(res => res.json()),
        approveLeave: (logId) => fetch(`/api/approve_leave/${logId}`, { method: 'POST' }).then(res => res.json()),
        markSubstituted: (original_subject_id, substitute_subject_id, date) => fetch('/api/mark_substituted', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ original_subject_id, substitute_subject_id, date })
        }).then(res => res.json()),
        updateCounts: (subjectId, attended, total) => fetch('/api/update_attendance_count', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject_id: subjectId, attended, total })
        }).then(res => res.json()),
        getPreferences: () => fetch('/api/preferences').then(res => res.json()),
        savePreferences: (threshold) => fetch('/api/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ threshold })
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
            if (!subjectListContainer) return;
            subjectListContainer.innerHTML = '';
            if (!subjects || subjects.length === 0) {
                subjectListContainer.innerHTML = `<p class="empty-state">No subjects found for this semester.</p>`;
                return;
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
        systemLogs: (logs) => {
            if (!systemLogContainer) return;
            systemLogContainer.innerHTML = '';
            if (!logs || logs.length === 0) {
                systemLogContainer.innerHTML = `<p class="empty-state">No system activity yet.</p>`;
                return;
            }
            systemLogContainer.innerHTML = logs.map(log => `
                <div class="log-item" style="gap: 15px;">
                    <i class='bx bx-chip status-system'></i>
                    <div class="log-details">
                        <p><strong>${log.action}:</strong> ${log.description}</p>
                        <span class="log-timestamp">${new Date(log.timestamp.$date).toLocaleString()}</span>
                    </div>
                </div>
            `).join('');
        },
        pendingLeaves: (leaves) => {
            if (!pendingLeavesContainer) return;
            pendingLeavesContainer.innerHTML = '';
            if (!leaves || leaves.length === 0) {
                pendingLeavesContainer.innerHTML = `<p class="empty-state">No pending medical leaves. 🎉</p>`;
                return;
            }
            pendingLeavesContainer.innerHTML = leaves.map(leave => `
                <div class="leave-item" data-log-id="${leave._id.$oid}">
                    <div class="leave-info">
                        <p><strong>${leave.subject_info.name}</strong></p>
                        <span>Marked on: ${new Date(leave.timestamp.$date).toLocaleDateString()}</span>
                    </div>
                    <button class="control-btn approve-leave-btn">Approve</button>
                </div>
            `).join('');
        },
        unresolvedSubstitutions: (logs) => {
            if (!unresolvedSubstitutionsContainer) return;
            unresolvedSubstitutionsContainer.innerHTML = '';
            if (!logs || logs.length === 0) {
                unresolvedSubstitutionsContainer.innerHTML = `<p class="empty-state">No unresolved substitutions found.</p>`;
                return;
            }
            unresolvedSubstitutionsContainer.innerHTML = logs.map(log => `
                <div class="substitution-item" 
                     style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-color);"
                     data-log-id="${log._id.$oid}"
                     data-original-subject-id="${log.subject_info._id.$oid}"
                     data-date="${log.date}"
                     data-semester="${log.subject_info.semester}">
                    <div class="sub-info">
                        <p><strong>${log.subject_info.name}</strong></p>
                        <span style="font-size: 0.8rem; color: var(--text-secondary);">Marked on: ${new Date(log.date + 'T12:00:00Z').toLocaleDateString()}</span>
                    </div>
                    <button class="control-btn resolve-sub-btn">Resolve</button>
                </div>
            `).join('');
        }
    };

    // --- MAIN LOGIC & EVENT HANDLERS ---
    const loadPaneContent = async (paneId) => {
        // Always reload these tabs for fresh data
        if (['subjects', 'leaves', 'substitutions'].includes(paneId)) {
            loadedTabs.delete(paneId);
        }
        if (loadedTabs.has(paneId)) return;

        switch (paneId) {
            case 'subjects':
                render.subjects(await api.getSubjects(currentSemester));
                break;
            case 'log':
                render.systemLogs(await api.getSystemLogs());
                break;
            case 'leaves':
                render.pendingLeaves(await api.getPendingLeaves());
                break;
            case 'prefs':
                const prefs = await api.getPreferences();
                if (attendanceThresholdInput && prefs.threshold) {
                    attendanceThresholdInput.value = prefs.threshold;
                }
                break;
            case 'substitutions':
                render.unresolvedSubstitutions(await api.getUnresolvedSubstitutions());
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

    // Event Delegation for dynamically loaded content
    document.addEventListener('click', async (e) => {
        // Save subject count changes
        const saveBtn = e.target.closest('.save-btn');
        if (saveBtn) {
            const item = saveBtn.closest('.subject-management-item');
            const subjectId = item.dataset.id;
            const attended = item.querySelector('.attended-input').value;
            const total = item.querySelector('.total-input').value;

            const result = await api.updateCounts(subjectId, attended, total);
            if (result.success) {
                saveBtn.style.color = 'var(--status-safe)';
                setTimeout(() => { saveBtn.style.color = ''; }, 2000);
            } else {
                alert(result.error);
            }
        }

        // Approve pending leaves
        if (e.target.classList.contains('approve-leave-btn')) {
            const item = e.target.closest('.leave-item');
            const logId = item.dataset.logId;
            const result = await api.approveLeave(logId);
            if (result.success) {
                item.remove();
                if (pendingLeavesContainer.children.length === 0) {
                    render.pendingLeaves([]);
                }
            }
        }

        // Handle "Resolve" button for substitutions
        if (e.target.classList.contains('resolve-sub-btn')) {
            const item = e.target.closest('.substitution-item');
            substitutionContext = {
                original_subject_id: item.dataset.originalSubjectId,
                date: item.dataset.date,
                itemElement: item
            };

            substitutionSubjectList.innerHTML = '<div class="skeleton activity-skeleton"></div>';
            substitutionModal.classList.remove('hidden');

            const allSubjects = await api.getAllSubjectsForSemester(item.dataset.semester);
            const choices = allSubjects.filter(s => s._id.$oid !== substitutionContext.original_subject_id);

            substitutionSubjectList.innerHTML = choices.map(sub =>
                `<div class="subject-option" data-id="${sub._id.$oid}">${sub.name}</div>`
            ).join('');
        }

        // Handle choice in substitution modal
        const subChoice = e.target.closest('#substitutionSubjectList .subject-option');
        if (subChoice) {
            const substitute_subject_id = subChoice.dataset.id;
            const result = await api.markSubstituted(
                substitutionContext.original_subject_id,
                substitute_subject_id,
                substitutionContext.date
            );

            if (result.success) {
                // The fix is here: reload the page to get fresh data everywhere.
                window.location.reload();
            }
        }
    });

    // Listeners for static elements
    if (savePrefsBtn) savePrefsBtn.addEventListener('click', async () => {
        const threshold = attendanceThresholdInput.value;
        const result = await api.savePreferences(threshold);
        if (result.success) {
            savePrefsBtn.textContent = 'Saved!';
            setTimeout(() => { savePrefsBtn.textContent = 'Save Preferences'; }, 2000);
        }
    });

    if (deleteAllDataBtn) deleteAllDataBtn.addEventListener('click', () => {
        const confirmation = prompt('This action is IRREVERSIBLE. Type "DELETE" to confirm.');
        if (confirmation === 'DELETE') {
            fetch('/api/delete_all_data', { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert('All your data has been permanently deleted.');
                        window.location.href = '/logout';
                    }
                });
        }
    });

    if (importFileInput) importFileInput.addEventListener('change', () => {
        if (importFileInput.files.length > 0) {
            fileNameSpan.textContent = importFileInput.files[0].name;
            importDataBtn.disabled = false;
        } else {
            fileNameSpan.textContent = 'No file selected';
            importDataBtn.disabled = true;
        }
    });

    if (importDataBtn) importDataBtn.addEventListener('click', () => {
        const file = importFileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const jsonData = JSON.parse(event.target.result);
                importDataBtn.textContent = 'Importing...';
                importDataBtn.disabled = true;
                if (importStatus) importStatus.textContent = '';

                const result = await api.importData(jsonData);
                if (result.success) {
                    if (importStatus) {
                        importStatus.textContent = `Import complete! ${result.message}`;
                        importStatus.className = 'status-success';
                    }
                    setTimeout(() => window.location.reload(), 2000);
                } else {
                    if (importStatus) {
                        importStatus.textContent = `Import failed: ${result.error}`;
                        importStatus.className = 'status-error';
                    }
                }
            } catch (e) {
                if (importStatus) {
                    importStatus.textContent = 'Invalid JSON file.';
                    importStatus.className = 'status-error';
                }
            }
        };
        reader.readAsText(file);
    });

    if (closeSubstitutionModalBtn) closeSubstitutionModalBtn.addEventListener('click', () => substitutionModal.classList.add('hidden'));
    if (substitutionModal) substitutionModal.addEventListener('click', (e) => {
        if (e.target === substitutionModal) substitutionModal.classList.add('hidden');
    });

    // --- INITIALIZATION ---
    loadPaneContent('subjects');
});