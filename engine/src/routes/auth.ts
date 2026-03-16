/**
 * GitHub OAuth Authentication Routes
 * 
 * Enables users to authenticate with GitHub and access private repos
 * Uses browser session + secure token storage
 */

import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// GitHub OAuth config (from environment or user_settings.json)
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:3160/auth/github/callback';

// In-memory token store (should use database in production)
const oauthTokens = new Map<string, {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: { login: string; id: number }
}>();

/**
 * Step 1: Redirect user to GitHub for authentication
 */
router.get('/github', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  
  // Store state in session (prevent CSRF)
  (req.session as any).githubOAuthState = state;
  
  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', CALLBACK_URL);
  authUrl.searchParams.set('scope', 'repo read:user'); // Access private repos + user info
  authUrl.searchParams.set('state', state);
  
  res.redirect(authUrl.toString());
});

/**
 * Step 2: Handle GitHub callback
 */
router.get('/github/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // Verify state (CSRF protection)
  if (state !== (req.session as any).githubOAuthState) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code as string,
        redirect_uri: CALLBACK_URL
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      throw new Error(tokenData.error_description || 'GitHub OAuth failed');
    }
    
    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${tokenData.access_token}`,
        'Accept': 'application/json'
      }
    });
    
    const userData = await userResponse.json();
    
    // Store token
    const tokenId = crypto.randomBytes(16).toString('hex');
    oauthTokens.set(tokenId, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : undefined,
      user: {
        login: userData.login,
        id: userData.id
      }
    });
    
    // Clear session state
    delete (req.session as any).githubOAuthState;
    
    // Redirect to UI with token ID
    res.redirect(`/settings?github_connected=true&user=${userData.login}`);
    
  } catch (error: any) {
    console.error('[GitHub OAuth] Error:', error);
    res.redirect(`/settings?github_error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * Step 3: Get current auth status
 */
router.get('/github/status', (req, res) => {
  // Check if user has active GitHub token
  const hasToken = oauthTokens.size > 0;
  const user = hasToken ? Array.from(oauthTokens.values())[0].user : null;
  
  res.json({
    connected: hasToken,
    user: user,
    scopes: ['repo', 'read:user']
  });
});

/**
 * Step 4: Disconnect GitHub
 */
router.delete('/github', (req, res) => {
  oauthTokens.clear();
  res.json({ success: true, message: 'GitHub disconnected' });
});

/**
 * Helper: Get GitHub token for API calls
 */
export function getGitHubToken(): string | undefined {
  if (oauthTokens.size === 0) return undefined;
  return Array.from(oauthTokens.values())[0].access_token;
}

export { router as githubAuthRouter };
