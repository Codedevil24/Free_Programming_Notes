/*  client/js/module-lecture.js
    – Handles:
        • Fetching the exact module
        • YouTube vs generic video auto-switch
        • Back button to course-details.html
        • Next / Previous lecture navigation
        • Download-resources button visibility
*/
document.addEventListener('DOMContentLoaded', () => {
  /* ---------- 1. Grab URL params ---------- */
  const params     = new URLSearchParams(location.search);
  const courseId   = params.get('courseId');
  const chapterIdx = Number(params.get('chapterIndex'));
  const moduleIdx  = Number(params.get('moduleIndex'));

  if (!courseId || isNaN(chapterIdx) || isNaN(moduleIdx)) {
    document.body.innerHTML = '<h1>Invalid lecture parameters</h1>';
    return;
  }

  /* ---------- 2. Regex for YouTube ---------- */
  const ytRegExp = /(?:youtube\.com\/.*(?:\?|&)v=|youtu\.be\/)([^&\n?#]+)/;

  /* ---------- 3. Element shortcuts ---------- */
  const $id = id => document.getElementById(id);

  /* ---------- 4. Fetch course ---------- */
  async function fetchCourse() {
    const res = await fetch(`/api/courses/${courseId}`);
    if (!res.ok) throw new Error('Course not found');
    return res.json();
  }

  /* ---------- 5. YouTube IFrame API ---------- */
  let ytPlayer;
  function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('ytPlayer', {
      height: '450',
      width:  '100%',
      events: { onReady: () => ytPlayer.playVideo() }
    });
  }
  window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

  /* ---------- 6. Render the right player ---------- */
  function renderPlayer(url) {
    const isYouTube = ytRegExp.test(url);
    const ytWrapper   = $id('ytPlayerWrapper');
    const htmlWrapper = $id('html5PlayerWrapper');

    if (isYouTube) {
      const videoId = url.match(ytRegExp)[1];
      ytWrapper.style.display   = 'block';
      htmlWrapper.style.display = 'none';
      if (ytPlayer && ytPlayer.loadVideoById) {
        ytPlayer.loadVideoById(videoId);
      } else {
        // API not loaded yet – onYouTubeIframeAPIReady will handle it
        window.pendingYouTubeId = videoId;
      }
    } else {
      ytWrapper.style.display   = 'none';
      htmlWrapper.style.display = 'block';
      const html5 = $id('html5Src');
      html5.src = url;
      $id('html5Player').load();
    }
  }

  /* ---------- 7. Navigation helpers ---------- */
  function buildURL(c, m) {
    return `module-lecture.html?courseId=${courseId}&chapterIndex=${c}&moduleIndex=${m}`;
  }

  function updateNavigation(course, ch, mod) {
    // Back button → course-details.html
    $id('backBtn').onclick = () => {
      window.location.href = `course-details.html?id=${courseId}`;
    };

    // Previous / Next
    const prevBtn = $id('prevBtn');
    const nextBtn = $id('nextBtn');

    const hasPrev = ch > 0 || mod > 0;
    const hasNext = ch < course.chapters.length - 1 ||
                    mod < course.chapters[ch].modules.length - 1;

    prevBtn.style.display = hasPrev ? 'inline-block' : 'none';
    nextBtn.style.display = hasNext ? 'inline-block' : 'none';

    if (hasPrev) {
      prevBtn.onclick = () => {
        if (mod > 0) {
          location.href = buildURL(ch, mod - 1);
        } else {
          const prevCh   = ch - 1;
          const lastMod  = course.chapters[prevCh].modules.length - 1;
          location.href  = buildURL(prevCh, lastMod);
        }
      };
    }

    if (hasNext) {
      nextBtn.onclick = () => {
        if (mod < course.chapters[ch].modules.length - 1) {
          location.href = buildURL(ch, mod + 1);
        } else {
          location.href = buildURL(ch + 1, 0);
        }
      };
    }
  }

  /* ---------- 8. Download resources ---------- */
  function handleResources(url) {
    const dlBtn = $id('downloadBtn');
    if (url) {
      dlBtn.href        = url;
      dlBtn.style.display = 'inline-block';
    } else {
      dlBtn.style.display = 'none';
    }
  }

  /* ---------- 9. Boot ---------- */
  (async () => {
    try {
      const course   = await fetchCourse();
      const chapter  = course.chapters[chapterIdx];
      const module   = chapter.modules[moduleIdx];

      if (!module) throw new Error('Module not found');

      $id('moduleTitle').textContent = module.title;
      renderPlayer(module.videoUrl);
      handleResources(module.resources);
      updateNavigation(course, chapterIdx, moduleIdx);
    } catch (err) {
      document.body.innerHTML = `<h1>Error: ${err.message}</h1>`;
    }
  })();
});
