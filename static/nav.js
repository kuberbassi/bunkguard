document.addEventListener('DOMContentLoaded', () => {
    // --- Theme Switcher ---
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (localStorage.getItem('theme') === 'light-theme') {
        document.body.classList.add('light-theme');
        if(themeToggleBtn) themeToggleBtn.classList.replace('bx-moon', 'bx-sun');
    }

    if(themeToggleBtn) themeToggleBtn.addEventListener('click', () => {
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
    const notificationList = document.getElementById('notificationList');
    const notificationBadge = document.getElementById('notificationBadge');

    const toggleDropdown = (dropdownToToggle, otherDropdown) => {
        dropdownToToggle.classList.toggle('hidden');
        if(otherDropdown) otherDropdown.classList.add('hidden');
    };

    if (userProfile && profileDropdown) {
        userProfile.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown(profileDropdown, notificationDropdown);
        });
    }

    if (notificationBell && notificationDropdown) {
        notificationBell.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown(notificationDropdown, profileDropdown);
            loadNotifications();
        });
    }

    const loadNotifications = async () => {
        const res = await fetch('/api/notifications');
        const notifications = await res.json();
        
        if (notificationList) {
            if (notifications.length > 0) {
                notificationList.innerHTML = notifications.map(n => `
                    <li class="notification-item">
                        <i class='bx ${n.type === 'deadline' ? 'bx-task' : 'bx-line-chart'}'></i>
                        <p>${n.message}</p>
                    </li>
                `).join('');
            } else {
                notificationList.innerHTML = `<li class="no-notifications"><p>No new notifications.</p></li>`;
            }
        }
        if (notificationBadge) {
            notificationBadge.textContent = notifications.length;
            notificationBadge.style.display = notifications.length > 0 ? 'flex' : 'none';
        }
    };

    // --- Mobile "More" Menu ---
    const mobileMoreTab = document.getElementById('mobileMoreTab');
    const mobileMoreMenu = document.getElementById('mobileMoreMenu');

    if (mobileMoreTab && mobileMoreMenu) {
        mobileMoreTab.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileMoreMenu.classList.toggle('hidden');
        });
    }

    // --- General Click Listener to close dropdowns ---
    document.addEventListener('click', (e) => {
        if (profileDropdown && !profileDropdown.classList.contains('hidden') && !userProfile.contains(e.target)) {
            profileDropdown.classList.add('hidden');
        }
        if (notificationDropdown && !notificationDropdown.classList.contains('hidden') && !notificationBell.contains(e.target)) {
            notificationDropdown.classList.add('hidden');
        }
        if (mobileMoreMenu && !mobileMoreMenu.classList.contains('hidden') && !mobileMoreTab.contains(e.target)) {
            mobileMoreMenu.classList.add('hidden');
        }
    });

    // Initial load for the notification badge count
    loadNotifications();
});