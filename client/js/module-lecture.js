document.addEventListener('DOMContentLoaded', () => {
  // Preserve all existing variables and functionality
  const navbarLinks = document.getElementById('navbar-links');
  const menuIcon = document.getElementById('menu-icon');
  const closeIcon = document.getElementById('close-icon');
  const logoutLink = document.getElementById('logout-link');
  const moduleTitle = document.getElementById('module-title');
  const notes = document.getElementById('notes');
  const resources = document.getElementById('resources');
  const noResources = document.getElementById('no-resources');

  // New elements for smart switching
  const videoElement = document.getElementById('drm-player');
  const youtubePlayer = document.getElementById('youtube-player');
  const youtubeIframe = document.getElementById('youtube-iframe');
  const videoLoading = document.getElementById('video-loading');
  const videoError = document.getElementById('video-error');
  const customControls = document.getElementById('custom-controls');

  // Initialize Plyr for DRM player
  let plyrPlayer = null;

  // Debug logging
  function debugLog(message, data = '') {
    console.log('[Smart Player]', message, data);
  }

  // Show/hide elements with existing functionality preserved
  function showElement(element, hideOthers = []) {
    if (element) element.style.display = 'block';
    hideOthers.forEach(el => {
      if (el) el.style.display = 'none';
    });
  }

  function hideElement(element) {
    if (element) element.style.display = 'none';
  }

  // YouTube detection functions (preserving existing functionality)
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

  // Load YouTube player (preserving existing functionality)
  function loadYouTubePlayer(videoId) {
    debugLog('Loading YouTube player:', videoId);
    
    hideElement(videoLoading);
    showElement(youtubePlayer, [videoElement, customControls, videoError]);
    
    youtubeIframe.src = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0`;
    
    // Hide custom controls for YouTube
    hideElement(customControls);
  }

  // Load DRM player with enhanced features
  function loadDRMPPlayer(videoUrl) {
    debugLog('Loading DRM player:', videoUrl);
    
    hideElement(videoLoading);
    showElement(document.getElementById('drm-player-container'), [youtubePlayer, videoError]);
    showElement(customControls, [youtubePlayer]);
    
    // Set video source
    videoElement.innerHTML = `<source src="${videoUrl}" type="video/mp4">`;
    
    // Initialize Plyr for enhanced features
    if (plyrPlayer) plyrPlayer.destroy();
    
    plyrPlayer = new Plyr(videoElement, {
      controls: [
        'play-large',
        'restart',
        'rewind',
        'play',
        'fast-forward',
        'progress',
        'current-time',
        'duration',
        'mute',
        'volume',
        'captions',
        'settings',
        'pip',
        'airplay',
        'fullscreen'
      ],
      settings: ['captions', 'quality', 'speed', 'loop'],
      ratio: '16:9',
      speed: {
        selected: 1,
        options: [0.5, 0.75, 1, 1.25, 1.5, 2]
      },
      keyboard: { focused: true, global: true }
    });

    // Setup custom controls for backward compatibility
    setupCustomControls();
  }

  // Setup custom controls (preserving existing functionality)
  function setupCustomControls() {
    const playPauseBtn = document.getElementById('play-pause-btn');
    const rewindBtn = document.getElementById('rewind-btn');
    const forwardBtn = document.getElementById('fast-forward-btn');
    const speedControl = document.getElementById('speed-control');
    const fullscreenBtn = document.getElementById('fullscreen-btn');

    if (plyrPlayer) {
      // Use Plyr's built-in controls
      playPauseBtn?.addEventListener('click', () => {
        if (plyrPlayer.playing) plyrPlayer.pause();
        else plyrPlayer.play();
      });

      rewindBtn?.addEventListener('click', () => {
        plyrPlayer.rewind(10);
      });

      forwardBtn?.addEventListener('click', () => {
        plyrPlayer.forward(10);
      });

      speedControl?.addEventListener('change', (e) => {
        plyrPlayer.speed = parseFloat(e.target.value);
      });

      fullscreenBtn?.addEventListener('click', () => {
        plyrPlayer.fullscreen.toggle();
      });
    }
  }

  // Show error (preserving existing functionality)
  function showVideoError(title, message) {
    hideElement(videoLoading);
    hideElement(youtubePlayer);
    hideElement(document.getElementById('drm-player-container'));
    showElement(videoError);
    
    document.getElementById('error-message').textContent = message;
  }

  // Load module details (preserving all existing functionality)
  async function fetchModuleDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId');
    const chapterIndex = parseInt(urlParams.get('chapterIndex'));
    const moduleIndex = parseInt(urlParams.get('moduleIndex'));

    if (!courseId || isNaN(chapterIndex) || isNaN(moduleIndex)) {
      showVideoError('Invalid URL parameters', 'Please check the URL and try again');
      return;
    }

    try {
      const headers = {};
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const response = await fetch(`https://free-programming-notes.onrender.com/api/courses/${courseId}`, { headers });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const course = await response.json();
      const module = course.chapters[chapterIndex]?.modules[moduleIndex];

      if (!module) {
        showVideoError('Module not found', 'The requested module could not be found');
        return;
      }

      // Update page content (preserving existing functionality)
      if (moduleTitle) moduleTitle.textContent = module.title || 'Untitled Module';
      if (notes) notes.textContent = module.notes || 'No notes available for this module.';

      // Handle resources (preserving existing functionality)
      if (module.resources) {
        if (resources) {
          resources.href = module.resources;
          resources.textContent = 'Download Resources';
          resources.style.display = 'inline-block';
        }
        if (noResources) noResources.style.display = 'none';
      } else {
        if (resources) resources.style.display = 'none';
        if (noResources) noResources.style.display = 'block';
      }

      // Smart video loading
      if (module.videoUrl) {
        hideElement(videoLoading);
        
        if (isYouTubeUrl(module.videoUrl)) {
          const videoId = extractYouTubeId(module.videoUrl);
          if (videoId) {
            loadYouTubePlayer(videoId);
          } else {
            loadDRMPPlayer(module.videoUrl);
          }
        } else {
          loadDRMPPlayer(module.videoUrl);
        }
      } else {
        showVideoError('No Video Available', 'This module does not have a video lecture');
      }

    } catch (err) {
      console.error('Error fetching module details:', err);
      showVideoError('Loading Error', err.message);
    }
  }

  // Preserve all existing navbar and JWT functionality
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

  // Back button functionality (preserving existing)
  window.goBack = function() {
    window.history.back();
  };

  // Initialize
  fetchModuleDetails();
});