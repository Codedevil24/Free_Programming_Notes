document.addEventListener('DOMContentLoaded', () => {
    const categoryList = document.getElementById('category-list');
    const bookList = document.getElementById('book-list');
    const navbarLinks = document.getElementById('navbar-links');
    const menuIcon = document.getElementById('menu-icon');
    const closeIcon = document.getElementById('close-icon');
    const logoutLink = document.getElementById('logout-link');

    // Set initial menu state
    if (menuIcon) menuIcon.style.display = 'block';
    if (closeIcon) closeIcon.style.display = 'none';
    if (navbarLinks) navbarLinks.classList.remove('show');

    // Menu toggle functionality
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

    // Auth display
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

    // JWT Authentication
    const token = localStorage.getItem('token');
    if (token && window.jwt_decode) {
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

    // Logout functionality
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            updateAuthDisplay(false);
            alert('Logged out successfully!');
            window.location.href = '/index.html';
        });
    }

    // Fetch books by category
    async function fetchBooksByCategory(category) {
        try {
            const headers = {};
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const url = category === 'All' 
                ? 'https://free-programming-notes.onrender.com/api/books'
                : `https://free-programming-notes.onrender.com/api/books?category=${encodeURIComponent(category)}`;
            
            const response = await fetch(url, { headers });
            if (!response.ok) throw new Error('Failed to fetch books: ' + response.statusText);
            const books = await response.json();
            
            if (bookList) {
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
            }
            return books || [];
        } catch (err) {
            console.error('Error fetching books:', err);
            if (bookList) {
                bookList.innerHTML = '<p>Error loading books: ' + err.message + '</p>';
            }
            return [];
        }
    }

    // Show book details
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

    // Category filter functionality
    if (categoryList) {
        categoryList.addEventListener('click', async (e) => {
            if (e.target.tagName === 'LI' && e.target.classList.contains('category-btn')) {
                const category = e.target.getAttribute('data-category');
                console.log('Filtering by category:', category);
                
                // Update active state
                categoryList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
                e.target.classList.add('active');
                
                // Fetch and display books for selected category
                await fetchBooksByCategory(category);
            }
        });
    }

    // Initial load - show all books
    fetchBooksByCategory('All');
});