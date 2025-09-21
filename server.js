import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from './database.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'mindmate-secret-key';

// Initialize database
const db = new Database();

// Parse JSON request bodies
app.use(express.json());

// Security headers (CSP report-only to avoid breaking while migrating)
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), interest-cohort=()');
    const csp = [
        "default-src 'self'",
        "script-src 'self' https://cdnjs.cloudflare.com https://fonts.googleapis.com https://fonts.gstatic.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
        "img-src 'self' data:",
        "font-src 'self' https://fonts.gstatic.com data:",
        "connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com",
        "manifest-src 'self'",
        "worker-src 'self'",
        "base-uri 'self'",
        "form-action 'self'"
    ].join('; ');
    res.setHeader('Content-Security-Policy-Report-Only', csp);
    next();
});

// Enhanced CORS for better compatibility
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Auth middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.log('No token provided in request to', req.path);
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await db.getUserById(decoded.userId);
        if (user) {
            req.user = user;
            console.log('Successfully authenticated user:', user.username, 'for', req.path);
        } else {
            console.log('User not found for valid token on', req.path);
            req.user = null;
        }
        next();
    } catch (err) {
        console.log('Token verification failed for', req.path, ':', err.message);
        req.user = null;
        next();
    }
};

// Optimize static file serving for Render
app.use(express.static(__dirname, {
    maxAge: '1h',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Cache-Control', 'public, max-age=3600');
        } else if (path.endsWith('.js')) {
            res.setHeader('Cache-Control', 'public, max-age=3600');
        } else if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=300');
        }
    }
}));

// Serve the custom signup page static assets at /signup/
app.use('/signup', express.static(path.join(__dirname, 'Sign Up Page')));

// Ensure /signup (no trailing slash) redirects to /signup/
app.get('/signup', (req, res) => {
    res.redirect(301, '/signup/');
});

// Health check endpoint with enhanced status
app.get('/api/health', (req, res) => {
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const uptime = process.uptime();
    const isFreshStart = uptime < 120; // Less than 2 minutes
    
    res.json({
        ok: true,
        status: isFreshStart ? 'waking_up' : 'fully_awake',
        hasOpenAI,
        hasGemini,
        uptime: uptime,
        isFreshStart: isFreshStart,
        message: isFreshStart ? 'Server just woke up from sleep mode' : 'Server is fully operational',
        timestamp: new Date().toISOString(),
        database: 'connected'
    });
});

// Analytics events intake (aggregated, anonymous by default)
app.post('/api/analytics/events', async (req, res) => {
    try {
        const { events = [], sessionId } = req.body || {};
        if (!Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ error: 'No events provided' });
        }
        // For now, we just log. In production, persist to DB or analytics sink.
        console.log('Analytics intake', {
            count: events.length,
            sessionId: sessionId || 'unknown',
            sample: events.slice(0, 3)
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Analytics intake error:', error);
        res.status(500).json({ error: 'Failed to record analytics' });
    }
});

// Test endpoints for debugging
app.get('/api/auth/test', (req, res) => {
    res.json({ message: 'Auth endpoint is working', timestamp: new Date().toISOString() });
});

// Debug endpoint to check token validity
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({
        authenticated: !!req.user,
        user: req.user ? { id: req.user.id, username: req.user.username } : null,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/db/test', async (req, res) => {
    try {
        // Test database connection by running a simple query
        const result = await db.testConnection();
        res.json({ message: 'Database connection successful', result });
    } catch (error) {
        console.error('Database test error:', error);
        res.status(500).json({ error: 'Database connection failed', details: error.message });
    }
});

// Authentication endpoints
app.post('/api/auth/register', async (req, res) => {
    try {
        console.log('🔍 DEBUG: Registration request received:', req.body);
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            console.log('❌ DEBUG: Missing required fields');
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (password.length < 6) {
            console.log('❌ DEBUG: Password too short');
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        console.log('🔍 DEBUG: Creating user in database...');
        const user = await db.createUser(username, email, password);
        console.log('✅ DEBUG: User created successfully:', user);
        
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        console.log('✅ DEBUG: JWT token generated');
        
        res.json({ 
            success: true, 
            user: { id: user.id, username: user.username, email: user.email },
            token 
        });
        console.log('✅ DEBUG: Registration response sent');
    } catch (error) {
        console.error('❌ DEBUG: Registration error:', error);
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(400).json({ error: 'Username or email already exists' });
        } else {
            res.status(500).json({ error: 'Registration failed' });
        }
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('🔍 DEBUG: Login request received:', { username: req.body.username });
        const { username, password } = req.body;
        
        if (!username || !password) {
            console.log('❌ DEBUG: Missing username or password');
            return res.status(400).json({ error: 'Username and password required' });
        }
        
        console.log('🔍 DEBUG: Authenticating user...');
        const result = await db.authenticateUser(username, password);
        
        if (result) {
            console.log('✅ DEBUG: Authentication successful for user:', result.user.username);
            res.json({ success: true, user: result.user, token: result.token });
        } else {
            console.log('❌ DEBUG: Authentication failed - invalid credentials');
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('❌ DEBUG: Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// User profile endpoints
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const assessments = await db.getAssessmentHistory(req.user.id);
        const profile = {
            ...req.user,
            assessmentHistory: assessments,
            hasCompletedAssessment: assessments.length > 0
        };
        
        res.json(profile);
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const { profileData } = req.body;
        const success = await db.updateUserProfile(req.user.id, profileData);
        
        if (success) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Failed to update profile' });
        }
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Assessment endpoints
app.post('/api/assessment/save', authenticateToken, async (req, res) => {
    try {
        const { quizAnswers, careerScores, topCareers } = req.body;
        
        if (!quizAnswers || !careerScores || !topCareers) {
            return res.status(400).json({ error: 'Missing assessment data' });
        }
        
        let assessmentId;
        if (req.user) {
            // Save to database for authenticated users
            assessmentId = await db.saveAssessmentResult(req.user.id, quizAnswers, careerScores, topCareers);
        }
        
        res.json({ 
            success: true, 
            assessmentId,
            message: req.user ? 'Assessment saved to your profile' : 'Assessment completed (sign up to save results)'
        });
    } catch (error) {
        console.error('Assessment save error:', error);
        res.status(500).json({ error: 'Failed to save assessment' });
    }
});

app.get('/api/assessment/history', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const assessments = await db.getAssessmentHistory(req.user.id);
        res.json(assessments);
    } catch (error) {
        console.error('Assessment history error:', error);
        res.status(500).json({ error: 'Failed to fetch assessment history' });
    }
});

// Career profiles endpoints
app.get('/api/careers', async (req, res) => {
    try {
        const careers = await db.getAllCareerProfiles();
        res.json(careers);
    } catch (error) {
        console.error('Career profiles error:', error);
        res.status(500).json({ error: 'Failed to fetch career profiles' });
    }
});

app.get('/api/careers/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const careers = await db.getCareerProfilesByCategory(category);
        res.json(careers);
    } catch (error) {
        console.error('Career category error:', error);
        res.status(500).json({ error: 'Failed to fetch career profiles' });
    }
});

// AI Chat endpoint
app.post('/api/chat', authenticateToken, async (req, res) => {
    try {
        const { provider, model, messages, max_tokens, temperature } = req.body;
        
        if (!provider || !messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Invalid request parameters' });
        }

        // Get user's latest assessment for context
        let userContext = '';
        if (req.user) {
            try {
                const assessments = await db.getAssessmentHistory(req.user.id);
                if (assessments.length > 0) {
                    const latest = assessments[0];
                    userContext = `User's latest assessment shows top career matches: ${latest.top_careers.slice(0, 3).join(', ')}. `;
                }
            } catch (dbError) {
                console.log('Could not fetch user context:', dbError.message);
            }
        }

        let response;
        
        if (provider === 'openai') {
            if (!process.env.OPENAI_API_KEY) {
                return res.status(500).json({ error: 'OpenAI API key not configured' });
            }
            
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
            
            // Add user context to system message
            const enhancedMessages = [...messages];
            if (userContext && enhancedMessages[0]?.role === 'system') {
                enhancedMessages[0].content = userContext + enhancedMessages[0].content;
            }
            
            response = await openai.chat.completions.create({
                model: model || 'gpt-3.5-turbo',
                messages: enhancedMessages,
                max_tokens: max_tokens || 1000,
                temperature: temperature || 0.7,
            });
            
            const aiResponse = response.choices[0].message.content;
            
            // Save chat history if user is authenticated
            if (req.user) {
                try {
                    await db.saveChatMessage(req.user.id, messages[messages.length - 1].content, 'user');
                    await db.saveChatMessage(req.user.id, aiResponse, 'ai');
                } catch (dbError) {
                    console.log('Could not save chat history:', dbError.message);
                }
            }
            
            res.json({ response: aiResponse });
            
        } else if (provider === 'gemini') {
            console.log('Gemini API called');
            console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
            
            if (!process.env.GEMINI_API_KEY) {
                console.log('Gemini API key missing');
                return res.status(500).json({ error: 'Gemini API key not configured' });
            }
            
            try {
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const geminiModel = genAI.getGenerativeModel({ model: model || 'gemini-1.5-flash' });
                
                // Enhance user message with context
                const userMessage = messages[messages.length - 1].content;
                const enhancedPrompt = userContext + userMessage;
                
                console.log('Calling Gemini API...');
                const result = await geminiModel.generateContent(enhancedPrompt);
                const geminiResponse = await result.response;
                const aiResponse = geminiResponse.text();
                
                // Save chat history if user is authenticated
                if (req.user) {
                    try {
                        await db.saveChatMessage(req.user.id, userMessage, 'user');
                        await db.saveChatMessage(req.user.id, aiResponse, 'ai');
                    } catch (dbError) {
                        console.log('Could not save chat history:', dbError.message);
                    }
                }
                
                console.log('Gemini API response received');
                res.json({ response: aiResponse });
            } catch (geminiError) {
                console.error('Gemini API call failed:', geminiError);
                throw geminiError;
            }
            
        } else {
            res.status(400).json({ error: 'Invalid provider. Use "openai" or "gemini"' });
        }
        
    } catch (error) {
        console.error('AI API Error:', error);
        
        // Better error handling for Render
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
            res.status(503).json({ 
                error: 'Service temporarily unavailable. Please try again in a moment.',
                details: 'The AI service is starting up. This is normal on Render free tier.'
            });
        } else {
            res.status(500).json({ 
                error: 'AI service error',
                details: error.message || 'Unknown error occurred'
            });
        }
    }
});

// Chat history endpoint
app.get('/api/chat/history', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const limit = parseInt(req.query.limit) || 50;
        const messages = await db.getChatHistory(req.user.id, limit);
        res.json(messages);
    } catch (error) {
        console.error('Chat history error:', error);
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
});

// Learning Resources endpoints
app.get('/api/learning/resources', async (req, res) => {
    try {
        // Get base learning resources from database
        const baseResources = await db.getAllLearningResources();
        
        // Get additional courses from external APIs
        const courseraResources = await getCourseraResources();
        const youtubeResources = await getYouTubeResources();
        
        // Combine all resources
        const allResources = [...baseResources, ...courseraResources, ...youtubeResources];
        
        res.json(allResources);
    } catch (error) {
        console.error('Learning resources error:', error);
        // Return base resources if external APIs fail
        try {
            const baseResources = await db.getAllLearningResources();
            res.json(baseResources);
        } catch (dbError) {
            res.status(500).json({ error: 'Failed to fetch learning resources' });
        }
    }
});

app.get('/api/learning/resources/career/:careerTitle', async (req, res) => {
    try {
        const { careerTitle } = req.params;
        const resources = await db.getLearningResourcesByCareer(careerTitle);
        res.json(resources);
    } catch (error) {
        console.error('Career learning resources error:', error);
        res.status(500).json({ error: 'Failed to fetch career learning resources' });
    }
});

app.get('/api/learning/paths/:careerTitle', async (req, res) => {
    try {
        const { careerTitle } = req.params;
        const paths = await db.getLearningPathsByCareer(careerTitle);
        res.json(paths);
    } catch (error) {
        console.error('Learning paths error:', error);
        res.status(500).json({ error: 'Failed to fetch learning paths' });
    }
});

