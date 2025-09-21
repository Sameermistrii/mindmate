// Simple Mobile Menu Fix - Guaranteed to work
console.log('🔧 Simple Mobile Menu Fix Loading...');

function createSimpleMobileMenu() {
    // Remove any existing menu
    const existingMenu = document.getElementById('staggered-menu-container');
    if (existingMenu) {
        existingMenu.innerHTML = '';
    }
    
    // Create a simple, working menu
    const menuHTML = `
        <div id="simple-mobile-menu" style="
            position: fixed;
            top: 10px;
            right: 15px;
            z-index: 10000;
            pointer-events: auto;
        ">
            <!-- Menu Button -->
            <button id="menu-toggle-btn" style="
                background: linear-gradient(135deg, rgba(15, 35, 32, 0.7), rgba(25, 45, 42, 0.6));
                backdrop-filter: blur(15px);
                -webkit-backdrop-filter: blur(15px);
                border: 1px solid rgba(31, 249, 224, 0.15);
                border-radius: 15px;
                padding: 10px 16px;
                color: #fff;
                font-weight: 600;
                font-size: 16px;
                cursor: pointer;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(31, 249, 224, 0.08);
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
                max-width: 200px;
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 10px 30px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(31, 249, 224, 0.12)'" 
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 8px 25px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(31, 249, 224, 0.08)'">
                <span>🧠</span>
                <span>Menu</span>
                <span id="menu-icon">☰</span>
            </button>
            
            <!-- Menu Panel -->
            <div id="menu-panel" style="
                position: fixed;
                top: 60px;
                right: 15px;
                width: 280px;
                background: linear-gradient(135deg, rgba(15, 35, 32, 0.95), rgba(25, 45, 42, 0.9));
                backdrop-filter: blur(30px);
                border-radius: 20px;
                padding: 20px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                border: 2px solid rgba(31, 249, 224, 0.2);
                opacity: 0;
                visibility: hidden;
                transform: translateY(-20px) scale(0.9);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                pointer-events: none;
                z-index: 9999;
            ">
                <div style="color: white;">
                    <div style="margin-bottom: 20px; font-size: 18px; font-weight: 600; color: #1ff9e0; text-align: center;">
                        MindMate
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <a href="#" onclick="navigateToSection('hero'); closeMenu(); return false;" style="
                            display: block;
                            padding: 12px 16px;
                            background: rgba(255, 255, 255, 0.08);
                            border: 1px solid rgba(255, 255, 255, 0.1);
                            border-radius: 12px;
                            color: white;
                            text-decoration: none;
                            font-weight: 500;
                            transition: all 0.3s ease;
                            text-align: center;
                        " onmouseover="this.style.background='rgba(31, 249, 224, 0.15)'; this.style.borderColor='rgba(31, 249, 224, 0.4)'; this.style.transform='translateY(-2px)'" 
                           onmouseout="this.style.background='rgba(255, 255, 255, 0.08)'; this.style.borderColor='rgba(255, 255, 255, 0.1)'; this.style.transform='translateY(0)'">
                            🏠 Home
                        </a>
                        
                        <a href="#" onclick="navigateToSection('quiz-section'); closeMenu(); return false;" style="
                            display: block;
                            padding: 12px 16px;
                            background: rgba(255, 255, 255, 0.08);
                            border: 1px solid rgba(255, 255, 255, 0.1);
                            border-radius: 12px;
                            color: white;
                            text-decoration: none;
                            font-weight: 500;
                            transition: all 0.3s ease;
                            text-align: center;
                        " onmouseover="this.style.background='rgba(31, 249, 224, 0.15)'; this.style.borderColor='rgba(31, 249, 224, 0.4)'; this.style.transform='translateY(-2px)'" 
                           onmouseout="this.style.background='rgba(255, 255, 255, 0.08)'; this.style.borderColor='rgba(255, 255, 255, 0.1)'; this.style.transform='translateY(0)'">
                            📊 Assessment
                        </a>
                        
                        <a href="#" onclick="navigateToSection('chat-section'); closeMenu(); return false;" style="
                            display: block;
                            padding: 12px 16px;
                            background: rgba(255, 255, 255, 0.08);
                            border: 1px solid rgba(255, 255, 255, 0.1);
                            border-radius: 12px;
                            color: white;
                            text-decoration: none;
                            font-weight: 500;
                            transition: all 0.3s ease;
                            text-align: center;
                        " onmouseover="this.style.background='rgba(31, 249, 224, 0.15)'; this.style.borderColor='rgba(31, 249, 224, 0.4)'; this.style.transform='translateY(-2px)'" 
                           onmouseout="this.style.background='rgba(255, 255, 255, 0.08)'; this.style.borderColor='rgba(255, 255, 255, 0.1)'; this.style.transform='translateY(0)'">
                            🤖 AI Mentor
                        </a>
                        
                        <a href="#" onclick="navigateToSection('learning-section'); closeMenu(); return false;" style="
                            display: block;
                            padding: 12px 16px;
                            background: rgba(255, 255, 255, 0.08);
                            border: 1px solid rgba(255, 255, 255, 0.1);
                            border-radius: 12px;
                            color: white;
                            text-decoration: none;
                            font-weight: 500;
                            transition: all 0.3s ease;
                            text-align: center;
                        " onmouseover="this.style.background='rgba(31, 249, 224, 0.15)'; this.style.borderColor='rgba(31, 249, 224, 0.4)'; this.style.transform='translateY(-2px)'" 
                           onmouseout="this.style.background='rgba(255, 255, 255, 0.08)'; this.style.borderColor='rgba(255, 255, 255, 0.1)'; this.style.transform='translateY(0)'">
                            📚 Learning
                        </a>
                        
                        <a href="#" onclick="navigateToSection('community-section'); closeMenu(); return false;" style="
                            display: block;
                            padding: 12px 16px;
                            background: rgba(255, 255, 255, 0.08);
                            border: 1px solid rgba(255, 255, 255, 0.1);
                            border-radius: 12px;
                            color: white;
                            text-decoration: none;
                            font-weight: 500;
                            transition: all 0.3s ease;
                            text-align: center;
                        " onmouseover="this.style.background='rgba(31, 249, 224, 0.15)'; this.style.borderColor='rgba(31, 249, 224, 0.4)'; this.style.transform='translateY(-2px)'" 
                           onmouseout="this.style.background='rgba(255, 255, 255, 0.08)'; this.style.borderColor='rgba(255, 255, 255, 0.1)'; this.style.transform='translateY(0)'">
                            👥 Community
                        </a>
                    </div>
                    
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                        <div style="color: #1ff9e0; font-size: 14px; font-weight: 600; margin-bottom: 12px; text-align: center;">
                            Socials
                        </div>
                        <div style="display: flex; gap: 8px; justify-content: center;">
                            <a href="https://x.com/Sameermistri" target="_blank" style="
                                padding: 8px 12px;
                                background: rgba(255, 255, 255, 0.06);
                                border: 1px solid rgba(255, 255, 255, 0.08);
                                border-radius: 8px;
                                color: rgba(255, 255, 255, 0.8);
                                text-decoration: none;
                                font-size: 12px;
                                transition: all 0.3s ease;
                            " onmouseover="this.style.background='rgba(31, 249, 224, 0.12)'; this.style.borderColor='rgba(31, 249, 224, 0.3)'; this.style.color='#1ff9e0'" 
                               onmouseout="this.style.background='rgba(255, 255, 255, 0.06)'; this.style.borderColor='rgba(255, 255, 255, 0.08)'; this.style.color='rgba(255, 255, 255, 0.8)'">
                                Twitter
                            </a>
                            <a href="https://www.instagram.com/sameermistrii/" target="_blank" style="
                                padding: 8px 12px;
                                background: rgba(255, 255, 255, 0.06);
                                border: 1px solid rgba(255, 255, 255, 0.08);
                                border-radius: 8px;
                                color: rgba(255, 255, 255, 0.8);
                                text-decoration: none;
                                font-size: 12px;
                                transition: all 0.3s ease;
                            " onmouseover="this.style.background='rgba(31, 249, 224, 0.12)'; this.style.borderColor='rgba(31, 249, 224, 0.3)'; this.style.color='#1ff9e0'" 
                               onmouseout="this.style.background='rgba(255, 255, 255, 0.06)'; this.style.borderColor='rgba(255, 255, 255, 0.08)'; this.style.color='rgba(255, 255, 255, 0.8)'">
                                Instagram
                            </a>
                            <a href="https://www.linkedin.com/in/sameermistri/" target="_blank" style="
                                padding: 8px 12px;
                                background: rgba(255, 255, 255, 0.06);
                                border: 1px solid rgba(255, 255, 255, 0.08);
                                border-radius: 8px;
                                color: rgba(255, 255, 255, 0.8);
                                text-decoration: none;
                                font-size: 12px;
                                transition: all 0.3s ease;
                            " onmouseover="this.style.background='rgba(31, 249, 224, 0.12)'; this.style.borderColor='rgba(31, 249, 224, 0.3)'; this.style.color='#1ff9e0'" 
                               onmouseout="this.style.background='rgba(255, 255, 255, 0.06)'; this.style.borderColor='rgba(255, 255, 255, 0.08)'; this.style.color='rgba(255, 255, 255, 0.8)'">
                                LinkedIn
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add to container
    if (existingMenu) {
        existingMenu.innerHTML = menuHTML;
    } else {
        // Create container if it doesn't exist
        const container = document.createElement('div');
        container.id = 'staggered-menu-container';
        container.className = 'mobile-only';
        container.innerHTML = menuHTML;
        document.body.appendChild(container);
    }
    
    console.log('✅ Simple mobile menu created');
}

// Menu toggle function
function toggleMenu() {
    const panel = document.getElementById('menu-panel');
    const icon = document.getElementById('menu-icon');
    
    if (panel && icon) {
        const isOpen = panel.style.opacity === '1';
        
        if (isOpen) {
            // Close menu
            panel.style.opacity = '0';
            panel.style.visibility = 'hidden';
            panel.style.transform = 'translateY(-20px) scale(0.9)';
            panel.style.pointerEvents = 'none';
            icon.textContent = '☰';
            document.body.classList.remove('menu-open');
        } else {
            // Open menu
            panel.style.opacity = '1';
            panel.style.visibility = 'visible';
            panel.style.transform = 'translateY(0) scale(1)';
            panel.style.pointerEvents = 'auto';
            icon.textContent = '✕';
            document.body.classList.add('menu-open');
        }
    }
}

// Close menu function
function closeMenu() {
    const panel = document.getElementById('menu-panel');
    const icon = document.getElementById('menu-icon');
    
    if (panel && icon) {
        panel.style.opacity = '0';
        panel.style.visibility = 'hidden';
        panel.style.transform = 'translateY(-20px) scale(0.9)';
        panel.style.pointerEvents = 'none';
        icon.textContent = '☰';
        document.body.classList.remove('menu-open');
    }
}

// Navigation function
function navigateToSection(section) {
    if (window.showSection) {
        window.showSection(section);
    }
}

// Make functions global
window.toggleMenu = toggleMenu;
window.closeMenu = closeMenu;
window.navigateToSection = navigateToSection;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 Initializing simple mobile menu...');
    createSimpleMobileMenu();
    
    // Add click event to toggle button
    setTimeout(() => {
        const toggleBtn = document.getElementById('menu-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleMenu();
            });
            console.log('✅ Menu toggle button click event added');
        }
        
        // Add click outside to close
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('menu-panel');
            const toggleBtn = document.getElementById('menu-toggle-btn');
            
            if (panel && panel.style.opacity === '1' && 
                !panel.contains(e.target) && 
                !toggleBtn.contains(e.target)) {
                closeMenu();
            }
        });
        
        console.log('✅ Click outside to close functionality added');
    }, 100);
});

console.log('🔧 Simple Mobile Menu Fix Loaded');
