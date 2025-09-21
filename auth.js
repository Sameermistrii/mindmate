// Authentication Manager for MindMate Frontend

class AuthManager {
    constructor() {
        this.user = null;
        this.token = localStorage.getItem('mindmate_token');
        this.isInitialized = false;
        this.initializationPromise = null;
        this.stickyAuthMode = true; // PREVENT LOGOUT ON REFRESH
        this.isPageRefresh = true; // Track if this is a page refresh vs normal navigation
        
        // Hydrate user from storage to avoid UI flicker/logout feeling on refresh
        const storedUser = localStorage.getItem('mindmate_user');
        if (storedUser) {
            try {
                this.user = JSON.parse(storedUser);
                console.log('🔄 Restored user from localStorage:', this.user?.username);
                
                // IMMEDIATE UI UPDATE: Show authenticated state right away during page refresh
                if (this.user && this.token) {
                    console.log('🔒 STICKY AUTH: Immediately showing authenticated UI for page refresh');
                    // Wait for DOM then show auth UI
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', () => {
                            this.updateUIForAuthenticatedUser();
                            // Force navigation update to show user menu immediately
                            this.updateNavigation();
                        });
                    } else {
                        setTimeout(() => {
                            this.updateUIForAuthenticatedUser();
                            // Force navigation update to show user menu immediately
                            this.updateNavigation();
                        }, 0);
                    }
                }
            } catch (_) {
                // Clear invalid stored user data
                localStorage.removeItem('mindmate_user');
            }
        }
        
        // After 2 seconds, consider this no longer a page refresh
        setTimeout(() => {
            this.isPageRefresh = false;
            console.log('⏰ Page refresh period ended - normal logout behavior restored');
        }, 2000);
        
        // Wait for DOM to be ready before initializing auth
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeAuth();
                // Force navigation update after DOM is ready
                setTimeout(() => this.updateNavigation(), 100);
                // Extra safety update
                setTimeout(() => this.updateNavigation(), 1000);
            });
        } else {
            // DOM is already ready
            setTimeout(() => {
                this.initializeAuth();
                // Force navigation update
                setTimeout(() => this.updateNavigation(), 100);
                // Extra safety update
                setTimeout(() => this.updateNavigation(), 1000);
            }, 0);
        }
    }

    // Method to silently validate token without making API calls
    validateTokenFormat() {
        if (!this.token) {
            console.log('🔍 Token validation: No token present');
            return false;
        }
        
        // Basic JWT format check (should have 3 parts separated by dots)
        const parts = this.token.split('.');
        if (parts.length !== 3) {
            console.log('⚠️ Token validation: Invalid token format detected');
            // DON'T clear auth state here - let the calling code decide
            return false;
        }
        
        try {
            // Try to decode the payload to check if it's expired
            const payload = JSON.parse(atob(parts[1]));
            const now = Math.floor(Date.now() / 1000);
            
            if (payload.exp && payload.exp < now) {
                console.log('⚠️ Token validation: Token is expired');
                // DON'T clear auth state here - let the calling code decide
                return false;
            }
            
            console.log('✅ Token validation: Token format is valid');
            return true;
        } catch (error) {
            console.log('⚠️ Token validation: Token decode failed:', error.message);
            // DON'T clear auth state here - let the calling code decide
            return false;
        }
    }

    // Helper to clear all authentication state
    clearAuthState() {
        this.user = null;
        this.token = null;
        localStorage.removeItem('mindmate_token');
        localStorage.removeItem('mindmate_user');
    }

    async initializeAuth() {
        // Prevent multiple initialization calls
        if (this.isInitialized || this.initializationPromise) {
            return this.initializationPromise || Promise.resolve();
        }
        
        console.log('🚀 Starting authentication initialization...');
        
        this.initializationPromise = this._performAuthInitialization();
        await this.initializationPromise;
        this.isInitialized = true;
        
        // SAFETY: Force navigation update after initialization to ensure UI consistency
        setTimeout(() => {
            if (this.user && this.token) {
                console.log('🔄 SAFETY: Force navigation update post-init for:', this.user.username);
                this.updateNavigation();
            }
        }, 100);
        
        return this.initializationPromise;
    }
    
    async _performAuthInitialization() {
        // SMART FALLBACK: Only be aggressive during page refresh period
        if (this.user && this.token && this.isPageRefresh) {
            console.log('🔒 PAGE REFRESH: Showing cached auth state for:', this.user.username);
            this.updateUIForAuthenticatedUser();
            // Mark as initialized immediately during page refresh to prevent logout
            this.isInitialized = true;
        }
        
        // First validate token format before attempting any API calls
        if (this.token && !this.validateTokenFormat()) {
            // During page refresh, be more forgiving
            if (this.isPageRefresh && this.user) {
                console.log('⚠️ Invalid token format during page refresh, but keeping cached user state');
                this.updateUIForAuthenticatedUser();
                return;
            } else {
                console.log('❌ Invalid token format, showing guest UI');
                this.updateUIForGuestUser();
                return;
            }
        }

        if (this.token) {
            try {
                console.log('🔍 Validating authentication with server...');
                const profile = await this.fetchUserProfileWithRetry(2, 300);
                if (profile) {
                    this.user = profile;
                    localStorage.setItem('mindmate_user', JSON.stringify(this.user));
                    this.updateUIForAuthenticatedUser();
                    console.log('✅ Authentication validated for:', this.user.username);
                } else {
                    // Be forgiving during page refresh period
                    if (this.isPageRefresh && this.user) {
                        console.log('⚠️ Profile fetch failed during page refresh, keeping cached state');
                        this.updateUIForAuthenticatedUser();
                    } else {
                        console.log('❌ Profile fetch failed, clearing authentication state');
                        this.clearAuthState();
                        this.updateUIForGuestUser();
                    }
                }
            } catch (error) {
                console.error('❌ Auth initialization failed:', error);
                
                // Be forgiving during page refresh period
                if (this.isPageRefresh && this.user) {
                    console.log('🔒 NETWORK ERROR during page refresh: Keeping cached auth state for:', this.user.username);
                    this.updateUIForAuthenticatedUser();
                } else {
                    console.log('❌ Network error, clearing authentication state');
                    this.clearAuthState();
                    this.updateUIForGuestUser();
                }
            }
        } else {
            // No token - show guest UI
            console.log('👥 No token found, showing guest UI');
            this.clearAuthState();
            this.updateUIForGuestUser();
        }
    }

    async fetchUserProfileWithRetry(retries = 2, delayMs = 500) {
        for (let attempt = 0; attempt <= retries; attempt++) {
            const profile = await this.fetchUserProfile();
            if (profile) return profile;
            if (attempt < retries) {
                await new Promise(r => setTimeout(r, delayMs));
            }
        }
        return null;
    }

    async register(username, email, password) {
        try {
            console.log('🔑 DEBUG: Attempting registration for:', username, email);
            
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password })
            });

            console.log('🔑 DEBUG: Registration response status:', response.status);
            
            const data = await response.json();
            console.log('🔑 DEBUG: Registration response data:', data);

            if (data.success) {
                this.token = data.token;
                this.user = data.user;
                
                // Persist authentication state immediately
                localStorage.setItem('mindmate_token', this.token);
                localStorage.setItem('mindmate_user', JSON.stringify(this.user));
                
                this.updateUIForAuthenticatedUser();
                showNotification('Registration successful! Welcome to MindMate! 🎉', 'success');
                console.log('✅ DEBUG: Registration successful, user:', this.user);
                
                // Mark as initialized to prevent auth flicker
                this.isInitialized = true;
                
                return { success: true };
            } else {
                throw new Error(data.error || 'Registration failed');
            }
        } catch (error) {
            console.error('❌ DEBUG: Registration error:', error);
            return { success: false, error: error.message };
        }
    }

    async login(username, password) {
        try {
            console.log('🔑 DEBUG: Attempting login for:', username);
            
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            console.log('🔑 DEBUG: Login response status:', response.status);
            
            const data = await response.json();
            console.log('🔑 DEBUG: Login response data:', data);

            if (data.success) {
                this.token = data.token;
                this.user = data.user;
                
                // Persist authentication state immediately
                localStorage.setItem('mindmate_token', this.token);
                localStorage.setItem('mindmate_user', JSON.stringify(this.user));
                
                this.updateUIForAuthenticatedUser();
                showNotification(`Welcome back, ${this.user.username}! 👋`, 'success');
                console.log('✅ DEBUG: Login successful, user:', this.user);
                
                // Mark as initialized to prevent auth flicker
                this.isInitialized = true;
                
                return { success: true };
            } else {
                throw new Error(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('❌ DEBUG: Login error:', error);
            return { success: false, error: error.message };
        }
    }

    logout(force = false) {
        // Only prevent logout during page refresh period (first 2 seconds) unless forced
        if (!force && this.stickyAuthMode && this.isPageRefresh) {
            console.log('🔒 STICKY AUTH: Logout blocked during page refresh period - this prevents auto-logout on refresh');
            return;
        }
        
        console.log('🚪 Performing logout...');
        this.clearAuthState();
        this.updateUIForGuestUser();
        showNotification('Logged out successfully! 👋', 'info');
        
        // Clear any user-specific data
        if (typeof conversationHistory !== 'undefined') {
            conversationHistory = [];
        }
        if (typeof userProfile !== 'undefined') {
            userProfile = {
                assessmentCompleted: false,
                topCareers: [],
                interests: [],
                skills: {},
                preferences: {}
            };
        }
        
        // Clear gamification data
        if (typeof gamificationProfile !== 'undefined') {
            gamificationProfile = null;
        }
    }
    
    // Manual logout function that bypasses sticky auth - same as normal logout now
    forceLogout() {
        console.log('🚪 Manual logout requested');
        this.logout(true);
    }

    async fetchUserProfile() {
        // Don't attempt to fetch profile if we don't have a token
        if (!this.token) {
            console.log('❌ Profile fetch: No token available, skipping profile fetch');
            return null;
        }

        // Check if token looks valid (basic format check)
        if (!this.validateTokenFormat()) {
            console.log('❌ Profile fetch: Token validation failed, skipping profile fetch');
            return null;
        }

        console.log('🔍 Profile fetch: Attempting to fetch profile with token:', this.token.substring(0, 20) + '...');

        try {
            const response = await fetch('/api/user/profile', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('🔍 Profile fetch: Response status:', response.status);

            if (response.ok) {
                const profile = await response.json();
                console.log('✅ Profile fetch: Profile fetched successfully for user:', profile.username);
                
                // Update global user profile for AI conversations
                if (profile.hasCompletedAssessment && profile.assessmentHistory.length > 0) {
                    const latest = profile.assessmentHistory[0];
                    if (typeof userProfile !== 'undefined') {
                        userProfile = {
                            assessmentCompleted: true,
                            topCareers: latest.top_careers || [],
                            interests: latest.quiz_answers.interests || [],
                            skills: latest.quiz_answers.skills || {},
                            preferences: latest.quiz_answers.careerValues || {}
                        };
                    }
                }
                
                return profile;
            } else if (response.status === 401) {
                // Token is invalid or expired, clear it
                console.log('❌ Profile fetch: Server returned 401, token is invalid or expired');
                console.log('❌ Profile fetch: Response text:', await response.text());
                this.clearAuthState();
                return null;
            } else {
                // Do not treat other non-200 responses as hard failure during init
                console.log('❌ Profile fetch: Failed with status:', response.status);
                const responseText = await response.text();
                console.log('❌ Profile fetch: Response text:', responseText);
                return null;
            }
        } catch (error) {
            console.error('❌ Profile fetch: Network error:', error);
            return null;
        }
    }

    async saveAssessmentResult(quizAnswers, careerScores, topCareers) {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            // Only add authorization header if we have a token
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }

            const response = await fetch('/api/assessment/save', {
                method: 'POST',
                headers,
                body: JSON.stringify({ quizAnswers, careerScores, topCareers })
            });

            const data = await response.json();
            
            if (data.success) {
                if (this.user) {
                    // Refresh user profile to get updated assessment data
                    await this.fetchUserProfile();
                }
                return { success: true, message: data.message };
            } else {
                throw new Error(data.error || 'Failed to save assessment');
            }
        } catch (error) {
            console.error('Assessment save error:', error);
            return { success: false, error: error.message };
        }
    }

    getAuthHeader() {
        return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
    }

    isAuthenticated() {
        // During initialization or page refresh, be more permissive to prevent UI flicker
        if (!this.isInitialized && this.user && this.token) {
            console.log('🔒 Auth check during init: User and token present, treating as authenticated');
            return true;
        }
        return !!this.user && !!this.token && this.isInitialized;
    }
    
    // Wait for authentication initialization to complete
    async waitForAuth() {
        if (this.isInitialized) {
            return this.isAuthenticated();
        }
        
        if (this.initializationPromise) {
            await this.initializationPromise;
        }
        
        return this.isAuthenticated();
    }

    // Helper method to make authenticated API requests with automatic token handling
    async makeAuthenticatedRequest(url, options = {}) {
        if (!this.token) {
            throw new Error('No authentication token available');
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`,
            ...options.headers
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (response.status === 401) {
                // Token is invalid or expired, clear authentication
                console.log('Authentication token expired, logging out');
                this.logout();
                throw new Error('Authentication token expired');
            }

            return response;
        } catch (error) {
            if (error.message === 'Authentication token expired') {
                throw error;
            }
            console.error('Authenticated request failed:', error);
            throw error;
        }
    }

    updateUIForAuthenticatedUser() {
        // Update navigation to show user info
        this.updateNavigation();
        
        // Show user-specific features
        this.showAuthenticatedFeatures();
        
        // Initialize gamification
        if (typeof initializeGamification === 'function') {
            initializeGamification();
        }
        
        // Initialize personalized AI chat if on chat section
        if (document.getElementById('chat-section') && document.getElementById('chat-section').classList.contains('active')) {
            this.initializePersonalizedChat();
        }

        // Persist latest user snapshot for refresh resiliency
        if (this.user) {
            try { localStorage.setItem('mindmate_user', JSON.stringify(this.user)); } catch (_) {}
        }
        
        // Add sticky auth indicator in console
        if (this.stickyAuthMode) {
            console.log('🔒 STICKY AUTH ACTIVE: User will stay logged in during page refresh');
        }
    }

    updateUIForGuestUser() {
        // Update navigation to show login/register
        this.updateNavigation();
        
        // Hide user-specific features
        this.hideAuthenticatedFeatures();
        
        console.log('👥 Guest UI updated - Login/Sign Up buttons should be visible');
    }

    updateNavigation() {
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) {
            console.log('⚠️ Navigation container not found');
            return;
        }
        
        // More robust authentication check for UI updates
        const isAuthenticatedForUI = this.user && this.token;
        console.log('🔄 Updating navigation - authenticated:', isAuthenticatedForUI, 'user:', this.user?.username);
        
        if (isAuthenticatedForUI) {
            // Add user menu with nuclear event handling
            const userMenu = `
                <li class="user-menu">
                    <button class="user-avatar-btn" onclick="event.stopPropagation(); event.stopImmediatePropagation(); authManager.toggleUserMenu(); return false;" type="button" style="
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
                        font-size: 14px;
                        font-weight: 500;
                    ">
                        👤 ${this.user.username}
                    </button>
                </li>
            `;
            
            // Remove existing user menu and auth buttons
            const existingUserMenu = navLinks.querySelector('.user-menu');
            const existingAuthButtons = navLinks.querySelector('.auth-buttons');
            if (existingUserMenu) existingUserMenu.remove();
            if (existingAuthButtons) existingAuthButtons.remove();
            
            navLinks.insertAdjacentHTML('beforeend', userMenu);
            console.log('✅ User menu added for:', this.user.username);
            
            // Force mobile visibility if on small screen
            if (window.innerWidth <= 768) {
                setTimeout(() => {
                    const userMenuElement = navLinks.querySelector('.user-menu');
                    const dropdownElement = document.getElementById('userDropdown');
                    if (userMenuElement && dropdownElement) {
                        userMenuElement.style.display = 'block';
                        userMenuElement.style.visibility = 'visible';
                        this.forceDropdownStyling(dropdownElement);
                        console.log('✅ Mobile user menu visibility forced');
                    }
                }, 100);
            }
        } else {
            // Add login/register buttons with proper styling
            const authButtons = `
                <li class="auth-btn-item">
                    <button class="btn btn-secondary auth-btn" onclick="authManager.showLoginModal()" style="
                        background: transparent;
                        border: 2px solid #25F4DF;
                        color: #25F4DF;
                        padding: 0.5rem 1rem;
                        border-radius: 0.5rem;
                        cursor: pointer;
                        font-family: inherit;
                        font-size: 14px;
                        font-weight: 500;
                        margin-right: 0.5rem;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='#25F4DF'; this.style.color='#1a4037';" onmouseout="this.style.background='transparent'; this.style.color='#25F4DF';">🔑 Login</button>
                </li>
                <li class="auth-btn-item">
                    <button class="btn btn-primary auth-btn" onclick="authManager.showRegisterModal()" style="
                        background: #25F4DF;
                        border: 2px solid #25F4DF;
                        color: #1a4037;
                        padding: 0.5rem 1rem;
                        border-radius: 0.5rem;
                        cursor: pointer;
                        font-family: inherit;
                        font-size: 14px;
                        font-weight: 500;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='transparent'; this.style.color='#25F4DF';" onmouseout="this.style.background='#25F4DF'; this.style.color='#1a4037';">🚀 Sign Up</button>
                </li>
            `;
            
            // Remove existing auth buttons and user menu
            navLinks.querySelectorAll('.user-menu, .auth-buttons, .auth-btn-item').forEach(el => el.remove());
            
            // Insert auth buttons directly into nav-links
            navLinks.insertAdjacentHTML('beforeend', authButtons);
            
            console.log('✅ Auth buttons added (Login/Sign Up)');
        }
    }

    showAuthenticatedFeatures() {
        // Show save progress indicators, premium features, etc.
        document.querySelectorAll('.auth-required').forEach(el => {
            el.style.display = 'block';
        });
    }

    hideAuthenticatedFeatures() {
        document.querySelectorAll('.auth-required').forEach(el => {
            el.style.display = 'none';
        });
    }

    toggleUserMenu() {
        console.log('🔧 toggleUserMenu called for user:', this.user?.username);
        
        // First check if user is authenticated
        if (!this.user || !this.token) {
            console.log('❌ User not authenticated, showing login modal instead');
            this.showLoginModal();
            return;
        }
        
        // NUCLEAR APPROACH - Use body-level dropdown with fixed positioning
        this.showNuclearUserDropdown();
    }
    
    showNuclearUserDropdown() {
        console.log('💪 Nuclear user dropdown triggered!');
        
        // Remove any existing dropdown
        const existing = document.getElementById('realUserDropdown');
        if (existing) {
            existing.remove();
            return; // Toggle behavior
        }
        
        // Find the user menu button for positioning
        const userButton = document.querySelector('.user-avatar-btn');
        if (!userButton) {
            console.log('❌ User button not found');
            return;
        }
        
        const rect = userButton.getBoundingClientRect();
        
        // Create dropdown with body-level positioning
        const dropdown = document.createElement('div');
        dropdown.id = 'realUserDropdown';
        dropdown.innerHTML = `
            <a href="#" onclick="authManager.showProfile(); event.stopPropagation(); return false;">📊 My Profile</a>
            <a href="#" onclick="authManager.showAssessmentHistory(); event.stopPropagation(); return false;">📋 Assessment History</a>
            <a href="#" onclick="authManager.logout(); event.stopPropagation(); return false;">🚪 Logout</a>
        `;
        
        // Append to body for maximum control
        document.body.appendChild(dropdown);
        
        // Apply nuclear-level styling
        const style = dropdown.style;
        style.position = 'fixed';
        style.top = (rect.bottom + 10) + 'px';
        style.right = '20px';
        style.zIndex = '2147483647'; // Maximum z-index
        style.width = '250px';
        style.background = '#1a4037';
        style.border = '2px solid #25F4DF';
        style.borderRadius = '8px';
        style.boxShadow = '0 20px 60px rgba(37, 244, 223, 0.4), 0 0 0 1000px rgba(0,0,0,0.1)';
        style.padding = '8px 0';
        style.fontFamily = 'Inter, sans-serif';
        style.fontSize = '14px';
        style.overflow = 'visible';
        style.pointerEvents = 'all';
        style.userSelect = 'none';
        style.visibility = 'visible';
        style.opacity = '1';
        
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
                // Close dropdown after click
                setTimeout(() => dropdown.remove(), 100);
            });
        });
        
        // Close dropdown when clicking outside
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!dropdown.contains(e.target) && !userButton.contains(e.target)) {
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
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            dropdown.remove();
        };
        dropdown.appendChild(closeBtn);
        
        console.log('✅ Nuclear user dropdown deployed!');
    }
        
        // Close dropdown when clicking outside
        setTimeout(() => {
            const closeOnClickOutside = (e) => {
                if (dropdown && !dropdown.contains(e.target) && !e.target.closest('.user-avatar-btn')) {
                    dropdown.classList.add('hidden');
                    document.removeEventListener('click', closeOnClickOutside);
                }
            };
            document.addEventListener('click', closeOnClickOutside);
        }, 100);
    }

    // FORCE DROPDOWN STYLING - Aggressive styling enforcement
    forceDropdownStyling(dropdown) {
        if (!dropdown) return;
        
        // Only apply styling if dropdown is not hidden
        if (dropdown.classList.contains('hidden')) {
            console.log('🔒 Dropdown is hidden, skipping styling');
            return;
        }
        
        // Apply ALL styling properties with setProperty for maximum force
        const style = dropdown.style;
        style.setProperty('display', 'block', 'important');
        style.setProperty('position', 'absolute', 'important');
        style.setProperty('top', 'calc(100% + 0.5rem)', 'important');
        style.setProperty('right', '0', 'important');
        style.setProperty('left', 'auto', 'important');
        style.setProperty('z-index', '99999', 'important'); // Even higher z-index
        style.setProperty('min-width', '250px', 'important');
        style.setProperty('width', '250px', 'important');
        style.setProperty('max-width', '300px', 'important');
        style.setProperty('height', 'auto', 'important');
        style.setProperty('min-height', 'auto', 'important');
        style.setProperty('background', '#2d5a52', 'important'); // Fallback color
        style.setProperty('border', '1px solid #4a7b6d', 'important'); // Fallback color
        style.setProperty('border-radius', '0.5rem', 'important');
        style.setProperty('box-shadow', '0 10px 30px rgba(0, 0, 0, 0.8)', 'important');
        style.setProperty('padding', '0.5rem 0', 'important');
        style.setProperty('margin', '0', 'important');
        style.setProperty('white-space', 'nowrap', 'important');
        style.setProperty('overflow', 'visible', 'important');
        style.setProperty('box-sizing', 'border-box', 'important');
        style.setProperty('visibility', 'visible', 'important');
        style.setProperty('opacity', '1', 'important');
        
        // Add a distinctive border to make it more visible
        style.setProperty('border-left', '3px solid #25F4DF', 'important');
        
        // Force styling on all links inside
        const links = dropdown.querySelectorAll('a');
        links.forEach((link, index) => {
            const linkStyle = link.style;
            linkStyle.setProperty('display', 'block', 'important');
            linkStyle.setProperty('width', '100%', 'important');
            linkStyle.setProperty('padding', '0.75rem 1rem', 'important');
            linkStyle.setProperty('min-height', '2.5rem', 'important');
            linkStyle.setProperty('line-height', '1.5', 'important');
            linkStyle.setProperty('color', 'var(--foreground)', 'important');
            linkStyle.setProperty('text-decoration', 'none', 'important');
            linkStyle.setProperty('white-space', 'nowrap', 'important');
            linkStyle.setProperty('box-sizing', 'border-box', 'important');
            linkStyle.setProperty('visibility', 'visible', 'important');
            linkStyle.setProperty('opacity', '1', 'important');
            if (index < links.length - 1) {
                linkStyle.setProperty('border-bottom', '1px solid var(--mm-line)', 'important');
            }
        });
        
        console.log('✅ FORCED dropdown styling applied to prevent thin bar');
    }

    showLoginModal() {
        this.createAuthModal('login');
    }

    showRegisterModal() {
        this.createAuthModal('register');
    }

    showProfile() {
        this.createProfileModal();
    }

    showAssessmentHistory() {
        this.createAssessmentHistoryModal();
    }

    createAuthModal(type) {
        const isLogin = type === 'login';
        
        const modal = document.createElement('div');
        modal.className = 'auth-modal';
        modal.innerHTML = `
            <div class="auth-modal-content">
                <div class="auth-modal-header">
                    <h2>${isLogin ? '🔐 Welcome Back!' : '🚀 Join MindMate'}</h2>
                    <button class="close-modal" onclick="this.closest('.auth-modal').remove()">&times;</button>
                </div>
                <form class="auth-form" onsubmit="authManager.handleAuth${isLogin ? 'Login' : 'Register'}(event)">
                    ${!isLogin ? '<input type="text" name="username" placeholder="Username" required>' : ''}
                    <input type="${isLogin ? 'text' : 'email'}" name="${isLogin ? 'username' : 'email'}" placeholder="${isLogin ? 'Username or Email' : 'Email'}" required>
                    <input type="password" name="password" placeholder="Password" required>
                    ${!isLogin ? '<input type="password" name="confirmPassword" placeholder="Confirm Password" required>' : ''}
                    <button type="submit" class="btn btn-primary">${isLogin ? 'Login' : 'Create Account'}</button>
                </form>
                <div class="auth-modal-footer">
                    <p>${isLogin ? "Don't have an account?" : "Already have an account?"} 
                       <a href="#" onclick="authManager.${isLogin ? 'showRegisterModal' : 'showLoginModal'}(); this.closest('.auth-modal').remove();">
                           ${isLogin ? 'Sign up' : 'Login'}
                       </a>
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Focus first input
        modal.querySelector('input').focus();
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    createProfileModal() {
        const modal = document.createElement('div');
        modal.className = 'auth-modal';
        modal.innerHTML = `
            <div class="auth-modal-content profile-modal">
                <div class="auth-modal-header">
                    <h2>👤 My Profile</h2>
                    <button class="close-modal" onclick="this.closest('.auth-modal').remove()">&times;</button>
                </div>
                <div class="profile-content">
                    <div class="profile-section">
                        <h3>📋 Personal Information</h3>
                        <div class="profile-info">
                            <div class="info-item">
                                <label>Username:</label>
                                <span>${this.user.username}</span>
                            </div>
                            <div class="info-item">
                                <label>Email:</label>
                                <span>${this.user.email}</span>
                            </div>
                            <div class="info-item">
                                <label>Member Since:</label>
                                <span>${new Date(this.user.createdAt || Date.now()).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="profile-section">
                        <h3>🎯 Career Preferences</h3>
                        <div class="career-preferences">
                            <div class="preference-item">
                                <label>Primary Interest:</label>
                                <span>${this.user.primaryInterest || 'Not set'}</span>
                                <button class="btn btn-small" onclick="authManager.editPreference('primaryInterest')">Edit</button>
                            </div>
                            <div class="preference-item">
                                <label>Experience Level:</label>
                                <span>${this.user.experienceLevel || 'Not set'}</span>
                                <button class="btn btn-small" onclick="authManager.editPreference('experienceLevel')">Edit</button>
                            </div>
                            <div class="preference-item">
                                <label>Preferred Location:</label>
                                <span>${this.user.preferredLocation || 'Not set'}</span>
                                <button class="btn btn-small" onclick="authManager.editPreference('preferredLocation')">Edit</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="profile-section">
                        <h3>📊 Quiz Statistics</h3>
                        <div class="quiz-stats">
                            <div class="stat-item">
                                <label>Quizzes Completed:</label>
                                <span>${this.user.quizCount || 0}</span>
                            </div>
                            <div class="stat-item">
                                <label>Last Quiz Date:</label>
                                <span>${this.user.lastQuizDate ? new Date(this.user.lastQuizDate).toLocaleDateString() : 'Never'}</span>
                            </div>
                            <div class="stat-item">
                                <label>Career Matches Found:</label>
                                <span>${this.user.careerMatches || 0}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="profile-section">
                        <h3>⚙️ Account Settings</h3>
                        <div class="profile-actions">
                            <button class="btn btn-secondary" onclick="authManager.editProfile()">✏️ Edit Profile</button>
                            <button class="btn btn-outline" onclick="authManager.changePassword()">🔒 Change Password</button>
                            <button class="btn btn-danger" onclick="authManager.deleteAccount()">🗑️ Delete Account</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    createAssessmentHistoryModal() {
        const modal = document.createElement('div');
        modal.className = 'auth-modal';
        modal.innerHTML = `
            <div class="auth-modal-content assessment-history-modal">
                <div class="auth-modal-header">
                    <h2>📋 Assessment History</h2>
                    <button class="close-modal" onclick="this.closest('.auth-modal').remove()">&times;</button>
                </div>
                <div class="assessment-history-content">
                    <div class="history-summary">
                        <h3>📊 Quiz Summary</h3>
                        <div class="summary-stats">
                            <div class="summary-stat">
                                <span class="stat-number">${this.user.quizCount || 0}</span>
                                <span class="stat-label">Total Quizzes</span>
                            </div>
                            <div class="summary-stat">
                                <span class="stat-number">${this.user.averageScore || 'N/A'}</span>
                                <span class="stat-label">Average Score</span>
                            </div>
                            <div class="summary-stat">
                                <span class="stat-number">${this.user.careerMatches || 0}</span>
                                <span class="stat-label">Career Matches</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="recent-assessments">
                        <h3>🕒 Recent Assessments</h3>
                        <div class="assessment-list" id="assessmentList">
                            <div class="loading">Loading assessment history...</div>
                        </div>
                    </div>
                    
                    <div class="assessment-actions">
                        <button class="btn btn-primary" onclick="showSection('quiz-section')">🎯 Take New Assessment</button>
                        <button class="btn btn-secondary" onclick="showSection('progress-section')">📊 View Progress</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Load assessment history
        this.loadAssessmentHistory();
    }

    async loadAssessmentHistory() {
        try {
            const response = await fetch('/api/assessment/history', {
                headers: this.getAuthHeader()
            });
            
            if (response.ok) {
                const assessments = await response.json();
                this.displayAssessmentHistory(assessments);
            } else {
                this.displayAssessmentHistory([]);
            }
        } catch (error) {
            console.error('Failed to load assessment history:', error);
            this.displayAssessmentHistory([]);
        }
    }

    displayAssessmentHistory(assessments) {
        const assessmentList = document.getElementById('assessmentList');
        if (!assessmentList) return;
        
        if (assessments.length === 0) {
            assessmentList.innerHTML = `
                <div class="no-assessments">
                    <p>No assessments completed yet.</p>
                    <p>Take your first career assessment to get started!</p>
                </div>
            `;
            return;
        }
        
        assessmentList.innerHTML = assessments.map(assessment => `
            <div class="assessment-item">
                <div class="assessment-header">
                    <span class="assessment-date">${new Date(assessment.completedAt).toLocaleDateString()}</span>
                    <span class="assessment-score">${assessment.score || 'N/A'}%</span>
                </div>
                <div class="assessment-details">
                    <h4>${assessment.careerMatches?.length || 0} Career Matches Found</h4>
                    <div class="career-tags">
                        ${(assessment.careerMatches || []).slice(0, 3).map(career => 
                            `<span class="career-tag">${career}</span>`
                        ).join('')}
                        ${(assessment.careerMatches || []).length > 3 ? 
                            `<span class="career-tag more">+${(assessment.careerMatches || []).length - 3} more</span>` : ''
                        }
                    </div>
                </div>
                <button class="btn btn-small" onclick="authManager.viewAssessmentDetails('${assessment.id}')">View Details</button>
            </div>
        `).join('');
    }

    // Profile action methods
    editProfile() {
        showNotification('Profile editing coming soon!', 'info');
    }

    editPreference(preferenceType) {
        showNotification(`${preferenceType} editing coming soon!`, 'info');
    }

    changePassword() {
        showNotification('Password change coming soon!', 'info');
    }

    deleteAccount() {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            showNotification('Account deletion coming soon!', 'info');
        }
    }

    viewAssessmentDetails(assessmentId) {
        showNotification('Assessment details view coming soon!', 'info');
    }

    async handleAuthLogin(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const username = formData.get('username');
        const password = formData.get('password');
        
        const result = await this.login(username, password);
        
        if (result.success) {
            document.querySelector('.auth-modal').remove();
        } else {
            showNotification(`Login failed: ${result.error}`, 'error');
        }
    }

    async handleAuthRegister(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const username = formData.get('username');
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        
        if (password !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }
        
        if (password.length < 6) {
            showNotification('Password must be at least 6 characters', 'error');
            return;
        }
        
        const result = await this.register(username, email, password);
        
        if (result.success) {
            document.querySelector('.auth-modal').remove();
        } else {
            showNotification(`Registration failed: ${result.error}`, 'error');
        }
    }

    initializePersonalizedChat() {
        if (this.isAuthenticated() && typeof userProfile !== 'undefined' && userProfile.assessmentCompleted) {
            // Clear existing messages and add personalized welcome
            const chatMessages = document.getElementById('chat-messages');
            if (chatMessages && chatMessages.children.length <= 1) {
                chatMessages.innerHTML = '';
                if (typeof initializeAIChat === 'function') {
                    initializeAIChat();
                }
            }
        }
    }

    // Test authentication system
    async testAuthSystem() {
        console.log('🧪 DEBUG: Testing authentication system...');
        console.log('🔍 Current Auth State:', {
            isInitialized: this.isInitialized,
            isAuthenticated: this.isAuthenticated(),
            hasToken: !!this.token,
            hasUser: !!this.user,
            tokenLength: this.token ? this.token.length : 0,
            username: this.user?.username || 'none',
            tokenStart: this.token ? this.token.substring(0, 20) + '...' : 'none'
        });
        
        // Test localStorage
        const storedToken = localStorage.getItem('mindmate_token');
        const storedUser = localStorage.getItem('mindmate_user');
        console.log('💾 LocalStorage State:', {
            hasStoredToken: !!storedToken,
            hasStoredUser: !!storedUser,
            storedTokenMatches: storedToken === this.token,
            storedUserData: storedUser ? JSON.parse(storedUser)?.username : 'none'
        });
        
        // Test token validation
        if (this.token) {
            const isValid = this.validateTokenFormat();
            console.log('🔑 Token Validation:', {
                isValidFormat: isValid,
                parts: this.token.split('.').length
            });
        }
        
        // Test 1: Check if server is running
        try {
            const response = await fetch('/api/auth/test', { method: 'GET' });
            console.log('✅ DEBUG: Server is running, status:', response.status);
        } catch (error) {
            console.error('❌ DEBUG: Server connection failed:', error);
        }
        
        // Test 2: Check database connection
        try {
            const response = await fetch('/api/db/test', { method: 'GET' });
            const data = await response.json();
            console.log('✅ DEBUG: Database connection:', data);
        } catch (error) {
            console.error('❌ DEBUG: Database connection failed:', error);
        }
        
        // Test 3: Try profile fetch if we have a token
        if (this.token) {
            try {
                const profile = await this.fetchUserProfile();
                console.log('✅ DEBUG: Profile fetch result:', {
                    success: !!profile,
                    username: profile?.username || 'failed'
                });
            } catch (error) {
                console.error('❌ DEBUG: Profile fetch failed:', error);
            }
        }
    }
}

// Initialize auth manager when DOM is ready
let authManager;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        authManager = new AuthManager();
    });
} else {
    // DOM is already ready
    authManager = new AuthManager();
}

