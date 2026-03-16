# 🔐 GitHub OAuth Authentication Setup Guide

## Overview

This guide walks you through setting up GitHub OAuth authentication to access **private repositories** using your browser's GitHub session.

---

## 📋 **What You'll Get**

✅ Access to **private GitHub repos**  
✅ No manual token entry (uses browser session)  
✅ Secure OAuth 2.0 flow  
✅ Session persists across restarts  
✅ CSRF protection  
✅ Works with MCP/LLM integrations  

---

## 🚀 **Setup Steps**

### **Step 1: Register GitHub OAuth App**

1. Go to: https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in the form:

```
Application Name: Anchor Engine
Homepage URL: http://localhost:3160
Authorization Callback URL: http://localhost:3160/auth/github/callback
```

4. Click **"Register application"**
5. Copy your **Client ID**
6. Click **"Generate a new client secret"** and copy it

---

### **Step 2: Configure Environment Variables**

Create or edit `.env` in your project root:

```bash
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
GITHUB_CALLBACK_URL=http://localhost:3160/auth/github/callback
```

**Or** add to `user_settings.json`:

```json
{
  "github": {
    "client_id": "your_client_id_here",
    "client_secret": "your_client_secret_here",
    "callback_url": "http://localhost:3160/auth/github/callback"
  }
}
```

---

### **Step 3: Restart Engine**

```bash
# Stop engine
pkill -f "node.*engine/dist"

# Start engine
cd /data/data/com.termux/files/home/projects/anchor-engine-node
node --expose-gc --max-old-space-size=6144 engine/dist/index.js
```

---

## 🔗 **How to Authenticate**

### **Option 1: Browser Flow (Recommended)**

1. Open browser to: `http://localhost:3160/auth/github`
2. You'll be redirected to GitHub
3. Click **"Authorize Anchor Engine"**
4. Redirected back to: `http://localhost:3160/settings?github_connected=true&user=yourusername`
5. ✅ **Done!** Your private repos are now accessible

### **Option 2: Check Auth Status**

```bash
curl -s http://localhost:3160/auth/github/status | jq
```

**Response:**
```json
{
  "connected": true,
  "user": {
    "login": "yourusername",
    "id": 123456
  },
  "scopes": ["repo", "read:user"]
}
```

### **Option 3: Disconnect GitHub**

```bash
curl -X DELETE http://localhost:3160/auth/github
```

---

## 📥 **Ingesting Private Repos**

Once authenticated, ingest private repos normally:

### **Via API:**
```bash
curl -X POST http://localhost:3160/v1/github/repos \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "yourusername",
    "repo": "private-repo-name",
    "branch": "main"
  }'
```

### **Via UI:**
1. Go to `/settings` page
2. Find "GitHub Repositories" section
3. Enter `yourusername/private-repo-name`
4. Click **"Ingest"**

---

## 🔒 **Security Features**

| Feature | Description |
|---------|-------------|
| **CSRF Protection** | State parameter prevents cross-site request forgery |
| **httpOnly Cookies** | Session cookies not accessible to JavaScript |
| **Secure Token Storage** | Tokens stored in-memory (upgrade to encrypted DB in production) |
| **Scope Limitation** | Only requests `repo` and `read:user` scopes |
| **Session Expiry** | 24-hour sessions (configurable) |

---

## 🛠️ **Troubleshooting**

### **"Invalid state parameter"**
- Clear browser cookies for localhost:3160
- Try again in a fresh browser session

### **"OAuth App not configured"**
- Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set
- Restart the engine after setting env vars

### **"Private repo not found"**
- Ensure you authorized the OAuth app
- Check that your GitHub account has access to the repo
- Verify OAuth token has `repo` scope: `curl http://localhost:3160/auth/github/status`

### **Token expired**
- Re-authenticate: visit `/auth/github` again
- Tokens are refreshed automatically when possible

---

## 📊 **API Reference**

### **Start OAuth Flow**
```
GET /auth/github
```
Redirects to GitHub for authentication.

### **OAuth Callback**
```
GET /auth/github/callback?code=xxx&state=yyy
```
Handles GitHub redirect after authorization.

### **Check Auth Status**
```
GET /auth/github/status
```
Returns current authentication status.

**Response:**
```json
{
  "connected": true,
  "user": { "login": "username", "id": 123456 },
  "scopes": ["repo", "read:user"]
}
```

### **Disconnect GitHub**
```
DELETE /auth/github
```
Revokes OAuth token and clears session.

---

## 🎯 **Next Steps**

After setup:
1. ✅ Ingest your first private repo
2. ✅ Search across private and public repos
3. ✅ Use with MCP server for LLM access
4. ✅ Enjoy seamless GitHub integration!

---

## 📝 **Notes**

- **Development Mode:** Cookies are not secure (httpOnly only). Enable HTTPS for production.
- **Token Storage:** Currently in-memory. For production, upgrade to encrypted database storage.
- **Session Duration:** 24 hours by default. Adjust in `engine/src/index.ts` session config.

---

**Questions?** Open an issue on GitHub or check the [OAuth 2.0 spec](https://oauth.net/2/)
