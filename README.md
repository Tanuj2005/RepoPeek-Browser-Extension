# GitShare Chrome Extension

Share private GitHub repositories with temporary, secure links - no collaborator access needed!



## How It Works

### Architecture Overview

GitShare uses a **popup-based interface** that integrates seamlessly with your GitHub workflow:

```
User on GitHub → Click Extension Icon → Popup Opens
                                           ↓
                        Detects current repository automatically
                                           ↓
                          Generate share link with custom expiry
                                           ↓
                            Copy link and share with anyone
```

**Key Benefits:**
- No need to add collaborators to private repos
- Temporary access with automatic expiration (1-60 days)
- One-click link generation from any GitHub repository page
- Full link management (view, copy, revoke)


### Smart Repository Detection

- The extension automatically detects which GitHub repository you're viewing:

### Link Lifecycle Management

- One link per repo (prevents link sprawl)
- Consistent URLs for same repository
- Easy to track and manage
- Automatic cleanup of expired links

## Features

- **Secure OAuth**: Login with GitHub OAuth (no password sharing)
- **One-Click Sharing**: Generate shareable links directly from GitHub pages
- **Flexible Expiry**: Set custom expiration (1-60 days, default 7)
- **GitHub-Style UI**: Familiar dark theme interface
- **Revocable Links**: Cancel links anytime before expiry
- **Token Encryption**: All tokens encrypted at rest
- **Zero Config**: End users just install and use!

## Project Structure

```
chrome-extension/
├── manifest.json        # Extension configuration (Manifest V3)
├── config.js            # Configuration (edit this before building!)
├── popup.html           # Extension popup UI
├── popup.js             # Popup logic and API calls
├── background.js        # OAuth flow handler (service worker)
├── styles.css           # GitHub-inspired dark theme
├── build.sh             # Build script with validation
└── icons/               # Extension icons (16, 48, 128)
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Two Ways to Use This Extension

### Option 1: For End Users (Zero Configuration!)

**Someone shared the extension with you?** Installation is super simple:

1. **Download** the extension ZIP file
2. **Extract** to any permanent folder
3. **Open Chrome** → Go to `chrome://extensions`
4. **Enable** "Developer mode" (toggle in top right)
5. **Click** "Load unpacked" → Select the extracted folder
6. **Done!** Click the GitShare icon and login with GitHub

**That's it!** No configuration, no OAuth apps, no setup. Just use it!

---

### Option 2: For Distributors (Build Your Own)

**Want to host it for others?** Here's how to set up and distribute:

#### Prerequisites

1. **Backend deployed** 
2. **GitHub OAuth App** created
3. **5 minutes** of your time

#### Step 1: Deploy Backend

See the [GitShare Server repository](https://github.com/SiddharthShukla48/GitShare_server) for complete backend setup and deployment instructions.

Quick checklist:
- Supabase database created
- Backend deployed 
- Environment variables configured
- Backend URL noted (e.g., `https://gitshare.railway.app`)

#### Step 2: Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in:
   - **Name**: `GitShare Extension`
   - **Homepage**: `https://github.com/yourusername/gitshare`
   - **Callback URL**: `https://YOUR_BACKEND_URL/callback`
4. Save **Client ID** and **Client Secret**

#### Step 3: Configure Backend

Update backend `.env`:

```env
GITHUB_CLIENT_ID=Ov23liFRN3cb6YlfUXjT
GITHUB_CLIENT_SECRET=your_secret_here
BACKEND_URL=https://your-backend.railway.app
# ... other variables
```

#### Step 4: Configure Extension

Edit [`config.js`](config.js):

```javascript
const CONFIG = {
    BACKEND_URL: 'https://your-backend.railway.app',  // YOUR deployed URL
    GITHUB_CLIENT_ID: 'Ov23liFRN3cb6YlfUXjT',        // YOUR GitHub Client ID
    ENVIRONMENT: 'production',
    DEBUG: false
};
```

#### Step 5: Build Extension

```bash
./build.sh
```

The script will:
- Validate your configuration
- Check for common issues
- Create production-ready ZIP
- Show distribution instructions

Output: `gitshare-extension-v1.0.0.zip`

#### Step 6: Share the ZIP

Upload to:
- GitHub Releases
- Google Drive / Dropbox
- Your website
- Email / Slack / Discord

Users just download, extract, and load - **no configuration needed by them!**

## Usage Guide

### First Time Setup (One-Time)

1. **Click Extension Icon** in Chrome toolbar
2. **Click "Login with GitHub"**
3. **Authorize** the app when prompted
4. **Done!** You're ready to share

### Sharing a Repository

1. **Navigate** to any private GitHub repository
2. **Click** the GitShare extension icon
3. **Set Expiry** (1-30 days, default 7)
4. **Click "Generate Share Link"**
5. **Copy & Share** the link!

### Managing Links

- **View Existing Links**: Extension shows if a repo already has a link
- **Copy Again**: Click "Copy Link" to re-copy an existing link
- **Revoke Access**: Click "Revoke Link" to cancel before expiry
- **Create New**: Revoke old link, then generate a new one

### What Recipients See

Recipients can view:
- All repository files and folders
- Syntax-highlighted code
- Images, PDFs, and documents
- Commit history
- Forks and stars count
- Cannot clone or modify (read-only)

## Architecture

### Key Files

- **[`config.js`](config.js)**:
  - Centralized configuration
  - **Edit this before building!**
  - Contains backend URL and GitHub Client ID
  - Auto-disables console logs in production

- **[`manifest.json`](manifest.json)**:
  - Manifest V3 configuration
  - Permissions: `storage`, `identity`, `tabs`, `activeTab`
  - Host permissions for GitHub and backend API
  - Flexible host permissions for any backend URL

- **[`popup.html`](popup.html)/[`popup.js`](popup.js)**:
  - Extension popup UI with multiple states
  - Repo detection from active tab
  - Link generation and management
  - Expiry selection (1-60 days)
  - Revoke functionality

- **[`background.js`](background.js)**:
  - Service worker for OAuth flow
  - GitHub OAuth authentication
  - CSRF protection with state parameter
  - Token exchange with backend

- **[`styles.css`](styles.css)**:
  - GitHub dark theme colors (#0d1117, #161b22, #c9d1d9, #58a6ff)
  - Responsive design
  - Smooth animations

- **[`build.sh`](build.sh)**:
  - Production build script

## Local Development

1. **Start Backend**:
   ```bash
   cd ../fastapi-supabase-app
   source .venv/bin/activate
   uvicorn src.main:app --reload
   ```

2. **Load Extension**:
   - Chrome → `chrome://extensions`
   - Developer mode ON
   - Load unpacked → Select `chrome-extension` folder

3. **Test Features**:
   - Login with GitHub
   - Navigate to a private repo
   - Generate link
   - Test in incognito window
   - Test revocation
   - Test logout

## Security Features

- **Token Encryption**: Tokens encrypted in backend database using Fernet
- **Server-Side Rendering**: Viewer page rendered server-side (token never exposed to client)
- **OAuth Flow**: Industry-standard OAuth 2.0 flow
- **CSRF Protection**: State parameter validation in OAuth
- **Token Validation**: Tokens validated on every request
- **Auto-Expiry**: Links expire after 7 days (configurable)
- **No Token Storage**: Extension only stores GitHub access token (encrypted at rest in backend)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Make your changes
4. Test thoroughly 
5. Update documentation if needed
6. Submit a pull request

## License

MIT License - Free to use, modify, and distribute.

See [LICENSE](../LICENSE) for details.

---

**Made with ❤️ for developers who want to share code securely**

Zero-config for users, simple setup for distributors!
