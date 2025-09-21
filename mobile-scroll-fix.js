// Mobile Scroll Fix - Ensures smooth scrolling on Android devices
console.log('📱 Mobile Scroll Fix Loading...');

function isMobileDevice() {
    return window.innerWidth <= 768 || 
           'ontouchstart' in window || 
           navigator.maxTouchPoints > 0 ||
           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function fixMobileScrolling() {
    if (!isMobileDevice()) {
        console.log('🖥️ Desktop device detected, skipping mobile scroll fixes');
        return;
    }

    console.log('📱 Mobile device detected, applying scroll fixes...');

    // Remove any event listeners that might interfere with scrolling
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        // Skip problematic event listeners on mobile
        if (isMobileDevice() && (
            type === 'wheel' || 
            type === 'mousewheel' || 
            type === 'DOMMouseScroll' ||
            (type === 'touchstart' && listener.toString().includes('preventDefault'))
        )) {
            console.log('🚫 Skipping potentially problematic event listener:', type);
            return;
        }
        return originalAddEventListener.call(this, type, listener, options);
    };

    // Ensure body has proper scrolling properties
    document.body.style.webkitOverflowScrolling = 'touch';
    document.body.style.overflowScrolling = 'touch';
    document.body.style.touchAction = 'pan-y';
    document.body.style.overscrollBehavior = 'contain';

    // Fix for Android Chrome
    document.documentElement.style.webkitOverflowScrolling = 'touch';
    document.documentElement.style.overflowScrolling = 'touch';

    // Remove any fixed positioning that might interfere
    const fixedElements = document.querySelectorAll('[style*="position: fixed"]');
    fixedElements.forEach(el => {
        if (el.id !== 'staggered-menu-container' && !el.classList.contains('mobile-menu')) {
            console.log('🔧 Adjusting fixed element for mobile:', el);
            el.style.position = 'absolute';
        }
    });

    // Ensure main content is scrollable
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.webkitOverflowScrolling = 'touch';
        mainContent.style.overflowScrolling = 'touch';
        mainContent.style.touchAction = 'pan-y';
        mainContent.style.webkitTransform = 'translateZ(0)';
        mainContent.style.transform = 'translateZ(0)';
        mainContent.style.webkitBackfaceVisibility = 'hidden';
        mainContent.style.backfaceVisibility = 'hidden';
    }

    // Disable any GSAP scroll-related animations on mobile
    if (window.gsap) {
        console.log('🎬 Disabling GSAP scroll animations on mobile');
        // Override GSAP scroll-related methods
        const originalScrollTo = gsap.ScrollToPlugin?.scrollTo;
        if (originalScrollTo) {
            gsap.ScrollToPlugin.scrollTo = function(target, vars) {
                if (isMobileDevice()) {
                    console.log('🚫 GSAP scroll disabled on mobile');
                    return;
                }
                return originalScrollTo.call(this, target, vars);
            };
        }
    }

    // Remove any scroll event listeners that might cause issues
    const scrollElements = document.querySelectorAll('*');
    scrollElements.forEach(el => {
        // Clone the element to remove all event listeners
        if (el.onwheel || el.onscroll) {
            const newEl = el.cloneNode(true);
            el.parentNode.replaceChild(newEl, el);
        }
    });

    console.log('✅ Mobile scroll fixes applied');
}

// Apply fixes when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixMobileScrolling);
} else {
    fixMobileScrolling();
}

// Reapply fixes on window resize
window.addEventListener('resize', () => {
    if (isMobileDevice()) {
        setTimeout(fixMobileScrolling, 100);
    }
});

console.log('📱 Mobile Scroll Fix Loaded');
