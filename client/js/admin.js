// client/js/admin.js
let chapterCount = 0;

// ===== CHAPTER & MODULE MANAGEMENT =====
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
  const chapterDiv = button.closest('.chapter');
  if (chapterDiv) {
    chapterDiv.remove();
  }
}

function addModule(button) {
  const moduleDiv = document.createElement("div");
  moduleDiv.classList.add("module");

  const chapter = button.closest('.chapter');
  const chapterIndex = Array.from(document.querySelectorAll('.chapter')).indexOf(chapter);
  const modulesContainer = chapter.querySelector('.modules-container');
  const moduleIndex = modulesContainer.querySelectorAll('.module').length; // Per-chapter index

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
      <input type="file" class="thumbnailFile" accept="image/*" name="chapter_${chapterIndex}_module_${moduleIndex}_thumb" />
      <input type="file" class="videoFile" accept="video/*" name="chapter_${chapterIndex}_module_${moduleIndex}_video" />
      <input type="file" class="resourcesFile" accept=".pdf,.doc,.docx,.zip" name="chapter_${chapterIndex}_module_${moduleIndex}_resources" />
      <textarea placeholder="Notes" class="moduleNotesFile"></textarea>
    </div>
  `;

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

// ===== DOCUMENT READY =====
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
  const logoutLink = document.getElementById('logout');
  const message = document.getElementById('message');

  // ===== AUTHENTICATION =====
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const decoded = jwt_decode(token);
      const now = Date.now() / 1000;
      if (decoded.exp < now) {
        localStorage.removeItem('token');
        updateAuthDisplay(false);
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
      if (message) message.textContent = 'Invalid session. Please log in again.';
    }
  } else {
    updateAuthDisplay(false);
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

  // ===== LOGIN/LOGOUT =====
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

  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      updateAuthDisplay(false);
      if (uploadSection) uploadSection.style.display = 'none';
      if (message) message.textContent = 'Logged out successfully.';
      setTimeout(() => { if (message) message.textContent = ''; }, 3000);
      window.location.href = '/index.html';
    });
  }

  // ===== TOGGLE FORMS =====
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

  // ===== BOOK UPLOAD FUNCTIONALITY =====
  const notesFormElement = document.getElementById('notes-form');
  if (notesFormElement) {
    notesFormElement.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(notesFormElement);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://free-programming-notes.onrender.com/api/books', true);
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);

      const progressContainer = document.querySelector('.progress-container');
      const progressBar = document.getElementById('progress-bar');
      const progressText = document.getElementById('progress-text');

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

  // ===== COURSE UPLOAD FUNCTIONALITY =====
  if (enhancedCourseForm) {
    enhancedCourseForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const progressContainer = document.getElementById('course-progress-container');
      const progBar = document.getElementById('course-progress-bar');
      const progText = document.getElementById('course-progress-text');
      
      const formData = new FormData();
      
      // Get all form fields
      const titleInput = this.querySelector('input[name="title"]');
      const shortDescInput = this.querySelector('textarea[name="shortDescription"]');
      const longDescInput = this.querySelector('textarea[name="longDescription"]');
      const categorySelect = this.querySelector('select[name="category"]');
      const difficultySelect = this.querySelector('select[name="difficulty"]');
      const featuredCheckbox = this.querySelector('input[name="featured"]');
      
      // Validation
      if (!titleInput?.value?.trim()) {
        alert('Course title is required!');
        return;
      }
      
      // Add basic form data
      formData.append('title', titleInput.value.trim());
      formData.append('shortDescription', shortDescInput?.value?.trim() || '');
      formData.append('longDescription', longDescInput?.value?.trim() || '');
      formData.append('category', categorySelect?.value || '');
      formData.append('difficulty', difficultySelect?.value || 'Beginner');
      formData.append('featured', featuredCheckbox?.checked || false);
      
      // Handle thumbnail type
      const thumbnailType = this.querySelector('input[name="thumbnailType"]:checked')?.value || 'file';
      formData.append('thumbnailType', thumbnailType);
      
      // Handle thumbnail
      if (thumbnailType === 'url') {
        const thumbnailUrl = this.querySelector('input[name="thumbnailUrl"]')?.value?.trim() || '';
        formData.append('thumbnailUrl', thumbnailUrl);
      } else {
        const thumbnailFile = this.querySelector('input[name="thumbnailFile"]')?.files?.[0];
        if (thumbnailFile) formData.append('thumbnailFile', thumbnailFile);
      }
      
      // Handle other files
      const videoFile = this.querySelector('input[name="videoFile"]')?.files?.[0];
      if (videoFile) formData.append('videoFile', videoFile);
      
      const resourcesFile = this.querySelector('input[name="resourcesFile"]')?.files?.[0];
      if (resourcesFile) formData.append('resourcesFile', resourcesFile);
      
      // Build chapters data
      const chapters = buildChaptersData(formData); // Pass formData to append module files
      formData.append('chapters', JSON.stringify(chapters));
      
      // Debug: Log FormData contents
      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }
      console.log('Chapters JSON:', JSON.stringify(chapters, null, 2));
      
      try {
        const xhr = new XMLHttpRequest();
        
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
          
          const result = JSON.parse(xhr.responseText);
          if (xhr.status === 201) {
            alert('Course uploaded successfully!');
            this.reset();
            const chaptersContainer = document.getElementById('chaptersContainer');
            if (chaptersContainer) chaptersContainer.innerHTML = '';
            chapterCount = 0;
            fetchCourses();
          } else {
            alert(result.message || 'Upload failed');
          }
        };

        xhr.onerror = () => {
          if (progressContainer) progressContainer.style.display = 'none';
          alert('Network error while uploading course');
        };

        xhr.open('POST', 'https://free-programming-notes.onrender.com/api/courses/add-course');
        const token = localStorage.getItem('token');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
        
      } catch (error) {
        console.error('Upload error:', error);
        alert(`Error uploading course: ${error.message}`);
        if (progressContainer) progressContainer.style.display = 'none';
      }
    });
  }

  // ===== ENHANCED COURSE EDITING =====
  window.editCourse = async (id, title, description) => {
    try {
      // Fetch complete course data
      const response = await fetch(`https://free-programming-notes.onrender.com/api/courses/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const course = await response.json();
      
      // Create enhanced edit form
      const editContainer = document.createElement('div');
      editContainer.className = 'course-edit-container';
      editContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 1000;
        overflow-y: auto;
      `;
      
      editContainer.innerHTML = `
        <div style="background: white; margin: 20px auto; padding: 30px; max-width: 800px; border-radius: 10px;">
          <h2>Edit Course</h2>
          
          <!-- Progress Bar -->
          <div class="progress-container" id="edit-progress-container" style="display: none;">
            <div class="progress-bar"><div id="edit-progress-bar" style="width: 0%;"></div></div>
            <span id="edit-progress-text">0%</span>
          </div>
          
          <form id="edit-course-form">
            <input type="text" name="title" value="${course.title}" placeholder="Course Title" required />
            <textarea name="shortDescription" placeholder="Short Description" rows="3" required>${course.shortDescription}</textarea>
            <textarea name="longDescription" placeholder="Long Description" rows="5">${course.longDescription || ''}</textarea>
            
            <select name="category" required>
              <option value="${course.category}" selected>${course.category}</option>
              <option value="Programming">Programming</option>
              <option value="Algorithms">Algorithms</option>
              <option value="Data Science">Data Science</option>
              <option value="Web Development">Web Development</option>
              <option value="Mobile Development">Mobile Development</option>
              <option value="DevOps">DevOps</option>
              <option value="AI/ML">AI/ML</option>
              <option value="Cybersecurity">Cybersecurity</option>
            </select>
            
            <select name="difficulty">
              <option value="${course.difficulty}" selected>${course.difficulty}</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
            
            <label>
              <input type="checkbox" name="featured" ${course.featured ? 'checked' : ''} /> Featured Course
            </label>
            
            <h3>Course Files</h3>
            <label>Thumbnail:</label>
            <input type="file" name="thumbnailFile" accept="image/*" />
            ${course.thumbnail ? `<img src="${course.thumbnail}" style="width: 100px; margin: 10px;" />` : ''}
            
            <label>Intro Video:</label>
            <input type="file" name="videoFile" accept="video/*" />
            ${course.videoUrl ? `<a href="${course.videoUrl}" target="_blank">View current video</a>` : ''}
            
            <label>Resources:</label>
            <input type="file" name="resourcesFile" accept=".pdf,.zip,.doc,.docx" />
            ${course.resources ? `<a href="${course.resources}" target="_blank">View current resources</a>` : ''}
            
            <h3>Chapters & Modules</h3>
            <div id="edit-chapters-container"></div>
            <button type="button" onclick="addEditChapter()">+ Add New Chapter</button>
            
            <div style="margin-top: 20px;">
              <button type="submit">Update Course</button>
              <button type="button" onclick="closeEditForm()">Cancel</button>
            </div>
          </form>
        </div>
      `;
      
      document.body.appendChild(editContainer);
      
      // Populate chapters
      populateEditChapters(course.chapters || []);
      
      // Handle form submission
      document.getElementById('edit-course-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateCourse(id, editContainer);
      });
      
      // Close function
      window.closeEditForm = () => {
        document.body.removeChild(editContainer);
      };
      
    } catch (err) {
      console.error('Error loading course for edit:', err);
      alert('Error loading course for edit: ' + err.message);
    }
  };

  // ===== EDIT CHAPTER FUNCTIONS =====
  window.addEditChapter = () => {
    const container = document.getElementById('edit-chapters-container');
    const chapterIndex = container.children.length;
    
    const chapterDiv = document.createElement('div');
    chapterDiv.className = 'edit-chapter';
    chapterDiv.style.cssText = 'border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px;';
    
    chapterDiv.innerHTML = `
      <h4>Chapter ${chapterIndex + 1}</h4>
      <input type="text" placeholder="Chapter Title" class="edit-chapter-title" required />
      <button type="button" onclick="removeEditChapter(this)">Remove Chapter</button>
      <button type="button" onclick="addEditModule(this)">+ Add Module</button>
      <div class="edit-modules-container"></div>
    `;
    
    container.appendChild(chapterDiv);
  };

  window.removeEditChapter = (button) => {
    button.closest('.edit-chapter').remove();
  };

  window.addEditModule = (button) => {
    const chapter = button.closest('.edit-chapter');
    const editChapters = document.querySelectorAll('.edit-chapter');
    const chapterIndex = Array.from(editChapters).indexOf(chapter);
    const modulesContainer = chapter.querySelector('.edit-modules-container');
    const moduleIndex = modulesContainer.children.length;

    const moduleDiv = document.createElement('div');
    moduleDiv.className = 'edit-module';
    moduleDiv.style.cssText = 'border-left: 3px solid #007bff; margin: 10px 0; padding: 10px; background: #f8f9fa;';
    
    moduleDiv.innerHTML = `
      <input type="text" placeholder="Module Title" class="edit-module-title" required />
      <select class="edit-module-type">
        <option value="link">Link</option>
        <option value="file">File Upload</option>
      </select>
      
      <div class="edit-link-fields">
        <input type="text" placeholder="Thumbnail URL" class="edit-module-thumb" />
        <input type="text" placeholder="Video URL" class="edit-module-video" />
        <input type="text" placeholder="Resources URL" class="edit-module-resources" />
        <textarea placeholder="Notes" class="edit-module-notes"></textarea>
      </div>
      
      <div class="edit-file-fields" style="display: none;">
        <input type="file" class="edit-module-thumb-file" accept="image/*" />
        <input type="hidden" class="current-thumb" value="" />
        <input type="file" class="edit-module-video-file" accept="video/*" />
        <input type="hidden" class="current-video" value="" />
        <input type="file" class="edit-module-resources-file" accept=".pdf,.zip,.doc,.docx" />
        <input type="hidden" class="current-resources" value="" />
        <textarea placeholder="Notes" class="edit-module-notes-file"></textarea>
      </div>
      
      <button type="button" onclick="removeEditModule(this)">Remove Module</button>
    `;
    
    // Set name attributes for file inputs
    const thumbFile = moduleDiv.querySelector('.edit-module-thumb-file');
    thumbFile.name = `chapter_${chapterIndex}_module_${moduleIndex}_thumb`;
    const videoFile = moduleDiv.querySelector('.edit-module-video-file');
    videoFile.name = `chapter_${chapterIndex}_module_${moduleIndex}_video`;
    const resourcesFile = moduleDiv.querySelector('.edit-module-resources-file');
    resourcesFile.name = `chapter_${chapterIndex}_module_${moduleIndex}_resources`;

    modulesContainer.appendChild(moduleDiv);
    
    // Add toggle functionality
    moduleDiv.querySelector('.edit-module-type').addEventListener('change', (e) => {
      const linkFields = moduleDiv.querySelector('.edit-link-fields');
      const fileFields = moduleDiv.querySelector('.edit-file-fields');
      
      if (e.target.value === 'file') {
        linkFields.style.display = 'none';
        fileFields.style.display = 'block';
      } else {
        linkFields.style.display = 'block';
        fileFields.style.display = 'none';
      }
    });
  };

  window.removeEditModule = (button) => {
    button.closest('.edit-module').remove();
  };

  // ===== POPULATE EDIT CHAPTERS =====
  function populateEditChapters(chapters) {
    const container = document.getElementById('edit-chapters-container');
    container.innerHTML = '';
    
    chapters.forEach((chapter, chapterIndex) => {
      const chapterDiv = document.createElement('div');
      chapterDiv.className = 'edit-chapter';
      chapterDiv.style.cssText = 'border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px;';
      
      chapterDiv.innerHTML = `
        <h4>Chapter ${chapterIndex + 1}</h4>
        <input type="text" value="${chapter.title}" class="edit-chapter-title" required />
        <button type="button" onclick="removeEditChapter(this)">Remove Chapter</button>
        <button type="button" onclick="addEditModule(this)">+ Add Module</button>
        <div class="edit-modules-container"></div>
      `;
      
      container.appendChild(chapterDiv);
      
      // Populate modules
      const modulesContainer = chapterDiv.querySelector('.edit-modules-container');
      chapter.modules.forEach((module, moduleIndex) => {
        const moduleDiv = document.createElement('div');
        moduleDiv.className = 'edit-module';
        moduleDiv.style.cssText = 'border-left: 3px solid #007bff; margin: 10px 0; padding: 10px; background: #f8f9fa;';
        
        moduleDiv.innerHTML = `
          <input type="text" value="${module.title}" class="edit-module-title" required />
          <select class="edit-module-type">
            <option value="link" ${module.type === 'link' ? 'selected' : ''}>Link</option>
            <option value="file" ${module.type === 'file' ? 'selected' : ''}>File Upload</option>
          </select>
          
          <div class="edit-link-fields" style="${module.type === 'file' ? 'display: none;' : ''}">
            <input type="text" value="${module.thumbnail || ''}" placeholder="Thumbnail URL" class="edit-module-thumb" />
            <input type="text" value="${module.videoUrl || ''}" placeholder="Video URL" class="edit-module-video" />
            <input type="text" value="${module.resources || ''}" placeholder="Resources URL" class="edit-module-resources" />
            <textarea placeholder="Notes" class="edit-module-notes">${module.notes || ''}</textarea>
          </div>
          
          <div class="edit-file-fields" style="${module.type === 'file' ? 'display: block;' : 'display: none;'}">
            <input type="file" class="edit-module-thumb-file" accept="image/*" />
            <input type="hidden" class="current-thumb" value="${module.thumbnail || ''}" />
            ${module.thumbnail ? `<img src="${module.thumbnail}" style="width: 50px; margin: 5px;" alt="Current thumbnail" />` : ''}
            <input type="file" class="edit-module-video-file" accept="video/*" />
            <input type="hidden" class="current-video" value="${module.videoUrl || ''}" />
            ${module.videoUrl ? `<a href="${module.videoUrl}" target="_blank">View current video</a>` : ''}
            <input type="file" class="edit-module-resources-file" accept=".pdf,.zip,.doc,.docx" />
            <input type="hidden" class="current-resources" value="${module.resources || ''}" />
            ${module.resources ? `<a href="${module.resources}" target="_blank">View current resources</a>` : ''}
            <textarea placeholder="Notes" class="edit-module-notes-file">${module.notes || ''}</textarea>
          </div>
          
          <button type="button" onclick="removeEditModule(this)">Remove Module</button>
        `;
        
        // Set name attributes for file inputs
        const thumbFile = moduleDiv.querySelector('.edit-module-thumb-file');
        thumbFile.name = `chapter_${chapterIndex}_module_${moduleIndex}_thumb`;
        const videoFile = moduleDiv.querySelector('.edit-module-video-file');
        videoFile.name = `chapter_${chapterIndex}_module_${moduleIndex}_video`;
        const resourcesFile = moduleDiv.querySelector('.edit-module-resources-file');
        resourcesFile.name = `chapter_${chapterIndex}_module_${moduleIndex}_resources`;

        modulesContainer.appendChild(moduleDiv);
        
        // Add toggle functionality
        moduleDiv.querySelector('.edit-module-type').addEventListener('change', (e) => {
          const linkFields = moduleDiv.querySelector('.edit-link-fields');
          const fileFields = moduleDiv.querySelector('.edit-file-fields');
          
          if (e.target.value === 'file') {
            linkFields.style.display = 'none';
            fileFields.style.display = 'block';
          } else {
            linkFields.style.display = 'block';
            fileFields.style.display = 'none';
          }
        });
      });
    });
  }

  // ===== UPDATE COURSE FUNCTION =====
  async function updateCourse(courseId, editContainer) {
    const progressContainer = editContainer.querySelector('#edit-progress-container');
    const progressBar = editContainer.querySelector('#edit-progress-bar');
    const progressText = editContainer.querySelector('#edit-progress-text');
    
    const formData = new FormData();
    
    // Basic course info
    const title = editContainer.querySelector('input[name="title"]').value.trim();
    const shortDescription = editContainer.querySelector('textarea[name="shortDescription"]').value.trim();
    const longDescription = editContainer.querySelector('textarea[name="longDescription"]').value.trim();
    const category = editContainer.querySelector('select[name="category"]').value;
    const difficulty = editContainer.querySelector('select[name="difficulty"]').value;
    const featured = editContainer.querySelector('input[name="featured"]').checked;
    
    formData.append('title', title);
    formData.append('description', shortDescription);
    formData.append('longDescription', longDescription);
    formData.append('category', category);
    formData.append('difficulty', difficulty);
    formData.append('featured', featured);
    
    // Files
    const thumbnailFile = editContainer.querySelector('input[name="thumbnailFile"]');
    const videoFile = editContainer.querySelector('input[name="videoFile"]');
    const resourcesFile = editContainer.querySelector('input[name="resourcesFile"]');
    
    if (thumbnailFile?.files?.[0]) {
      formData.append('thumbnailFile', thumbnailFile.files[0]);
    }
    if (videoFile?.files?.[0]) {
      formData.append('videoFile', videoFile.files[0]);
    }
    if (resourcesFile?.files?.[0]) {
      formData.append('resourcesFile', resourcesFile.files[0]);
    }
    
    // Build chapters data
    const chapters = buildEditChaptersData(editContainer, formData);
    formData.append('chapters', JSON.stringify(chapters));
    
    try {
      const xhr = new XMLHttpRequest();
      
      if (progressContainer) progressContainer.style.display = 'block';
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          if (progressBar) progressBar.style.width = `${percentComplete}%`;
          if (progText) progText.textContent = `${percentComplete}%`;
        }
      };

      xhr.onload = () => {
        if (progressContainer) progressContainer.style.display = 'none';
        
        const result = JSON.parse(xhr.responseText);
        if (xhr.status === 200) {
          alert('Course updated successfully!');
          document.body.removeChild(editContainer);
          fetchCourses();
        } else {
          alert(result.message || 'Update failed');
        }
      };

      xhr.onerror = () => {
        if (progressContainer) progressContainer.style.display = 'none';
        alert('Network error while updating course');
      };

      xhr.open('PUT', `https://free-programming-notes.onrender.com/api/courses/${courseId}`);
      const token = localStorage.getItem('token');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
      
    } catch (error) {
      console.error('Update error:', error);
      alert(`Error updating course: ${error.message}`);
      if (progressContainer) progressContainer.style.display = 'none';
    }
  }

  // ===== BUILD EDIT CHAPTERS DATA =====
  function buildEditChaptersData(editContainer, formData) {
    const chapters = [];
    const chapterElements = editContainer.querySelectorAll('.edit-chapter');
    
    chapterElements.forEach((chapter, chapterIndex) => {
      const titleInput = chapter.querySelector('.edit-chapter-title');
      const chapterTitle = titleInput?.value?.trim() || `Chapter ${chapterIndex + 1}`;
      
      const modules = [];
      const moduleElements = chapter.querySelectorAll('.edit-module');
      
      moduleElements.forEach((module, moduleIndex) => {
        const titleInput = module.querySelector('.edit-module-title');
        const typeSelect = module.querySelector('.edit-module-type');
        
        const moduleTitle = titleInput?.value?.trim() || `Module ${moduleIndex + 1}`;
        const moduleType = typeSelect?.value || 'link';
        
        const moduleData = {
          title: moduleTitle,
          type: moduleType
        };
        
        if (moduleType === 'link') {
          moduleData.thumbnail = module.querySelector('.edit-module-thumb')?.value?.trim() || '';
          moduleData.videoUrl = module.querySelector('.edit-module-video')?.value?.trim() || '';
          moduleData.resources = module.querySelector('.edit-module-resources')?.value?.trim() || '';
          moduleData.notes = module.querySelector('.edit-module-notes')?.value?.trim() || '';
        } else {
          // Handle file uploads for modules
          const thumbFile = module.querySelector('.edit-module-thumb-file')?.files?.[0];
          const videoFile = module.querySelector('.edit-module-video-file')?.files?.[0];
          const resourcesFile = module.querySelector('.edit-module-resources-file')?.files?.[0];
          
          const fieldNamePrefix = `chapter_${chapterIndex}_module_${moduleIndex}`;
          
          if (thumbFile) {
            formData.append(`${fieldNamePrefix}_thumb`, thumbFile);
            moduleData.thumbnail = ''; // Will be replaced in backend
          } else {
            moduleData.thumbnail = module.querySelector('.current-thumb')?.value?.trim() || '';
          }
          
          if (videoFile) {
            formData.append(`${fieldNamePrefix}_video`, videoFile);
            moduleData.videoUrl = ''; // Will be replaced in backend
          } else {
            moduleData.videoUrl = module.querySelector('.current-video')?.value?.trim() || '';
          }
          
          if (resourcesFile) {
            formData.append(`${fieldNamePrefix}_resources`, resourcesFile);
            moduleData.resources = ''; // Will be replaced in backend
          } else {
            moduleData.resources = module.querySelector('.current-resources')?.value?.trim() || '';
          }
          
          moduleData.notes = module.querySelector('.edit-module-notes-file')?.value?.trim() || '';
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

  // ===== DATA BUILDING FUNCTIONS =====
  function buildChaptersData(formData) {
    const chapters = [];
    const chapterElements = document.querySelectorAll('.chapter');
    
    chapterElements.forEach((chapter, chapterIndex) => {
      const chapterTitleInput = chapter.querySelector('.chapterTitle');
      const chapterTitle = chapterTitleInput?.value?.trim() || `Chapter ${chapterIndex + 1}`;
      
      const modules = [];
      const moduleElements = chapter.querySelectorAll('.module');
      
      moduleElements.forEach((module, moduleIndex) => {
        const moduleTitleInput = module.querySelector('.moduleTitle');
        const moduleTypeSelect = module.querySelector('.moduleType');
        
        const moduleTitle = moduleTitleInput?.value?.trim() || `Module ${moduleIndex + 1}`;
        const moduleType = moduleTypeSelect?.value || 'link';
        
        const moduleData = {
          title: moduleTitle,
          type: moduleType
        };
        
        if (moduleType === 'link') {
          const thumbnailInput = module.querySelector('.moduleThumbnail');
          const videoInput = module.querySelector('.moduleVideo');
          const resourcesInput = module.querySelector('.moduleResources');
          const notesTextarea = module.querySelector('.moduleNotes');
          
          moduleData.thumbnail = thumbnailInput?.value?.trim() || '';
          moduleData.videoUrl = videoInput?.value?.trim() || '';
          moduleData.resources = resourcesInput?.value?.trim() || '';
          moduleData.notes = notesTextarea?.value?.trim() || '';
        } else {
          const thumbFile = module.querySelector('.thumbnailFile')?.files?.[0];
          const videoFile = module.querySelector('.videoFile')?.files?.[0];
          const resourcesFile = module.querySelector('.resourcesFile')?.files?.[0];
          
          const fieldNamePrefix = `chapter_${chapterIndex}_module_${moduleIndex}`;
          
          if (thumbFile) {
            formData.append(`${fieldNamePrefix}_thumb`, thumbFile);
            moduleData.thumbnail = ''; // Backend will set the URL
          }
          
          if (videoFile) {
            formData.append(`${fieldNamePrefix}_video`, videoFile);
            moduleData.videoUrl = ''; // Backend will set the URL
          }
          
          if (resourcesFile) {
            formData.append(`${fieldNamePrefix}_resources`, resourcesFile);
            moduleData.resources = ''; // Backend will set the URL
          }
          
          moduleData.notes = module.querySelector('.moduleNotesFile')?.value?.trim() || '';
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

  // ===== FETCH AND DISPLAY FUNCTIONS =====
  async function fetchBooks() {
    if (!bookListSection || !bookList) return;
    try {
      const response = await fetch('https://free-programming-notes.onrender.com/api/books', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch books');
      const books = await response.json();
      
      bookList.innerHTML = books.map(book => `
        <div class="book-item">
          <img src="${book.imageUrl}" alt="${book.title}" style="width: 100px; height: auto;">
          <h3>${book.title}</h3>
          <p>${book.description}</p>
          <p><strong>Category:</strong> ${book.category}</p>
          <button onclick="editBook('${book._id}', '${book.title}', '${book.description}', '${book.category}')">Edit</button>
          <button onclick="deleteBook('${book._id}')">Delete</button>
        </div>
      `).join('');
    } catch (err) {
      console.error('Error fetching books:', err);
      if (bookList) bookList.innerHTML = `<p>Error loading books: ${err.message}</p>`;
    }
  }

  async function fetchCourses() {
    if (!courseListSection || !courseList) return;
    try {
      const response = await fetch('https://free-programming-notes.onrender.com/api/courses', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch courses');
      const courses = await response.json();
      
      courseList.innerHTML = courses.map(course => {
        const escapedTitle = course.title.replace(/'/g, "\\'");
        const escapedShortDesc = course.shortDescription.replace(/'/g, "\\'");
        return `
        <div class="course-item">
          <img src="${course.thumbnail || 'https://placehold.co/100x100'}" alt="${course.title}" style="width: 100px; height: auto;">
          <h3>${course.title}</h3>
          <p>${course.shortDescription}</p>
          <p><strong>Chapters:</strong> ${course.chapters?.length || 0}</p>
          <p><strong>Category:</strong> ${course.category}</p>
          <p><strong>Difficulty:</strong> ${course.difficulty}</p>
          <button onclick="editCourse('${course._id}', '${escapedTitle}', '${escapedShortDesc}')">Edit Course</button>
          <button onclick="deleteCourse('${course._id}')">Delete Course</button>
        </div>
      `;
      }).join('');
    } catch (err) {
      console.error('Error fetching courses:', err);
      if (courseList) courseList.innerHTML = `<p>Error loading courses: ${err.message}</p>`;
    }
  }

  // ===== COURSE DELETE FUNCTION =====
  window.deleteCourse = async (id) => {
    if (confirm('Are you sure you want to delete this course?')) {
      try {
        const response = await fetch(`https://free-programming-notes.onrender.com/api/courses/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Failed to delete course');
        fetchCourses();
        alert('Course deleted successfully!');
      } catch (err) {
        console.error('Error deleting course:', err);
        alert('Error deleting course: ' + err.message);
      }
    }
  };

  // ===== BOOK EDIT/DELETE FUNCTIONS =====
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
        if (!response.ok) throw new Error('Failed to update book');
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

  window.deleteBook = async (id) => {
    if (confirm('Are you sure you want to delete this book?')) {
      try {
        const response = await fetch(`https://free-programming-notes.onrender.com/api/books/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Failed to delete book');
        fetchBooks();
        alert('Book deleted successfully!');
      } catch (err) {
        console.error('Error deleting book:', err);
        alert('Error deleting book: ' + err.message);
      }
    }
  };

  // ===== INITIAL LOAD =====
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
                moduleData.thumbnail = ''; // Backend will upload and set URL
              }
              if (vF) { 
                fd.append(`chapter_${chapterIndex}_module_${moduleIndex}_video`, vF); 
                moduleData.videoUrl = ''; // Backend will upload and set URL
              }
              if (rF) { 
                fd.append(`chapter_${chapterIndex}_module_${moduleIndex}_resources`, rF); 
                moduleData.resources = ''; // Backend will upload and set URL
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