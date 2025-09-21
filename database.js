import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const dbPath = path.join(__dirname, 'mindmate.db');
const JWT_SECRET = process.env.JWT_SECRET || 'mindmate-secret-key';

class Database {
    constructor() {
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
            } else {
                console.log('Connected to SQLite database');
                this.initializeTables();
            }
        });
    }

    async testConnection() {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT COUNT(*) as count FROM users', (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ userCount: result.count, status: 'connected' });
                }
            });
        });
    }

    initializeTables() {
        // Users table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE,
                username TEXT UNIQUE,
                password_hash TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                profile_data TEXT,
                preferences TEXT
            )
        `);

        // Assessment results table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS assessment_results (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                quiz_answers TEXT,
                career_scores TEXT,
                top_careers TEXT,
                completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // Career profiles table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS career_profiles (
                id TEXT PRIMARY KEY,
                name TEXT,
                category TEXT,
                description TEXT,
                skills_required TEXT,
                salary_range TEXT,
                growth_outlook TEXT,
                education_requirements TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // User sessions table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                session_data TEXT,
                expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // Chat history table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS chat_history (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                message TEXT,
                sender TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // Learning resources table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS learning_resources (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                skill_category TEXT NOT NULL,
                provider TEXT NOT NULL,
                type TEXT NOT NULL,
                difficulty_level TEXT NOT NULL,
                duration TEXT NOT NULL,
                cost TEXT NOT NULL,
                rating REAL DEFAULT 0.0,
                description TEXT NOT NULL,
                url TEXT NOT NULL,
                prerequisites TEXT,
                outcomes TEXT NOT NULL,
                career_relevance TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Learning paths table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS learning_paths (
                id TEXT PRIMARY KEY,
                career_title TEXT NOT NULL,
                path_name TEXT NOT NULL,
                level TEXT NOT NULL,
                description TEXT NOT NULL,
                duration TEXT NOT NULL,
                steps TEXT NOT NULL,
                resources TEXT NOT NULL,
                milestones TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // User learning progress table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS user_learning_progress (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                resource_id TEXT NOT NULL,
                status TEXT DEFAULT 'not_started',
                progress_percentage INTEGER DEFAULT 0,
                started_at DATETIME,
                completed_at DATETIME,
                notes TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (resource_id) REFERENCES learning_resources (id)
            )
        `);

        // Community forums table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS forum_categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                icon TEXT,
                color TEXT,
                sort_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS forum_posts (
                id TEXT PRIMARY KEY,
                category_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                tags TEXT,
                likes_count INTEGER DEFAULT 0,
                replies_count INTEGER DEFAULT 0,
                views_count INTEGER DEFAULT 0,
                is_pinned BOOLEAN DEFAULT FALSE,
                is_solved BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES forum_categories (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS forum_replies (
                id TEXT PRIMARY KEY,
                post_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                content TEXT NOT NULL,
                likes_count INTEGER DEFAULT 0,
                is_solution BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES forum_posts (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // Networking and connections table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS user_connections (
                id TEXT PRIMARY KEY,
                requester_id TEXT NOT NULL,
                addressee_id TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                connection_type TEXT DEFAULT 'peer',
                message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                accepted_at DATETIME,
                FOREIGN KEY (requester_id) REFERENCES users (id),
                FOREIGN KEY (addressee_id) REFERENCES users (id)
            )
        `);

        // Mentorship table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS mentorship_profiles (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                profile_type TEXT NOT NULL,
                career_field TEXT,
                experience_level TEXT,
                skills_offered TEXT,
                skills_wanted TEXT,
                availability TEXT,
                bio TEXT,
                linkedin_url TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS mentorship_matches (
                id TEXT PRIMARY KEY,
                mentor_id TEXT NOT NULL,
                mentee_id TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                match_score REAL DEFAULT 0.0,
                message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                accepted_at DATETIME,
                FOREIGN KEY (mentor_id) REFERENCES users (id),
                FOREIGN KEY (mentee_id) REFERENCES users (id)
            )
        `);

        // Gamification system tables
        this.db.run(`
            CREATE TABLE IF NOT EXISTS user_gamification (
                id TEXT PRIMARY KEY,
                user_id TEXT UNIQUE NOT NULL,
                total_xp INTEGER DEFAULT 0,
                current_level INTEGER DEFAULT 1,
                current_streak INTEGER DEFAULT 0,
                longest_streak INTEGER DEFAULT 0,
                last_activity_date DATE,
                badges_earned TEXT DEFAULT '[]',
                achievements_unlocked TEXT DEFAULT '[]',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS achievement_definitions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                category TEXT NOT NULL,
                icon TEXT NOT NULL,
                xp_reward INTEGER NOT NULL,
                unlock_condition TEXT NOT NULL,
                rarity TEXT DEFAULT 'common',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS user_achievements (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                achievement_id TEXT NOT NULL,
                earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (achievement_id) REFERENCES achievement_definitions (id)
            )
        `);

        // Skill Prerequisites and Dependencies
        this.db.run(`
            CREATE TABLE IF NOT EXISTS skill_definitions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                difficulty_level INTEGER DEFAULT 1,
                estimated_hours INTEGER DEFAULT 0,
                icon TEXT DEFAULT '🎯',
                color TEXT DEFAULT '#3498db',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS skill_prerequisites (
                id TEXT PRIMARY KEY,
                skill_id TEXT NOT NULL,
                prerequisite_skill_id TEXT NOT NULL,
                prerequisite_level INTEGER DEFAULT 1,
                is_hard_requirement BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (skill_id) REFERENCES skill_definitions (id),
                FOREIGN KEY (prerequisite_skill_id) REFERENCES skill_definitions (id)
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS resource_skill_mapping (
                id TEXT PRIMARY KEY,
                resource_id TEXT NOT NULL,
                skill_id TEXT NOT NULL,
                skill_level_taught INTEGER DEFAULT 1,
                skill_level_required INTEGER DEFAULT 0,
                weight REAL DEFAULT 1.0,
                is_primary_skill BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (resource_id) REFERENCES learning_resources (id),
                FOREIGN KEY (skill_id) REFERENCES skill_definitions (id)
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS user_skill_progress (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                skill_id TEXT NOT NULL,
                current_level INTEGER DEFAULT 0,
                confidence_score REAL DEFAULT 0,
                total_hours_spent INTEGER DEFAULT 0,
                last_practiced_at DATETIME,
                resources_completed TEXT DEFAULT '[]',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (skill_id) REFERENCES skill_definitions (id)
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS learning_dependency_graph (
                id TEXT PRIMARY KEY,
                from_resource_id TEXT NOT NULL,
                to_resource_id TEXT NOT NULL,
                dependency_type TEXT DEFAULT 'prerequisite',
                strength REAL DEFAULT 1.0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (from_resource_id) REFERENCES learning_resources (id),
                FOREIGN KEY (to_resource_id) REFERENCES learning_resources (id)
            )
        `);

        // Dynamic Learning Paths
        this.db.run(`
            CREATE TABLE IF NOT EXISTS learning_paths (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                career_category TEXT NOT NULL,
                difficulty_level TEXT DEFAULT 'beginner',
                estimated_duration INTEGER DEFAULT 0,
                skills_covered TEXT DEFAULT '[]',
                prerequisites TEXT DEFAULT '[]',
                learning_objectives TEXT DEFAULT '[]',
                path_structure TEXT DEFAULT '[]',
                is_adaptive BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS user_learning_paths (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                path_id TEXT NOT NULL,
                status TEXT DEFAULT 'enrolled',
                progress_percentage REAL DEFAULT 0,
                current_module_index INTEGER DEFAULT 0,
                customizations TEXT DEFAULT '{}',
                enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (path_id) REFERENCES learning_paths (id)
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS path_modules (
                id TEXT PRIMARY KEY,
                path_id TEXT NOT NULL,
                module_order INTEGER NOT NULL,
                module_name TEXT NOT NULL,
                module_description TEXT,
                module_type TEXT DEFAULT 'course',
                resource_ids TEXT DEFAULT '[]',
                estimated_hours INTEGER DEFAULT 0,
                prerequisites TEXT DEFAULT '[]',
                learning_outcomes TEXT DEFAULT '[]',
                is_optional BOOLEAN DEFAULT 0,
                FOREIGN KEY (path_id) REFERENCES learning_paths (id)
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS user_path_progress (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                path_id TEXT NOT NULL,
                module_id TEXT NOT NULL,
                status TEXT DEFAULT 'not_started',
                progress_percentage REAL DEFAULT 0,
                time_spent INTEGER DEFAULT 0,
                started_at DATETIME,
                completed_at DATETIME,
                notes TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (path_id) REFERENCES learning_paths (id),
                FOREIGN KEY (module_id) REFERENCES path_modules (id)
            )
        `);

        // User activity and engagement
        this.db.run(`
            CREATE TABLE IF NOT EXISTS user_activities (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                activity_type TEXT NOT NULL,
                target_type TEXT,
                target_id TEXT,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // Forum likes and interactions
        this.db.run(`
            CREATE TABLE IF NOT EXISTS forum_likes (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                target_type TEXT NOT NULL,
                target_id TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // Wait for all tables to be created before populating data
        this.db.serialize(() => {
            // Populate career profiles if empty
            this.populateCareerProfiles();
            
            // Populate learning resources if empty
            this.populateLearningResources();
            
            // Populate community features if empty
            this.populateCommunityFeatures();
            
            // Populate skill definitions and prerequisites
            this.populateSkillDefinitions();
        });
    }

    // User Management
    async createUser(username, email, password) {
        return new Promise((resolve, reject) => {
            console.log('🔍 DEBUG: Creating user in database:', { username, email });
            const userId = uuidv4();
            const passwordHash = bcrypt.hashSync(password, 10);
            
            console.log('🔍 DEBUG: Generated user ID:', userId);
            
            this.db.run(
                'INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)',
                [userId, username, email, passwordHash],
                function(err) {
                    if (err) {
                        console.error('❌ DEBUG: Database error creating user:', err);
                        reject(err);
                    } else {
                        console.log('✅ DEBUG: User created successfully in database');
                        resolve({ id: userId, username, email });
                    }
                }
            );
        });
    }

    async authenticateUser(username, password) {
        return new Promise((resolve, reject) => {
            console.log('🔍 DEBUG: Authenticating user:', username);
            
            this.db.get(
                'SELECT * FROM users WHERE username = ? OR email = ?',
                [username, username],
                (err, user) => {
                    if (err) {
                        console.error('❌ DEBUG: Database error during authentication:', err);
                        reject(err);
                    } else if (!user) {
                        console.log('❌ DEBUG: User not found in database');
                        resolve(null);
                    } else {
                        console.log('🔍 DEBUG: User found, checking password...');
                        const isValid = bcrypt.compareSync(password, user.password_hash);
                        if (isValid) {
                            console.log('✅ DEBUG: Password valid, generating token...');
                            const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
                            resolve({ user: { id: user.id, username: user.username, email: user.email }, token });
                        } else {
                            console.log('❌ DEBUG: Invalid password');
                            resolve(null);
                        }
                    }
                }
            );
        });
    }

    async getUserById(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT id, username, email, profile_data, preferences FROM users WHERE id = ?',
                [userId],
                (err, user) => {
                    if (err) {
                        reject(err);
                    } else {
                        if (user) {
                            user.profile_data = user.profile_data ? JSON.parse(user.profile_data) : {};
                            user.preferences = user.preferences ? JSON.parse(user.preferences) : {};
                        }
                        resolve(user);
                    }
                }
            );
        });
    }

    async updateUserProfile(userId, profileData) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET profile_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [JSON.stringify(profileData), userId],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.changes > 0);
                    }
                }
            );
        });
    }

    // Assessment Management
    async saveAssessmentResult(userId, quizAnswers, careerScores, topCareers) {
        return new Promise((resolve, reject) => {
            const assessmentId = uuidv4();
            
            this.db.run(
                'INSERT INTO assessment_results (id, user_id, quiz_answers, career_scores, top_careers) VALUES (?, ?, ?, ?, ?)',
                [assessmentId, userId, JSON.stringify(quizAnswers), JSON.stringify(careerScores), JSON.stringify(topCareers)],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(assessmentId);
                    }
                }
            );
        });
    }

    async getAssessmentHistory(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM assessment_results WHERE user_id = ? ORDER BY completed_at DESC',
                [userId],
                (err, assessments) => {
                    if (err) {
                        reject(err);
                    } else {
                        assessments.forEach(assessment => {
                            assessment.quiz_answers = JSON.parse(assessment.quiz_answers);
                            assessment.career_scores = JSON.parse(assessment.career_scores);
                            assessment.top_careers = JSON.parse(assessment.top_careers);
                        });
                        resolve(assessments);
                    }
                }
            );
        });
    }

    // Career Profiles Management
    async getAllCareerProfiles() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM career_profiles ORDER BY name',
                [],
                (err, careers) => {
                    if (err) {
                        reject(err);
                    } else {
                        careers.forEach(career => {
                            career.skills_required = career.skills_required ? JSON.parse(career.skills_required) : [];
                            career.salary_range = career.salary_range ? JSON.parse(career.salary_range) : {};
                            career.education_requirements = career.education_requirements ? JSON.parse(career.education_requirements) : [];
                        });
                        resolve(careers);
                    }
                }
            );
        });
    }

    async getCareerProfilesByCategory(category) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM career_profiles WHERE category = ? ORDER BY name',
                [category],
                (err, careers) => {
                    if (err) {
                        reject(err);
                    } else {
                        careers.forEach(career => {
                            career.skills_required = career.skills_required ? JSON.parse(career.skills_required) : [];
                            career.salary_range = career.salary_range ? JSON.parse(career.salary_range) : {};
                            career.education_requirements = career.education_requirements ? JSON.parse(career.education_requirements) : [];
                        });
                        resolve(careers);
                    }
                }
            );
        });
    }

    async getCareerProfileByName(careerName) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM career_profiles WHERE name = ? OR name LIKE ?',
                [careerName, `%${careerName}%`],
                (err, career) => {
                    if (err) {
                        reject(err);
                    } else if (career) {
                        career.skills_required = career.skills_required ? JSON.parse(career.skills_required) : [];
                        career.salary_range = career.salary_range ? JSON.parse(career.salary_range) : {};
                        career.education_requirements = career.education_requirements ? JSON.parse(career.education_requirements) : [];
                        resolve(career);
                    } else {
                        resolve(null);
                    }
                }
            );
        });
    }

    // Chat History Management
    async saveChatMessage(userId, message, sender) {
        return new Promise((resolve, reject) => {
            const messageId = uuidv4();
            
            this.db.run(
                'INSERT INTO chat_history (id, user_id, message, sender) VALUES (?, ?, ?, ?)',
                [messageId, userId, message, sender],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(messageId);
                    }
                }
            );
        });
    }

    async getChatHistory(userId, limit = 50) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM chat_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
                [userId, limit],
                (err, messages) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(messages.reverse()); // Return in chronological order
                    }
                }
            );
        });
    }

    // Populate initial career profiles
    populateCareerProfiles() {
        this.db.get('SELECT COUNT(*) as count FROM career_profiles', [], (err, result) => {
            if (err || result.count > 0) return;

            const careerProfiles = [
                // Technology Careers
                {
                    id: uuidv4(),
                    name: 'Software Developer',
                    category: 'Technology',
                    description: 'Design, develop, and maintain software applications and systems. Work with programming languages, frameworks, and tools to create solutions for various platforms including web, mobile, and desktop applications.',
                    skills_required: JSON.stringify(['Programming', 'Problem Solving', 'Software Design', 'Testing', 'Version Control', 'Algorithms', 'Database Design']),
                    salary_range: JSON.stringify({ min: 70000, max: 150000, currency: 'USD', median: 95000 }),
                    growth_outlook: 'Excellent - 22% growth expected through 2031',
                    education_requirements: JSON.stringify(['Computer Science Degree', 'Coding Bootcamp', 'Self-taught with Portfolio', 'Software Engineering Degree'])
                },
                {
                    id: uuidv4(),
                    name: 'Data Scientist',
                    category: 'Technology',
                    description: 'Analyze complex data to extract insights and help organizations make data-driven decisions. Use statistical methods, machine learning, and visualization tools to solve business problems.',
                    skills_required: JSON.stringify(['Statistics', 'Python/R', 'Machine Learning', 'Data Visualization', 'SQL', 'Mathematics', 'Business Acumen']),
                    salary_range: JSON.stringify({ min: 90000, max: 180000, currency: 'USD', median: 126000 }),
                    growth_outlook: 'Excellent - 35% growth expected through 2031',
                    education_requirements: JSON.stringify(['Statistics/Math Degree', 'Computer Science Degree', 'Data Science Bootcamp', 'PhD in Quantitative Field'])
                },
                {
                    id: uuidv4(),
                    name: 'Cybersecurity Analyst',
                    category: 'Technology',
                    description: 'Protect organizations from cyber threats by monitoring, detecting, and responding to security incidents. Implement security measures and protocols.',
                    skills_required: JSON.stringify(['Network Security', 'Risk Assessment', 'Incident Response', 'Security Tools', 'Compliance', 'Ethical Hacking']),
                    salary_range: JSON.stringify({ min: 75000, max: 140000, currency: 'USD', median: 102000 }),
                    growth_outlook: 'Excellent - 31% growth expected through 2031',
                    education_requirements: JSON.stringify(['Computer Science Degree', 'Cybersecurity Degree', 'Security Certifications (CISSP, CEH)', 'Information Systems Degree'])
                },
                {
                    id: uuidv4(),
                    name: 'Cloud Architect',
                    category: 'Technology',
                    description: 'Design and oversee cloud computing strategies, including cloud adoption plans, cloud application design, and cloud management and monitoring.',
                    skills_required: JSON.stringify(['Cloud Platforms (AWS, Azure, GCP)', 'System Architecture', 'DevOps', 'Networking', 'Security', 'Cost Optimization']),
                    salary_range: JSON.stringify({ min: 120000, max: 200000, currency: 'USD', median: 149000 }),
                    growth_outlook: 'Excellent - 30% growth expected through 2031',
                    education_requirements: JSON.stringify(['Computer Science Degree', 'Cloud Certifications', 'Systems Engineering Degree', 'Relevant Experience'])
                },
                {
                    id: uuidv4(),
                    name: 'Mobile App Developer',
                    category: 'Technology',
                    description: 'Create applications for mobile devices, working with platforms like iOS and Android to build user-friendly and functional mobile experiences.',
                    skills_required: JSON.stringify(['Swift/Kotlin', 'React Native/Flutter', 'UI/UX Design', 'API Integration', 'App Store Optimization', 'Mobile Security']),
                    salary_range: JSON.stringify({ min: 65000, max: 135000, currency: 'USD', median: 95000 }),
                    growth_outlook: 'Very Good - 25% growth expected through 2031',
                    education_requirements: JSON.stringify(['Computer Science Degree', 'Mobile Development Bootcamp', 'Self-taught with Portfolio', 'Software Engineering Degree'])
                },
                {
                    id: uuidv4(),
                    name: 'DevOps Engineer',
                    category: 'Technology',
                    description: 'Bridge the gap between development and operations teams by automating and streamlining software development and deployment processes.',
                    skills_required: JSON.stringify(['CI/CD', 'Docker/Kubernetes', 'Infrastructure as Code', 'Monitoring', 'Scripting', 'Cloud Platforms']),
                    salary_range: JSON.stringify({ min: 85000, max: 160000, currency: 'USD', median: 115000 }),
                    growth_outlook: 'Excellent - 28% growth expected through 2031',
                    education_requirements: JSON.stringify(['Computer Science Degree', 'Systems Administration Experience', 'DevOps Certifications', 'Engineering Degree'])
                },
                {
                    id: uuidv4(),
                    name: 'AI/Machine Learning Engineer',
                    category: 'Technology',
                    description: 'Develop and implement artificial intelligence and machine learning systems to solve complex problems and automate processes.',
                    skills_required: JSON.stringify(['Python/R', 'Deep Learning', 'Neural Networks', 'TensorFlow/PyTorch', 'Mathematics', 'Model Deployment']),
                    salary_range: JSON.stringify({ min: 100000, max: 190000, currency: 'USD', median: 130000 }),
                    growth_outlook: 'Excellent - 40+ growth expected through 2031',
                    education_requirements: JSON.stringify(['Computer Science Degree', 'Mathematics/Statistics Degree', 'AI/ML Specialization', 'PhD preferred for research roles'])
                },

                // Design Careers
                {
                    id: uuidv4(),
                    name: 'UX Designer',
                    category: 'Design',
                    description: 'Create user-friendly and visually appealing digital experiences. Research user needs and design interfaces that are intuitive and accessible.',
                    skills_required: JSON.stringify(['User Research', 'Prototyping', 'Design Tools (Figma, Adobe)', 'Psychology', 'Visual Design', 'Usability Testing']),
                    salary_range: JSON.stringify({ min: 65000, max: 130000, currency: 'USD', median: 85000 }),
                    growth_outlook: 'Very Good - 13% growth expected through 2031',
                    education_requirements: JSON.stringify(['Design Degree', 'Psychology Degree', 'UX Bootcamp', 'Portfolio-based Entry'])
                },
                {
                    id: uuidv4(),
                    name: 'Graphic Designer',
                    category: 'Design',
                    description: 'Create visual concepts and designs for print and digital media, including branding, marketing materials, and user interfaces.',
                    skills_required: JSON.stringify(['Adobe Creative Suite', 'Typography', 'Branding', 'Layout Design', 'Color Theory', 'Print Production']),
                    salary_range: JSON.stringify({ min: 40000, max: 80000, currency: 'USD', median: 50000 }),
                    growth_outlook: 'Stable - 3% growth expected through 2031',
                    education_requirements: JSON.stringify(['Graphic Design Degree', 'Art Degree', 'Design Portfolio', 'Self-taught with Strong Portfolio'])
                },
                {
                    id: uuidv4(),
                    name: 'Product Designer',
                    category: 'Design',
                    description: 'Design physical or digital products from concept to completion, considering user needs, functionality, and aesthetics.',
                    skills_required: JSON.stringify(['Design Thinking', 'Prototyping', 'User Research', 'CAD Software', 'Material Knowledge', 'Market Research']),
                    salary_range: JSON.stringify({ min: 70000, max: 140000, currency: 'USD', median: 95000 }),
                    growth_outlook: 'Good - 8% growth expected through 2031',
                    education_requirements: JSON.stringify(['Industrial Design Degree', 'Product Design Degree', 'Engineering Degree', 'Design Portfolio'])
                },

                // Healthcare Careers
                {
                    id: uuidv4(),
                    name: 'Registered Nurse',
                    category: 'Healthcare',
                    description: 'Provide direct patient care, educate patients about health conditions, and coordinate with healthcare teams to ensure optimal patient outcomes.',
                    skills_required: JSON.stringify(['Clinical Skills', 'Patient Care', 'Medical Knowledge', 'Communication', 'Critical Thinking', 'Empathy']),
                    salary_range: JSON.stringify({ min: 60000, max: 90000, currency: 'USD', median: 75000 }),
                    growth_outlook: 'Excellent - 9% growth expected through 2031',
                    education_requirements: JSON.stringify(['Nursing Degree (BSN preferred)', 'RN License', 'Clinical Training', 'Continuing Education'])
                },
                {
                    id: uuidv4(),
                    name: 'Physical Therapist',
                    category: 'Healthcare',
                    description: 'Help patients recover from injuries and improve their movement and manage pain through therapeutic exercises and treatments.',
                    skills_required: JSON.stringify(['Anatomy Knowledge', 'Therapeutic Techniques', 'Patient Assessment', 'Exercise Prescription', 'Communication', 'Manual Therapy']),
                    salary_range: JSON.stringify({ min: 75000, max: 105000, currency: 'USD', median: 89000 }),
                    growth_outlook: 'Excellent - 21% growth expected through 2031',
                    education_requirements: JSON.stringify(['Doctor of Physical Therapy (DPT)', 'State License', 'Clinical Internships', 'Continuing Education'])
                },
                {
                    id: uuidv4(),
                    name: 'Medical Laboratory Technician',
                    category: 'Healthcare',
                    description: 'Perform laboratory tests and procedures to help diagnose diseases and monitor patient health.',
                    skills_required: JSON.stringify(['Laboratory Techniques', 'Medical Equipment', 'Attention to Detail', 'Quality Control', 'Data Analysis', 'Safety Protocols']),
                    salary_range: JSON.stringify({ min: 40000, max: 65000, currency: 'USD', median: 54000 }),
                    growth_outlook: 'Good - 11% growth expected through 2031',
                    education_requirements: JSON.stringify(['Associate Degree in Medical Technology', 'Certification', 'Clinical Training', 'Laboratory Experience'])
                },

                // Business & Finance Careers
                {
                    id: uuidv4(),
                    name: 'Financial Analyst',
                    category: 'Finance',
                    description: 'Evaluate investment opportunities, analyze financial data, and provide recommendations to guide business and investment decisions.',
                    skills_required: JSON.stringify(['Financial Modeling', 'Excel', 'Data Analysis', 'Market Research', 'Presentation Skills', 'Risk Assessment']),
                    salary_range: JSON.stringify({ min: 60000, max: 120000, currency: 'USD', median: 81000 }),
                    growth_outlook: 'Good - 6% growth expected through 2031',
                    education_requirements: JSON.stringify(['Finance Degree', 'Business Degree', 'Economics Degree', 'CFA Certification (preferred)'])
                },
                {
                    id: uuidv4(),
                    name: 'Digital Marketing Manager',
                    category: 'Marketing',
                    description: 'Develop and execute digital marketing strategies across various online channels. Analyze performance metrics and optimize campaigns for better ROI.',
                    skills_required: JSON.stringify(['SEO/SEM', 'Social Media', 'Analytics', 'Content Strategy', 'Email Marketing', 'PPC Advertising']),
                    salary_range: JSON.stringify({ min: 55000, max: 120000, currency: 'USD', median: 75000 }),
                    growth_outlook: 'Very Good - 10% growth expected through 2031',
                    education_requirements: JSON.stringify(['Marketing Degree', 'Business Degree', 'Digital Marketing Certification', 'Communications Degree'])
                },
                {
                    id: uuidv4(),
                    name: 'Project Manager',
                    category: 'Business',
                    description: 'Plan, execute, and oversee projects from initiation to completion, ensuring they meet objectives, timelines, and budget constraints.',
                    skills_required: JSON.stringify(['Project Management', 'Leadership', 'Communication', 'Risk Management', 'Budgeting', 'Agile/Scrum']),
                    salary_range: JSON.stringify({ min: 70000, max: 130000, currency: 'USD', median: 95000 }),
                    growth_outlook: 'Good - 8% growth expected through 2031',
                    education_requirements: JSON.stringify(['Business Degree', 'PMP Certification', 'Relevant Field Degree', 'Project Management Experience'])
                },
                {
                    id: uuidv4(),
                    name: 'Data Analyst',
                    category: 'Business',
                    description: 'Collect, process, and analyze data to help organizations make informed business decisions and identify trends and patterns.',
                    skills_required: JSON.stringify(['SQL', 'Excel', 'Data Visualization', 'Statistics', 'Business Intelligence', 'Critical Thinking']),
                    salary_range: JSON.stringify({ min: 50000, max: 95000, currency: 'USD', median: 65000 }),
                    growth_outlook: 'Excellent - 25% growth expected through 2031',
                    education_requirements: JSON.stringify(['Business Degree', 'Statistics Degree', 'Data Analytics Certificate', 'Mathematics Degree'])
                },

                // Education Careers
                {
                    id: uuidv4(),
                    name: 'Elementary Teacher',
                    category: 'Education',
                    description: 'Educate young children in basic academic skills including reading, writing, and mathematics, while fostering social and emotional development.',
                    skills_required: JSON.stringify(['Curriculum Development', 'Classroom Management', 'Child Psychology', 'Communication', 'Patience', 'Creativity']),
                    salary_range: JSON.stringify({ min: 40000, max: 70000, currency: 'USD', median: 55000 }),
                    growth_outlook: 'Good - 8% growth expected through 2031',
                    education_requirements: JSON.stringify(['Education Degree', 'Teaching License', 'Student Teaching', 'Subject Matter Certification'])
                },
                {
                    id: uuidv4(),
                    name: 'Corporate Trainer',
                    category: 'Education',
                    description: 'Design and deliver training programs to help employees develop skills and knowledge necessary for their roles and career advancement.',
                    skills_required: JSON.stringify(['Instructional Design', 'Public Speaking', 'Adult Learning Theory', 'Training Development', 'Assessment', 'Technology Skills']),
                    salary_range: JSON.stringify({ min: 50000, max: 95000, currency: 'USD', median: 65000 }),
                    growth_outlook: 'Good - 11% growth expected through 2031',
                    education_requirements: JSON.stringify(['Education Degree', 'Training Certification', 'Subject Matter Expertise', 'Human Resources Degree'])
                },

                // Creative Careers
                {
                    id: uuidv4(),
                    name: 'Content Creator',
                    category: 'Creative',
                    description: 'Develop engaging content for digital platforms including social media, blogs, videos, and podcasts to build audiences and drive engagement.',
                    skills_required: JSON.stringify(['Content Writing', 'Video Editing', 'Social Media', 'SEO', 'Photography', 'Brand Development']),
                    salary_range: JSON.stringify({ min: 35000, max: 100000, currency: 'USD', median: 50000 }),
                    growth_outlook: 'Excellent - 20+ growth expected through 2031',
                    education_requirements: JSON.stringify(['Communications Degree', 'Marketing Degree', 'Self-taught with Portfolio', 'Digital Media Degree'])
                },
                {
                    id: uuidv4(),
                    name: 'Video Game Developer',
                    category: 'Creative',
                    description: 'Design and develop video games for various platforms, working on gameplay mechanics, graphics, sound, and user experience.',
                    skills_required: JSON.stringify(['Game Programming', 'Unity/Unreal Engine', 'Game Design', '3D Modeling', 'Scripting', 'Problem Solving']),
                    salary_range: JSON.stringify({ min: 55000, max: 120000, currency: 'USD', median: 79000 }),
                    growth_outlook: 'Good - 11% growth expected through 2031',
                    education_requirements: JSON.stringify(['Computer Science Degree', 'Game Development Degree', 'Portfolio of Games', 'Self-taught with Demo Projects'])
                },

                // Sales Careers
                {
                    id: uuidv4(),
                    name: 'Sales Representative',
                    category: 'Sales',
                    description: 'Sell products or services to customers by understanding their needs, presenting solutions, and building long-term relationships.',
                    skills_required: JSON.stringify(['Communication', 'Relationship Building', 'Negotiation', 'Product Knowledge', 'CRM Software', 'Persistence']),
                    salary_range: JSON.stringify({ min: 40000, max: 100000, currency: 'USD', median: 60000 }),
                    growth_outlook: 'Stable - 4% growth expected through 2031',
                    education_requirements: JSON.stringify(['Business Degree', 'Sales Training', 'High School + Experience', 'Industry-specific Knowledge'])
                },
                {
                    id: uuidv4(),
                    name: 'Account Manager',
                    category: 'Sales',
                    description: 'Manage relationships with existing clients, ensuring satisfaction and identifying opportunities for account growth and retention.',
                    skills_required: JSON.stringify(['Client Management', 'Strategic Thinking', 'Communication', 'Problem Solving', 'Sales Skills', 'Project Management']),
                    salary_range: JSON.stringify({ min: 50000, max: 110000, currency: 'USD', median: 70000 }),
                    growth_outlook: 'Good - 7% growth expected through 2031',
                    education_requirements: JSON.stringify(['Business Degree', 'Sales Experience', 'Account Management Training', 'Industry Experience'])
                },

                // Operations & Logistics
                {
                    id: uuidv4(),
                    name: 'Supply Chain Analyst',
                    category: 'Operations',
                    description: 'Analyze and optimize supply chain processes to improve efficiency, reduce costs, and ensure timely delivery of products.',
                    skills_required: JSON.stringify(['Data Analysis', 'Supply Chain Management', 'Excel', 'Process Improvement', 'Logistics', 'Problem Solving']),
                    salary_range: JSON.stringify({ min: 55000, max: 95000, currency: 'USD', median: 70000 }),
                    growth_outlook: 'Good - 8% growth expected through 2031',
                    education_requirements: JSON.stringify(['Business Degree', 'Supply Chain Management Degree', 'Operations Research Degree', 'Industry Certification'])
                },
                {
                    id: uuidv4(),
                    name: 'Quality Assurance Specialist',
                    category: 'Operations',
                    description: 'Ensure products and services meet quality standards through testing, inspection, and process improvement initiatives.',
                    skills_required: JSON.stringify(['Quality Control', 'Testing Methodologies', 'Attention to Detail', 'Documentation', 'Process Improvement', 'Regulatory Knowledge']),
                    salary_range: JSON.stringify({ min: 45000, max: 80000, currency: 'USD', median: 60000 }),
                    growth_outlook: 'Stable - 5% growth expected through 2031',
                    education_requirements: JSON.stringify(['Engineering Degree', 'Quality Management Certification', 'Industry-specific Training', 'Science Degree'])
                },

                // Emerging Fields
                {
                    id: uuidv4(),
                    name: 'Sustainability Consultant',
                    category: 'Environmental',
                    description: 'Help organizations develop and implement sustainable practices to reduce environmental impact and improve corporate responsibility.',
                    skills_required: JSON.stringify(['Environmental Science', 'Sustainability Planning', 'Regulatory Knowledge', 'Project Management', 'Data Analysis', 'Communication']),
                    salary_range: JSON.stringify({ min: 60000, max: 110000, currency: 'USD', median: 75000 }),
                    growth_outlook: 'Excellent - 15+ growth expected through 2031',
                    education_requirements: JSON.stringify(['Environmental Science Degree', 'Sustainability Certification', 'Business Degree', 'Engineering Degree'])
                },
                {
                    id: uuidv4(),
                    name: 'Social Media Manager',
                    category: 'Marketing',
                    description: 'Develop and execute social media strategies to build brand awareness, engage audiences, and drive business objectives.',
                    skills_required: JSON.stringify(['Social Media Platforms', 'Content Creation', 'Analytics', 'Community Management', 'Brand Strategy', 'Trend Analysis']),
                    salary_range: JSON.stringify({ min: 40000, max: 85000, currency: 'USD', median: 55000 }),
                    growth_outlook: 'Excellent - 18% growth expected through 2031',
                    education_requirements: JSON.stringify(['Marketing Degree', 'Communications Degree', 'Social Media Certification', 'Digital Marketing Bootcamp'])
                }
            ];

            careerProfiles.forEach(profile => {
                this.db.run(
                    'INSERT INTO career_profiles (id, name, category, description, skills_required, salary_range, growth_outlook, education_requirements) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [profile.id, profile.name, profile.category, profile.description, profile.skills_required, profile.salary_range, profile.growth_outlook, profile.education_requirements]
                );
            });

            console.log(`Populated ${careerProfiles.length} career profiles`);
        });
    }

    // Learning Resources Management
    async getAllLearningResources() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM learning_resources ORDER BY category, difficulty_level',
                [],
                (err, resources) => {
                    if (err) {
                        reject(err);
                    } else {
                        resources.forEach(resource => {
                            resource.prerequisites = resource.prerequisites ? JSON.parse(resource.prerequisites) : [];
                            resource.outcomes = resource.outcomes ? JSON.parse(resource.outcomes) : [];
                            resource.career_relevance = resource.career_relevance ? JSON.parse(resource.career_relevance) : [];
                        });
                        resolve(resources);
                    }
                }
            );
        });
    }

    async getLearningResourcesByCareer(careerTitle) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM learning_resources WHERE career_relevance LIKE ? ORDER BY difficulty_level, rating DESC',
                [`%${careerTitle}%`],
                (err, resources) => {
                    if (err) {
                        reject(err);
                    } else {
                        resources.forEach(resource => {
                            resource.prerequisites = resource.prerequisites ? JSON.parse(resource.prerequisites) : [];
                            resource.outcomes = resource.outcomes ? JSON.parse(resource.outcomes) : [];
                            resource.career_relevance = resource.career_relevance ? JSON.parse(resource.career_relevance) : [];
                        });
                        resolve(resources);
                    }
                }
            );
        });
    }

    async getLearningPathsByCareer(careerTitle) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM learning_paths WHERE career_title = ? ORDER BY level',
                [careerTitle],
                (err, paths) => {
                    if (err) {
                        reject(err);
                    } else {
                        paths.forEach(path => {
                            path.steps = path.steps ? JSON.parse(path.steps) : [];
                            path.resources = path.resources ? JSON.parse(path.resources) : [];
                            path.milestones = path.milestones ? JSON.parse(path.milestones) : [];
                        });
                        resolve(paths);
                    }
                }
            );
        });
    }

    async saveUserLearningProgress(userId, resourceId, status, progressPercentage = 0, notes = '') {
        return new Promise((resolve, reject) => {
            const progressId = uuidv4();
            const now = new Date().toISOString();
            
            this.db.run(
                'INSERT OR REPLACE INTO user_learning_progress (id, user_id, resource_id, status, progress_percentage, started_at, completed_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [progressId, userId, resourceId, status, progressPercentage, 
                 status === 'not_started' ? null : now,
                 status === 'completed' ? now : null,
                 notes],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(progressId);
                    }
                }
            );
        });
    }

    async getUserLearningProgress(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT ulp.*, lr.title, lr.category, lr.provider, lr.type 
                 FROM user_learning_progress ulp 
                 JOIN learning_resources lr ON ulp.resource_id = lr.id 
                 WHERE ulp.user_id = ? 
                 ORDER BY ulp.started_at DESC`,
                [userId],
                (err, progress) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(progress);
                    }
                }
            );
        });
    }

    // Populate learning resources with initial data
    async populateLearningResources() {
        return new Promise((resolve, reject) => {
            // Check if resources already exist
            this.db.get('SELECT COUNT(*) as count FROM learning_resources', [], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (row.count > 0) {
                    resolve('Learning resources already populated');
                    return;
                }

                const learningResources = [
                    // Programming & Technology
                    {
                        id: uuidv4(),
                        title: 'Complete Web Development Bootcamp',
                        category: 'Technology',
                        skill_category: 'Programming',
                        provider: 'Udemy',
                        type: 'Online Course',
                        difficulty_level: 'Beginner',
                        duration: '65 hours',
                        cost: '$89',
                        rating: 4.7,
                        description: 'Learn HTML, CSS, JavaScript, Node.js, React, MongoDB and more',
                        url: 'https://www.udemy.com/course/the-complete-web-development-bootcamp/',
                        prerequisites: JSON.stringify(['Basic computer skills']),
                        outcomes: JSON.stringify(['Build full-stack web applications', 'Understand modern web technologies', 'Deploy applications to the web']),
                        career_relevance: JSON.stringify(['Software Developer', 'Full Stack Developer', 'Web Developer'])
                    },
                    {
                        id: uuidv4(),
                        title: 'Python for Data Science',
                        category: 'Technology',
                        skill_category: 'Data Science',
                        provider: 'Coursera',
                        type: 'Specialization',
                        difficulty_level: 'Intermediate',
                        duration: '4 months',
                        cost: '$49/month',
                        rating: 4.6,
                        description: 'Master Python for data analysis, visualization, and machine learning',
                        url: 'https://www.coursera.org/specializations/python-data-science',
                        prerequisites: JSON.stringify(['Basic programming knowledge']),
                        outcomes: JSON.stringify(['Data analysis with pandas', 'Machine learning with scikit-learn', 'Data visualization']),
                        career_relevance: JSON.stringify(['Data Scientist', 'Data Analyst', 'Machine Learning Engineer'])
                    },
                    {
                        id: uuidv4(),
                        title: 'AWS Cloud Practitioner',
                        category: 'Technology',
                        skill_category: 'Cloud Computing',
                        provider: 'AWS',
                        type: 'Certification Course',
                        difficulty_level: 'Beginner',
                        duration: '20 hours',
                        cost: '$100 (exam fee)',
                        rating: 4.5,
                        description: 'Learn AWS cloud fundamentals and prepare for certification',
                        url: 'https://aws.amazon.com/certification/certified-cloud-practitioner/',
                        prerequisites: JSON.stringify(['Basic IT knowledge']),
                        outcomes: JSON.stringify(['AWS fundamentals', 'Cloud computing concepts', 'Industry certification']),
                        career_relevance: JSON.stringify(['Cloud Engineer', 'DevOps Engineer', 'Software Developer'])
                    },

                    // Design & Creative
                    {
                        id: uuidv4(),
                        title: 'Adobe Creative Suite Masterclass',
                        category: 'Design',
                        skill_category: 'Graphic Design',
                        provider: 'Skillshare',
                        type: 'Workshop Series',
                        difficulty_level: 'Beginner',
                        duration: '30 hours',
                        cost: '$99/year',
                        rating: 4.4,
                        description: 'Master Photoshop, Illustrator, and InDesign for professional design',
                        url: 'https://www.skillshare.com/classes/adobe-creative-suite',
                        prerequisites: JSON.stringify(['Basic computer skills']),
                        outcomes: JSON.stringify(['Professional design skills', 'Portfolio development', 'Industry software proficiency']),
                        career_relevance: JSON.stringify(['Graphic Designer', 'UI/UX Designer', 'Creative Director'])
                    },
                    {
                        id: uuidv4(),
                        title: 'UX Design Fundamentals',
                        category: 'Design',
                        skill_category: 'User Experience',
                        provider: 'Google',
                        type: 'Professional Certificate',
                        difficulty_level: 'Beginner',
                        duration: '6 months',
                        cost: '$49/month',
                        rating: 4.8,
                        description: 'Learn user experience design from industry experts at Google',
                        url: 'https://www.coursera.org/professional-certificates/google-ux-design',
                        prerequisites: JSON.stringify(['No prior experience required']),
                        outcomes: JSON.stringify(['UX research skills', 'Design thinking', 'Prototyping', 'Portfolio creation']),
                        career_relevance: JSON.stringify(['UX Designer', 'Product Designer', 'UI Designer'])
                    },

                    // Business & Finance
                    {
                        id: uuidv4(),
                        title: 'Financial Modeling & Analysis',
                        category: 'Finance',
                        skill_category: 'Financial Analysis',
                        provider: 'Wharton Online',
                        type: 'Professional Course',
                        difficulty_level: 'Advanced',
                        duration: '8 weeks',
                        cost: '$2,500',
                        rating: 4.7,
                        description: 'Master financial modeling techniques used by top investment banks',
                        url: 'https://online.wharton.upenn.edu/financial-modeling/',
                        prerequisites: JSON.stringify(['Finance fundamentals', 'Excel proficiency']),
                        outcomes: JSON.stringify(['Advanced Excel modeling', 'Valuation techniques', 'Investment analysis']),
                        career_relevance: JSON.stringify(['Financial Analyst', 'Investment Banker', 'Corporate Finance'])
                    },
                    {
                        id: uuidv4(),
                        title: 'Digital Marketing Certification',
                        category: 'Marketing',
                        skill_category: 'Digital Marketing',
                        provider: 'HubSpot',
                        type: 'Free Certification',
                        difficulty_level: 'Intermediate',
                        duration: '12 hours',
                        cost: 'Free',
                        rating: 4.6,
                        description: 'Comprehensive digital marketing strategy and execution',
                        url: 'https://academy.hubspot.com/courses/digital-marketing',
                        prerequisites: JSON.stringify(['Basic marketing knowledge']),
                        outcomes: JSON.stringify(['SEO/SEM skills', 'Social media marketing', 'Email marketing', 'Analytics']),
                        career_relevance: JSON.stringify(['Digital Marketing Manager', 'Marketing Specialist', 'Content Marketer'])
                    },

                    // Healthcare
                    {
                        id: uuidv4(),
                        title: 'Medical Terminology Course',
                        category: 'Healthcare',
                        skill_category: 'Medical Knowledge',
                        provider: 'Penn Foster',
                        type: 'Online Course',
                        difficulty_level: 'Beginner',
                        duration: '4 months',
                        cost: '$599',
                        rating: 4.3,
                        description: 'Learn essential medical terminology for healthcare careers',
                        url: 'https://www.pennfoster.edu/programs/healthcare/medical-terminology',
                        prerequisites: JSON.stringify(['High school diploma']),
                        outcomes: JSON.stringify(['Medical vocabulary', 'Healthcare communication', 'Industry preparation']),
                        career_relevance: JSON.stringify(['Medical Assistant', 'Nurse', 'Healthcare Administrator'])
                    },

                    // General Skills
                    {
                        id: uuidv4(),
                        title: 'Project Management Professional (PMP)',
                        category: 'Business',
                        skill_category: 'Project Management',
                        provider: 'PMI',
                        type: 'Professional Certification',
                        difficulty_level: 'Advanced',
                        duration: '3 months prep',
                        cost: '$555 (exam fee)',
                        rating: 4.8,
                        description: 'Industry-leading project management certification',
                        url: 'https://www.pmi.org/certifications/project-management-pmp',
                        prerequisites: JSON.stringify(['Bachelor degree + 3 years PM experience OR High school + 5 years PM experience']),
                        outcomes: JSON.stringify(['Advanced PM skills', 'Industry recognition', 'Career advancement']),
                        career_relevance: JSON.stringify(['Project Manager', 'Program Manager', 'Operations Manager'])
                    },
                    {
                        id: uuidv4(),
                        title: 'Public Speaking Mastery',
                        category: 'Soft Skills',
                        skill_category: 'Communication',
                        provider: 'Toastmasters',
                        type: 'Local Workshops',
                        difficulty_level: 'Beginner',
                        duration: 'Ongoing',
                        cost: '$45/6 months',
                        rating: 4.5,
                        description: 'Develop confidence and skills in public speaking and leadership',
                        url: 'https://www.toastmasters.org/',
                        prerequisites: JSON.stringify(['Willingness to participate']),
                        outcomes: JSON.stringify(['Confidence speaking', 'Leadership skills', 'Networking']),
                        career_relevance: JSON.stringify(['All careers benefit from communication skills'])
                    }
                ];

                // Insert learning resources
                const stmt = this.db.prepare(
                    'INSERT INTO learning_resources (id, title, category, skill_category, provider, type, difficulty_level, duration, cost, rating, description, url, prerequisites, outcomes, career_relevance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
                );

                learningResources.forEach(resource => {
                    stmt.run([
                        resource.id, resource.title, resource.category, resource.skill_category,
                        resource.provider, resource.type, resource.difficulty_level, resource.duration,
                        resource.cost, resource.rating, resource.description, resource.url,
                        resource.prerequisites, resource.outcomes, resource.career_relevance
                    ]);
                });

                stmt.finalize();
                resolve(`Populated ${learningResources.length} learning resources`);
            });
        });
    }

    // Community Features Methods
    
    // Forum Management
    async getForumCategories() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM forum_categories ORDER BY sort_order, name',
                [],
                (err, categories) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(categories);
                    }
                }
            );
        });
    }

    async getForumPosts(categoryId = null, limit = 20, offset = 0) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT fp.*, u.username, u.email,
                       fc.name as category_name, fc.color as category_color
                FROM forum_posts fp
                JOIN users u ON fp.user_id = u.id
                JOIN forum_categories fc ON fp.category_id = fc.id
            `;
            let params = [];
            
            if (categoryId) {
                query += ' WHERE fp.category_id = ?';
                params.push(categoryId);
            }
            
            query += ' ORDER BY fp.is_pinned DESC, fp.updated_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);
            
            this.db.all(query, params, (err, posts) => {
                if (err) {
                    reject(err);
                } else {
                    posts.forEach(post => {
                        post.tags = post.tags ? JSON.parse(post.tags) : [];
                    });
                    resolve(posts);
                }
            });
        });
    }

    async createForumPost(userId, categoryId, title, content, tags = []) {
        return new Promise((resolve, reject) => {
            const postId = uuidv4();
            
            this.db.run(
                'INSERT INTO forum_posts (id, category_id, user_id, title, content, tags) VALUES (?, ?, ?, ?, ?, ?)',
                [postId, categoryId, userId, title, content, JSON.stringify(tags)],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(postId);
                    }
                }
            );
        });
    }

    async getForumReplies(postId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT fr.*, u.username, u.email
                 FROM forum_replies fr
                 JOIN users u ON fr.user_id = u.id
                 WHERE fr.post_id = ?
                 ORDER BY fr.is_solution DESC, fr.created_at ASC`,
                [postId],
                (err, replies) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(replies);
                    }
                }
            );
        });
    }

    async createForumReply(userId, postId, content) {
        return new Promise((resolve, reject) => {
            const replyId = uuidv4();
            
            this.db.serialize(() => {
                this.db.run(
                    'INSERT INTO forum_replies (id, post_id, user_id, content) VALUES (?, ?, ?, ?)',
                    [replyId, postId, userId, content],
                    function(err) {
                        if (err) {
                            reject(err);
                            return;
                        }
                    }
                );
                
                // Update reply count in post
                this.db.run(
                    'UPDATE forum_posts SET replies_count = replies_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [postId],
                    function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(replyId);
                        }
                    }
                );
            });
        });
    }

    // Networking and Connections
    async sendConnectionRequest(requesterId, addresseeId, message = '', connectionType = 'peer') {
        return new Promise((resolve, reject) => {
            const connectionId = uuidv4();
            
            this.db.run(
                'INSERT INTO user_connections (id, requester_id, addressee_id, status, connection_type, message) VALUES (?, ?, ?, ?, ?, ?)',
                [connectionId, requesterId, addresseeId, 'pending', connectionType, message],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(connectionId);
                    }
                }
            );
        });
    }

    async acceptConnectionRequest(connectionId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE user_connections SET status = ?, accepted_at = CURRENT_TIMESTAMP WHERE id = ?',
                ['accepted', connectionId],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.changes > 0);
                    }
                }
            );
        });
    }

    async getUserConnections(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT uc.*, 
                        u1.username as requester_username, u1.email as requester_email,
                        u2.username as addressee_username, u2.email as addressee_email
                 FROM user_connections uc
                 JOIN users u1 ON uc.requester_id = u1.id
                 JOIN users u2 ON uc.addressee_id = u2.id
                 WHERE (uc.requester_id = ? OR uc.addressee_id = ?) AND uc.status = 'accepted'
                 ORDER BY uc.accepted_at DESC`,
                [userId, userId],
                (err, connections) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(connections);
                    }
                }
            );
        });
    }

    // Mentorship System
    async createMentorshipProfile(userId, profileType, data) {
        return new Promise((resolve, reject) => {
            const profileId = uuidv4();
            
            this.db.run(
                `INSERT INTO mentorship_profiles 
                 (id, user_id, profile_type, career_field, experience_level, skills_offered, skills_wanted, availability, bio, linkedin_url) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    profileId, userId, profileType, data.careerField || '', data.experienceLevel || '',
                    JSON.stringify(data.skillsOffered || []), JSON.stringify(data.skillsWanted || []),
                    data.availability || '', data.bio || '', data.linkedinUrl || ''
                ],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(profileId);
                    }
                }
            );
        });
    }

    async findMentors(careerField = '', skills = []) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT mp.*, u.username, u.email
                FROM mentorship_profiles mp
                JOIN users u ON mp.user_id = u.id
                WHERE mp.profile_type = 'mentor' AND mp.is_active = TRUE
            `;
            let params = [];
            
            if (careerField) {
                query += ' AND mp.career_field LIKE ?';
                params.push(`%${careerField}%`);
            }
            
            query += ' ORDER BY mp.created_at DESC';
            
            this.db.all(query, params, (err, mentors) => {
                if (err) {
                    reject(err);
                } else {
                    mentors.forEach(mentor => {
                        mentor.skills_offered = mentor.skills_offered ? JSON.parse(mentor.skills_offered) : [];
                        mentor.skills_wanted = mentor.skills_wanted ? JSON.parse(mentor.skills_wanted) : [];
                    });
                    resolve(mentors);
                }
            });
        });
    }

    async requestMentorship(menteeId, mentorId, message = '') {
        return new Promise((resolve, reject) => {
            const matchId = uuidv4();
            
            this.db.run(
                'INSERT INTO mentorship_matches (id, mentor_id, mentee_id, status, message) VALUES (?, ?, ?, ?, ?)',
                [matchId, mentorId, menteeId, 'pending', message],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(matchId);
                    }
                }
            );
        });
    }

    // Activity Tracking
    async logUserActivity(userId, activityType, targetType = null, targetId = null, description = '') {
        return new Promise((resolve, reject) => {
            const activityId = uuidv4();
            
            this.db.run(
                'INSERT INTO user_activities (id, user_id, activity_type, target_type, target_id, description) VALUES (?, ?, ?, ?, ?, ?)',
                [activityId, userId, activityType, targetType, targetId, description],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(activityId);
                    }
                }
            );
        });
    }

    async getUserActivity(userId, limit = 20) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM user_activities WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
                [userId, limit],
                (err, activities) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(activities);
                    }
                }
            );
        });
    }

    // Populate community features with initial data
    async populateCommunityFeatures() {
        return new Promise((resolve, reject) => {
            // Check if forum categories already exist
            this.db.get('SELECT COUNT(*) as count FROM forum_categories', [], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (row.count > 0) {
                    resolve('Community features already populated');
                    return;
                }

                const forumCategories = [
                    {
                        id: uuidv4(),
                        name: 'Career Advice',
                        description: 'Get guidance on career decisions, job searching, and professional development',
                        icon: '💼',
                        color: '#3B82F6',
                        sort_order: 1
                    },
                    {
                        id: uuidv4(),
                        name: 'Industry Discussions',
                        description: 'Discuss trends, opportunities, and insights in different industries',
                        icon: '🏭',
                        color: '#10B981',
                        sort_order: 2
                    },
                    {
                        id: uuidv4(),
                        name: 'Skill Development',
                        description: 'Share resources, tips, and experiences about learning new skills',
                        icon: '📚',
                        color: '#F59E0B',
                        sort_order: 3
                    },
                    {
                        id: uuidv4(),
                        name: 'Job Opportunities',
                        description: 'Share job openings, internships, and career opportunities',
                        icon: '🎯',
                        color: '#EF4444',
                        sort_order: 4
                    },
                    {
                        id: uuidv4(),
                        name: 'Networking',
                        description: 'Connect with professionals, find mentors, and build relationships',
                        icon: '🤝',
                        color: '#8B5CF6',
                        sort_order: 5
                    },
                    {
                        id: uuidv4(),
                        name: 'General Discussion',
                        description: 'Open forum for general career-related discussions and questions',
                        icon: '💬',
                        color: '#6B7280',
                        sort_order: 6
                    }
                ];

                // Insert forum categories
                const stmt = this.db.prepare(
                    'INSERT INTO forum_categories (id, name, description, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
                );

                forumCategories.forEach(category => {
                    stmt.run([
                        category.id, category.name, category.description,
                        category.icon, category.color, category.sort_order
                    ]);
                });

                stmt.finalize();
                resolve(`Populated ${forumCategories.length} forum categories`);
            });
        });
    }

    // Gamification Methods
    async getUserGamification(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM user_gamification WHERE user_id = ?',
                [userId],
                (err, gamification) => {
                    if (err) {
                        reject(err);
                    } else if (!gamification) {
                        // Create initial gamification record for new user
                        this.initializeUserGamification(userId).then(resolve).catch(reject);
                    } else {
                        gamification.badges_earned = JSON.parse(gamification.badges_earned || '[]');
                        gamification.achievements_unlocked = JSON.parse(gamification.achievements_unlocked || '[]');
                        resolve(gamification);
                    }
                }
            );
        });
    }

    async initializeUserGamification(userId) {
        return new Promise((resolve, reject) => {
            const gamificationId = uuidv4();
            
            this.db.run(
                `INSERT INTO user_gamification 
                 (id, user_id, total_xp, current_level, current_streak, longest_streak, last_activity_date, badges_earned, achievements_unlocked) 
                 VALUES (?, ?, 0, 1, 0, 0, NULL, '[]', '[]')`,
                [gamificationId, userId],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            id: gamificationId,
                            user_id: userId,
                            total_xp: 0,
                            current_level: 1,
                            current_streak: 0,
                            longest_streak: 0,
                            last_activity_date: null,
                            badges_earned: [],
                            achievements_unlocked: []
                        });
                    }
                }
            );
        });
    }

    async awardXP(userId, xpAmount, source = 'general') {
        return new Promise(async (resolve, reject) => {
            try {
                const gamification = await this.getUserGamification(userId);
                const newTotalXP = gamification.total_xp + xpAmount;
                const newLevel = this.calculateLevel(newTotalXP);
                
                // Update streak if it's a new day
                const today = new Date().toISOString().split('T')[0];
                let newStreak = gamification.current_streak;
                let newLongestStreak = gamification.longest_streak;
                
                if (gamification.last_activity_date !== today) {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];
                    
                    if (gamification.last_activity_date === yesterdayStr) {
                        // Consecutive day
                        newStreak = gamification.current_streak + 1;
                    } else {
                        // Streak broken or first activity
                        newStreak = 1;
                    }
                    
                    newLongestStreak = Math.max(newLongestStreak, newStreak);
                }
                
                this.db.run(
                    `UPDATE user_gamification 
                     SET total_xp = ?, current_level = ?, current_streak = ?, longest_streak = ?, 
                         last_activity_date = ?, updated_at = CURRENT_TIMESTAMP 
                     WHERE user_id = ?`,
                    [newTotalXP, newLevel, newStreak, newLongestStreak, today, userId],
                    function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({
                                xpAwarded: xpAmount,
                                newTotalXP,
                                levelUp: newLevel > gamification.current_level,
                                newLevel,
                                newStreak,
                                source
                            });
                        }
                    }
                );
            } catch (error) {
                reject(error);
            }
        });
    }

    calculateLevel(totalXP) {
        // Level formula: level = floor(sqrt(totalXP / 100)) + 1
        // This means: Level 1: 0-99 XP, Level 2: 100-399 XP, Level 3: 400-899 XP, etc.
        return Math.floor(Math.sqrt(totalXP / 100)) + 1;
    }

    getXPForNextLevel(currentLevel) {
        // XP needed for next level = (currentLevel^2) * 100
        return (currentLevel * currentLevel) * 100;
    }

    async awardBadge(userId, badgeId, badgeName, badgeIcon) {
        return new Promise(async (resolve, reject) => {
            try {
                const gamification = await this.getUserGamification(userId);
                
                if (!gamification.badges_earned.some(badge => badge.id === badgeId)) {
                    const newBadge = {
                        id: badgeId,
                        name: badgeName,
                        icon: badgeIcon,
                        earned_at: new Date().toISOString()
                    };
                    
                    const updatedBadges = [...gamification.badges_earned, newBadge];
                    
                    this.db.run(
                        'UPDATE user_gamification SET badges_earned = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                        [JSON.stringify(updatedBadges), userId],
                        function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(newBadge);
                            }
                        }
                    );
                } else {
                    resolve(null); // Badge already earned
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    async unlockAchievement(userId, achievementId, achievementName, description, xpReward) {
        return new Promise(async (resolve, reject) => {
            try {
                const gamification = await this.getUserGamification(userId);
                
                if (!gamification.achievements_unlocked.some(achievement => achievement.id === achievementId)) {
                    const newAchievement = {
                        id: achievementId,
                        name: achievementName,
                        description: description,
                        xp_reward: xpReward,
                        unlocked_at: new Date().toISOString()
                    };
                    
                    const updatedAchievements = [...gamification.achievements_unlocked, newAchievement];
                    
                    this.db.run(
                        'UPDATE user_gamification SET achievements_unlocked = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                        [JSON.stringify(updatedAchievements), userId],
                        function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(newAchievement);
                            }
                        }
                    );
                    
                    // Also record in user_achievements table
                    const userAchievementId = uuidv4();
                    this.db.run(
                        'INSERT INTO user_achievements (id, user_id, achievement_id) VALUES (?, ?, ?)',
                        [userAchievementId, userId, achievementId]
                    );
                    
                    // Award XP for achievement
                    if (xpReward > 0) {
                        await this.awardXP(userId, xpReward, 'achievement');
                    }
                } else {
                    resolve(null); // Achievement already unlocked
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    async getLeaderboard(limit = 10) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT ug.*, u.username 
                 FROM user_gamification ug 
                 JOIN users u ON ug.user_id = u.id 
                 ORDER BY ug.total_xp DESC, ug.current_level DESC 
                 LIMIT ?`,
                [limit],
                (err, leaderboard) => {
                    if (err) {
                        reject(err);
                    } else {
                        leaderboard.forEach(entry => {
                            entry.badges_earned = JSON.parse(entry.badges_earned || '[]');
                            entry.achievements_unlocked = JSON.parse(entry.achievements_unlocked || '[]');
                        });
                        resolve(leaderboard);
                    }
                }
            );
        });
    }

    async checkAndAwardLearningAchievements(userId) {
        try {
            const progress = await this.getUserLearningProgress(userId);
            const completedCourses = progress.filter(p => p.status === 'completed').length;
            const inProgressCourses = progress.filter(p => p.status === 'in_progress').length;
            const gamification = await this.getUserGamification(userId);
            
            const achievements = [];
            
            // First Course Started
            if (inProgressCourses > 0 || completedCourses > 0) {
                const achievement = await this.unlockAchievement(
                    userId, 'first_course_started', 'Learning Journey Begins', 
                    'Started your first learning course', 50
                );
                if (achievement) achievements.push(achievement);
            }
            
            // First Course Completed
            if (completedCourses >= 1) {
                const achievement = await this.unlockAchievement(
                    userId, 'first_course_completed', 'Course Conqueror', 
                    'Completed your first learning course', 100
                );
                if (achievement) achievements.push(achievement);
            }
            
            // Multiple courses completed
            if (completedCourses >= 3) {
                const achievement = await this.unlockAchievement(
                    userId, 'course_enthusiast', 'Learning Enthusiast', 
                    'Completed 3 learning courses', 200
                );
                if (achievement) achievements.push(achievement);
            }
            
            if (completedCourses >= 5) {
                const achievement = await this.unlockAchievement(
                    userId, 'course_master', 'Learning Master', 
                    'Completed 5 learning courses', 300
                );
                if (achievement) achievements.push(achievement);
            }
            
            // Streak achievements
            if (gamification.current_streak >= 3) {
                const badge = await this.awardBadge(
                    userId, 'streak_3', '3-Day Streak', '🔥'
                );
                if (badge) achievements.push({ type: 'badge', ...badge });
            }
            
            if (gamification.current_streak >= 7) {
                const badge = await this.awardBadge(
                    userId, 'streak_7', 'Week Warrior', '⚡'
                );
                if (badge) achievements.push({ type: 'badge', ...badge });
            }
            
            if (gamification.current_streak >= 30) {
                const badge = await this.awardBadge(
                    userId, 'streak_30', 'Monthly Master', '👑'
                );
                if (badge) achievements.push({ type: 'badge', ...badge });
            }
            
            return achievements;
        } catch (error) {
            console.error('Error checking learning achievements:', error);
            return [];
        }
    }

    // Dynamic Learning Paths Methods
    async createLearningPath(pathData) {
        return new Promise((resolve, reject) => {
            const pathId = uuidv4();
            const {
                name,
                description,
                career_category,
                difficulty_level = 'beginner',
                estimated_duration = 0,
                skills_covered = [],
                prerequisites = [],
                learning_objectives = [],
                path_structure = [],
                is_adaptive = true
            } = pathData;

            this.db.run(
                `INSERT INTO learning_paths 
                 (id, name, description, career_category, difficulty_level, estimated_duration, 
                  skills_covered, prerequisites, learning_objectives, path_structure, is_adaptive) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    pathId, name, description, career_category, difficulty_level, estimated_duration,
                    JSON.stringify(skills_covered), JSON.stringify(prerequisites),
                    JSON.stringify(learning_objectives), JSON.stringify(path_structure), is_adaptive
                ],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(pathId);
                    }
                }
            );
        });
    }

    async generateDynamicLearningPath(userId, careerGoal, skillLevel = 'beginner') {
        try {
            // Get user's assessment results and current skills
            const assessmentHistory = await this.getAssessmentHistory(userId);
            const userProgress = await this.getUserLearningProgress(userId);
            
            let userSkills = {};
            let interests = [];
            
            if (assessmentHistory.length > 0) {
                const latestAssessment = assessmentHistory[0];
                userSkills = latestAssessment.quiz_answers.skills || {};
                interests = latestAssessment.quiz_answers.interests || [];
            }

            // Get all learning resources
            const resources = await this.getAllLearningResources();
            
            // Career-specific skill mappings
            const careerSkillMaps = {
                'Software Developer': ['programming', 'algorithms', 'database', 'web_development', 'software_engineering'],
                'Data Scientist': ['statistics', 'machine_learning', 'python', 'data_analysis', 'visualization'],
                'Product Manager': ['strategy', 'analytics', 'communication', 'leadership', 'market_research'],
                'UX/UI Designer': ['design_principles', 'user_research', 'prototyping', 'visual_design', 'interaction_design'],
                'Marketing Manager': ['digital_marketing', 'content_strategy', 'analytics', 'social_media', 'branding'],
                'Business Analyst': ['data_analysis', 'requirements_gathering', 'process_improvement', 'stakeholder_management'],
                'Cybersecurity Specialist': ['network_security', 'ethical_hacking', 'risk_assessment', 'compliance'],
                'Financial Analyst': ['financial_modeling', 'excel', 'accounting', 'investment_analysis'],
                'HR Manager': ['recruitment', 'employee_relations', 'performance_management', 'hr_analytics'],
                'Sales Manager': ['sales_strategy', 'crm', 'negotiation', 'customer_relationship', 'lead_generation']
            };

            const requiredSkills = careerSkillMaps[careerGoal] || ['general_business', 'communication', 'leadership'];
            
            // Filter resources based on career goal and skill requirements
            const relevantResources = resources.filter(resource => {
                const resourceSkills = resource.skills_covered || [];
                const resourceCareer = resource.career_relevance || [];
                
                return resourceSkills.some(skill => requiredSkills.includes(skill)) ||
                       resourceCareer.includes(careerGoal) ||
                       resource.category === 'general_business';
            });

            // Create learning modules based on skill progression
            const modules = [];
            let currentOrder = 1;
            
            // Foundational module
            const foundationalResources = relevantResources.filter(r => 
                (r.difficulty === 'beginner' || !r.difficulty) && 
                (r.category === 'fundamentals' || r.type === 'course')
            );
            
            if (foundationalResources.length > 0) {
                modules.push({
                    module_order: currentOrder++,
                    module_name: `${careerGoal} Fundamentals`,
                    module_description: `Build a solid foundation in ${careerGoal} basics`,
                    module_type: 'course_sequence',
                    resource_ids: foundationalResources.slice(0, 3).map(r => r.id),
                    estimated_hours: 20,
                    prerequisites: [],
                    learning_outcomes: [`Understand ${careerGoal} fundamentals`, 'Build foundational knowledge'],
                    is_optional: false
                });
            }

            // Skill-specific modules
            for (const skill of requiredSkills.slice(0, 4)) { // Limit to 4 key skills
                const skillResources = relevantResources.filter(r => 
                    (r.skills_covered && r.skills_covered.includes(skill)) ||
                    r.title.toLowerCase().includes(skill.replace('_', ' '))
                );
                
                if (skillResources.length > 0) {
                    modules.push({
                        module_order: currentOrder++,
                        module_name: `${skill.replace('_', ' ').toUpperCase()} Mastery`,
                        module_description: `Develop expertise in ${skill.replace('_', ' ')}`,
                        module_type: 'skill_focused',
                        resource_ids: skillResources.slice(0, 2).map(r => r.id),
                        estimated_hours: 15,
                        prerequisites: currentOrder > 2 ? [modules[0].module_name] : [],
                        learning_outcomes: [`Master ${skill} concepts`, 'Apply skills practically'],
                        is_optional: false
                    });
                }
            }

            // Advanced/Project module
            const advancedResources = relevantResources.filter(r => 
                r.difficulty === 'advanced' || r.type === 'project' || r.category === 'portfolio'
            );
            
            if (advancedResources.length > 0) {
                modules.push({
                    module_order: currentOrder++,
                    module_name: `${careerGoal} Portfolio Project`,
                    module_description: 'Apply your skills in a real-world project',
                    module_type: 'project',
                    resource_ids: advancedResources.slice(0, 2).map(r => r.id),
                    estimated_hours: 30,
                    prerequisites: modules.slice(0, 2).map(m => m.module_name),
                    learning_outcomes: ['Complete portfolio project', 'Demonstrate practical skills'],
                    is_optional: false
                });
            }

            // Create the learning path
            const pathData = {
                name: `${careerGoal} Career Path - ${skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)}`,
                description: `A personalized learning journey to become a ${careerGoal}. This adaptive path is tailored to your current skills and interests.`,
                career_category: careerGoal,
                difficulty_level: skillLevel,
                estimated_duration: modules.reduce((total, module) => total + (module.estimated_hours || 0), 0),
                skills_covered: requiredSkills,
                prerequisites: skillLevel === 'beginner' ? [] : ['Basic computer skills', 'Professional experience'],
                learning_objectives: [
                    `Develop expertise in ${careerGoal}`,
                    'Build a professional portfolio',
                    'Gain practical experience',
                    'Prepare for job opportunities'
                ],
                path_structure: modules,
                is_adaptive: true
            };

            const pathId = await this.createLearningPath(pathData);
            
            // Create path modules in separate table
            for (const module of modules) {
                await this.createPathModule(pathId, module);
            }

            return { pathId, pathData, modules };
        } catch (error) {
            console.error('Error generating dynamic learning path:', error);
            throw error;
        }
    }

    async createPathModule(pathId, moduleData) {
        return new Promise((resolve, reject) => {
            const moduleId = uuidv4();
            const {
                module_order,
                module_name,
                module_description = '',
                module_type = 'course',
                resource_ids = [],
                estimated_hours = 0,
                prerequisites = [],
                learning_outcomes = [],
                is_optional = false
            } = moduleData;

            this.db.run(
                `INSERT INTO path_modules 
                 (id, path_id, module_order, module_name, module_description, module_type, 
                  resource_ids, estimated_hours, prerequisites, learning_outcomes, is_optional) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    moduleId, pathId, module_order, module_name, module_description, module_type,
                    JSON.stringify(resource_ids), estimated_hours, JSON.stringify(prerequisites),
                    JSON.stringify(learning_outcomes), is_optional
                ],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(moduleId);
                    }
                }
            );
        });
    }

    async getUserLearningPaths(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT lp.*, ulp.status, ulp.progress_percentage, ulp.current_module_index,
                        ulp.customizations, ulp.enrolled_at, ulp.completed_at
                 FROM learning_paths lp
                 JOIN user_learning_paths ulp ON lp.id = ulp.path_id
                 WHERE ulp.user_id = ?
                 ORDER BY ulp.enrolled_at DESC`,
                [userId],
                (err, paths) => {
                    if (err) {
                        reject(err);
                    } else {
                        paths.forEach(path => {
                            path.skills_covered = JSON.parse(path.skills_covered || '[]');
                            path.prerequisites = JSON.parse(path.prerequisites || '[]');
                            path.learning_objectives = JSON.parse(path.learning_objectives || '[]');
                            path.path_structure = JSON.parse(path.path_structure || '[]');
                            path.customizations = JSON.parse(path.customizations || '{}');
                        });
                        resolve(paths);
                    }
                }
            );
        });
    }

    async enrollUserInPath(userId, pathId, customizations = {}) {
        return new Promise((resolve, reject) => {
            const enrollmentId = uuidv4();
            
            this.db.run(
                `INSERT INTO user_learning_paths 
                 (id, user_id, path_id, status, progress_percentage, current_module_index, customizations) 
                 VALUES (?, ?, ?, 'enrolled', 0, 0, ?)`,
                [enrollmentId, userId, pathId, JSON.stringify(customizations)],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(enrollmentId);
                    }
                }
            );
        });
    }

    async updatePathProgress(userId, pathId, moduleIndex, progress) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE user_learning_paths 
                 SET current_module_index = ?, progress_percentage = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE user_id = ? AND path_id = ?`,
                [moduleIndex, progress, userId, pathId],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.changes > 0);
                    }
                }
            );
        });
    }

    async getPathModules(pathId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM path_modules WHERE path_id = ? ORDER BY module_order',
                [pathId],
                (err, modules) => {
                    if (err) {
                        reject(err);
                    } else {
                        modules.forEach(module => {
                            module.resource_ids = JSON.parse(module.resource_ids || '[]');
                            module.prerequisites = JSON.parse(module.prerequisites || '[]');
                            module.learning_outcomes = JSON.parse(module.learning_outcomes || '[]');
                        });
                        resolve(modules);
                    }
                }
            );
        });
    }

    async getRecommendedPaths(userId, limit = 5) {
        try {
            // Get user's assessment results to determine career interests
            const assessmentHistory = await this.getAssessmentHistory(userId);
            let careerInterests = [];
            
            if (assessmentHistory.length > 0) {
                const latestAssessment = assessmentHistory[0];
                careerInterests = latestAssessment.top_careers || [];
            }

            // Get paths that match user's career interests
            return new Promise((resolve, reject) => {
                let query = 'SELECT * FROM learning_paths';
                let params = [];
                
                if (careerInterests.length > 0) {
                    const placeholders = careerInterests.map(() => '?').join(',');
                    query += ` WHERE career_category IN (${placeholders})`;
                    params = careerInterests;
                }
                
                query += ' ORDER BY created_at DESC LIMIT ?';
                params.push(limit);

                this.db.all(query, params, (err, paths) => {
                    if (err) {
                        reject(err);
                    } else {
                        paths.forEach(path => {
                            path.skills_covered = JSON.parse(path.skills_covered || '[]');
                            path.prerequisites = JSON.parse(path.prerequisites || '[]');
                            path.learning_objectives = JSON.parse(path.learning_objectives || '[]');
                            path.path_structure = JSON.parse(path.path_structure || '[]');
                        });
                        resolve(paths);
                    }
                });
            });
        } catch (error) {
            console.error('Error getting recommended paths:', error);
            throw error;
        }
    }

    // Skill Prerequisites and Dependency Methods
    async populateSkillDefinitions() {
        const skillDefinitions = [
            // Programming Skills
            { id: 'programming_basics', name: 'Programming Fundamentals', category: 'Programming', description: 'Basic programming concepts and logic', difficulty_level: 1, estimated_hours: 20, icon: '💻', color: '#3498db' },
            { id: 'javascript', name: 'JavaScript', category: 'Programming', description: 'JavaScript programming language', difficulty_level: 2, estimated_hours: 40, icon: '🟨', color: '#f7df1e' },
            { id: 'python', name: 'Python', category: 'Programming', description: 'Python programming language', difficulty_level: 2, estimated_hours: 35, icon: '🐍', color: '#3776ab' },
            { id: 'html_css', name: 'HTML & CSS', category: 'Web Development', description: 'Web markup and styling', difficulty_level: 1, estimated_hours: 25, icon: '🌐', color: '#e34f26' },
            { id: 'react', name: 'React', category: 'Web Development', description: 'React JavaScript library', difficulty_level: 3, estimated_hours: 50, icon: '⚖️', color: '#61dafb' },
            
            // Data Science Skills
            { id: 'statistics', name: 'Statistics', category: 'Data Science', description: 'Statistical analysis and probability', difficulty_level: 2, estimated_hours: 30, icon: '📊', color: '#9b59b6' },
            { id: 'data_analysis', name: 'Data Analysis', category: 'Data Science', description: 'Data manipulation and analysis', difficulty_level: 2, estimated_hours: 35, icon: '🔍', color: '#e67e22' },
            { id: 'machine_learning', name: 'Machine Learning', category: 'Data Science', description: 'ML algorithms and applications', difficulty_level: 4, estimated_hours: 60, icon: '🤖', color: '#2ecc71' },
            { id: 'sql', name: 'SQL', category: 'Database', description: 'Database query language', difficulty_level: 2, estimated_hours: 20, icon: '🗄', color: '#336791' },
            
            // Design Skills
            { id: 'design_principles', name: 'Design Principles', category: 'Design', description: 'Fundamental design concepts', difficulty_level: 1, estimated_hours: 15, icon: '🎨', color: '#e91e63' },
            { id: 'ui_design', name: 'UI Design', category: 'Design', description: 'User interface design', difficulty_level: 2, estimated_hours: 30, icon: '📱', color: '#ff5722' },
            { id: 'ux_research', name: 'UX Research', category: 'Design', description: 'User experience research methods', difficulty_level: 3, estimated_hours: 25, icon: '🔎', color: '#607d8b' },
            { id: 'prototyping', name: 'Prototyping', category: 'Design', description: 'Creating interactive prototypes', difficulty_level: 3, estimated_hours: 20, icon: '🛠️', color: '#795548' },
            
            // Business Skills
            { id: 'communication', name: 'Communication', category: 'Business', description: 'Effective communication skills', difficulty_level: 1, estimated_hours: 10, icon: '💬', color: '#9c27b0' },
            { id: 'project_management', name: 'Project Management', category: 'Business', description: 'Planning and managing projects', difficulty_level: 2, estimated_hours: 25, icon: '📅', color: '#ff9800' },
            { id: 'leadership', name: 'Leadership', category: 'Business', description: 'Leadership and team management', difficulty_level: 3, estimated_hours: 30, icon: '🌟', color: '#ffc107' },
            { id: 'marketing', name: 'Digital Marketing', category: 'Business', description: 'Digital marketing strategies', difficulty_level: 2, estimated_hours: 20, icon: '📱', color: '#4caf50' },
            
            // Technical Skills
            { id: 'cloud_computing', name: 'Cloud Computing', category: 'Technology', description: 'Cloud platforms and services', difficulty_level: 3, estimated_hours: 40, icon: '☁️', color: '#00bcd4' },
            { id: 'cybersecurity', name: 'Cybersecurity', category: 'Technology', description: 'Information security practices', difficulty_level: 3, estimated_hours: 45, icon: '🔒', color: '#f44336' },
            { id: 'devops', name: 'DevOps', category: 'Technology', description: 'Development and operations practices', difficulty_level: 4, estimated_hours: 50, icon: '⚙️', color: '#673ab7' }
        ];

        for (const skill of skillDefinitions) {
            await this.createSkillDefinition(skill);
        }

        // Define skill prerequisites
        const prerequisites = [
            // Programming prerequisites
            { skill_id: 'javascript', prerequisite_skill_id: 'programming_basics', prerequisite_level: 2, is_hard_requirement: true },
            { skill_id: 'python', prerequisite_skill_id: 'programming_basics', prerequisite_level: 2, is_hard_requirement: true },
            { skill_id: 'react', prerequisite_skill_id: 'javascript', prerequisite_level: 3, is_hard_requirement: true },
            { skill_id: 'react', prerequisite_skill_id: 'html_css', prerequisite_level: 2, is_hard_requirement: true },
            
            // Data Science prerequisites
            { skill_id: 'data_analysis', prerequisite_skill_id: 'statistics', prerequisite_level: 2, is_hard_requirement: true },
            { skill_id: 'machine_learning', prerequisite_skill_id: 'python', prerequisite_level: 3, is_hard_requirement: true },
            { skill_id: 'machine_learning', prerequisite_skill_id: 'statistics', prerequisite_level: 3, is_hard_requirement: true },
            { skill_id: 'machine_learning', prerequisite_skill_id: 'data_analysis', prerequisite_level: 2, is_hard_requirement: true },
            
            // Design prerequisites
            { skill_id: 'ui_design', prerequisite_skill_id: 'design_principles', prerequisite_level: 2, is_hard_requirement: true },
            { skill_id: 'ux_research', prerequisite_skill_id: 'design_principles', prerequisite_level: 1, is_hard_requirement: false },
            { skill_id: 'prototyping', prerequisite_skill_id: 'ui_design', prerequisite_level: 2, is_hard_requirement: true },
            
            // Business prerequisites
            { skill_id: 'project_management', prerequisite_skill_id: 'communication', prerequisite_level: 2, is_hard_requirement: true },
            { skill_id: 'leadership', prerequisite_skill_id: 'communication', prerequisite_level: 2, is_hard_requirement: true },
            { skill_id: 'leadership', prerequisite_skill_id: 'project_management', prerequisite_level: 2, is_hard_requirement: false },
            
            // Technical prerequisites
            { skill_id: 'devops', prerequisite_skill_id: 'cloud_computing', prerequisite_level: 2, is_hard_requirement: true },
            { skill_id: 'devops', prerequisite_skill_id: 'programming_basics', prerequisite_level: 3, is_hard_requirement: true }
        ];

        for (const prereq of prerequisites) {
            await this.createSkillPrerequisite(prereq);
        }
    }

    async createSkillDefinition(skillData) {
        return new Promise((resolve, reject) => {
            const skillId = skillData.id || uuidv4();
            const {
                name,
                category,
                description = '',
                difficulty_level = 1,
                estimated_hours = 0,
                icon = '🎯',
                color = '#3498db'
            } = skillData;

            this.db.run(
                `INSERT OR IGNORE INTO skill_definitions 
                 (id, name, category, description, difficulty_level, estimated_hours, icon, color) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [skillId, name, category, description, difficulty_level, estimated_hours, icon, color],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(skillId);
                    }
                }
            );
        });
    }

    async createSkillPrerequisite(prerequisiteData) {
        return new Promise((resolve, reject) => {
            const prereqId = uuidv4();
            const {
                skill_id,
                prerequisite_skill_id,
                prerequisite_level = 1,
                is_hard_requirement = true
            } = prerequisiteData;

            this.db.run(
                `INSERT OR IGNORE INTO skill_prerequisites 
                 (id, skill_id, prerequisite_skill_id, prerequisite_level, is_hard_requirement) 
                 VALUES (?, ?, ?, ?, ?)`,
                [prereqId, skill_id, prerequisite_skill_id, prerequisite_level, is_hard_requirement],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(prereqId);
                    }
                }
            );
        });
    }

    async getSkillWithPrerequisites(skillId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT sd.*, 
                        GROUP_CONCAT(
                            CASE WHEN sp.prerequisite_skill_id IS NOT NULL 
                            THEN json_object(
                                'id', prereq.id,
                                'name', prereq.name,
                                'category', prereq.category,
                                'required_level', sp.prerequisite_level,
                                'is_hard_requirement', sp.is_hard_requirement
                            ) END
                        ) as prerequisites
                 FROM skill_definitions sd
                 LEFT JOIN skill_prerequisites sp ON sd.id = sp.skill_id
                 LEFT JOIN skill_definitions prereq ON sp.prerequisite_skill_id = prereq.id
                 WHERE sd.id = ?
                 GROUP BY sd.id`,
                [skillId],
                (err, skill) => {
                    if (err) {
                        reject(err);
                    } else if (!skill) {
                        resolve(null);
                    } else {
                        // Parse prerequisites JSON
                        if (skill.prerequisites) {
                            try {
                                skill.prerequisites = skill.prerequisites.split(',').map(p => JSON.parse(p));
                            } catch (e) {
                                skill.prerequisites = [];
                            }
                        } else {
                            skill.prerequisites = [];
                        }
                        resolve(skill);
                    }
                }
            );
        });
    }

    async getAllSkillsWithPrerequisites() {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT sd.*, 
                        GROUP_CONCAT(
                            CASE WHEN sp.prerequisite_skill_id IS NOT NULL 
                            THEN json_object(
                                'id', prereq.id,
                                'name', prereq.name,
                                'category', prereq.category,
                                'required_level', sp.prerequisite_level,
                                'is_hard_requirement', sp.is_hard_requirement
                            ) END
                        ) as prerequisites
                 FROM skill_definitions sd
                 LEFT JOIN skill_prerequisites sp ON sd.id = sp.skill_id
                 LEFT JOIN skill_definitions prereq ON sp.prerequisite_skill_id = prereq.id
                 GROUP BY sd.id
                 ORDER BY sd.category, sd.difficulty_level, sd.name`,
                [],
                (err, skills) => {
                    if (err) {
                        reject(err);
                    } else {
                        // Parse prerequisites for each skill
                        skills.forEach(skill => {
                            if (skill.prerequisites) {
                                try {
                                    skill.prerequisites = skill.prerequisites.split(',').map(p => JSON.parse(p));
                                } catch (e) {
                                    skill.prerequisites = [];
                                }
                            } else {
                                skill.prerequisites = [];
                            }
                        });
                        resolve(skills);
                    }
                }
            );
        });
    }

    async getUserSkillProgress(userId, skillId = null) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT usp.*, sd.name as skill_name, sd.category, sd.icon, sd.color
                FROM user_skill_progress usp
                JOIN skill_definitions sd ON usp.skill_id = sd.id
                WHERE usp.user_id = ?
            `;
            let params = [userId];

            if (skillId) {
                query += ' AND usp.skill_id = ?';
                params.push(skillId);
            }

            query += ' ORDER BY sd.category, sd.name';

            this.db.all(query, params, (err, progress) => {
                if (err) {
                    reject(err);
                } else {
                    progress.forEach(p => {
                        p.resources_completed = JSON.parse(p.resources_completed || '[]');
                    });
                    resolve(skillId ? progress[0] || null : progress);
                }
            });
        });
    }

    async updateUserSkillProgress(userId, skillId, progressData) {
        return new Promise(async (resolve, reject) => {
            try {
                // Check if progress record exists
                const existing = await this.getUserSkillProgress(userId, skillId);
                
                const {
                    current_level = existing?.current_level || 0,
                    confidence_score = existing?.confidence_score || 0,
                    hours_spent = 0,
                    resource_completed = null
                } = progressData;

                if (existing) {
                    // Update existing record
                    let updatedResources = existing.resources_completed || [];
                    if (resource_completed && !updatedResources.includes(resource_completed)) {
                        updatedResources.push(resource_completed);
                    }

                    this.db.run(
                        `UPDATE user_skill_progress 
                         SET current_level = ?, confidence_score = ?, 
                             total_hours_spent = total_hours_spent + ?,
                             resources_completed = ?, last_practiced_at = CURRENT_TIMESTAMP,
                             updated_at = CURRENT_TIMESTAMP
                         WHERE user_id = ? AND skill_id = ?`,
                        [
                            current_level, confidence_score, hours_spent,
                            JSON.stringify(updatedResources), userId, skillId
                        ],
                        function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(this.changes > 0);
                            }
                        }
                    );
                } else {
                    // Create new record
                    const progressId = uuidv4();
                    const resources = resource_completed ? [resource_completed] : [];
                    
                    this.db.run(
                        `INSERT INTO user_skill_progress 
                         (id, user_id, skill_id, current_level, confidence_score, 
                          total_hours_spent, resources_completed, last_practiced_at) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                        [
                            progressId, userId, skillId, current_level,
                            confidence_score, hours_spent, JSON.stringify(resources)
                        ],
                        function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(true);
                            }
                        }
                    );
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    async getOptimalLearningSequence(userId, targetSkillIds) {
        try {
            const userProgress = await this.getUserSkillProgress(userId);
            const allSkills = await this.getAllSkillsWithPrerequisites();
            
            // Create a map of user's current skill levels
            const userSkillLevels = {};
            userProgress.forEach(progress => {
                userSkillLevels[progress.skill_id] = progress.current_level;
            });

            // Build dependency graph
            const dependencyGraph = {};
            allSkills.forEach(skill => {
                dependencyGraph[skill.id] = skill.prerequisites;
            });

            // Topological sort with user's current progress
            const sequence = [];
            const visited = new Set();
            const visiting = new Set();

            const dfs = (skillId) => {
                if (visiting.has(skillId)) {
                    throw new Error(`Circular dependency detected involving skill: ${skillId}`);
                }
                if (visited.has(skillId)) {
                    return;
                }

                visiting.add(skillId);
                
                const skill = allSkills.find(s => s.id === skillId);
                if (skill && skill.prerequisites) {
                    for (const prereq of skill.prerequisites) {
                        const userLevel = userSkillLevels[prereq.id] || 0;
                        // Only include if user hasn't met the prerequisite level
                        if (userLevel < prereq.required_level) {
                            dfs(prereq.id);
                        }
                    }
                }
                
                visiting.delete(skillId);
                visited.add(skillId);
                
                // Only add to sequence if user hasn't mastered it
                const userLevel = userSkillLevels[skillId] || 0;
                const targetSkill = allSkills.find(s => s.id === skillId);
                if (targetSkill && userLevel < targetSkill.difficulty_level) {
                    sequence.push(targetSkill);
                }
            };

            // Process target skills
            for (const skillId of targetSkillIds) {
                dfs(skillId);
            }

            return sequence;
        } catch (error) {
            console.error('Error calculating optimal learning sequence:', error);
            throw error;
        }
    }

    // Enhanced Career Prediction Algorithms
    async getEnhancedCareerPredictions(userId) {
        try {
            const user = await this.getUserById(userId);
            const assessmentHistory = await this.getAssessmentHistory(userId);
            const skillProgress = await this.getUserSkillProgress(userId);
            const learningProgress = await this.getUserLearningProgress(userId);
            const gamification = await this.getUserGamification(userId);
            
            if (assessmentHistory.length === 0) {
                return { error: 'No assessment data available for predictions' };
            }

            const latestAssessment = assessmentHistory[0];
            const careerScores = latestAssessment.career_scores;
            
            // Enhanced prediction factors with weights
            const predictionFactors = {
                assessment_compatibility: 0.35,  // 35% - Core assessment alignment
                skill_readiness: 0.25,           // 25% - Current skill level vs requirements
                learning_momentum: 0.20,         // 20% - Learning activity and progress
                market_demand: 0.15,             // 15% - Industry growth and opportunities
                experience_match: 0.05           // 5% - Relevant experience indicators
            };

            // Get top career matches from assessment
            const topCareers = Object.entries(careerScores)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8)
                .map(([career, score]) => ({ career, score }));

            const enhancedPredictions = [];

            for (const careerMatch of topCareers) {
                const career = careerMatch.career;
                
                // Factor 1: Assessment Compatibility (35%)
                const assessmentScore = this.normalizeScore(careerMatch.score, 0, 50);
                
                // Factor 2: Skill Readiness (25%)
                const skillReadiness = this.calculateSkillReadiness(career, skillProgress);
                
                // Factor 3: Learning Momentum (20%)
                const learningMomentum = this.calculateLearningMomentum(learningProgress, gamification);
                
                // Factor 4: Market Demand (15%)
                const marketDemand = this.getMarketDemandScore(career);
                
                // Factor 5: Experience Match (5%)
                const experienceMatch = this.calculateExperienceMatch(career, latestAssessment.quiz_answers);
                
                // Calculate weighted success probability
                const successProbability = (
                    assessmentScore * predictionFactors.assessment_compatibility +
                    skillReadiness * predictionFactors.skill_readiness +
                    learningMomentum * predictionFactors.learning_momentum +
                    marketDemand * predictionFactors.market_demand +
                    experienceMatch * predictionFactors.experience_match
                ) * 100;

                // Generate insights and recommendations
                const insights = this.generateCareerInsights(career, {
                    assessmentScore,
                    skillReadiness,
                    learningMomentum,
                    marketDemand,
                    experienceMatch
                });

                enhancedPredictions.push({
                    career: this.formatCareerName(career),
                    careerId: career,
                    successProbability: Math.round(successProbability * 10) / 10,
                    confidenceLevel: this.calculateConfidenceLevel(successProbability),
                    factors: {
                        assessmentAlignment: Math.round(assessmentScore * 100),
                        skillReadiness: Math.round(skillReadiness * 100),
                        learningMomentum: Math.round(learningMomentum * 100),
                        marketDemand: Math.round(marketDemand * 100),
                        experienceMatch: Math.round(experienceMatch * 100)
                    },
                    insights,
                    recommendations: this.generateRecommendations(career, insights),
                    timeToReadiness: this.estimateTimeToReadiness(career, skillProgress),
                    salaryProjection: this.getSalaryProjection(career),
                    growthPotential: this.getGrowthPotential(career)
                });
            }

            // Sort by success probability
            enhancedPredictions.sort((a, b) => b.successProbability - a.successProbability);

            return {
                predictions: enhancedPredictions.slice(0, 5), // Top 5 predictions
                generatedAt: new Date().toISOString(),
                factorWeights: predictionFactors,
                overallAnalysis: this.generateOverallAnalysis(enhancedPredictions)
            };
        } catch (error) {
            console.error('Error generating enhanced career predictions:', error);
            throw error;
        }
    }

    normalizeScore(score, min, max) {
        return Math.max(0, Math.min(1, (score - min) / (max - min)));
    }

    calculateSkillReadiness(career, skillProgress) {
        const careerSkillRequirements = {
            'tech': ['programming_basics', 'javascript', 'html_css', 'python'],
            'data_scientist': ['statistics', 'python', 'data_analysis', 'machine_learning'],
            'designer': ['design_principles', 'ui_design', 'prototyping'],
            'business': ['communication', 'project_management', 'leadership'],
            'marketing': ['marketing', 'communication', 'data_analysis'],
            'healthcare': ['communication', 'statistics'],
            'finance': ['statistics', 'data_analysis', 'communication']
        };

        const requiredSkills = careerSkillRequirements[career] || ['communication'];
        
        let totalSkillScore = 0;
        let skillCount = 0;

        for (const skillId of requiredSkills) {
            const userSkill = skillProgress.find(s => s.skill_id === skillId);
            const skillLevel = userSkill ? userSkill.current_level : 0;
            const confidence = userSkill ? userSkill.confidence_score : 0;
            
            // Combine level and confidence for skill score
            const skillScore = (skillLevel / 5) * 0.7 + confidence * 0.3;
            totalSkillScore += skillScore;
            skillCount++;
        }

        return skillCount > 0 ? totalSkillScore / skillCount : 0;
    }

    calculateLearningMomentum(learningProgress, gamification) {
        const completedCourses = learningProgress.filter(p => p.status === 'completed').length;
        const inProgressCourses = learningProgress.filter(p => p.status === 'in_progress').length;
        
        // Recent activity bonus
        const recentActivity = gamification.current_streak > 0 ? 0.3 : 0;
        
        // XP and level momentum
        const xpMomentum = Math.min(1, gamification.total_xp / 1000) * 0.4;
        
        // Course completion rate
        const completionMomentum = Math.min(1, completedCourses / 5) * 0.3;
        
        return recentActivity + xpMomentum + completionMomentum;
    }

    getMarketDemandScore(career) {
        // Simulated market demand scores (in real app, this would come from job market APIs)
        const marketDemand = {
            'tech': 0.95,
            'data_scientist': 0.90,
            'cybersecurity': 0.85,
            'healthcare': 0.80,
            'business': 0.75,
            'marketing': 0.70,
            'designer': 0.65,
            'education': 0.60,
            'finance': 0.75,
            'consulting': 0.70
        };

        return marketDemand[career] || 0.65;
    }

    calculateExperienceMatch(career, quizAnswers) {
        // Analyze quiz answers for relevant experience indicators
        let experienceScore = 0;
        
        if (quizAnswers.workStyle && quizAnswers.workStyle.length > 0) {
            experienceScore += 0.3;
        }
        
        if (quizAnswers.skills) {
            const skillConfidences = Object.values(quizAnswers.skills);
            const avgConfidence = skillConfidences.reduce((a, b) => a + b, 0) / skillConfidences.length;
            experienceScore += (avgConfidence / 5) * 0.5;
        }
        
        if (quizAnswers.industryInterest && quizAnswers.industryInterest.includes(career)) {
            experienceScore += 0.2;
        }

        return Math.min(1, experienceScore);
    }

    generateCareerInsights(career, factors) {
        const insights = [];

        if (factors.assessmentScore > 0.8) {
            insights.push('Strong personality-career alignment');
        } else if (factors.assessmentScore < 0.5) {
            insights.push('Consider exploring personality fit further');
        }

        if (factors.skillReadiness > 0.7) {
            insights.push('Well-prepared skill foundation');
        } else if (factors.skillReadiness < 0.3) {
            insights.push('Significant skill development needed');
        }

        if (factors.learningMomentum > 0.6) {
            insights.push('Excellent learning trajectory');
        } else if (factors.learningMomentum < 0.3) {
            insights.push('Increase learning activity for better outcomes');
        }

        if (factors.marketDemand > 0.8) {
            insights.push('High market demand for this role');
        } else if (factors.marketDemand < 0.6) {
            insights.push('Moderate market demand - consider specialization');
        }

        return insights.length > 0 ? insights : ['Balanced potential across all factors'];
    }

    generateRecommendations(career, insights) {
        const recommendations = [];
        
        // Career-specific recommendations
        const careerRecommendations = {
            'tech': ['Build portfolio projects', 'Learn version control (Git)', 'Practice coding daily'],
            'data_scientist': ['Complete data science projects', 'Learn SQL and Python', 'Build data visualization skills'],
            'designer': ['Create design portfolio', 'Learn design tools', 'Study user experience principles'],
            'business': ['Develop leadership skills', 'Gain project management experience', 'Build network'],
            'marketing': ['Create marketing campaigns', 'Learn analytics tools', 'Build personal brand']
        };

        const specificRecs = careerRecommendations[career] || ['Develop relevant skills', 'Gain practical experience', 'Build professional network'];
        recommendations.push(...specificRecs);

        return recommendations.slice(0, 3); // Top 3 recommendations
    }

    estimateTimeToReadiness(career, skillProgress) {
        const careerSkillRequirements = {
            'tech': 4,
            'data_scientist': 6,
            'designer': 3,
            'business': 2,
            'marketing': 3,
            'healthcare': 4,
            'finance': 3
        };

        const baseMonths = careerSkillRequirements[career] || 3;
        
        // Adjust based on current skill progress
        const skillReadiness = this.calculateSkillReadiness(career, skillProgress);
        const adjustedMonths = baseMonths * (1 - skillReadiness * 0.5);
        
        return Math.max(1, Math.round(adjustedMonths));
    }

    getSalaryProjection(career) {
        // Simulated salary data (in real app, this would come from salary APIs)
        const salaryRanges = {
            'tech': { entry: 70000, mid: 100000, senior: 150000 },
            'data_scientist': { entry: 80000, mid: 120000, senior: 180000 },
            'designer': { entry: 50000, mid: 75000, senior: 120000 },
            'business': { entry: 55000, mid: 85000, senior: 130000 },
            'marketing': { entry: 45000, mid: 70000, senior: 110000 },
            'healthcare': { entry: 60000, mid: 85000, senior: 120000 },
            'finance': { entry: 65000, mid: 95000, senior: 140000 }
        };

        return salaryRanges[career] || { entry: 50000, mid: 75000, senior: 110000 };
    }

    getGrowthPotential(career) {
        const growthRates = {
            'tech': 'High (15-25% annually)',
            'data_scientist': 'Very High (20-30% annually)',
            'cybersecurity': 'Very High (25-35% annually)',
            'healthcare': 'Moderate (5-10% annually)',
            'business': 'Moderate (8-15% annually)',
            'marketing': 'Moderate (7-12% annually)',
            'designer': 'Moderate (10-18% annually)',
            'finance': 'Moderate (6-12% annually)'
        };

        return growthRates[career] || 'Moderate (8-15% annually)';
    }

    calculateConfidenceLevel(successProbability) {
        if (successProbability >= 80) return 'Very High';
        if (successProbability >= 65) return 'High';
        if (successProbability >= 50) return 'Moderate';
        if (successProbability >= 35) return 'Low';
        return 'Very Low';
    }

    formatCareerName(career) {
        const careerNames = {
            'tech': 'Software Developer',
            'data_scientist': 'Data Scientist',
            'designer': 'UX/UI Designer',
            'business': 'Business Analyst',
            'marketing': 'Marketing Manager',
            'healthcare': 'Healthcare Professional',
            'finance': 'Financial Analyst',
            'consulting': 'Management Consultant',
            'education': 'Education Specialist',
            'cybersecurity': 'Cybersecurity Specialist'
        };

        return careerNames[career] || career.charAt(0).toUpperCase() + career.slice(1);
    }

    generateOverallAnalysis(predictions) {
        const avgSuccess = predictions.reduce((sum, p) => sum + p.successProbability, 0) / predictions.length;
        
        let analysis = '';
        if (avgSuccess >= 70) {
            analysis = 'Excellent career alignment with strong success potential across multiple paths.';
        } else if (avgSuccess >= 55) {
            analysis = 'Good career potential with focused skill development.';
        } else if (avgSuccess >= 40) {
            analysis = 'Moderate potential - consider expanding skill set and gaining more experience.';
        } else {
            analysis = 'Significant development needed - recommend starting with foundational skills.';
        }

        return analysis;
    }

    // Peer Comparison and Benchmarking Methods
    async getPeerComparison(userId) {
        try {
            const userProfile = await this.getUserById(userId);
            if (!userProfile) {
                return { error: 'User not found' };
            }

            const userAssessments = await this.getAssessmentHistory(userId);
            if (userAssessments.length === 0) {
                return { error: 'Complete your career assessment to enable peer comparison' };
            }

            const userGamification = await this.getUserGamification(userId);
            const userSkillProgress = await this.getUserSkillProgress(userId);
            const userLearningProgress = await this.getUserLearningProgress(userId);

            // Get peer data for comparison
            const peerData = await this.getPeerData(userId);
            const userMetrics = await this.calculateUserMetrics(userId, userAssessments, userGamification, userSkillProgress, userLearningProgress);
            const peerMetrics = await this.calculatePeerMetrics(peerData, userMetrics.careerCategory);
            
            // Calculate percentile rankings
            const percentileRankings = this.calculatePercentileRankings(userMetrics, peerMetrics);
            
            // Generate insights and recommendations
            const insights = this.generatePeerInsights(userMetrics, peerMetrics, percentileRankings);
            const recommendations = this.generateBenchmarkRecommendations(userMetrics, peerMetrics, percentileRankings);

            return {
                success: true,
                userMetrics,
                peerMetrics,
                percentileRankings,
                insights,
                recommendations,
                comparisonData: {
                    totalPeers: peerData.length,
                    careerCategory: userMetrics.careerCategory,
                    lastUpdated: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Peer comparison error:', error);
            return { error: 'Failed to generate peer comparison' };
        }
    }

    async getPeerData(userId) {
        return new Promise((resolve, reject) => {
            // Get anonymized data from users with similar career interests
            const query = `
                SELECT 
                    u.id,
                    ar.career_scores,
                    ar.completed_at as assessment_date,
                    ug.total_xp,
                    ug.current_level,
                    ug.current_streak,
                    COUNT(DISTINCT ulp.id) as courses_completed,
                    AVG(usp.current_level) as avg_skill_level
                FROM users u
                LEFT JOIN assessment_results ar ON u.id = ar.user_id
                LEFT JOIN user_gamification ug ON u.id = ug.user_id
                LEFT JOIN user_learning_progress ulp ON u.id = ulp.user_id AND ulp.status = 'completed'
                LEFT JOIN user_skill_progress usp ON u.id = usp.user_id
                WHERE u.id != ? 
                    AND ar.id IS NOT NULL 
                    AND ar.completed_at >= datetime('now', '-6 months')
                GROUP BY u.id, ar.id
                ORDER BY ar.completed_at DESC
                LIMIT 200
            `;
            
            this.db.all(query, [userId], (err, peers) => {
                if (err) {
                    reject(err);
                } else {
                    // Parse career scores
                    peers.forEach(peer => {
                        if (peer.career_scores) {
                            peer.career_scores = JSON.parse(peer.career_scores);
                        }
                    });
                    resolve(peers);
                }
            });
        });
    }

    async calculateUserMetrics(userId, assessments, gamification, skillProgress, learningProgress) {
        const latestAssessment = assessments[0];
        const careerScores = latestAssessment.career_scores;
        
        // Determine primary career category
        const topCareer = Object.entries(careerScores)
            .sort(([,a], [,b]) => b - a)[0];
        
        const careerCategory = topCareer[0];
        const careerConfidence = topCareer[1];
        
        // Calculate various metrics
        const totalSkills = skillProgress.length;
        const avgSkillLevel = totalSkills > 0 ? 
            skillProgress.reduce((sum, skill) => sum + skill.current_level, 0) / totalSkills : 0;
        
        const completedCourses = learningProgress.filter(p => p.status === 'completed').length;
        const inProgressCourses = learningProgress.filter(p => p.status === 'in_progress').length;
        
        const totalLearningHours = skillProgress.reduce((sum, skill) => sum + skill.total_hours_spent, 0);
        
        // Engagement metrics
        const assessmentCount = assessments.length;
        const daysSinceLastAssessment = Math.floor(
            (new Date() - new Date(latestAssessment.completed_at)) / (1000 * 60 * 60 * 24)
        );
        
        return {
            userId,
            careerCategory,
            careerConfidence,
            totalXP: gamification.total_xp,
            currentLevel: gamification.current_level,
            currentStreak: gamification.current_streak,
            longestStreak: gamification.longest_streak,
            totalSkills,
            avgSkillLevel,
            completedCourses,
            inProgressCourses,
            totalLearningHours,
            assessmentCount,
            daysSinceLastAssessment,
            profileCompleteness: this.calculateProfileCompleteness(userId)
        };
    }

    async calculatePeerMetrics(peerData, careerCategory) {
        // Filter peers with similar career interests
        const relevantPeers = peerData.filter(peer => {
            if (!peer.career_scores) return false;
            const topCareer = Object.entries(peer.career_scores)
                .sort(([,a], [,b]) => b - a)[0];
            return topCareer && topCareer[0] === careerCategory;
        });
        
        if (relevantPeers.length === 0) {
            // Fallback to all peers if no similar career matches
            return this.calculateMetricsFromPeers(peerData);
        }
        
        return this.calculateMetricsFromPeers(relevantPeers);
    }

    calculateMetricsFromPeers(peers) {
        const metrics = {
            totalXP: [],
            currentLevel: [],
            currentStreak: [],
            coursesCompleted: [],
            avgSkillLevel: [],
            count: peers.length
        };
        
        peers.forEach(peer => {
            if (peer.total_xp !== null) metrics.totalXP.push(peer.total_xp);
            if (peer.current_level !== null) metrics.currentLevel.push(peer.current_level);
            if (peer.current_streak !== null) metrics.currentStreak.push(peer.current_streak);
            if (peer.courses_completed !== null) metrics.coursesCompleted.push(peer.courses_completed);
            if (peer.avg_skill_level !== null) metrics.avgSkillLevel.push(peer.avg_skill_level);
        });
        
        // Calculate statistics for each metric
        const calculateStats = (values) => {
            if (values.length === 0) return { min: 0, max: 0, avg: 0, median: 0, p25: 0, p75: 0 };
            
            const sorted = [...values].sort((a, b) => a - b);
            return {
                min: sorted[0],
                max: sorted[sorted.length - 1],
                avg: values.reduce((a, b) => a + b, 0) / values.length,
                median: sorted[Math.floor(sorted.length / 2)],
                p25: sorted[Math.floor(sorted.length * 0.25)],
                p75: sorted[Math.floor(sorted.length * 0.75)]
            };
        };
        
        return {
            totalXP: calculateStats(metrics.totalXP),
            currentLevel: calculateStats(metrics.currentLevel),
            currentStreak: calculateStats(metrics.currentStreak),
            coursesCompleted: calculateStats(metrics.coursesCompleted),
            avgSkillLevel: calculateStats(metrics.avgSkillLevel),
            count: metrics.count
        };
    }

    calculatePercentileRankings(userMetrics, peerMetrics) {
        const calculatePercentile = (userValue, peerStats) => {
            if (peerStats.max === peerStats.min) return 50; // If all peers have same value
            
            const percentile = ((userValue - peerStats.min) / (peerStats.max - peerStats.min)) * 100;
            return Math.max(0, Math.min(100, Math.round(percentile)));
        };
        
        return {
            totalXP: calculatePercentile(userMetrics.totalXP, peerMetrics.totalXP),
            currentLevel: calculatePercentile(userMetrics.currentLevel, peerMetrics.currentLevel),
            currentStreak: calculatePercentile(userMetrics.currentStreak, peerMetrics.currentStreak),
            completedCourses: calculatePercentile(userMetrics.completedCourses, peerMetrics.coursesCompleted),
            avgSkillLevel: calculatePercentile(userMetrics.avgSkillLevel, peerMetrics.avgSkillLevel)
        };
    }

    generatePeerInsights(userMetrics, peerMetrics, percentiles) {
        const insights = [];
        
        // XP insights
        if (percentiles.totalXP >= 80) {
            insights.push('🌟 You\'re in the top 20% for total experience points!');
        } else if (percentiles.totalXP <= 20) {
            insights.push('📈 Focus on completing more activities to boost your XP');
        }
        
        // Level insights
        if (percentiles.currentLevel >= 75) {
            insights.push('🎯 You\'re ahead of most peers in progression level');
        } else if (percentiles.currentLevel <= 25) {
            insights.push('🚀 Consistent daily activity can help you level up faster');
        }
        
        // Streak insights
        if (percentiles.currentStreak >= 70) {
            insights.push('🔥 Excellent learning consistency compared to peers!');
        } else if (percentiles.currentStreak <= 30) {
            insights.push('📅 Building a daily learning streak will accelerate your progress');
        }
        
        // Course completion insights
        if (percentiles.completedCourses >= 80) {
            insights.push('📚 You\'re completing courses faster than most peers');
        } else if (percentiles.completedCourses <= 20) {
            insights.push('🎓 Focus on completing courses to build practical skills');
        }
        
        // Skill level insights
        if (percentiles.avgSkillLevel >= 75) {
            insights.push('💪 Your skill development is ahead of the curve');
        } else if (percentiles.avgSkillLevel <= 25) {
            insights.push('🛠️ Invest more time in skill practice and development');
        }
        
        return insights.length > 0 ? insights : ['Keep up the great work! Your progress is on track.'];
    }

    generateBenchmarkRecommendations(userMetrics, peerMetrics, percentiles) {
        const recommendations = [];
        
        // Priority recommendations based on lowest percentiles
        const sortedPercentiles = Object.entries(percentiles)
            .sort(([,a], [,b]) => a - b)
            .slice(0, 3); // Top 3 areas for improvement
        
        sortedPercentiles.forEach(([metric, percentile]) => {
            if (percentile < 50) {
                switch (metric) {
                    case 'totalXP':
                        recommendations.push({
                            area: 'Experience Points',
                            action: 'Complete daily quizzes and learning activities',
                            impact: 'Boost your XP to match top performers',
                            target: `Aim for ${Math.round(peerMetrics.totalXP.p75)} XP`
                        });
                        break;
                    case 'currentLevel':
                        recommendations.push({
                            area: 'Progression Level',
                            action: 'Engage more consistently with platform activities',
                            impact: 'Reach higher levels faster',
                            target: `Target level ${Math.round(peerMetrics.currentLevel.p75)}`
                        });
                        break;
                    case 'currentStreak':
                        recommendations.push({
                            area: 'Learning Consistency',
                            action: 'Set a daily learning goal and stick to it',
                            impact: 'Build momentum and accelerate progress',
                            target: `Maintain ${Math.round(peerMetrics.currentStreak.p75)}-day streaks`
                        });
                        break;
                    case 'completedCourses':
                        recommendations.push({
                            area: 'Course Completion',
                            action: 'Focus on finishing started courses before beginning new ones',
                            impact: 'Build comprehensive skills systematically',
                            target: `Complete ${Math.round(peerMetrics.coursesCompleted.p75)} courses`
                        });
                        break;
                    case 'avgSkillLevel':
                        recommendations.push({
                            area: 'Skill Development',
                            action: 'Practice skills regularly and complete skill assessments',
                            impact: 'Reach job-ready proficiency levels',
                            target: `Average skill level of ${peerMetrics.avgSkillLevel.p75.toFixed(1)}`
                        });
                        break;
                }
            }
        });
        
        // If user is doing well, provide advancement recommendations
        if (recommendations.length === 0) {
            recommendations.push({
                area: 'Advanced Growth',
                action: 'Explore leadership opportunities and mentor others',
                impact: 'Become a top performer in your field',
                target: 'Join the top 10% of all users'
            });
        }
        
        return recommendations.slice(0, 3); // Limit to top 3 recommendations
    }

    calculateProfileCompleteness(userId) {
        // This would calculate based on profile data, assessment completion, etc.
        // For now, return a simulated value
        return Math.floor(Math.random() * 30) + 70; // 70-100%
    }

    // Get industry benchmarks
    async getIndustryBenchmarks(careerCategory) {
        try {
            // Simulated industry benchmarks (in real app, this would come from industry APIs)
            const benchmarks = {
                'tech': {
                    avgSalary: { entry: 75000, mid: 105000, senior: 155000 },
                    skillRequirements: ['Programming', 'Problem Solving', 'Software Design'],
                    avgExperience: { entry: '0-2 years', mid: '3-5 years', senior: '6+ years' },
                    jobGrowth: '22% (Much faster than average)',
                    popularSkills: ['JavaScript', 'Python', 'React', 'Node.js', 'SQL'],
                    certifications: ['AWS Certified', 'Google Cloud Professional', 'Microsoft Azure']
                },
                'healthcare': {
                    avgSalary: { entry: 65000, mid: 90000, senior: 125000 },
                    skillRequirements: ['Patient Care', 'Medical Knowledge', 'Communication'],
                    avgExperience: { entry: '0-1 years', mid: '2-5 years', senior: '6+ years' },
                    jobGrowth: '13% (Much faster than average)',
                    popularSkills: ['Clinical Skills', 'Patient Assessment', 'Medical Records'],
                    certifications: ['BLS', 'ACLS', 'Specialty Certifications']
                },
                'business': {
                    avgSalary: { entry: 60000, mid: 90000, senior: 140000 },
                    skillRequirements: ['Analysis', 'Communication', 'Project Management'],
                    avgExperience: { entry: '0-2 years', mid: '3-5 years', senior: '6+ years' },
                    jobGrowth: '11% (Much faster than average)',
                    popularSkills: ['Excel', 'SQL', 'Business Analysis', 'Project Management'],
                    certifications: ['PMP', 'CBAP', 'Six Sigma']
                },
                'creative': {
                    avgSalary: { entry: 45000, mid: 70000, senior: 110000 },
                    skillRequirements: ['Creativity', 'Design Software', 'Visual Communication'],
                    avgExperience: { entry: '0-2 years', mid: '3-5 years', senior: '6+ years' },
                    jobGrowth: '8% (As fast as average)',
                    popularSkills: ['Adobe Creative Suite', 'UX/UI Design', 'Figma', 'Sketch'],
                    certifications: ['Adobe Certified Expert', 'UX Certification']
                }
            };
            
            return benchmarks[careerCategory] || benchmarks['business'];
        } catch (error) {
            console.error('Industry benchmarks error:', error);
            return null;
        }
    }
    
    // Career Report Generation Methods
    async generateCareerReport(userId, reportType = 'comprehensive') {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                return { error: 'User not found' };
            }
    
            const assessments = await this.getAssessmentHistory(userId);
            if (assessments.length === 0) {
                return { error: 'Complete your career assessment to generate a report' };
            }
    
            // Gather all user data
            const userData = {
                profile: user,
                assessments,
                gamification: await this.getUserGamification(userId),
                skillProgress: await this.getUserSkillProgress(userId),
                learningProgress: await this.getUserLearningProgress(userId),
                learningPaths: await this.getUserLearningPaths(userId),
                enhancedPredictions: await this.getEnhancedCareerPredictions(userId),
                peerComparison: await this.getPeerComparison(userId)
            };
    
            // Generate report based on type
            let report;
            switch (reportType) {
                case 'assessment':
                    report = await this.generateAssessmentReport(userData);
                    break;
                case 'progress':
                    report = await this.generateProgressReport(userData);
                    break;
                case 'predictions':
                    report = await this.generatePredictionsReport(userData);
                    break;
                case 'comprehensive':
                default:
                    report = await this.generateComprehensiveReport(userData);
                    break;
            }
    
            // Add metadata
            report.metadata = {
                reportId: require('crypto').randomBytes(16).toString('hex'),
                userId,
                reportType,
                generatedAt: new Date().toISOString(),
                generatedBy: 'MindMate Analytics Engine',
                version: '1.0',
                totalPages: this.calculateReportPages(report)
            };
    
            return {
                success: true,
                report
            };
        } catch (error) {
            console.error('Career report generation error:', error);
            return { error: 'Failed to generate career report' };
        }
    }
    
    async generateComprehensiveReport(userData) {
        const latestAssessment = userData.assessments[0];
        const careerScores = latestAssessment.career_scores;
        const topCareers = Object.entries(careerScores)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
    
        return {
            title: 'Comprehensive Career Analysis Report',
            sections: {
                executiveSummary: {
                    title: 'Executive Summary',
                    content: {
                        overview: this.generateExecutiveSummary(userData),
                        keyFindings: this.generateKeyFindings(userData),
                        recommendations: this.generateTopRecommendations(userData)
                    }
                },
                assessmentResults: {
                    title: 'Career Assessment Results',
                    content: {
                        personalityProfile: this.analyzePersonalityProfile(latestAssessment),
                        careerMatches: topCareers.map(([career, score]) => ({
                            career: this.formatCareerName(career),
                            score: Math.round(score),
                            alignment: this.getAlignmentDescription(score),
                            details: this.getCareerDetails(career)
                        })),
                        strengthsWeaknesses: this.analyzeStrengthsWeaknesses(latestAssessment)
                    }
                },
                skillsAnalysis: {
                    title: 'Skills & Development Analysis',
                    content: {
                        currentSkills: this.analyzeCurrentSkills(userData.skillProgress),
                        skillGaps: this.identifySkillGaps(userData.skillProgress, topCareers),
                        learningProgress: this.analyzeLearningProgress(userData.learningProgress),
                        developmentPlan: this.createDevelopmentPlan(userData)
                    }
                },
                careerPredictions: {
                    title: 'Career Success Predictions',
                    content: {
                        predictions: userData.enhancedPredictions.predictions || [],
                        successFactors: this.analyzeSuccessFactors(userData.enhancedPredictions),
                        timelineProjection: this.generateTimelineProjection(userData.enhancedPredictions),
                        riskAssessment: this.assessCareerRisks(userData)
                    }
                },
                marketAnalysis: {
                    title: 'Market & Industry Analysis',
                    content: {
                        industryTrends: this.getIndustryTrends(topCareers),
                        salaryProjections: this.generateSalaryProjections(topCareers),
                        jobMarketOutlook: this.analyzeJobMarketOutlook(topCareers),
                        competitiveAnalysis: this.generateCompetitiveAnalysis(userData)
                    }
                },
                peerComparison: {
                    title: 'Peer Benchmarking',
                    content: {
                        performanceMetrics: userData.peerComparison.percentileRankings || {},
                        strengths: this.identifyRelativeStrengths(userData.peerComparison),
                        improvementAreas: this.identifyImprovementAreas(userData.peerComparison),
                        benchmarkInsights: userData.peerComparison.insights || []
                    }
                },
                actionPlan: {
                    title: 'Personalized Action Plan',
                    content: {
                        immediateActions: this.generateImmediateActions(userData),
                        shortTermGoals: this.generateShortTermGoals(userData),
                        longTermStrategy: this.generateLongTermStrategy(userData),
                        resourceRecommendations: this.recommendResources(userData)
                    }
                },
                appendices: {
                    title: 'Appendices',
                    content: {
                        methodology: this.getMethodologyDescription(),
                        dataSourcesDisclaimer: this.getDataSourcesDisclaimer(),
                        careerProfiles: this.getDetailedCareerProfiles(topCareers)
                    }
                }
            }
        };
    }
    
    async generateAssessmentReport(userData) {
        const latestAssessment = userData.assessments[0];
        
        return {
            title: 'Career Assessment Report',
            sections: {
                assessmentOverview: {
                    title: 'Assessment Overview',
                    content: {
                        completionDate: latestAssessment.completed_at,
                        assessmentType: 'Comprehensive Career Assessment',
                        questionsAnswered: Object.keys(latestAssessment.quiz_answers).length,
                        timeSpent: this.calculateAssessmentTime(latestAssessment)
                    }
                },
                personalityProfile: {
                    title: 'Personality Profile',
                    content: this.analyzePersonalityProfile(latestAssessment)
                },
                careerRecommendations: {
                    title: 'Career Recommendations',
                    content: this.generateCareerRecommendations(latestAssessment)
                },
                nextSteps: {
                    title: 'Recommended Next Steps',
                    content: this.generateAssessmentNextSteps(userData)
                }
            }
        };
    }
    
    async generateProgressReport(userData) {
        return {
            title: 'Learning Progress Report',
            sections: {
                progressOverview: {
                    title: 'Progress Overview',
                    content: {
                        totalXP: userData.gamification.total_xp,
                        currentLevel: userData.gamification.current_level,
                        coursesCompleted: userData.learningProgress.filter(p => p.status === 'completed').length,
                        skillsAcquired: userData.skillProgress.filter(s => s.current_level > 0).length,
                        learningStreak: userData.gamification.current_streak
                    }
                },
                skillsDevelopment: {
                    title: 'Skills Development',
                    content: this.analyzeSkillsDevelopment(userData.skillProgress)
                },
                learningActivities: {
                    title: 'Learning Activities',
                    content: this.analyzeLearningActivities(userData.learningProgress)
                },
                gamificationAchievements: {
                    title: 'Achievements & Milestones',
                    content: this.analyzeGamificationProgress(userData.gamification)
                }
            }
        };
    }
    
    async generatePredictionsReport(userData) {
        return {
            title: 'Career Predictions Report',
            sections: {
                predictionsOverview: {
                    title: 'Predictions Overview',
                    content: userData.enhancedPredictions
                },
                successFactors: {
                    title: 'Success Factors Analysis',
                    content: this.analyzeSuccessFactors(userData.enhancedPredictions)
                },
                careerTimelines: {
                    title: 'Career Development Timelines',
                    content: this.generateCareerTimelines(userData.enhancedPredictions)
                },
                actionableInsights: {
                    title: 'Actionable Insights',
                    content: this.generateActionableInsights(userData)
                }
            }
        };
    }
    
    // Helper methods for report generation
    generateExecutiveSummary(userData) {
        const latestAssessment = userData.assessments[0];
        const topCareer = Object.entries(latestAssessment.career_scores)
            .sort(([,a], [,b]) => b - a)[0];
        
        return `Based on comprehensive analysis of your career assessment, skills, and learning progress, 
               you show strong alignment with ${this.formatCareerName(topCareer[0])} careers. 
               Your current skill level and learning momentum indicate ${this.getSuccessLikelihood(userData)} 
               likelihood of success in your target career path. Key areas for development include 
               ${this.getTopDevelopmentAreas(userData).join(', ')}.`;
    }
    
    generateKeyFindings(userData) {
        return [
            `Primary career strength: ${this.getPrimaryStrength(userData)}`,
            `Skill readiness level: ${this.getSkillReadinessLevel(userData)}%`,
            `Learning engagement: ${this.getLearningEngagementLevel(userData)}`,
            `Peer comparison ranking: Top ${this.getPeerRanking(userData)}%`
        ];
    }
    
    generateTopRecommendations(userData) {
        return [
            'Focus on completing current learning paths to build foundational skills',
            'Engage with industry professionals through networking opportunities',
            'Consider pursuing relevant certifications to enhance credibility',
            'Develop practical experience through projects or internships'
        ];
    }
    
    analyzePersonalityProfile(assessment) {
        const answers = assessment.quiz_answers;
        
        return {
            workStyle: this.analyzeWorkStyle(answers),
            motivationFactors: this.analyzeMotivationFactors(answers),
            problemSolvingApproach: this.analyzeProblemSolvingApproach(answers),
            learningPreferences: this.analyzeLearningPreferences(answers)
        };
    }
    
    calculateReportPages(report) {
        // Estimate pages based on content length
        let totalContent = 0;
        
        const countContent = (obj) => {
            if (typeof obj === 'string') {
                totalContent += obj.length;
            } else if (Array.isArray(obj)) {
                obj.forEach(countContent);
            } else if (typeof obj === 'object' && obj !== null) {
                Object.values(obj).forEach(countContent);
            }
        };
        
        countContent(report.sections);
        
        // Estimate roughly 2000 characters per page
        return Math.max(1, Math.ceil(totalContent / 2000));
    }
    
    // Additional helper methods (simplified implementations)
    getSuccessLikelihood(userData) { return 'high'; }
    getTopDevelopmentAreas(userData) { return ['Technical Skills', 'Leadership']; }
    getPrimaryStrength(userData) { return 'Analytical thinking'; }
    getSkillReadinessLevel(userData) { return 75; }
    getLearningEngagementLevel(userData) { return 'High'; }
    getPeerRanking(userData) { return 25; }
    analyzeWorkStyle(answers) { return 'Collaborative and analytical'; }
    analyzeMotivationFactors(answers) { return 'Impact-driven with growth mindset'; }
    analyzeProblemSolvingApproach(answers) { return 'Systematic and research-oriented'; }
    analyzeLearningPreferences(answers) { return 'Hands-on learning with structured guidance'; }
    calculateAssessmentTime(assessment) { return '15-20 minutes'; }

