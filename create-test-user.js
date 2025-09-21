// Simple script to create a test user for testing the dropdown
console.log('🧪 Test user creation script loaded');

function createTestUserAccount() {
    console.log('👤 Creating test user...');
    
    // Mock user data
    const testUser = {
        id: 'test-user-123',
        username: 'testuser',
        email: 'test@mindmate.com',
        createdAt: new Date().toISOString()
    };
    
    // Mock token (in a real app this would come from server)
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QtdXNlci0xMjMiLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjk5OTk5OTk5OTl9.test';
    
    // Set auth state
    if (typeof authManager !== 'undefined') {
        authManager.user = testUser;
        authManager.token = testToken;
        authManager.isInitialized = true;
        
        // Store in localStorage
        localStorage.setItem('mindmate_user', JSON.stringify(testUser));
        localStorage.setItem('mindmate_token', testToken);
        
        // Update UI
        authManager.updateNavigation();
        authManager.showAuthenticatedFeatures();
        
        console.log('✅ Test user created and logged in:', testUser.username);
        console.log('🎯 You can now click on the user button to test the dropdown');
        
        return true;
    } else {
        console.log('❌ AuthManager not found');
        return false;
    }
}

// Auto-create test user is disabled - run createTestUserAccount() manually if needed
// setTimeout(() => {
//     if (typeof authManager !== 'undefined' && (!authManager.user || !authManager.token)) {
//         console.log('🎯 No user logged in, creating test user...');
//         createTestUserAccount();
//     }
// }, 2000);

// Make function globally available
window.createTestUserAccount = createTestUserAccount;

console.log('📌 Run createTestUserAccount() to create a test user');
