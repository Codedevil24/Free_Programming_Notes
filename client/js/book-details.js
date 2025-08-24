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
            const response = await fetch('https://free-programming-notes.onrender.com/api/books');
            if (!response.ok) throw new Error('Failed to fetch books');
            const allBooks = await response.json();
            const book = allBooks.find(b => b._id === bookId);

            if (book) {
                bookTitle.textContent = book.title;
                bookImage.src = book.imageUrl || 'fallback-image.jpg';
                bookDescription.textContent = book.description;
                bookCategory.textContent = book.category;
                notesPreview.src = book.pdfUrl + '#toolbar=0&view=FitH'; // No auto-download
                downloadButton.onclick = () => {
                    const a = document.createElement('a');
                    a.href = book.pdfUrl;
                    a.download = book.title + '.pdf';
                    a.click();
                };

                // Random suggestions (4-5)
                const otherBooks = allBooks.filter(b => b._id !== bookId);
                const randomSuggestions = getRandomItems(otherBooks, 5).slice(0, 5);
                suggestionList.innerHTML = randomSuggestions.map(suggestion => `
                    <p><a href="/book-details.html?id=${suggestion._id}">${suggestion.title}</a></p>
                `).join('');
            } else {
                bookTitle.textContent = 'Book not found';
            }
        } catch (err) {
            console.error('Error fetching book details:', err);
            bookTitle.textContent = 'Error loading book details';
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