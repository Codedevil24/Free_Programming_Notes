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
  const currentTimeDisplay = document.getElementById('current-time');
  const durationDisplay = document.getElementById('duration');
  const fullscreenBtn = document.getElementById('fullscreen-btn');

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
  let videoLoaded = false;

  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function updateProgress() {
    if (!video.duration) return;
    
    const percent = (video.currentTime / video.duration) * 100;
    if (progressFilled) progressFilled.style.width = `${percent}%`;
    if (currentTimeDisplay) currentTimeDisplay.textContent = formatTime(video.currentTime);
  }

  function scrub(e) {
    if (!video.duration) return;
    
    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  }

  function loadVideo(url) {
    if (!url) {
      showVideoError('No video URL provided');
      return;
    }

    console.log('Loading video:', url);
    
    // Clear any existing sources
    video.innerHTML = '';
    
    // Create source element
    const source = document.createElement('source');
    source.src = url;
    source.type = 'video/mp4';
    
    video.appendChild(source);
    
    // Load the video
    video.load();
    
    // Add event listeners for video
    video.addEventListener('loadedmetadata', () => {
      console.log('Video metadata loaded');
      videoLoaded = true;
      if (durationDisplay) durationDisplay.textContent = formatTime(video.duration);
    });

    video.addEventListener('loadeddata', () => {
      console.log('Video data loaded');
    });

    video.addEventListener('canplay', () => {
      console.log('Video can play');
    });

    video.addEventListener('error', (e) => {
      console.error('Video error:', e);
      showVideoError(`Error loading video: ${video.error?.message || 'Unknown error'}`);
    });

    video.addEventListener('stalled', () => {
      console.warn('Video stalled');
    });

    video.addEventListener('abort', () => {
      console.warn('Video aborted');
    });
  }

  function showVideoError(message) {
    const videoWrapper = document.querySelector('.video-wrapper');
    if (videoWrapper) {
      videoWrapper.innerHTML = `
        <div class="video-error">
          <h3>Video Error</h3>
          <p>${message}</p>
          <button onclick="window.location.reload()" class="retry-btn">Retry</button>
        </div>
      `;
    }
  }

  // Set up video controls
  if (video) {
    video.addEventListener('timeupdate', updateProgress);
    
    video.addEventListener('ended', () => {
      if (playPauseBtn) playPauseBtn.textContent = '▶️';
    });

    // Handle source errors
    video.addEventListener('error', (e) => {
      console.error('Video error:', e);
      const errorMsg = getVideoErrorMessage(video.error);
      showVideoError(errorMsg);
    });
  }

  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', () => {
      if (!videoLoaded) return;
      
      if (video.paused) {
        video.play().then(() => {
          playPauseBtn.textContent = '⏸️';
        }).catch(err => {
          console.error('Play failed:', err);
        });
      } else {
        video.pause();
        playPauseBtn.textContent = '▶️';
      }
    });
  }

  if (rewindBtn) {
    rewindBtn.addEventListener('click', () => {
      if (videoLoaded) video.currentTime = Math.max(0, video.currentTime - 10);
    });
  }

  if (forwardBtn) {
    forwardBtn.addEventListener('click', () => {
      if (videoLoaded && video.duration) {
        video.currentTime = Math.min(video.duration, video.currentTime + 10);
      }
    });
  }

  if (speedControl) {
    speedControl.addEventListener('change', () => {
      if (videoLoaded) video.playbackRate = parseFloat(speedControl.value);
    });
  }

  if (progressBar) {
    progressBar.addEventListener('click', scrub);
    
    progressBar.addEventListener('mousedown', () => isDragging = true);
    document.addEventListener('mouseup', () => isDragging = false);
    document.addEventListener('mousemove', (e) => {
      if (isDragging) scrub(e);
    });
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
      } else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
      } else if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      }
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    switch(e.code) {
      case 'Space':
        e.preventDefault();
        if (playPauseBtn) playPauseBtn.click();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (rewindBtn) rewindBtn.click();
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (forwardBtn) forwardBtn.click();
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (video) video.volume = Math.min(1, video.volume + 0.1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (video) video.volume = Math.max(0, video.volume - 0.1);
        break;
    }
  });

  function getVideoErrorMessage(error) {
    if (!error) return 'Unknown video error';
    
    switch(error.code) {
      case error.MEDIA_ERR_ABORTED:
        return 'Video loading was aborted';
      case error.MEDIA_ERR_NETWORK:
        return 'Network error while loading video';
      case error.MEDIA_ERR_DECODE:
        return 'Video format not supported';
      case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
        return 'Video source not supported';
      default:
        return 'Failed to load video';
    }
  }

  // Fetch Module Details
  async function fetchModuleDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId');
    const chapterIndex = parseInt(urlParams.get('chapterIndex'));
    const moduleIndex = parseInt(urlParams.get('moduleIndex'));
    
    if (!courseId || isNaN(chapterIndex) || isNaN(moduleIndex)) {
      document.body.innerHTML = `
        <div class="error-container">
          <h1>Invalid module parameters</h1>
          <p>Missing or invalid course ID, chapter index, or module index.</p>
          <button onclick="goBack()" class="back-button">← Go Back</button>
        </div>
      `;
      return;
    }

    try {
      const headers = {};
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const response = await fetch(`https://free-programming-notes.onrender.com/api/courses/${courseId}`, { headers });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch course: ${response.status} ${response.statusText}`);
      }
      
      const course = await response.json();
      const module = course.chapters?.[chapterIndex]?.modules?.[moduleIndex];

      if (!module) {
        document.body.innerHTML = `
          <div class="error-container">
            <h1>Module not found</h1>
            <p>The requested module could not be found.</p>
            <button onclick="goBack()" class="back-button">← Go Back</button>
          </div>
        `;
        return;
      }

      // Update module details
      document.title = `${module.title || 'Module'} - Code Devil`;
      
      if (moduleTitle) moduleTitle.textContent = module.title || 'Untitled Module';
      
      if (module.videoUrl) {
        loadVideo(module.videoUrl);
      } else {
        showVideoError('No video available for this module');
      }
      
      const notesElement = document.getElementById('notes');
      if (notesElement) {
        notesElement.textContent = module.notes || 'No notes available for this module.';
      }
      
      const resourcesLink = document.getElementById('resources');
      if (resourcesLink) {
        if (module.resources) {
          resourcesLink.href = module.resources;
          resourcesLink.style.display = 'inline-block';
        } else {
          resourcesLink.style.display = 'none';
        }
      }

    } catch (err) {
      console.error('Error fetching module details:', err);
      document.body.innerHTML = `
        <div class="error-container">
          <h1>Error loading module</h1>
          <p>${err.message}</p>
          <button onclick="goBack()" class="back-button">← Go Back</button>
        </div>
      `;
    }
  }

  // Initial Fetch
  fetchModuleDetails();
});

// Back button function
function goBack() {
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('courseId');
  if (courseId) {
    window.location.href = `course-details.html?id=${courseId}`;
  } else {
    window.location.href = 'courses.html';
  }
}