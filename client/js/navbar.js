// ===============================================
// MOBILE RESPONSIVE NAVBAR FUNCTIONALITY
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    const navbarLinks = document.getElementById('navbar-links');
    const menuIcon = document.getElementById('menu-icon');
    const closeIcon = document.getElementById('close-icon');

    // Initialize navbar state
    function initializeNavbar() {
        if (menuIcon) menuIcon.style.display = 'block';
        if (closeIcon) closeIcon.style.display = 'none';
        if (navbarLinks) navbarLinks.classList.remove('show');
    }

    // Toggle mobile menu
    function toggleMobileMenu(show) {
        if (!navbarLinks || !menuIcon || !closeIcon) return;

        if (show) {
            navbarLinks.classList.add('show');
            menuIcon.style.display = 'none';
            closeIcon.style.display = 'block';
            
            // Add overlay to prevent body scroll
            document.body.style.overflow = 'hidden';
            
            // Add click outside to close
            setTimeout(() => {
                document.addEventListener('click', handleOutsideClick);
            }, 100);
        } else {
            navbarLinks.classList.remove('show');
            menuIcon.style.display = 'block';
            closeIcon.style.display = 'none';
            
            // Remove body scroll prevention
            document.body.style.overflow = '';
            
            // Remove click outside listener
            document.removeEventListener('click', handleOutsideClick);
        }
    }

    // Handle clicks outside the navbar
    function handleOutsideClick(event) {
        const navbar = document.querySelector('.navbar');
        if (navbar && !navbar.contains(event.target)) {
            toggleMobileMenu(false);
        }
    }

    // Menu icon click handler
    if (menuIcon) {
        menuIcon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleMobileMenu(true);
        });

        // Add keyboard support
        menuIcon.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleMobileMenu(true);
            }
        });
    }

    // Close icon click handler
    if (closeIcon) {
        closeIcon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleMobileMenu(false);
        });

        // Add keyboard support
        closeIcon.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleMobileMenu(false);
            }
        });
    }

    // Close menu when clicking on navigation links
    if (navbarLinks) {
        const navLinks = navbarLinks.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                toggleMobileMenu(false);
            });
        });
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            toggleMobileMenu(false);
            if (navbarLinks) navbarLinks.classList.remove('show');
        }
    });

    // Handle escape key to close menu
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navbarLinks && navbarLinks.classList.contains('show')) {
            toggleMobileMenu(false);
        }
    });

    // Initialize on load
    initializeNavbar();

    // Handle page visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            toggleMobileMenu(false);
        }
    });
});

// Export functions for use in other scripts if needed
window.NavbarUtils = {
    toggleMobileMenu: (show) => {
        const event = new CustomEvent('toggleMobileMenu', { detail: { show } });
        document.dispatchEvent(event);
    }
};
