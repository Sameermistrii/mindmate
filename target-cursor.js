// MindMate Enhanced Target Cursor - Vanilla JS Implementation
// Adapted from React component to vanilla JavaScript for MindMate project

class TargetCursor {
    constructor(options = {}) {
        this.targetSelector = options.targetSelector || this.getDefaultTargetSelector();
        this.spinDuration = options.spinDuration || 1.8; // Slightly faster spin
        this.hideDefaultCursor = options.hideDefaultCursor !== false;
        
        this.constants = {
            borderWidth: 3,
            cornerSize: 12,
            parallaxStrength: 0.00008 // Slightly more parallax for better feel
        };

        this.cursorElement = null;
        this.cornersElements = null;
        this.dotElement = null;
        this.spinTimeline = null;
        this.activeTarget = null;
        this.currentTargetMove = null;
        this.currentLeaveHandler = null;
        this.isAnimatingToTarget = false;
        this.resumeTimeout = null;
        this.originalCursor = null;

        this.init();
    }

    init() {
        // Check if GSAP is available
        if (typeof gsap === 'undefined') {
            console.error('TargetCursor requires GSAP library. Please include GSAP before initializing.');
            return;
        }

        // Check if device is mobile/touch device
        if (this.isMobileDevice()) {
            console.log('📱 Target Cursor disabled on mobile device');
            return;
        }

        this.createCursorElement();
        this.setupEventListeners();
        this.createSpinTimeline();

        // Hide default cursor if specified
        if (this.hideDefaultCursor) {
            this.originalCursor = document.body.style.cursor;
            document.body.style.cursor = 'none';
        }

        console.log('✨ MindMate Enhanced Target Cursor initialized');
    }

    isMobileDevice() {
        // Check for touch capability
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // Check screen width
        const isSmallScreen = window.innerWidth <= 768;
        
        // Check user agent for mobile devices
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Check for mobile-specific features
        const isMobileFeatures = 'orientation' in window && 'onorientationchange' in window;
        
        return hasTouch && (isSmallScreen || isMobileUA || isMobileFeatures);
    }

    getDefaultTargetSelector() {
        // Comprehensive selector for all interactive elements
        return [
            'a', 'button', 'input', 'select', 'textarea', 'label',
            '[role="button"]', '[role="link"]', '[role="tab"]', '[role="menuitem"]',
            '[tabindex="0"]', '[tabindex="-1"]',
            '.btn', '.button', '.link', '.nav-link', '.menu-item',
            '.quiz-option', '.learning-card', '.career-card', '.feature-card',
            '.cursor-target', '.clickable', '.interactive',
            '[data-action]', '[onclick]',
            '.bottom-nav button', '.nav-links a', '.user-menu',
            '.stat-card', '.achievement-card', '.progress-card',
            '.learning-card-btn', '.career-match-card', '.recommendation-card',
            '.modal .close-modal', '.modal button',
            '[data-bs-toggle]', '[data-toggle]'
        ].join(', ');
    }

    createCursorElement() {
        // Create cursor wrapper
        this.cursorElement = document.createElement('div');
        this.cursorElement.className = 'target-cursor-wrapper';
        
        // Create dot element
        this.dotElement = document.createElement('div');
        this.dotElement.className = 'target-cursor-dot';
        
        // Create corner elements
        const corners = ['tl', 'tr', 'br', 'bl'];
        corners.forEach(corner => {
            const cornerElement = document.createElement('div');
            cornerElement.className = `target-cursor-corner corner-${corner}`;
            this.cursorElement.appendChild(cornerElement);
        });
        
        this.cursorElement.appendChild(this.dotElement);
        document.body.appendChild(this.cursorElement);
        
        this.cornersElements = this.cursorElement.querySelectorAll('.target-cursor-corner');
        
        // Set initial position
        gsap.set(this.cursorElement, {
            xPercent: -50,
            yPercent: -50,
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        });
    }

