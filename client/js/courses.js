
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
    courseList.innerHTML = courses.map(c => {
      const chapCount = c.chapters?.length || 0;
      const modCount = (c.chapters || []).reduce((sum, ch) => sum + (ch.modules?.length || 0), 0);
      return `
        <div class="course-item" data-id="${c._id}">
          ${c.thumbnail ? `<img src="${c.thumbnail}" alt="${c.title}" loading="lazy">` : ''}
          <h3>${c.title}</h3>
          <p>${c.description}</p>
          <p><strong>Chapters:</strong> ${chapCount}</p>
          <p><strong>Modules:</strong> ${modCount}</p>
          <a href="course-details.html?id=${c._id}" class="view-btn">View Details →</a>
        </div>
      `;
    }).join('');
  }

  searchBar?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderCourses(allCourses.filter(c =>
      c.title.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    ));
  });

  fetchCourses();
});