// Helper function to wait for auth initialization
function waitForAuthInit() {
    return new Promise((resolve) => {
        if (authManager && authManager.isInitialized) {
            resolve(authManager);
        } else {
            const checkInit = setInterval(() => {
                if (authManager && authManager.isInitialized) {
                    clearInterval(checkInit);
                    resolve(authManager);
                }
            }, 50);
        }
    });
}

// DEBUG FUNCTION - Call debugAuth() in browser console to check auth state
function debugAuth() {
    if (!authManager) {
        console.log('❌ AuthManager not initialized yet');
        return;
    }
    
    console.log('🔍=== AUTH DEBUG INFO ===');
    console.log('Initialized:', authManager.isInitialized);
    console.log('Authenticated:', authManager.isAuthenticated());
    console.log('User:', authManager.user?.username || 'none');
    console.log('Token exists:', !!authManager.token);
    console.log('Token length:', authManager.token?.length || 0);
    console.log('LocalStorage token:', !!localStorage.getItem('mindmate_token'));
    console.log('LocalStorage user:', !!localStorage.getItem('mindmate_user'));
    
    // Test token format
    if (authManager.token) {
        const parts = authManager.token.split('.');
        console.log('Token parts count:', parts.length);
        if (parts.length === 3) {
            try {
                const payload = JSON.parse(atob(parts[1]));
                console.log('Token payload:', {
                    userId: payload.userId,
                    exp: payload.exp,
                    expiresAt: new Date(payload.exp * 1000),
                    isExpired: payload.exp < Math.floor(Date.now() / 1000)
                });
            } catch (e) {
                console.log('❌ Failed to decode token payload:', e.message);
            }
        }
    }
    
    // Test server auth verification
    testServerAuth();
}

