document.addEventListener('DOMContentLoaded', () => {
  const navbarLinks = document.getElementById('navbar-links');
  const menuIcon = document.getElementById('menu-icon');
  const closeIcon = document.getElementById('close-icon');
  const logoutLink = document.getElementById('logout-link');
  const moduleTitle = document.getElementById('module-title');
  const video = document.getElementById('video-player');
  const playPauseBtn = document.getElementById('play-pause-btn');
  const rewindBtn = document.getElementById('rewind-btn');
  const forwardBtn = document.getElementById('fast-forward-btn');
  const speedControl = document.getElementById('speed-control');
  const progressBar = document.getElementById('progress-bar');
  const progressFilled = document.getElementById('progress-filled');
  const progressHandle = document.getElementById('progress-handle');
  const currentTimeDisplay = document.getElementById('current-time');
  const durationDisplay = document.getElementById('duration');
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  const castBtn = document.getElementById('cast-btn');

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

  // JWT Authentication
  function updateAuthDisplay(isAuthenticated) {
    const adminLogin = document.querySelector('.admin-login');
    const logout = document.querySelector('.logout');
    if (adminLogin && logout) {
      adminLogin.style.display = isAuthenticated ? 'none' : 'block';
      logout.style.display = isAuthenticated ? 'block' : 'none';
    }
  }

  const token = localStorage.getItem('token');
  if (token && window.jwt_decode) {
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

  // Video Player Controls
  let isDragging = false;

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function updateProgress() {
    const percent = (video.currentTime / video.duration) * 100;
    progressFilled.style.width = `${percent}%`;
    progressHandle.style.left = `${percent}%`;
    currentTimeDisplay.textContent = formatTime(video.currentTime);
  }

  function scrub(e) {
    const scrubTime = (e.offsetX / progressBar.offsetWidth) * video.duration;
    video.currentTime = scrubTime;
  }

  // Event listeners for video controls
  video.addEventListener('loadedmetadata', () => {
    durationDisplay.textContent = formatTime(video.duration);
  });

  video.addEventListener('timeupdate', updateProgress);

  video.addEventListener('ended', () => {
    playPauseBtn.textContent = '▶️';
  });

  playPauseBtn.addEventListener('click', () => {
    if (video.paused) {
      video.play();
      playPauseBtn.textContent = '⏸️';
    } else {
      video.pause();
      playPauseBtn.textContent = '▶️';
    }
  });

  rewindBtn.addEventListener('click', () => {
    video.currentTime -= 10;
  });

  forwardBtn.addEventListener('click', () => {
    video.currentTime += 10;
  });

  speedControl.addEventListener('change', () => {
    video.playbackRate = parseFloat(speedControl.value);
  });

  progressBar.addEventListener('click', scrub);
  
  progressBar.addEventListener('mousedown', () => isDragging = true);
  document.addEventListener('mouseup', () => isDragging = false);
  document.addEventListener('mousemove', (e) => {
    if (isDragging) scrub(e);
  });

  fullscreenBtn.addEventListener('click', () => {
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
      video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) {
      video.msRequestFullscreen();
    }
  });

  castBtn.addEventListener('click', () => {
    if (window.chrome && window.chrome.cast) {
      // Chrome cast integration
      alert('Cast functionality would open here');
    } else {
      alert('Cast not supported on this device');
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    switch(e.code) {
      case 'Space':
        e.preventDefault();
        playPauseBtn.click();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        video.currentTime -= 5;
        break;
      case 'ArrowRight':
        e.preventDefault();
        video.currentTime += 5;
        break;
      case 'ArrowUp':
        e.preventDefault();
        video.volume = Math.min(1, video.volume + 0.1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        video.volume = Math.max(0, video.volume - 0.1);
        break;
    }
  });

  // Fetch Module Details
  async function fetchModuleDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId');
    const chapterIndex = parseInt(urlParams.get('chapterIndex'));
    const moduleIndex = parseInt(urlParams.get('moduleIndex'));
    
    if (!courseId || isNaN(chapterIndex) || isNaN(moduleIndex)) {
      document.body.innerHTML = '<div class="error-container"><h1>Invalid module parameters</h1><button onclick="goBack()">Go Back</button></div>';
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
        document.body.innerHTML = '<div class="error-container"><h1>Module not found</h1><button onclick="goBack()">Go Back</button></div>';
        return;
      }

      // Update module details
      document.title = `${module.title} - Code Devil`;
      moduleTitle.textContent = module.title || 'Untitled Module';
      
      if (module.videoUrl) {
        video.src = module.videoUrl;
        video.load();
      } else {
        video.style.display = 'none';
        document.querySelector('.video-wrapper').innerHTML = '<div class="no-video">No video available for this module</div>';
      }
      
      document.getElementById('notes').textContent = module.notes || 'No notes available for this module.';
      
      const resourcesLink = document.getElementById('resources');
      if (module.resources) {
        resourcesLink.href = module.resources;
        resourcesLink.style.display = 'inline-block';
      } else {
        resourcesLink.style.display = 'none';
      }

    } catch (err) {
      console.error('Error fetching module details:', err);
      document.body.innerHTML = `<div class="error-container"><h1>Error loading module</h1><p>${err.message}</p><button onclick="goBack()">Go Back</button></div>`;
    }
  }

  // Initial Fetch
  fetchModuleDetails();
});

// Back button function
function goBack() {
  window.history.back();
}