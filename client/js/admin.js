let chapterCount = 0;

function addChapter() {
  chapterCount++;
  const chapterDiv = document.createElement("div");
  chapterDiv.classList.add("chapter");

  chapterDiv.innerHTML = `
    <h3>Chapter ${chapterCount} 
      <button type="button" class="remove-btn" onclick="removeChapter(this)">Remove</button>
    </h3>
    <input type="text" placeholder="Chapter Title" class="chapterTitle" required />
    <div class="modules-container"></div>
    <button type="button" onclick="addModule(this)">+ Add Module</button>
  `;

  document.getElementById("chaptersContainer").appendChild(chapterDiv);
}

function removeChapter(button) {
  // Safely remove chapter and decrement count
  const chapterDiv = button.closest('.chapter');
  if (chapterDiv) {
    chapterDiv.remove();
  }
}

function addModule(button) {
  const moduleDiv = document.createElement("div");
  moduleDiv.classList.add("module");

  moduleDiv.innerHTML = `
    <button type="button" class="remove-btn" onclick="removeModule(this)">Remove</button>
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
      <input type="file" class="thumbnailFile" accept="image/*" />
      <input type="file" class="videoFile" accept="video/*" />
      <input type="file" class="resourcesFile" accept=".pdf,.doc,.docx,.zip" />
      <textarea placeholder="Notes" class="moduleNotesFile"></textarea>
    </div>
  `;

  // Find the modules-container and add the module there
  const chapter = button.closest('.chapter');
  const modulesContainer = chapter.querySelector('.modules-container');
  modulesContainer.appendChild(moduleDiv);
}

