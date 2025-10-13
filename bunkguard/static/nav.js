document.addEventListener('DOMContentLoaded', () => {
    // --- Theme Switcher ---
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (localStorage.getItem('theme') === 'light-theme') {
        document.body.classList.add('light-theme');
        themeToggleBtn.classList.replace('bx-moon', 'bx-sun');
    }

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        let theme = document.body.classList.contains('light-theme') ? 'light-theme' : 'dark-theme';
        if (theme === 'light-theme') {
            themeToggleBtn.classList.replace('bx-moon', 'bx-sun');
        } else {
            themeToggleBtn.classList.replace('bx-sun', 'bx-moon');
        }
        localStorage.setItem('theme', theme);
    });

    // --- Profile & Notification Dropdowns ---
    const userProfile = document.getElementById('userProfile');
    const profileDropdown = document.getElementById('profileDropdown');
    const notificationBell = document.getElementById('notificationBell');
    const notificationDropdown = document.getElementById('notificationDropdown');

    // Function to toggle a dropdown and close the other one
    const toggleDropdown = (dropdownToToggle, otherDropdown) => {
        dropdownToToggle.classList.toggle('hidden');
        otherDropdown.classList.add('hidden'); // Ensure the other is closed
    };

    if (userProfile && profileDropdown) {
        userProfile.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevents the document click from firing immediately
            toggleDropdown(profileDropdown, notificationDropdown);
        });
    }

    if (notificationBell && notificationDropdown) {
        notificationBell.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevents the document click from firing immediately
            toggleDropdown(notificationDropdown, profileDropdown);
        });
    }


    // Close dropdowns if the user clicks anywhere else on the page
    document.addEventListener('click', (e) => {
        if (profileDropdown && !profileDropdown.classList.contains('hidden')) {
            if (!userProfile.contains(e.target)) {
                profileDropdown.classList.add('hidden');
            }
        }
        if (notificationDropdown && !notificationDropdown.classList.contains('hidden')) {
            if (!notificationBell.contains(e.target)) {
                notificationDropdown.classList.add('hidden');
            }
        }
    });
});