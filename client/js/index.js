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

    // FIXED: Fetch and Display Books with proper category filtering and VIEW BUTTON RESTORED
    async function fetchBooks(category = 'All') {
        try {
            const headers = {};
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            // FIXED: Proper URL construction for category filtering
            const url = category === 'All' 
                ? 'https://free-programming-notes.onrender.com/api/books'
                : `https://free-programming-notes.onrender.com/api/books?category=${encodeURIComponent(category)}`;
            
            const response = await fetch(url, { headers });
            if (!response.ok) throw new Error('Failed to fetch books: ' + response.statusText);
            const books = await response.json();
            console.log('Books fetched from API:', books);
            
            if (bookList) {
                // FIXED: Handle empty results and RESTORED VIEW BUTTON
                if (!books || books.length === 0) {
                    bookList.innerHTML = '<p>No books found for this category.</p>';
                } else {
                    bookList.innerHTML = books.map(book => `
                        <div class="book" data-id="${book._id}">
                            <h3>${book.title}</h3>
                            <p>${book.description}</p>
                            <p><strong>Category:</strong> ${book.category || 'Uncategorized'}</p>
                            <img src="${book.imageUrl || 'https://placehold.co/100x100'}" alt="${book.title}" style="max-width: 150px;" onerror="this.onerror=null; this.src='https://placehold.co/100x100';">
                            <button onclick="showBookDetails('${book._id}')">View</button>
                        </div>
                    `).join('');
                }
            } else {
                console.error('bookList element not found');
            }
            return books || [];
        } catch (err) {
            console.error('Error fetching books:', err);
            if (bookList) {
                bookList.innerHTML = '<p>Error loading books: ' + err.message + '</p>';
            } else {
                console.error('bookList element not found to display error');
            }
            return [];
        }
    }

    // Show Book Details by Redirecting to a New Page
    window.showBookDetails = async (id) => {
        try {
            const headers = {};
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const response = await fetch(`https://free-programming-notes.onrender.com/api/books/${id}`, { headers });
            if (!response.ok) {
                throw new Error(`Failed to fetch book details: ${response.status} ${response.statusText}`);
            }
            const book = await response.json();
            console.log('Book details fetched:', book);
            window.location.href = `/book-details.html?id=${id}`;
        } catch (err) {
            console.error('Error loading book details:', err);
            alert('Book not found. Please try again or contact support.');
        }
    };

    // Close Modal (keeping for consistency, though not used)
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

    // Search Functionality - WITH VIEW BUTTON RESTORED
    if (searchBar) {
        searchBar.addEventListener('input', async (e) => {
            const query = e.target.value.toLowerCase();
            const books = await fetchBooks();
            const filteredBooks = books.filter(book =>
                book.title.toLowerCase().includes(query) ||
                book.description.toLowerCase().includes(query)
            );
            if (bookList) {
                if (filteredBooks.length === 0) {
                    bookList.innerHTML = '<p>No books found matching your search.</p>';
                } else {
                    bookList.innerHTML = filteredBooks.map(book => `
                        <div class="book" data-id="${book._id}">
                            <h3>${book.title}</h3>
                            <p>${book.description}</p>
                            <p><strong>Category:</strong> ${book.category || 'Uncategorized'}</p>
                            <img src="${book.imageUrl || 'https://placehold.co/100x100'}" alt="${book.title}" style="max-width: 150px;" onerror="this.onerror=null; this.src='https://placehold.co/100x100';">
                            <button onclick="showBookDetails('${book._id}')">View</button>
                        </div>
                    `).join('');
                }
            } else {
                console.error('bookList element not found for search');
            }
        });
    }

    // FIXED: Category Filter with proper active state and VIEW BUTTON RESTORED
    if (categoryList) {
        categoryList.addEventListener('click', async (e) => {
            if (e.target.tagName === 'LI' && e.target.classList.contains('category-btn')) {
                const category = e.target.getAttribute('data-category');
                console.log('Filtering by category:', category);
                
                // Update active state
                categoryList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
                e.target.classList.add('active');
                
                // FIXED: Use updated fetchBooks function that handles empty results properly
                try {
                    await fetchBooks(category);
                } catch (err) {
                    console.error('Category filter error:', err);
                }
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
