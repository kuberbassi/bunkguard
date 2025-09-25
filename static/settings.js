document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const dom = {
        subjectList: document.getElementById('subjectManagementList'),
        // ... (other elements for panes, modals, etc.)
        renameModal: document.getElementById('renameModal'),
        renameForm: document.getElementById('renameForm'),
        newSubjectNameInput: document.getElementById('newSubjectName'),
        cancelRenameBtn: document.getElementById('cancelRenameBtn'),
    };
    let subjectToRenameId = null;

    // --- RENDER FUNCTIONS ---
    const renderSubjects = (subjects) => { /* ... (same as before) ... */ };

    // --- API CALLS ---
    const api = {
        loadSubjects: async (semester) => {
            try {
                // Now fetches subjects for a specific semester
                const response = await fetch(`/api/full_subjects_data?semester=${semester}`);
                renderSubjects(await response.json());
            } catch (error) { console.error("Failed to load subjects:", error); }
        },
        renameSubject: async (id, newName) => {
            await fetch('/api/rename_subject', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject_id: id, new_name: newName }) });
            // Refresh the list after renaming
            const semester = localStorage.getItem('selectedSemester') || 1;
            api.loadSubjects(semester);
        },
        // ... (other API calls for delete, update counts, etc.)
    };

    // --- EVENT HANDLERS ---
    dom.subjectList.addEventListener('click', (e) => {
        const btn = e.target.closest('.action-btn');
        if (!btn) return;
        const item = btn.closest('.subject-management-item');
        const id = item.dataset.id;

        if (btn.classList.contains('rename-btn')) {
            const titleEl = item.querySelector('.subject-title');
            subjectToRenameId = id;
            dom.newSubjectNameInput.value = titleEl.textContent;
            dom.renameModal.classList.remove('hidden');
            dom.newSubjectNameInput.focus();
        } 
        // ... (other button logic for delete, save counts)
    });

    // Rename Modal Logic
    dom.renameForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newName = dom.newSubjectNameInput.value;
        if (newName && newName.trim() !== '' && subjectToRenameId) {
            api.renameSubject(subjectToRenameId, newName.trim());
        }
        dom.renameModal.classList.add('hidden');
    });
    dom.cancelRenameBtn.addEventListener('click', () => dom.renameModal.classList.add('hidden'));

    // --- INITIALIZATION ---
    const currentSemester = localStorage.getItem('selectedSemester') || 1;
    api.loadSubjects(currentSemester);
    // ... (rest of initialization for sidebar, logs, import/export)
});