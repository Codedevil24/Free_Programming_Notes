document.addEventListener('DOMContentLoaded', () => {
    const courseList = document.getElementById('course-list');
    const searchBar = document.getElementById('search-bar');
    let allCourses = [];

    // JWT Authentication (same as other pages)
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const decoded = jwt_decode(token);
            const now = Date.now() / 1000;
            if (decoded.exp < now) {
                localStorage.removeItem('token');
                document.querySelector('.admin-only').style.display = 'none';
                document.querySelector('.admin-login').style.display = 'block';
                document.querySelector('.logout').style.display = 'none';
            } else {
                document.querySelector('.admin-only').style.display = 'block';
                document.querySelector('.admin-login').style.display = 'none';
                document.querySelector('.logout').style.display = 'block';
            }
        } catch (err) {
            console.error('Token validation error:', err);
            localStorage.removeItem('token');
            document.querySelector('.admin-only').style.display = 'none';
            document.querySelector('.admin-login').style.display = 'block';
            document.querySelector('.logout').style.display = 'none';
        }
    }

    // Menu Toggle Functionality
    const menuIcon = document.getElementById('menu-icon');
    const closeIcon = document.getElementById('close-icon');
    const navbarLinks = document.getElementById('navbar-links');
    if (menuIcon && closeIcon && navbarLinks) {
        menuIcon.addEventListener('click', () => {
            navbarLinks.classList.add('show');
            menuIcon.style.display = 'none';
            closeIcon.style.display = 'block';
        });

        closeIcon.addEventListener('click', () => {
            navbarLinks.classList.remove('show');
            menuIcon.style.display = 'block';
            closeIcon.style.display = 'none';
        });
    }

    // Logout Functionality
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            document.querySelector('.admin-only').style.display = 'none';
            document.querySelector('.admin-login').style.display = 'block';
            logoutLink.style.display = 'none';
            alert('Logged out successfully!');
            window.location.href = '/index.html';
        });
    }

    async function fetchCourses() {
        try {
            const response = await fetch('https://free-programming-notes.onrender.com/api/courses');
            if (!response.ok) throw new Error('Failed to fetch courses');
            allCourses = await response.json();
            renderCourses(allCourses);
        } catch (err) {
            console.error('Error fetching courses:', err);
            courseList.innerHTML = '<p>Error loading courses: ' + err.message + '</p>';
        }
    }

    function renderCourses(courses) {
        courseList.innerHTML = courses.map(course => `
            <div class="course" data-id="${course._id}">
                <img src="${course.thumbnail || 'fallback-image.jpg'}" alt="${course.title}" style="max-width: 150px;">
                <h3>${course.title}</h3>
                <p>${course.description}</p>
                <a href="/course-details.html?id=${course._id}" class="view-details">View Details</a>
            </div>
        `).join('');
    }

    searchBar.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filteredCourses = allCourses.filter(course =>
            course.title.toLowerCase().includes(query) ||
            course.description.toLowerCase().includes(query)
        );
        renderCourses(filteredCourses);
    });

    fetchCourses();
});