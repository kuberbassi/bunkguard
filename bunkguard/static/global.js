// static/global.js
document.addEventListener('DOMContentLoaded', () => {
    const semesterSelector = document.getElementById('semesterSelector');
    const selectedSemesterEl = document.getElementById('selectedSemester');
    
    const savedSemester = localStorage.getItem('selectedSemester') || '1';
    if (selectedSemesterEl) {
        selectedSemesterEl.textContent = savedSemester;
    }

    if (semesterSelector) {
        semesterSelector.addEventListener('click', (e) => {
            e.stopPropagation();
            semesterSelector.classList.toggle('open');
        });

        document.querySelectorAll('.custom-option').forEach(option => {
            option.addEventListener('click', () => {
                const newSemester = option.dataset.value;
                if (newSemester !== (localStorage.getItem('selectedSemester') || '1')) {
                    localStorage.setItem('selectedSemester', newSemester);
                    window.location.reload();
                }
            });
        });
        
        document.addEventListener('click', () => semesterSelector.classList.remove('open'));
    }
});