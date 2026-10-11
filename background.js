// Import configuration
importScripts('config.js');

// Configuration (loaded from config.js)
const BACKEND_URL = CONFIG.BACKEND_URL;
const GITHUB_CLIENT_ID = CONFIG.GITHUB_CLIENT_ID;

/**
 * Handle messages from popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📩 Message received:', request.action);
    
    if (request.action === 'github-login') {
        handleGitHubLogin()
            .then(result => sendResponse(result))
            .catch(error => {
                console.error('❌ Login error:', error);
                sendResponse({ 
                    success: false, 
                    error: error.message 
                });
            });
        
        // Return true to indicate async response
        return true;
    }
});

/**
 * Handle GitHub OAuth login flow
 */
async function handleGitHubLogin() {
    console.log('🔐 Starting GitHub OAuth flow...');
    
    try {
        // Step 1: Get extension ID for redirect URI
        const extensionId = chrome.runtime.id;
        const redirectUri = chrome.identity.getRedirectURL();
        
        console.log('🔗 Redirect URI:', redirectUri);
        
        // Step 2: Build GitHub OAuth URL
        const state = generateRandomState();
        const scope = 'repo'; // Request repo access
        
        const authUrl = new URL('https://github.com/login/oauth/authorize');
        authUrl.searchParams.append('client_id', GITHUB_CLIENT_ID);
        authUrl.searchParams.append('redirect_uri', redirectUri);
        authUrl.searchParams.append('scope', scope);
        authUrl.searchParams.append('state', state);
        
        console.log('🌐 Opening OAuth window:', authUrl.toString());
        
        // Step 3: Launch OAuth flow
        const responseUrl = await chrome.identity.launchWebAuthFlow({
            url: authUrl.toString(),
            interactive: true
        });
        
        console.log('✅ OAuth callback received:', responseUrl);
        
        // Step 4: Parse authorization code from callback URL
        const urlParams = new URL(responseUrl);
        const code = urlParams.searchParams.get('code');
        const returnedState = urlParams.searchParams.get('state');
        
        if (!code) {
            throw new Error('No authorization code received');
        }
        
        if (returnedState !== state) {
            throw new Error('State mismatch - possible CSRF attack');
        }
        
        console.log('🔑 Authorization code received:', code.substring(0, 10) + '...');
        
        // Step 5: Exchange code for token via backend
        console.log('🔄 Exchanging code for token...');
        
        const requestBody = {
            code: code,
            redirect_uri: redirectUri
        };
        console.log('📤 Sending request:', requestBody);
        
        const exchangeResponse = await fetch(`${BACKEND_URL}/api/github-auth`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('📡 Backend response status:', exchangeResponse.status);
        console.log('📋 Response headers:', Object.fromEntries(exchangeResponse.headers.entries()));
        console.log('📊 Response type:', exchangeResponse.type);
        console.log('🔍 Response ok:', exchangeResponse.ok);
        
        // Get the raw response text first
        const responseText = await exchangeResponse.text();
        console.log('📝 Raw response text:', responseText);
        
        if (!exchangeResponse.ok) {
            let errorMsg = 'Token exchange failed';
            try {
                const error = JSON.parse(responseText);
                errorMsg = error.detail || errorMsg;
            } catch (e) {
                errorMsg = `Backend returned ${exchangeResponse.status}: ${responseText}`;
            }
            console.error('❌ Backend error:', errorMsg);
            throw new Error(errorMsg);
        }
        
        let tokenData;
        try {
            tokenData = JSON.parse(responseText);
            console.log('📦 Backend response:', tokenData);
        } catch (e) {
            console.error('❌ Failed to parse response:', e, 'Text was:', responseText);
            throw new Error('Invalid JSON response from backend');
        }
        
        console.log('🔍 Parsed token data:', tokenData);
        
        if (!tokenData || !tokenData.token) {
            console.error('❌ Token data:', tokenData);
            throw new Error('No access token received from backend');
        }
        
        const accessToken = tokenData.token;
        const userData = tokenData.user;
        
        console.log('✅ Access token received');
        console.log('✅ User data received:', userData.login);
        
        console.log('✅ Login successful:', userData.login);
        
        return {
            success: true,
            token: accessToken,
            user: {
                id: userData.id,
                login: userData.login,
                avatar_url: userData.avatar_url,
                name: userData.name
            }
        };
        
    } catch (error) {
        console.error('❌ OAuth flow error:', error);
        
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Generate random state for CSRF protection
 */
function generateRandomState() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Listen for extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('🎉 GitShare extension installed!');
        console.log('📝 Redirect URI:', chrome.identity.getRedirectURL());
        console.log('⚙️  Please configure this redirect URI in your GitHub OAuth App settings');
    } else if (details.reason === 'update') {
        console.log('🔄 GitShare extension updated to version', chrome.runtime.getManifest().version);
    }
});

/**
 * Optional: Clear storage on extension uninstall
 */
chrome.runtime.setUninstallURL('https://github.com', () => {
    chrome.storage.local.clear();
    console.log('🧹 Storage cleared on uninstall');
});
