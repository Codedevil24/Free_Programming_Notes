document.addEventListener('DOMContentLoaded', () => {
  // Preserve all existing functionality exactly as in your GitHub repo
  const navbarLinks = document.getElementById('navbar-links');
  const menuIcon = document.getElementById('menu-icon');
  const closeIcon = document.getElementById('close-icon');
  const logoutLink = document.getElementById('logout-link');
  const moduleTitle = document.getElementById('module-title');
  const video = document.getElementById('video-player'); // Fixed ID
  const moduleNotes = document.getElementById('notes');
  const moduleResources = document.getElementById('resources');

  // Debug logging
  function debugLog(message, data = '') {
    console.log('[Video Player]', message, data);
  }

  // Show loading state
  function showLoading() {
    document.getElementById('video-loading').style.display = 'flex';
    video.style.display = 'none';
    document.getElementById('youtube-iframe').style.display = 'none';
    document.getElementById('video-error').style.display = 'none';
  }

  // Show error state
  function showError(message) {
    document.getElementById('video-error').style.display = 'flex';
    document.getElementById('error-message').textContent = message;
    video.style.display = 'none';
    document.getElementById('youtube-iframe').style.display = 'none';
    document.getElementById('video-loading').style.display = 'none';
  }

  // Show video
  function showVideo() {
    video.style.display = 'block';
    document.getElementById('youtube-iframe').style.display = 'none';
    document.getElementById('video-loading').style.display = 'none';
    document.getElementById('video-error').style.display = 'none';
  }

  // YouTube detection
  function isYouTubeUrl(url) {
    if (!url) return false;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    return patterns.some(pattern => pattern.test(url));
  }

  function extractYouTubeId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  }

  // Smart video loading
  function loadVideoSmart(url) {
    debugLog('Loading video:', url);
    
    if (!url) {
      showError('No video URL provided');
      return;
    }

    showLoading();

    if (isYouTubeUrl(url)) {
      const videoId = extractYouTubeId(url);
      if (videoId) {
        // Replace video with YouTube iframe
        const videoWrapper = document.querySelector('.video-wrapper');
        if (videoWrapper) {
          videoWrapper.innerHTML = `
            <iframe width="100%" height="400" src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0" 
                    frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
            </iframe>
          `;
          // Hide existing controls for YouTube
          document.querySelector('.custom-controls').style.display = 'none';
        }
      } else {
        // Fallback to direct video
        loadDirectVideo(url);
      }
    } else {
      loadDirectVideo(url);
    }
  }

  // Load direct video (existing functionality)
  function loadDirectVideo(url) {
    video.src = url;
    video.style.display = 'block';
    document.getElementById('youtube-iframe').style.display = 'none';
    document.getElementById('video-loading').style.display = 'none';
    document.getElementById('video-error').style.display = 'none';
    
    // Show custom controls for direct videos
    document.querySelector('.custom-controls').style.display = 'flex';
    
    // Add video event listeners
    video.addEventListener('loadeddata', () => {
      debugLog('Video loaded successfully');
    });
    
    video.addEventListener('error', (e) => {
      debugLog('Video error:', e);
      showError('Failed to load video. Please check the URL or try again.');
    });
  }

  // Preserve all existing navbar functionality exactly as in your repo
  // Set initial menu state
  if (menuIcon) menuIcon.style.display = 'block';
  if (closeIcon) closeIcon.style.display = 'none';
  if (navbarLinks) navbarLinks.classList.remove('show');

  // Close menu on link click (preserving existing functionality)
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

  // JWT Authentication (preserving existing functionality)
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

  // Logout Functionality (preserving existing functionality)
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      updateAuthDisplay(false);
      alert('Logged out successfully!');
      window.location.href = '/index.html';
    });
  }

  // Menu Toggle Functionality (preserving existing functionality)
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

  // Video Controls Functions (preserving existing functionality)
  window.seek = (seconds) => {
    if (video && video.style.display !== 'none') {
      video.currentTime += seconds;
    }
  };

  window.playPause = () => {
    if (video && video.style.display !== 'none') {
      if (video.paused) video.play();
      else video.pause();
    }
  };

  window.setSpeed = (speed) => {
    if (video && video.style.display !== 'none') {
      video.playbackRate = parseFloat(speed);
    }
  };

  // Initialize with existing functionality
  fetchModuleDetails();
});