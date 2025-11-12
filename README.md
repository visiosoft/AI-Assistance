# 🤖 AI Chatbot with Admin Dashboard

A modern, full-featured AI chatbot application built with Express.js, MongoDB, and a beautiful admin dashboard for managing AI prompts and user profiles.

## ✨ Features

### 👤 User Features
- 🎨 **Modern, Responsive UI** - Beautiful gradient design with smooth animations
- 💬 **Real-time Chat Interface** - Send and receive messages with typing indicators
- 📱 **Mobile Friendly** - Works perfectly on desktop, tablet, and mobile devices
- 🗄️ **Message Persistence** - All conversations saved to MongoDB
- 🤖 **AI Integration Ready** - Built-in support for AI services (OpenAI, Anthropic, etc.)

### 🔐 Admin Features
- **Secure Authentication** - Session-based admin login with bcryptjs password hashing
- ⚙️ **AI Prompt Management** - Update and manage the AI assistant prompt
- 👥 **Profile Management** - Create, read, update, and delete user profiles
- 📊 **User Analytics** - View all user profiles and their engagement data
- 🔒 **Role-Based Access** - Protected admin routes with authentication middleware

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB Atlas account or local MongoDB instance
- npm or yarn

### Installation

1. **Clone or download the repository**
```bash
cd AI_ChatBot
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure MongoDB**
   - Create a `.env` file in the root directory:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
   PORT=3000
   SESSION_SECRET=your-secret-key-here
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin123
   ```
   - See [SETUP.md](./SETUP.md) for detailed MongoDB setup instructions

4. **Create admin user**
```bash
npm run create-admin
```
Default credentials: `admin` / `admin123` (⚠️ Change these after first login!)

5. **Start the development server**
```bash
npm run dev
```
The application will be available at `http://localhost:3000`

## 📋 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | Required | MongoDB connection string |
| `PORT` | 3000 | Server port |
| `SESSION_SECRET` | 'your-secret-key-change-in-production' | Session encryption key |
| `ADMIN_USERNAME` | 'admin' | Default admin username |
| `ADMIN_PASSWORD` | 'admin123' | Default admin password |
| `NETLIFY` | false | Set to 'true' for Netlify deployment |

## 📁 Project Structure

```
AI_ChatBot/
├── public/                           # Frontend static files
│   ├── index.html                   # Main chatbot UI
│   ├── script.js                    # Chatbot JavaScript logic
│   ├── styles.css                   # Chatbot styling
│   ├── _redirects                   # Netlify redirects
│   └── admin/                       # Admin dashboard
│       ├── login.html               # Admin login page
│       ├── dashboard.html           # Admin dashboard page
│       ├── admin.js                 # Admin logic
│       └── admin.css                # Admin styling
│
├── src/
│   ├── index.js                     # Main Express app entry
│   ├── config/
│   │   └── database.js              # MongoDB connection setup
│   ├── models/
│   │   ├── Admin.js                 # Admin user model
│   │   ├── Message.js               # Chat message model
│   │   ├── AIPrompt.js              # AI prompt configuration model
│   │   └── Profile.js               # User profile model
│   ├── routes/
│   │   └── admin.js                 # Admin API endpoints
│   ├── middleware/
│   │   └── auth.js                  # Authentication middleware
│   └── scripts/
│       └── createAdmin.js           # Script to create admin user
│
├── netlify/
│   └── functions/
│       └── server.js                # Netlify serverless function
│
├── .env                             # Environment variables (not in git)
├── .gitignore                       # Git ignore rules
├── netlify.toml                     # Netlify configuration
├── package.json                     # Dependencies and scripts
├── SETUP.md                         # Detailed setup guide
├── NETLIFY_DEPLOY.md               # Netlify deployment guide
└── README.md                        # This file
```

## 🔌 API Endpoints

### Chat API
- **POST** `/api/chat` - Send a message and get AI response
  ```json
  // Request
  { "message": "Hello!" }
  
  // Response
  { "response": "Hello! How can I assist you?" }
  ```

- **GET** `/api/health` - Health check endpoint

### Admin API (Requires Authentication)
All admin endpoints require valid session authentication.

#### Authentication
- **POST** `/api/admin/login` - Admin login
  ```json
  { "username": "admin", "password": "admin123" }
  ```
- **POST** `/api/admin/logout` - Admin logout
- **GET** `/api/admin/auth-status` - Check authentication status