// User learning progress endpoints
app.post('/api/learning/progress', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const { resourceId, status, progressPercentage, notes } = req.body;
        
        if (!resourceId || !status) {
            return res.status(400).json({ error: 'Resource ID and status are required' });
        }
        
        const progressId = await db.saveUserLearningProgress(
            req.user.id, 
            resourceId, 
            status, 
            progressPercentage || 0, 
            notes || ''
        );
        
        res.json({ 
            success: true, 
            progressId,
            message: 'Learning progress updated successfully'
        });
    } catch (error) {
        console.error('Learning progress save error:', error);
        res.status(500).json({ error: 'Failed to save learning progress' });
    }
});

app.get('/api/learning/progress', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const progress = await db.getUserLearningProgress(req.user.id);
        res.json(progress);
    } catch (error) {
        console.error('Learning progress fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch learning progress' });
    }
});

// Community Features endpoints

// Forum endpoints
app.get('/api/community/forum/categories', async (req, res) => {
    try {
        const categories = await db.getForumCategories();
        res.json(categories);
    } catch (error) {
        console.error('Forum categories error:', error);
        res.status(500).json({ error: 'Failed to fetch forum categories' });
    }
});

app.get('/api/community/forum/posts', async (req, res) => {
    try {
        const { categoryId, limit = 20, offset = 0 } = req.query;
        const posts = await db.getForumPosts(categoryId, parseInt(limit), parseInt(offset));
        res.json(posts);
    } catch (error) {
        console.error('Forum posts error:', error);
        res.status(500).json({ error: 'Failed to fetch forum posts' });
    }
});

app.post('/api/community/forum/posts', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const { categoryId, title, content, tags = [] } = req.body;
        
        if (!categoryId || !title || !content) {
            return res.status(400).json({ error: 'Category, title, and content are required' });
        }
        
        const postId = await db.createForumPost(req.user.id, categoryId, title, content, tags);
        
        // Log activity
        await db.logUserActivity(req.user.id, 'forum_post_created', 'forum_post', postId, `Created post: ${title}`);
        
        res.json({ 
            success: true, 
            postId,
            message: 'Forum post created successfully'
        });
    } catch (error) {
        console.error('Forum post creation error:', error);
        res.status(500).json({ error: 'Failed to create forum post' });
    }
});

app.get('/api/community/forum/posts/:postId/replies', async (req, res) => {
    try {
        const { postId } = req.params;
        const replies = await db.getForumReplies(postId);
        res.json(replies);
    } catch (error) {
        console.error('Forum replies error:', error);
        res.status(500).json({ error: 'Failed to fetch forum replies' });
    }
});

app.post('/api/community/forum/posts/:postId/replies', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const { postId } = req.params;
        const { content } = req.body;
        
        if (!content) {
            return res.status(400).json({ error: 'Reply content is required' });
        }
        
        const replyId = await db.createForumReply(req.user.id, postId, content);
        
        // Log activity
        await db.logUserActivity(req.user.id, 'forum_reply_created', 'forum_reply', replyId, 'Created forum reply');
        
        res.json({ 
            success: true, 
            replyId,
            message: 'Reply posted successfully'
        });
    } catch (error) {
        console.error('Forum reply creation error:', error);
        res.status(500).json({ error: 'Failed to create forum reply' });
    }
});

// Networking endpoints
app.post('/api/community/networking/connect', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const { addresseeId, message, connectionType = 'peer' } = req.body;
        
        if (!addresseeId) {
            return res.status(400).json({ error: 'Addressee ID is required' });
        }
        
        if (addresseeId === req.user.id) {
            return res.status(400).json({ error: 'Cannot connect to yourself' });
        }
        
        const connectionId = await db.sendConnectionRequest(req.user.id, addresseeId, message, connectionType);
        
        // Log activity
        await db.logUserActivity(req.user.id, 'connection_request_sent', 'user', addresseeId, 'Sent connection request');
        
        res.json({ 
            success: true, 
            connectionId,
            message: 'Connection request sent successfully'
        });
    } catch (error) {
        console.error('Connection request error:', error);
        res.status(500).json({ error: 'Failed to send connection request' });
    }
});

app.post('/api/community/networking/accept/:connectionId', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const { connectionId } = req.params;
        const success = await db.acceptConnectionRequest(connectionId);
        
        if (success) {
            // Log activity
            await db.logUserActivity(req.user.id, 'connection_accepted', 'connection', connectionId, 'Accepted connection request');
            
            res.json({ 
                success: true,
                message: 'Connection request accepted'
            });
        } else {
            res.status(404).json({ error: 'Connection request not found' });
        }
    } catch (error) {
        console.error('Connection acceptance error:', error);
        res.status(500).json({ error: 'Failed to accept connection request' });
    }
});

app.get('/api/community/networking/connections', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const connections = await db.getUserConnections(req.user.id);
        res.json(connections);
    } catch (error) {
        console.error('Connections fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch connections' });
    }
});

// Mentorship endpoints
app.post('/api/community/mentorship/profile', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const { profileType, ...profileData } = req.body;
        
        if (!profileType || !['mentor', 'mentee'].includes(profileType)) {
            return res.status(400).json({ error: 'Valid profile type (mentor/mentee) is required' });
        }
        
        const profileId = await db.createMentorshipProfile(req.user.id, profileType, profileData);
        
        // Log activity
        await db.logUserActivity(req.user.id, 'mentorship_profile_created', 'mentorship_profile', profileId, `Created ${profileType} profile`);
        
        res.json({ 
            success: true, 
            profileId,
            message: `${profileType.charAt(0).toUpperCase() + profileType.slice(1)} profile created successfully`
        });
    } catch (error) {
        console.error('Mentorship profile creation error:', error);
        res.status(500).json({ error: 'Failed to create mentorship profile' });
    }
});

app.get('/api/community/mentorship/mentors', async (req, res) => {
    try {
        const { careerField, skills } = req.query;
        const skillsArray = skills ? skills.split(',') : [];
        const mentors = await db.findMentors(careerField, skillsArray);
        res.json(mentors);
    } catch (error) {
        console.error('Mentors fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch mentors' });
    }
});

app.post('/api/community/mentorship/request', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const { mentorId, message } = req.body;
        
        if (!mentorId) {
            return res.status(400).json({ error: 'Mentor ID is required' });
        }
        
        if (mentorId === req.user.id) {
            return res.status(400).json({ error: 'Cannot request mentorship from yourself' });
        }
        
        const matchId = await db.requestMentorship(req.user.id, mentorId, message);
        
        // Log activity
        await db.logUserActivity(req.user.id, 'mentorship_request_sent', 'user', mentorId, 'Sent mentorship request');
        
        res.json({ 
            success: true, 
            matchId,
            message: 'Mentorship request sent successfully'
        });
    } catch (error) {
        console.error('Mentorship request error:', error);
        res.status(500).json({ error: 'Failed to send mentorship request' });
    }
});

// Smart Mentor Matching API
app.get('/api/community/mentorship/smart-matches', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const preferences = {
            targetSkills: req.query.targetSkills ? req.query.targetSkills.split(',') : [],
            availability: req.query.availability || 'flexible',
            experienceLevel: req.query.experienceLevel || '',
            careerField: req.query.careerField || ''
        };

        const matchResult = await db.getSmartMentorMatches(req.user.id, preferences);
        
        if (matchResult.error) {
            return res.status(400).json(matchResult);
        }
        
        res.json(matchResult);
    } catch (error) {
        console.error('Smart mentor matching error:', error);
        res.status(500).json({ error: 'Failed to find mentor matches' });
    }
});

app.post('/api/community/mentorship/smart-request', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { mentorId, message, matchData } = req.body;
        
        if (!mentorId || !message) {
            return res.status(400).json({ error: 'Mentor ID and message are required' });
        }

        const result = await db.createSmartMentorshipRequest(
            req.user.id, 
            mentorId, 
            message, 
            matchData
        );
        
        if (result.error) {
            return res.status(400).json(result);
        }
        
        // Log activity
        await db.logUserActivity(
            req.user.id, 
            'smart_mentorship_request', 
            'mentorship_match', 
            result.matchId, 
            `Smart mentorship request (${Math.round(result.matchScore * 100)}% match)`
        );
        
        res.json({ 
            success: true, 
            ...result
        });
    } catch (error) {
        console.error('Smart mentorship request error:', error);
        res.status(500).json({ error: 'Failed to send mentorship request' });
    }
});

app.get('/api/community/mentorship/recommendations', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const recommendations = await db.getMentorshipRecommendations(req.user.id);
        
        if (recommendations.error) {
            return res.status(400).json(recommendations);
        }
        
        res.json(recommendations);
    } catch (error) {
        console.error('Mentorship recommendations error:', error);
        res.status(500).json({ error: 'Failed to generate recommendations' });
    }
});

app.get('/api/community/mentorship/matching-criteria', async (req, res) => {
    try {
        const criteria = {
            success: true,
            criteria: {
                careerAlignment: {
                    weight: '30%',
                    description: 'How well the mentor\'s expertise aligns with your career goals'
                },
                skillMatch: {
                    weight: '25%',
                    description: 'Overlap between skills you want to learn and what the mentor offers'
                },
                experienceGap: {
                    weight: '20%',
                    description: 'Appropriate experience level difference for effective mentoring'
                },
                availabilityMatch: {
                    weight: '10%',
                    description: 'Compatibility of schedules and availability preferences'
                },
                personalityFit: {
                    weight: '10%',
                    description: 'Compatibility of communication and working styles'
                },
                goalAlignment: {
                    weight: '5%',
                    description: 'Alignment of long-term career objectives'
                }
            },
            algorithm: {
                name: 'MindMate Smart Matching',
                version: '1.0',
                description: 'Advanced algorithm that considers multiple factors for optimal mentor-mentee pairing'
            }
        };
        
        res.json(criteria);
    } catch (error) {
        console.error('Matching criteria error:', error);
        res.status(500).json({ error: 'Failed to fetch matching criteria' });
    }
});

// User activity endpoint
app.get('/api/community/activity', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const { limit = 20 } = req.query;
        const activities = await db.getUserActivity(req.user.id, parseInt(limit));
        res.json(activities);
    } catch (error) {
        console.error('User activity fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch user activity' });
    }
});

// Advanced Analytics Functions
const generateCareerPredictions = (userAssessments, careerData) => {
    const predictions = [];
    
    // Analyze user's assessment history and career trajectory
    if (userAssessments.length > 0) {
        const latestAssessment = userAssessments[userAssessments.length - 1];
        const topCareers = JSON.parse(latestAssessment.top_careers || '[]');
        
        topCareers.forEach((career, index) => {
            const careerProfile = careerData.find(c => c.name.toLowerCase().includes(career.career?.toLowerCase() || ''));
            if (careerProfile) {
                const successScore = calculateSuccessScore(latestAssessment, careerProfile);
                const timeline = generateCareerTimeline(careerProfile);
                
                predictions.push({
                    career: career.career || careerProfile.name,
                    successProbability: Math.min(95, successScore + (95 - index * 10)),
                    projectedSalary: {
                        year1: careerProfile.salary_range?.min || 50000,
                        year3: Math.round((careerProfile.salary_range?.median || 75000) * 0.9),
                        year5: careerProfile.salary_range?.median || 75000,
                        year10: Math.round((careerProfile.salary_range?.max || 100000) * 0.95)
                    },
                    timeline,
                    riskFactors: generateRiskFactors(careerProfile),
                    advantages: generateAdvantages(latestAssessment, careerProfile)
                });
            }
        });
    }
    
    return predictions;
};

const calculateSuccessScore = (assessment, career) => {
    const answers = JSON.parse(assessment.quiz_answers || '{}');
    let score = 65; // Base score
    
    // Analyze skill confidence
    if (answers.skills) {
        const skillConfidence = Object.values(answers.skills).reduce((sum, val) => sum + val, 0) / Object.keys(answers.skills).length;
        score += (skillConfidence - 3) * 5; // Adjust based on confidence above/below neutral
    }
    
    // Analyze interests alignment
    if (answers.interests && Array.isArray(answers.interests)) {
        const careerCategory = career.category?.toLowerCase() || '';
        const hasRelevantInterest = answers.interests.some(interest => 
            careerCategory.includes(interest) || interest.includes(careerCategory.split(' ')[0])
        );
        if (hasRelevantInterest) score += 10;
    }
    
    // Analyze motivation alignment
    if (answers.motivation) {
        score += 5;
    }
    
    return Math.min(95, Math.max(60, score));
};

