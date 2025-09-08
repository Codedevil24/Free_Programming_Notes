// [client/js/book-details.js
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements with proper error handling
    const bookTitle = document.getElementById('book-title');
    const bookImage = document.getElementById('book-image');
    const bookDescription = document.getElementById('book-description');
    const bookCategory = document.getElementById('book-category');
    const notesPreview = document.getElementById('notes-preview');
    const notesPreviewMessage = document.getElementById('notes-preview-message');
    const downloadButton = document.getElementById('download-button');
    const suggestionList = document.getElementById('suggestion-list');
    const backIcon = document.getElementById('back-icon');
    const navbarLinks = document.getElementById('navbar-links');
    const menuIcon = document.getElementById('menu-icon');
    const closeIcon = document.getElementById('close-icon');
    const logoutLink = document.getElementById('logout-link');

    // Set initial menu state
    if (menuIcon) menuIcon.style.display = 'block';
    if (closeIcon) closeIcon.style.display = 'none';
    if (navbarLinks) navbarLinks.classList.remove('show');

    // JWT Authentication with proper error handling
    function updateAuthDisplay(isAuthenticated) {
        const adminElements = document.querySelectorAll('.admin-only');
        const logoutElements = document.querySelectorAll('.logout');
        
        adminElements.forEach(el => {
            if (el) el.style.display = isAuthenticated ? 'block' : 'none';
        });
        logoutElements.forEach(el => {
            if (el) el.style.display = isAuthenticated ? 'block' : 'none';
        });
    }

    // Check JWT token
    let jwt_decode = window.jwt_decode || null;
    if (!jwt_decode) {
        console.warn('jwt-decode library not loaded. Skipping token validation.');
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

        // Close menu when clicking any navbar link
        const navLinks = navbarLinks.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navbarLinks.classList.remove('show');
                menuIcon.style.display = 'block';
                closeIcon.style.display = 'none';
            });
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

    // Get book ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id');

    if (!bookId) {
        if (bookTitle) bookTitle.textContent = 'No book selected';
        if (bookDescription) bookDescription.textContent = 'Please select a book to view details.';
        return;
    }

    // Function to get random items from array
    function getRandomItems(array, count) {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, array.length));
    }

    // Fetch and display book details
    async function fetchBookDetails() {
        try {
            // Show loading state
            if (bookTitle) bookTitle.textContent = 'Loading...';
            if (bookDescription) bookDescription.textContent = 'Loading book details...';
            if (bookCategory) bookCategory.textContent = 'Loading...';

            const headers = {};
            const currentToken = localStorage.getItem('token');
            if (currentToken) {
                headers['Authorization'] = `Bearer ${currentToken}`;
            }

            // Fetch book details
            const response = await fetch(`https://free-programming-notes.onrender.com/api/books/${bookId}`, { headers });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch book details: ${response.status} ${response.statusText}`);
            }
            
            const book = await response.json();
            console.log('Book details fetched:', book);

            // Update book information
            if (bookTitle) bookTitle.textContent = book.title || 'Untitled Book';
            if (bookDescription) bookDescription.textContent = book.description || 'No description available.';
            if (bookCategory) bookCategory.textContent = book.category || 'Uncategorized';

            // Display book image
            if (bookImage && book.imageUrl) {
                bookImage.src = book.imageUrl;
                bookImage.alt = book.title || 'Book Cover';
                bookImage.style.display = 'block';
                bookImage.onerror = function() {
                    this.onerror = null; 
                    this.src = 'https://placehold.co/280x350/e9ecef/6c757d?text=No+Image';
                };
            }

            // Setup PDF preview
            if (notesPreview && book.pdfUrl) {
                const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(book.pdfUrl)}&embedded=true`;
                notesPreview.src = googleViewerUrl;
                notesPreview.style.display = 'block';
                if (notesPreviewMessage) notesPreviewMessage.style.display = 'none';

                // Handle iframe load error
                notesPreview.onerror = function() {
                    console.warn('PDF preview failed to load');
                    this.style.display = 'none';
                    if (notesPreviewMessage) {
                        notesPreviewMessage.textContent = 'PDF preview unavailable. Click download to view the full document.';
                        notesPreviewMessage.style.display = 'block';
                    }
                };
            } else {
                if (notesPreview) notesPreview.style.display = 'none';
                if (notesPreviewMessage) {
                    notesPreviewMessage.textContent = 'No PDF preview available for this book.';
                }
            }

            // Setup download button
            if (downloadButton) {
                downloadButton.onclick = (e) => {
                    e.preventDefault();
                    if (book.pdfUrl) {
                        // Create temporary link for download
                        const downloadLink = document.createElement('a');
                        downloadLink.href = book.pdfUrl;
                        downloadLink.download = `${book.title || 'book'}.pdf`;
                        downloadLink.target = '_blank';
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        document.body.removeChild(downloadLink);
                    } else {
                        alert('Download link not available for this book.');
                    }
                };
            }

            // Fetch all books for suggestions  
            const allBooksResponse = await fetch('https://free-programming-notes.onrender.com/api/books', { headers });
            
            if (allBooksResponse.ok) {
                const allBooks = await allBooksResponse.json();
                console.log('All books fetched for suggestions:', allBooks.length);

                // Filter books: same category, different book, then get random 5-6
                const categoryBooks = allBooks.filter(b => 
                    b.category === book.category && b._id !== bookId
                );
                
                // If not enough books in same category, add books from other categories
                const otherBooks = allBooks.filter(b => 
                    b.category !== book.category && b._id !== bookId
                );
                
                const combinedBooks = [...categoryBooks, ...otherBooks];
                const suggestions = getRandomItems(combinedBooks, 6);

                console.log('Suggestions to display:', suggestions.length);

                // Display suggestions
                if (suggestionList) {
                    suggestionList.innerHTML = '';
                    
                    if (suggestions.length > 0) {
                        suggestions.forEach(suggestion => {
                            const li = document.createElement('li');
                            li.style.cssText = `
                                background: #f8f9fa;
                                border-radius: 12px;
                                padding: 15px;
                                margin-bottom: 15px;
                                cursor: pointer;
                                transition: all 0.3s ease;
                                border: 2px solid transparent;
                                display: flex;
                                align-items: center;
                                gap: 15px;
                            `;
                            
                            li.innerHTML = `
                                <img src="${suggestion.imageUrl || 'https://placehold.co/80x100/e9ecef/6c757d?text=No+Image'}" 
                                     alt="${suggestion.title}" 
                                     style="width: 60px; height: 80px; object-fit: cover; border-radius: 6px; flex-shrink: 0;"
                                     onerror="this.onerror=null; this.src='https://placehold.co/80x100/e9ecef/6c757d?text=No+Image';" />
                                <div style="flex: 1;">
                                    <h5 style="margin: 0 0 8px 0; color: #333; font-size: 16px; font-weight: 600;">
                                        ${suggestion.title}
                                    </h5>
                                    <p style="margin: 0 0 5px 0; color: #6c757d; font-size: 14px; line-height: 1.4;">
                                        ${(suggestion.description || 'No description available.').substring(0, 100)}...
                                    </p>
                                    <small style="color: #007bff; font-weight: 500;">
                                        📂 ${suggestion.category || 'Uncategorized'}
                                    </small>
                                </div>
                            `;
                            
                            // Add hover effects
                            li.addEventListener('mouseenter', () => {
                                li.style.transform = 'translateY(-2px)';
                                li.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                li.style.borderColor = '#007bff';
                                li.style.background = '#ffffff';
                            });
                            
                            li.addEventListener('mouseleave', () => {
                                li.style.transform = 'translateY(0)';
                                li.style.boxShadow = 'none';
                                li.style.borderColor = 'transparent';
                                li.style.background = '#f8f9fa';
                            });
                            
                            // Add click handler
                            li.addEventListener('click', () => {
                                window.location.href = `book-details.html?id=${suggestion._id}`;
                            });
                            
                            suggestionList.appendChild(li);
                        });
                    } else {
                        suggestionList.innerHTML = '<li style="text-align: center; padding: 20px; color: #6c757d;">No related books found.</li>';
                    }
                }
            } else {
                console.warn('Failed to fetch books for suggestions');
                if (suggestionList) {
                    suggestionList.innerHTML = '<li style="text-align: center; padding: 20px; color: #dc3545;">Failed to load suggestions.</li>';
                }
            }

        } catch (err) {
            console.error('Error fetching book details:', err);
            
            // Show error state
            if (bookTitle) bookTitle.textContent = 'Error Loading Book';
            if (bookDescription) bookDescription.textContent = 'Failed to load book details. Please try again later.';
            if (bookCategory) bookCategory.textContent = 'Error';
            
            if (suggestionList) {
                suggestionList.innerHTML = '<li style="text-align: center; padding: 20px; color: #dc3545;">Failed to load suggestions.</li>';
            }
        }
    }

    // Back button functionality
    if (backIcon) {
        backIcon.addEventListener('click', (e) => {
            e.preventDefault();
            window.history.back();
        });
    }

    // Initialize the page
    fetchBookDetails();
});