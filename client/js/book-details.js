document.addEventListener('DOMContentLoaded', () => {
    const bookTitle = document.getElementById('book-title');
    const bookImage = document.getElementById('book-image');
    const bookDescription = document.getElementById('book-description');
    const bookCategory = document.getElementById('book-category');
    const notesPreview = document.getElementById('notes-preview');
    const downloadButton = document.getElementById('download-button');
    const suggestionsDiv = document.getElementById('suggestions');
    const backIcon = document.getElementById('back-icon');

    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id');

    if (!bookId) {
        bookTitle.textContent = 'No book selected';
        return;
    }

    async function fetchBookDetails() {
        try {
            const response = await fetch('https://free-programming-notes.onrender.com/api/books');
            if (!response.ok) {
                throw new Error('Failed to fetch books');
            }
            const allBooks = await response.json();
            const book = allBooks.find(b => b._id === bookId);
            if (book) {
                bookTitle.textContent = book.title;
                bookImage.src = book.imageUrl || 'fallback-image.jpg';
                bookDescription.textContent = book.description;
                bookCategory.textContent = book.category;
                notesPreview.src = book.pdfUrl + '#toolbar=0&view=FitH';
                downloadButton.onclick = () => {
                    const a = document.createElement('a');
                    a.href = book.pdfUrl;
                    a.download = book.title + '.pdf';
                    a.click();
                };
                const otherBooks = allBooks.filter(b => b._id !== bookId);
                const randomSuggestions = getRandomItems(otherBooks, 3);
                suggestionsDiv.innerHTML = randomSuggestions.length > 0 ? `
                    <h4>Suggestions:</h4>
                    ${randomSuggestions.map(suggestion => `
                        <p><a href="book-details.html?id=${suggestion._id}">${suggestion.title}</a></p>
                    `).join('')}
                ` : '<p>No suggestions available.</p>';
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
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    backIcon.addEventListener('click', (e) => {
        e.preventDefault();
        history.back();
    });

    fetchBookDetails();
});