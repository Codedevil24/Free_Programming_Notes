document.addEventListener('DOMContentLoaded', () => {
    const bookList = document.getElementById('book-list');
    const searchBar = document.getElementById('search-bar');
    const categoryList = document.getElementById('category-list');
    const bookModal = document.getElementById('book-modal');
    const closeModal = document.getElementById('close-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');
    const modalCategory = document.getElementById('modal-category');
    const modalImage = document.getElementById('modal-image');
    const modalNotesPreview = document.getElementById('modal-notes-preview');
    const modalDownload = document.getElementById('modal-download');
    const suggestions = document.getElementById('suggestions');
    const navbarLinks = document.getElementById('navbar-links');
    const menuIcon = document.getElementById('menu-icon');
    const closeIcon = document.getElementById('close-icon');
    const logoutLink = document.getElementById('logout-link');

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
            } else {
                updateAuthDisplay(true);
            }
        } catch (err) {
            console.error('Token validation error:', err);
            localStorage.removeItem('token');
            updateAuthDisplay(false);
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
            alert('Logged out successfully!');
            window.location.href = '/index.html';
        });
    }

    // Fetch and Display Books
    async function fetchBooks(category = 'All') {
        try {
            const response = await fetch(`https://free-programming-notes.onrender.com/api/books?category=${category}`);
            if (!response.ok) throw new Error('Failed to fetch books: ' + response.statusText);
            const books = await response.json();
            console.log('Books fetched:', books); // Debug log
            bookList.innerHTML = books.map(book => `
                <div class="book" data-id="${book._id}">
                    <h3>${book.title}</h3>
                    <p>${book.description}</p>
                    <img src="${book.image || 'https://via.placeholder.com/100'}" alt="${book.title}" style="max-width: 100px;" onerror="this.src='https://via.placeholder.com/100';">
                    <button onclick="showBookDetails('${book._id}')">View</button>
                </div>
            `).join('');
        } catch (err) {
            console.error('Error fetching books:', err);
            bookList.innerHTML = '<p>Error loading books: ' + err.message + '</p>';
        }
    }

    // Show Book Details in Modal
    window.showBookDetails = async (id) => {
        try {
            const response = await fetch(`https://free-programming-notes.onrender.com/api/books/${id}`);
            if (!response.ok) throw new Error('Failed to fetch book details: ' + response.statusText);
            const book = await response.json();
            console.log('Book details fetched:', book); // Debug log
            if (modalTitle) modalTitle.textContent = book.title || 'Untitled';
            if (modalDescription) modalDescription.textContent = book.description || 'No description available';
            if (modalCategory) modalCategory.textContent = book.category || 'Uncategorized';
            if (modalImage) {
                modalImage.src = book.image || 'https://via.placeholder.com/100';
                modalImage.onerror = () => { modalImage.src = 'https://via.placeholder.com/100'; };
            }
            if (modalNotesPreview) modalNotesPreview.src = book.pdf ? `https://docs.google.com/viewer?url=${encodeURIComponent(book.pdf)}&embedded=true` : '';
            if (modalDownload) {
                modalDownload.href = book.pdf || '#';
                modalDownload.textContent = book.pdf ? 'Download PDF' : 'No PDF Available';
            }

            // Fetch and display suggestions
            const allBooksResponse = await fetch('https://free-programming-notes.onrender.com/api/books');
            if (!allBooksResponse.ok) throw new Error('Failed to fetch all books');
            const allBooks = await allBooksResponse.json();
            const otherBooks = allBooks.filter(b => b._id !== id);
            const randomSuggestions = getRandomItems(otherBooks, 5).slice(0, 5);
            if (suggestions) suggestions.innerHTML = randomSuggestions.map(suggestion => `
                <p><a href="#" onclick="showBookDetails('${suggestion._id}')">${suggestion.title}</a></p>
            `).join('');

            if (bookModal) bookModal.style.display = 'block';
        } catch (err) {
            console.error('Error loading book details:', err);
            if (modalTitle) modalTitle.textContent = 'Error loading details';
            if (modalDescription) modalDescription.textContent = err.message;
            if (modalImage) modalImage.src = 'https://via.placeholder.com/100';
            if (modalNotesPreview) modalNotesPreview.src = '';
            if (modalDownload) {
                modalDownload.href = '#';
                modalDownload.textContent = 'No PDF Available';
            }
            if (bookModal) bookModal.style.display = 'block';
        }
    };

    // Close Modal
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            if (bookModal) bookModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (bookModal && e.target === bookModal) {
            bookModal.style.display = 'none';
        }
    });

    // Search Functionality
    if (searchBar) {
        searchBar.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            fetchBooks().then(books => {
                const filteredBooks = books.filter(book =>
                    book.title.toLowerCase().includes(query) ||
                    book.description.toLowerCase().includes(query)
                );
                bookList.innerHTML = filteredBooks.map(book => `
                    <div class="book" data-id="${book._id}">
                        <h3>${book.title}</h3>
                        <p>${book.description}</p>
                        <img src="${book.image || 'https://via.placeholder.com/100'}" alt="${book.title}" style="max-width: 100px;" onerror="this.src='https://via.placeholder.com/100';">
                        <button onclick="showBookDetails('${book._id}')">View</button>
                    </div>
                `).join('');
            });
        });
    }

    // Category Filter
    if (categoryList) {
        categoryList.addEventListener('click', (e) => {
            if (e.target.tagName === 'LI') {
                const category = e.target.getAttribute('data-category');
                fetchBooks(category);
                categoryList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
                e.target.classList.add('active');
            }
        });
    }

    // Initial Fetch
    fetchBooks();

    function getRandomItems(array, count) {
        const shuffled = array.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, array.length));
    }
});