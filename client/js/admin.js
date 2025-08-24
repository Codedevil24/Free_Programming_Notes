document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const uploadSection = document.getElementById('upload-section');
    const uploadType = document.getElementById('upload-type');
    const notesForm = document.getElementById('notes-form');
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

    // Toggle between notes and courses
    uploadType.addEventListener('change', (e) => {
        if (e.target.value === 'notes') {
            notesForm.style.display = 'block';
            courseForm.style.display = 'none';
            bookListSection.style.display = 'block';
            courseListSection.style.display = 'none';
            fetchBooks();
        } else {
            notesForm.style.display = 'none';
            courseForm.style.display = 'block';
            bookListSection.style.display = 'none';
            courseListSection.style.display = 'block';
            fetchCourses();
        }
    });

    // Add module field for courses
    addModuleBtn.addEventListener('click', () => {
        const modulesContainer = document.getElementById('modules-container');
        const newModule = document.createElement('div');
        newModule.className = 'module';
        newModule.innerHTML = `
            <input type="text" name="module-title" placeholder="Module Title" required>
            <textarea name="module-description" placeholder="Module Description" required></textarea>
        `;
        modulesContainer.appendChild(newModule);
    });

    // Existing notes code preserved
    // ... (your original notes upload, fetchBooks, editBook, deleteBook, etc.)

    // New code for courses
    async function fetchCourses() {
        try {
            const response = await fetch('https://free-programming-notes.onrender.com/api/courses', {
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
        xhr.open('POST', 'https://free-programming-notes.onrender.com/api/courses', true);
        xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);

        const progressContainer = document.querySelector('.progress-container');
        progressContainer.style.display = 'block';
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                progressBar.style.width = `${percentComplete}%`;
                progressText.textContent = `${percentComplete}%`;
            }
        };

        xhr.onload = () => {
            progressContainer.style.display = 'none';
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
            progressContainer.style.display = 'none';
            alert('Error adding course');
        };

        xhr.send(formData);
    });

    window.editCourse = async (id, title, description) => {
        console.log('Edit course:', id);
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
        courseListSection.appendChild(editForm);
        courseForm.style.display = 'none';

        document.getElementById('cancel-edit').addEventListener('click', () => {
            editForm.remove();
            courseForm.style.display = 'block';
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
                if (!response.ok) throw new Error('Failed to update course');
                const data = await response.json();
                alert('Course updated successfully!');
                editForm.remove();
                courseForm.style.display = 'block';
                fetchCourses();
            } catch (err) {
                console.error('Error updating course:', err);
                alert('Error updating course: ' + err.message);
            }
        });
    };

    window.deleteCourse = async (id) => {
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
    };

    // Existing notes code preserved
    // ...
});