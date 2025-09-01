document.addEventListener('DOMContentLoaded', () => {
  const courseList = document.getElementById('course-list');
  const searchBar = document.getElementById('search-bar');
  const navbarLinks = document.getElementById('navbar-links');
  const menuIcon = document.getElementById('menu-icon');
  const closeIcon = document.getElementById('close-icon');
  const logoutLink = document.getElementById('logout-link');

  let allCourses = [];
  let isLoading = false;

  // ===== PRESERVED: Menu Toggle Functionality =====
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

  // ===== PRESERVED: Auth Display Functionality =====
  function updateAuthDisplay(isAuth) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAuth ? 'block' : 'none');
    document.querySelectorAll('.admin-login').forEach(el => el.style.display = isAuth ? 'none' : 'block');
    document.querySelectorAll('.logout').forEach(el => el.style.display = isAuth ? 'block' : 'none');
  }

  const token = localStorage.getItem('token');
  if (token && window.jwt_decode) {
    try {
      const decoded = jwt_decode(token);
      if (decoded.exp * 1000 > Date.now()) {
        updateAuthDisplay(true);
      } else {
        localStorage.removeItem('token');
        updateAuthDisplay(false);
      }
    } catch {
      localStorage.removeItem('token');
      updateAuthDisplay(false);
    }
  } else {
    updateAuthDisplay(false);
  }

  // ===== PRESERVED: Logout Functionality =====
  logoutLink?.addEventListener('click', e => {
    e.preventDefault();
    localStorage.removeItem('token');
    updateAuthDisplay(false);
    alert('Logged out successfully!');
    window.location.href = '/index.html';
  });

  // ===== SMART LOADING STATES =====
  const loadingState = document.getElementById('loading-state');
  const noResults = document.getElementById('no-results');
  const errorMessage = document.getElementById('error-message');

  function showLoading() {
    if (loadingState) loadingState.style.display = 'block';
    if (noResults) noResults.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
    if (courseList) courseList.style.display = 'none';
  }

  function hideLoading() {
    if (loadingState) loadingState.style.display = 'none';
    if (courseList) courseList.style.display = 'block';
  }

  function showNoResults() {
    hideLoading();
    if (noResults) noResults.style.display = 'block';
    if (courseList) courseList.style.display = 'none';
  }

  function showError(message) {
    hideLoading();
    if (errorMessage) {
      errorMessage.style.display = 'block';
      document.getElementById('error-text').textContent = message;
    }
    if (courseList) courseList.style.display = 'none';
  }

  // ===== ENHANCED: Render Courses =====
  function renderCourses(courses) {
    hideLoading();
    
    if (!courseList) return;
    
    if (courses.length === 0) {
      showNoResults();
      return;
    }
    
    courseList.innerHTML = courses.map(course => {
      const chapCount = course.chapters?.length || 0;
      const modCount = (course.chapters || []).reduce((sum, ch) => sum + (ch.modules?.length || 0), 0);
      const thumbnailUrl = course.thumbnail || 'https://via.placeholder.com/400x225/667eea/ffffff?text=Course+Image';
      
      return `
        <div class="course-item" data-id="${course._id}">
          ${thumbnailUrl ? `<img src="${thumbnailUrl}" alt="${course.title}" loading="lazy">` : ''}
          <h3>${course.title}</h3>
          <p>${course.shortDescription || course.description || 'Learn comprehensive programming concepts'}</p>
          <p><strong>Chapters:</strong> ${chapCount}</p>
          <p><strong>Modules:</strong> ${modCount}</p>
          <a href="course-details.html?id=${course._id}" class="view-btn">View Details</a>
        </div>
      `;
    }).join('');
  }

  // ===== ENHANCED: Smart Search =====
  searchBar?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    
    if (!q) {
      renderCourses(allCourses);
      return;
    }
    
    const filtered = allCourses.filter(course =>
      course.title?.toLowerCase().includes(q) ||
      (course.shortDescription || '').toLowerCase().includes(q) ||
      (course.description || '').toLowerCase().includes(q)
    );
    
    if (filtered.length === 0) {
      showNoResults();
    } else {
      renderCourses(filtered);
    }
  });

  // ===== ENHANCED: Fetch Courses with Smart States =====
  async function fetchCourses() {
    if (isLoading) return;
    
    showLoading();
    
    try {
      const headers = {};
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await fetch('https://free-programming-notes.onrender.com/api/courses', { headers });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      allCourses = await res.json();
      
      if (allCourses.length === 0) {
        showNoResults();
      } else {
        renderCourses(allCourses);
      }
      
    } catch (err) {
      console.error('Fetch error:', err);
      showError(err.message || 'Unable to load courses. Please check your connection.');
    }
  }

  // ===== ENHANCED: CSS for Loading States =====
  const loadingCSS = `
    <style>
      #loading-state,
      #no-results,
      #error-message {
        background: var(--color-surface);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-sm);
        border: 1px solid var(--color-card-border);
        margin: 40px auto;
        max-width: 500px;
      }

      .loading-spinner {
        width: 50px;
        height: 50px;
        border: 4px solid var(--color-border);
        border-top: 4px solid var(--color-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      #no-results h3,
      #error-message h3 {
        color: var(--color-text);
        margin-bottom: 12px;
      }

      #no-results p,
      #error-message p {
        color: var(--color-text-secondary);
        margin-bottom: 20px;
      }

      .view-course-btn {
        background: var(--color-primary);
        color: white;
        padding: 12px 24px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
      }

      .view-course-btn:hover {
        background: var(--color-primary-hover);
      }
    </style>
  `;
  
  if (!document.getElementById('loading-styles')) {
    document.head.insertAdjacentHTML('beforeend', loadingCSS);
  }

  // ===== INIT: Load Courses =====
  fetchCourses();
});
