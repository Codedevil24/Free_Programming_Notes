document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const bookList = document.getElementById('book-list');
        const navbarLinks = document.getElementById('navbar-links');
        const adminLink = navbarLinks ? navbarLinks.querySelector('.admin-only') : null;
        const adminLoginLink = navbarLinks ? navbarLinks.querySelector('.admin-login') : null;
        const logoutLink = navbarLinks ? document.getElementById('logout-link') : null;
        const searchBar = document.getElementById('search-bar');
        const categoryList = document.getElementById('category-list');
        let allBooks = [];
        let currentCategory = 'All';

        // JWT Decode Fallback Improvement
        if (typeof jwt_decode === 'undefined') {
            console.warn('jwt-decode CDN failed to load, attempting local fallback');
            const script = document.createElement('script');
            script.src = '/js/jwt-decode.js';
            script.onload = () => console.log('Local jwt-decode loaded');
            script.onerror = () => console.error('Local jwt-decode failed to load');
            document.body.appendChild(script);
        }

        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwt_decode(token);
                const now = Date.now() / 1000;
                if (decoded.exp < now) {
                    localStorage.removeItem('token');
                    if (adminLink) adminLink.style.display = 'none';
                    if (adminLoginLink) adminLoginLink.style.display = 'block';
                    if (logoutLink) logoutLink.style.display = 'none';
                } else {
                    if (adminLink) adminLink.style.display = 'block';
                    if (adminLoginLink) adminLoginLink.style.display = 'none';
                    if (logoutLink) logoutLink.style.display = 'block';
                }
            } catch (err) {
                console.error('Token validation error:', err);
                localStorage.removeItem('token');
                if (adminLink) adminLink.style.display = 'none';
                if (adminLoginLink) adminLoginLink.style.display = 'block';
                if (logoutLink) logoutLink.style.display = 'none';
            }
        } else {
            if (adminLink) adminLink.style.display = 'none';
            if (adminLoginLink) adminLoginLink.style.display = 'block';
            if (logoutLink) logoutLink.style.display = 'none';
        }

        // Menu Toggle Functionality
        const menuIcon = document.getElementById('menu-icon');
        const closeIcon = document.getElementById('close-icon');
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
        } else {
            console.warn('Menu toggle elements not found, skipping initialization.');
        }

        // Logout Functionality
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                if (adminLink) adminLink.style.display = 'none';
                if (adminLoginLink) adminLoginLink.style.display = 'block';
                if (logoutLink) logoutLink.style.display = 'none';
                alert('Logged out successfully!');
                window.location.reload();
            });
        }

        async function fetchBooksWithRetry(searchQuery = '', category = 'All', retries = 3) {
            for (let i = 0; i < retries; i++) {
                try {
                    console.log(`Fetching books (attempt ${i + 1})...`);
                    const response = await fetch('https://free-programming-notes.onrender.com/api/books');
                    console.log('Fetch response status:', response.status);
                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error('Fetch books failed with status:', response.status, 'Response:', errorData);
                        throw new Error(errorData.message || 'Failed to fetch books');
                    }
                    allBooks = await response.json();
                    console.log('Books fetched:', allBooks);
                    let filteredBooks = allBooks;
                    if (searchQuery) {
                        filteredBooks = filteredBooks.filter(book =>
                            book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            book.description.toLowerCase().includes(searchQuery.toLowerCase())
                        );
                    }
                    if (category !== 'All') {
                        filteredBooks = filteredBooks.filter(book => book.category === category);
                    }
                    if (bookList) {
                        bookList.innerHTML = filteredBooks.map(book => `
                            <div class="book" data-id="${book._id}">
                                <img src="${book.imageUrl}" alt="${book.title}" onerror="this.src='fallback-image.jpg'">
                                <h3>${book.title}</h3>
                                <p>${book.description}</p>
                                <p><strong>Category:</strong> ${book.category}</p>
                                <a href="/book-details.html?id=${book._id}" class="view-details">View Details</a>
                            </div>
                        `).join('');
                    }
                    return;
                } catch (err) {
                    console.error(`Fetch attempt ${i + 1} failed:`, err);
                    if (i === retries - 1 && bookList) {
                        bookList.innerHTML = `<p>Error loading books: ${err.message}. Please try again later.</p>`;
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        function getRandomItems(array, count) {
            const shuffled = array.sort(() => 0.5 - Math.random());
            return shuffled.slice(0, Math.min(count, shuffled.length));
        }

        if (searchBar) {
            searchBar.addEventListener('input', () => {
                fetchBooksWithRetry(searchBar.value, currentCategory);
            });
        }

        if (categoryList) {
            categoryList.querySelectorAll('li').forEach(categoryItem => {
                categoryItem.addEventListener('click', () => {
                    currentCategory = categoryItem.dataset.category;
                    categoryList.querySelectorAll('li').forEach(item => item.classList.remove('active'));
                    categoryItem.classList.add('active');
                    fetchBooksWithRetry(searchBar ? searchBar.value : '', currentCategory);
                });
            });
        }

        fetchBooksWithRetry();
    }, 100);
});