// Smart Mentor-Mentee Matching Algorithm
async getSmartMentorMatches(userId, preferences = {}) {
    try {
        const user = await this.getUserById(userId);
        if (!user) {
            return { error: 'User not found' };
        }

        // Get user's assessment and profile data
        const userAssessments = await this.getAssessmentHistory(userId);
        const userSkills = await this.getUserSkillProgress(userId);
        const userGamification = await this.getUserGamification(userId);
        
        if (userAssessments.length === 0) {
            return { error: 'Complete your career assessment to get personalized mentor matches' };
        }

        const latestAssessment = userAssessments[0];
        const careerScores = latestAssessment.career_scores;
        const primaryCareer = Object.entries(careerScores)
            .sort(([,a], [,b]) => b - a)[0][0];

        // Get all available mentors
        const mentors = await this.findMentors('', []);
        
        if (mentors.length === 0) {
            return { mentors: [], message: 'No mentors available at this time' };
        }

        // Calculate match scores for each mentor
        const mentorMatches = [];
        
        for (const mentor of mentors) {
            const matchScore = await this.calculateMentorMatchScore({
                userId,
                userProfile: {
                    primaryCareer,
                    skills: userSkills,
                    careerScores,
                    assessment: latestAssessment,
                    gamification: userGamification
                }
            }, mentor, preferences);
            
            if (matchScore.totalScore > 0.3) { // Minimum threshold
                mentorMatches.push({
                    ...mentor,
                    matchScore: matchScore.totalScore,
                    matchFactors: matchScore.factors,
                    matchReasons: matchScore.reasons,
                    compatibility: this.getCompatibilityLevel(matchScore.totalScore)
                });
            }
        }

        // Sort by match score (highest first)
        mentorMatches.sort((a, b) => b.matchScore - a.matchScore);

        return {
            success: true,
            matches: mentorMatches.slice(0, 10), // Top 10 matches
            totalMatches: mentorMatches.length,
            userProfile: {
                primaryCareer: this.formatCareerName(primaryCareer),
                skillsCount: userSkills.length,
                experienceLevel: this.determineExperienceLevel(userGamification, userSkills)
            },
            matchingCriteria: this.getMatchingCriteria()
        };
    } catch (error) {
        console.error('Smart mentor matching error:', error);
        return { error: 'Failed to find mentor matches' };
    }
}

