import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import session from 'express-session';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import connectDB from './config/database.js';
import Message from './models/Message.js';
import AIPrompt from './models/AIPrompt.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// CORS configuration - allow all origins for n8n and other integrations
app.use(cors({
    origin: '*', // Allow all origins for public API access
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: false // Set to false when using origin: '*'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle preflight requests
app.options('*', cors());

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Admin routes
app.use('/api/admin', adminRoutes);

// Connect to MongoDB
connectDB().catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

// Get user profiles endpoint (public API - for testing)
// Query params: ?incomingPhone=xxx (optional - filter by phone)
// Returns all profiles or filtered by phone if provided
app.get('/api/user-profiles', cors(), async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const UserProfiles = db.collection('UserProfiles');
    
    const { incomingPhone } = req.query;
    
    // Build query - filter by phone if provided
    const query = incomingPhone ? { incomingPhone } : {};
    
    // Get profiles
    const profiles = await UserProfiles.find(query)
      .sort({ updatedAt: -1 })
      .toArray();
    
    res.json({
      success: true,
      count: profiles.length,
      profiles
    });
  } catch (error) {
    console.error('Get user profiles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upsert user profiles endpoint (public API - accessible from n8n and other services)
// Accepts array of profile objects, uses incomingPhone as key
// CORS enabled - no authentication required
app.post('/api/user-profiles', cors(), async (req, res) => {
  try {
    const profiles = req.body;

    // Validate input is an array
    if (!Array.isArray(profiles)) {
      return res.status(400).json({ 
        error: 'Request body must be an array of profile objects' 
      });
    }

    if (profiles.length === 0) {
      return res.status(400).json({ 
        error: 'Array cannot be empty' 
      });
    }

    // Validate each profile has incomingPhone
    for (let i = 0; i < profiles.length; i++) {
      if (!profiles[i].incomingPhone) {
        return res.status(400).json({ 
          error: `Profile at index ${i} is missing required field: incomingPhone` 
        });
      }
    }

    const db = mongoose.connection.db;
    const UserProfiles = db.collection('UserProfiles');
    
    const results = [];
    const errors = [];

    // Process each profile
    for (let i = 0; i < profiles.length; i++) {
      try {
        const profile = profiles[i];
        const { incomingPhone, profileUpdatedAt, ...otherFields } = profile;

        // Filter out empty, null, or undefined fields
        const filteredFields = {};
        for (const [key, value] of Object.entries(otherFields)) {
          // Only include field if it has a non-empty value
          if (value !== null && value !== undefined && value !== '') {
            // For arrays, check if they're not empty
            if (Array.isArray(value) && value.length === 0) {
              continue;
            }
            // For objects, check if they're not empty
            if (typeof value === 'object' && Object.keys(value).length === 0) {
              continue;
            }
            filteredFields[key] = value;
          }
        }

        // Prepare update data with only non-empty fields
        const updateData = {
          ...filteredFields,
          incomingPhone,
          updatedAt: new Date()
        };

        // Handle profileUpdatedAt: only include if provided and not empty
        if (profileUpdatedAt && profileUpdatedAt !== null && profileUpdatedAt !== '') {
          updateData.profileUpdatedAt = new Date(profileUpdatedAt);
        }

        // Upsert: update if exists, insert if not
        // $set: updates all fields (including dynamic ones, but only non-empty ones)
        // $setOnInsert: only sets createdAt when inserting new document
        const result = await UserProfiles.updateOne(
          { incomingPhone: incomingPhone },
          {
            $set: updateData,
            $setOnInsert: {
              createdAt: new Date()
            }
          },
          { upsert: true }
        );

        results.push({
          incomingPhone,
          success: true,
          matched: result.matchedCount,
          modified: result.modifiedCount,
          upserted: result.upsertedCount > 0
        });
      } catch (error) {
        errors.push({
          index: i,
          incomingPhone: profiles[i].incomingPhone,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      processed: profiles.length,
      successful: results.length,
      failed: errors.length,
      results,
      ...(errors.length > 0 && { errors })
    });
  } catch (error) {
    console.error('Upsert user profiles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
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
// This function now receives the AI prompt from the database
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

