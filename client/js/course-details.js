document.addEventListener('DOMContentLoaded', () => {
  // ===== PRESERVED: Existing Navigation & Auth =====
  const navbarLinks = document.getElementById('navbar-links');
  const menuIcon = document.getElementById('menu-icon');
  const closeIcon = document.getElementById('close-icon');
  const logoutLink = document.getElementById('logout-link');
  const container = document.getElementById('courseDetails');

  // Preserved: Menu toggle functionality
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

  // Preserved: JWT Authentication
  function updateAuth(isAuth) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAuth ? 'block' : 'none');
    document.querySelectorAll('.admin-login').forEach(el => el.style.display = isAuth ? 'none' : 'block');
    document.querySelectorAll('.logout').forEach(el => el.style.display = isAuth ? 'block' : 'none');
  }

  const token = localStorage.getItem('token');
  if (token && window.jwt_decode) {
    try {
      const dec = jwt_decode(token);
      if (dec.exp * 1000 > Date.now()) updateAuth(true);
      else { 
        localStorage.removeItem('token'); 
        updateAuth(false); 
      }
    } catch {
      localStorage.removeItem('token');
      updateAuth(false);
    }
  } else updateAuth(false);

  // Preserved: Logout
  if (logoutLink) {
    logoutLink.addEventListener('click', e => {
      e.preventDefault();
      localStorage.removeItem('token');
      updateAuth(false);
      alert('Logged out!');
      window.location.href = '/index.html';
    });
  }

  // ===== ENHANCED: Course Details System =====
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get('id');
  
  if (!courseId) {
    container.innerHTML = '<div class="error-container"><h2>Course Not Found</h2><p>No course selected. Please choose a course from the courses page.</p><button onclick="window.location.href=\'courses.html\'">View Courses</button></div>';
    return;
  }

  // Enhanced course rendering
  async function loadCourseDetails() {
    try {
      container.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Loading course details...</p></div>';
      
      const token = localStorage.getItem('token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await fetch(`https://free-programming-notes.onrender.com/api/courses/${courseId}`, { headers });
      
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const course = await res.json();
      
      if (!course) {
        container.innerHTML = '<div class="error-container"><h2>Course Not Found</h2><p>The requested course could not be loaded.</p><button onclick="window.location.href=\'courses.html\'">Back to Courses</button></div>';
        return;
      }

      renderCourseDetails(course);
      
    } catch (err) {
      console.error('Error loading course:', err);
      container.innerHTML = `<div class="error-container"><h2>Error Loading Course</h2><p>${err.message}</p><button onclick="window.location.href='courses.html'">Back to Courses</button></div>`;
    }
  }

  function renderCourseDetails(course) {
    container.innerHTML = '';

    // Course Header Section
    const headerSection = document.createElement('div');
    headerSection.className = 'course-header-section';
    
    let headerHTML = `
      <button class="back-button" onclick="window.location.href='courses.html'">
        ← Back to Courses
      </button>
      
      <h1 class="course-title">${course.title || 'Untitled Course'}</h1>
      
      <div class="course-image-container">
        <img src="${course.thumbnail || 'https://via.placeholder.com/800x450/667eea/ffffff?text=Course+Image'}" 
             alt="${course.title || 'Course'}" 
             class="course-image">
      </div>
      
      <div class="course-meta">
        <span class="meta-item">
          <span class="icon">📖</span>
          ${course.chapters?.length || 0} Chapters
        </span>
        <span class="meta-item">
          <span class="icon">📋</span>
          ${(course.chapters || []).reduce((sum, ch) => sum + (ch.modules?.length || 0), 0)} Modules
        </span>
      </div>
      
      <div class="course-description">
        <h2>About This Course</h2>
        <p>${course.description || course.shortDescription || 'No description available.'}</p>
      </div>
    `;
    
    headerSection.innerHTML = headerHTML;
    container.appendChild(headerSection);

    // Check for chapters
    if (!course.chapters || !Array.isArray(course.chapters) || course.chapters.length === 0) {
      const noChapters = document.createElement('div');
      noChapters.className = 'no-content';
      noChapters.innerHTML = `
        <h3>🚧 Course Content Coming Soon</h3>
        <p>We're preparing the course content. Check back later!</p>
      `;
      container.appendChild(noChapters);
      return;
    }

    // Chapters Container
    const chaptersContainer = document.createElement('div');
    chaptersContainer.className = 'chapters-container';

    // Expand All Button
    const expandBtn = document.createElement('button');
    expandBtn.className = 'expand-all-btn';
    expandBtn.id = 'expandAllBtn';
    expandBtn.innerHTML = '🔍 Expand All Chapters';
    expandBtn.onclick = toggleAllChapters;
    container.appendChild(expandBtn);

    // Render each chapter
    course.chapters.forEach((chapter, chapterIndex) => {
      if (!chapter) return;

      const chapterDiv = document.createElement('div');
      chapterDiv.className = 'chapter';
      chapterDiv.dataset.chapterIndex = chapterIndex;

      const moduleCount = chapter.modules?.length || 0;

      // Chapter Header
      const headerHTML = `
        <div class="chapter-header" onclick="toggleChapter(${chapterIndex})">
          <div class="chapter-info">
            <h3 class="chapter-title">${chapter.title || `Chapter ${chapterIndex + 1}`}</h3>
            <span class="chapter-count">${moduleCount} ${moduleCount === 1 ? 'Module' : 'Modules'}</span>
          </div>
          <div class="chapter-toggle">▼</div>
        </div>
        <div class="chapter-content" id="chapter-${chapterIndex}">
          <div class="modules-container">
            ${!chapter.modules || chapter.modules.length === 0 ? 
              '<div class="no-modules"><p>No modules available in this chapter yet</p></div>' : 
              ''}
          </div>
        </div>
      `;

      chapterDiv.innerHTML = headerHTML;
      chaptersContainer.appendChild(chapterDiv);

      // Render modules
      if (chapter.modules && Array.isArray(chapter.modules) && chapter.modules.length > 0) {
        const modulesContainer = chapterDiv.querySelector(`#chapter-${chapterIndex} .modules-container`);
        
        chapter.modules.forEach((module, moduleIndex) => {
          if (!module) return;

          const moduleDiv = document.createElement('div');
          moduleDiv.className = 'module-card';

          let moduleHTML = `
            <div class="module-content">
              ${module.thumbnail ? 
                `<img src="${module.thumbnail}" alt="${module.title || 'Module'}" class="module-thumbnail" loading="lazy">` : 
                '<div class="module-thumbnail-placeholder">📚</div>'
              }
              
              <div class="module-info">
                <h4 class="module-title">${module.title || `Module ${moduleIndex + 1}`}</h4>
                
                ${module.notes ? 
                  `<p class="module-description">${module.notes.substring(0, 150)}${module.notes.length > 150 ? '...' : ''}</p>` : 
                  ''
                }
                
                <div class="module-type-badge">${module.type || 'Content'}</div>
              </div>
            </div>
            
            <div class="module-actions">
              ${module.videoUrl ? 
                `<button onclick="viewModule('${courseId}', ${chapterIndex}, ${moduleIndex})" class="watch-btn">
                  🎥 Watch Lecture
                </button>` : ''
              }
              
              ${module.resources ? 
                `<a href="${module.resources}" target="_blank" rel="noopener" class="resources-btn">
                  📚 Resources
                </a>` : ''
              }
            </div>
          `;

          moduleDiv.innerHTML = moduleHTML;
          modulesContainer.appendChild(moduleDiv);
        });
      }
    });

    container.appendChild(chaptersContainer);
  }

  // ===== Interactive Functions =====
  window.toggleChapter = function(chapterIndex) {
    const chapter = document.querySelector(`[data-chapter-index="${chapterIndex}"]`);
    if (!chapter) return;

    const content = chapter.querySelector('.chapter-content');
    const toggle = chapter.querySelector('.chapter-toggle');
    
    const isExpanded = content.classList.contains('expanded');
    
    content.classList.toggle('expanded', !isExpanded);
    toggle.classList.toggle('expanded', !isExpanded);
    toggle.textContent = isExpanded ? '▼' : '▲';
  };

  window.toggleAllChapters = function() {
    const chapters = document.querySelectorAll('.chapter');
    const expandBtn = document.getElementById('expandAllBtn');
    
    let allExpanded = Array.from(chapters).every(ch => 
      ch.querySelector('.chapter-content').classList.contains('expanded')
    );
    
    chapters.forEach(chapter => {
      const content = chapter.querySelector('.chapter-content');
      const toggle = chapter.querySelector('.chapter-toggle');
      
      content.classList.toggle('expanded', !allExpanded);
      toggle.classList.toggle('expanded', !allExpanded);
      toggle.textContent = !allExpanded ? '▲' : '▼';
    });
    
    if (expandBtn) {
      expandBtn.innerHTML = !allExpanded ? '🔍 Collapse All Chapters' : '🔍 Expand All Chapters';
    }
  };

  window.viewModule = function(courseId, chapterIndex, moduleIndex) {
    window.location.href = `module-lecture.html?courseId=${courseId}&chapterIndex=${chapterIndex}&moduleIndex=${moduleIndex}`;
  };

  // ===== INIT: Load Course =====
  loadCourseDetails();
});
