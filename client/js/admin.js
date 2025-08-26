let chapterCount = 0;

function addChapter() {
  chapterCount++;
  const chapterDiv = document.createElement("div");
  chapterDiv.classList.add("chapter");

  chapterDiv.innerHTML = `
    <h3>Chapter ${chapterCount} 
      <button type="button" class="remove-btn" onclick="this.parentElement.parentElement.remove()">❌ Remove</button>
    </h3>
    <input type="text" placeholder="Chapter Title" class="chapterTitle" required />
    <div class="modules-container"></div>
    <button type="button" onclick="addModule(this)">+ Add Module</button>
  `;

  document.getElementById("chaptersContainer").appendChild(chapterDiv);
}

function addModule(button) {
  const moduleDiv = document.createElement("div");
  moduleDiv.classList.add("module");

  moduleDiv.innerHTML = `
    <button type="button" class="remove-btn" onclick="this.parentElement.remove()">❌ Remove</button>
    <input type="text" placeholder="Module Title" class="moduleTitle" required />
    
    <label>Content Type:</label>
    <select class="moduleType" onchange="toggleModuleFields(this)">
      <option value="link">Link</option>
      <option value="file">File Upload</option>
    </select>
    
    <div class="file-fields">
      <input type="text" placeholder="Thumbnail URL" class="moduleThumbnail" />
      <input type="text" placeholder="Video URL" class="moduleVideo" />
      <input type="text" placeholder="Resources Link" class="moduleResources" />
      <textarea placeholder="Notes" class="moduleNotes"></textarea>
    </div>
    
    <div class="file-upload-fields hidden">
      <input type="file" class="thumbnailFile" accept="image/*" placeholder="Upload Thumbnail" />
      <input type="file" class="videoFile" accept="video/*" placeholder="Upload Video" />
      <input type="file" class="resourcesFile" accept=".pdf,.doc,.docx,.zip" placeholder="Upload Resources" />
      <textarea placeholder="Notes" class="moduleNotesFile"></textarea>
    </div>
  `;

  button.previousElementSibling.appendChild(moduleDiv);
}

