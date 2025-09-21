// Force login/signup buttons to appear immediately on page load
console.log('🔧 Force auth buttons script loaded');

function forceCreateAuthButtons() {
    console.log('⚡ Force creating auth buttons...');
    
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) {
        console.log('❌ Nav links not found, retrying...');
        setTimeout(forceCreateAuthButtons, 500);
        return;
    }
    
    // Remove any existing auth buttons
    navLinks.querySelectorAll('.auth-btn-item, .user-menu, .auth-buttons').forEach(el => el.remove());
    
    // Create login button
    const loginBtn = document.createElement('li');
    loginBtn.className = 'auth-btn-item';
    loginBtn.innerHTML = `
        <button onclick="showLoginModal()" style="
            background: transparent;
            border: 2px solid #25F4DF;
            color: #25F4DF;
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            cursor: pointer;
            font-family: Inter, sans-serif;
            font-size: 14px;
            font-weight: 500;
            margin-right: 0.5rem;
            transition: all 0.3s ease;
        " onmouseover="this.style.background='#25F4DF'; this.style.color='#1a4037';" onmouseout="this.style.background='transparent'; this.style.color='#25F4DF';">
            🔑 Login
        </button>
    `;
    
    // Create signup button
    const signupBtn = document.createElement('li');
    signupBtn.className = 'auth-btn-item';
    signupBtn.innerHTML = `
        <button onclick="showSignupModal()" style="
            background: #25F4DF;
            border: 2px solid #25F4DF;
            color: #1a4037;
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            cursor: pointer;
            font-family: Inter, sans-serif;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
        " onmouseover="this.style.background='transparent'; this.style.color='#25F4DF';" onmouseout="this.style.background='#25F4DF'; this.style.color='#1a4037';">
            🚀 Sign Up
        </button>
    `;
    
    // Add buttons to navigation
    navLinks.appendChild(loginBtn);
    navLinks.appendChild(signupBtn);
    
    console.log('✅ Auth buttons force-created!');
}

