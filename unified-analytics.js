// Unified Analytics System for MindMate
// Unified Analytics System - Replaces complex intelligence-revolution.js + multiple tracking systems
// Simplified, lightweight, and focused on essential user insights

class UnifiedAnalytics {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.events = [];
        this.userInteractions = {
            clicks: 0,
            timeOnPage: 0,
            sectionsVisited: new Set(),
            quizProgress: 0,
            assessmentCompleted: false
        };
        this.startTime = Date.now();
        this.isEnabled = true; // Can be toggled based on user consent
        this.initialize();
    }

    initialize() {
        if (!this.isEnabled) return;
        
        // Only track essential interactions
        this.trackPageViews();
        this.trackClicks();
        this.trackQuizProgress();
        this.trackTimeSpent();
        
        // Send data periodically (every 30 seconds)
        setInterval(() => this.sendAnalytics(), 30000);
    }

    // Generate unique session ID
    generateSessionId() {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    // Track page/section views
    trackPageViews() {
        window.addEventListener('popstate', () => {
            this.trackEvent('page_view', { 
                section: this.getCurrentSection(),
                timestamp: Date.now()
            });
        });
    }

    // Track essential clicks only
    trackClicks() {
        document.addEventListener('click', (e) => {
            const element = e.target.closest('[data-action]');
            if (element) {
                const action = element.getAttribute('data-action');
                this.trackEvent('user_action', {
                    action: action,
                    element: this.getElementInfo(element),
                    timestamp: Date.now()
                });
                this.userInteractions.clicks++;
            }
        });
    }

    // Track quiz progress specifically
    trackQuizProgress() {
        window.addEventListener('quiz_progress', (e) => {
            this.userInteractions.quizProgress = e.detail.progress;
            this.trackEvent('quiz_progress', {
                progress: e.detail.progress,
                currentQuestion: e.detail.currentQuestion,
                totalQuestions: e.detail.totalQuestions
            });
        });

        window.addEventListener('quiz_completed', (e) => {
            this.userInteractions.assessmentCompleted = true;
            this.trackEvent('assessment_completed', {
                answers: e.detail.answers,
                careerScores: e.detail.careerScores,
                completionTime: Date.now() - this.startTime
            });
        });
    }

    // Track time spent on site
    trackTimeSpent() {
        setInterval(() => {
            this.userInteractions.timeOnPage = Date.now() - this.startTime;
        }, 1000);
    }

    // Main event tracking function
    trackEvent(eventName, data = {}) {
        if (!this.isEnabled) return;

        const event = {
            sessionId: this.sessionId,
            eventName: eventName,
            data: data,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        this.events.push(event);
        
        // Keep only last 50 events to prevent memory issues
        if (this.events.length > 50) {
            this.events = this.events.slice(-50);
        }

        // Log for debugging (can be removed in production)
        console.debug('[Analytics]', eventName, data);
    }

    // Get current section from URL or active element
    getCurrentSection() {
        // Check URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const section = urlParams.get('section');
        if (section) return section;

        // Check active section in DOM
        const activeSection = document.querySelector('section.active');
        return activeSection ? activeSection.id : 'hero';
    }

    // Get essential element information
    getElementInfo(element) {
        return {
            tag: element.tagName.toLowerCase(),
            id: element.id || null,
            className: element.className || null,
            text: element.textContent.substring(0, 50) || null
        };
    }

    // Send analytics to server
    async sendAnalytics() {
        if (!this.isEnabled || this.events.length === 0) return;

        try {
            const analyticsData = {
                sessionId: this.sessionId,
                events: [...this.events],
                userInteractions: { ...this.userInteractions },
                totalTimeSpent: Date.now() - this.startTime
            };

            // Send to backend
            await fetch('/api/analytics/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(analyticsData)
            });

            // Clear sent events
            this.events = [];

        } catch (error) {
            console.warn('Analytics send failed:', error);
        }
    }

    // Get user insights for dashboard
    getUserInsights() {
        const timeSpent = Date.now() - this.startTime;
        const sections = Array.from(this.userInteractions.sectionsVisited);
        
        return {
            engagement: {
                timeSpent: Math.round(timeSpent / 1000), // seconds
                clickCount: this.userInteractions.clicks,
                sectionsExplored: sections.length,
                assessmentProgress: this.userInteractions.quizProgress
            },
            progress: {
                hasStartedAssessment: this.userInteractions.quizProgress > 0,
                hasCompletedAssessment: this.userInteractions.assessmentCompleted,
                mostVisitedSections: sections
            },
            session: {
                sessionId: this.sessionId,
                startTime: this.startTime,
                isActive: true
            }
        };
    }

    // Simple career preference tracking (replaces complex neural analysis)
    trackCareerInterest(careerType, engagementLevel = 1) {
        this.trackEvent('career_interest', {
            careerType: careerType,
            engagementLevel: engagementLevel, // 1-5 scale
            context: this.getCurrentSection()
        });
    }

    // Track learning activity (for gamification)
    trackLearningActivity(activityType, resourceId = null) {
        this.trackEvent('learning_activity', {
            activityType: activityType, // 'course_started', 'course_completed', 'resource_viewed'
            resourceId: resourceId,
            context: this.getCurrentSection()
        });
    }

    // Enable/disable tracking (GDPR compliance)
    setTrackingEnabled(enabled) {
        this.isEnabled = enabled;
        if (!enabled) {
            this.events = [];
        }
    }

    // Get simple analytics summary for UI display
    getAnalyticsSummary() {
        const insights = this.getUserInsights();
        
        return {
            totalTimeSpent: insights.engagement.timeSpent,
            engagementScore: Math.min(5, Math.floor(insights.engagement.clickCount / 10)),
            explorationLevel: insights.engagement.sectionsExplored,
            assessmentStatus: insights.progress.hasCompletedAssessment ? 'completed' : 
                             insights.progress.hasStartedAssessment ? 'in_progress' : 'not_started',
            careerReadiness: this.calculateCareerReadiness(insights)
        };
    }

    // Simple career readiness calculation (replaces complex neural predictions)
    calculateCareerReadiness(insights) {
        let score = 0;
        
        // Time spent factor (max 2 points)
        score += Math.min(2, insights.engagement.timeSpent / 300); // 5 minutes = 2 points
        
        // Exploration factor (max 2 points)  
        score += Math.min(2, insights.engagement.sectionsExplored / 4); // 4 sections = 2 points
        
        // Assessment completion (max 3 points)
        if (insights.progress.hasCompletedAssessment) score += 3;
        else if (insights.progress.hasStartedAssessment) score += 1;
        
        // Engagement factor (max 3 points)
        score += Math.min(3, insights.engagement.clickCount / 20); // 20 clicks = 3 points
        
        return Math.min(10, Math.round(score)); // 0-10 scale
    }
}

// Initialize unified analytics (replaces multiple tracking systems)
let unifiedAnalytics = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    unifiedAnalytics = new UnifiedAnalytics();
    
    // Make available globally for other scripts
    window.MindMateAnalytics = unifiedAnalytics;
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedAnalytics;
}