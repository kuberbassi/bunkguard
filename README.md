# 🎓 AcadHub (BunkGuard)

**AcadHub** is a comprehensive student assistant application designed to help you manage your academic life. Track attendance, manage manual courses, whiteboard your ideas, and stay updated with classroom announcements—all in one place.

## ✨ Features

### 📊 Attendance Tracker
*   **Smart Analytics**: Visualize your attendance trends with monthly graphs.
*   **Bunk Guard**: Real-time calculations of "Safe Skips" or "Classes to Attend" to maintain your target percentage.
*   **Medical Leave Support**: Log medical leaves which are calculated separately.

### 📅 Dynamic Timetable & Calendar
*   **Interactive Timetable**: Fully customizable grid structure (Periods/Breaks).
*   **Calendar View**: Toggle between "Attendance" (history) and "Events" (holidays/tasks).
*   **Preferences**: Your view settings are saved automatically.

### 🔔 Notification Center
*   **Unified Feed**: Aggregates updates from two sources:
    1.  **Google Classroom**: Announcements from your teachers.
    2.  **University Notices**: Live-scraped official circulars.
*   **PWA Support**: Install as a native app on Mobile/Desktop to receive background alerts.

### 📚 Course Manager
*   **Manual Courses**: Track progress for self-paced courses (Udemy, Coursera, etc.).
*   **Kanban/Board**: A built-in whiteboard (`tldraw`) for jotting down quick notes found in the "Board" tab.

### 💾 Data Persistence
*   All data (Structure, Courses, Drawings) is securely synced to the cloud (MongoDB), linked to your Google Account.
*   No more data loss on browser refresh.

---

## 🛠️ Tech Stack

*   **Frontend**: React (Vite), TypeScript, Tailwind CSS, Framer Motion.
*   **Backend**: Python (Flask), PyMongo, Google OAuth.
*   **Database**: MongoDB Atlas.
*   **PWA**: Service Workers, Web App Manifest.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js & npm
*   Python 3.x & pip
*   MongoDB Connection String

### installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/acadhub.git
    cd acadhub
    ```

2.  **Backend Setup**
    ```bash
    cd api
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r headers.txt  # or requirements.txt
    ```

3.  **Frontend Setup**
    ```bash
    cd ../frontend
    npm install
    ```

4.  **Environment Variables**
    Create a `.env` file in the `api` directory:
    ```env
    MONGO_URI=your_mongodb_connection_string
    FLASK_SECRET_KEY=your_secret_key
    
    # OAuth Credentials (Auth0 / Google)
    AUTH0_CLIENT_ID=...
    AUTH0_CLIENT_SECRET=...
    AUTH0_DOMAIN=...
    ```
    Create a `.env` file in the `frontend` directory:
    ```env
    VITE_API_BASE_URL=http://localhost:5000
    VITE_GOOGLE_CLIENT_ID=your_google_client_id
    ```

5.  **Run the App**
    *   **Backend**: `python run.py`
    *   **Frontend**: `npm run dev`

---

## 🔑 OAuth Setup Guide

To enable Google Login, you need to configure your **Auth0** or **Google Cloud Console** application.

1.  **Google Cloud Console**:
    *   Enable **Google Classroom API** and **Google Calendar API**.
    *   Create Credentials > OAuth Client ID.
    *   Authorized Origins: `http://localhost:5173`
    *   Authorized Redirect URIs: `http://localhost:5000/api/auth/callback`

2.  **Scopes Required**:
    *   `openid`, `email`, `profile`
    *   `https://www.googleapis.com/auth/classroom.courses.readonly`
    *   `https://www.googleapis.com/auth/classroom.announcements.readonly`

---

## 📲 PWA Installation

1.  Open the app in your browser (Chrome/Edge/Safari).
2.  Look for the **"Install"** icon in the address bar.
3.  Click "Install" to get the native app experience.

---

## 📄 License

MIT License.