async calculateMentorMatchScore(userContext, mentor, preferences) {
    const factors = {
        careerAlignment: 0,
        skillMatch: 0,
        experienceGap: 0,
        availabilityMatch: 0,
        personalityFit: 0,
        goalAlignment: 0
    };
    
    const reasons = [];
    
    // 1. Career Field Alignment (30%)
    const careerAlignmentScore = this.calculateCareerAlignment(
        userContext.userProfile.primaryCareer, 
        mentor.career_field
    );
    factors.careerAlignment = careerAlignmentScore;
    
    if (careerAlignmentScore > 0.8) {
        reasons.push('Strong career field alignment');
    } else if (careerAlignmentScore > 0.5) {
        reasons.push('Good career field overlap');
    }

    // 2. Skill Complementarity (25%)
    const skillMatchScore = this.calculateSkillMatch(
        userContext.userProfile.skills,
        mentor.skills_offered,
        preferences.targetSkills || []
    );
    factors.skillMatch = skillMatchScore;
    
    if (skillMatchScore > 0.7) {
        reasons.push('Excellent skill teaching match');
    }

    // 3. Experience Gap Appropriateness (20%)
    const experienceGapScore = this.calculateExperienceGap(
        userContext.userProfile.gamification,
        mentor.experience_level
    );
    factors.experienceGap = experienceGapScore;
    
    if (experienceGapScore > 0.8) {
        reasons.push('Perfect experience level match');
    }

    // 4. Availability Match (10%)
    const availabilityScore = this.calculateAvailabilityMatch(
        preferences.availability || 'flexible',
        mentor.availability
    );
    factors.availabilityMatch = availabilityScore;

    // 5. Personality Compatibility (10%)
    const personalityScore = this.calculatePersonalityFit(
        userContext.userProfile.assessment,
        mentor
    );
    factors.personalityFit = personalityScore;

    // 6. Goal Alignment (5%)
    const goalScore = this.calculateGoalAlignment(
        userContext.userProfile.careerScores,
        mentor
    );
    factors.goalAlignment = goalScore;

    // Calculate weighted total score
    const weights = {
        careerAlignment: 0.30,
        skillMatch: 0.25,
        experienceGap: 0.20,
        availabilityMatch: 0.10,
        personalityFit: 0.10,
        goalAlignment: 0.05
    };

    const totalScore = Object.entries(factors).reduce((sum, [factor, score]) => {
        return sum + (score * weights[factor]);
    }, 0);

    // Add bonus points for special criteria
    let bonusScore = 0;
    if (mentor.skills_offered.length >= 5) {
        bonusScore += 0.05;
        reasons.push('Offers many valuable skills');
    }
    
    if (mentor.bio && mentor.bio.length > 100) {
        bonusScore += 0.03;
        reasons.push('Detailed mentor profile');
    }
    
    if (mentor.linkedin_url) {
        bonusScore += 0.02;
        reasons.push('Professional LinkedIn presence');
    }

    return {
        totalScore: Math.min(1.0, totalScore + bonusScore),
        factors,
        reasons: reasons.slice(0, 3) // Top 3 reasons
    };
}

