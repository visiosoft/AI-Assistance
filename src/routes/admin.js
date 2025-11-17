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
        
        const { phone } = req.query;
        
        // Build query - filter by phone if provided
        const query = phone ? { 
            $or: [
                { incomingPhone: phone },
                { phone: phone }
            ]
        } : {};
        
        const userProfiles = await UserProfiles.find(query)
            .sort({ createdAt: -1 })
            .toArray();
        
        // Log ID formats for debugging (only first time or when debugging)
        if (userProfiles.length > 0 && !phone) {
            const sampleIds = userProfiles.slice(0, 3).map(p => ({
                id: p._id,
                idType: typeof p._id,
                idString: p._id?.toString(),
                idConstructor: p._id?.constructor?.name,
                hasOid: !!p._id?.$oid
            }));
            console.log('Sample profile ID formats:', sampleIds);
        }
        
        res.json({ userProfiles });
    } catch (error) {
        console.error('Get user profiles error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user profile by phone number (returns first match)
router.get('/user-profiles/by-phone/:phone', requireAuth, async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const UserProfiles = db.collection('UserProfiles');
        const { phone } = req.params;
        
        const profile = await UserProfiles.findOne({
            $or: [
                { incomingPhone: phone },
                { phone: phone }
            ]
        });
        
        if (!profile) {
            return res.status(404).json({ error: 'User profile not found' });
        }
        
        res.json({ userProfile: profile });
    } catch (error) {
        console.error('Get user profile by phone error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user profile by ID (for debugging)
router.get('/user-profiles/:id', requireAuth, async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const UserProfiles = db.collection('UserProfiles');
        const { id } = req.params;
        
        console.log('Get profile by ID request:', id);
        
        // Try ObjectId first
        const ObjectId = mongoose.Types.ObjectId;
        let profileId;
        try {
            profileId = new ObjectId(id);
        } catch (error) {
            return res.status(400).json({ error: 'Invalid profile ID format' });
        }
        
        // Try multiple query formats
        let profile = await UserProfiles.findOne({ _id: profileId });
        
        if (!profile) {
            // Try as string
            profile = await UserProfiles.findOne({ _id: id });
        }
        
        if (!profile) {
            // Try manual search
            const allProfiles = await UserProfiles.find({}).limit(100).toArray();
            profile = allProfiles.find(p => {
                const pId = p._id?.toString() || p._id?.$oid || String(p._id);
                return pId === id || pId === profileId.toString();
            });
        }
        
        if (!profile) {
            // Get sample IDs for debugging
            const sampleProfiles = await UserProfiles.find({}).limit(5).toArray();
            const sampleIds = sampleProfiles.map(p => ({
                id: p._id,
                idString: p._id?.toString(),
                idType: typeof p._id
            }));
            
            return res.status(404).json({ 
                error: 'User profile not found',
                searchedId: id,
                sampleIds: sampleIds,
                totalProfiles: await UserProfiles.countDocuments({})
            });
        }
        
        res.json({ userProfile: profile });
    } catch (error) {
        console.error('Get user profile by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create user profile
router.post('/user-profiles', requireAuth, async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const UserProfiles = db.collection('UserProfiles');
        
        const profileData = req.body;
        
        // Validate required field
        if (!profileData.incomingPhone) {
            return res.status(400).json({ error: 'incomingPhone is required' });
        }
        
        // Add timestamps
        profileData.createdAt = new Date();
        profileData.updatedAt = new Date();
        
        const result = await UserProfiles.insertOne(profileData);
        const newProfile = await UserProfiles.findOne({ _id: result.insertedId });
        
        res.json({ 
            success: true, 
            message: 'User profile created successfully',
            userProfile: newProfile 
        });
    } catch (error) {
        console.error('Create user profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user profile
router.put('/user-profiles/:id', requireAuth, async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const UserProfiles = db.collection('UserProfiles');
        const { id } = req.params;
        
        console.log('Update request received:', {
            id: id,
            idType: typeof id,
            idLength: id ? id.length : 0,
            bodyKeys: Object.keys(req.body)
        });
        
        // Convert string ID to ObjectId
        const ObjectId = mongoose.Types.ObjectId;
        let profileId;
        try {
            profileId = new ObjectId(id);
            console.log('ObjectId created successfully:', profileId.toString());
        } catch (error) {
            console.error('Invalid ObjectId:', id, error.message);
            return res.status(400).json({ error: `Invalid profile ID: ${id}` });
        }
        
        const profileData = req.body;
        
        // Remove _id from update data if present
        delete profileData._id;
        
        // Update timestamp
        profileData.updatedAt = new Date();
        
        // Check if profile exists first - try multiple query formats
        console.log('Searching for profile with ObjectId:', profileId.toString());
        let existingProfile = await UserProfiles.findOne({ _id: profileId });
        
        // If not found, try with the ObjectId directly (in case of any wrapper)
        if (!existingProfile) {
            console.log('Not found with ObjectId, trying direct query...');
            // Try with the string ID converted to ObjectId again
            try {
                const altObjectId = new ObjectId(id);
                existingProfile = await UserProfiles.findOne({ _id: altObjectId });
            } catch (e) {
                console.log('Alternative ObjectId creation failed');
            }
        }
        
        // If still not found, try manual search through all profiles
        if (!existingProfile) {
            console.log('Not found with ObjectId queries, trying manual search through all profiles...');
            // Try finding all profiles and matching manually
            const allProfiles = await UserProfiles.find({}).toArray();
            console.log(`Searching through ${allProfiles.length} profiles...`);
            
            // Try to find by comparing string representations
            existingProfile = allProfiles.find(p => {
                // Get the ID in various formats
                let pId;
                if (p._id) {
                    if (typeof p._id === 'object' && p._id.toString) {
                        pId = p._id.toString();
                    } else if (typeof p._id === 'string') {
                        pId = p._id;
                    } else {
                        pId = String(p._id);
                    }
                } else {
                    return false;
                }
                
                // Compare with both the original string and ObjectId string
                const matches = pId === id || pId === profileId.toString();
                if (matches) {
                    console.log('Found match! Profile ID:', {
                        original: p._id,
                        string: pId,
                        type: typeof p._id,
                        constructor: p._id?.constructor?.name
                    });
                }
                return matches;
            });
            
            if (existingProfile) {
                console.log('Found profile using manual search, actual ID:', existingProfile._id);
                // Use the actual ID from the found profile
                profileId = existingProfile._id;
            } else {
                // Log first few profile IDs for comparison
                console.log('Sample profile IDs in database:');
                allProfiles.slice(0, 5).forEach((p, idx) => {
                    const pIdStr = p._id?.toString() || String(p._id);
                    console.log(`  Profile ${idx + 1}:`, {
                        id: p._id,
                        idString: pIdStr,
                        idType: typeof p._id,
                        idConstructor: p._id?.constructor?.name,
                        matchesSearch: pIdStr === id || pIdStr === profileId.toString()
                    });
                });
            }
        }
        
        if (!existingProfile) {
            // Get a few sample IDs to help debug
            const sampleProfiles = await UserProfiles.find({}).limit(5).toArray();
            const sampleIds = sampleProfiles.map(p => ({
                id: p._id,
                idString: p._id?.toString(),
                idType: typeof p._id,
                idConstructor: p._id?.constructor?.name
            }));
            
            const totalCount = await UserProfiles.countDocuments({});
            
            console.error('Profile not found with ID:', {
                receivedId: id,
                receivedIdType: typeof id,
                receivedIdLength: id ? id.length : 0,
                objectId: profileId.toString(),
                totalProfiles: totalCount,
                sampleIds: sampleIds
            });
            
            return res.status(404).json({ 
                error: 'User profile not found',
                receivedId: id,
                totalProfiles: totalCount
            });
        }
        
        console.log('Profile found, updating...', {
            foundId: existingProfile._id,
            foundIdType: typeof existingProfile._id,
            foundIdString: existingProfile._id?.toString(),
            foundIdConstructor: existingProfile._id?.constructor?.name
        });
        
        // Use the actual ID from the found profile (it's already an ObjectId from MongoDB)
        const actualId = existingProfile._id;
        
        // Ensure it's an ObjectId
        let updateId = actualId;
        if (typeof actualId === 'string') {
            try {
                updateId = new ObjectId(actualId);
            } catch (e) {
                console.error('Failed to convert string ID to ObjectId:', actualId);
                return res.status(400).json({ error: 'Invalid profile ID format' });
            }
        }
        
        console.log('Updating with ID:', {
            updateId: updateId,
            updateIdType: typeof updateId,
            updateIdString: updateId.toString()
        });
        
        // Perform the update
        const updateResult = await UserProfiles.updateOne(
            { _id: updateId },
            { $set: profileData }
        );
        
        console.log('Update result:', {
            matchedCount: updateResult.matchedCount,
            modifiedCount: updateResult.modifiedCount,
            acknowledged: updateResult.acknowledged
        });
        
        if (updateResult.matchedCount === 0) {
            console.error('Update failed - no document matched', {
                queryId: updateId.toString(),
                queryIdType: typeof updateId
            });
            return res.status(404).json({ error: 'User profile not found' });
        }
        
        // Fetch the updated document
        const updatedProfile = await UserProfiles.findOne({ _id: updateId });
        
        if (!updatedProfile) {
            console.error('Update succeeded but could not fetch updated document');
            return res.status(500).json({ error: 'Update succeeded but could not retrieve updated profile' });
        }
        
        console.log('Profile updated successfully');
        res.json({ 
            success: true, 
            message: 'User profile updated successfully',
            userProfile: updatedProfile 
        });
    } catch (error) {
        console.error('Update user profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete user profile
router.delete('/user-profiles/:id', requireAuth, async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const UserProfiles = db.collection('UserProfiles');
        const { id } = req.params;
        
        // Convert string ID to ObjectId
        const ObjectId = mongoose.Types.ObjectId;
        let profileId;
        try {
            profileId = new ObjectId(id);
        } catch (error) {
            return res.status(400).json({ error: 'Invalid profile ID' });
        }
        
        const result = await UserProfiles.findOneAndDelete({ _id: profileId });

        if (!result) {
            return res.status(404).json({ error: 'User profile not found' });
        }
        
        res.json({ 
            success: true, 
            message: 'User profile deleted successfully' 
        });
    } catch (error) {
        console.error('Delete user profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;

