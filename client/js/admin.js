let chapterCount = 0;

function addChapter() {
  chapterCount++;
  const chapterDiv = document.createElement("div");
  chapterDiv.classList.add("chapter");

  chapterDiv.innerHTML = `
    <h3>Chapter ${chapterCount} 
      <button type="button" class="remove-btn" onclick="this.parentElement.parentElement.remove()">âŒ Remove</button>
    </h3>
    <input type="text" placeholder="Chapter Title" class="chapterTitle" required />
    <div class="modules-container"></div>
    <button type="button" onclick="addModule(this)">+ Add Module</button>
  `;

  const container = document.getElementById("chaptersContainer");
  if (container) container.appendChild(chapterDiv);
}

function addModule(button) {
  const moduleDiv = document.createElement("div");
  moduleDiv.classList.add("module");

  moduleDiv.innerHTML = `
    <button type="button" class="remove-btn" onclick="this.parentElement.remove()">âŒ Remove</button>
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

  const modulesContainer = button.previousElementSibling;
  if (modulesContainer) modulesContainer.appendChild(moduleDiv);
}

function toggleModuleFields(select) {
  const module = select.closest('.module');
  if (!module) return;
  const fileFields = module.querySelector('.file-fields');
  const uploadFields = module.querySelector('.file-upload-fields');
  
  if (select.value === 'file') {
    if (fileFields) fileFields.classList.add('hidden');
    if (uploadFields) uploadFields.classList.remove('hidden');
  } else {
    if (fileFields) fileFields.classList.remove('hidden');
    if (uploadFields) uploadFields.classList.add('hidden');
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
        if (menuIcon) menuIcon.style.display = 'block';
        if (closeIcon) closeIcon.style.display = 'none';
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
      const usernameInput = document.getElementById('username');
      const passwordInput = document.getElementById('password');
      
      if (!usernameInput || !passwordInput) {
        console.error('Username or password input not found');
        return;
      }
      
      const username = usernameInput.value;
      const password = passwordInput.value;

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
  if (courseForm) {
    courseForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const formData = new FormData();
      
      // Safely append files only if they exist
      const fileFields = ['thumbnailFile', 'videoFile', 'resourcesFile'];
      fileFields.forEach(field => {
        const input = this.elements && this.elements[field];
        if (input && input.files && input.files.length > 0) {
          formData.append(field, input.files[0]);
        }
      });
      
      // Get chapters data from global variable or build it
      let chaptersData = [];
      try {
        chaptersData = buildChaptersData();
      } catch (error) {
        console.error('Error building chapters data:', error);
      }
      
      formData.append('title', this.elements && this.elements.title ? this.elements.title.value : '');
      formData.append('description', this.elements && this.elements.description ? this.elements.description.value : '');
      formData.append('chapters', JSON.stringify(chaptersData));
      
      try {
        const response = await fetch('https://free-programming-notes.onrender.com/api/courses/add-course', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        
        let result;
        try {
          result = await response.json();
        } catch {
          throw new Error('Invalid server response');
        }
        
        if (!response.ok) {
          throw new Error(result.message || 'Upload failed');
        }
        
        alert('Course uploaded successfully!');
        this.reset();
        const chaptersContainer = document.getElementById('chaptersContainer');
        if (chaptersContainer) chaptersContainer.innerHTML = '';
        chapterCount = 0;
        fetchCourses();
        
      } catch (error) {
        console.error('Course upload error:', error);
        alert(`Error creating course: ${error.message}`);
      }
    });
  }

  // Helper function to build chapters data
  function buildChaptersData() {
    const chapters = [];
    document.querySelectorAll('.chapter').forEach(chapter => {
      const chapterTitleInput = chapter.querySelector('.chapterTitle');
      const chapterTitle = chapterTitleInput ? chapterTitleInput.value : '';
      
      const modules = [];
      chapter.querySelectorAll('.module').forEach(module => {
        const moduleTitleInput = module.querySelector('.moduleTitle');
        const moduleTypeSelect = module.querySelector('.moduleType');
        
        const moduleTitle = moduleTitleInput ? moduleTitleInput.value : '';
        const moduleType = moduleTypeSelect ? moduleTypeSelect.value : 'link';
        
        const moduleData = {
          title: moduleTitle,
          type: moduleType
        };
        
        if (moduleType === 'link') {
          const thumbnailInput = module.querySelector('.moduleThumbnail');
          const videoInput = module.querySelector('.moduleVideo');
          const resourcesInput = module.querySelector('.moduleResources');
          const notesTextarea = module.querySelector('.moduleNotes');
          
          moduleData.thumbnail = thumbnailInput ? thumbnailInput.value : '';
          moduleData.videoUrl = videoInput ? videoInput.value : '';
          moduleData.resources = resourcesInput ? resourcesInput.value : '';
          moduleData.notes = notesTextarea ? notesTextarea.value : '';
        } else {
          const notesTextarea = module.querySelector('.moduleNotesFile');
          moduleData.notes = notesTextarea ? notesTextarea.value : '';
        }
        
        modules.push(moduleData);
      });
      
      chapters.push({
        title: chapterTitle,
        modules: modules
      });
    });
    
    return chapters;
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
      if (bookList) bookList.innerHTML = 'Error loading books: ' + err.message + '<br>';
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
          <img src="${course.thumbnail || 'https://placehold.co/100x100'}" alt="${course.title}" style="width: 100px; height: auto;">
          <h3>${course.title}</h3>
          <p>${course.description}</p>
          <p><strong>Chapters:</strong> ${course.chapters ? course.chapters.length : 0}</p>
          <button onclick="editCourse('${course._id}', '${course.title}', '${course.description}')">Edit</button>
          <button onclick="deleteCourse('${course._id}')">Delete</button>
        </div>
      `).join('');
    } catch (err) {
      console.error('Error fetching courses:', err);
      if (courseList) courseList.innerHTML = 'Error loading courses: ' + err.message + '<br>';
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

    const cancelBtn = document.getElementById('cancel-edit');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (editForm) editForm.remove();
        if (notesForm) notesForm.style.display = 'block';
      });
    }

    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData();
      const titleInput = document.getElementById('edit-title');
      const descInput = document.getElementById('edit-description');
      const categoryInput = document.getElementById('edit-category');
      const imageInput = document.getElementById('edit-image');
      const pdfInput = document.getElementById('edit-pdf');
      
      if (titleInput) formData.append('title', titleInput.value);
      if (descInput) formData.append('description', descInput.value);
      if (categoryInput) formData.append('category', categoryInput.value);
      if (imageInput && imageInput.files[0]) formData.append('image', imageInput.files[0]);
      if (pdfInput && pdfInput.files[0]) formData.append('pdf', pdfInput.files[0]);

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
    if (confirm('Are you sure you want to delete this book?')) {
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

    const cancelBtn = document.getElementById('cancel-edit');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (editForm) editForm.remove();
        if (courseForm) courseForm.style.display = 'block';
      });
    }

    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData();
      const titleInput = document.getElementById('edit-course-title');
      const descInput = document.getElementById('edit-course-description');
      const thumbnailInput = document.getElementById('edit-thumbnail');
      const videoInput = document.getElementById('edit-video');
      
      if (titleInput) formData.append('title', titleInput.value);
      if (descInput) formData.append('description', descInput.value);
      if (thumbnailInput && thumbnailInput.files[0]) formData.append('thumbnail', thumbnailInput.files[0]);
      if (videoInput && videoInput.files[0]) formData.append('video', videoInput.files[0]);

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
    if (confirm('Are you sure you want to delete this course?')) {
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
    }
  };

  // Initial fetch
  fetchBooks();
  fetchCourses();
});