function showLoginModal() {
    console.log('🔑 Login clicked');
    
    // Remove existing modal
    const existing = document.getElementById('authModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'authModal';
    modal.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2147483647;
        " onclick="this.remove()">
            <div style="
                background: #1a4037;
                border: 2px solid #25F4DF;
                border-radius: 1rem;
                padding: 2rem;
                width: 90%;
                max-width: 400px;
                font-family: Inter, sans-serif;
                color: white;
            " onclick="event.stopPropagation()">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h2 style="margin: 0; color: #25F4DF;">🔐 Welcome Back!</h2>
                    <button onclick="document.getElementById('authModal').remove()" style="
                        background: none;
                        border: none;
                        color: #25F4DF;
                        font-size: 24px;
                        cursor: pointer;
                    ">×</button>
                </div>
                <form onsubmit="handleLogin(event)">
                    <input type="text" name="username" placeholder="Username or Email" required style="
                        width: 100%;
                        padding: 0.75rem;
                        margin-bottom: 1rem;
                        border: 1px solid #25F4DF;
                        border-radius: 0.5rem;
                        background: #2d5a52;
                        color: white;
                        font-family: inherit;
                        box-sizing: border-box;
                    ">
                    <input type="password" name="password" placeholder="Password" required style="
                        width: 100%;
                        padding: 0.75rem;
                        margin-bottom: 1rem;
                        border: 1px solid #25F4DF;
                        border-radius: 0.5rem;
                        background: #2d5a52;
                        color: white;
                        font-family: inherit;
                        box-sizing: border-box;
                    ">
                    <button type="submit" style="
                        width: 100%;
                        background: #25F4DF;
                        border: none;
                        color: #1a4037;
                        padding: 0.75rem;
                        border-radius: 0.5rem;
                        cursor: pointer;
                        font-family: inherit;
                        font-size: 16px;
                        font-weight: 500;
                        margin-bottom: 1rem;
                    ">Login</button>
                </form>
                <p style="text-align: center; margin: 0;">
                    Don't have an account? 
                    <a href="#" onclick="document.getElementById('authModal').remove(); showSignupModal();" style="color: #25F4DF; text-decoration: none;">Sign up</a>
                </p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.querySelector('input').focus();
}

function showSignupModal() {
    console.log('🚀 Signup clicked');
    
    // Remove existing modal
    const existing = document.getElementById('authModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'authModal';
    modal.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2147483647;
        " onclick="this.remove()">
            <div style="
                background: #1a4037;
                border: 2px solid #25F4DF;
                border-radius: 1rem;
                padding: 2rem;
                width: 90%;
                max-width: 400px;
                font-family: Inter, sans-serif;
                color: white;
            " onclick="event.stopPropagation()">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h2 style="margin: 0; color: #25F4DF;">🚀 Join MindMate</h2>
                    <button onclick="document.getElementById('authModal').remove()" style="
                        background: none;
                        border: none;
                        color: #25F4DF;
                        font-size: 24px;
                        cursor: pointer;
                    ">×</button>
                </div>
                <form onsubmit="handleSignup(event)">
                    <input type="text" name="username" placeholder="Username" required style="
                        width: 100%;
                        padding: 0.75rem;
                        margin-bottom: 1rem;
                        border: 1px solid #25F4DF;
                        border-radius: 0.5rem;
                        background: #2d5a52;
                        color: white;
                        font-family: inherit;
                        box-sizing: border-box;
                    ">
                    <input type="email" name="email" placeholder="Email" required style="
                        width: 100%;
                        padding: 0.75rem;
                        margin-bottom: 1rem;
                        border: 1px solid #25F4DF;
                        border-radius: 0.5rem;
                        background: #2d5a52;
                        color: white;
                        font-family: inherit;
                        box-sizing: border-box;
                    ">
                    <input type="password" name="password" placeholder="Password" required style="
                        width: 100%;
                        padding: 0.75rem;
                        margin-bottom: 1rem;
                        border: 1px solid #25F4DF;
                        border-radius: 0.5rem;
                        background: #2d5a52;
                        color: white;
                        font-family: inherit;
                        box-sizing: border-box;
                    ">
                    <input type="password" name="confirmPassword" placeholder="Confirm Password" required style="
                        width: 100%;
                        padding: 0.75rem;
                        margin-bottom: 1rem;
                        border: 1px solid #25F4DF;
                        border-radius: 0.5rem;
                        background: #2d5a52;
                        color: white;
                        font-family: inherit;
                        box-sizing: border-box;
                    ">
                    <button type="submit" style="
                        width: 100%;
                        background: #25F4DF;
                        border: none;
                        color: #1a4037;
                        padding: 0.75rem;
                        border-radius: 0.5rem;
                        cursor: pointer;
                        font-family: inherit;
                        font-size: 16px;
                        font-weight: 500;
                        margin-bottom: 1rem;
                    ">Create Account</button>
                </form>
                <p style="text-align: center; margin: 0;">
                    Already have an account? 
                    <a href="#" onclick="document.getElementById('authModal').remove(); showLoginModal();" style="color: #25F4DF; text-decoration: none;">Login</a>
                </p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.querySelector('input').focus();
}

async function handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const username = formData.get('username');
    const password = formData.get('password');
    
    console.log('Login attempt:', { username });
    
    // Show loading
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Login successful
            console.log('Login successful:', data);
            
            // Store auth data
            localStorage.setItem('mindmate_token', data.token);
            localStorage.setItem('mindmate_user', JSON.stringify(data.user));
            
            // Update auth manager if available
            if (typeof authManager !== 'undefined') {
                authManager.user = data.user;
                authManager.token = data.token;
                authManager.updateNavigation();
                authManager.showAuthenticatedFeatures();
            }
            
            // Close modal and show success
            document.getElementById('authModal').remove();
            showSuccessMessage('Welcome back, ' + data.user.username + '!');
            
        } else {
            // Login failed
            throw new Error(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
        
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function handleSignup(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const username = formData.get('username');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    console.log('Signup attempt:', { username, email });
    
    // Show loading
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating Account...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Registration successful
            console.log('Registration successful:', data);
            
            // Store auth data
            localStorage.setItem('mindmate_token', data.token);
            localStorage.setItem('mindmate_user', JSON.stringify(data.user));
            
            // Update auth manager if available
            if (typeof authManager !== 'undefined') {
                authManager.user = data.user;
                authManager.token = data.token;
                authManager.updateNavigation();
                authManager.showAuthenticatedFeatures();
            }
            
            // Close modal and show success
            document.getElementById('authModal').remove();
            showSuccessMessage('Welcome to MindMate, ' + data.user.username + '!');
            
        } else {
            // Registration failed
            throw new Error(data.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed: ' + error.message);
        
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function showSuccessMessage(message) {
    const notification = document.createElement('div');
    notification.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: #1a4037;
            border: 2px solid #25F4DF;
            border-radius: 0.5rem;
            padding: 1rem;
            color: white;
            font-family: Inter, sans-serif;
            font-weight: 500;
            z-index: 2147483647;
            box-shadow: 0 10px 30px rgba(37, 244, 223, 0.3);
            animation: slideIn 0.3s ease-out;
        ">
            ✅ ${message}
        </div>
    `;
    
    // Add slide-in animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
        style.remove();
    }, 3000);
}

// Force create buttons immediately when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', forceCreateAuthButtons);
} else {
    forceCreateAuthButtons();
}

// Also try multiple times to ensure buttons appear
setTimeout(forceCreateAuthButtons, 500);
setTimeout(forceCreateAuthButtons, 1000);
setTimeout(forceCreateAuthButtons, 2000);

console.log('🔧 Force auth buttons script ready - buttons should appear shortly!');
