# 🎓 AcadHub

> **An Agentic AI Prompt Engineering Project**

**AcadHub** is a comprehensive student assistant application built entirely through **agentic AI prompt engineering**. This project demonstrates the power of AI-assisted development, where complex features—from OAuth integrations to real-time data syncing—were implemented through carefully crafted prompts and iterative AI collaboration.

## 🤖 About This Project

This application showcases **prompt engineering in action**. Every feature, component, and integration was developed using AI agents as coding partners. The project serves as a practical demonstration of:

- **Agentic AI Development**: Leveraging AI assistants to write, debug, and refine production-ready code
- **Iterative Prompt Engineering**: Crafting precise prompts to achieve specific technical outcomes
- **Human-AI Collaboration**: Combining human creativity with AI capabilities for rapid development
- **Full-Stack Implementation**: From React frontends to Flask backends, all built through AI interaction

---

## ✨ Features

### 📊 Attendance Tracker
*   **Smart Analytics**: Visualize your attendance trends with monthly graphs.
*   **Bunk Guard**: Real-time calculations of "Safe Skips" or "Classes to Attend" to maintain your target percentage.
*   **Medical Leave Support**: Log medical leaves which are calculated separately.

### 📅 Dynamic Timetable & Calendar
*   **Interactive Timetable**: Fully customizable grid structure (Periods/Breaks).
*   **Attendance Calendar**: View your complete attendance history in a visual calendar.
*   **Preferences**: Your view settings are saved automatically.

### 🔔 Notification Center
*   **Unified Feed**: Aggregates updates from two sources:
    1.  **Google Classroom**: Announcements and Assignments from your teachers.
    2.  **University Notices**: Live-scraped official circulars.
*   **Background Updates**: Automatic polling ensures you never miss an update.
*   **PWA Support**: Install as a native app on Mobile/Desktop to receive background alerts.

### 🎯 Skill Tracker
*   **Skill Management**: Track and monitor your skill development across multiple domains.
*   **Progress Tracking**: Visual progress indicators for each skill.
*   **Categories**: Organize skills by Programming, Design, Languages, Business, Creative, and more.
*   **Skill Levels**: Track from Beginner to Expert.

### 🗓️ Academic Management
*   **Semester Isolation**: Seamlessly switch between semesters. Your timetable, attendance logs, and stats are completely isolated for each semester.
*   **Legacy Data Support**: Old data is automatically migrated and preserved when you switch contexts.
*   **Custom Slots**: Add non-academic blocks like "Library", "Lunch", or "Gym" to your timetable. These are purely for scheduling and don't affect your attendance analytics.

### 💾 Data Persistence
*   All data (Attendance, Skills, Settings) is securely synced to the cloud (MongoDB), linked to your Google Account.
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

### Installation

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