const generateCareerTimeline = (career) => {
    const baseSalary = career.salary_range?.min || 50000;
    const maxSalary = career.salary_range?.max || 100000;
    
    return {
        entryLevel: {
            timeframe: '0-2 years',
            title: `Junior ${career.name}`,
            salary: baseSalary,
            skills: ['Foundation skills', 'Industry basics', 'Tool familiarity']
        },
        midLevel: {
            timeframe: '3-5 years',
            title: `${career.name}`,
            salary: Math.round((baseSalary + maxSalary) * 0.6),
            skills: ['Advanced technical skills', 'Project management', 'Team collaboration']
        },
        seniorLevel: {
            timeframe: '6-10 years',
            title: `Senior ${career.name}`,
            salary: Math.round(maxSalary * 0.85),
            skills: ['Leadership', 'Strategic thinking', 'Mentoring']
        },
        expertLevel: {
            timeframe: '10+ years',
            title: `Lead ${career.name} / Manager`,
            salary: maxSalary,
            skills: ['Industry expertise', 'Business strategy', 'Team building']
        }
    };
};

const generateRiskFactors = (career) => {
    const riskFactors = [];
    
    // Analyze growth outlook
    const growth = career.growth_outlook?.toLowerCase() || '';
    if (growth.includes('declining') || growth.includes('slow')) {
        riskFactors.push('Industry growth is below average');
    }
    
    // Technology disruption risk
    if (career.category === 'Technology') {
        riskFactors.push('Rapid technology changes require continuous learning');
    }
    
    // Competition level
    if (career.name.includes('Manager') || career.name.includes('Director')) {
        riskFactors.push('High competition for leadership positions');
    }
    
    // Default risks if none identified
    if (riskFactors.length === 0) {
        riskFactors.push('Economic fluctuations may affect demand');
        riskFactors.push('Skill requirements may evolve over time');
    }
    
    return riskFactors;
};

const generateAdvantages = (assessment, career) => {
    const advantages = [];
    const answers = JSON.parse(assessment.quiz_answers || '{}');
    
    // Skill-based advantages
    if (answers.skills) {
        const highSkills = Object.entries(answers.skills)
            .filter(([skill, confidence]) => confidence >= 4)
            .map(([skill]) => skill);
        
        if (highSkills.length > 0) {
            advantages.push(`Strong foundation in ${highSkills.join(', ')}`);
        }
    }
    
    // Interest alignment
    advantages.push('Strong interest-career alignment');
    
    // Growth potential
    const growth = career.growth_outlook?.toLowerCase() || '';
    if (growth.includes('excellent') || growth.includes('high') || growth.includes('very good')) {
        advantages.push('Excellent job market growth prospects');
    }
    
    return advantages;
};

const getMarketTrends = () => {
    return {
        hotCareers: [
            {
                career: 'Software Developer',
                growth: '+42%',
                reason: 'Digital India & startup boom',
                salary_trend: 'Rising fast',
                difficulty: 'High demand, competitive entry'
            },
            {
                career: 'Data Scientist',
                growth: '+38%',
                reason: 'AI and big data revolution',
                salary_trend: 'Strong upward trend',
                difficulty: 'High demand, skills shortage'
            },
            {
                career: 'Product Manager',
                growth: '+28%',
                reason: 'Indian startup ecosystem growth',
                salary_trend: 'Premium salaries',
                difficulty: 'High demand, experience required'
            },
            {
                career: 'Cybersecurity Analyst',
                growth: '+35%',
                reason: 'Increasing digital threats',
                salary_trend: 'Rising fast',
                difficulty: 'High demand, competitive entry'
            },
            {
                career: 'Digital Marketing Manager',
                growth: '+25%',
                reason: 'E-commerce boom in India',
                salary_trend: 'Steady growth',
                difficulty: 'Competitive but accessible'
            }
        ],
        emergingFields: [
            'AI/ML Engineer',
            'FinTech Specialist',
            'EdTech Consultant',
            'HealthTech Analyst',
            'Sustainability Consultant',
            'Digital Health Specialist',
            'Remote Work Coordinator',
            'Blockchain Developer'
        ],
        salaryTrends: {
            technology: { trend: 'up', change: '+12%' },
            fintech: { trend: 'up', change: '+15%' },
            healthcare: { trend: 'up', change: '+8%' },
            education: { trend: 'up', change: '+6%' },
            ecommerce: { trend: 'up', change: '+10%' },
            manufacturing: { trend: 'stable', change: '+4%' }
        },
        skillsInDemand: [
            'Machine Learning',
            'Python Programming',
            'React/Node.js',
            'Cloud Computing (AWS/Azure)',
            'Data Analysis',
            'Cybersecurity',
            'Digital Marketing',
            'Project Management',
            'UX/UI Design',
            'Blockchain',
            'DevOps',
            'Mobile App Development'
        ],
        remoteWorkTrends: {
            fullyRemote: '25%',
            hybrid: '55%',
            onSite: '20%',
            trending: 'Hybrid work models preferred in Indian tech companies'
        },
        indianMarketInsights: {
            startupEcosystem: 'Growing rapidly with 50+ unicorns',
            techHubs: 'Bangalore, Mumbai, Hyderabad, Delhi-NCR',
            salaryGrowth: 'Average 15-20% annual increase in tech',
            skillGaps: 'High demand for AI/ML, cybersecurity, cloud skills',
            educationTrends: 'Focus on practical, industry-aligned courses'
        }
    };
};

const getSalaryInsights = (careerName, location = 'India', experience = 'mid') => {
    // Salary data based on career and experience level (in INR)
    const salaryDatabase = {
        'Software Developer': {
            entry: { min: 300000, median: 450000, max: 600000 },
            mid: { min: 600000, median: 900000, max: 1200000 },
            senior: { min: 1200000, median: 1800000, max: 2500000 }
        },
        'Data Scientist': {
            entry: { min: 400000, median: 600000, max: 800000 },
            mid: { min: 800000, median: 1200000, max: 1600000 },
            senior: { min: 1600000, median: 2200000, max: 3000000 }
        },
        'UX Designer': {
            entry: { min: 250000, median: 400000, max: 550000 },
            mid: { min: 500000, median: 750000, max: 1000000 },
            senior: { min: 1000000, median: 1400000, max: 2000000 }
        },
        'Product Manager': {
            entry: { min: 350000, median: 500000, max: 700000 },
            mid: { min: 700000, median: 1000000, max: 1400000 },
            senior: { min: 1400000, median: 2000000, max: 2800000 }
        },
        'Marketing Manager': {
            entry: { min: 300000, median: 450000, max: 600000 },
            mid: { min: 600000, median: 900000, max: 1200000 },
            senior: { min: 1200000, median: 1800000, max: 2500000 }
        },
        'Sales Representative': {
            entry: { min: 250000, median: 400000, max: 550000 },
            mid: { min: 500000, median: 800000, max: 1100000 },
            senior: { min: 1000000, median: 1500000, max: 2200000 }
        },
        'Project Manager': {
            entry: { min: 350000, median: 500000, max: 700000 },
            mid: { min: 700000, median: 1000000, max: 1400000 },
            senior: { min: 1400000, median: 2000000, max: 2800000 }
        },
        'Cybersecurity Analyst': {
            entry: { min: 400000, median: 600000, max: 800000 },
            mid: { min: 800000, median: 1200000, max: 1600000 },
            senior: { min: 1600000, median: 2200000, max: 3000000 }
        },
        'Nurse': {
            entry: { min: 200000, median: 300000, max: 400000 },
            mid: { min: 400000, median: 600000, max: 800000 },
            senior: { min: 800000, median: 1200000, max: 1600000 }
        },
        'Teacher': {
            entry: { min: 180000, median: 250000, max: 350000 },
            mid: { min: 350000, median: 500000, max: 700000 },
            senior: { min: 700000, median: 1000000, max: 1400000 }
        },
        'AI/ML Engineer': {
            entry: { min: 500000, median: 700000, max: 900000 },
            mid: { min: 900000, median: 1400000, max: 1800000 },
            senior: { min: 1800000, median: 2500000, max: 3500000 }
        },
        'DevOps Engineer': {
            entry: { min: 400000, median: 600000, max: 800000 },
            mid: { min: 800000, median: 1200000, max: 1600000 },
            senior: { min: 1600000, median: 2200000, max: 3000000 }
        },
        'Full Stack Developer': {
            entry: { min: 350000, median: 500000, max: 700000 },
            mid: { min: 700000, median: 1000000, max: 1400000 },
            senior: { min: 1400000, median: 2000000, max: 2800000 }
        },
        'Mobile App Developer': {
            entry: { min: 300000, median: 450000, max: 600000 },
            mid: { min: 600000, median: 900000, max: 1200000 },
            senior: { min: 1200000, median: 1800000, max: 2500000 }
        },
        'Blockchain Developer': {
            entry: { min: 450000, median: 650000, max: 850000 },
            mid: { min: 850000, median: 1300000, max: 1700000 },
            senior: { min: 1700000, median: 2400000, max: 3200000 }
        },
        'FinTech Specialist': {
            entry: { min: 400000, median: 600000, max: 800000 },
            mid: { min: 800000, median: 1200000, max: 1600000 },
            senior: { min: 1600000, median: 2200000, max: 3000000 }
        },
        'EdTech Consultant': {
            entry: { min: 300000, median: 450000, max: 600000 },
            mid: { min: 600000, median: 900000, max: 1200000 },
            senior: { min: 1200000, median: 1800000, max: 2500000 }
        },
        'HealthTech Analyst': {
            entry: { min: 350000, median: 500000, max: 700000 },
            mid: { min: 700000, median: 1000000, max: 1400000 },
            senior: { min: 1400000, median: 2000000, max: 2800000 }
        }
    };
    
    const careerSalary = salaryDatabase[careerName] || {
        entry: { min: 200000, median: 300000, max: 400000 },
        mid: { min: 400000, median: 600000, max: 800000 },
        senior: { min: 800000, median: 1200000, max: 1600000 }
    };
    
    // Indian cities with cost-of-living multipliers
    const indianLocationMultipliers = {
        'India': 1.0,
        'Mumbai': 1.4,
        'Delhi': 1.3,
        'Bangalore': 1.25,
        'Hyderabad': 1.15,
        'Chennai': 1.1,
        'Pune': 1.05,
        'Kolkata': 1.0,
        'Gurgaon': 1.35,
        'Noida': 1.2
    };
    
    // International location multipliers
    const internationalMultipliers = {
        'US': 0.012, // Convert INR to USD (approximate)
        'UK': 0.0095, // Convert INR to GBP
        'Canada': 0.016, // Convert INR to CAD
        'Australia': 0.018 // Convert INR to AUD
    };
    
    const isIndianLocation = indianLocationMultipliers.hasOwnProperty(location);
    const locationMultiplier = isIndianLocation ? indianLocationMultipliers[location] : (internationalMultipliers[location] || 1.0);
    
    return {
        base: careerSalary[experience] || careerSalary.mid,
        locationMultiplier,
        isIndianLocation,
        currency: isIndianLocation ? 'INR' : (location === 'US' ? 'USD' : location === 'UK' ? 'GBP' : location === 'Canada' ? 'CAD' : 'AUD'),
        benefits: isIndianLocation ? {
            healthInsurance: 'ESIC coverage + company insurance',
            providentFund: '12% EPF contribution',
            gratuity: 'After 5 years of service',
            paidTimeOff: '18-21 days average',
            remoteWork: 'Hybrid model common'
        } : {
            healthInsurance: '85% of companies offer',
            retirement401k: '78% with matching',
            paidTimeOff: '15-25 days average',
            remoteWork: '60% offer flexible options'
        },
        negotiationTips: isIndianLocation ? [
            'Research market rates for your specific role and city',
            'Highlight technical skills and certifications',
            'Consider total CTC including variable pay',
            'Negotiate for learning and growth opportunities',
            'Understand the difference between take-home and CTC'
        ] : [
            'Research market rates for your specific role and location',
            'Highlight unique skills and achievements',
            'Consider total compensation package, not just base salary',
            'Be prepared to justify your salary expectations'
        ]
    };
};