    createSpinTimeline() {
        if (this.spinTimeline) {
            this.spinTimeline.kill();
        }
        this.spinTimeline = gsap
            .timeline({ repeat: -1 })
            .to(this.cursorElement, { 
                rotation: '+=360', 
                duration: this.spinDuration, 
                ease: 'none' 
            });
    }

    moveCursor(x, y) {
        if (!this.cursorElement) return;
        gsap.to(this.cursorElement, {
            x,
            y,
            duration: 0.06, // Smooth but responsive
            ease: 'power2.out'
        });
    }

    cleanupTarget(target) {
        if (this.currentTargetMove) {
            target.removeEventListener('mousemove', this.currentTargetMove);
        }
        if (this.currentLeaveHandler) {
            target.removeEventListener('mouseleave', this.currentLeaveHandler);
        }
        this.currentTargetMove = null;
        this.currentLeaveHandler = null;
    }

    updateCorners(mouseX, mouseY) {
        if (!this.activeTarget || !this.cursorElement || !this.cornersElements) return;

        const rect = this.activeTarget.getBoundingClientRect();
        const cursorRect = this.cursorElement.getBoundingClientRect();

        const cursorCenterX = cursorRect.left + cursorRect.width / 2;
        const cursorCenterY = cursorRect.top + cursorRect.height / 2;

        const [tlc, trc, brc, blc] = Array.from(this.cornersElements);
        const { borderWidth, cornerSize, parallaxStrength } = this.constants;

        let tlOffset = {
            x: rect.left - cursorCenterX - borderWidth,
            y: rect.top - cursorCenterY - borderWidth
        };
        let trOffset = {
            x: rect.right - cursorCenterX + borderWidth - cornerSize,
            y: rect.top - cursorCenterY - borderWidth
        };
        let brOffset = {
            x: rect.right - cursorCenterX + borderWidth - cornerSize,
            y: rect.bottom - cursorCenterY + borderWidth - cornerSize
        };
        let blOffset = {
            x: rect.left - cursorCenterX - borderWidth,
            y: rect.bottom - cursorCenterY + borderWidth - cornerSize
        };

        if (mouseX !== undefined && mouseY !== undefined) {
            const targetCenterX = rect.left + rect.width / 2;
            const targetCenterY = rect.top + rect.height / 2;
            const mouseOffsetX = (mouseX - targetCenterX) * parallaxStrength;
            const mouseOffsetY = (mouseY - targetCenterY) * parallaxStrength;

            tlOffset.x += mouseOffsetX;
            tlOffset.y += mouseOffsetY;
            trOffset.x += mouseOffsetX;
            trOffset.y += mouseOffsetY;
            brOffset.x += mouseOffsetX;
            brOffset.y += mouseOffsetY;
            blOffset.x += mouseOffsetX;
            blOffset.y += mouseOffsetY;
        }

        const tl = gsap.timeline();
        const corners = [tlc, trc, brc, blc];
        const offsets = [tlOffset, trOffset, brOffset, blOffset];

        // Smooth corner animations with optimal timing
        corners.forEach((corner, index) => {
            gsap.to(corner, {
                x: offsets[index].x,
                y: offsets[index].y,
                duration: 0.15, // Balanced speed and smoothness
                ease: 'power2.out'
            });
        });
    }

