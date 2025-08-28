document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('courseDetails');
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
        if (menuIcon) menuIcon.style.display = 'block';
        if (closeIcon) closeIcon.style.display = 'none';
      });
    });
  }

  // JWT Authentication toggle
  function updateAuth(isAuth) {
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
      updateAuth(false);
      alert('Logged out!');
      window.location.href = '/index.html';
    });
  }

  // Get course ID from URL
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get('id');
  if (!courseId) {
    container.innerHTML = '<p class="error">No course selected.</p>';
    return;
  }

  // Global function for toggling chapters
  window.toggleChapter = function(chapterElement) {
    if (!chapterElement) return;
    
    const content = chapterElement.querySelector('.chapter-content');
    const header = chapterElement.querySelector('.chapter-header');
    const toggle = chapterElement.querySelector('.chapter-toggle');
    
    if (!content || !header || !toggle) return;
    
    const isExpanded = content.classList.contains('expanded');
    
    content.classList.toggle('expanded', !isExpanded);
    header.classList.toggle('active', !isExpanded);
    toggle.classList.toggle('expanded', !isExpanded);
    toggle.textContent = isExpanded ? '▼' : '▲';
  };

  // Global function for toggling all chapters
  let allExpanded = false;
  window.toggleAllChapters = function() {
    allExpanded = !allExpanded;
    const chapters = document.querySelectorAll('.chapter');
    
    chapters.forEach(ch => {
      const content = ch.querySelector('.chapter-content');
      const header = ch.querySelector('.chapter-header');
      const toggle = ch.querySelector('.chapter-toggle');
      
      if (content && header && toggle) {
        content.classList.toggle('expanded', allExpanded);
        header.classList.toggle('active', allExpanded);
        toggle.classList.toggle('expanded', allExpanded);
        toggle.textContent = allExpanded ? '▲' : '▼';
      }
    });
    
    const expandBtn = document.getElementById('expandAllBtn');
    if (expandBtn) {
      expandBtn.textContent = allExpanded ? 'Collapse All Chapters' : 'Expand All Chapters';
    }
  };

  // Global function to navigate to module lecture
  window.viewModule = function(courseId, chapterIndex, moduleIndex) {
    if (courseId && !isNaN(chapterIndex) && !isNaN(moduleIndex)) {
      window.location.href = `module-lecture.html?courseId=${courseId}&chapterIndex=${chapterIndex}&moduleIndex=${moduleIndex}`;
    }
  };

  container.innerHTML = '<div class="loading">Loading course details...</div>';

  // Fetch and render course details
  (async function() {
    try {
      const token = localStorage.getItem('token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await fetch(`https://free-programming-notes.onrender.com/api/courses/${courseId}`, { headers });
      
      if (!res.ok) {
        throw new Error(`Failed to load course: ${res.status} ${res.statusText}`);
      }
      
      const course = await res.json();
      
      if (!course) {
        container.innerHTML = '<p class="error">Course not found.</p>';
        return;
      }

      // Clear loading state
      container.innerHTML = '';

      // Course header
      const hdr = document.createElement('div');
      hdr.className = 'course-header';
      
      let headerHTML = `<h1 class="course-title">${course.title || 'Untitled Course'}</h1>`;
      
      if (course.thumbnail) {
        headerHTML += `<img src="${course.thumbnail}" alt="${course.title || 'Course'}" />`;
      }
      
      if (course.description) {
        headerHTML += `<p class="course-description">${course.description}</p>`;
      }
      
      hdr.innerHTML = headerHTML;
      container.appendChild(hdr);

      // Check if chapters exist
      if (!course.chapters || !Array.isArray(course.chapters) || course.chapters.length === 0) {
        const noChaptersMsg = document.createElement('p');
        noChaptersMsg.className = 'no-chapters';
        noChaptersMsg.textContent = 'No chapters available for this course yet.';
        container.appendChild(noChaptersMsg);
        return;
      }

      // Expand all button
      const expandBtn = document.createElement('button');
      expandBtn.id = 'expandAllBtn';
      expandBtn.className = 'expand-all-btn';
      expandBtn.textContent = 'Expand All Chapters';
      expandBtn.onclick = () => window.toggleAllChapters();
      container.appendChild(expandBtn);

      // Chapters container
      const chaptersContainer = document.createElement('div');
      chaptersContainer.className = 'chapters-container';

      // Render chapters and modules
      course.chapters.forEach((chap, chapIndex) => {
        if (!chap) return;
        
        const chapDiv = document.createElement('div');
        chapDiv.className = 'chapter';
        
        const modCount = chap.modules && Array.isArray(chap.modules) ? chap.modules.length : 0;
        
        chapDiv.innerHTML = `
          <div class="chapter-header" onclick="toggleChapter(this.parentElement)">
            <div class="chapter-info">
              <div class="chapter-title">${chap.title || `Chapter ${chapIndex + 1}`}</div>
              <small>${modCount} module${modCount !== 1 ? 's' : ''}</small>
            </div>
            <div class="chapter-toggle">▼</div>
          </div>
          <div class="chapter-content">
            <div class="modules-container" id="modules-${chapIndex}">
              ${modCount === 0 ? '<p class="no-modules">No modules available in this chapter</p>' : ''}
            </div>
          </div>
        `;
        
        chaptersContainer.appendChild(chapDiv);
        
        // Populate modules safely
        const modulesContainer = document.getElementById(`modules-${chapIndex}`);
        if (chap.modules && Array.isArray(chap.modules) && chap.modules.length > 0) {
          chap.modules.forEach((mod, modIndex) => {
            if (!mod) return;
            
            const modDiv = document.createElement('div');
            modDiv.className = 'module';
            
            let moduleHTML = '<div class="module-info">';
            
            if (mod.thumbnail) {
              moduleHTML += `<img src="${mod.thumbnail}" class="module-thumbnail" alt="${mod.title || 'Module thumbnail'}" loading="lazy" />`;
            }
            
            moduleHTML += `
              <div class="module-details">
                <div class="module-title">${mod.title || `Module ${modIndex + 1}`}</div>
            `;
            
            if (mod.notes) {
              const shortNotes = mod.notes.length > 100 ? mod.notes.substring(0, 100) + '...' : mod.notes;
              moduleHTML += `<div class="module-notes">${shortNotes}</div>`;
            }
            
            moduleHTML += '</div></div><div class="module-actions">';
            
            if (mod.videoUrl) {
              moduleHTML += `<button onclick="viewModule('${courseId}', ${chapIndex}, ${modIndex})" class="module-btn primary">🎥 Watch Lecture</button>`;
            }
            
            if (mod.resources) {
              moduleHTML += `<a href="${mod.resources}" class="module-btn secondary" target="_blank" rel="noopener noreferrer">📚 Resources</a>`;
            }
            
            moduleHTML += '</div>';
            
            modDiv.innerHTML = moduleHTML;
            modulesContainer.appendChild(modDiv);
          });
        }
      });

      container.appendChild(chaptersContainer);
      
    } catch (err) {
      console.error('Error loading course:', err);
      container.innerHTML = `<p class="error">Error loading course: ${err.message}</p>`;
    }
  })();
});

// Back button function
function goBack() {
  window.location.href = 'courses.html';
}