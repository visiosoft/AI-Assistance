# Setup Instructions

## MongoDB Connection

Set your MongoDB URI as an environment variable. You can do this in several ways:

### Option 1: Create a `.env` file (Recommended)

Create a `.env` file in the root directory with:

```
MONGODB_URI=mongodb+srv://devxulfiqar:nSISUpLopruL7S8j@mypaperlessoffice.z5g84.mongodb.net/?retryWrites=true&w=majority&appName=mypaperlessofficet-management
```

### Option 2: Set environment variable directly

**Windows (PowerShell):**
```powershell
$env:MONGODB_URI="mongodb+srv://devxulfiqar:nSISUpLopruL7S8j@mypaperlessoffice.z5g84.mongodb.net/?retryWrites=true&w=majority&appName=mypaperlessofficet-management"
```

**Windows (CMD):**
```cmd
set MONGODB_URI=mongodb+srv://devxulfiqar:nSISUpLopruL7S8j@mypaperlessoffice.z5g84.mongodb.net/?retryWrites=true&w=majority&appName=mypaperlessofficet-management
```

**Linux/Mac:**
```bash
export MONGODB_URI="mongodb+srv://devxulfiqar:nSISUpLopruL7S8j@mypaperlessoffice.z5g84.mongodb.net/?retryWrites=true&w=majority&appName=mypaperlessofficet-management"
```

## Install Dependencies

```bash
npm install
```

## Run the Application

```bash
npm run dev
```

