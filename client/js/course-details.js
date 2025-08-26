document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('courseDetails');
    const backBtn = document.querySelector('.back-button');
    const navbarLinks = document.getElementById('navbar-links');
    const menuIcon = document.getElementById('menu-icon');
    const closeIcon = document.getElementById('close-icon');
    const logoutLink = document.getElementById('logout-link');
  
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
        if (dec.exp*1000 > Date.now()) updateAuth(true);
        else { localStorage.removeItem('token'); updateAuth(false); }
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
  
    // Expand/collapse all
    let allExpanded = false;
    function toggleAll() {
      allExpanded = !allExpanded;
      document.querySelectorAll('.chapter').forEach(ch => {
        ch.querySelector('.chapter-content').classList.toggle('expanded', allExpanded);
        ch.querySelector('.chapter-header').classList.toggle('active', allExpanded);
        ch.querySelector('.chapter-toggle').classList.toggle('expanded', allExpanded);
      });
      expandBtn.textContent = allExpanded ? 'Collapse All Chapters' : 'Expand All Chapters';
    }
  
    container.innerHTML = '<div class="loading">Loading course details...</div>';
    let expandBtn;
  
    // Fetch and render course details
    (async function() {
      try {
        const res = await fetch(`/admin/api/courses/${courseId}`);
        if (!res.ok) throw new Error(res.statusText);
        const course = await res.json();
        container.innerHTML = '';
        // Header
        const hdr = document.createElement('div');
        hdr.className = 'course-header';
        hdr.innerHTML = `
          <h1 class="course-title">${course.title}</h1>
          ${course.thumbnail?`<img src="${course.thumbnail}" alt="${course.title}" />`:''}
          <p class="course-description">${course.description||''}</p>
        `;
        container.appendChild(hdr);
  
        if (!course.chapters.length) {
          container.insertAdjacentHTML('beforeend','<p class="loading">No chapters yet.</p>');
          return;
        }
  
        // Expand all button
        expandBtn = document.createElement('button');
        expandBtn.id = 'expandAllBtn';
        expandBtn.className = 'expand-all-btn';
        expandBtn.textContent = 'Expand All Chapters';
        expandBtn.addEventListener('click', toggleAll);
        container.appendChild(expandBtn);
  
        // Render chapters and modules
        course.chapters.forEach((chap, idx) => {
          const chapDiv = document.createElement('div');
          chapDiv.className = 'chapter';
          const modCount = chap.modules.length;
          chapDiv.innerHTML = `
            <div class="chapter-header" onclick="toggleChapter(this.parentElement)">
              <div>
                <div class="chapter-title">${chap.title}</div>
                <small>${modCount} module${modCount!==1?'s':''}</small>
              </div>
              <div class="chapter-toggle">▼</div>
            </div>
            <div class="chapter-content">
              <div class="modules-container" id="modules-${idx}">
                ${modCount===0?'<p>No modules</p>':''}
              </div>
            </div>
          `;
          container.appendChild(chapDiv);
          const modulesContainer = document.getElementById(`modules-${idx}`);
          chap.modules.forEach(mod => {
            const modDiv = document.createElement('div');
            modDiv.className = 'module';
            modDiv.innerHTML = `
              <div class="module-title">${mod.title}</div>
              ${mod.thumbnail?`<img src="${mod.thumbnail}" class="module-thumbnail"/>`:''}
              <div class="module-actions">
                ${mod.videoUrl?`<a href="${mod.videoUrl}" class="module-btn">🎥 Watch Video</a>`:''}
                ${mod.resources?`<a href="${mod.resources}" class="module-btn resources">📚 Resources</a>`:''}
              </div>
              ${mod.notes?`<div class="module-notes"><strong>Notes:</strong>${mod.notes}</div>`:''}
            `;
            modulesContainer.appendChild(modDiv);
          });
        });
      } catch (err) {
        container.innerHTML = `<p class="error">Error loading course: ${err.message}</p>`;
      }
    })();
  
    // Back button
    backBtn?.addEventListener('click', e => {
      e.preventDefault();
      window.history.back();
    });
  });
  