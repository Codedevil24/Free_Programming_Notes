document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const bookList = document.getElementById('book-list');
        const navbarLinks = document.getElementById('navbar-links');
        const adminLink = navbarLinks ? navbarLinks.querySelector('.admin-only') : null;
        const adminLoginLink = navbarLinks ? navbarLinks.querySelector('.admin-login') : null;
        const logoutLink = navbarLinks ? navbarLinks.querySelector('.logout') : null;
        const searchBar = document.getElementById('search-bar');
        const categoryList = document.getElementById('category-list');
        const modal = document.getElementById('book-modal');
        const closeModal = document.getElementById('close-modal');
        let allBooks = [];
        let currentCategory = 'All';

        if (typeof jwt_decode === 'undefined') {
            console.error('jwt_decode is not defined.');
            bookList.innerHTML = '<p>Error: Authentication library failed to load.</p>';
            return;
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
                    bookList.innerHTML = filteredBooks.map(book => `
                        <div class="book" data-id="${book._id}">
                            <img src="${book.imageUrl}" alt="${book.title}" onerror="this.src='fallback-image.jpg'">
                            <h3>${book.title}</h3>
                            <p>${book.description}</p>
                            <p><strong>Category:</strong> ${book.category}</p>
                            <a href="${book.pdfUrl}" target="_blank">Download PDF</a>
                        </div>
                    `).join('');
                    document.querySelectorAll('.book').forEach(bookDiv => {
                        bookDiv.addEventListener('click', () => {
                            const bookId = bookDiv.dataset.id;
                            const book = allBooks.find(b => b._id === bookId);
                            document.getElementById('modal-title').textContent = book.title;
                            document.getElementById('modal-description').textContent = book.description;
                            document.getElementById('modal-category').textContent = book.category;
                            document.getElementById('modal-image').src = book.imageUrl;
                            document.getElementById('modal-download').href = book.pdfUrl;
                            modal.style.display = 'block';
                        });
                    });
                    return;
                } catch (err) {
                    console.error(`Fetch attempt ${i + 1} failed:`, err);
                    if (i === retries - 1) {
                        bookList.innerHTML = `<p>Error loading books: ${err.message}. Please try again later.</p>`;
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        searchBar.addEventListener('input', () => {
            fetchBooksWithRetry(searchBar.value, currentCategory);
        });

        categoryList.querySelectorAll('li').forEach(categoryItem => {
            categoryItem.addEventListener('click', () => {
                currentCategory = categoryItem.dataset.category;
                categoryList.querySelectorAll('li').forEach(item => item.classList.remove('active'));
                categoryItem.classList.add('active');
                fetchBooksWithRetry(searchBar.value, currentCategory);
            });
        });

        closeModal.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        fetchBooksWithRetry();
    }, 100);
});