document.addEventListener('DOMContentLoaded', () => {
    const bookTitle = document.getElementById('book-title');
    const bookImage = document.getElementById('book-image');
    const bookDescription = document.getElementById('book-description');
    const bookCategory = document.getElementById('book-category');
    const notesPreview = document.getElementById('notes-preview');
    const downloadButton = document.getElementById('download-button');
    const suggestionList = document.getElementById('suggestion-list');
    const backIcon = document.getElementById('back-icon');
    const navbarLinks = document.getElementById('navbar-links');
    const adminLink = navbarLinks ? navbarLinks.querySelector('.admin-only') : null;
    const adminLoginLink = navbarLinks ? navbarLinks.querySelector('.admin-login') : null;
    const logoutLink = navbarLinks ? document.getElementById('logout-link') : null;

    // JWT Authentication
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

    // Logout Functionality
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            if (adminLink) adminLink.style.display = 'none';
            if (adminLoginLink) adminLoginLink.style.display = 'block';
            if (logoutLink) logoutLink.style.display = 'none';
            alert('Logged out successfully!');
            window.location.href = '/index.html';
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id');

    if (!bookId) {
        bookTitle.textContent = 'No book selected';
        return;
    }

    async function fetchBookDetails() {
        try {
            const headers = {};
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const response = await fetch(`https://free-programming-notes.onrender.com/api/books/${bookId}`, { headers });
            if (!response.ok) throw new Error(`Failed to fetch book details: ${response.status} ${response.statusText}`);
            const book = await response.json();
            bookTitle.textContent = book.title || 'Untitled';
            bookImage.src = book.imageUrl || 'https://placehold.co/100x100';
            bookDescription.textContent = book.description || 'No description';
            bookCategory.textContent = book.category || 'Uncategorized';
            notesPreview.src = book.pdfUrl ? `https://docs.google.com/viewer?url=${encodeURIComponent(book.pdfUrl)}&embedded=true` : '';
            if (downloadButton) {
                downloadButton.onclick = () => {
                    if (book.pdfUrl) {
                        const a = document.createElement('a');
                        a.href = book.pdfUrl;
                        a.download = `${book.title}.pdf`;
                        a.click();
                    }
                };
            }

            // Fetch all books for suggestions
            const allBooksResponse = await fetch('https://free-programming-notes.onrender.com/api/books', { headers });
            if (!allBooksResponse.ok) throw new Error('Failed to fetch all books');
            const allBooks = await allBooksResponse.json();
            const otherBooks = allBooks.filter(b => b._id !== bookId);
            const randomSuggestions = getRandomItems(otherBooks, 5).slice(0, 5);
            suggestionList.innerHTML = randomSuggestions.map(suggestion => `
                <p><a href="/book-details.html?id=${suggestion._id}">${suggestion.title}</a></p>
            `).join('');
        } catch (err) {
            console.error('Error fetching book details:', err);
            bookTitle.textContent = 'Error loading book details';
            bookImage.src = 'https://placehold.co/100x100';
            bookDescription.textContent = err.message;
            bookCategory.textContent = 'N/A';
            notesPreview.src = '';
            if (downloadButton) downloadButton.onclick = null;
            suggestionList.innerHTML = '<p>No suggestions available</p>';
        }
    }

    function getRandomItems(array, count) {
        const shuffled = array.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, array.length));
    }

    backIcon.addEventListener('click', (e) => {
        e.preventDefault();
        history.back();
    });

    fetchBookDetails();
});