import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import session from 'express-session';
import { fileURLToPath } from 'url';
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
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

