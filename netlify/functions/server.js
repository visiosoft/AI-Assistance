import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import { fileURLToPath } from 'url';
import path from 'path';
import connectDB from '../../src/config/database.js';
import Message from '../../src/models/Message.js';
import AIPrompt from '../../src/models/AIPrompt.js';
import adminRoutes from '../../src/routes/admin.js';
import serverless from 'serverless-http';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware - use memory store for serverless
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NETLIFY === 'true', // Use secure cookies in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
    }
}));

// Connect to MongoDB
let dbConnected = false;
const connectDBOnce = async () => {
    if (!dbConnected) {
        try {
            await connectDB();
            dbConnected = true;
        } catch (err) {
            console.error('❌ MongoDB connection error:', err);
        }
    }
};

// Initialize DB connection
connectDBOnce();

// Admin routes
app.use('/api/admin', adminRoutes);

// API Routes
app.get('/api/health', async (req, res) => {
    await connectDBOnce();
    res.json({ 
        status: 'healthy',
        database: dbConnected ? 'connected' : 'connecting',
        timestamp: new Date().toISOString()
    });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        await connectDBOnce();
        const { message } = req.body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Save user message to database
        const userMessage = new Message({
            role: 'user',
            content: message.trim()
        });
        await userMessage.save();

        // Get AI prompt from database
        const aiPromptDoc = await AIPrompt.getPrompt();
        const aiPrompt = aiPromptDoc ? aiPromptDoc.prompt : null;

        // TODO: Integrate with AI service (OpenAI, etc.) using the prompt
        // For now, return a simple response that acknowledges the prompt
        const botResponse = generateResponse(message, aiPrompt);

        // Save bot response to database
        const botMessage = new Message({
            role: 'bot',
            content: botResponse
        });
        await botMessage.save();

        res.json({ response: botResponse });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Simple response generator (replace with actual AI integration)
function generateResponse(userMessage, aiPrompt) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Use the AI prompt from database if available
    const promptPrefix = aiPrompt ? `${aiPrompt} ` : '';
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
        return `${promptPrefix}Hello! How can I assist you today?`;
    } else if (lowerMessage.includes('help')) {
        return `${promptPrefix}I'm here to help! What would you like to know?`;
    } else if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
        return 'Goodbye! Have a great day!';
    } else {
        return `${promptPrefix}I understand you said: "${userMessage}". This is a basic response. You can integrate this with an AI service like OpenAI, Anthropic, or others for more intelligent responses.`;
    }
}

// Export serverless handler
export const handler = serverless(app);