calculateCareerAlignment(userCareer, mentorCareerField) {
    if (!mentorCareerField) return 0.3; // Default moderate score
    
    const userCareerFormatted = this.formatCareerName(userCareer).toLowerCase();
    const mentorField = mentorCareerField.toLowerCase();
    
    // Exact match
    if (userCareerFormatted.includes(mentorField) || mentorField.includes(userCareerFormatted)) {
        return 1.0;
    }
    
    // Related field matching
    const relatedFields = {
        'software': ['tech', 'developer', 'programming', 'engineering', 'computer'],
        'data': ['analytics', 'science', 'scientist', 'analysis', 'statistics'],
        'business': ['management', 'analyst', 'consulting', 'strategy', 'operations'],
        'design': ['creative', 'ui', 'ux', 'visual', 'graphic', 'product'],
        'marketing': ['advertising', 'promotion', 'brand', 'digital', 'social media'],
        'healthcare': ['medical', 'nursing', 'therapy', 'clinical', 'wellness'],
        'finance': ['banking', 'investment', 'accounting', 'financial', 'economics']
    };
    
    for (const [category, keywords] of Object.entries(relatedFields)) {
        const userMatch = keywords.some(keyword => userCareerFormatted.includes(keyword));
        const mentorMatch = keywords.some(keyword => mentorField.includes(keyword));
        
        if (userMatch && mentorMatch) {
            return 0.8; // High related field match
        }
    }
    
    // Broader category matching
    const broadCategories = {
        'technical': ['software', 'data', 'tech', 'engineering', 'developer'],
        'business': ['business', 'management', 'consulting', 'finance', 'marketing'],
        'creative': ['design', 'creative', 'art', 'media', 'content'],
        'service': ['healthcare', 'education', 'social', 'non-profit']
    };
    
    for (const keywords of Object.values(broadCategories)) {
        const userMatch = keywords.some(keyword => userCareerFormatted.includes(keyword));
        const mentorMatch = keywords.some(keyword => mentorField.includes(keyword));
        
        if (userMatch && mentorMatch) {
            return 0.6; // Moderate category match
        }
    }
    
    return 0.3; // Low alignment
}

