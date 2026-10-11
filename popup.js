// Configuration (loaded from config.js)
const BACKEND_URL = CONFIG.BACKEND_URL;

// DOM Elements
const loginSection = document.getElementById('login-section');
const mainSection = document.getElementById('main-section');
const notGithubSection = document.getElementById('not-github-section');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const generateLinkBtn = document.getElementById('generate-link-btn');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const repoName = document.getElementById('repo-name');
const loading = document.getElementById('loading');
const successSection = document.getElementById('success-section');
const errorSection = document.getElementById('error-section');
const shareLink = document.getElementById('share-link');
const expiryDate = document.getElementById('expiry-date');
const copyBtn = document.getElementById('copy-btn');
const revokeBtn = document.getElementById('revoke-btn');
const retryBtn = document.getElementById('retry-btn');
const errorMessage = document.getElementById('error-message');

// State
let currentUser = null;
let currentRepo = null;
let currentLinkId = null;

/**
 * Initialize popup when opened
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 GitShare popup opened');
    
    try {
        // Check if user is logged in
        const token = await getStoredToken();
        
        if (token) {
            // Validate token and get user info
            const user = await validateAndGetUser(token);
            
            if (user) {
                currentUser = user;
                showMainSection();
                await loadCurrentRepo();
            } else {
                // Token invalid, show login
                showLoginSection();
            }
        } else {
            showLoginSection();
        }
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showLoginSection();
    }
});

/**
 * Show login section
 */
function showLoginSection() {
    loginSection.classList.remove('hidden');
    mainSection.classList.add('hidden');
    notGithubSection.classList.add('hidden');
}

/**
 * Show main section
 */
function showMainSection() {
    loginSection.classList.add('hidden');
    mainSection.classList.remove('hidden');
    notGithubSection.classList.add('hidden');
    
    // Populate user info
    userName.textContent = `@${currentUser.login}`;
    userAvatar.src = currentUser.avatar_url;
}

/**
 * Show not GitHub section
 */
function showNotGithubSection() {
    loginSection.classList.add('hidden');
    mainSection.classList.add('hidden');
    notGithubSection.classList.remove('hidden');
}

/**
 * Get stored GitHub token
 */
async function getStoredToken() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['github_token'], (result) => {
            resolve(result.github_token || null);
        });
    });
}

/**
 * Store GitHub token
 */
async function storeToken(token) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ github_token: token }, resolve);
    });
}

/**
 * Store user info
 */
async function storeUser(user) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ github_user: user }, resolve);
    });
}

/**
 * Remove stored token and user
 */
async function clearStorage() {
    return new Promise((resolve) => {
        chrome.storage.local.remove(['github_token', 'github_user'], resolve);
    });
}

/**
 * Validate token and get user info
 */
async function validateAndGetUser(token) {
    try {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error('❌ Token validation failed');
            await clearStorage();
            return null;
        }
        
        const user = await response.json();
        console.log('✅ User validated:', user.login);
        return user;
        
    } catch (error) {
        console.error('❌ Error validating token:', error);
        return null;
    }
}

/**
 * Load current repository info from active tab
 */
async function loadCurrentRepo() {
    try {
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.url) {
            showNotGithubSection();
            return;
        }
        
        const url = new URL(tab.url);
        
        // Check if it's a GitHub page
        if (url.hostname !== 'github.com') {
            showNotGithubSection();
            return;
        }
        
        // Parse repo from URL: github.com/owner/repo
        const parts = url.pathname.split('/').filter(p => p);
        
        if (parts.length < 2) {
            repoName.textContent = 'Not a repository page';
            generateLinkBtn.disabled = true;
            return;
        }
        
        const owner = parts[0];
        const repo = parts[1];
        
        currentRepo = { owner, repo };
        repoName.textContent = `${owner}/${repo}`;
        generateLinkBtn.disabled = false;
        
        console.log('📁 Detected repo:', currentRepo);
        
    } catch (error) {
        console.error('❌ Error loading repo:', error);
        repoName.textContent = 'Error detecting repository';
        generateLinkBtn.disabled = true;
    }
}

/**
 * Handle login button click
 */
