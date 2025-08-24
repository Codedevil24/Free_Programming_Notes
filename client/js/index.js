document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const bookList = document.getElementById('book-list');
        const navbarLinks = document.getElementById('navbar-links');
        const adminLink = navbarLinks ? navbarLinks.querySelector('.admin-only') : null;
        const adminLoginLink = navbarLinks ? navbarLinks.querySelector('.admin-login') : null;
        const logoutLink = navbarLinks ? document.getElementById('logout-link') : null; // Fixed ID match
        const searchBar = document.getElementById('search-bar');
        const categoryList = document.getElementById('category-list');
        const modal = document.getElementById('book-modal');
        const closeModal = document.getElementById('close-modal');
        let allBooks = [];
        let currentCategory = 'All';

        // JWT Decode Fallback Improvement
        if (typeof jwt_decode === 'undefined') {
            console.warn('jwt-decode CDN failed to load, attempting local fallback');
            const script = document.createElement('script');
            script.src = '/js/jwt-decode.js'; // Ensure this file exists
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
                                const notesPreview = document.getElementById('modal-notes-preview');
                                if (notesPreview && book.pdfUrl) {
                                    notesPreview.src = book.pdfUrl + '#toolbar=0&view=FitH';
                                } else {
                                    notesPreview.style.display = 'none';
                                }
                                const suggestionsDiv = document.getElementById('suggestions');
                                if (suggestionsDiv) {
                                    const otherBooks = allBooks.filter(b => b._id !== bookId);
                                    const randomSuggestions = getRandomItems(otherBooks, 3);
                                    suggestionsDiv.innerHTML = randomSuggestions.length > 0 ? `
                                        <h4>Suggestions:</h4>
                                        ${randomSuggestions.map(suggestion => `
                                            <p><a href="#" onclick="showBook('${suggestion._id}')">${suggestion.title}</a></p>
                                        `).join('')}
                                    ` : '<p>No suggestions available.</p>';
                                }
                                modal.style.display = 'block';
                            });
                        });
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

        // Function to get random items from array
        function getRandomItems(array, count) {
            const shuffled = array.sort(() => 0.5 - Math.random());
            return shuffled.slice(0, Math.min(count, shuffled.length));
        }

        // Function to show book in modal
        window.showBook = (bookId) => {
            const book = allBooks.find(b => b._id === bookId);
            if (book && modal) {
                document.getElementById('modal-title').textContent = book.title || 'No Title';
                document.getElementById('modal-description').textContent = book.description || 'No Description';
                document.getElementById('modal-category').textContent = book.category || 'No Category';
                document.getElementById('modal-image').src = book.imageUrl || 'fallback-image.jpg';
                document.getElementById('modal-download').href = book.pdfUrl || '#';
                document.getElementById('modal-download').textContent = book.pdfUrl ? 'Download PDF' : 'No PDF Available';
                const notesPreview = document.getElementById('modal-notes-preview');
                if (notesPreview && book.pdfUrl) {
                    notesPreview.src = book.pdfUrl + '#toolbar=0&view=FitH';
                    notesPreview.style.display = 'block';
                } else {
                    notesPreview.style.display = 'none';
                }
                const suggestionsDiv = document.getElementById('suggestions');
                if (suggestionsDiv) {
                    const otherBooks = allBooks.filter(b => b._id !== bookId);
                    const randomSuggestions = getRandomItems(otherBooks, 3);
                    suggestionsDiv.innerHTML = randomSuggestions.length > 0 ? `
                        <h4>Suggestions:</h4>
                        ${randomSuggestions.map(suggestion => `
                            <p><a href="#" onclick="showBook('${suggestion._id}')">${suggestion.title}</a></p>
                        `).join('')}
                    ` : '<p>No suggestions available.</p>';
                }
                modal.style.display = 'block';
            }
        };

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

        if (closeModal && modal) {
            closeModal.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        fetchBooksWithRetry();
    }, 100);
});