calculateSkillMatch(userSkills, mentorSkillsOffered, targetSkills) {
    if (!mentorSkillsOffered || mentorSkillsOffered.length === 0) return 0.2;
    
    const mentorSkills = mentorSkillsOffered.map(skill => skill.toLowerCase());
    const userSkillNames = userSkills.map(skill => skill.name?.toLowerCase() || '').filter(Boolean);
    
    let matchScore = 0;
    let matchedSkills = 0;
    
    // Check for skills user wants to learn (gap analysis)
    const skillGaps = userSkills.filter(skill => skill.current_level < 3); // Skills below intermediate
    const gapSkillNames = skillGaps.map(skill => skill.name?.toLowerCase() || '').filter(Boolean);
    
    // Match mentor skills with user's skill gaps (high priority)
    for (const gapSkill of gapSkillNames) {
        if (mentorSkills.some(mSkill => mSkill.includes(gapSkill) || gapSkill.includes(mSkill))) {
            matchScore += 0.3; // High weight for filling gaps
            matchedSkills++;
        }
    }
    
    // Match with target skills specified by user
    for (const targetSkill of targetSkills) {
        const target = targetSkill.toLowerCase();
        if (mentorSkills.some(mSkill => mSkill.includes(target) || target.includes(mSkill))) {
            matchScore += 0.25;
            matchedSkills++;
        }
    }
    
    // Bonus for mentor having many relevant skills
    const relevantSkillsCount = Math.min(5, mentorSkills.length);
    matchScore += (relevantSkillsCount / 5) * 0.2;
    
    return Math.min(1.0, matchScore);
}

