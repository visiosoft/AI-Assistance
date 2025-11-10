import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import Admin from '../models/Admin.js';

dotenv.config();

async function createAdmin() {
    try {
        await connectDB();
        
        const username = process.env.ADMIN_USERNAME || 'admin';
        const password = process.env.ADMIN_PASSWORD || 'admin123';

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) {
            console.log('✅ Admin user already exists');
            return;
        }

        // Create admin user
        const admin = new Admin({
            username,
            password
        });

        await admin.save();
        console.log('✅ Admin user created successfully!');
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${password}`);
        console.log('\n⚠️  Please change the default password after first login!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin:', error);
        process.exit(1);
    }
}

createAdmin();