// Advanced Analytics API Endpoints
app.get('/api/analytics/predictions', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required for personalized predictions' });
        }
        
        const assessments = await db.getAssessmentHistory(req.user.id);
        const careerData = await db.getAllCareerProfiles();
        
        if (assessments.length === 0) {
            return res.json({
                hasPredictions: false,
                message: 'Complete a career assessment to get personalized predictions',
                generalTrends: getMarketTrends()
            });
        }
        
        const predictions = generateCareerPredictions(assessments, careerData);
        
        res.json({
            hasPredictions: true,
            predictions,
            lastAssessment: assessments[assessments.length - 1].created_at,
            confidence: 'High - Based on your latest assessment'
        });
        
    } catch (error) {
        console.error('Analytics predictions error:', error);
        res.status(500).json({ error: 'Failed to generate career predictions' });
    }
});

app.get('/api/analytics/market-trends', async (req, res) => {
    try {
        const trends = getMarketTrends();
        res.json(trends);
    } catch (error) {
        console.error('Market trends error:', error);
        res.status(500).json({ error: 'Failed to fetch market trends' });
    }
});

// ECON: unified trends scaffold (ready to swap to live providers)
app.get('/api/econ/trends', async (req, res) => {
    try {
        const trends = getMarketTrends();
        res.json({
            success: true,
            provider: 'internal-stub',
            trends
        });
    } catch (error) {
        console.error('ECON trends error:', error);
        res.status(500).json({ error: 'Failed to fetch econ trends' });
    }
});

// ECON: job openings trend by career/location (stubbed)
app.get('/api/econ/jobs', async (req, res) => {
    try {
        const { career = 'Software Developer', location = 'US' } = req.query;
        // Placeholder structure; replace with live boards later
        res.json({
            success: true,
            career,
            location,
            openings: Math.floor(500 + Math.random() * 1500),
            trend: ['up','stable','down'][Math.floor(Math.random()*3)],
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('ECON jobs error:', error);
        res.status(500).json({ error: 'Failed to fetch job openings' });
    }
});

// ECON: live salary proxy scaffold (currently uses internal calc)
app.get('/api/econ/salary-live', async (req, res) => {
    try {
        const { career, location = 'US', experience = 'mid' } = req.query;
        if (!career) return res.status(400).json({ error: 'Career required' });
        const insights = getSalaryInsights(career, location, experience);
        const adjustedSalary = {
            min: Math.round(insights.base.min * insights.locationMultiplier),
            median: Math.round(insights.base.median * insights.locationMultiplier),
            max: Math.round(insights.base.max * insights.locationMultiplier)
        };
        res.json({
            success: true,
            career,
            location,
            experience,
            salary: adjustedSalary,
            source: 'internal-stub',
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('ECON salary-live error:', error);
        res.status(500).json({ error: 'Failed to fetch live salary' });
    }
});

app.get('/api/analytics/salary-insights', async (req, res) => {
    try {
        const { career, location = 'US', experience = 'mid' } = req.query;
        
        if (!career) {
            return res.status(400).json({ error: 'Career parameter is required' });
        }
        
        const insights = getSalaryInsights(career, location, experience);
        
        // Apply location multiplier
        const adjustedSalary = {
            min: Math.round(insights.base.min * insights.locationMultiplier),
            median: Math.round(insights.base.median * insights.locationMultiplier),
            max: Math.round(insights.base.max * insights.locationMultiplier)
        };
        
        const isIndianLocation = String(location).toLowerCase().includes('india');
        const currency = isIndianLocation ? 'INR' : 'USD';

        res.json({
            career,
            location,
            experience,
            salary: adjustedSalary,
            benefits: insights.benefits,
            negotiationTips: insights.negotiationTips,
            lastUpdated: new Date().toISOString().split('T')[0],
            currency,
            isIndianLocation
        });
        
    } catch (error) {
        console.error('Salary insights error:', error);
        res.status(500).json({ error: 'Failed to fetch salary insights' });
    }
});

app.get('/api/analytics/skills-gap', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required for skills gap analysis' });
        }
        
        const { targetCareer } = req.query;
        
        if (!targetCareer) {
            return res.status(400).json({ error: 'Target career is required' });
        }
        
        const assessments = await db.getAssessmentHistory(req.user.id);
        const careerProfile = await db.getCareerProfileByName(targetCareer);
        
        if (!careerProfile) {
            return res.status(404).json({ error: 'Career profile not found' });
        }
        
        let currentSkills = {};
        if (assessments.length > 0) {
            const latestAssessment = assessments[assessments.length - 1];
            const answers = JSON.parse(latestAssessment.quiz_answers || '{}');
            currentSkills = answers.skills || {};
        }
        
        const requiredSkills = careerProfile.skills_required || [];
        const skillsGap = requiredSkills.map(skill => {
            const currentLevel = currentSkills[skill.toLowerCase()] || 1;
            const targetLevel = 4; // Assume target level is 4/5
            const gap = Math.max(0, targetLevel - currentLevel);
            
            return {
                skill,
                currentLevel,
                targetLevel,
                gap,
                priority: gap > 2 ? 'high' : gap > 1 ? 'medium' : 'low'
            };
        });
        
        res.json({
            targetCareer,
            skillsGap: skillsGap.sort((a, b) => b.gap - a.gap),
            recommendations: {
                highPriority: skillsGap.filter(s => s.priority === 'high').map(s => s.skill),
                mediumPriority: skillsGap.filter(s => s.priority === 'medium').map(s => s.skill),
                strengths: skillsGap.filter(s => s.gap === 0).map(s => s.skill)
            }
        });
        
    } catch (error) {
        console.error('Skills gap analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze skills gap' });
    }
});

// Gamification API Endpoints
app.get('/api/gamification/profile', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const gamification = await db.getUserGamification(req.user.id);
        const nextLevelXP = db.getXPForNextLevel(gamification.current_level);
        const progressToNextLevel = ((gamification.total_xp % (gamification.current_level * gamification.current_level * 100)) / (nextLevelXP - (gamification.current_level - 1) * (gamification.current_level - 1) * 100)) * 100;

        res.json({
            ...gamification,
            nextLevelXP,
            progressToNextLevel: Math.min(100, Math.max(0, progressToNextLevel)),
            xpToNextLevel: nextLevelXP - gamification.total_xp
        });
    } catch (error) {
        console.error('Gamification profile error:', error);
        res.status(500).json({ error: 'Failed to fetch gamification profile' });
    }
});

app.post('/api/gamification/award-xp', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { amount, source = 'general' } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid XP amount required' });
        }

        const result = await db.awardXP(req.user.id, amount, source);
        
        // Check for new achievements
        const achievements = await db.checkAndAwardLearningAchievements(req.user.id);
        
        res.json({
            success: true,
            ...result,
            newAchievements: achievements
        });
    } catch (error) {
        console.error('Award XP error:', error);
        res.status(500).json({ error: 'Failed to award XP' });
    }
});

app.post('/api/gamification/complete-course', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { resourceId, courseTitle = 'Course' } = req.body;

        if (!resourceId) {
            return res.status(400).json({ error: 'Resource ID required' });
        }

        // Update learning progress
        await db.saveUserLearningProgress(req.user.id, resourceId, 'completed', 100);
        
        // Award XP for completion
        const xpResult = await db.awardXP(req.user.id, 100, 'course_completion');
        
        // Check for achievements
        const achievements = await db.checkAndAwardLearningAchievements(req.user.id);
        
        // Log activity
        await db.logUserActivity(req.user.id, 'course_completed', 'learning_resource', resourceId, `Completed course: ${courseTitle}`);
        
        res.json({
            success: true,
            message: `Congratulations! You completed ${courseTitle}`,
            xpAwarded: xpResult.xpAwarded,
            levelUp: xpResult.levelUp,
            newLevel: xpResult.newLevel,
            newAchievements: achievements
        });
    } catch (error) {
        console.error('Complete course error:', error);
        res.status(500).json({ error: 'Failed to complete course' });
    }
});

app.post('/api/gamification/start-course', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { resourceId, courseTitle = 'Course' } = req.body;

        if (!resourceId) {
            return res.status(400).json({ error: 'Resource ID required' });
        }

        // Update learning progress
        await db.saveUserLearningProgress(req.user.id, resourceId, 'in_progress', 0);
        
        // Award XP for starting
        const xpResult = await db.awardXP(req.user.id, 25, 'course_start');
        
        // Check for achievements
        const achievements = await db.checkAndAwardLearningAchievements(req.user.id);
        
        // Log activity
        await db.logUserActivity(req.user.id, 'course_started', 'learning_resource', resourceId, `Started course: ${courseTitle}`);
        
        res.json({
            success: true,
            message: `Started ${courseTitle}! Keep up the great work!`,
            xpAwarded: xpResult.xpAwarded,
            levelUp: xpResult.levelUp,
            newLevel: xpResult.newLevel,
            newAchievements: achievements
        });
    } catch (error) {
        console.error('Start course error:', error);
        res.status(500).json({ error: 'Failed to start course' });
    }
});

app.get('/api/gamification/leaderboard', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const leaderboard = await db.getLeaderboard(parseInt(limit));
        
        res.json(leaderboard);
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

app.get('/api/gamification/achievements', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const gamification = await db.getUserGamification(req.user.id);
        
        // Define available achievements
        const allAchievements = [
            {
                id: 'first_course_started',
                name: 'Learning Journey Begins',
                description: 'Started your first learning course',
                xp_reward: 50,
                category: 'learning',
                icon: '🎆',
                rarity: 'common'
            },
            {
                id: 'first_course_completed',
                name: 'Course Conqueror',
                description: 'Completed your first learning course',
                xp_reward: 100,
                category: 'learning',
                icon: '🏆',
                rarity: 'common'
            },
            {
                id: 'course_enthusiast',
                name: 'Learning Enthusiast',
                description: 'Completed 3 learning courses',
                xp_reward: 200,
                category: 'learning',
                icon: '📚',
                rarity: 'uncommon'
            },
            {
                id: 'course_master',
                name: 'Learning Master',
                description: 'Completed 5 learning courses',
                xp_reward: 300,
                category: 'learning',
                icon: '👨‍🎓',
                rarity: 'rare'
            }
        ];
        
        // Mark which achievements are unlocked
        const achievementsWithStatus = allAchievements.map(achievement => {
            const unlocked = gamification.achievements_unlocked.find(a => a.id === achievement.id);
            return {
                ...achievement,
                unlocked: !!unlocked,
                unlocked_at: unlocked ? unlocked.unlocked_at : null
            };
        });
        
        res.json({
            achievements: achievementsWithStatus,
            totalUnlocked: gamification.achievements_unlocked.length,
            badges: gamification.badges_earned
        });
    } catch (error) {
        console.error('Achievements error:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
});

// Learning Paths API Endpoints
app.get('/api/learning-paths/user-paths', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const userPaths = await db.getUserLearningPaths(req.user.id);
        res.json(userPaths);
    } catch (error) {
        console.error('User paths error:', error);
        res.status(500).json({ error: 'Failed to fetch user learning paths' });
    }
});

app.get('/api/learning-paths/recommended', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { limit = 5 } = req.query;
        const recommendedPaths = await db.getRecommendedPaths(req.user.id, parseInt(limit));
        res.json(recommendedPaths);
    } catch (error) {
        console.error('Recommended paths error:', error);
        res.status(500).json({ error: 'Failed to fetch recommended paths' });
    }
});

app.post('/api/learning-paths/generate', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { careerGoal, skillLevel = 'beginner' } = req.body;

        if (!careerGoal) {
            return res.status(400).json({ error: 'Career goal is required' });
        }

        const pathResult = await db.generateDynamicLearningPath(req.user.id, careerGoal, skillLevel);
        
        // Automatically enroll user in the generated path
        await db.enrollUserInPath(req.user.id, pathResult.pathId);
        
        // Award XP for creating a learning path
        await db.awardXP(req.user.id, 50, 'path_generation');
        
        // Log activity
        await db.logUserActivity(req.user.id, 'path_generated', 'learning_path', pathResult.pathId, `Generated personalized path for ${careerGoal}`);
        
        res.json({
            success: true,
            message: `Your personalized ${careerGoal} learning path has been created!`,
            path: pathResult.pathData,
            pathId: pathResult.pathId,
            modules: pathResult.modules
        });
    } catch (error) {
        console.error('Generate path error:', error);
        res.status(500).json({ error: 'Failed to generate learning path' });
    }
});

