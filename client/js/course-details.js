document.addEventListener('DOMContentLoaded', () => {
    const courseTitle = document.getElementById('course-title');
    const courseThumbnail = document.getElementById('course-thumbnail');
    const courseDescription = document.getElementById('course-description');
    const moduleList = document.getElementById('module-list');
    const suggestionList = document.getElementById('suggestion-list');
    const backIcon = document.getElementById('back-icon');
    const navbarLinks = document.getElementById('navbar-links');
    const adminLink = navbarLinks ? navbarLinks.querySelector('.admin-only') : null;
    const adminLoginLink = navbarLinks ? navbarLinks.querySelector('.admin-login') : null;
    const logoutLink = navbarLinks ? document.getElementById('logout-link') : null;

    // JWT Authentication
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const decoded = jwt_decode(token);
            const now = Date.now() / 1000;
            if (decoded.exp < now) {
                localStorage.removeItem('token');
                if (adminLink) adminLink.style.display = 'none';
                if (adminLoginLink) adminLoginLink.style.display = 'block';
                if (logoutLink) logoutLink.style.display = 'none';
            } else {
                if (adminLink) adminLink.style.display = 'block';
                if (adminLoginLink) adminLoginLink.style.display = 'none';
                if (logoutLink) logoutLink.style.display = 'block';
            }
        } catch (err) {
            console.error('Token validation error:', err);
            localStorage.removeItem('token');
            if (adminLink) adminLink.style.display = 'none';
            if (adminLoginLink) adminLoginLink.style.display = 'block';
            if (logoutLink) logoutLink.style.display = 'none';
        }
    } else {
        if (adminLink) adminLink.style.display = 'none';
        if (adminLoginLink) adminLoginLink.style.display = 'block';
        if (logoutLink) logoutLink.style.display = 'none';
    }

    // Menu Toggle Functionality
    const menuIcon = document.getElementById('menu-icon');
    const closeIcon = document.getElementById('close-icon');
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
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            if (adminLink) adminLink.style.display = 'none';
            if (adminLoginLink) adminLoginLink.style.display = 'block';
            if (logoutLink) logoutLink.style.display = 'none';
            alert('Logged out successfully!');
            window.location.href = '/index.html';
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id');

    if (!courseId) {
        courseTitle.textContent = 'No course selected';
        return;
    }

    async function fetchCourseDetails() {
        try {
            const response = await fetch(`https://free-programming-notes.onrender.com/api/courses/${courseId}`);
            if (!response.ok) throw new Error('Failed to fetch course');
            const course = await response.json();
            courseTitle.textContent = course.title;
            courseThumbnail.src = course.thumbnail || 'fallback-image.jpg';
            courseDescription.textContent = course.description;
            moduleList.innerHTML = course.modules.map(module => `
                <div class="module">
                    <h4>${module.title}</h4>
                    <p>${module.description}</p>
                    <video src="${module.videoUrl}" controls style="max-width: 100%;"></video>
                </div>
            `).join('');

            // Random suggestions (4-5)
            const allCoursesResponse = await fetch('https://free-programming-notes.onrender.com/api/courses');
            if (!allCoursesResponse.ok) throw new Error('Failed to fetch all courses');
            const allCourses = await allCoursesResponse.json();
            const otherCourses = allCourses.filter(c => c._id !== courseId);
            const randomSuggestions = getRandomItems(otherCourses, 5).slice(0, 5);
            suggestionList.innerHTML = randomSuggestions.map(suggestion => `
                <p><a href="/course-details.html?id=${suggestion._id}">${suggestion.title}</a></p>
            `).join('');
        } catch (err) {
            console.error('Error fetching course details:', err);
            courseTitle.textContent = 'Error loading course details';
        }
    }

    function getRandomItems(array, count) {
        const shuffled = array.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, array.length));
    }

    backIcon.addEventListener('click', (e) => {
        e.preventDefault();
        history.back();
    });

    fetchCourseDetails();
});