// Enhanced XHR upload with progress bar for course form (alternative implementation)
document.addEventListener('DOMContentLoaded', () => {
  const courseForm = document.getElementById('courseForm');
  const progContainer = document.getElementById('course-progress-container');
  const progBar = document.getElementById('course-progress-bar');
  const progText = document.getElementById('course-progress-text');

  // Safe file input helper
  function safeFileInput(mod, selector) {
    const input = mod ? mod.querySelector(selector) : null;
    return (input && input.files && input.files[0]) ? input.files[0] : null;
  }

  if (courseForm && progContainer && progBar && progText) {
    courseForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const xhr = new XMLHttpRequest();
      const fd = new FormData(this);

      // Append main course files
      const titleInput = this.elements ? this.elements.title : null;
      const descInput = this.elements ? this.elements.description : null;
      const thumbFileInput = this.elements ? this.elements.thumbnailFile : null;
      const videoFileInput = this.elements ? this.elements.videoFile : null;
      const resFileInput = this.elements ? this.elements.resourcesFile : null;

      if (titleInput) fd.append('title', titleInput.value || '');
      if (descInput) fd.append('description', descInput.value || '');

      if (thumbFileInput && thumbFileInput.files && thumbFileInput.files[0]) {
        fd.append('thumbnailFile', thumbFileInput.files[0]);
      }
      if (videoFileInput && videoFileInput.files && videoFileInput.files[0]) {
        fd.append('videoFile', videoFileInput.files[0]);
      }
      if (resFileInput && resFileInput.files && resFileInput.files[0]) {
        fd.append('resourcesFile', resFileInput.files[0]);
      }

      // Append chapters/modules as JSON
      const chapters = [];
      let idx = 0;
      document.querySelectorAll('.chapter').forEach(ch => {
        const modArr = [];
        ch.querySelectorAll('.module').forEach(mod => {
          const typeSelect = mod.querySelector('.moduleType');
          const titleInput = mod.querySelector('.moduleTitle');
          const type = typeSelect ? typeSelect.value : 'link';
          const title = titleInput ? titleInput.value : '';
          
          const obj = { title, type };
          if (type === 'link') {
            const thumbInput = mod.querySelector('.moduleThumbnail');
            const videoInput = mod.querySelector('.moduleVideo');
            const resInput = mod.querySelector('.moduleResources');
            const notesInput = mod.querySelector('.moduleNotes');
            
            obj.thumbnail = thumbInput ? thumbInput.value : '';
            obj.videoUrl = videoInput ? videoInput.value : '';
            obj.resources = resInput ? resInput.value : '';
            obj.notes = notesInput ? notesInput.value : '';
          } else {
            const tF = safeFileInput(mod, '.thumbnailFile');
            const vF = safeFileInput(mod, '.videoFile');
            const rF = safeFileInput(mod, '.resourcesFile');
            const notesInput = mod.querySelector('.moduleNotesFile');
            
            if (tF) { fd.append(`chapter_${idx}_thumb`, tF); obj.thumbnailFile = `chapter_${idx}_thumb`; }
            if (vF) { fd.append(`chapter_${idx}_video`, vF); obj.videoFile = `chapter_${idx}_video`; }
            if (rF) { fd.append(`chapter_${idx}_resources`, rF); obj.resourcesFile = `chapter_${idx}_resources`; }
            obj.notes = notesInput ? notesInput.value : '';
            idx++;
          }
          modArr.push(obj);
        });
        
        const chapterTitleInput = ch.querySelector('.chapterTitle');
        const chapterTitle = chapterTitleInput ? chapterTitleInput.value : '';
        chapters.push({ title: chapterTitle, modules: modArr });
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
        try {
          const res = JSON.parse(xhr.responseText);
          if (xhr.status === 201) {
            alert('Course created!');
            this.reset();
            const chaptersContainer = document.getElementById('chaptersContainer');
            if (chaptersContainer) chaptersContainer.innerHTML = '';
            progBar.style.width = '0%';
            progText.textContent = '0%';
            chapterCount = 0;
            // Refresh courses list if fetchCourses function exists
            if (typeof fetchCourses === 'function') fetchCourses();
          } else {
            alert(res.message || 'Upload failed');
          }
        } catch (error) {
          alert('Error processing server response');
        }
      };

      xhr.onerror = () => {
        progContainer.style.display = 'none';
        alert('Error uploading course');
      };

      xhr.open('POST', 'https://free-programming-notes.onrender.com/api/courses/add-course');
      const token = localStorage.getItem('token');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(fd);
    });
  }
});