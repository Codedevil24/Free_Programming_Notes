document.addEventListener('DOMContentLoaded', async () => {
    const bookList = document.getElementById('book-list');

    try {
        console.log('Fetching books from server');
        const response = await fetch('http://localhost:3000/api/books');
        const books = await response.json();
        if (response.ok) {
            books.forEach(book => {
                const bookDiv = document.createElement('div');
                bookDiv.className = 'book';
                bookDiv.innerHTML = `
                    <img src="${book.imageUrl}" alt="${book.title}">
                    <h3>${book.title}</h3>
                    <p>${book.description}</p>
                    <a href="${book.pdfUrl}" target="_blank">Download PDF</a>
                `;
                bookList.appendChild(bookDiv);
            });
        } else {
            console.error('Failed to fetch books:', books.message);
            bookList.innerHTML = '<p>Error loading books</p>';
        }
    } catch (err) {
        console.error('Error fetching books:', err);
        bookList.innerHTML = '<p>Error loading books</p>';
    }
});