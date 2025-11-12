import express from 'express';
import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import AIPrompt from '../models/AIPrompt.js';
import Profile from '../models/Profile.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.adminId = admin._id.toString();
        req.session.username = admin.username;

        res.json({ 
            success: true, 
            message: 'Login successful',
            username: admin.username
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true, message: 'Logout successful' });
    });
});

// Check auth status
router.get('/auth-status', requireAuth, (req, res) => {
    res.json({ 
        authenticated: true, 
        username: req.session.username 
    });
});

// Get AI Prompt (single prompt)
router.get('/ai-prompt', requireAuth, async (req, res) => {
    try {
        const promptDoc = await AIPrompt.getPrompt();
        // Return the prompt from database, or empty string if not set yet
        res.json({ prompt: promptDoc ? promptDoc.prompt : '' });
    } catch (error) {
        console.error('Get prompt error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update AI Prompt (update only, no adding)
router.put('/ai-prompt', requireAuth, async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const updatedPrompt = await AIPrompt.updatePrompt(prompt.trim());
        res.json({ 
            success: true, 
            message: 'AI prompt updated successfully',
            prompt: updatedPrompt.prompt 
        });
    } catch (error) {
        console.error('Update prompt error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all profiles
router.get('/profiles', requireAuth, async (req, res) => {
    try {
        const profiles = await Profile.find().sort({ createdAt: -1 });
        res.json({ profiles });
    } catch (error) {
        console.error('Get profiles error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create profile
router.post('/profiles', requireAuth, async (req, res) => {
    try {
        const { name, email, phone, bio, avatar, status } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        const profile = new Profile({
            name,
            email,
            phone: phone || '',
            bio: bio || '',
            avatar: avatar || '',
            status: status || 'active'
        });

        await profile.save();
        res.json({ 
            success: true, 
            message: 'Profile created successfully',
            profile 
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        console.error('Create profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update profile
router.put('/profiles/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, bio, avatar, status } = req.body;

        const profile = await Profile.findById(id);
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        if (name) profile.name = name;
        if (email) profile.email = email;
        if (phone !== undefined) profile.phone = phone;
        if (bio !== undefined) profile.bio = bio;
        if (avatar !== undefined) profile.avatar = avatar;
        if (status) profile.status = status;

        await profile.save();
        res.json({ 
            success: true, 
            message: 'Profile updated successfully',
            profile 
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete profile
router.delete('/profiles/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const profile = await Profile.findByIdAndDelete(id);
        
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        res.json({ 
            success: true, 
            message: 'Profile deleted successfully' 
        });
    } catch (error) {
        console.error('Delete profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all UserProfiles from UserProfiles collection
router.get('/user-profiles', requireAuth, async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const UserProfiles = db.collection('UserProfiles');
        
        const userProfiles = await UserProfiles.find({})
            .sort({ createdAt: -1 })
            .toArray();
        
        res.json({ userProfiles });
    } catch (error) {
        console.error('Get user profiles error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;

