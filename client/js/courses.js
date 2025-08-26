document.addEventListener('DOMContentLoaded', () => {
    const courseGrid = document.getElementById('coursesList');
    const searchBar = document.getElementById('search-bar');
     // if you have a search bar on courses page
    const navbarLinks = document.getElementById('navbar-links');
    const menuIcon = document.getElementById('menu-icon');
    const closeIcon = document.getElementById('close-icon');
    const logoutLink = document.getElementById('logout-link');

    // Set initial menu state
if (menuIcon) menuIcon.style.display = 'block';
if (closeIcon) closeIcon.style.display = 'none';
if (navbarLinks) navbarLinks.classList.remove('show');

// Close menu on link click
if (navbarLinks) {
  const navLinks = navbarLinks.querySelectorAll('a');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navbarLinks.classList.remove('show');
      menuIcon.style.display = 'block';
      closeIcon.style.display = 'none';
    });
  });
}
  
    // JWT Authentication display toggle
    function updateAuthDisplay(isAuth) {
      const adminOnly = document.querySelector('.admin-only');
      const adminLogin = document.querySelector('.admin-login');
      const logoutEls = document.querySelectorAll('.logout');
      if (adminOnly && adminLogin) {
        adminOnly.style.display = isAuth ? 'block' : 'none';
        adminLogin.style.display = isAuth ? 'none' : 'block';
        logoutEls.forEach(el => el.style.display = isAuth ? 'block' : 'none');
      }
    }
  
    const token = localStorage.getItem('token');
    if (token && window.jwt_decode) {
      try {
        const decoded = jwt_decode(token);
        if (decoded.exp * 1000 > Date.now()) updateAuthDisplay(true);
        else { localStorage.removeItem('token'); updateAuthDisplay(false); }
      } catch {
        localStorage.removeItem('token');
        updateAuthDisplay(false);
      }
    } else updateAuthDisplay(false);
  
    // Navbar toggle
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
  
    // Logout
    if (logoutLink) {
      logoutLink.addEventListener('click', e => {
        e.preventDefault();
        localStorage.removeItem('token');
        updateAuthDisplay(false);
        alert('Logged out successfully!');
        window.location.href = '/index.html';
      });
    }
  
    let allCourses = [];
  
    // Fetch courses from server
    async function fetchCourses() {
      courseGrid.innerHTML = '<div class="loading">Loading courses...</div>';
      try {
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('https://free-programming-notes.onrender.com/api/courses', { headers });
        if (!res.ok) throw new Error(res.statusText);
        allCourses = await res.json();
        renderCourses(allCourses);
      } catch (err) {
        courseGrid.innerHTML = `<p class="error">Error loading courses: ${err.message}</p>`;
      }
    }
  
    // Render courses grid
    function renderCourses(courses) {
      if (!courses.length) {
        courseGrid.innerHTML = '<div class="no-courses">No courses available.</div>';
        return;
      }
      courseGrid.innerHTML = courses.map(course => {
        const chapCount = course.chapters?.length || 0;
        const modCount = (course.chapters || []).reduce((sum, chap) => sum + (chap.modules?.length || 0), 0);
        return `
          <div class="course-card" data-id="${course._id}">
            ${course.thumbnail ? `<img src="${course.thumbnail}" alt="${course.title}" />` : ''}
            <h3 class="course-title">${course.title}</h3>
            <p class="course-description">${course.description || ''}</p>
            <div class="chapter-count">📚 ${chapCount} Chapter${chapCount!==1?'s':''} • 🎯 ${modCount} Module${modCount!==1?'s':''}</div>
            <a href="course-details.html?id=${course._id}" class="view-details-btn">View Details →</a>
          </div>
        `;
      }).join('');
    }
  
    // (Optional) search filter on courses page
    if (searchBar) {
      searchBar.addEventListener('input', e => {
        const query = e.target.value.toLowerCase();
        const filtered = allCourses.filter(c =>
          c.title.toLowerCase().includes(query) ||
          (c.description || '').toLowerCase().includes(query)
        );
        renderCourses(filtered);
      });
    }
  
    fetchCourses();
  });
  