calculateExperienceGap(userGamification, mentorExperienceLevel) {
    const userLevel = userGamification.current_level || 1;
    const userXP = userGamification.total_xp || 0;
    
    // Determine user's experience level
    let userExperience = 'beginner';
    if (userLevel >= 10 && userXP >= 5000) {
        userExperience = 'advanced';
    } else if (userLevel >= 5 && userXP >= 2000) {
        userExperience = 'intermediate';
    }
    
    const mentorExp = (mentorExperienceLevel || '').toLowerCase();
    
    // Optimal mentor-mentee experience gaps
    const optimalPairs = {
        'beginner': ['intermediate', 'experienced', 'senior'],
        'intermediate': ['experienced', 'senior', 'expert'],
        'advanced': ['senior', 'expert', 'executive']
    };
    
    const idealMentorLevels = optimalPairs[userExperience] || ['experienced'];
    
    // Check for optimal gap
    for (const idealLevel of idealMentorLevels) {
        if (mentorExp.includes(idealLevel)) {
            return 1.0; // Perfect gap
        }
    }
    
    // Check for acceptable gaps
    if (userExperience === 'beginner' && mentorExp.includes('junior')) {
        return 0.6; // Smaller gap but still helpful
    }
    
    if (userExperience === 'advanced' && mentorExp.includes('experienced')) {
        return 0.8; // Good match
    }
    
    return 0.4; // Default moderate score
}

