import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import { fileURLToPath } from 'url';
import path from 'path';
import { IncomingMessage, ServerResponse } from 'http';
import connectDB from '../../src/config/database.js';
import Message from '../../src/models/Message.js';
import AIPrompt from '../../src/models/AIPrompt.js';
import adminRoutes from '../../src/routes/admin.js';

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

// Convert Netlify Function event to Express request/response
function createRequestResponse(event) {
    const { httpMethod, path, queryStringParameters, headers, body, isBase64Encoded } = event;
    
    // Parse body
    let parsedBody = {};
    if (body) {
        try {
            parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
        } catch (e) {
            parsedBody = body;
        }
    }
    
    // Create mock request object
    const req = Object.create(IncomingMessage.prototype);
    req.method = httpMethod;
    req.url = path;
    req.path = path;
    req.query = queryStringParameters || {};
    req.headers = headers || {};
    req.body = parsedBody;
    req.ip = headers['x-forwarded-for'] || headers['x-real-ip'] || '127.0.0.1';
    req.connection = { remoteAddress: req.ip };
    
    // Create mock response object
    const res = Object.create(ServerResponse.prototype);
    let statusCode = 200;
    let responseHeaders = {};
    let responseBody = '';
    
    res.status = function(code) {
        statusCode = code;
        return res;
    };
    
    res.json = function(data) {
        responseBody = JSON.stringify(data);
        responseHeaders['Content-Type'] = 'application/json';
        return res;
    };
    
    res.send = function(data) {
        if (typeof data === 'object') {
            responseBody = JSON.stringify(data);
            responseHeaders['Content-Type'] = 'application/json';
        } else {
            responseBody = data;
            responseHeaders['Content-Type'] = 'text/html';
        }
        return res;
    };
    
    res.setHeader = function(key, value) {
        responseHeaders[key] = value;
        return res;
    };
    
    res.getHeader = function(key) {
        return responseHeaders[key];
    };
    
    res.cookie = function(name, value, options = {}) {
        let cookie = `${name}=${value}`;
        if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`;
        if (options.httpOnly) cookie += '; HttpOnly';
        if (options.secure) cookie += '; Secure';
        if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
        if (options.path) cookie += `; Path=${options.path}`;
        
        const existing = responseHeaders['Set-Cookie'] || [];
        responseHeaders['Set-Cookie'] = Array.isArray(existing) 
            ? [...existing, cookie] 
            : [existing, cookie];
        return res;
    };
    
    res.end = function(data) {
        if (data) responseBody = data;
        return res;
    };
    
    // Store response data
    res._statusCode = () => statusCode;
    res._headers = () => responseHeaders;
    res._body = () => responseBody;
    
    return { req, res, getResponse: () => ({ statusCode, headers: responseHeaders, body: responseBody }) };
}

// Export handler for Netlify Functions
export const handler = async (event, context) => {
    // Ensure DB connection before handling request
    await connectDBOnce();
    
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': event.headers?.origin || '*',
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
            body: '',
        };
    }
    
    // Create request/response objects
    const { req, res, getResponse } = createRequestResponse(event);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', event.headers?.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Process through Express app
    return new Promise((resolve) => {
        app(req, res, () => {
            const response = getResponse();
            resolve({
                statusCode: response.statusCode,
                headers: response.headers,
                body: response.body,
            });
        });
    });
};

