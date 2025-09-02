/*  client/js/module-lecture.js  –  FULL & FIXED  */
document.addEventListener('DOMContentLoaded', () => {
  /* ---------- URL params ---------- */
  const params     = new URLSearchParams(window.location.search);
  const courseId   = params.get('courseId');
  const chapterIdx = Number(params.get('chapterIndex'));
  const moduleIdx  = Number(params.get('moduleIndex'));

  if (!courseId || isNaN(chapterIdx) || isNaN(moduleIdx)) {
    document.body.innerHTML = '<h1>Invalid lecture parameters</h1>';
    return;
  }

  /* ---------- Regex helpers ---------- */
  const ytRegExp = /(?:youtube\.com\/.*(?:\?|&)v=|youtu\.be\/)([^&\n?#]+)/;
  const $id      = id => document.getElementById(id);

  /* ---------- Global YouTube player ---------- */
  let ytPlayer, ytReady = false;
  function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('ytPlayer', {
      height: '450',
      width:  '100%',
      events: {
        onReady: () => {
          ytReady = true;
          if (window.pendingYouTubeId) ytPlayer.loadVideoById(window.pendingYouTubeId);
        }
      }
    });
  }
  window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

  /* ---------- Auth helpers (copy from course-details.js) ---------- */
  const token = localStorage.getItem('token');
  function updateAuth(isAuth) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAuth ? 'block' : 'none');
    document.querySelectorAll('.admin-login').forEach(el => el.style.display = isAuth ? 'none' : 'block');
    document.querySelectorAll('.logout').forEach(el => el.style.display = isAuth ? 'block' : 'none');
  }
  if (token && window.jwt_decode) {
    try {
      const decoded = jwt_decode(token);
      if (decoded.exp * 1000 > Date.now()) updateAuth(true);
      else { localStorage.removeItem('token'); updateAuth(false); }
    } catch { localStorage.removeItem('token'); updateAuth(false); }
  } else updateAuth(false);

  /* ---------- Fetch course ---------- */
  async function fetchCourse() {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`https://free-programming-notes.onrender.com/api/courses/${courseId}`, { headers });
    if (!res.ok) throw new Error('Course not found');
    return res.json();
  }

  /* ---------- Render player ---------- */
  function renderPlayer(url) {
    const isYouTube = ytRegExp.test(url);
    const ytWrap   = $id('ytPlayerWrapper');
    const htmlWrap = $id('html5PlayerWrapper');

    if (isYouTube) {
      const vid = url.match(ytRegExp)[1];
      ytWrap.style.display   = 'block';
      htmlWrap.style.display = 'none';
      if (ytReady) { ytPlayer.loadVideoById(vid); }
      else { window.pendingYouTubeId = vid; }
    } else {
      ytWrap.style.display   = 'none';
      htmlWrap.style.display = 'block';
      const html5 = $id('html5Src');
      html5.src = url;
      $id('html5Player').load();
    }
  }

  /* ---------- Navigation ---------- */
  function buildURL(c, m) {
    return `module-lecture.html?courseId=${courseId}&chapterIndex=${c}&moduleIndex=${m}`;
  }

  function updateNavigation(course, ch, mod) {
    /* Back button */
    $id('backBtn').onclick = () => location.href = `course-details.html?id=${courseId}`;

    /* Prev / Next */
    const prevBtn = $id('prevBtn');
    const nextBtn = $id('nextBtn');

    const hasPrev = ch > 0 || mod > 0;
    const hasNext = ch < course.chapters.length - 1 ||
                    mod < course.chapters[ch].modules.length - 1;

    prevBtn.style.display = hasPrev ? 'inline-block' : 'none';
    nextBtn.style.display = hasNext ? 'inline-block' : 'none';

    if (hasPrev) {
      prevBtn.onclick = () => {
        if (mod > 0) location.href = buildURL(ch, mod - 1);
        else {
          const prevCh  = ch - 1;
          const lastMod = course.chapters[prevCh].modules.length - 1;
          location.href = buildURL(prevCh, lastMod);
        }
      };
    }

    if (hasNext) {
      nextBtn.onclick = () => {
        if (mod < course.chapters[ch].modules.length - 1) location.href = buildURL(ch, mod + 1);
        else location.href = buildURL(ch + 1, 0);
      };
    }
  }

  /* ---------- Download resources ---------- */
  function handleResources(url) {
    const dlBtn = $id('downloadBtn');
    if (url) {
      dlBtn.href        = url;
      dlBtn.style.display = 'inline-block';
    } else {
      dlBtn.style.display = 'none';
    }
  }

  /* ---------- Boot ---------- */
  (async () => {
    try {
      const course  = await fetchCourse();
      const chapter = course.chapters[chapterIdx];
      const module  = chapter?.modules[moduleIdx];
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