calculateAvailabilityMatch(userPreference, mentorAvailability) {
    if (!mentorAvailability) return 0.5;
    
    const userPref = (userPreference || '').toLowerCase();
    const mentorAvail = mentorAvailability.toLowerCase();
    
    // Exact matches
    if (userPref === mentorAvail) return 1.0;
    
    // Flexible matching
    if (userPref.includes('flexible') || mentorAvail.includes('flexible')) {
        return 0.9;
    }
    
    // Time-based matching
    const timeMatches = {
        'weekends': ['saturday', 'sunday', 'weekend'],
        'evenings': ['evening', 'night', 'after work'],
        'mornings': ['morning', 'early', 'before work'],
        'weekdays': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'weekday']
    };
    
    for (const [timeType, keywords] of Object.entries(timeMatches)) {
        const userMatch = keywords.some(keyword => userPref.includes(keyword));
        const mentorMatch = keywords.some(keyword => mentorAvail.includes(keyword));
        
        if (userMatch && mentorMatch) {
            return 0.8;
        }
    }
    
    return 0.5; // Neutral if no clear match
}

calculatePersonalityFit(userAssessment, mentor) {
    // Simplified personality matching based on assessment data
    const answers = userAssessment.quiz_answers;
    
    let fitScore = 0.5; // Default neutral
    
    // Work style compatibility
    if (answers.workStyle) {
        // Extract work style preferences
        const workStyleIndicators = answers.workStyle;
        
        // Mentors with collaborative style match well with team-oriented mentees
        if (workStyleIndicators.some && workStyleIndicators.some(style => 
            typeof style === 'object' && style.weight && style.weight.collaborative > 0)) {
            fitScore += 0.2;
        }
    }
    
    // Learning style compatibility
    if (answers.learningStyle) {
        // Match learning preferences with mentor's likely teaching style
        const learningStyle = answers.learningStyle;
        if (learningStyle === 'discussion' || learningStyle === 'hands_on') {
            fitScore += 0.2; // Good for mentorship
        }
    }
    
    // Communication style (inferred from personality type)
    if (answers.personalityType) {
        const personalityType = answers.personalityType;
        if (personalityType === 'mingle' || personalityType === 'deep') {
            fitScore += 0.15; // Good communication styles for mentorship
        }
    }
    
    return Math.min(1.0, fitScore);
}

