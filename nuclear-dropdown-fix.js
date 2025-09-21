// Nuclear option to fix dropdown interference from browser extensions
console.log('🚀 Loading nuclear dropdown fix...');

// Override any extension click handlers with our own
function nuclearDropdownFix() {
    console.log('💣 Applying nuclear dropdown fix...');
    
    // Kill all existing dropdowns and menus
    document.querySelectorAll('[id*="dropdown"], [class*="dropdown"], [class*="menu"]').forEach(el => {
        if (el.id !== 'userDropdown' && !el.closest('.user-menu')) {
            el.style.display = 'none !important';
        }
    });
    
    // Force create our dropdown in a way that can't be interfered with
    createIndestructibleDropdown();
}

function createIndestructibleDropdown() {
    console.log('🛡️ Creating indestructible dropdown...');
    
    // Remove any existing navigation and recreate it
    const header = document.querySelector('.header');
    if (!header) {
        console.log('❌ Header not found');
        return;
    }
    
    // Find or create navigation
    let nav = header.querySelector('.nav');
    if (!nav) {
        nav = document.createElement('nav');
        nav.className = 'nav';
        header.querySelector('.container').appendChild(nav);
    }
    
    // Add logo if missing
    let logo = nav.querySelector('.logo');
    if (!logo) {
        logo = document.createElement('div');
        logo.className = 'logo';
        logo.textContent = '🧠 MindMate';
        nav.appendChild(logo);
    }
    
    // Force create nav-links
    let navLinks = nav.querySelector('.nav-links');
    if (!navLinks) {
        navLinks = document.createElement('ul');
        navLinks.className = 'nav-links';
        nav.appendChild(navLinks);
    }
    
    // Clear existing content and rebuild
    navLinks.innerHTML = `
        <li><a href="?section=hero">Home</a></li>
        <li><a href="?section=quiz-section">Assessment</a></li>
        <li><a href="?section=chat-section">AI Mentor</a></li>
        <li><a href="?section=learning-section">Learning</a></li>
        <li><a href="?section=community-section">Community</a></li>
        <li class="user-menu-nuclear" style="position: relative;">
            <button class="user-avatar-btn-nuclear" onclick="showNuclearDropdown()" type="button" style="
                background: #2d5a52;
                border: 2px solid #25F4DF;
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 0.5rem;
                cursor: pointer;
                font-family: inherit;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            ">
                👤 TestUser (Click Me!)
            </button>
        </li>
    `;
    
    console.log('✅ Indestructible navigation created');
}

function showNuclearDropdown() {
    console.log('💥 Nuclear dropdown triggered!');
    
    // Stop all event propagation
    event.stopPropagation();
    event.stopImmediatePropagation();
    event.preventDefault();
    
    // Remove any existing dropdown
    const existing = document.getElementById('nuclearDropdown');
    if (existing) {
        existing.remove();
    }
    
    // Get user menu
    const userMenu = document.querySelector('.user-menu-nuclear');
    if (!userMenu) {
        console.log('❌ Nuclear user menu not found');
        return;
    }
    
    // Create dropdown with absolute positioning relative to viewport
    const dropdown = document.createElement('div');
    dropdown.id = 'nuclearDropdown';
    dropdown.innerHTML = `
        <a href="#" onclick="alert('My Profile clicked!'); event.stopPropagation(); return false;">📊 My Profile</a>
        <a href="#" onclick="alert('Assessment History clicked!'); event.stopPropagation(); return false;">📋 Assessment History</a>
        <a href="#" onclick="alert('Settings clicked!'); event.stopPropagation(); return false;">⚙️ Settings</a>
        <a href="#" onclick="alert('Logout clicked!'); event.stopPropagation(); return false;">🚪 Logout</a>
    `;
    
    // Get button position
    const button = userMenu.querySelector('.user-avatar-btn-nuclear');
    const rect = button.getBoundingClientRect();
    
    // Append to body with fixed positioning
    document.body.appendChild(dropdown);
    
    // Apply nuclear-level styling
    const style = dropdown.style;
    style.position = 'fixed';
    style.top = (rect.bottom + 10) + 'px';
    style.right = '20px';
    style.zIndex = '2147483647'; // Maximum possible z-index
    style.width = '250px';
    style.background = '#1a4037';
    style.border = '2px solid #25F4DF';
    style.borderRadius = '8px';
    style.boxShadow = '0 20px 60px rgba(37, 244, 223, 0.4), 0 0 0 1000px rgba(0,0,0,0.3)';
    style.padding = '8px 0';
    style.fontFamily = 'Inter, sans-serif';
    style.fontSize = '14px';
    style.overflow = 'visible';
    style.pointerEvents = 'all';
    style.userSelect = 'none';
    
    // Style all links
    const links = dropdown.querySelectorAll('a');
    links.forEach((link, index) => {
        const linkStyle = link.style;
        linkStyle.display = 'block';
        linkStyle.padding = '12px 16px';
        linkStyle.color = '#ffffff';
        linkStyle.textDecoration = 'none';
        linkStyle.borderBottom = index < links.length - 1 ? '1px solid #4a7b6d' : 'none';
        linkStyle.transition = 'all 0.2s ease';
        linkStyle.cursor = 'pointer';
        
        // Add hover effects
        link.addEventListener('mouseenter', () => {
            linkStyle.background = '#25F4DF';
            linkStyle.color = '#1a4037';
            linkStyle.transform = 'translateX(5px)';
        });
        
        link.addEventListener('mouseleave', () => {
            linkStyle.background = 'transparent';
            linkStyle.color = '#ffffff';
            linkStyle.transform = 'translateX(0)';
        });
        
        // Ensure clicks work
        link.addEventListener('click', (e) => {
            e.stopPropagation();
            e.stopImmediatePropagation();
        });
    });
    
    // Close dropdown when clicking outside
    setTimeout(() => {
        const closeHandler = (e) => {
            if (!dropdown.contains(e.target) && !button.contains(e.target)) {
                dropdown.remove();
                document.removeEventListener('click', closeHandler, true);
            }
        };
        document.addEventListener('click', closeHandler, true);
    }, 100);
    
    // Add close button
    const closeBtn = document.createElement('div');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
        position: absolute;
        top: 5px;
        right: 8px;
        color: #25F4DF;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
        line-height: 1;
        z-index: 1;
    `;
    closeBtn.onclick = () => dropdown.remove();
    dropdown.appendChild(closeBtn);
    
    console.log('💥 Nuclear dropdown deployed!');
    console.log('📍 Position:', dropdown.getBoundingClientRect());
}

// Auto-apply fix after page load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        console.log('🎯 Auto-applying nuclear fix...');
        nuclearDropdownFix();
    }, 1000);
});

// Also apply immediately if DOM is already ready
if (document.readyState !== 'loading') {
    setTimeout(() => {
        console.log('🎯 Applying nuclear fix immediately...');
        nuclearDropdownFix();
    }, 500);
}

// Global functions
window.nuclearDropdownFix = nuclearDropdownFix;
window.showNuclearDropdown = showNuclearDropdown;

console.log('💣 Nuclear dropdown fix loaded!');
console.log('📌 Run nuclearDropdownFix() to apply the fix manually');