// Test server authentication
async function testServerAuth() {
    console.log('🧪 Testing server authentication...');
    
    const token = localStorage.getItem('mindmate_token');
    if (!token) {
        console.log('❌ No token in localStorage');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('🔍 Server auth test response status:', response.status);
        const data = await response.json();
        console.log('🔍 Server auth test response:', data);
        
        if (response.status === 401) {
            console.log('❌ SERVER SAYS TOKEN IS INVALID!');
            console.log('❌ This is why you keep getting logged out');
        } else if (data.authenticated) {
            console.log('✅ Server says token is valid for user:', data.user?.username);
        }
    } catch (error) {
        console.error('❌ Server auth test failed:', error);
    }
}

// TEST FUNCTIONS - Call these in browser console
function testAuthButtons() {
    console.log('🧪 Testing auth buttons...');
    if (!authManager) {
        console.log('❌ AuthManager not initialized');
        return;
    }
    
    console.log('Force updating navigation...');
    authManager.updateNavigation();
    
    const authButtons = document.querySelector('.auth-buttons');
    const userMenu = document.querySelector('.user-menu');
    
    console.log('Auth buttons found:', !!authButtons);
    console.log('User menu found:', !!userMenu);
    console.log('Authenticated:', authManager.isAuthenticated());
    
    if (!authButtons && !userMenu) {
        console.log('❌ NO AUTH UI FOUND! Forcing navigation update...');
        setTimeout(() => authManager.updateNavigation(), 500);
    }
}