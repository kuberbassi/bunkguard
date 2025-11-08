document.addEventListener('DOMContentLoaded', () => {
    // --- UTILITY ---
    const showToast = (message, type = 'success') => {
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

    // --- DOM ELEMENTS & STATE ---
    const dom = {
        tableBody: document.querySelector('#scheduleTable tbody'),
        subjectModal: document.getElementById('subjectModal'),
        subjectList: document.getElementById('subjectList'),
        saveBtn: document.getElementById('saveScheduleBtn'),
        addBtn: document.getElementById('addRowBtn'),
        removeBtn: document.getElementById('removeRowBtn'),
        closeModalBtn: document.getElementById('closeSubjectModalBtn'),
        breakBtn: document.getElementById('markAsBreakBtn'),
        freeBtn: document.getElementById('markAsFreeBtn'), // New "Free" button
        clearBtn: document.getElementById('clearSlotBtn'),
        scheduleTable: document.getElementById('scheduleTable')
    };
    
    let state = {
        subjects: [],
        schedule: {},
        activeCell: null,
        timeSlots: Array.from({ length: 9 }, (_, i) => `${String(9 + i).padStart(2, '0')}:00 - ${String(10 + i).padStart(2, '0')}:00`),
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        isDirty: false // Track unsaved changes
    };

    // --- UNSAVED CHANGES WARNING ---
    window.addEventListener('beforeunload', (e) => {
        if (state.isDirty) {
            e.preventDefault();
            e.returnValue = ''; // Required for legacy browsers
        }
    });

    // --- API & DATA ---
    const api = {
        loadData: async () => { /* ... (This function remains the same) ... */ },
        saveSchedule: async () => {
            dom.saveBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Saving...";
            dom.saveBtn.disabled = true;

            // Debugging line to see what's being saved
            console.log("Saving schedule data:", JSON.stringify(state.schedule, null, 2));

            try {
                const res = await fetch('/api/timetable', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({schedule: state.schedule}) });
                const result = await res.json();
                if (result.success) {
                    showToast('Schedule saved!');
                    state.isDirty = false; // Mark changes as saved
                } else {
                    showToast(result.error || 'Failed to save', 'error');
                }
            } catch (error) { showToast('An error occurred while saving', 'error');
            } finally {
                dom.saveBtn.innerHTML = "<i class='bx bx-save'></i> Save Schedule";
                dom.saveBtn.disabled = false;
            }
        }
    };
    api.loadData = async () => { /* Kept the same from before */ 
        try {
            const [subjectsRes, scheduleRes] = await Promise.all([fetch('/api/subjects'), fetch('/api/timetable')]);
            state.subjects = JSON.parse(await subjectsRes.text());
            const loadedSchedule = JSON.parse(await scheduleRes.text());
            if (Object.keys(loadedSchedule).length > 0) {
                state.schedule = loadedSchedule;
                state.timeSlots = Object.keys(loadedSchedule).sort();
            }
            render.table();
            render.modalSubjects();
        } catch (error) { showToast('Failed to load schedule data', 'error'); }
    };
    

    // --- RENDERING ---
    const render = {
        table: () => { /* ... (This function remains the same) ... */ },
        modalSubjects: () => { /* ... (This function remains the same) ... */ }
    };
    render.table = () => { /* Kept the same from before */ 
        dom.tableBody.innerHTML = '';
        state.timeSlots.forEach((time, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `<td class="time-cell" data-index="${index}">${time}</td>`;
            state.days.forEach(day => {
                const cell = document.createElement('td');
                cell.dataset.time = time; cell.dataset.day = day;
                const slotData = state.schedule[time]?.[day];
                if (slotData) {
                    if (slotData.type === 'class') cell.innerHTML = `<div class="schedule-subject">${slotData.subjectName}</div>`;
                    else {
                        cell.textContent = slotData.type.charAt(0).toUpperCase() + slotData.type.slice(1);
                        cell.classList.add(`slot-${slotData.type}`);
                    }
                } else cell.classList.add('slot-empty');
                row.appendChild(cell);
            });
            dom.tableBody.appendChild(row);
        });
    };
    render.modalSubjects = () => { /* Kept the same from before */ 
        if (state.subjects.length > 0) {
            dom.subjectList.innerHTML = state.subjects.map(sub => `<div class="subject-option" data-id="${sub._id.$oid}" data-name="${sub.name}"><i class='bx bxs-book-bookmark'></i> ${sub.name}</div>`).join('');
        } else {
            dom.subjectList.innerHTML = `<p class="empty-state">No subjects found.<br>Go to the <strong>Dashboard</strong> to add your subjects first.</p>`;
        }
    };

    // --- ACTIONS ---
    const actions = {
        updateSlot: (time, day, data) => {
            state.isDirty = true; // Mark that there are unsaved changes
            if (!state.schedule[time]) state.schedule[time] = {};
            if (data === null) delete state.schedule[time][day];
            else state.schedule[time][day] = data;
            render.table();
        },
        editTime: (cell) => { /* ... (This function remains the same) ... */ },
        addRow: () => {
            state.isDirty = true;
            state.timeSlots.push('18:00 - 19:00');
            render.table();
            showToast('New row added.');
        },
        removeRow: () => { /* ... (This function remains the same) ... */ }
    };
    actions.editTime = (cell) => { /* Kept the same from before */ 
        cell.classList.add('editing');
        const originalTime = cell.textContent;
        const [start, end] = originalTime.split(' - ');
        cell.innerHTML = `<div class="time-editor"><input type="time" class="time-input" value="${start}"><span>-</span><input type="time" class="time-input" value="${end}"><button class="time-save-btn"><i class='bx bx-check'></i></button></div>`;
        cell.querySelector('.time-save-btn').onclick = () => {
            const inputs = cell.querySelectorAll('.time-input');
            const newTime = `${inputs[0].value} - ${inputs[1].value}`;
            if (newTime !== originalTime && inputs[0].value && inputs[1].value) {
                state.isDirty = true;
                const index = parseInt(cell.dataset.index, 10);
                if (state.schedule[originalTime]) {
                    state.schedule[newTime] = state.schedule[originalTime];
                    delete state.schedule[originalTime];
                }
                state.timeSlots[index] = newTime;
            }
            render.table();
        };
    };
    actions.removeRow = () => { /* Kept the same from before */ 
        if (state.timeSlots.length > 1) {
            state.isDirty = true;
            const removedTime = state.timeSlots.pop();
            delete state.schedule[removedTime];
            render.table();
            showToast('Last row removed.');
        } else {
            showToast('Cannot remove the last row.', 'error');
        }
    };


    // --- INITIALIZATION ---
    const initEventListeners = () => {
        dom.saveBtn.addEventListener('click', api.saveSchedule);
        dom.addBtn.addEventListener('click', actions.addRow);
        dom.removeBtn.addEventListener('click', actions.removeRow);
        dom.tableBody.addEventListener('click', (e) => {
            const cell = e.target.closest('td');
            if (!cell || cell.classList.contains('editing')) return;
            if (cell.classList.contains('time-cell')) actions.editTime(cell);
            else if (cell.dataset.day) {
                state.activeCell = cell;
                dom.subjectModal.classList.remove('hidden');
            }
        });
        dom.closeModalBtn.addEventListener('click', () => dom.subjectModal.classList.add('hidden'));
        dom.subjectModal.addEventListener('click', (e) => e.target === dom.subjectModal && dom.subjectModal.classList.add('hidden'));
        dom.breakBtn.addEventListener('click', () => { actions.updateSlot(state.activeCell.dataset.time, state.activeCell.dataset.day, { type: 'break' }); dom.subjectModal.classList.add('hidden'); });
        
        // Add event listener for the new "Free" button
        dom.freeBtn.addEventListener('click', () => { actions.updateSlot(state.activeCell.dataset.time, state.activeCell.dataset.day, { type: 'free' }); dom.subjectModal.classList.add('hidden'); });

        dom.clearBtn.addEventListener('click', () => { actions.updateSlot(state.activeCell.dataset.time, state.activeCell.dataset.day, null); dom.subjectModal.classList.add('hidden'); });
        dom.subjectList.addEventListener('click', (e) => {
            const option = e.target.closest('.subject-option');
            if (option) {
                actions.updateSlot(state.activeCell.dataset.time, state.activeCell.dataset.day, { type: 'class', subjectId: option.dataset.id, subjectName: option.dataset.name });
                dom.subjectModal.classList.add('hidden');
            }
        });
        dom.scheduleTable.addEventListener('click', (e) => {
            if (e.target.classList.contains('holiday-btn')) {
                const day = e.target.dataset.day;
                state.timeSlots.forEach(time => actions.updateSlot(time, day, { type: 'holiday' }));
                showToast(`${day} marked as a holiday.`);
            }
        });
    };

    api.loadData();
    initEventListeners();
});