function toggleModuleFields(select) {
  const module = select.closest('.module');
  const fileFields = module.querySelector('.file-fields');
  const uploadFields = module.querySelector('.file-upload-fields');
  
  if (select.value === 'file') {
    fileFields.classList.add('hidden');
    uploadFields.classList.remove('hidden');
  } else {
    fileFields.classList.remove('hidden');
    uploadFields.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const uploadSection = document.getElementById('upload-section');
  const uploadType = document.getElementById('upload-type');
  const notesForm = document.getElementById('book-form');
  const courseForm = document.getElementById('course-form');
  const bookListSection = document.getElementById('book-list-section');
  const bookList = document.getElementById('book-list');
  const courseListSection = document.getElementById('course-list-section');
  const courseList = document.getElementById('course-list');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const navbarLinks = document.getElementById('navbar-links');
  const menuIcon = document.getElementById('menu-icon');
  const closeIcon = document.getElementById('close-icon');
  const logoutLink = document.getElementById('logout');
  const message = document.getElementById('message');
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
        if (uploadSection) uploadSection.style.display = 'none';
        if (bookListSection) bookListSection.style.display = 'none';
        if (courseListSection) courseListSection.style.display = 'none';
        if (message) message.textContent = 'Session expired. Please log in again.';
      } else {
        updateAuthDisplay(true);
        if (uploadSection) uploadSection.style.display = 'block';
        fetchBooks();
        fetchCourses();
      }
    } catch (err) {
      console.error('Token validation error:', err);
      localStorage.removeItem('token');
      updateAuthDisplay(false);
      if (uploadSection) uploadSection.style.display = 'none';
      if (bookListSection) bookListSection.style.display = 'none';
      if (courseListSection) courseListSection.style.display = 'none';
      if (message) message.textContent = 'Invalid session. Please log in again.';
    }
  } else {
    updateAuthDisplay(false);
    if (uploadSection) uploadSection.style.display = 'none';
    if (bookListSection) bookListSection.style.display = 'none';
    if (courseListSection) courseListSection.style.display = 'none';
  }

  function updateAuthDisplay(isAuthenticated) {
    const adminOnly = document.querySelector('.admin-only');
    const adminLogin = document.querySelector('.admin-login');
    const logout = document.querySelector('.logout');
    if (adminOnly && adminLogin && logout) {
      adminOnly.style.display = isAuthenticated ? 'block' : 'none';
      adminLogin.style.display = isAuthenticated ? 'none' : 'block';
      logout.style.display = isAuthenticated ? 'block' : 'none';
    }
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

  // Logout Functionality
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      updateAuthDisplay(false);
      if (uploadSection) uploadSection.style.display = 'none';
      if (bookListSection) bookListSection.style.display = 'none';
      if (courseListSection) courseListSection.style.display = 'none';
      if (message) message.textContent = 'Logged out successfully.';
      setTimeout(() => { if (message) message.textContent = ''; }, 3000);
      window.location.href = '/index.html';
    });
  }

  // Login Functionality
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      try {
        const response = await fetch('https://free-programming-notes.onrender.com/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok) {
          localStorage.setItem('token', data.token);
          updateAuthDisplay(true);
          if (uploadSection) uploadSection.style.display = 'block';
          if (loginForm) loginForm.style.display = 'none';
          if (message) message.textContent = 'Login successful!';
          setTimeout(() => { if (message) message.textContent = ''; }, 3000);
          fetchBooks();
          fetchCourses();
        } else {
          if (message) message.textContent = data.message || 'Login failed.';
          setTimeout(() => { if (message) message.textContent = ''; }, 3000);
        }
      } catch (err) {
        console.error('Login error:', err);
        if (message) message.textContent = 'Error during login. Try again.';
        setTimeout(() => { if (message) message.textContent = ''; }, 3000);
      }
    });
  }

  // Toggle between notes and courses
  if (uploadType) {
    uploadType.addEventListener('change', (e) => {
      if (e.target.value === 'notes') {
        if (notesForm) notesForm.style.display = 'block';
        if (courseForm) courseForm.style.display = 'none';
        if (bookListSection) bookListSection.style.display = 'block';
        if (courseListSection) courseListSection.style.display = 'none';
        fetchBooks();
      } else {
        if (notesForm) notesForm.style.display = 'none';
        if (courseForm) courseForm.style.display = 'block';
        if (bookListSection) bookListSection.style.display = 'none';
        if (courseListSection) courseListSection.style.display = 'block';
        fetchCourses();
      }
    });
  }

  // Course Form Submit Handler - ENHANCED WITH FILE UPLOAD
  const courseFormElement = document.getElementById("courseForm");
  if (courseFormElement) {
    courseFormElement.addEventListener("submit", async function (e) {
      e.preventDefault();

      const formData = new FormData();
      formData.append('title', this.title.value);
      formData.append('description', this.description.value);
      formData.append('thumbnail', this.thumbnail.value);

      const chapters = [];
      let fileIndex = 0;

      document.querySelectorAll(".chapter").forEach(chap => {
        const chapter = {
          title: chap.querySelector(".chapterTitle").value,
          modules: [],
        };

        chap.querySelectorAll(".module").forEach(mod => {
          const moduleType = mod.querySelector(".moduleType").value;
          const moduleData = {
            title: mod.querySelector(".moduleTitle").value,
            type: moduleType,
          };

          if (moduleType === 'link') {
            moduleData.thumbnail = mod.querySelector(".moduleThumbnail").value;
            moduleData.videoUrl = mod.querySelector(".moduleVideo").value;
            moduleData.resources = mod.querySelector(".moduleResources").value;
            moduleData.notes = mod.querySelector(".moduleNotes").value;
          } else if (moduleType === 'file') {
            const thumbnailFile = mod.querySelector(".thumbnailFile").files[0];
            const videoFile = mod.querySelector(".videoFile").files[0];
            const resourcesFile = mod.querySelector(".resourcesFile").files[0];
            
            if (thumbnailFile) {
              const thumbnailFileName = `thumbnail_${fileIndex}_${thumbnailFile.name}`;
              formData.append(thumbnailFileName, thumbnailFile);
              moduleData.thumbnailFile = thumbnailFileName;
            }
            if (videoFile) {
              const videoFileName = `video_${fileIndex}_${videoFile.name}`;
              formData.append(videoFileName, videoFile);
              moduleData.videoFile = videoFileName;
            }
            if (resourcesFile) {
              const resourcesFileName = `resources_${fileIndex}_${resourcesFile.name}`;
              formData.append(resourcesFileName, resourcesFile);
              moduleData.resourcesFile = resourcesFileName;
            }
            
            moduleData.notes = mod.querySelector(".moduleNotesFile").value;
            fileIndex++;
          }

          chapter.modules.push(moduleData);
        });

        chapters.push(chapter);
      });

      formData.append('chapters', JSON.stringify(chapters));

      try {
        const res = await fetch("/admin/add-course", {
          method: "POST",
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData,
        });

        const result = await res.json();
        alert(result.message);
        if (res.ok) {
          this.reset();
          document.getElementById("chaptersContainer").innerHTML = "";
          chapterCount = 0;
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error creating course');
      }
    });
  }

  // Fetch and Display Books
  async function fetchBooks() {
    if (!bookListSection || !bookList) return;
    try {
      const response = await fetch('https://free-programming-notes.onrender.com/api/books', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch books: ' + response.statusText);
      const books = await response.json();
      console.log('Books fetched:', books);
      bookList.innerHTML = books.map(book => `
        <div class="book-item">
          <img src="${book.imageUrl}" alt="${book.title}" style="width: 100px; height: auto;">
          <h3>${book.title}</h3>
          <p>${book.description}</p>
          <button onclick="editBook('${book._id}', '${book.title}', '${book.description}', '${book.category}')">Edit</button>
          <button onclick="deleteBook('${book._id}')">Delete</button>
        </div>
      `).join('');
    } catch (err) {
      console.error('Error fetching books:', err);
      bookList.innerHTML = 'Error loading books: ' + err.message + '<br>';
    }
  }

  // Fetch and Display Courses
  async function fetchCourses() {
    if (!courseListSection || !courseList) return;
    try {
      const response = await fetch('https://free-programming-notes.onrender.com/api/courses', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch courses: ' + response.statusText);
      const courses = await response.json();
      courseList.innerHTML = courses.map(course => `
        <div class="course-item">
          <img src="${course.thumbnail}" alt="${course.title}" style="width: 100px; height: auto;">
          <h3>${course.title}</h3>
          <p>${course.description}</p>
          <p><strong>Chapters:</strong> ${course.chapters ? course.chapters.length : 0}</p>
          <button onclick="editCourse('${course._id}', '${course.title}', '${course.description}')">Edit</button>
          <button onclick="deleteCourse('${course._id}')">Delete</button>
        </div>
      `).join('');
    } catch (err) {
      console.error('Error fetching courses:', err);
      courseList.innerHTML = 'Error loading courses: ' + err.message + '<br>';
    }
  }

  // Book-related functions (existing functionality preserved)
  const notesFormElement = document.getElementById('notes-form');
  if (notesFormElement) {
    notesFormElement.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(notesFormElement);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://free-programming-notes.onrender.com/api/books', true);
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);

      const progressContainer = document.querySelector('.progress-container');
      if (progressContainer) progressContainer.style.display = 'block';
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          if (progressBar) progressBar.style.width = `${percentComplete}%`;
          if (progressText) progressText.textContent = `${percentComplete}%`;
        }
      };

      xhr.onload = () => {
        if (progressContainer) progressContainer.style.display = 'none';
        if (xhr.status === 201) {
          fetchBooks();
          alert('Book added successfully!');
          notesFormElement.reset();
        } else {
          const data = JSON.parse(xhr.responseText);
          alert(data.message || 'Failed to add book');
        }
      };

      xhr.onerror = () => {
        if (progressContainer) progressContainer.style.display = 'none';
        alert('Error adding book');
      };

      xhr.send(formData);
    });
  }

  // Edit Book
  window.editBook = async (id, title, description, category) => {
    const editForm = document.createElement('form');
    editForm.id = 'edit-book-form';
    editForm.innerHTML = `
      <h3>Edit Book</h3>
      <input type="text" id="edit-title" value="${title}" required>
      <textarea id="edit-description" required>${description}</textarea>
      <select id="edit-category" required>
        <option value="${category}">${category}</option>
        <option value="Programming">Programming</option>
        <option value="Algorithms">Algorithms</option>
        <option value="Data Science">Data Science</option>
        <option value="Web Development">Web Development</option>
      </select>
      <input type="file" id="edit-image" accept="image/*">
      <input type="file" id="edit-pdf" accept=".pdf">
      <button type="submit">Update Book</button>
      <button type="button" id="cancel-edit">Cancel</button>
    `;
    if (bookListSection) bookListSection.appendChild(editForm);
    if (notesForm) notesForm.style.display = 'none';

    document.getElementById('cancel-edit').addEventListener('click', () => {
      if (editForm) editForm.remove();
      if (notesForm) notesForm.style.display = 'block';
    });

    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append('title', document.getElementById('edit-title').value);
      formData.append('description', document.getElementById('edit-description').value);
      formData.append('category', document.getElementById('edit-category').value);
      const image = document.getElementById('edit-image').files[0];
      const pdf = document.getElementById('edit-pdf').files[0];
      if (image) formData.append('image', image);
      if (pdf) formData.append('pdf', pdf);

      try {
        const response = await fetch(`https://free-programming-notes.onrender.com/api/books/${id}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        if (!response.ok) throw new Error('Failed to update book: ' + response.statusText);
        const data = await response.json();
        alert('Book updated successfully!');
        if (editForm) editForm.remove();
        if (notesForm) notesForm.style.display = 'block';
        fetchBooks();
      } catch (err) {
        console.error('Error updating book:', err);
        alert('Error updating book: ' + err.message);
      }
    });
  };

  // Delete Book
  window.deleteBook = async (id) => {
    try {
      const response = await fetch(`https://free-programming-notes.onrender.com/api/books/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to delete book: ' + response.statusText);
      fetchBooks();
      alert('Book deleted successfully!');
    } catch (err) {
      console.error('Error deleting book:', err);
      alert('Error deleting book: ' + err.message);
    }
  };

  // Edit Course
  window.editCourse = async (id, title, description) => {
    const editForm = document.createElement('form');
    editForm.id = 'edit-course-form';
    editForm.innerHTML = `
      <h3>Edit Course</h3>
      <input type="text" id="edit-course-title" value="${title}" required>
      <textarea id="edit-course-description" required>${description}</textarea>
      <input type="file" id="edit-thumbnail" accept="image/*">
      <input type="file" id="edit-video" accept="video/*">
      <button type="submit">Update Course</button>
      <button type="button" id="cancel-edit">Cancel</button>
    `;
    if (courseListSection) courseListSection.appendChild(editForm);
    if (courseForm) courseForm.style.display = 'none';

    document.getElementById('cancel-edit').addEventListener('click', () => {
      if (editForm) editForm.remove();
      if (courseForm) courseForm.style.display = 'block';
    });

    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append('title', document.getElementById('edit-course-title').value);
      formData.append('description', document.getElementById('edit-course-description').value);
      const thumbnail = document.getElementById('edit-thumbnail').files[0];
      const video = document.getElementById('edit-video').files[0];
      if (thumbnail) formData.append('thumbnail', thumbnail);
      if (video) formData.append('video', video);

      try {
        const response = await fetch(`https://free-programming-notes.onrender.com/api/courses/${id}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        if (!response.ok) throw new Error('Failed to update course: ' + response.statusText);
        const data = await response.json();
        alert('Course updated successfully!');
        if (editForm) editForm.remove();
        if (courseForm) courseForm.style.display = 'block';
        fetchCourses();
      } catch (err) {
        console.error('Error updating course:', err);
        alert('Error updating course: ' + err.message);
      }
    });
  };

  // Delete Course
  window.deleteCourse = async (id) => {
    try {
      const response = await fetch(`https://free-programming-notes.onrender.com/api/courses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to delete course: ' + response.statusText);
      fetchCourses();
      alert('Course deleted successfully!');
    } catch (err) {
      console.error('Error deleting course:', err);
      alert('Error deleting course: ' + err.message);
    }
  };
});

