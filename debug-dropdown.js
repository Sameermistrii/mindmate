// Debug script for testing dropdown functionality
console.log('🔍 Starting dropdown debug...');

// Check if user is authenticated
function checkAuthStatus() {
    console.log('🔍 Checking auth status...');
    console.log('User object:', authManager?.user);
    console.log('Token:', authManager?.token);
    console.log('Is initialized:', authManager?.isInitialized);
    
    const userMenu = document.querySelector('.user-menu');
    const userButton = document.querySelector('.user-avatar-btn');
    const dropdown = document.getElementById('userDropdown');
    
    console.log('User menu element:', userMenu);
    console.log('User button element:', userButton);
    console.log('Dropdown element:', dropdown);
    
    return { userMenu, userButton, dropdown };
}

// Force create dropdown if user is authenticated
function forceCreateDropdown() {
    console.log('🔧 Force creating dropdown...');
    
    if (!authManager?.user) {
        console.log('❌ No authenticated user found');
        return false;
    }
    
    let userMenu = document.querySelector('.user-menu');
    if (!userMenu) {
        console.log('❌ No user menu found - user might not be logged in properly');
        return false;
    }
    
    // Remove existing dropdown
    const existingDropdown = document.getElementById('userDropdown');
    if (existingDropdown) {
        existingDropdown.remove();
        console.log('🗑️ Removed existing dropdown');
    }
    
    // Create new dropdown
    const dropdown = document.createElement('div');
    dropdown.id = 'userDropdown';
    dropdown.className = 'user-dropdown';
    dropdown.innerHTML = `
        <a href="#" onclick="authManager.showProfile(); event.preventDefault(); return false;">📊 My Profile</a>
        <a href="#" onclick="authManager.showAssessmentHistory(); event.preventDefault(); return false;">📋 Assessment History</a>
        <a href="#" onclick="authManager.logout(); event.preventDefault(); return false;">🚪 Logout</a>
    `;
    
    userMenu.appendChild(dropdown);
    
    // Apply styling
    const style = dropdown.style;
    style.setProperty('display', 'block', 'important');
    style.setProperty('position', 'absolute', 'important');
    style.setProperty('top', 'calc(100% + 0.5rem)', 'important');
    style.setProperty('right', '0', 'important');
    style.setProperty('z-index', '99999', 'important');
    style.setProperty('min-width', '250px', 'important');
    style.setProperty('width', '250px', 'important');
    style.setProperty('background', 'var(--mm-surface)', 'important');
    style.setProperty('border', '1px solid var(--mm-line)', 'important');
    style.setProperty('border-radius', '0.5rem', 'important');
    style.setProperty('box-shadow', '0 10px 30px rgba(0, 0, 0, 0.4)', 'important');
    style.setProperty('padding', '0.5rem 0', 'important');
    style.setProperty('visibility', 'visible', 'important');
    
    console.log('✅ Dropdown created and styled');
    return true;
}

// Test function to manually trigger dropdown
function testDropdown() {
    console.log('🧪 Testing dropdown functionality...');
    checkAuthStatus();
    
    if (authManager?.toggleUserMenu) {
        console.log('🔧 Calling toggleUserMenu...');
        authManager.toggleUserMenu();
    } else {
        console.log('🔧 toggleUserMenu not available, force creating...');
        forceCreateDropdown();
    }
}

// Run initial check
checkAuthStatus();

console.log('🔍 Debug script loaded. Run testDropdown() to test manually.');
console.log('🔍 Or run forceCreateDropdown() to force create the dropdown.');
