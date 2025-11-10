# AI Chatbot with Admin Dashboard

An AI Chatbot application with MongoDB integration and admin dashboard for managing AI prompts and profiles.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure MongoDB connection. See [SETUP.md](./SETUP.md) for detailed instructions on setting up your MongoDB URI.

3. Create admin user:
```bash
npm run create-admin
```
Default credentials: `admin` / `admin123` (change after first login!)

4. Start the development server:
```bash
npm run dev
```

Or start the production server:
```bash
npm start
```

## Environment Variables

- `MONGODB_URI` - MongoDB connection string
- `PORT` - Server port (default: 3000)
- `ADMIN_USERNAME` - Admin username (default: admin)
- `ADMIN_PASSWORD` - Admin password (default: admin123)
- `SESSION_SECRET` - Session secret key (change in production!)

## Project Structure

```
AI_ChatBot/
├── public/                # Frontend UI files
│   ├── index.html        # Chatbot interface
│   ├── styles.css        # Chatbot styling
│   ├── script.js         # Chatbot JavaScript
│   └── admin/            # Admin dashboard
│       ├── login.html    # Admin login page
│       ├── dashboard.html # Admin dashboard
│       ├── admin.css     # Admin styling
│       └── admin.js      # Admin JavaScript
├── src/
│   ├── config/
│   │   └── database.js   # MongoDB connection
│   ├── models/
│   │   ├── Message.js    # Message model
│   │   ├── Admin.js      # Admin model
│   │   ├── AIPrompt.js   # AI Prompt model
│   │   └── Profile.js    # Profile model
│   ├── routes/
│   │   └── admin.js      # Admin API routes
│   ├── middleware/
│   │   └── auth.js       # Authentication middleware
│   ├── scripts/
│   │   └── createAdmin.js # Admin creation script
│   └── index.js          # Main application entry
├── .env                  # Environment variables (not in git)
├── .env.example          # Example environment variables
├── .gitignore
├── package.json
└── README.md
```

## Features

### User Features
- 🎨 **Modern UI**: Beautiful, responsive chatbot interface
- 💬 **Real-time Chat**: Interactive chat interface with message history
- 🗄️ **MongoDB Integration**: All messages are stored in MongoDB

### Admin Features
- 🔐 **Admin Dashboard**: Secure admin panel with authentication
- ⚙️ **AI Prompt Management**: Update the AI prompt (single prompt, update only)
- 👥 **Profiles Management**: View, create, edit, and delete user profiles
- 📊 **Session Management**: Secure session-based authentication

## Usage

### User Interface
After starting the server, open your browser and navigate to:
```
http://localhost:3000
```
You'll see the chatbot interface where you can start chatting!

### Admin Dashboard
Access the admin dashboard at:
```
http://localhost:3000/admin/login.html
```
Default credentials: `admin` / `admin123`

**Admin Dashboard Features:**
- **AI Prompt**: Update the AI assistant prompt (only one prompt exists, can be updated)
- **Profiles**: Manage user profiles (view, add, edit, delete)

## Security Note

⚠️ **Important**: The `.env` file contains sensitive credentials and is excluded from git. Never commit your `.env` file to version control.