    setupEventListeners() {
        // Mouse move handler
        this.moveHandler = (e) => this.moveCursor(e.clientX, e.clientY);
        window.addEventListener('mousemove', this.moveHandler);

        // Mouse down/up handlers for click animation
        this.mouseDownHandler = () => {
            if (!this.dotElement) return;
            gsap.to(this.dotElement, { scale: 0.75, duration: 0.12 }); // Smooth click feedback
            gsap.to(this.cursorElement, { scale: 0.96, duration: 0.12 }); // Subtle scale
        };

        this.mouseUpHandler = () => {
            if (!this.dotElement) return;
            gsap.to(this.dotElement, { scale: 1, duration: 0.18 }); // Smooth return
            gsap.to(this.cursorElement, { scale: 1, duration: 0.18 });
        };

        window.addEventListener('mousedown', this.mouseDownHandler);
        window.addEventListener('mouseup', this.mouseUpHandler);

        // Scroll handler
        this.scrollHandler = () => {
            if (!this.activeTarget || !this.cursorElement) return;

            const mouseX = gsap.getProperty(this.cursorElement, 'x');
            const mouseY = gsap.getProperty(this.cursorElement, 'y');

            const elementUnderMouse = document.elementFromPoint(mouseX, mouseY);
            const isStillOverTarget = elementUnderMouse && 
                (elementUnderMouse === this.activeTarget || 
                 elementUnderMouse.closest(this.targetSelector) === this.activeTarget);

            if (!isStillOverTarget && this.currentLeaveHandler) {
                this.currentLeaveHandler();
            }
        };

        window.addEventListener('scroll', this.scrollHandler, { passive: true });

        // Mouse enter handler for targets
        this.enterHandler = (e) => {
            const directTarget = e.target;
            const allTargets = [];
            let current = directTarget;
            
            while (current && current !== document.body) {
                if (this.isInteractiveElement(current)) {
                    allTargets.push(current);
                }
                current = current.parentElement;
            }

            const target = allTargets[0] || null;
            if (!target || !this.cursorElement || !this.cornersElements) return;
            if (this.activeTarget === target) return;

            if (this.activeTarget) {
                this.cleanupTarget(this.activeTarget);
            }

            if (this.resumeTimeout) {
                clearTimeout(this.resumeTimeout);
                this.resumeTimeout = null;
            }

            this.activeTarget = target;
            const corners = Array.from(this.cornersElements);
            corners.forEach(corner => {
                gsap.killTweensOf(corner);
            });

            gsap.killTweensOf(this.cursorElement, 'rotation');
            this.spinTimeline?.pause();
            gsap.set(this.cursorElement, { rotation: 0 });

            this.isAnimatingToTarget = true;
            this.updateCorners();

            setTimeout(() => {
                this.isAnimatingToTarget = false;
            }, 30); // Quick but allows smooth corner positioning

            let moveThrottle = null;
            const targetMove = (ev) => {
                if (moveThrottle || this.isAnimatingToTarget) return;
                moveThrottle = requestAnimationFrame(() => {
                    this.updateCorners(ev.clientX, ev.clientY);
                    moveThrottle = null;
                });
            };

            const leaveHandler = () => {
                this.activeTarget = null;
                this.isAnimatingToTarget = false;

                if (this.cornersElements) {
                    const corners = Array.from(this.cornersElements);
                    gsap.killTweensOf(corners);

                    const { cornerSize } = this.constants;
                    const positions = [
                        { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
                        { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
                        { x: cornerSize * 0.5, y: cornerSize * 0.5 },
                        { x: -cornerSize * 1.5, y: cornerSize * 0.5 }
                    ];

                    // Smooth but quick leave animation
                    const tl = gsap.timeline();
                    corners.forEach((corner, index) => {
                        tl.to(corner, {
                            x: positions[index].x,
                            y: positions[index].y,
                            duration: 0.25, // Smooth exit animation
                            ease: 'power3.out'
                        }, 0);
                    });
                }

                this.resumeTimeout = setTimeout(() => {
                    if (!this.activeTarget && this.cursorElement && this.spinTimeline) {
                        const currentRotation = gsap.getProperty(this.cursorElement, 'rotation');
                        const normalizedRotation = currentRotation % 360;

                        this.spinTimeline.kill();
                        this.spinTimeline = gsap
                            .timeline({ repeat: -1 })
                            .to(this.cursorElement, { 
                                rotation: '+=360', 
                                duration: this.spinDuration, 
                                ease: 'none' 
                            });

                        gsap.to(this.cursorElement, {
                            rotation: normalizedRotation + 360,
                            duration: this.spinDuration * (1 - normalizedRotation / 360),
                            ease: 'none',
                            onComplete: () => {
                                this.spinTimeline?.restart();
                            }
                        });
                    }
                    this.resumeTimeout = null;
                }, 40); // Balanced resume timing

                this.cleanupTarget(target);
            };

            this.currentTargetMove = targetMove;
            this.currentLeaveHandler = leaveHandler;

            target.addEventListener('mousemove', targetMove);
            target.addEventListener('mouseleave', leaveHandler);
        };

        window.addEventListener('mouseover', this.enterHandler, { passive: true });
    }

    isInteractiveElement(element) {
        if (!element || element === document.body || element === document.documentElement) {
            return false;
        }

        // Check if element matches our selector
        try {
            if (element.matches(this.targetSelector)) {
                return true;
            }
        } catch (e) {
            // Fallback for older browsers
        }

        // Additional checks for interactive elements
        const tagName = element.tagName.toLowerCase();
        const interactiveTags = ['a', 'button', 'input', 'select', 'textarea', 'label'];
        
        if (interactiveTags.includes(tagName)) {
            return true;
        }

        // Check for common interactive attributes
        if (element.hasAttribute('onclick') || 
            element.hasAttribute('data-action') ||
            element.hasAttribute('role') ||
            element.hasAttribute('tabindex')) {
            return true;
        }

        // Check for common interactive classes
        const classList = element.className;
        if (typeof classList === 'string' && (
            classList.includes('btn') ||
            classList.includes('button') ||
            classList.includes('link') ||
            classList.includes('clickable') ||
            classList.includes('interactive') ||
            classList.includes('cursor-target') ||
            classList.includes('quiz-option') ||
            classList.includes('card') && (
                classList.includes('learning') ||
                classList.includes('career') ||
                classList.includes('feature') ||
                classList.includes('stat')
            )
        )) {
            return true;
        }

        // Check computed styles for cursor pointer
        try {
            const computedStyle = window.getComputedStyle(element);
            if (computedStyle.cursor === 'pointer') {
                return true;
            }
        } catch (e) {
            // Ignore style computation errors
        }

        return false;
    }

    destroy() {
        // Remove event listeners
        window.removeEventListener('mousemove', this.moveHandler);
        window.removeEventListener('mouseover', this.enterHandler);
        window.removeEventListener('scroll', this.scrollHandler);
        window.removeEventListener('mousedown', this.mouseDownHandler);
        window.removeEventListener('mouseup', this.mouseUpHandler);

        if (this.activeTarget) {
            this.cleanupTarget(this.activeTarget);
        }

        // Kill animations
        this.spinTimeline?.kill();

        // Restore default cursor
        if (this.originalCursor !== null) {
            document.body.style.cursor = this.originalCursor;
        }

        // Remove cursor element
        if (this.cursorElement && this.cursorElement.parentNode) {
            this.cursorElement.parentNode.removeChild(this.cursorElement);
        }

        console.log('🧹 MindMate Target Cursor destroyed');
    }

    // Method to manually add cursor target to an element
    addTarget(element) {
        if (element && !element.classList.contains('cursor-target')) {
            element.classList.add('cursor-target');
        }
    }

    // Method to manually remove cursor target from an element
    removeTarget(element) {
        if (element && element.classList.contains('cursor-target')) {
            element.classList.remove('cursor-target');
        }
    }

    // Method to refresh targets (useful for dynamically added content)
    refreshTargets() {
        // Force a re-evaluation of the current mouse position
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: gsap.getProperty(this.cursorElement, 'x') || 0,
            clientY: gsap.getProperty(this.cursorElement, 'y') || 0
        });
        this.moveHandler(mouseEvent);
    }

    // Method to check if cursor is active
    isActive() {
        return this.cursorElement !== null && !this.isMobileDevice();
    }
}

// Export for use in MindMate
window.TargetCursor = TargetCursor;