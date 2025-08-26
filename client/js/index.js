document.addEventListener('DOMContentLoaded', () => {
    const bookList = document.getElementById('book-list');
    const searchBar = document.getElementById('search-bar');
    const categoryList = document.getElementById('category-list');
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
  
    // Responsive menu toggle
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
  
    // Logout handler
    if (logoutLink) {
      logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        updateAuthDisplay(false);
        alert('Logged out successfully!');
        window.location.href = '/index.html';
      });
    }
  
    // Fetch and render books from API
    async function fetchBooks(category = 'All') {
      try {
        const headers = {};
        const localToken = localStorage.getItem('token');
        if (localToken) {
          headers['Authorization'] = `Bearer ${localToken}`;
        }
        const response = await fetch(`https://free-programming-notes.onrender.com/api/books?category=${category}`, { headers });
        if (!response.ok) throw new Error('Failed to fetch books: ' + response.statusText);
        const books = await response.json();
  
        if (bookList) {
          bookList.innerHTML = books.map(book => `
            <div class="book" data-id="${book._id}">
                <h3>${book.title}</h3>
                <p>${book.description}</p>
                <p><strong>Category:</strong> ${book.category || 'Uncategorized'}</p>
                <img src="${book.imageUrl || 'https://placehold.co/100x100'}" alt="${book.title}" style="max-width: 150px;" onerror="this.onerror=null; this.src='https://placehold.co/100x100';">
                <button class="view-details-btn">View</button>
            </div>
          `).join('');
        } else {
          console.error('bookList element not found');
        }
        return books;
      } catch (err) {
        console.error('Error fetching books:', err);
        if (bookList) {
          bookList.innerHTML = '<p>Error loading books: ' + err.message + '</p>';
        }
        return [];
      }
    }
  
    // Redirect to book-details.html on view button click (instead of modal)
    bookList.addEventListener('click', e => {
      if (e.target.classList.contains('view-details-btn')) {
        const bookId = e.target.closest('.book').dataset.id;
        if (bookId) {
          window.location.href = `/book-details.html?id=${bookId}`;
        }
      }
    });
  
    // Search filter functionality
    searchBar.addEventListener('input', async e => {
      const query = e.target.value.toLowerCase();
      const books = await fetchBooks('All'); // fetch all books to filter client-side
      const filteredBooks = books.filter(book => 
        book.title.toLowerCase().includes(query) || book.description.toLowerCase().includes(query)
      );
      if (bookList) {
        bookList.innerHTML = filteredBooks.map(book => `
          <div class="book" data-id="${book._id}">
              <h3>${book.title}</h3>
              <p>${book.description}</p>
              <p><strong>Category:</strong> ${book.category || 'Uncategorized'}</p>
              <img src="${book.imageUrl || 'https://placehold.co/100x100'}" alt="${book.title}" style="max-width: 150px;" onerror="this.onerror=null; this.src='https://placehold.co/100x100';">
              <button class="view-details-btn">View</button>
          </div>
        `).join('');
      }
    });
  
    // Category filtering
    categoryList.addEventListener('click', e => {
      if (e.target.tagName === 'A') {
        e.preventDefault();
        const category = e.target.getAttribute('data-category') || 'All';
        fetchBooks(category);
        // Highlight selected element
        Array.from(categoryList.children).forEach(li => li.classList.remove('active'));
        e.target.parentElement.classList.add('active');
      }
    });
  
    // Initial fetch all books
    fetchBooks();
  });
  