app.post('/api/learning-paths/enroll', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { pathId, customizations = {} } = req.body;

        if (!pathId) {
            return res.status(400).json({ error: 'Path ID is required' });
        }

        const enrollmentId = await db.enrollUserInPath(req.user.id, pathId, customizations);
        
        // Award XP for enrolling
        await db.awardXP(req.user.id, 25, 'path_enrollment');
        
        // Log activity
        await db.logUserActivity(req.user.id, 'path_enrolled', 'learning_path', pathId, 'Enrolled in learning path');
        
        res.json({
            success: true,
            message: 'Successfully enrolled in learning path!',
            enrollmentId
        });
    } catch (error) {
        console.error('Enroll path error:', error);
        res.status(500).json({ error: 'Failed to enroll in learning path' });
    }
});

app.get('/api/learning-paths/:pathId/modules', async (req, res) => {
    try {
        const { pathId } = req.params;
        const modules = await db.getPathModules(pathId);
        
        // Get resource details for each module
        for (const module of modules) {
            if (module.resource_ids.length > 0) {
                const resources = await db.getAllLearningResources();
                module.resources = resources.filter(r => module.resource_ids.includes(r.id));
            } else {
                module.resources = [];
            }
        }
        
        res.json(modules);
    } catch (error) {
        console.error('Path modules error:', error);
        res.status(500).json({ error: 'Failed to fetch path modules' });
    }
});

app.post('/api/learning-paths/update-progress', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { pathId, moduleIndex, progress } = req.body;

        if (!pathId || moduleIndex === undefined || progress === undefined) {
            return res.status(400).json({ error: 'Path ID, module index, and progress are required' });
        }

        const updated = await db.updatePathProgress(req.user.id, pathId, moduleIndex, progress);
        
        if (updated) {
            // Award XP for progress
            if (progress === 100) {
                await db.awardXP(req.user.id, 75, 'module_completion');
            }
            
            res.json({
                success: true,
                message: 'Progress updated successfully'
            });
        } else {
            res.status(404).json({ error: 'Learning path not found' });
        }
    } catch (error) {
        console.error('Update progress error:', error);
        res.status(500).json({ error: 'Failed to update progress' });
    }
});

// Skills and Prerequisites API Endpoints
app.get('/api/skills/all', async (req, res) => {
    try {
        const skills = await db.getAllSkillsWithPrerequisites();
        res.json(skills);
    } catch (error) {
        console.error('Skills fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch skills' });
    }
});

app.get('/api/skills/:skillId', async (req, res) => {
    try {
        const { skillId } = req.params;
        const skill = await db.getSkillWithPrerequisites(skillId);
        
        if (skill) {
            res.json(skill);
        } else {
            res.status(404).json({ error: 'Skill not found' });
        }
    } catch (error) {
        console.error('Skill fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch skill' });
    }
});

app.get('/api/skills/user/progress', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const userProgress = await db.getUserSkillProgress(req.user.id);
        res.json(userProgress);
    } catch (error) {
        console.error('User skill progress error:', error);
        res.status(500).json({ error: 'Failed to fetch user skill progress' });
    }
});

app.post('/api/skills/user/progress', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { skillId, current_level, confidence_score, hours_spent, resource_completed } = req.body;

        if (!skillId) {
            return res.status(400).json({ error: 'Skill ID is required' });
        }

        const updated = await db.updateUserSkillProgress(req.user.id, skillId, {
            current_level,
            confidence_score,
            hours_spent,
            resource_completed
        });

        // Award XP for skill progress
        if (updated && current_level > 0) {
            await db.awardXP(req.user.id, current_level * 10, 'skill_progress');
        }

        res.json({
            success: true,
            message: 'Skill progress updated successfully'
        });
    } catch (error) {
        console.error('Update skill progress error:', error);
        res.status(500).json({ error: 'Failed to update skill progress' });
    }
});

app.post('/api/skills/learning-sequence', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { targetSkills } = req.body;

        if (!targetSkills || !Array.isArray(targetSkills)) {
            return res.status(400).json({ error: 'Target skills array is required' });
        }

        const sequence = await db.getOptimalLearningSequence(req.user.id, targetSkills);
        
        res.json({
            success: true,
            sequence,
            totalSkills: sequence.length,
            estimatedHours: sequence.reduce((total, skill) => total + (skill.estimated_hours || 0), 0)
        });
    } catch (error) {
        console.error('Learning sequence error:', error);
        res.status(500).json({ error: 'Failed to generate learning sequence' });
    }
});

app.get('/api/skills/categories', async (req, res) => {
    try {
        const skills = await db.getAllSkillsWithPrerequisites();
        
        // Group skills by category
        const categories = skills.reduce((acc, skill) => {
            if (!acc[skill.category]) {
                acc[skill.category] = {
                    name: skill.category,
                    skills: [],
                    count: 0
                };
            }
            acc[skill.category].skills.push(skill);
            acc[skill.category].count++;
            return acc;
        }, {});
        
        res.json(Object.values(categories));
    } catch (error) {
        console.error('Skill categories error:', error);
        res.status(500).json({ error: 'Failed to fetch skill categories' });
    }
});

// Enhanced Career Predictions API
app.get('/api/analytics/enhanced-predictions', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const predictions = await db.getEnhancedCareerPredictions(req.user.id);
        
        if (predictions.error) {
            return res.status(400).json(predictions);
        }
        
        res.json({
            success: true,
            ...predictions
        });
    } catch (error) {
        console.error('Enhanced predictions error:', error);
        res.status(500).json({ error: 'Failed to generate enhanced predictions' });
    }
});

app.get('/api/analytics/career-insights/:careerId', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { careerId } = req.params;
        const predictions = await db.getEnhancedCareerPredictions(req.user.id);
        
        if (predictions.error) {
            return res.status(400).json(predictions);
        }
        
        const careerInsight = predictions.predictions.find(p => p.careerId === careerId);
        
        if (careerInsight) {
            res.json({
                success: true,
                insight: careerInsight,
                additionalData: {
                    skillGaps: await db.getSkillGapsForCareer(req.user.id, careerId),
                    learningPath: await db.getRecommendedLearningPath(req.user.id, careerId),
                    marketTrends: await db.getCareerMarketTrends(careerId)
                }
            });
        } else {
            res.status(404).json({ error: 'Career insight not found' });
        }
    } catch (error) {
        console.error('Career insights error:', error);
        res.status(500).json({ error: 'Failed to fetch career insights' });
    }
});

// Peer Comparison and Benchmarking API
app.get('/api/analytics/peer-comparison', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const peerComparison = await db.getPeerComparison(req.user.id);
        
        if (peerComparison.error) {
            return res.status(400).json(peerComparison);
        }
        
        res.json(peerComparison);
    } catch (error) {
        console.error('Peer comparison error:', error);
        res.status(500).json({ error: 'Failed to generate peer comparison' });
    }
});

app.get('/api/analytics/industry-benchmarks/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const benchmarks = await db.getIndustryBenchmarks(category);
        
        if (benchmarks) {
            res.json({
                success: true,
                category,
                benchmarks,
                lastUpdated: new Date().toISOString()
            });
        } else {
            res.status(404).json({ error: 'Industry benchmarks not found for this category' });
        }
    } catch (error) {
        console.error('Industry benchmarks error:', error);
        res.status(500).json({ error: 'Failed to fetch industry benchmarks' });
    }
});

app.get('/api/analytics/performance-trends/:userId', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Ensure user can only access their own trends or is admin
        const { userId } = req.params;
        if (req.user.id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get user performance trends over time
        const trends = await db.getUserPerformanceTrends(userId);
        
        res.json({
            success: true,
            trends,
            period: 'last_6_months'
        });
    } catch (error) {
        console.error('Performance trends error:', error);
        res.status(500).json({ error: 'Failed to fetch performance trends' });
    }
});

// Career Report Generation API
app.get('/api/analytics/generate-report/:type', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { type } = req.params;
        const validTypes = ['comprehensive', 'assessment', 'progress', 'predictions'];
        
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid report type' });
        }

        const reportResult = await db.generateCareerReport(req.user.id, type);
        
        if (reportResult.error) {
            return res.status(400).json(reportResult);
        }
        
        res.json(reportResult);
    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({ error: 'Failed to generate career report' });
    }
});

// Export report as PDF (simplified - would need a PDF library in production)
app.post('/api/analytics/export-report', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { reportData, format = 'pdf' } = req.body;
        
        if (!reportData) {
            return res.status(400).json({ error: 'Report data is required' });
        }

        // In a real implementation, you would use a PDF library like puppeteer or jsPDF
        // For now, we'll return the report data formatted for download
        
        const exportData = {
            filename: `mindmate-career-report-${Date.now()}.${format}`,
            content: reportData,
            contentType: format === 'pdf' ? 'application/pdf' : 'application/json',
            generatedAt: new Date().toISOString()
        };
        
        res.json({
            success: true,
            export: exportData,
            downloadUrl: `/api/analytics/download-report/${exportData.filename}`,
            message: 'Report prepared for download'
        });
    } catch (error) {
        console.error('Report export error:', error);
        res.status(500).json({ error: 'Failed to export report' });
    }
});

// Get available report templates
app.get('/api/analytics/report-templates', authenticateToken, async (req, res) => {
    try {
        const templates = [
            {
                id: 'comprehensive',
                name: 'Comprehensive Career Analysis',
                description: 'Complete analysis including assessment results, predictions, skills analysis, and action plan',
                sections: ['Executive Summary', 'Assessment Results', 'Skills Analysis', 'Career Predictions', 'Market Analysis', 'Peer Comparison', 'Action Plan'],
                estimatedPages: '15-20 pages',
                generationTime: '2-3 minutes'
            },
            {
                id: 'assessment',
                name: 'Career Assessment Report',
                description: 'Focused on your personality profile and career recommendations',
                sections: ['Assessment Overview', 'Personality Profile', 'Career Recommendations', 'Next Steps'],
                estimatedPages: '8-10 pages',
                generationTime: '1-2 minutes'
            },
            {
                id: 'progress',
                name: 'Learning Progress Report',
                description: 'Track your learning journey, skills development, and achievements',
                sections: ['Progress Overview', 'Skills Development', 'Learning Activities', 'Achievements'],
                estimatedPages: '6-8 pages',
                generationTime: '1 minute'
            },
            {
                id: 'predictions',
                name: 'Career Predictions Report',
                description: 'Detailed analysis of your career success predictions and factors',
                sections: ['Predictions Overview', 'Success Factors', 'Career Timelines', 'Actionable Insights'],
                estimatedPages: '10-12 pages',
                generationTime: '1-2 minutes'
            }
        ];
        
        res.json({
            success: true,
            templates
        });
    } catch (error) {
        console.error('Report templates error:', error);
        res.status(500).json({ error: 'Failed to fetch report templates' });
    }
});

// Serve index.html for all routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Enhanced error handling
app.use((error, req, res, next) => {
    console.error('Server Error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: 'Something went wrong. Please try again.'
    });
});

app.listen(PORT, () => {
    console.log(`MindMate server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Port: ${PORT}`);
});

