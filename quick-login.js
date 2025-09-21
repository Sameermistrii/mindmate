// Quick login helper for testing dropdown functionality
function quickTestLogin() {
    console.log('🧪 Creating test login...');
    
    // Show login modal
    if (typeof authManager !== 'undefined') {
        authManager.showLoginModal();
    } else {
        console.log('❌ AuthManager not found');
    }
}

function createTestUser() {
    console.log('👤 Creating test user account...');
    
    // Show registration modal
    if (typeof authManager !== 'undefined') {
        authManager.showRegisterModal();
    } else {
        console.log('❌ AuthManager not found');
    }
}

// Test if we can manually trigger the dropdown (even without auth)
function forceTestDropdown() {
    console.log('🔧 Force testing dropdown...');
    
    // First create a mock user menu if it doesn't exist
    const nav = document.querySelector('.nav-links');
    if (!nav) {
        console.log('❌ Navigation not found');
        return;
    }
    
    // Remove existing user menu
    const existingMenu = nav.querySelector('.user-menu');
    if (existingMenu) existingMenu.remove();
    
    // Create test user menu
    const userMenuHTML = `
        <li class="user-menu">
            <button class="user-avatar-btn" onclick="forceShowDropdown()" type="button">
                👤 TestUser
            </button>
        </li>
    `;
    
    nav.insertAdjacentHTML('beforeend', userMenuHTML);
    console.log('✅ Test user menu created');
}

function forceShowDropdown() {
    console.log('🎯 Force showing dropdown...');
    
    const userMenu = document.querySelector('.user-menu');
    if (!userMenu) {
        console.log('❌ User menu not found');
        return;
    }
    
    // Remove existing dropdown
    const existing = document.getElementById('userDropdown');
    if (existing) existing.remove();
    
    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.id = 'userDropdown';
    dropdown.className = 'user-dropdown';
    dropdown.innerHTML = `
        <a href="#" onclick="alert('My Profile clicked'); return false;">📊 My Profile</a>
        <a href="#" onclick="alert('Assessment History clicked'); return false;">📋 Assessment History</a>
        <a href="#" onclick="alert('Logout clicked'); return false;">🚪 Logout</a>
    `;
    
    userMenu.appendChild(dropdown);
    
    // Apply maximum styling force
    const style = dropdown.style;
    style.setProperty('display', 'block', 'important');
    style.setProperty('position', 'absolute', 'important');
    style.setProperty('top', 'calc(100% + 0.5rem)', 'important');
    style.setProperty('right', '0', 'important');
    style.setProperty('z-index', '2147483647', 'important'); // Max z-index
    style.setProperty('min-width', '250px', 'important');
    style.setProperty('width', '250px', 'important');
    style.setProperty('background', '#2d5a52', 'important');
    style.setProperty('border', '2px solid #25F4DF', 'important');
    style.setProperty('border-radius', '0.5rem', 'important');
    style.setProperty('box-shadow', '0 20px 60px rgba(37, 244, 223, 0.3)', 'important');
    style.setProperty('padding', '0.5rem 0', 'important');
    style.setProperty('visibility', 'visible', 'important');
    style.setProperty('opacity', '1', 'important');
    style.setProperty('pointer-events', 'all', 'important');
    
    // Style the links
    const links = dropdown.querySelectorAll('a');
    links.forEach(link => {
        const linkStyle = link.style;
        linkStyle.setProperty('display', 'block', 'important');
        linkStyle.setProperty('padding', '0.75rem 1rem', 'important');
        linkStyle.setProperty('color', '#ffffff', 'important');
        linkStyle.setProperty('text-decoration', 'none', 'important');
        linkStyle.setProperty('border-bottom', '1px solid #4a7b6d', 'important');
        linkStyle.setProperty('transition', 'background 0.3s ease', 'important');
    });
    
    // Add hover effects
    links.forEach(link => {
        link.addEventListener('mouseenter', () => {
            link.style.setProperty('background', '#25F4DF', 'important');
            link.style.setProperty('color', '#2d5a52', 'important');
        });
        link.addEventListener('mouseleave', () => {
            link.style.setProperty('background', 'transparent', 'important');
            link.style.setProperty('color', '#ffffff', 'important');
        });
    });
    
    console.log('✅ Dropdown force-created with maximum z-index');
    console.log('📍 Dropdown element:', dropdown);
    console.log('📍 Position:', dropdown.getBoundingClientRect());
}

console.log('🧪 Quick login helper loaded');
console.log('📌 Available functions:');
console.log('   - quickTestLogin() - Show login modal');
console.log('   - createTestUser() - Show registration modal'); 
console.log('   - forceTestDropdown() - Create test user menu');
console.log('   - forceShowDropdown() - Force show dropdown');