document.addEventListener('DOMContentLoaded', () => {
    // Element refs
    const courseForm     = document.getElementById('courseForm');
    const progContainer  = document.getElementById('course-progress-container');
    const progBar        = document.getElementById('course-progress-bar');
    const progText       = document.getElementById('course-progress-text');
  
    courseForm?.addEventListener('submit', function(e) {
      e.preventDefault();
      const xhr = new XMLHttpRequest();
      const fd  = new FormData(this);
  
      // Append main course files
      const thumbF = this.thumbnailFile.files[0];
      if (thumbF) fd.append('thumbnailFile', thumbF);
  
      const videoF = this.videoFile.files[0];
      if (videoF) fd.append('videoFile', videoF);
  
      const resF = this.resourcesFile.files[0];
      if (resF) fd.append('resourcesFile', resF);
  
      // Append chapters/modules as JSON
      const chapters = [];
      let idx = 0;
      document.querySelectorAll('.chapter').forEach(ch => {
        const modArr = [];
        ch.querySelectorAll('.module').forEach(mod => {
          const type = mod.querySelector('.moduleType').value;
          const obj = { title: mod.querySelector('.moduleTitle').value, type };
          if (type === 'link') {
            obj.thumbnail = mod.querySelector('.moduleThumbnail').value;
            obj.videoUrl  = mod.querySelector('.moduleVideo').value;
            obj.resources = mod.querySelector('.moduleResources').value;
            obj.notes     = mod.querySelector('.moduleNotes').value;
          } else {
            const tF = mod.querySelector('.thumbnailFile').files[0];
            const vF = mod.querySelector('.videoFile').files[0];
            const rF = mod.querySelector('.resourcesFile').files[0];
            if (tF) { fd.append(`chapter_${idx}_thumb`, tF); obj.thumbnailFile = `chapter_${idx}_thumb`; }
            if (vF) { fd.append(`chapter_${idx}_video`, vF); obj.videoFile = `chapter_${idx}_video`; }
            if (rF) { fd.append(`chapter_${idx}_resources`, rF); obj.resourcesFile = `chapter_${idx}_resources`; }
            obj.notes = mod.querySelector('.moduleNotesFile').value;
            idx++;
          }
          modArr.push(obj);
        });
        chapters.push({ title: ch.querySelector('.chapterTitle').value, modules: modArr });
      });
      fd.append('chapters', JSON.stringify(chapters));
  
      // Progress bar
      progContainer.style.display = 'block';
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          progBar.style.width = pct + '%';
          progText.textContent = pct + '%';
        }
      };
  
      xhr.onload = () => {
        progContainer.style.display = 'none';
        const res = JSON.parse(xhr.responseText);
        if (xhr.status === 201) {
          alert('Course created!');
          this.reset();
          document.getElementById('chaptersContainer').innerHTML = '';
          progBar.style.width = '0%';
          progText.textContent = '0%';
        } else {
          alert(res.message || 'Upload failed');
        }
      };
  
      xhr.onerror = () => {
        progContainer.style.display = 'none';
        alert('Error uploading course');
      };
  
      xhr.open('POST', '/admin/add-course');
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
      xhr.send(fd);
    });
  
    // Edit course logic: wrap PUT in same XHR + progress
    window.editCourse = (id, title, desc) => {
      // generate and show edit form...
      const editForm = document.getElementById('edit-course-form');
      const eProgContainer = document.getElementById('edit-course-progress-container');
      const eProgBar       = document.getElementById('edit-course-progress-bar');
      const eProgText      = document.getElementById('edit-course-progress-text');
  
      editForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const xhr2 = new XMLHttpRequest();
        const fd2  = new FormData(this);
  
        // Append any new files same as above...
        const tF2 = this.thumbnailFile?.files[0];
        if (tF2) fd2.append('thumbnailFile', tF2);
        // ... videoFile, resourcesFile
  
        eProgContainer.style.display = 'block';
        xhr2.upload.onprogress = ev => {
          if (ev.lengthComputable) {
            const pc = Math.round((ev.loaded/ev.total)*100);
            eProgBar.style.width = pc + '%';
            eProgText.textContent = pc + '%';
          }
        };
  
        xhr2.onload = () => {
          eProgContainer.style.display = 'none';
          const r2 = JSON.parse(xhr2.responseText);
          if (xhr2.status === 200) {
            alert('Course updated!');
            editForm.remove();
          } else {
            alert(r2.message || 'Update failed');
          }
        };
  
        xhr2.onerror = () => {
          eProgContainer.style.display = 'none';
          alert('Error updating course');
        };
  
        xhr2.open('PUT', `/admin/courses/${id}`);
        xhr2.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
        xhr2.send(fd2);
      });
    };
  });
  