// AI Twin Career Simulation Endpoints
app.post('/api/ai-twin/simulate', authenticateToken, async (req, res) => {
    try {
        const { careerPath, simulationType, userProfile } = req.body;
        
        if (!careerPath || !simulationType) {
            return res.status(400).json({ error: 'Career path and simulation type required' });
        }

        // Get user's assessment history for personalized simulation
        const assessments = await db.getAssessmentHistory(req.user.id);
        const userSkills = await db.getUserSkills(req.user.id);
        
        // Create personalized AI Twin simulation
        const simulation = await generateAITwinSimulation(careerPath, simulationType, userProfile, assessments, userSkills);
        
        res.json({
            success: true,
            simulation,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('AI Twin simulation error:', error);
        res.status(500).json({ error: 'Failed to generate career simulation' });
    }
});

app.get('/api/ai-twin/scenarios/:careerId', authenticateToken, async (req, res) => {
    try {
        const { careerId } = req.params;
        const { timeframe = '5years' } = req.query;
        
        // Generate career scenarios based on user profile
        const userProfile = await db.getUserProfile(req.user.id);
        const scenarios = await generateCareerScenarios(careerId, timeframe, userProfile);
        
        res.json({
            success: true,
            scenarios,
            careerId,
            timeframe
        });
        
    } catch (error) {
        console.error('AI Twin scenarios error:', error);
        res.status(500).json({ error: 'Failed to generate career scenarios' });
    }
});

app.post('/api/ai-twin/predict-success', authenticateToken, async (req, res) => {
    try {
        const { careerPath, targetRole, timeline } = req.body;
        
        // Analyze user's current state and predict success probability
        const userProfile = await db.getUserProfile(req.user.id);
        const assessments = await db.getAssessmentHistory(req.user.id);
        const userSkills = await db.getUserSkills(req.user.id);
        
        const prediction = await predictCareerSuccess(careerPath, targetRole, timeline, userProfile, assessments, userSkills);
        
        res.json({
            success: true,
            prediction,
            confidence: prediction.confidence,
            recommendations: prediction.recommendations
        });
        
    } catch (error) {
        console.error('AI Twin success prediction error:', error);
        res.status(500).json({ error: 'Failed to predict career success' });
    }
});

app.get('/api/ai-twin/personality-match/:careerId', authenticateToken, async (req, res) => {
    try {
        const { careerId } = req.params;
        const userProfile = await db.getUserProfile(req.user.id);
        const assessments = await db.getAssessmentHistory(req.user.id);
        
        const personalityMatch = await analyzePersonalityCareerMatch(careerId, userProfile, assessments);
        
        res.json({
            success: true,
            match: personalityMatch,
            careerId
        });
        
    } catch (error) {
        console.error('AI Twin personality match error:', error);
        res.status(500).json({ error: 'Failed to analyze personality match' });
    }
});

// AI Twin Core Functions
async function generateAITwinSimulation(careerPath, simulationType, userProfile, assessments, userSkills) {
    const baseProfile = {
        currentLevel: userProfile?.experience_level || 'entry',
        skills: userSkills?.map(s => s.skill_name) || [],
        interests: assessments?.map(a => a.interests).flat() || [],
        strengths: assessments?.map(a => a.strengths).flat() || []
    };

    // Generate different types of simulations
    switch (simulationType) {
        case 'career_progression':
            return generateCareerProgressionSimulation(careerPath, baseProfile);
        case 'skill_development':
            return generateSkillDevelopmentSimulation(careerPath, baseProfile);
        case 'market_adaptation':
            return generateMarketAdaptationSimulation(careerPath, baseProfile);
        case 'startup_journey':
            return generateStartupJourneySimulation(careerPath, baseProfile);
        case 'international_expansion':
            return generateInternationalExpansionSimulation(careerPath, baseProfile);
        default:
            return generateCareerProgressionSimulation(careerPath, baseProfile);
    }
}

function generateCareerProgressionSimulation(careerPath, userProfile) {
    const progressionStages = [
        {
            stage: 'Year 1-2',
            role: 'Junior Developer',
            salary: '₹4-6 LPA',
            skills: ['Core Programming', 'Basic Tools', 'Team Collaboration'],
            challenges: ['Learning Curve', 'Code Quality', 'Time Management'],
            opportunities: ['Mentorship', 'Skill Development', 'Project Exposure'],
            successProbability: 0.85
        },
        {
            stage: 'Year 3-5',
            role: 'Mid-Level Developer',
            salary: '₹8-15 LPA',
            skills: ['Advanced Programming', 'System Design', 'Leadership'],
            challenges: ['Technical Debt', 'Team Coordination', 'Architecture Decisions'],
            opportunities: ['Technical Leadership', 'Mentoring Others', 'Specialization'],
            successProbability: 0.75
        },
        {
            stage: 'Year 6-8',
            role: 'Senior Developer/Lead',
            salary: '₹18-30 LPA',
            skills: ['System Architecture', 'Team Leadership', 'Strategic Thinking'],
            challenges: ['Complex Systems', 'Team Management', 'Business Impact'],
            opportunities: ['Technical Architecture', 'Team Leadership', 'Business Strategy'],
            successProbability: 0.65
        },
        {
            stage: 'Year 9+',
            role: 'Principal/Architect',
            salary: '₹35-50+ LPA',
            skills: ['Enterprise Architecture', 'Strategic Planning', 'Innovation'],
            challenges: ['Technology Strategy', 'Organizational Change', 'Innovation Management'],
            opportunities: ['Technology Leadership', 'Strategic Influence', 'Industry Recognition'],
            successProbability: 0.50
        }
    ];

    return {
        type: 'career_progression',
        careerPath,
        userProfile,
        progressionStages,
        overallSuccessProbability: 0.69,
        keyFactors: {
            strengths: userProfile.strengths.slice(0, 3),
            areasForImprovement: ['Advanced Problem Solving', 'System Design', 'Leadership Skills'],
            marketDemand: 'High',
            competitionLevel: 'Moderate to High'
        },
        recommendations: [
            'Focus on building strong fundamentals in first 2 years',
            'Seek mentorship and take on challenging projects',
            'Develop both technical and soft skills',
            'Stay updated with latest technologies and trends'
        ]
    };
}

function generateSkillDevelopmentSimulation(careerPath, userProfile) {
    const skillRoadmap = {
        immediate: {
            timeframe: '0-6 months',
            skills: ['Core Programming', 'Version Control', 'Basic Testing'],
            resources: ['Online Courses', 'Practice Projects', 'Code Reviews'],
            estimatedHours: 200,
            successProbability: 0.90
        },
        shortTerm: {
            timeframe: '6-12 months',
            skills: ['Advanced Programming', 'Database Design', 'API Development'],
            resources: ['Advanced Courses', 'Real Projects', 'Mentorship'],
            estimatedHours: 300,
            successProbability: 0.80
        },
        mediumTerm: {
            timeframe: '1-2 years',
            skills: ['System Design', 'Cloud Computing', 'DevOps Practices'],
            resources: ['Specialized Training', 'Industry Projects', 'Certifications'],
            estimatedHours: 500,
            successProbability: 0.70
        },
        longTerm: {
            timeframe: '2-5 years',
            skills: ['Enterprise Architecture', 'Leadership', 'Strategic Thinking'],
            resources: ['Leadership Programs', 'Strategic Projects', 'Industry Networking'],
            estimatedHours: 800,
            successProbability: 0.60
        }
    };

    return {
        type: 'skill_development',
        careerPath,
        userProfile,
        skillRoadmap,
        totalInvestment: {
            time: '2,800 hours',
            cost: '₹75,000 - ₹1,50,000',
            duration: '3-5 years'
        },
        marketValue: {
            entryLevel: '₹4-6 LPA',
            midLevel: '₹12-20 LPA',
            seniorLevel: '₹25-40 LPA'
        },
        recommendations: [
            'Start with fundamentals and build progressively',
            'Balance theoretical learning with practical application',
            'Seek feedback and mentorship throughout the journey',
            'Focus on in-demand skills for maximum ROI'
        ]
    };
}

function generateMarketAdaptationSimulation(careerPath, userProfile) {
    const marketScenarios = [
        {
            scenario: 'Tech Boom (High Growth)',
            probability: 0.30,
            salaryGrowth: '+25% annually',
            demand: 'Very High',
            opportunities: ['Multiple job offers', 'Fast promotions', 'High bonuses'],
            risks: ['Market volatility', 'High expectations', 'Work-life balance'],
            recommendations: ['Negotiate aggressively', 'Focus on high-value skills', 'Build strong network']
        },
        {
            scenario: 'Steady Growth',
            probability: 0.45,
            salaryGrowth: '+15% annually',
            demand: 'High',
            opportunities: ['Stable growth', 'Good work-life balance', 'Skill development'],
            risks: ['Slower advancement', 'Competition', 'Skill obsolescence'],
            recommendations: ['Continuous learning', 'Specialize in niche areas', 'Build reputation']
        },
        {
            scenario: 'Market Correction',
            probability: 0.20,
            salaryGrowth: '+5-10% annually',
            demand: 'Moderate',
            opportunities: ['Job security', 'Skill building', 'Market positioning'],
            risks: ['Limited growth', 'Reduced opportunities', 'Salary stagnation'],
            recommendations: ['Focus on essential skills', 'Build emergency fund', 'Network actively']
        },
        {
            scenario: 'Economic Downturn',
            probability: 0.05,
            salaryGrowth: '0-5% annually',
            demand: 'Low',
            opportunities: ['Skill development', 'Market preparation', 'Strategic positioning'],
            risks: ['Job insecurity', 'Salary cuts', 'Limited opportunities'],
            recommendations: ['Upskilling', 'Financial planning', 'Alternative income sources']
        }
    ];

    return {
        type: 'market_adaptation',
        careerPath,
        userProfile,
        marketScenarios,
        expectedOutcome: {
            averageSalaryGrowth: '+18% annually',
            careerStability: 'High',
            marketDemand: 'Strong',
            adaptabilityScore: 0.75
        },
        adaptationStrategies: [
            'Continuous skill development and upskilling',
            'Building strong professional network',
            'Diversifying skill set for market flexibility',
            'Staying updated with industry trends',
            'Financial planning for market uncertainties'
        ]
    };
}

function generateStartupJourneySimulation(careerPath, userProfile) {
    const startupPhases = [
        {
            phase: 'Ideation & Validation',
            duration: '3-6 months',
            activities: ['Market Research', 'Problem Validation', 'Solution Design'],
            skills: ['Research', 'Analysis', 'Creativity'],
            successProbability: 0.40,
            funding: '₹0-5 Lakhs (Bootstrapped)'
        },
        {
            phase: 'MVP Development',
            duration: '6-12 months',
            activities: ['Product Development', 'User Testing', 'Iteration'],
            skills: ['Development', 'Testing', 'User Research'],
            successProbability: 0.25,
            funding: '₹5-25 Lakhs (Angel/Seed)'
        },
        {
            phase: 'Market Entry',
            duration: '12-24 months',
            activities: ['Launch', 'Marketing', 'Sales'],
            skills: ['Marketing', 'Sales', 'Operations'],
            successProbability: 0.15,
            funding: '₹25-100 Lakhs (Series A)'
        },
        {
            phase: 'Growth & Scale',
            duration: '24+ months',
            activities: ['Expansion', 'Team Building', 'Process Optimization'],
            skills: ['Leadership', 'Management', 'Strategy'],
            successProbability: 0.08,
            funding: '₹1-10 Crore+ (Series B+)'
        }
    ];

    return {
        type: 'startup_journey',
        careerPath,
        userProfile,
        startupPhases,
        overallSuccessProbability: 0.08,
        keySuccessFactors: [
            'Strong problem-solution fit',
            'Market timing and demand',
            'Team capabilities and execution',
            'Access to funding and resources',
            'Adaptability and resilience'
        ],
        riskMitigation: [
            'Validate ideas before building',
            'Build strong founding team',
            'Secure early customer commitments',
            'Plan for multiple funding rounds',
            'Focus on sustainable growth'
        ],
        recommendations: [
            'Start with side hustle to validate ideas',
            'Build strong network in startup ecosystem',
            'Focus on solving real customer problems',
            'Be prepared for long-term commitment',
            'Have backup career plan'
        ]
    };
}

function generateInternationalExpansionSimulation(careerPath, userProfile) {
    const internationalMarkets = [
        {
            market: 'United States',
            demand: 'Very High',
            salary: '₹66L - ₹1.2Cr (approx)',
            visaComplexity: 'High',
            successProbability: 0.30,
            requirements: ['H1B Visa', 'Strong Technical Skills', 'US Experience'],
            timeline: '2-3 years',
            investment: '₹10-20 Lakhs'
        },
        {
            market: 'United Kingdom',
            demand: 'High',
            salary: '£45,000 - £85,000',
            visaComplexity: 'Medium',
            successProbability: '0.45',
            requirements: ['Skilled Worker Visa', 'English Proficiency', 'Relevant Experience'],
            timeline: '1-2 years',
            investment: '₹5-10 Lakhs'
        },
        {
            market: 'Canada',
            demand: 'High',
            salary: 'CAD 70,000 - 120,000',
            visaComplexity: 'Medium',
            successProbability: 0.50,
            requirements: ['Express Entry', 'Language Skills', 'Education Assessment'],
            timeline: '1-2 years',
            investment: '₹8-15 Lakhs'
        },
        {
            market: 'Australia',
            demand: 'High',
            salary: 'AUD 80,000 - 130,000',
            visaComplexity: 'Medium',
            successProbability: 0.45,
            requirements: ['Skilled Independent Visa', 'English Proficiency', 'Skills Assessment'],
            timeline: '1-2 years',
            investment: '₹8-15 Lakhs'
        },
        {
            market: 'Singapore',
            demand: 'Medium',
            salary: 'SGD 60,000 - 100,000',
            visaComplexity: 'Low',
            successProbability: 0.60,
            requirements: ['Employment Pass', 'Technical Skills', 'Company Sponsorship'],
            timeline: '6-12 months',
            investment: '₹3-8 Lakhs'
        }
    ];

    return {
        type: 'international_expansion',
        careerPath,
        userProfile,
        internationalMarkets,
        overallSuccessProbability: 0.46,
        keyFactors: [
            'Strong technical skills and experience',
            'Language proficiency (English)',
            'Cultural adaptability',
            'Financial preparation',
            'Network and connections'
        ],
        preparationTimeline: [
            '6-12 months: Skill development and certification',
            '6-12 months: Language preparation and testing',
            '3-6 months: Documentation and visa preparation',
            '3-6 months: Job search and networking',
            '1-3 months: Relocation and settlement'
        ],
        recommendations: [
            'Focus on in-demand technical skills',
            'Improve English communication skills',
            'Build international professional network',
            'Save for relocation and initial expenses',
            'Research target markets thoroughly'
        ]
    };
}

async function generateCareerScenarios(careerId, timeframe, userProfile) {
    // Generate different career scenarios based on timeframe
    const scenarios = [];
    
    if (timeframe === '1year') {
        scenarios.push({
            scenario: 'Fast Track',
            probability: 0.20,
            description: 'Rapid advancement with high performance',
            outcomes: ['Promotion within 12 months', 'Salary increase 25-30%', 'Leadership opportunities'],
            requirements: ['Exceptional performance', 'Skill development', 'Strong networking']
        });
        
        scenarios.push({
            scenario: 'Steady Growth',
            probability: 0.60,
            description: 'Consistent progress with moderate advancement',
            outcomes: ['Skill improvement', 'Salary increase 15-20%', 'Project leadership'],
            requirements: ['Consistent performance', 'Continuous learning', 'Team collaboration']
        });
        
        scenarios.push({
            scenario: 'Skill Building',
            probability: 0.20,
            description: 'Focus on skill development and preparation',
            outcomes: ['Enhanced skill set', 'Salary increase 10-15%', 'Better market position'],
            requirements: ['Dedicated learning', 'Practice and application', 'Feedback seeking']
        });
    }
    
    return scenarios;
}

async function predictCareerSuccess(careerPath, targetRole, timeline, userProfile, assessments, userSkills) {
    // Analyze user's current state and predict success probability
    const skillMatch = analyzeSkillMatch(userSkills, targetRole);
    const personalityFit = analyzePersonalityFit(assessments, targetRole);
    const marketDemand = analyzeMarketDemand(targetRole);
    const experienceGap = analyzeExperienceGap(userProfile, targetRole);
    
    const overallProbability = (skillMatch + personalityFit + marketDemand + experienceGap) / 4;
    
    return {
        careerPath,
        targetRole,
        timeline,
        successProbability: overallProbability,
        confidence: 'High',
        breakdown: {
            skillMatch,
            personalityFit,
            marketDemand,
            experienceGap
        },
        recommendations: generateSuccessRecommendations(skillMatch, personalityFit, marketDemand, experienceGap)
    };
}

async function analyzePersonalityCareerMatch(careerId, userProfile, assessments) {
    // Analyze personality traits and career compatibility
    const personalityTraits = extractPersonalityTraits(assessments);
    const careerRequirements = getCareerPersonalityRequirements(careerId);
    
    const compatibilityScore = calculateCompatibilityScore(personalityTraits, careerRequirements);
    
    return {
        compatibilityScore,
        personalityTraits,
        careerRequirements,
        strengths: identifyStrengths(personalityTraits, careerRequirements),
        areasForImprovement: identifyImprovementAreas(personalityTraits, careerRequirements),
        recommendations: generatePersonalityRecommendations(personalityTraits, careerRequirements)
    };
}

// Helper functions for AI Twin analysis
function analyzeSkillMatch(userSkills, targetRole) {
    // Simplified skill matching algorithm
    const requiredSkills = getRequiredSkills(targetRole);
    const matchedSkills = userSkills.filter(skill => requiredSkills.includes(skill.skill_name));
    return Math.min(1.0, matchedSkills.length / requiredSkills.length);
}

function analyzePersonalityFit(assessments, targetRole) {
    // Simplified personality analysis
    return 0.75; // Placeholder - would use actual assessment data
}

function analyzeMarketDemand(targetRole) {
    // Simplified market demand analysis
    const highDemandRoles = ['Software Developer', 'Data Scientist', 'AI/ML Engineer'];
    return highDemandRoles.includes(targetRole) ? 0.9 : 0.7;
}

function analyzeExperienceGap(userProfile, targetRole) {
    // Simplified experience gap analysis
    const requiredExperience = getRequiredExperience(targetRole);
    const userExperience = userProfile?.experience_level || 'entry';
    const experienceLevels = { 'entry': 0, 'mid': 0.5, 'senior': 1.0 };
    return Math.min(1.0, experienceLevels[userExperience] / requiredExperience);
}

function getRequiredSkills(targetRole) {
    // Simplified skill requirements
    const skillMap = {
        'Software Developer': ['Programming', 'Problem Solving', 'Teamwork'],
        'Data Scientist': ['Statistics', 'Programming', 'Data Analysis'],
        'AI/ML Engineer': ['Machine Learning', 'Programming', 'Mathematics']
    };
    return skillMap[targetRole] || ['Communication', 'Problem Solving', 'Teamwork'];
}

function getRequiredExperience(targetRole) {
    // Simplified experience requirements
    const experienceMap = {
        'Software Developer': 0.5,
        'Data Scientist': 0.7,
        'AI/ML Engineer': 0.8
    };
    return experienceMap[targetRole] || 0.5;
}

function generateSuccessRecommendations(skillMatch, personalityFit, marketDemand, experienceGap) {
    const recommendations = [];
    
    if (skillMatch < 0.7) {
        recommendations.push('Focus on developing core technical skills required for the role');
    }
    
    if (personalityFit < 0.7) {
        recommendations.push('Work on improving soft skills and communication abilities');
    }
    
    if (marketDemand < 0.8) {
        recommendations.push('Consider roles with higher market demand or specialize in niche areas');
    }
    
    if (experienceGap < 0.6) {
        recommendations.push('Gain more relevant experience through projects and internships');
    }
    
    return recommendations;
}

function extractPersonalityTraits(assessments) {
    // Simplified personality extraction
    return {
        extroversion: 0.6,
        conscientiousness: 0.8,
        openness: 0.7,
        agreeableness: 0.75,
        neuroticism: 0.3
    };
}

function getCareerPersonalityRequirements(careerId) {
    // Simplified career personality requirements
    return {
        extroversion: 0.5,
        conscientiousness: 0.8,
        openness: 0.7,
        agreeableness: 0.6,
        neuroticism: 0.4
    };
}

function calculateCompatibilityScore(personalityTraits, careerRequirements) {
    // Simplified compatibility calculation
    const traits = Object.keys(personalityTraits);
    let totalScore = 0;
    
    traits.forEach(trait => {
        const difference = Math.abs(personalityTraits[trait] - careerRequirements[trait]);
        totalScore += (1 - difference);
    });
    
    return totalScore / traits.length;
}

function identifyStrengths(personalityTraits, careerRequirements) {
    const strengths = [];
    Object.keys(personalityTraits).forEach(trait => {
        if (personalityTraits[trait] >= careerRequirements[trait]) {
            strengths.push(trait);
        }
    });
    return strengths;
}

function identifyImprovementAreas(personalityTraits, careerRequirements) {
    const areas = [];
    Object.keys(personalityTraits).forEach(trait => {
        if (personalityTraits[trait] < careerRequirements[trait]) {
            areas.push(trait);
        }
    });
    return areas;
}

function generatePersonalityRecommendations(personalityTraits, careerRequirements) {
    const recommendations = [];
    
    if (personalityTraits.extroversion < careerRequirements.extroversion) {
        recommendations.push('Practice networking and public speaking to improve extroversion');
    }
    
    if (personalityTraits.conscientiousness < careerRequirements.conscientiousness) {
        recommendations.push('Develop better organizational and time management skills');
    }
    
    return recommendations;
}

// External API Integration Functions

// Coursera API Integration
async function getCourseraResources() {
    try {
        // Note: In production, you would use actual Coursera API
        // For now, providing curated Coursera courses with real data
        const courseraResources = [
            {
                id: 'coursera-1',
                title: 'Machine Learning by Stanford University',
                category: 'Technology',
                skill_category: 'Machine Learning',
                provider: 'Coursera (Stanford)',
                type: 'Online Course',
                difficulty_level: 'Intermediate',
                duration: '11 weeks',
                cost: 'Free (Audit) / ₹6.6k/month (Certificate)',
                rating: 4.9,
                description: 'Learn Machine Learning from Andrew Ng. This course provides a broad introduction to machine learning, datamining, and statistical pattern recognition.',
                url: 'https://www.coursera.org/learn/machine-learning',
                prerequisites: ['Basic mathematics', 'Programming fundamentals'],
                outcomes: ['Understand ML algorithms', 'Implement ML models', 'Apply ML to real problems'],
                career_relevance: ['Data Scientist', 'ML Engineer', 'AI Researcher']
            },
            {
                id: 'coursera-2',
                title: 'Google Data Analytics Professional Certificate',
                category: 'Technology',
                skill_category: 'Data Analysis',
                provider: 'Coursera (Google)',
                type: 'Professional Certificate',
                difficulty_level: 'Beginner',
                duration: '6 months',
                cost: 'Free (7-day trial) / ₹4.1k/month',
                rating: 4.7,
                description: 'Get job-ready for an entry-level role in data analytics. No experience or degree required.',
                url: 'https://www.coursera.org/professional-certificates/google-data-analytics',
                prerequisites: ['None'],
                outcomes: ['Data cleaning and analysis', 'Data visualization', 'R and SQL proficiency'],
                career_relevance: ['Data Analyst', 'Business Analyst', 'Data Scientist']
            },
            {
                id: 'coursera-3',
                title: 'IBM Full Stack Cloud Developer Professional Certificate',
                category: 'Technology',
                skill_category: 'Web Development',
                provider: 'Coursera (IBM)',
                type: 'Professional Certificate',
                difficulty_level: 'Beginner',
                duration: '4 months',
                cost: 'Free (7-day trial) / ₹4.1k/month',
                rating: 4.6,
                description: 'Master cloud native and full stack development. Get hands-on experience with the latest technologies.',
                url: 'https://www.coursera.org/professional-certificates/ibm-full-stack-cloud-developer',
                prerequisites: ['Basic computer skills'],
                outcomes: ['Full-stack development', 'Cloud deployment', 'DevOps practices'],
                career_relevance: ['Full Stack Developer', 'Cloud Developer', 'DevOps Engineer']
            },
            {
                id: 'coursera-4',
                title: 'Digital Marketing by University of Illinois',
                category: 'Marketing',
                skill_category: 'Digital Marketing',
                provider: 'Coursera (UIUC)',
                type: 'Specialization',
                difficulty_level: 'Beginner',
                duration: '8 months',
                cost: 'Free (Audit) / ₹6.6k/month (Certificate)',
                rating: 4.6,
                description: 'Master strategic marketing concepts and tools to address brand communication in a digital world.',
                url: 'https://www.coursera.org/specializations/digital-marketing',
                prerequisites: ['None'],
                outcomes: ['Digital marketing strategy', 'Social media marketing', 'Marketing analytics'],
                career_relevance: ['Digital Marketer', 'Marketing Manager', 'Social Media Manager']
            },
            {
                id: 'coursera-5',
                title: 'UX Design by Google',
                category: 'Creative',
                skill_category: 'UX Design',
                provider: 'Coursera (Google)',
                type: 'Professional Certificate',
                difficulty_level: 'Beginner',
                duration: '6 months',
                cost: 'Free (7-day trial) / ₹4.1k/month',
                rating: 4.8,
                description: 'Start your career in UX design. Learn to design mobile apps and websites from scratch.',
                url: 'https://www.coursera.org/professional-certificates/google-ux-design',
                prerequisites: ['None'],
                outcomes: ['User research', 'Wireframing', 'Prototyping', 'Usability testing'],
                career_relevance: ['UX Designer', 'UI Designer', 'Product Designer']
            },
            {
                id: 'coursera-6',
                title: 'Financial Markets by Yale University',
                category: 'Finance',
                skill_category: 'Finance',
                provider: 'Coursera (Yale)',
                type: 'Online Course',
                difficulty_level: 'Beginner',
                duration: '7 weeks',
                cost: 'Free (Audit) / ₹6.6k/month (Certificate)',
                rating: 4.8,
                description: 'An overview of the ideas, methods, and institutions that permit human society to manage risks and foster enterprise.',
                url: 'https://www.coursera.org/learn/financial-markets-global',
                prerequisites: ['Basic mathematics'],
                outcomes: ['Financial market understanding', 'Investment principles', 'Risk management'],
                career_relevance: ['Financial Analyst', 'Investment Banker', 'Portfolio Manager']
            },
            {
                id: 'coursera-7',
                title: 'Python for Everybody by University of Michigan',
                category: 'Technology',
                skill_category: 'Programming',
                provider: 'Coursera (UMich)',
                type: 'Specialization',
                difficulty_level: 'Beginner',
                duration: '8 months',
                cost: 'Free (Audit) / ₹6.6k/month (Certificate)',
                rating: 4.8,
                description: 'Learn to Program and Analyze Data with Python. Develop programs to gather, clean, analyze, and visualize data.',
                url: 'https://www.coursera.org/specializations/python',
                prerequisites: ['None'],
                outcomes: ['Python programming', 'Data structures', 'Web scraping', 'Database design'],
                career_relevance: ['Software Developer', 'Data Scientist', 'Python Developer']
            },
            {
                id: 'coursera-8',
                title: 'Project Management by Google',
                category: 'Business',
                skill_category: 'Project Management',
                provider: 'Coursera (Google)',
                type: 'Professional Certificate',
                difficulty_level: 'Beginner',
                duration: '6 months',
                cost: 'Free (7-day trial) / ₹4.1k/month',
                rating: 4.7,
                description: 'Launch your career in project management. Build job-ready skills for an in-demand career.',
                url: 'https://www.coursera.org/professional-certificates/google-project-management',
                prerequisites: ['None'],
                outcomes: ['Project planning', 'Risk management', 'Agile methodology', 'Leadership skills'],
                career_relevance: ['Project Manager', 'Product Manager', 'Operations Manager']
            }
        ];
        
        return courseraResources;
    } catch (error) {
        console.error('Error fetching Coursera resources:', error);
        return [];
    }
}

// YouTube Free Courses Integration
async function getYouTubeResources() {
    try {
        // Curated free YouTube courses with high quality content
        const youtubeResources = [
            {
                id: 'youtube-1',
                title: 'Complete Web Development Course - freeCodeCamp',
                category: 'Technology',
                skill_category: 'Web Development',
                provider: 'YouTube (freeCodeCamp)',
                type: 'Free Course',
                difficulty_level: 'Beginner',
                duration: '12 hours',
                cost: 'Free',
                rating: 4.8,
                description: 'Learn HTML, CSS, JavaScript and build real projects. Complete beginner to advanced web development.',
                url: 'https://www.youtube.com/watch?v=mU6anWqZJcc',
                prerequisites: ['None'],
                outcomes: ['HTML/CSS mastery', 'JavaScript proficiency', 'Responsive design', 'Real projects'],
                career_relevance: ['Web Developer', 'Frontend Developer', 'Full Stack Developer']
            },
            {
                id: 'youtube-2',
                title: 'Python Full Course - Programming with Mosh',
                category: 'Technology',
                skill_category: 'Programming',
                provider: 'YouTube (Programming with Mosh)',
                type: 'Free Course',
                difficulty_level: 'Beginner',
                duration: '6.5 hours',
                cost: 'Free',
                rating: 4.9,
                description: 'Complete Python tutorial for beginners. Learn Python programming from scratch with practical examples.',
                url: 'https://www.youtube.com/watch?v=_uQrJ0TkZlc',
                prerequisites: ['None'],
                outcomes: ['Python fundamentals', 'Object-oriented programming', 'File handling', 'Error handling'],
                career_relevance: ['Python Developer', 'Data Scientist', 'Backend Developer']
            },
            {
                id: 'youtube-3',
                title: 'React Course for Beginners - freeCodeCamp',
                category: 'Technology',
                skill_category: 'Frontend Development',
                provider: 'YouTube (freeCodeCamp)',
                type: 'Free Course',
                difficulty_level: 'Intermediate',
                duration: '11 hours',
                cost: 'Free',
                rating: 4.8,
                description: 'Learn React from scratch. Build modern web applications with the most popular JavaScript library.',
                url: 'https://www.youtube.com/watch?v=DLX62G4lc44',
                prerequisites: ['JavaScript basics', 'HTML/CSS'],
                outcomes: ['React components', 'State management', 'Props and hooks', 'React router'],
                career_relevance: ['Frontend Developer', 'React Developer', 'Full Stack Developer']
            },
            {
                id: 'youtube-4',
                title: 'Data Science Full Course - Simplilearn',
                category: 'Technology',
                skill_category: 'Data Science',
                provider: 'YouTube (Simplilearn)',
                type: 'Free Course',
                difficulty_level: 'Beginner',
                duration: '10 hours',
                cost: 'Free',
                rating: 4.6,
                description: 'Complete data science tutorial covering Python, statistics, machine learning, and data visualization.',
                url: 'https://www.youtube.com/watch?v=ua-CiDNNj30',
                prerequisites: ['Basic mathematics'],
                outcomes: ['Data analysis', 'Python for data science', 'Machine learning basics', 'Data visualization'],
                career_relevance: ['Data Scientist', 'Data Analyst', 'ML Engineer']
            },
            {
                id: 'youtube-5',
                title: 'Digital Marketing Full Course - Simplilearn',
                category: 'Marketing',
                skill_category: 'Digital Marketing',
                provider: 'YouTube (Simplilearn)',
                type: 'Free Course',
                difficulty_level: 'Beginner',
                duration: '8 hours',
                cost: 'Free',
                rating: 4.5,
                description: 'Complete digital marketing course covering SEO, SEM, social media, email marketing, and analytics.',
                url: 'https://www.youtube.com/watch?v=bixR-KIJKYM',
                prerequisites: ['None'],
                outcomes: ['SEO fundamentals', 'Social media marketing', 'Google Ads', 'Email marketing', 'Analytics'],
                career_relevance: ['Digital Marketer', 'SEO Specialist', 'Social Media Manager']
            },
            {
                id: 'youtube-6',
                title: 'UI/UX Design Full Course - DesignCourse',
                category: 'Creative',
                skill_category: 'UI/UX Design',
                provider: 'YouTube (DesignCourse)',
                type: 'Free Course',
                difficulty_level: 'Beginner',
                duration: '5 hours',
                cost: 'Free',
                rating: 4.7,
                description: 'Learn UI/UX design principles, wireframing, prototyping, and design tools like Figma.',
                url: 'https://www.youtube.com/watch?v=c9Wg6Cb_YlU',
                prerequisites: ['None'],
                outcomes: ['Design principles', 'User research', 'Wireframing', 'Prototyping', 'Figma proficiency'],
                career_relevance: ['UI Designer', 'UX Designer', 'Product Designer']
            },
            {
                id: 'youtube-7',
                title: 'Excel Full Course - ExcelIsFun',
                category: 'Business',
                skill_category: 'Data Analysis',
                provider: 'YouTube (ExcelIsFun)',
                type: 'Free Course',
                difficulty_level: 'Beginner',
                duration: '7 hours',
                cost: 'Free',
                rating: 4.6,
                description: 'Master Microsoft Excel from basics to advanced features including formulas, pivot tables, and data analysis.',
                url: 'https://www.youtube.com/watch?v=rwbho0CgEAE',
                prerequisites: ['Basic computer skills'],
                outcomes: ['Excel formulas', 'Pivot tables', 'Data visualization', 'Advanced functions'],
                career_relevance: ['Business Analyst', 'Data Analyst', 'Financial Analyst']
            },
            {
                id: 'youtube-8',
                title: 'Node.js Full Course - freeCodeCamp',
                category: 'Technology',
                skill_category: 'Backend Development',
                provider: 'YouTube (freeCodeCamp)',
                type: 'Free Course',
                difficulty_level: 'Intermediate',
                duration: '8 hours',
                cost: 'Free',
                rating: 4.7,
                description: 'Learn Node.js and Express.js to build backend applications and APIs.',
                url: 'https://www.youtube.com/watch?v=TlB_eWDSMt4',
                prerequisites: ['JavaScript fundamentals'],
                outcomes: ['Node.js fundamentals', 'Express.js', 'API development', 'Database integration'],
                career_relevance: ['Backend Developer', 'Full Stack Developer', 'API Developer']
            },
            {
                id: 'youtube-9',
                title: 'Cybersecurity Full Course - freeCodeCamp',
                category: 'Technology',
                skill_category: 'Cybersecurity',
                provider: 'YouTube (freeCodeCamp)',
                type: 'Free Course',
                difficulty_level: 'Beginner',
                duration: '15 hours',
                cost: 'Free',
                rating: 4.6,
                description: 'Complete cybersecurity course covering network security, ethical hacking, and security fundamentals.',
                url: 'https://www.youtube.com/watch?v=U_P23SqJaDc',
                prerequisites: ['Basic networking knowledge'],
                outcomes: ['Security fundamentals', 'Network security', 'Ethical hacking', 'Risk assessment'],
                career_relevance: ['Cybersecurity Analyst', 'Security Engineer', 'Ethical Hacker']
            },
            {
                id: 'youtube-10',
                title: 'Graphic Design Full Course - Yes I am a Designer',
                category: 'Creative',
                skill_category: 'Graphic Design',
                provider: 'YouTube (Yes I am a Designer)',
                type: 'Free Course',
                difficulty_level: 'Beginner',
                duration: '4 hours',
                cost: 'Free',
                rating: 4.5,
                description: 'Learn graphic design principles, color theory, typography, and Adobe Photoshop basics.',
                url: 'https://www.youtube.com/watch?v=WONZVnlam6U',
                prerequisites: ['None'],
                outcomes: ['Design principles', 'Color theory', 'Typography', 'Adobe Photoshop basics'],
                career_relevance: ['Graphic Designer', 'Visual Designer', 'Creative Director']
            },
            {
                id: 'youtube-11',
                title: 'Financial Analysis Course - Corporate Finance Institute',
                category: 'Finance',
                skill_category: 'Financial Analysis',
                provider: 'YouTube (CFI)',
                type: 'Free Course',
                difficulty_level: 'Intermediate',
                duration: '6 hours',
                cost: 'Free',
                rating: 4.7,
                description: 'Learn financial modeling, valuation, and analysis techniques used by investment professionals.',
                url: 'https://www.youtube.com/watch?v=WEDIj9JBTC8',
                prerequisites: ['Basic finance knowledge', 'Excel basics'],
                outcomes: ['Financial modeling', 'Valuation methods', 'Investment analysis', 'Financial statements'],
                career_relevance: ['Financial Analyst', 'Investment Banker', 'Corporate Finance']
            },
            {
                id: 'youtube-12',
                title: 'Machine Learning Course - Andrew Ng (YouTube)',
                category: 'Technology',
                skill_category: 'Machine Learning',
                provider: 'YouTube (Stanford)',
                type: 'Free Course',
                difficulty_level: 'Advanced',
                duration: '20 hours',
                cost: 'Free',
                rating: 4.9,
                description: 'Complete machine learning course by Andrew Ng, covering algorithms, neural networks, and practical applications.',
                url: 'https://www.youtube.com/playlist?list=PLLssT5z_DsK-h9vYZkQkYNWcItqhlRJLN',
                prerequisites: ['Linear algebra', 'Calculus', 'Programming'],
                outcomes: ['ML algorithms', 'Neural networks', 'Deep learning', 'Practical ML'],
                career_relevance: ['ML Engineer', 'Data Scientist', 'AI Researcher']
            }
        ];
        
        return youtubeResources;
    } catch (error) {
        console.error('Error fetching YouTube resources:', error);
        return [];
    }
}


