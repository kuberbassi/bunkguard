# Google Authentication Setup

To make "Sign in with Google" work, you need to create your own Google Cloud Project and get a Client ID. The one currently in `.env` is a placeholder.

## Step 1: Create a Google Cloud Project
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Click **Select a project** > **New Project**.
3.  Name it "BunkGuard" and click **Create**.

## Step 2: Configure OAuth Consent Screen
1.  In the left sidebar, go to **APIs & Services** > **OAuth consent screen**.
2.  Select **External** and click **Create**.
3.  Fill in:
    *   **App Information:** BunkGuard
    *   **User Support Email:** Your email
    *   **Developer Contact Information:** Your email
4.  Click **Save and Continue** (skip Scopes and Test Users for now).
5.  On the Summary page, click **Back to Dashboard**.

## Step 3: Create Credentials (Client ID)
1.  Go to **APIs & Services** > **Credentials**.
2.  Click **Create Credentials** > **OAuth client ID**.
3.  **Application Type:** Web application.
4.  **Name:** BunkGuard Frontend.
5.  **Authorized JavaScript origins:**
    *   `http://localhost:5173`
6.  **Authorized redirect URIs:**
    *   `http://localhost:5173`
7.  Click **Create**.

## Step 4: Update Your Project
1.  Copy the **Client ID** (it looks like `123...apps.googleusercontent.com`).
2.  Open the file `frontend/.env` in your project.
3.  Replace the placeholder `VITE_GOOGLE_CLIENT_ID` with your new Client ID:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=YOUR_NEW_CLIENT_ID_HERE
```

## Step 5: Restart the Server
1.  Stop the frontend terminal (Ctrl+C).
2.  Run `npm run dev` again.
3.  Login should now work!