calculateGoalAlignment(userCareerScores, mentor) {
    // Simple goal alignment based on career focus
    const mentorField = (mentor.career_field || '').toLowerCase();
    
    // Check if mentor's field aligns with user's top career interests
    const topCareers = Object.entries(userCareerScores)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([career]) => career.toLowerCase());
    
    for (const topCareer of topCareers) {
        if (mentorField.includes(topCareer) || topCareer.includes(mentorField)) {
            return 1.0;
        }
    }
    
    return 0.3; // Default low alignment
}

getCompatibilityLevel(matchScore) {
    if (matchScore >= 0.8) return 'Excellent';
    if (matchScore >= 0.7) return 'Very Good';
    if (matchScore >= 0.6) return 'Good';
    if (matchScore >= 0.5) return 'Fair';
    return 'Poor';
}

determineExperienceLevel(gamification, skills) {
    const level = gamification.current_level || 1;
    const xp = gamification.total_xp || 0;
    const avgSkillLevel = skills.length > 0 ? 
        skills.reduce((sum, skill) => sum + skill.current_level, 0) / skills.length : 0;
    
    if (level >= 10 && xp >= 5000 && avgSkillLevel >= 3) {
        return 'Advanced';
    } else if (level >= 5 && xp >= 2000 && avgSkillLevel >= 2) {
        return 'Intermediate';
    }
    return 'Beginner';
}

getMatchingCriteria() {
    return {
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
    };
}

// Enhanced mentorship request with smart matching data
async createSmartMentorshipRequest(menteeId, mentorId, message, matchData = {}) {
    try {
        const matchId = uuidv4();
        
        // Calculate match score if not provided
        let matchScore = matchData.matchScore || 0;
        if (matchScore === 0) {
            const userMatches = await this.getSmartMentorMatches(menteeId);
            const mentorMatch = userMatches.matches?.find(m => m.user_id === mentorId);
            matchScore = mentorMatch?.matchScore || 0.5;
        }
        
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO mentorship_matches 
                 (id, mentor_id, mentee_id, status, match_score, message) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [matchId, mentorId, menteeId, 'pending', matchScore, message],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            matchId,
                            matchScore,
                            status: 'pending',
                            message: 'Mentorship request sent successfully'
                        });
                    }
                }
            );
        });
    } catch (error) {
        console.error('Smart mentorship request error:', error);
        return { error: 'Failed to create mentorship request' };
    }
}

// Get mentorship recommendations based on user activity and progress
async getMentorshipRecommendations(userId) {
    try {
        const user = await this.getUserById(userId);
        if (!user) return { error: 'User not found' };
        
        const userSkills = await this.getUserSkillProgress(userId);
        const userAssessments = await this.getAssessmentHistory(userId);
        const userGamification = await this.getUserGamification(userId);
        
        const recommendations = [];
        
        // Recommendation based on skill gaps
        const skillGaps = userSkills.filter(skill => skill.current_level < 2);
        if (skillGaps.length > 0) {
            recommendations.push({
                type: 'skill_development',
                priority: 'high',
                title: 'Accelerate Skill Development',
                description: `You have ${skillGaps.length} skills that could benefit from mentorship`,
                action: 'Find mentors who specialize in these areas',
                suggestedSkills: skillGaps.slice(0, 3).map(skill => skill.name)
            });
        }
        
        // Recommendation based on career transition
        if (userAssessments.length > 1) {
            const oldAssessment = userAssessments[1];
            const newAssessment = userAssessments[0];
            
            const oldTopCareer = Object.entries(oldAssessment.career_scores)
                .sort(([,a], [,b]) => b - a)[0][0];
            const newTopCareer = Object.entries(newAssessment.career_scores)
                .sort(([,a], [,b]) => b - a)[0][0];
            
            if (oldTopCareer !== newTopCareer) {
                recommendations.push({
                    type: 'career_transition',
                    priority: 'high',
                    title: 'Career Transition Support',
                    description: `Your career interests have shifted toward ${this.formatCareerName(newTopCareer)}`,
                    action: 'Connect with mentors who have made similar transitions',
                    targetCareer: this.formatCareerName(newTopCareer)
                });
            }
        }
        
        // Recommendation based on experience level
        const experienceLevel = this.determineExperienceLevel(userGamification, userSkills);
        if (experienceLevel === 'Intermediate') {
            recommendations.push({
                type: 'advancement',
                priority: 'medium',
                title: 'Advance to Senior Level',
                description: 'You\'re ready for senior-level guidance and leadership development',
                action: 'Find senior mentors in your field',
                focusAreas: ['Leadership', 'Strategic Thinking', 'Team Management']
            });
        }
        
        return {
            success: true,
            recommendations,
            userProfile: {
                experienceLevel,
                skillsCount: userSkills.length,
                strongestAreas: this.getStrongestSkillAreas(userSkills)
            }
        };
    } catch (error) {
        console.error('Mentorship recommendations error:', error);
        return { error: 'Failed to generate recommendations' };
    }
}

getStrongestSkillAreas(userSkills) {
    return userSkills
        .filter(skill => skill.current_level >= 3)
        .sort((a, b) => b.current_level - a.current_level)
        .slice(0, 3)
        .map(skill => skill.name);
}

    // Utility method to close database connection
    close() {
        this.db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('Database connection closed');
            }
        });
    }
}

export default Database;