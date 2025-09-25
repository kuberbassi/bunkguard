document.addEventListener('DOMContentLoaded', () => {
    // --- Theme Switcher ---
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const currentTheme = localStorage.getItem('theme');

    if (currentTheme) {
        document.body.classList.add(currentTheme);
        if (currentTheme === 'light-theme') {
            themeToggleBtn.classList.replace('bx-moon', 'bx-sun');
        }
    }

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        let theme = 'dark-theme';
        if (document.body.classList.contains('light-theme')) {
            theme = 'light-theme';
            themeToggleBtn.classList.replace('bx-moon', 'bx-sun');
        } else {
            themeToggleBtn.classList.replace('bx-sun', 'bx-moon');
        }
        localStorage.setItem('theme', theme);
    });

    // --- Profile Dropdown ---
    const userProfile = document.getElementById('userProfile');
    const profileDropdown = document.getElementById('profileDropdown');

    userProfile.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!userProfile.contains(e.target)) {
            profileDropdown.classList.add('hidden');
        }
    });
});