function removeModule(button) {
  const moduleDiv = button.closest('.module');
  if (moduleDiv) {
    moduleDiv.remove();
  }
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
  const enhancedCourseForm = document.getElementById('enhanced-course-form');
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

  // Enhanced Course Form Handler with Progress Bar
  if (enhancedCourseForm) {
    enhancedCourseForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      console.log('Enhanced course form submitted');
      
      // Show progress bar
      const progressContainer = document.querySelector('.progress-container') || 
                                document.getElementById('course-progress-container');
      const progBar = document.getElementById('progress-bar') || 
                      document.getElementById('course-progress-bar');
      const progText = document.getElementById('progress-text') || 
                       document.getElementById('course-progress-text');
      
      const formData = new FormData();
      
      // Get form fields directly from the enhanced form
      const titleInput = this.querySelector('input[name="title"]');
      const shortDescInput = this.querySelector('textarea[name="shortDescription"]');
      const longDescInput = this.querySelector('textarea[name="longDescription"]');
      const categorySelect = this.querySelector('select[name="category"]');
      const difficultySelect = this.querySelector('select[name="difficulty"]');
      const featuredCheckbox = this.querySelector('input[name="featured"]');
      
      console.log('Form elements found:', {
        title: !!titleInput,
        shortDesc: !!shortDescInput,
        longDesc: !!longDescInput,
        category: !!categorySelect,
        difficulty: !!difficultySelect,
        featured: !!featuredCheckbox
      });
      
      // Validation
      const title = titleInput ? titleInput.value.trim() : '';
      if (!title) {
        alert('Course title is required!');
        if (titleInput) titleInput.focus();
        return;
      }
      
      // Add basic form data
      formData.append('title', title);
      
      if (shortDescInput) {
        formData.append('shortDescription', shortDescInput.value.trim());
      }
      if (longDescInput) {
        formData.append('longDescription', longDescInput.value.trim());
      }
      if (categorySelect) {
        formData.append('category', categorySelect.value);
      }
      if (difficultySelect) {
        formData.append('difficulty', difficultySelect.value);
      }
      if (featuredCheckbox) {
        formData.append('featured', featuredCheckbox.checked);
      }
      
      // Handle file uploads - look for all file inputs in the form
      const fileInputs = this.querySelectorAll('input[type="file"]');
      fileInputs.forEach(input => {
        if (input.files && input.files.length > 0) {
          const fieldName = input.name || input.className || 'file';
          formData.append(fieldName, input.files[0]);
          console.log(`Added file ${fieldName}:`, input.files[0].name);
        }
      });
      
      // Handle thumbnail choice (file upload vs URL)
      const thumbnailFileInput = this.querySelector('input[name="thumbnailFile"]');
      const thumbnailUrlInput = this.querySelector('input[name="thumbnailUrl"]');
      const thumbnailToggle = this.querySelector('input[name="thumbnailType"]:checked');
      
      if (thumbnailToggle) {
        if (thumbnailToggle.value === 'file' && thumbnailFileInput && thumbnailFileInput.files[0]) {
          formData.append('thumbnailFile', thumbnailFileInput.files[0]);
        } else if (thumbnailToggle.value === 'url' && thumbnailUrlInput && thumbnailUrlInput.value) {
          formData.append('thumbnailUrl', thumbnailUrlInput.value);
        }
      }
      
      // Handle video and resource files
      const videoInput = this.querySelector('input[name="videoFile"]');
      const resourcesInput = this.querySelector('input[name="resourcesFile"]');
      
      if (videoInput && videoInput.files && videoInput.files[0]) {
        formData.append('videoFile', videoInput.files[0]);
      }
      if (resourcesInput && resourcesInput.files && resourcesInput.files[0]) {
        formData.append('resourcesFile', resourcesInput.files[0]);
      }
      
      // Build chapters data - FIXED
      let chaptersData = [];
      try {
        chaptersData = buildChaptersData();
        console.log('Chapters data:', chaptersData);
      } catch (error) {
        console.error('Error building chapters data:', error);
        alert('Error processing chapters data. Please check your chapters and modules.');
        return;
      }
      
      formData.append('chapters', JSON.stringify(chaptersData));
      
      // Debug FormData contents
      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(key, ':', typeof value === 'object' && value.name ? value.name : value);
      }
      
      try {
        // Use XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();
        
        // Show progress bar
        if (progressContainer) progressContainer.style.display = 'block';
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            if (progBar) progBar.style.width = `${percentComplete}%`;
            if (progText) progText.textContent = `${percentComplete}%`;
          }
        };

        xhr.onload = () => {
          if (progressContainer) progressContainer.style.display = 'none';
          
          try {
            const result = JSON.parse(xhr.responseText);
            console.log('Server response:', result);
            
            if (xhr.status === 201) {
              alert('Course uploaded successfully!');
              this.reset();
              const chaptersContainer = document.getElementById('chaptersContainer');
              if (chaptersContainer) chaptersContainer.innerHTML = '';
              chapterCount = 0;
              if (progBar) progBar.style.width = '0%';
              if (progText) progText.textContent = '0%';
              fetchCourses();
            } else {
              throw new Error(result.message || `Upload failed with status ${xhr.status}`);
            }
          } catch (parseError) {
            console.error('Error parsing response:', parseError);
            alert('Error processing server response');
          }
        };

        xhr.onerror = () => {
          if (progressContainer) progressContainer.style.display = 'none';
          alert('Error uploading course');
        };

        xhr.open('POST', 'https://free-programming-notes.onrender.com/api/courses/add-course');
        xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
        xhr.send(formData);
        
      } catch (error) {
        console.error('Course upload error:', error);
        alert(`Error creating course: ${error.message}`);
        if (progressContainer) progressContainer.style.display = 'none';
      }
    });
  }

  // FIXED: Build chapters data function
  function buildChaptersData() {
    const chapters = [];
    const chapterElements = document.querySelectorAll('.chapter');
    
    console.log('Found chapters:', chapterElements.length);
    
    chapterElements.forEach((chapter, chapterIndex) => {
      const chapterTitleInput = chapter.querySelector('.chapterTitle');
      const chapterTitle = chapterTitleInput ? chapterTitleInput.value.trim() : '';
      
      console.log(`Chapter ${chapterIndex + 1}: "${chapterTitle}"`);
      
      const modules = [];
      const moduleElements = chapter.querySelectorAll('.module');
      
      console.log(`- Found ${moduleElements.length} modules in chapter ${chapterIndex + 1}`);
      
      moduleElements.forEach((module, moduleIndex) => {
        const moduleTitleInput = module.querySelector('.moduleTitle');
        const moduleTypeSelect = module.querySelector('.moduleType');
        
        const moduleTitle = moduleTitleInput ? moduleTitleInput.value.trim() : '';
        const moduleType = moduleTypeSelect ? moduleTypeSelect.value : 'link';
        
        console.log(`  Module ${moduleIndex + 1}: "${moduleTitle}" (${moduleType})`);
        
        const moduleData = {
          title: moduleTitle,
          type: moduleType
        };
        
        if (moduleType === 'link') {
          const thumbnailInput = module.querySelector('.moduleThumbnail');
          const videoInput = module.querySelector('.moduleVideo');
          const resourcesInput = module.querySelector('.moduleResources');
          const notesTextarea = module.querySelector('.moduleNotes');
          
          moduleData.thumbnail = thumbnailInput ? thumbnailInput.value.trim() : '';
          moduleData.videoUrl = videoInput ? videoInput.value.trim() : '';
          moduleData.resources = resourcesInput ? resourcesInput.value.trim() : '';
          moduleData.notes = notesTextarea ? notesTextarea.value.trim() : '';
        } else {
          const notesTextarea = module.querySelector('.moduleNotesFile');
          moduleData.notes = notesTextarea ? notesTextarea.value.trim() : '';
        }
        
        modules.push(moduleData);
      });
      
      chapters.push({
        title: chapterTitle,
        modules: modules
      });
    });
    
    console.log('Final chapters data:', chapters);
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

  // Notes/Books Form Submit
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
        <option value="Mobile Development">Mobile Development</option>
        <option value="DevOps">DevOps</option>
        <option value="AI/ML">AI/ML</option>
        <option value="Cybersecurity">Cybersecurity</option>
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

// Additional XHR-based course form handler with progress bar (keeping existing functionality)
document.addEventListener('DOMContentLoaded', () => {
  const courseFormAlt = document.getElementById('courseForm');
  const progContainer = document.getElementById('course-progress-container');
  const progBar = document.getElementById('course-progress-bar');
  const progText = document.getElementById('course-progress-text');

  if (courseFormAlt && progContainer && progBar && progText) {
    courseFormAlt.addEventListener('submit', function(e) {
      e.preventDefault();
      const xhr = new XMLHttpRequest();
      const fd = new FormData(this);

      // Get title and description with multiple selectors
      const titleInput = this.querySelector('input[name="title"]') || 
                        this.querySelector('input[placeholder*="title" i]') ||
                        this.querySelector('input[type="text"]');
      const shortDescInput = this.querySelector('textarea[name="shortDescription"]') || 
                            this.querySelector('textarea[placeholder*="short" i]');

      const title = titleInput ? titleInput.value.trim() : '';
      const shortDescription = shortDescInput ? shortDescInput.value.trim() : '';

      if (!title) {
        alert('Course title is required!');
        return;
      }

      fd.append('title', title);
      if (shortDescription) {
        fd.append('shortDescription', shortDescription);
      }

      // Append main course files
      const thumbFileInput = this.querySelector('input[name="thumbnailFile"]') || 
                            this.querySelector('input.thumbnailFile');
      const videoFileInput = this.querySelector('input[name="videoFile"]') || 
                            this.querySelector('input.videoFile');
      const resFileInput = this.querySelector('input[name="resourcesFile"]') || 
                          this.querySelector('input.resourcesFile');

      if (thumbFileInput && thumbFileInput.files && thumbFileInput.files[0]) {
        fd.append('thumbnailFile', thumbFileInput.files[0]);
      }
      if (videoFileInput && videoFileInput.files && videoFileInput.files[0]) {
        fd.append('videoFile', videoFileInput.files[0]);
      }
      if (resFileInput && resFileInput.files && resFileInput.files[0]) {
        fd.append('resourcesFile', resFileInput.files[0]);
      }

      // Build chapters data using the same fixed function
      let chaptersData = [];
      try {
        // Use the same buildChaptersData function logic
        const chapterElements = document.querySelectorAll('.chapter');
        chapterElements.forEach((chapter, chapterIndex) => {
          const chapterTitleInput = chapter.querySelector('.chapterTitle');
          const chapterTitle = chapterTitleInput ? chapterTitleInput.value.trim() : '';
          
          const modules = [];
          const moduleElements = chapter.querySelectorAll('.module');
          
          moduleElements.forEach((module, moduleIndex) => {
            const moduleTitleInput = module.querySelector('.moduleTitle');
            const moduleTypeSelect = module.querySelector('.moduleType');
            
            const moduleTitle = moduleTitleInput ? moduleTitleInput.value.trim() : '';
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
              
              moduleData.thumbnail = thumbnailInput ? thumbnailInput.value.trim() : '';
              moduleData.videoUrl = videoInput ? videoInput.value.trim() : '';
              moduleData.resources = resourcesInput ? resourcesInput.value.trim() : '';
              moduleData.notes = notesTextarea ? notesTextarea.value.trim() : '';
            } else {
              // Handle file uploads for modules
              const tF = module.querySelector('.thumbnailFile')?.files[0];
              const vF = module.querySelector('.videoFile')?.files[0];
              const rF = module.querySelector('.resourcesFile')?.files[0];
              const notesInput = module.querySelector('.moduleNotesFile');
              
              if (tF) { 
                fd.append(`chapter_${chapterIndex}_module_${moduleIndex}_thumb`, tF); 
                moduleData.thumbnailFile = `chapter_${chapterIndex}_module_${moduleIndex}_thumb`; 
              }
              if (vF) { 
                fd.append(`chapter_${chapterIndex}_module_${moduleIndex}_video`, vF); 
                moduleData.videoFile = `chapter_${chapterIndex}_module_${moduleIndex}_video`; 
              }
              if (rF) { 
                fd.append(`chapter_${chapterIndex}_module_${moduleIndex}_resources`, rF); 
                moduleData.resourcesFile = `chapter_${chapterIndex}_module_${moduleIndex}_resources`; 
              }
              moduleData.notes = notesInput ? notesInput.value.trim() : '';
            }
            
            modules.push(moduleData);
          });
          
          chaptersData.push({
            title: chapterTitle,
            modules: modules
          });
        });
        
      } catch (error) {
        console.error('Error building chapters data:', error);
        alert('Error processing chapters data');
        return;
      }

      fd.append('chapters', JSON.stringify(chaptersData));

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
            alert('Course created successfully!');
            this.reset();
            const chaptersContainer = document.getElementById('chaptersContainer');
            if (chaptersContainer) chaptersContainer.innerHTML = '';
            progBar.style.width = '0%';
            progText.textContent = '0%';
            chapterCount = 0;
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