loginBtn.addEventListener('click', async () => {
    console.log('🔐 Login button clicked');
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="btn-icon">⏳</span> Logging in...';
    
    try {
        // Send message to background script to handle OAuth
        const response = await chrome.runtime.sendMessage({ 
            action: 'github-login' 
        });
        
        if (response.success) {
            console.log('✅ Login successful');
            await storeToken(response.token);
            await storeUser(response.user);
            currentUser = response.user;
            showMainSection();
            await loadCurrentRepo();
        } else {
            console.error('❌ Login failed:', response.error);
            alert(`Login failed: ${response.error}`);
        }
        
    } catch (error) {
        console.error('❌ Login error:', error);
        alert('Login failed. Please try again.');
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span class="btn-icon">🔐</span> Login with GitHub';
    }
});

/**
 * Handle logout button click
 */
logoutBtn.addEventListener('click', async () => {
    console.log('👋 Logout clicked');
    await clearStorage();
    currentUser = null;
    currentRepo = null;
    showLoginSection();
});

/**
 * Handle generate link button click
 */
generateLinkBtn.addEventListener('click', async () => {
    console.log('🔗 Generate link clicked');
    
    if (!currentRepo) {
        alert('No repository detected');
        return;
    }
    
    // Show loading
    generateLinkBtn.classList.add('hidden');
    successSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    loading.classList.remove('hidden');
    
    try {
        const token = await getStoredToken();
        const expiryDays = parseInt(document.getElementById('expiry-days').value) || 7;
        
        // Call backend to generate link
        const response = await fetch(`${BACKEND_URL}/api/generate-link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: token,
                owner: currentRepo.owner,
                repo: currentRepo.repo,
                user_id: currentUser.id.toString(),
                expires_in_days: expiryDays
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to generate link');
        }
        
        const data = await response.json();
        
        console.log(data.is_existing ? '♻️ Existing link found:' : '✅ Link generated:', data.share_link);
        
        // Store link_id for revoke functionality
        currentLinkId = data.link_id;
        
        // Show success
        loading.classList.add('hidden');
        successSection.classList.remove('hidden');
        
        // Update success message and show revoke button for all links
        const successText = document.querySelector('.success-text');
        if (data.is_existing) {
            successText.textContent = 'Existing link found!';
        } else {
            successText.textContent = 'Link created successfully!';
        }
        
        // Always show revoke button when a link is present and reset its state
        revokeBtn.classList.remove('hidden');
        revokeBtn.disabled = false;
        revokeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path></svg> Revoke Link';
        
        shareLink.value = data.share_link;
        
        // Format expiry date
        const expiry = new Date(data.expires_at);
        expiryDate.textContent = expiry.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
    } catch (error) {
        console.error('❌ Error generating link:', error);
        
        // Show error
        loading.classList.add('hidden');
        errorSection.classList.remove('hidden');
        errorMessage.textContent = error.message;
    }
});

/**
 * Handle copy button click
 */
copyBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(shareLink.value);
        
        // Visual feedback
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = 'Copied!';
        copyBtn.style.background = '#28a745';
        copyBtn.style.color = 'white';
        
        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            copyBtn.style.background = '';
            copyBtn.style.color = '';
        }, 2000);
        
    } catch (error) {
        console.error('❌ Copy failed:', error);
        
        // Fallback for older browsers
        shareLink.select();
        document.execCommand('copy');
        alert('Link copied to clipboard!');
    }
});

/**
 * Handle retry button
 */
retryBtn.addEventListener('click', () => {
    errorSection.classList.add('hidden');
    generateLinkBtn.classList.remove('hidden');
});

/**
 * Handle revoke link button
 */
revokeBtn.addEventListener('click', async () => {
    if (!currentLinkId || !currentUser) {
        alert('Unable to revoke link');
        return;
    }
    
    if (!confirm('Are you sure you want to revoke this link? It will no longer be accessible.')) {
        return;
    }
    
    try {
        revokeBtn.disabled = true;
        revokeBtn.textContent = 'Revoking...';
        
        const response = await fetch(`${BACKEND_URL}/api/revoke-link?link_id=${currentLinkId}&user_id=${currentUser.id.toString()}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to revoke link');
        }
        
        console.log('✅ Link revoked successfully');
        
        // Reset to main section
        successSection.classList.add('hidden');
        generateLinkBtn.classList.remove('hidden');
        currentLinkId = null;
        
        alert('Link revoked successfully!');
        
    } catch (error) {
        console.error('❌ Error revoking link:', error);
        alert('Failed to revoke link: ' + error.message);
        
        // Reset button
        revokeBtn.disabled = false;
        const icon = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path></svg>';
        revokeBtn.innerHTML = icon + ' Revoke Link';
    }
});