#### AI Prompt Management
- **GET** `/api/admin/ai-prompt` - Get current AI prompt
- **PUT** `/api/admin/ai-prompt` - Update AI prompt
  ```json
  { "prompt": "You are a helpful assistant..." }
  ```

#### Profile Management
- **GET** `/api/admin/profiles` - Get all profiles
- **POST** `/api/admin/profiles` - Create new profile
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "123-456-7890",
    "bio": "Developer",
    "avatar": "https://example.com/avatar.jpg",
    "status": "active"
  }
  ```
- **PUT** `/api/admin/profiles/:id` - Update profile
- **DELETE** `/api/admin/profiles/:id` - Delete profile

#### User Profiles
- **GET** `/api/admin/user-profiles` - Get all user profiles from UserProfiles collection

## 🎨 User Interface

### Chatbot Interface (`/`)
- Modern gradient design with purple and pink colors
- Real-time message display with user and bot avatars
- Typing indicator animation
- Auto-scroll to latest messages
- Responsive design for all screen sizes
- Enter key to send, Shift+Enter for new line

### Admin Dashboard (`/admin/dashboard.html`)
- **AI Prompt Section**: Update the AI assistant prompt
- **User Profiles Section**: View all user profiles with detailed information
- **Profiles Management**: Create, edit, and delete profiles
- Clean, modern admin interface with sidebar navigation

## 🔐 Security Features

1. **Password Hashing** - Admin passwords hashed with bcryptjs
2. **Session Management** - Express session with secure cookies
3. **Authentication Middleware** - Protected admin routes
4. **Input Validation** - Request data validation and sanitization
5. **CORS Protection** - Configured CORS for cross-origin requests
6. **HTTP-Only Cookies** - Session cookies are HTTP-only

## 📚 Available Scripts

```bash
# Start development server (with auto-reload)
npm run dev

# Start production server
npm start

# Create/reset admin user
npm run create-admin
```

## 🚀 Deployment

### Local Deployment
1. Follow the Quick Start section above
2. Application runs on `http://localhost:3000`

### Netlify Deployment
Detailed instructions available in [NETLIFY_DEPLOY.md](./NETLIFY_DEPLOY.md)

**Quick steps:**
1. Set environment variables in Netlify dashboard
2. Connect your Git repository or use Netlify CLI
3. Build command: `npm install`
4. Publish directory: `public`
5. Functions directory: `netlify/functions`

### Vercel Deployment
Vercel is recommended for Express apps:
```bash
npm i -g vercel
vercel
```

## 🔧 Database Models

### Admin
```javascript
{
  username: String (unique),
  password: String (hashed),
  timestamps: true
}
```

### Message
```javascript
{
  role: String ('user' | 'bot'),
  content: String,
  timestamp: Date,
  timestamps: true
}
```

### AIPrompt
```javascript
{
  prompt: String,
  timestamps: true
}
```

### Profile
```javascript
{
  name: String (required),
  email: String (required, unique),
  phone: String,
  bio: String,
  avatar: String (URL),
  status: String ('active' | 'inactive'),
  timestamps: true
}
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection failed | Check `MONGODB_URI` in `.env` file and verify network access |
| Admin login not working | Run `npm run create-admin` to create/reset admin user |
| Styling not loading | Ensure static files are served from `public` directory |
| Session not persisting | Verify `SESSION_SECRET` is set and cookies are enabled |
| Netlify deployment issues | Check [NETLIFY_DEPLOY.md](./NETLIFY_DEPLOY.md) troubleshooting section |

## 📖 Additional Resources

- [SETUP.md](./SETUP.md) - Detailed setup and configuration guide
- [NETLIFY_DEPLOY.md](./NETLIFY_DEPLOY.md) - Complete Netlify deployment guide
- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/)

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

ISC

## ⚠️ Security Notes

- **Never commit `.env` file** to version control
- **Change default admin credentials** after first login
- **Use strong `SESSION_SECRET`** in production
- **Enable HTTPS** in production (use `secure: true` for cookies)
- **Validate all user inputs** before processing
- **Keep dependencies updated** regularly

## 🎯 Future Enhancements

- [ ] Integration with OpenAI API or other AI services
- [ ] User authentication and profiles
- [ ] Message history per user
- [ ] Analytics dashboard
- [ ] Rate limiting
- [ ] Email notifications
- [ ] Dark mode toggle
- [ ] Multi-language support

## 📞 Support

For issues or questions, please check the documentation files or create an issue in the repository.

---

**Made with ❤️ for better chatbot experiences**

