document.addEventListener('DOMContentLoaded', () => {
  const courseList = document.getElementById('course-list');
  const searchBar = document.getElementById('search-bar');
  const navbarLinks = document.getElementById('navbar-links');
  const menuIcon = document.getElementById('menu-icon');
  const closeIcon = document.getElementById('close-icon');
  const logoutLink = document.getElementById('logout-link');

  // Menu toggle
  if (menuIcon && closeIcon && navbarLinks) {
    menuIcon.style.display = 'block';
    closeIcon.style.display = 'none';
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
    navbarLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navbarLinks.classList.remove('show');
        menuIcon.style.display = 'block';
        closeIcon.style.display = 'none';
      });
    });
  }

  // Auth display
  function updateAuthDisplay(isAuth) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAuth ? 'block' : 'none');
    document.querySelectorAll('.admin-login').forEach(el => el.style.display = isAuth ? 'none' : 'block');
    document.querySelectorAll('.logout').forEach(el => el.style.display = isAuth ? 'block' : 'none');
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

  // Logout
  logoutLink?.addEventListener('click', e => {
    e.preventDefault();
    localStorage.removeItem('token');
    updateAuthDisplay(false);
    alert('Logged out successfully!');
    window.location.href = '/index.html';
  });

  let allCourses = [];

  async function fetchCourses() {
    if (!courseList) return;
    courseList.innerHTML = '<p>Loading courses…</p>';
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('https://free-programming-notes.onrender.com/api/courses', { headers });
      if (!res.ok) throw new Error(res.statusText);
      allCourses = await res.json();
      renderCourses(allCourses);
    } catch (err) {
      courseList.innerHTML = `<p class="error">Error loading courses: ${err.message}</p>`;
    }
  }

  function renderCourses(courses) {
    if (!courseList) return;
    if (courses.length === 0) {
      courseList.innerHTML = '<p>No courses found.</p>';
      return;
    }
    
    courseList.innerHTML = courses.map(course => {
      const chapCount = course.chapters?.length || 0;
      const modCount = (course.chapters || []).reduce((sum, ch) => sum + (ch.modules?.length || 0), 0);
      const thumbnailUrl = course.thumbnail || 'https://via.placeholder.com/400x225?text=Course+Image';
      
      return `
        <article class="course-card" data-id="${course._id}">
          <div class="course-image-container">
            <img src="${thumbnailUrl}" 
                 alt="${course.title}" 
                 loading="lazy"
                 class="course-image">
          </div>
          <div class="course-content">
            <h3 class="course-title">${course.title}</h3>
            <p class="course-description">${course.shortDescription}</p>
            <div class="course-meta">
              <span class="meta-item">
                <i class="icon-chapter"></i>
                ${chapCount} Chapters
              </span>
              <span class="meta-item">
                <i class="icon-module"></i>
                ${modCount} Modules
              </span>
            </div>
            <a href="course-details.html?id=${course._id}" class="view-course-btn">
              View Course
            </a>
          </div>
        </article>
      `;
    }).join('');
  }

  // Enhanced search functionality
  searchBar?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderCourses(allCourses);
      return;
    }
    
    const filtered = allCourses.filter(course =>
      course.title.toLowerCase().includes(q) ||
      (course.shortDescription || '').toLowerCase().includes(q) ||
      (course.category || '').toLowerCase().includes(q)
    );
    
    renderCourses(filtered);
  });

  // Add loading skeleton
  function showLoadingSkeleton() {
    courseList.innerHTML = Array(6).fill(0).map(() => `
      <div class="course-card skeleton">
        <div class="skeleton-image"></div>
        <div class="skeleton-content">
          <div class="skeleton-title"></div>
          <div class="skeleton-description"></div>
          <div class="skeleton-meta"></div>
        </div>
      </div>
    `).join('');
  }

  // Initialize
  showLoadingSkeleton();
  fetchCourses();
});
