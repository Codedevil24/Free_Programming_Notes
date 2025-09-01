document.addEventListener('DOMContentLoaded', () => {
  // === PRESERVED EXISTING VARIABLES ===
  const navbarLinks = document.getElementById('navbar-links');
  const menuIcon = document.getElementById('menu-icon');
  const closeIcon = document.getElementById('close-icon');
  const logoutLink = document.getElementById('logout-link');
  const moduleTitle = document.getElementById('module-title');
  const notes = document.getElementById('notes');
  const resources = document.getElementById('resources');
  const noResources = document.getElementById('no-resources');

  // === NEW NAVIGATION VARIABLES ===
  const videoElement = document.getElementById('video-player');
  const youtubeContainer = document.getElementById('youtube-container');
  const videoLoading = document.getElementById('video-loading');
  const videoError = document.getElementById('video-error');
  const customControls = document.getElementById('custom-controls');
  const prevBtn = document.getElementById('prev-module');
  const nextBtn = document.getElementById('next-module');
  const resourcesBtn = document.getElementById('resources-btn');

  // === STATE MANAGEMENT ===
  let plyrPlayer = null;
  let currentCourse = null;
  let currentChapterIndex = 0;
  let currentModuleIndex = 0;

  // === MOCK DATA (Fallback) ===
  const mockCourseData = {
    _id: "demo-course-123",
    title: "Demo Web Development Course",
    chapters: [
      {
        title: "Frontend Basics",
        modules: [
          {
            title: "HTML Crash Course",
            videoUrl: "https://www.youtube.com/watch?v=qz0aGYrrlhU",
            notes: "Learn HTML5 semantic tags and document structure",
            resources: "https://example.com/html-guide.pdf"
          },
          {
            title: "CSS Flexbox Tutorial",
            videoUrl: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
            notes: "Master CSS Flexbox for responsive layouts",
            resources: null
          }
        ]
      },
      {
        title: "JavaScript Fundamentals",
        modules: [
          {
            title: "JavaScript Basics",
            videoUrl: "https://www.youtube.com/watch?v=W6NZfCO5SIk",
            notes: "Core JavaScript concepts for beginners",
            resources: "https://example.com/js-cheatsheet.pdf"
          }
        ]
      }
    ]
  };

  // === UTILITY FUNCTIONS (Preserved) ===
  function showElement(element, hideOthers = []) {
    if (element) element.style.display = 'block';
    hideOthers.forEach(el => { if (el) el.style.display = 'none'; });
  }
  function hideElement(element) { if (element) element.style.display = 'none'; }

  // === YOUTUBE DETECTION (Preserved) ===
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

  // === VIDEO LOADING (Enhanced) ===
  function loadYouTubePlayer(videoId) {
    console.log('Loading YouTube player:', videoId);
    hideElement(videoLoading);
    showElement(youtubeContainer, [videoElement.parentElement, customControls, videoError]);

    if (window.YT && window.YT.Player) createPlayer(videoId);
    else window.onYouTubeIframeAPIReady = () => createPlayer(videoId);

    function createPlayer(id) {
      new YT.Player('player', {
        height: '400',
        width: '100%',
        videoId: id,
        playerVars: { 
          rel: 0, 
          modestbranding: 1, 
          showinfo: 0,
          origin: window.location.origin 
        },
        events: {
          onReady: e => console.log('YT ready', e),
          onError: e => showVideoError('YouTube Error', e.data)
        }
      });
    }
  }

  function loadDRMPPlayer(videoUrl) {
    console.log('Loading DRM player', videoUrl);
    hideElement(videoLoading);
    showElement(videoElement.parentElement, [youtubeContainer, videoError]);
    showElement(customControls, [youtubeContainer]);

    videoElement.src = videoUrl;
    if (plyrPlayer) plyrPlayer.destroy();
    plyrPlayer = new Plyr(videoElement, {
      controls: [
        'play-large', 'restart', 'rewind', 'play', 'fast-forward',
        'progress', 'current-time', 'duration', 'mute', 'volume',
        'captions', 'settings', 'pip', 'airplay', 'fullscreen'
      ],
      settings: ['captions', 'quality', 'speed', 'loop'],
      ratio: '16:9',
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] }
    });
    setupCustomControls();
  }

  function setupCustomControls() {
    if (!plyrPlayer) return;
    const playPauseBtn = document.getElementById('play-pause-btn');
    const rewindBtn = document.getElementById('rewind-btn');
    const forwardBtn = document.getElementById('fast-forward-btn');
    const speedControl = document.getElementById('speed-control');
    const fullscreenBtn = document.getElementById('fullscreen-btn');

    playPauseBtn?.addEventListener('click', () => plyrPlayer.togglePlay());
    rewindBtn?.addEventListener('click', () => plyrPlayer.rewind(10));
    forwardBtn?.addEventListener('click', () => plyrPlayer.forward(10));
    speedControl?.addEventListener('change', (e) => { plyrPlayer.speed = parseFloat(e.target.value); });
    fullscreenBtn?.addEventListener('click', () => plyrPlayer.fullscreen.toggle());
  }

  function showVideoError(title, message) {
    hideElement(videoLoading);
    hideElement(youtubeContainer);
    hideElement(videoElement.parentElement);
    showElement(videoError);
    document.getElementById('error-message').textContent = message;
  }

  // === NAVIGATION LOGIC (NEW) ===
  function updateNavigationButtons() {
    if (!currentCourse) return;
    const chapters = currentCourse.chapters;
    const hasPrev = currentModuleIndex > 0 || currentChapterIndex > 0;
    const hasNext = 
      currentModuleIndex < chapters[currentChapterIndex].modules.length - 1 ||
      currentChapterIndex < chapters.length - 1;

    prevBtn.disabled = !hasPrev;
    nextBtn.disabled = !hasNext;
  }

  function navigateModule(direction) {
    if (!currentCourse) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId') || 'demo-course-123';
    
    let newChapterIndex = currentChapterIndex;
    let newModuleIndex = currentModuleIndex;

    if (direction === 'next') {
      if (currentModuleIndex < currentCourse.chapters[currentChapterIndex].modules.length - 1) {
        newModuleIndex++;
      } else if (currentChapterIndex < currentCourse.chapters.length - 1) {
        newChapterIndex++;
        newModuleIndex = 0;
      }
    } else {
      if (currentModuleIndex > 0) {
        newModuleIndex--;
      } else if (currentChapterIndex > 0) {
        newChapterIndex--;
        newModuleIndex = currentCourse.chapters[newChapterIndex].modules.length - 1;
      }
    }

    const newUrl = `module-lecture.html?courseId=${courseId}&chapterIndex=${newChapterIndex}&moduleIndex=${newModuleIndex}`;
    window.location.href = newUrl;
  }

  // === DATA FETCHING (Enhanced with fallback) ===
  async function fetchModuleDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId') || 'demo-course-123';
    currentChapterIndex = parseInt(urlParams.get('chapterIndex')) || 0;
    currentModuleIndex = parseInt(urlParams.get('moduleIndex')) || 0;

    try {
      const headers = {};
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`/api/courses/${courseId}`, { headers });
      
      if (response.ok) {
        currentCourse = await response.json();
      } else {
        console.warn('Server error, using mock data:', response.status);
        currentCourse = mockCourseData;
      }
    } catch (error) {
      console.warn('Network error, using mock data:', error);
      currentCourse = mockCourseData;
    }

    // Validate and load module
    const chapter = currentCourse.chapters[currentChapterIndex];
    const module = chapter?.modules[currentModuleIndex];
    
    if (!module) {
      currentChapterIndex = 0;
      currentModuleIndex = 0;
    }

    const validModule = currentCourse.chapters[currentChapterIndex].modules[currentModuleIndex];
    
    // Update UI
    moduleTitle.textContent = validModule.title || 'Untitled Module';
    notes.textContent = validModule.notes || 'No notes available for this module.';

    // Handle resources
    if (validModule.resources) {
      resourcesBtn.style.display = 'inline-block';
      resourcesBtn.onclick = () => window.open(validModule.resources, '_blank');
      if (noResources) noResources.style.display = 'none';
    } else {
      resourcesBtn.style.display = 'none';
      if (noResources) noResources.style.display = 'block';
    }

    // Load video
    if (validModule.videoUrl) {
      hideElement(videoLoading);
      if (isYouTubeUrl(validModule.videoUrl)) {
        const videoId = extractYouTubeId(validModule.videoUrl);
        if (videoId) loadYouTubePlayer(videoId);
      } else {
        loadDRMPPlayer(validModule.videoUrl);
      }
    } else {
      showVideoError('No Video Available', 'This module does not have a video lecture');
    }

    updateNavigationButtons();
  }

  // === PRESERVED NAVBAR & JWT CODE ===
  if (menuIcon) menuIcon.style.display = 'block';
  if (closeIcon) closeIcon.style.display = 'none';
  if (navbarLinks) navbarLinks.classList.remove('show');

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

  // JWT Authentication (Preserved)
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

  // Logout functionality (Preserved)
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      updateAuthDisplay(false);
      alert('Logged out successfully!');
      window.location.href = '/index.html';
    });
  }

  // Menu toggle (Preserved)
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

  // Navigation event listeners
  prevBtn.addEventListener('click', () => navigateModule('prev'));
  nextBtn.addEventListener('click', () => navigateModule('next'));

  // Initialize everything
  fetchModuleDetails();
});
