// React Mobile Menu Integration for MindMate
// This script loads and renders the React staggered menu for mobile devices

// Wait for React to be available
function waitForReact() {
    return new Promise((resolve) => {
        if (window.React && window.ReactDOM) {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (window.React && window.ReactDOM) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        }
    });
}

// Initialize the React mobile menu
async function initializeReactMobileMenu() {
    try {
        console.log('🔍 React Mobile Menu: Checking screen width:', window.innerWidth);
        
        // Only initialize on mobile devices
        if (window.innerWidth > 768) {
            console.log('📱 React mobile menu skipped - desktop view');
            return;
        }

        console.log('🚀 Initializing React Mobile Menu...');
        
        // Wait for React to be available
        await waitForReact();
        console.log('✅ React is available');
        
        // Import the MobileMenuApp component
        const { default: MobileMenuApp } = await import('./MobileMenuApp.js');
        console.log('✅ MobileMenuApp component loaded');
        
        // Get the container
        const container = document.getElementById('staggered-menu-container');
        if (!container) {
            console.error('❌ Container not found');
            return;
        }
        
        console.log('📦 Container found, rendering React app...');
        
        // Clear any existing content
        container.innerHTML = '';
        
        // Render the React app
        const root = ReactDOM.createRoot(container);
        root.render(React.createElement(MobileMenuApp));
        
        console.log('✅ React Mobile Menu initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing React mobile menu:', error);
        
        // Fallback to simple menu if React fails
        console.log('🔄 Falling back to simple mobile menu...');
        initializeSimpleFallback();
    }
}

// Simple fallback menu
function initializeSimpleFallback() {
    const container = document.getElementById('staggered-menu-container');
    if (container) {
        container.innerHTML = `
            <div class="simple-mobile-menu compact-fallback">
                <div class="simple-menu-header">
                    <div class="simple-menu-logo">
                        <span class="logo-icon">🧠</span>
                        <span class="logo-text">MindMate</span>
                    </div>
                    <button class="simple-menu-toggle" onclick="toggleSimpleMenu()">
                        <span class="menu-icon">☰</span>
                    </button>
                </div>
                
                <div class="simple-menu-panel compact-fallback-panel" id="simple-menu-panel">
                    <div class="simple-menu-content">
                        <ul class="simple-menu-items">
                            <li><a href="#" onclick="navigateToSection('hero'); return false;" class="simple-menu-link">Home</a></li>
                            <li><a href="#" onclick="navigateToSection('quiz-section'); return false;" class="simple-menu-link">Assessment</a></li>
                            <li><a href="#" onclick="navigateToSection('chat-section'); return false;" class="simple-menu-link">AI Mentor</a></li>
                            <li><a href="#" onclick="navigateToSection('learning-section'); return false;" class="simple-menu-link">Learning</a></li>
                            <li><a href="#" onclick="navigateToSection('community-section'); return false;" class="simple-menu-link">Community</a></li>
                        </ul>
                        
                        <div class="simple-menu-socials">
                            <h4>Socials</h4>
                            <div class="social-links">
                                <a href="https://x.com/Sameermistri" target="_blank" class="social-link">Twitter</a>
                                <a href="https://www.instagram.com/sameermistrii/" target="_blank" class="social-link">Instagram</a>
                                <a href="https://www.linkedin.com/in/sameermistri/" target="_blank" class="social-link">LinkedIn</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        console.log('✅ Simple fallback menu initialized');
    }
}

// Global functions for simple menu
window.toggleSimpleMenu = function() {
    const panel = document.getElementById('simple-menu-panel');
    const toggleBtn = document.querySelector('.simple-menu-toggle .menu-icon');
    
    if (panel && toggleBtn) {
        const isOpen = panel.classList.contains('open');
        if (isOpen) {
            panel.classList.remove('open');
            toggleBtn.textContent = '☰';
        } else {
            panel.classList.add('open');
            toggleBtn.textContent = '✕';
        }
    }
};

window.navigateToSection = function(section) {
    // Close menu
    const panel = document.getElementById('simple-menu-panel');
    const toggleBtn = document.querySelector('.simple-menu-toggle .menu-icon');
    if (panel && toggleBtn) {
        panel.classList.remove('open');
        toggleBtn.textContent = '☰';
    }
    
    // Navigate to section
    if (window.showSection) {
        setTimeout(() => {
            window.showSection(section);
        }, 300);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeReactMobileMenu);

// Handle window resize
window.addEventListener('resize', () => {
    if (window.innerWidth <= 768 && !document.querySelector('.staggered-menu-wrapper') && !document.querySelector('.simple-mobile-menu')) {
        console.log('📱 Screen resized to mobile, reinitializing menu...');
        setTimeout(initializeReactMobileMenu, 100);
    }
});
