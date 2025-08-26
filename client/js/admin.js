/**
 * client/js/admin.js
 * Detailed updated logic for Admin Panel functionality
 */

document.addEventListener('DOMContentLoaded', () => {
    // Element references
    const loginForm           = document.getElementById('login-form');
    const logoutLinks         = document.querySelectorAll('.logout');
    const uploadTypeSelect    = document.getElementById('upload-type');
    const bookForm            = document.getElementById('book-form');
    const courseForm          = document.getElementById('course-form');
    const chaptersContainer   = document.getElementById('chaptersContainer');
    const bookListSection     = document.getElementById('book-list-section');
    const bookList            = document.getElementById('book-list');
    const courseListSection   = document.getElementById('course-list-section');
    const courseList          = document.getElementById('course-list');
    const progressBar         = document.getElementById('progress-bar');
    const progressText        = document.getElementById('progress-text');
    const messageEl           = document.getElementById('message');
    const menuIcon            = document.getElementById('menu-icon');
    const closeIcon           = document.getElementById('close-icon');
    const navbarLinks         = document.getElementById('navbar-links');
    let chapterCount = 0;
  
    // JWT authentication helper
    function updateAuthDisplay(isAuthenticated) {
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAuthenticated ? 'block' : 'none');
      document.querySelectorAll('.admin-login').forEach(el => el.style.display = isAuthenticated ? 'none' : 'block');
      logoutLinks.forEach(el => el.style.display = isAuthenticated ? 'block' : 'none');
    }
  
    // Validate JWT on load
    const token = localStorage.getItem('token');
    if (token && window.jwt_decode) {
      try {
        const decoded = jwt_decode(token);
        if (decoded.exp * 1000 > Date.now()) {
          updateAuthDisplay(true);
          fetchBooks();
          fetchCourses();
        } else {
          localStorage.removeItem('token');
          updateAuthDisplay(false);
        }
      } catch {
        localStorage.removeItem('token');
        updateAuthDisplay(false);
      }
    } else {
      updateAuthDisplay(false);
    }
  
    // Navbar toggle for mobile
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
  
    // Logout handler
    logoutLinks.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        localStorage.removeItem('token');
        updateAuthDisplay(false);
        messageEl.textContent = 'Logged out successfully!';
        setTimeout(() => messageEl.textContent = '', 3000);
        window.location.href = '/index.html';
      });
    });
  
    // Login form submission
    loginForm?.addEventListener('submit', async e => {
      e.preventDefault();
      const username = loginForm.username.value;
      const password = loginForm.password.value;
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({username, password})
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('token', data.token);
          updateAuthDisplay(true);
          messageEl.textContent = 'Login successful!';
          loginForm.reset();
          setTimeout(() => messageEl.textContent = '', 3000);
          fetchBooks();
          fetchCourses();
        } else {
          messageEl.textContent = data.message || 'Login failed';
          setTimeout(() => messageEl.textContent = '', 3000);
        }
      } catch {
        messageEl.textContent = 'Error during login';
        setTimeout(() => messageEl.textContent = '', 3000);
      }
    });
  
    // Toggle between Books and Courses upload sections
    function toggleUploadSection() {
      if (uploadTypeSelect.value === 'notes') {
        bookForm.style.display   = 'block';
        courseForm.style.display = 'none';
        bookListSection.style.display   = 'block';
        courseListSection.style.display = 'none';
        fetchBooks();
      } else {
        bookForm.style.display   = 'none';
        courseForm.style.display = 'block';
        bookListSection.style.display   = 'none';
        courseListSection.style.display = 'block';
        if (!chaptersContainer.children.length) addChapter();
        fetchCourses();
      }
    }
    uploadTypeSelect.addEventListener('change', toggleUploadSection);
    toggleUploadSection();
  
    // Add a new Chapter UI block
    window.addChapter = function() {
      chapterCount++;
      const chapDiv = document.createElement('div');
      chapDiv.className = 'chapter';
      chapDiv.innerHTML = `
        <h3>Chapter ${chapterCount} <button type="button" class="remove-btn">❌ Remove</button></h3>
        <input type="text" placeholder="Chapter Title" class="chapterTitle" required />
        <div class="modules-container"></div>
        <button type="button" class="add-module-btn">+ Add Module</button>
      `;
      chaptersContainer.appendChild(chapDiv);
  
      // Remove chapter
      chapDiv.querySelector('.remove-btn').onclick = () => chapDiv.remove();
      // Add module button
      chapDiv.querySelector('.add-module-btn').onclick = () => addModule(chapDiv.querySelector('.modules-container'));
    };
  
    // Add a new Module UI block inside a given container
    function addModule(container) {
      const modDiv = document.createElement('div');
      modDiv.className = 'module';
      modDiv.innerHTML = `
        <button type="button" class="remove-btn">❌ Remove</button>
        <input type="text" placeholder="Module Title" class="moduleTitle" required/>
        <select class="moduleType">
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
          <input type="file" class="thumbnailFile" accept="image/*" />
          <input type="file" class="videoFile" accept="video/*" />
          <input type="file" class="resourcesFile" accept=".pdf,.docx,.zip" />
          <textarea placeholder="Notes" class="moduleNotesFile"></textarea>
        </div>
      `;
      container.appendChild(modDiv);
  
      // Remove module
      modDiv.querySelector('.remove-btn').onclick = () => modDiv.remove();
  
      // Toggle content type fields
      const select = modDiv.querySelector('.moduleType');
      const fileFields = modDiv.querySelector('.file-fields');
      const uploadFields = modDiv.querySelector('.file-upload-fields');
      select.onchange = () => {
        if (select.value === 'file') {
          fileFields.classList.add('hidden');
          uploadFields.classList.remove('hidden');
        } else {
          fileFields.classList.remove('hidden');
          uploadFields.classList.add('hidden');
        }
      };
    }
  
    // Handle book form submission with AJAX + progress bar
    bookForm?.addEventListener('submit', async e => {
      e.preventDefault();
      const formData = new FormData(bookForm);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/books', true);
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
  
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) {
          const percent = Math.round(e.loaded/e.total*100);
          progressBar.style.width = `${percent}%`;
          progressText.textContent = `${percent}%`;
        }
      };
      xhr.onload = () => {
        progressBar.parentElement.style.display = 'none';
        if (xhr.status === 201) {
          fetchBooks();
          alert('Book added successfully');
          bookForm.reset();
        } else {
          alert(JSON.parse(xhr.responseText).message || 'Failed to add book');
        }
      };
      xhr.onerror = () => {
        alert('Error adding book');
      };
      progressBar.parentElement.style.display = 'block';
      xhr.send(formData);
    });
  
    // Fetch and display books in admin panel
    async function fetchBooks() {
      if (!bookList) return;
      try {
        const res = await fetch('/api/books', {
          headers: {'Authorization': `Bearer ${localStorage.getItem('token')}`}
        });
        const books = await res.json();
        bookList.innerHTML = books.map(b => `
          <div class="book-item">
            <img src="${b.imageUrl}" alt="${b.title}" style="width:100px;" />
            <h3>${b.title}</h3>
            <p>${b.description}</p>
            <button onclick="editBook('${b._id}','${b.title}','${b.description}','${b.category}')">Edit</button>
            <button onclick="deleteBook('${b._id}')">Delete</button>
          </div>
        `).join('');
      } catch (err) {
        bookList.innerHTML = `<p class="error">Error loading books: ${err.message}</p>`;
      }
    }
  
    // Fetch and display courses in admin panel
    async function fetchCourses() {
      if (!courseList) return;
      try {
        const res = await fetch('/api/courses', {
          headers: {'Authorization': `Bearer ${localStorage.getItem('token')}`}
        });
        const courses = await res.json();
        courseList.innerHTML = courses.map(c => `
          <div class="course-item">
            <h3>${c.title}</h3>
            <button onclick="editCourse('${c._id}','${c.title}','${c.description}')">Edit</button>
            <button onclick="deleteCourse('${c._id}')">Delete</button>
          </div>
        `).join('');
      } catch (err) {
        courseList.innerHTML = `<p class="error">Error loading courses: ${err.message}</p>`;
      }
    }
  
    // Edit & delete functions (preserving existing behavior)
    window.editBook = (id, title, desc, cat) => { /* ... */ };
    window.deleteBook = id => { /* ... */ };
    window.editCourse = (id, title, desc) => { /* ... */ };
    window.deleteCourse = id => { /* ... */ };
  });
  