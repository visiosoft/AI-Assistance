# Netlify Deployment Guide

## Prerequisites

1. Make sure all dependencies are installed:
```bash
npm install
```

2. Set up environment variables in Netlify:
   - Go to your Netlify site dashboard
   - Navigate to Site settings > Environment variables
   - Add the following variables:
     - `MONGODB_URI` - Your MongoDB connection string
     - `SESSION_SECRET` - A random secret key for sessions
     - `ADMIN_USERNAME` - Admin username (optional, defaults to 'admin')
     - `ADMIN_PASSWORD` - Admin password (optional, defaults to 'admin123')
     - `NETLIFY` - Set to `true` (for secure cookies)

## Deployment Steps

### Option 1: Deploy via Netlify CLI

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Login to Netlify:
```bash
netlify login
```

3. Initialize and deploy:
```bash
netlify init
netlify deploy --prod
```

### Option 2: Deploy via GitHub/GitLab

1. Push your code to GitHub/GitLab
2. Connect your repository to Netlify
3. Netlify will automatically detect the `netlify.toml` configuration
4. Set environment variables in Netlify dashboard
5. Deploy

## Important Notes

1. **Database Connection**: Make sure your MongoDB URI allows connections from Netlify's IP addresses
2. **Session Storage**: Sessions use memory store (not persistent across function invocations). For production, consider using MongoDB session store
3. **Cold Starts**: First request may be slower due to serverless cold starts
4. **Function Timeout**: Netlify Functions have a 10-second timeout (26 seconds for Pro plans)

## Accessing Your Application

After deployment:
- **Main App**: `https://your-site.netlify.app`
- **Admin Login**: `https://your-site.netlify.app/admin/login.html`
- **API Health**: `https://your-site.netlify.app/api/health`

## Troubleshooting

1. **Page Not Found**: Check that `netlify.toml` and `_redirects` files are in the root
2. **API Errors**: Check Netlify Functions logs in the dashboard
3. **Database Connection**: Verify MongoDB URI and network access
4. **Session Issues**: Ensure `SESSION_SECRET` is set and `NETLIFY=true` for secure cookies

## Alternative: Use Vercel (Recommended for Express Apps)

If you encounter issues with Netlify, consider using Vercel which has better support for Express applications:

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts

Vercel automatically detects Express apps and handles them better than Netlify Functions.











