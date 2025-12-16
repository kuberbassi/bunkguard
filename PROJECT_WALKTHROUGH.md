# Material Design & Google Login Update

We have successfully migrated the BunkGuard application to **Material Design 3 (Material You)** and integrated **Client-Side Google Authentication**.

## Key Changes

### 1. Visual Overhaul (Material You)
The entire application now follows Google's Material Design 3 guidelines:
-   **Color System:** Dynamic color palettes with `surface`, `primary`, `secondary`, and `tertiary` roles.
-   **Typography:** Switched to **Roboto** (Google's standard font) for a clean, modern look.
-   **Components:** Refactored `Card`, `Button`, `Input`, and layouts to use M3 tokens (rounded corners, elevation, tonal states).
-   **Animations:** Smooth transitions using `framer-motion` and CSS transitions.

### 2. Google Authentication
-   Replaced the old server-redirect flow with a modern **Client-Side Popup flow**.
-   **Frontend:** Uses `@react-oauth/google` to securely authenticate the user.
-   **Backend:** New endpoint `/api/auth/google` verifies the token and creates a secure session.

### 3. New Settings Page
-   Accessed via the `/settings` route.
-   Allows users to:
    -   View profile details.
    -   Toggle Dark/Light mode (persisted).
    -   Manage data (Import/Export placeholders).

## Verification Steps

1.  **Login:**
    -   Open the app. You should see the new Material Design login page.
    -   Click "Continue with Google". A popup will appear.
    -   After login, you will be redirected to the Dashboard.

2.  **Dashboard & UI:**
    -   Check cards, buttons, and text. They should look rounded, colorful (Material style), and respond to hover/clicks.
    -   Try switching themes if enabled (Settings page).

3.  **Settings:**
    -   Navigate to `/settings` (if link added to nav, otherwise Type URL).
    -   Verify your name and email are displayed correctly from your Google profile.

## Troubleshooting

-   **"Invalid Token" Error:** Ensure your `VITE_GOOGLE_CLIENT_ID` in `frontend/.env` is correct.
-   **Backend 404:** If API calls fail, ensure the backend is running (`python run.py`).
-   **Google Popup Closed:** If you close the popup manually, login will fail gracefully.

## Next Steps
-   **Data Import/Export:** Connect the Settings page buttons to the actual API endpoints.
-   **Profile Editing:** Enable updating the display name via the API.

Enjoy the new BunkGuard experience!
