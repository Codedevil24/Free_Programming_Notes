document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const uploadSection = document.getElementById('upload-section');
    const uploadType = document.getElementById('upload-type');
    const notesForm = document.getElementById('book-form'); // Updated to match HTML id
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
    const addModuleBtn = document.getElementById('add-module');
    const message = document.getElementById('message');

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
                uploadSection.style.display = 'none';
                bookListSection.style.display = 'none';
                courseListSection.style.display = 'none';
                if (message) message.textContent = 'Session expired. Please log in again.';
            } else {
                updateAuthDisplay(true);
                uploadSection.style.display = 'block';
                fetchBooks();
                fetchCourses();
            }
        } catch (err) {
            console.error('Token validation error:', err);
            localStorage.removeItem('token');
            updateAuthDisplay(false);
            uploadSection.style.display = 'none';
            bookListSection.style.display = 'none';
            courseListSection.style.display = 'none';
            if (message) message.textContent = 'Invalid session. Please log in again.';
        }
    } else {
        updateAuthDisplay(false);
        uploadSection.style.display = 'none';
        bookListSection.style.display = 'none';
        courseListSection.style.display = 'none';
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
            uploadSection.style.display = 'none';
            bookListSection.style.display = 'none';
            courseListSection.style.display = 'none';
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
                const response = await fetch('https://free-programming-notes-1.onrender.com/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    updateAuthDisplay(true);
                    uploadSection.style.display = 'block';
                    loginForm.style.display = 'none';
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

    // Add module field for courses
    if (addModuleBtn) {
        addModuleBtn.addEventListener('click', () => {
            const modulesContainer = document.getElementById('modules-container');
            if (modulesContainer) {
                const newModule = document.createElement('div');
                newModule.className = 'module';
                newModule.innerHTML = `
                    <input type="text" name="module-title" placeholder="Module Title" required>
                    <textarea name="module-description" placeholder="Module Description" required></textarea>
                `;
                modulesContainer.appendChild(newModule);
            }
        });
    }

    // Fetch and Display Books
    async function fetchBooks() {
        if (!bookListSection || !bookList) return;
        try {
            const response = await fetch('https://free-programming-notes-1.onrender.com/api/books', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error('Failed to fetch books');
            const books = await response.json();
            bookList.innerHTML = books.map(book => `
                <div class="book" data-id="${book._id}">
                    <h3>${book.title}</h3>
                    <p>${book.description}</p>
                    <button onclick="editBook('${book._id}', '${book.title}', '${book.description}', '${book.category}')">Edit</button>
                    <button onclick="deleteBook('${book._id}')">Delete</button>
                </div>
            `).join('');
        } catch (err) {
            console.error('Error fetching books:', err);
            bookList.innerHTML = '<p>Error loading books: ' + err.message + '</p>';
        }
    }

    // Notes Upload
    if (notesForm) {
        notesForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(notesForm);
            const xhr = new XMLHttpRequest();
            xhr.open('POST', 'https://free-programming-notes-1.onrender.com/api/books', true);
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
                    notesForm.reset();
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
            <h2>Edit Book</h2>
            <input type="text" id="edit-title" value="${title}" name="title" required>
            <textarea id="edit-description" name="description" required>${description}</textarea>
            <select id="edit-category" name="category" required>
                <option value="${category}" selected>${category}</option>
                <option value="Programming">Programming</option>
                <option value="Algorithms">Algorithms</option>
                <option value="Data Science">Data Science</option>
                <option value="Web Development">Web Development</option>
            </select>
            <input type="file" id="edit-image" name="image" accept="image/*">
            <input type="file" id="edit-pdf" name="pdf" accept=".pdf">
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
                const response = await fetch(`https://free-programming-notes-1.onrender.com/api/books/${id}`, {
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

    // Delete Book
    window.deleteBook = async (id) => {
        try {
            const response = await fetch(`https://free-programming-notes-1.onrender.com/api/books/${id}`, {
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
    };

    // Fetch and Display Courses
    async function fetchCourses() {
        if (!courseListSection || !courseList) return;
        try {
            const response = await fetch('https://free-programming-notes-1.onrender.com/api/courses', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error('Failed to fetch courses');
            const courses = await response.json();
            courseList.innerHTML = courses.map(course => `
                <div class="course" data-id="${course._id}">
                    <h3>${course.title}</h3>
                    <p>${course.description}</p>
                    <button onclick="editCourse('${course._id}', '${course.title}', '${course.description}')">Edit</button>
                    <button onclick="deleteCourse('${course._id}')">Delete</button>
                </div>
            `).join('');
        } catch (err) {
            console.error('Error fetching courses:', err);
            courseList.innerHTML = '<p>Error loading courses: ' + err.message + '</p>';
        }
    }

    // Course Upload
    if (courseForm) {
        courseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(courseForm);
            const modules = [];
            document.querySelectorAll('.module').forEach(module => {
                modules.push({
                    title: module.querySelector('[name="module-title"]').value,
                    description: module.querySelector('[name="module-description"]').value
                });
            });
            formData.append('modules', JSON.stringify(modules));

            const xhr = new XMLHttpRequest();
            xhr.open('POST', 'https://free-programming-notes-1.onrender.com/api/courses', true);
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
                    fetchCourses();
                    alert('Course added successfully!');
                    courseForm.reset();
                } else {
                    const data = JSON.parse(xhr.responseText);
                    alert(data.message || 'Failed to add course');
                }
            };

            xhr.onerror = () => {
                if (progressContainer) progressContainer.style.display = 'none';
                alert('Error adding course');
            };

            xhr.send(formData);
        });
    }

    // Edit Course
    window.editCourse = async (id, title, description) => {
        const editForm = document.createElement('form');
        editForm.id = 'edit-course-form';
        editForm.innerHTML = `
            <h2>Edit Course</h2>
            <input type="text" id="edit-course-title" value="${title}" name="title" required>
            <textarea id="edit-course-description" name="description" required>${description}</textarea>
            <input type="file" id="edit-thumbnail" name="thumbnail" accept="image/*">
            <input type="file" id="edit-video" name="video" accept="video/*">
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
                const response = await fetch(`https://free-programming-notes-1.onrender.com/api/courses/${id}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: formData
                });
                if (!response.ok) throw new Error('Failed to update course');
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
            const response = await fetch(`https://free-programming-notes-1.onrender.com/api/courses/${id}`, {
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
    };
});