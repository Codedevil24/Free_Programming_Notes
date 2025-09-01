document.addEventListener('DOMContentLoaded', () => {
  const courseList = document.getElementById('course-list');
  const searchBar = document.getElementById('search-bar');
  const loadingState = document.getElementById('loading-state');
  const noResults = document.getElementById('no-results');
  const errorMessage = document.getElementById('error-message');
  const navbarLinks = document.getElementById('navbar-links');
  const menuIcon = document.getElementById('menu-icon');
  const closeIcon = document.getElementById('close-icon');
  const logoutLink = document.getElementById('logout-link');

  let allCourses = [];
  let isLoading = false;

  // Menu toggle functionality
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

  // Auth display functionality
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

  // Logout functionality
  logoutLink?.addEventListener('click', e => {
    e.preventDefault();
    localStorage.removeItem('token');
    updateAuthDisplay(false);
    alert('Logged out successfully!');
    window.location.href = '/index.html';
  });

  // Loading States Management
  function showLoading() {
    isLoading = true;
    courseList.innerHTML = '';
    loadingState.style.display = 'block';
    noResults.style.display = 'none';
    errorMessage.style.display = 'none';
  }

  function hideLoading() {
    isLoading = false;
    loadingState.style.display = 'none';
  }

  function showError(message) {
    hideLoading();
    errorMessage.style.display = 'block';
    document.getElementById('error-text').textContent = message;
  }

  function showNoResults() {
    hideLoading();
    noResults.style.display = 'block';
  }

  function hideAllStates() {
    hideLoading();
    noResults.style.display = 'none';
    errorMessage.style.display = 'none';
  }

  // Enhanced Loading State HTML
  if (!loadingState) {
    const loadingHTML = `
      <div id="loading-state" style="display: none; text-align: center; padding: 60px 20px;">
        <div class="loading-spinner"></div>
        <p style="color: var(--color-text-secondary); margin-top: 16px; font-size: 1.1em;">Loading courses...</p>
      </div>
    `;
    courseList.insertAdjacentHTML('beforebegin', loadingHTML);
  }

  // Enhanced No Results HTML
  if (!noResults) {
    const noResultsHTML = `
      <div id="no-results" style="display: none; text-align: center; padding: 80px 20px;">
        <div style="font-size: 4rem; margin-bottom: 24px;">📚</div>
        <h3 style="color: var(--color-text); margin-bottom: 16px;">No Courses Found</h3>
        <p style="color: var(--color-text-secondary); margin-bottom: 24px; max-width: 400px; margin-left: auto; margin-right: auto;">
          We couldn't find any courses matching your criteria. Try adjusting your search or browse all available courses.
        </p>
        <button onclick="clearSearch()" class="view-course-btn">Show All Courses</button>
      </div>
    `;
    courseList.insertAdjacentHTML('afterend', noResultsHTML);
  }

  // Enhanced Error Message HTML
  if (!errorMessage) {
    const errorHTML = `
      <div id="error-message" style="display: none; text-align: center; padding: 80px 20px;">
        <div style="font-size: 4rem; margin-bottom: 24px;">⚠️</div>
        <h3 style="color: var(--color-text); margin-bottom: 16px;">Connection Error</h3>
        <p id="error-text" style="color: var(--color-text-secondary); margin-bottom: 24px; max-width: 400px; margin-left: auto; margin-right: auto;"></p>
        <button onclick="fetchCourses()" class="view-course-btn">Try Again</button>
      </div>
    `;
    courseList.insertAdjacentHTML('afterend', errorHTML);
  }

  // CSS for loading spinner
  const loadingCSS = `
    <style>
      .loading-spinner {
        width: 50px;
        height: 50px;
        border: 4px solid var(--color-border);
        border-top: 4px solid var(--color-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  document.head.insertAdjacentHTML('beforeend', loadingCSS);

  // Render courses with proper loading states
  function renderCourses(courses) {
    hideAllStates();
    
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
        <article class="course-card" data-id="${course._id}">
          <div class="course-image-container">
            <img src="${thumbnailUrl}" 
                 alt="${course.title}" 
                 loading="lazy"
                 class="course-image">
          </div>
          <div class="course-content">
            <h3 class="course-title">${course.title}</h3>
            <p class="course-description">${course.shortDescription || course.description || 'Learn comprehensive programming concepts'}</p>
            <div class="course-meta">
              <span class="meta-item">
                <span class="icon">📖</span>
                ${chapCount} Chapters
              </span>
              <span class="meta-item">
                <span class="icon">📋</span>
                ${modCount} Modules
              </span>
            </div>
            <a href="course-details.html?id=${course._id}" class="view-course-btn">
              View Course →
            </a>
          </div>
        </article>
      `;
    }).join('');
  }

  // Smart search functionality
  function filterCourses(query) {
    if (!query.trim()) {
      renderCourses(allCourses);
      return;
    }
    
    const filtered = allCourses.filter(course =>
      course.title?.toLowerCase().includes(query.toLowerCase()) ||
      course.shortDescription?.toLowerCase().includes(query.toLowerCase()) ||
      course.description?.toLowerCase().includes(query.toLowerCase()) ||
      course.category?.toLowerCase().includes(query.toLowerCase())
    );
    
    if (filtered.length === 0) {
      showNoResults();
    } else {
      renderCourses(filtered);
    }
  }

  // Clear search function
  window.clearSearch = function() {
    if (searchBar) searchBar.value = '';
    renderCourses(allCourses);
  }

  // Enhanced fetch courses with proper loading states
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
      showError(err.message || 'Unable to load courses. Please check your connection and try again.');
    }
  }

  // Enhanced search input
  searchBar?.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    if (query === '') {
      renderCourses(allCourses);
      return;
    }
    
    // Debounced search
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      filterCourses(query);
    }, 300);
  });

  // Enhanced error retry
  window.fetchCourses = fetchCourses;

  // Initialize page
  fetchCourses();
});
