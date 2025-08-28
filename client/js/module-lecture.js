document.addEventListener('DOMContentLoaded', () => {
  // Video elements
  const video = document.getElementById('video-player');
  const moduleTitle = document.getElementById('module-title');
  const notes = document.getElementById('notes');
  const resources = document.getElementById('resources');
  
  if (!video) {
    console.error('Video element not found');
    return;
  }

  // Debug function
  function debugLog(message) {
    console.log('[Video Debug]', message);
  }

  // Show video error
  function showVideoError(message, technicalDetails = '') {
    debugLog(`Video Error: ${message} ${technicalDetails}`);
    
    const videoWrapper = document.querySelector('.video-wrapper');
    if (videoWrapper) {
      videoWrapper.innerHTML = `
        <div style="background: #f8d7da; color: #721c24; padding: 2rem; border-radius: 8px; text-align: center;">
          <h3>🎥 Video Loading Issue</h3>
          <p><strong>${message}</strong></p>
          ${technicalDetails ? `<p><small>${technicalDetails}</small></p>` : ''}
          <p style="margin-top: 1rem;">URL: <code id="video-url-display" style="word-break: break-all; font-size: 0.8rem;"></code></p>
          <div style="margin-top: 1rem;">
            <button onclick="window.location.reload()" style="margin: 0.5rem; padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button>
            <button onclick="goBack()" style="margin: 0.5rem; padding: 0.5rem 1rem; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Go Back</button>
          </div>
        </div>
      `;
    }
  }

  // Load video with retry and better error handling
  async function loadVideo(videoUrl) {
    debugLog(`Attempting to load video: ${videoUrl}`);
    
    if (!videoUrl) {
      showVideoError('No video URL provided', 'The module does not have a video URL set');
      return;
    }

    // Check if URL is valid
    try {
      new URL(videoUrl);
    } catch (e) {
      showVideoError('Invalid video URL format', videoUrl);
      document.getElementById('video-url-display').textContent = videoUrl;
      return;
    }

    // Clear any existing sources
    video.innerHTML = '';
    
    // Create source element
    const source = document.createElement('source');
    source.src = videoUrl;
    source.type = 'video/mp4';
    
    debugLog('Created source element:', { src: source.src, type: source.type });
    
    video.appendChild(source);
    
    // Enhanced error handling
    video.addEventListener('error', (e) => {
      debugLog('Video error event:', e);
      
      let errorMessage = 'Video failed to load';
      let technicalDetails = '';
      
      if (video.error) {
        switch(video.error.code) {
          case video.error.MEDIA_ERR_ABORTED:
            errorMessage = 'Video loading was cancelled';
            technicalDetails = 'MEDIA_ERR_ABORTED';
            break;
          case video.error.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error while loading video';
            technicalDetails = 'MEDIA_ERR_NETWORK - Check your internet connection';
            break;
          case video.error.MEDIA_ERR_DECODE:
            errorMessage = 'Video format not supported';
            technicalDetails = 'MEDIA_ERR_DECODE - The video format may not be supported by your browser';
            break;
          case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Video source not supported';
            technicalDetails = 'MEDIA_ERR_SRC_NOT_SUPPORTED - The video URL may be invalid or inaccessible';
            break;
          default:
            errorMessage = 'Unknown video error';
            technicalDetails = `Error code: ${video.error.code}`;
        }
      }
      
      showVideoError(errorMessage, `${technicalDetails}\nURL: ${videoUrl}`);
    });

    video.addEventListener('stalled', () => {
      debugLog('Video stalled - network issues');
      showVideoError('Video loading stalled', 'Check your internet connection');
    });

    video.addEventListener('abort', () => {
      debugLog('Video loading aborted');
      showVideoError('Video loading was aborted', 'The request was cancelled');
    });

    video.addEventListener('loadstart', () => {
      debugLog('Video load started');
    });

    video.addEventListener('loadedmetadata', () => {
      debugLog('Video metadata loaded:', { duration: video.duration });
      if (durationDisplay) durationDisplay.textContent = formatTime(video.duration);
    });

    video.addEventListener('loadeddata', () => {
      debugLog('Video data loaded');
    });

    video.addEventListener('canplay', () => {
      debugLog('Video can play');
    });

    video.addEventListener('canplaythrough', () => {
      debugLog('Video can play through');
    });

    // Try to load the video
    try {
      video.load();
      debugLog('Video load() called successfully');
    } catch (e) {
      debugLog('Error calling video.load():', e);
      showVideoError('Failed to load video', e.message);
    }

    // Add URL to display
    const urlDisplay = document.getElementById('video-url-display');
    if (urlDisplay) urlDisplay.textContent = videoUrl;
  }

  function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // Set up controls
  const playPauseBtn = document.getElementById('play-pause-btn');
  const rewindBtn = document.getElementById('rewind-btn');
  const forwardBtn = document.getElementById('fast-forward-btn');
  const speedControl = document.getElementById('speed-control');
  const progressBar = document.getElementById('progress-bar');
  const progressFilled = document.getElementById('progress-filled');
  const currentTimeDisplay = document.getElementById('current-time');
  const durationDisplay = document.getElementById('duration');
  const fullscreenBtn = document.getElementById('fullscreen-btn');

  if (video) {
    video.addEventListener('timeupdate', () => {
      if (video.duration) {
        const percent = (video.currentTime / video.duration) * 100;
        if (progressFilled) progressFilled.style.width = `${percent}%`;
        if (currentTimeDisplay) currentTimeDisplay.textContent = formatTime(video.currentTime);
      }
    });

    video.addEventListener('ended', () => {
      if (playPauseBtn) playPauseBtn.textContent = '▶️';
    });
  }

  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', () => {
      if (video.paused) {
        video.play().then(() => {
          playPauseBtn.textContent = '⏸️';
        }).catch(err => {
          console.error('Play failed:', err);
          showVideoError('Failed to play video', err.message);
        });
      } else {
        video.pause();
        playPauseBtn.textContent = '▶️';
      }
    });
  }

  if (rewindBtn) {
    rewindBtn.addEventListener('click', () => {
      video.currentTime = Math.max(0, video.currentTime - 10);
    });
  }

  if (forwardBtn) {
    forwardBtn.addEventListener('click', () => {
      if (video.duration) {
        video.currentTime = Math.min(video.duration, video.currentTime + 10);
      }
    });
  }

  if (speedControl) {
    speedControl.addEventListener('change', () => {
      video.playbackRate = parseFloat(speedControl.value);
    });
  }

  if (progressBar) {
    let isDragging = false;
    
    progressBar.addEventListener('click', (e) => {
      if (!video.duration) return;
      
      const rect = progressBar.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      video.currentTime = pos * video.duration;
    });

    progressBar.addEventListener('mousedown', () => isDragging = true);
    document.addEventListener('mouseup', () => isDragging = false);
    document.addEventListener('mousemove', (e) => {
      if (isDragging && video.duration) {
        const rect = progressBar.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        video.currentTime = pos * video.duration;
      }
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

  // Fetch Module Details
  async function fetchModuleDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId');
    const chapterIndex = parseInt(urlParams.get('chapterIndex'));
    const moduleIndex = parseInt(urlParams.get('moduleIndex'));
    
    debugLog(`Fetching module: course=${courseId}, chapter=${chapterIndex}, module=${moduleIndex}`);
    
    if (!courseId || isNaN(chapterIndex) || isNaN(moduleIndex)) {
      showVideoError('Invalid URL parameters', 'Please check the URL and try again');
      return;
    }

    try {
      const headers = {};
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      debugLog('Fetching course data...');
      const response = await fetch(`https://free-programming-notes.onrender.com/api/courses/${courseId}`, { headers });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const course = await response.json();
      debugLog('Course data received:', course);
      
      const module = course.chapters?.[chapterIndex]?.modules?.[moduleIndex];

      if (!module) {
        debugLog('Module not found in data structure');
        showVideoError('Module not found', 'The requested module could not be found in the course data');
        return;
      }

      debugLog('Module data:', module);
      
      // Update module details
      document.title = `${module.title || 'Module'} - Code Devil`;
      
      if (moduleTitle) moduleTitle.textContent = module.title || 'Untitled Module';
      
      const notesElement = document.getElementById('notes');
      if (notesElement) {
        notesElement.textContent = module.notes || 'No notes available for this module.';
      }
      
      const resourcesLink = document.getElementById('resources');
      if (resourcesLink) {
        if (module.resources) {
          resourcesLink.href = module.resources;
          resourcesLink.style.display = 'inline-block';
          resourcesLink.textContent = 'Download Resources';
        } else {
          resourcesLink.style.display = 'none';
        }
      }

      // Handle video
      if (module.videoUrl) {
        debugLog('Loading video from URL:', module.videoUrl);
        loadVideo(module.videoUrl);
      } else {
        debugLog('No video URL provided');
        showVideoError('No video available', 'This module does not have a video lecture');
      }

    } catch (err) {
      debugLog('Error fetching module:', err);
      showVideoError('Failed to load module', `${err.message}\n\nThis could be due to:\n• Network connectivity issues\n• Invalid course URL\n• Server problems`);
    }
  }

  // Initialize
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