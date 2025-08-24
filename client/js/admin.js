document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const bookForm = document.getElementById('book-form');
    const bookListSection = document.getElementById('book-list-section');
    const bookList = document.getElementById('book-list');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const navbarLinks = document.getElementById('navbar-links');
    const menuIcon = document.getElementById('menu-icon');
    const closeIcon = document.getElementById('close-icon');
    const logoutLink = document.getElementById('logout'); // Matches admin.html

    if (!loginForm || !bookForm || !bookListSection || !bookList || !progressBar || !progressText || !navbarLinks || !menuIcon || !closeIcon || !logoutLink) {
        console.warn('One or more DOM elements not found, check IDs:', {
            loginForm, bookForm, bookListSection, bookList, progressBar, progressText, navbarLinks, menuIcon, closeIcon, logoutLink
        });
        return;
    }

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

    logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        loginForm.style.display = 'block';
        bookForm.style.display = 'none';
        bookListSection.style.display = 'none';
        document.querySelector('.admin-only').style.display = 'none';
        document.querySelector('.admin-login').style.display = 'block';
        document.querySelector('.logout').style.display = 'none';
        alert('Logged out successfully!');
    });

    const token = localStorage.getItem('token');
    if (token) {
        try {
            const decoded = jwt_decode(token);
            if (decoded.exp < Date.now() / 1000) {
                localStorage.removeItem('token');
                loginForm.style.display = 'block';
                bookForm.style.display = 'none';
                bookListSection.style.display = 'none';
                document.querySelector('.admin-only').style.display = 'none';
                document.querySelector('.admin-login').style.display = 'block';
                document.querySelector('.logout').style.display = 'none';
            } else {
                loginForm.style.display = 'none';
                bookForm.style.display = 'block';
                bookListSection.style.display = 'block';
                document.querySelector('.admin-only').style.display = 'block';
                document.querySelector('.admin-login').style.display = 'none';
                document.querySelector('.logout').style.display = 'block';
                fetchBooks();
            }
        } catch (err) {
            console.error('Token validation error:', err);
            localStorage.removeItem('token');
            loginForm.style.display = 'block';
            bookForm.style.display = 'none';
            bookListSection.style.display = 'none';
            document.querySelector('.admin-only').style.display = 'none';
            document.querySelector('.admin-login').style.display = 'block';
            document.querySelector('.logout').style.display = 'none';
        }
    } else {
        loginForm.style.display = 'block';
        bookForm.style.display = 'none';
        bookListSection.style.display = 'none';
        document.querySelector('.admin-only').style.display = 'none';
        document.querySelector('.admin-login').style.display = 'block';
        document.querySelector('.logout').style.display = 'none';
    }

    async function loginWithRetry(username, password, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                console.log(`Login attempt ${i + 1}:`, { username, password: password ? 'provided' : 'missing' });
                const response = await fetch('https://free-programming-notes.onrender.com/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                console.log('Login response status:', response.status);
                const data = await response.json();
                if (!response.ok) {
                    console.error('Login failed:', data);
                    throw new Error(data.message || 'Login failed');
                }
                return data;
            } catch (err) {
                console.error(`Login attempt ${i + 1} failed:`, err);
                if (i === retries - 1) throw err;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        try {
            const data = await loginWithRetry(username, password);
            localStorage.setItem('token', data.token);
            loginForm.style.display = 'none';
            bookForm.style.display = 'block';
            bookListSection.style.display = 'block';
            document.querySelector('.admin-only').style.display = 'block';
            document.querySelector('.admin-login').style.display = 'none';
            document.querySelector('.logout').style.display = 'block';
            fetchBooks();
            alert('Login successful!');
        } catch (err) {
            console.error('Login error:', err);
            alert('Login failed: ' + err.message);
        }
    });

    async function fetchBooks() {
        try {
            const response = await fetch('https://free-programming-notes.onrender.com/api/books', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch books');
            }
            const books = await response.json();
            bookList.innerHTML = books.map(book => `
                <div class="book" data-id="${book._id}">
                    <img src="${book.imageUrl}" alt="${book.title}" onerror="this.src='fallback-image.jpg'">
                    <h3>${book.title}</h3>
                    <p>${book.description}</p>
                    <p><strong>Category:</strong> ${book.category}</p>
                    <button onclick="editBook('${book._id}', '${book.title}', '${book.description}', '${book.category}')">Edit</button>
                    <button onclick="deleteBook('${book._id}')">Delete</button>
                </div>
            `).join('');
        } catch (err) {
            console.error('Error fetching books:', err);
            bookList.innerHTML = '<p>Error loading books: ' + err.message + '</p>';
        }
    }

    window.editBook = async (id, title, description, category) => {
        console.log('Edit book:', id);
        const editForm = document.createElement('form');
        editForm.id = 'edit-book-form';
        editForm.innerHTML = `
            <h2>Edit Book</h2>
            <input type="text" id="edit-title" value="${title}" name="title" required>
            <textarea id="edit-description" name="description" required>${description}</textarea>
            <select id="edit-category" name="category" required>
                <option value="Programming" ${category === 'Programming' ? 'selected' : ''}>Programming</option>
                <option value="Algorithms" ${category === 'Algorithms' ? 'selected' : ''}>Algorithms</option>
                <option value="Data Science" ${category === 'Data Science' ? 'selected' : ''}>Data Science</option>
                <option value="Web Development" ${category === 'Web Development' ? 'selected' : ''}>Web Development</option>
            </select>
            <input type="file" id="edit-image" name="image" accept="image/*">
            <input type="file" id="edit-pdf" name="pdf" accept=".pdf">
            <button type="submit">Update Book</button>
            <button type="button" id="cancel-edit">Cancel</button>
        `;
        bookListSection.appendChild(editForm);
        bookForm.style.display = 'none';

        document.getElementById('cancel-edit').addEventListener('click', () => {
            editForm.remove();
            bookForm.style.display = 'block';
        });

        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData();
            formData.append('title', document.getElementById('edit-title').value);
            formData.append('description', document.getElementById('edit-description').value);
            formData.append('category', document.getElementById('edit-category').value);
            const imageFile = document.getElementById('edit-image').files[0];
            const pdfFile = document.getElementById('edit-pdf').files[0];
            if (imageFile) formData.append('image', imageFile);
            if (pdfFile) formData.append('pdf', pdfFile);

            try {
                const response = await fetch(`https://free-programming-notes.onrender.com/api/books/${id}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: formData
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to update book');
                }
                const data = await response.json();
                alert('Book updated successfully!');
                editForm.remove();
                bookForm.style.display = 'block';
                fetchBooks();
            } catch (err) {
                console.error('Error updating book:', err);
                alert('Error updating book: ' + err.message);
            }
        });
    };

    window.deleteBook = async (id) => {
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
    };

    bookForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(bookForm);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://free-programming-notes.onrender.com/api/books', true);
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
                fetchBooks();
                alert('Book added successfully!');
                bookForm.reset();
            } else {
                const data = JSON.parse(xhr.responseText);
                alert(data.message || 'Failed to add book');
            }
        };

        xhr.onerror = () => {
            progressContainer.style.display = 'none';
            alert('Error adding book');
        };

        xhr.send(formData);
    });
});