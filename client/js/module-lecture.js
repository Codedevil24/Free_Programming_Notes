document.addEventListener('DOMContentLoaded', () => {
    const navbarLinks = document.getElementById('navbar-links');
    const menuIcon = document.getElementById('menu-icon');
    const closeIcon = document.getElementById('close-icon');
    const logoutLink = document.getElementById('logout-link');
    const moduleTitle = document.getElementById('module-title');
    const video = document.getElementById('video');
    const moduleNotes = document.getElementById('module-notes');
    const moduleResources = document.getElementById('module-resources');
  
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
  
    // JWT Authentication
    let jwt_decode = window.jwt_decode;
    if (!jwt_decode && typeof window.jwt_decode === 'undefined') {
      console.error('jwt-decode not available');
      jwt_decode = null;
    }
  
    const token = localStorage.getItem('token');
    if (token && jwt_decode) {
      try {
        const decoded = jwt_decode(token);
        const now = Date.now() / 1000;
        if (decoded.exp < now) {
          localStorage.removeItem('token');
          updateAuthDisplay(false);
        } else {
          updateAuthDisplay(true);
        }
      } catch (err) {
        console.error('Token validation error:', err);
        localStorage.removeItem('token');
        updateAuthDisplay(false);
      }
    } else {
      updateAuthDisplay(false);
    }
  
    function updateAuthDisplay(isAuthenticated) {
      const adminLogin = document.querySelector('.admin-login');
      const logout = document.querySelector('.logout');
      if (adminLogin && logout) {
        adminLogin.style.display = isAuthenticated ? 'none' : 'block';
        logout.style.display = isAuthenticated ? 'block' : 'none';
      }
    }
  
    // Logout Functionality
    if (logoutLink) {
      logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        updateAuthDisplay(false);
        alert('Logged out successfully!');
        window.location.href = '/index.html';
      });
    }
  
    // Menu Toggle Functionality
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
  
    // Fetch Module Details
    async function fetchModuleDetails() {
      const urlParams = new URLSearchParams(window.location.search);
      const courseId = urlParams.get('courseId');
      const chapterIndex = parseInt(urlParams.get('chapterIndex'));
      const moduleIndex = parseInt(urlParams.get('moduleIndex'));
      if (!courseId || isNaN(chapterIndex) || isNaN(moduleIndex)) {
        document.getElementById('module-content').innerHTML = '<p>Invalid module parameters.</p>';
        return;
      }
  
      try {
        const headers = {};
        const token = localStorage.getItem('token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const response = await fetch(`https://free-programming-notes.onrender.com/api/courses/${courseId}`, { headers });
        if (!response.ok) throw new Error(`Failed to fetch course details: ${response.statusText}`);
        const course = await response.json();
        const module = course.chapters[chapterIndex]?.modules[moduleIndex];
  
        if (!module) {
          document.getElementById('module-content').innerHTML = '<p>Module not found.</p>';
          return;
        }
  
        moduleTitle.textContent = module.title || 'No Title';
        if (module.videoUrl) {
          video.src = module.videoUrl;
          video.load();
        } else {
          video.style.display = 'none';
        }
        moduleNotes.textContent = module.notes || 'No notes available.';
        if (module.resources) {
          moduleResources.href = module.resources;
          moduleResources.textContent = 'Download Resources';
        } else {
          moduleResources.style.display = 'none';
        }
      } catch (err) {
        console.error('Error fetching module details:', err);
        document.getElementById('module-content').innerHTML = `<p>Error loading module: ${err.message}</p>`;
      }
    }
  
    // Video Controls Functions
    window.seek = (seconds) => {
      video.currentTime += seconds;
    };
  
    window.playPause = () => {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    };
  
    window.setSpeed = (speed) => {
      video.playbackRate = parseFloat(speed);
    };
  
    // Initial Fetch
    fetchModuleDetails();
  });