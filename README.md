# 🎓 AcadHub - Smart Academic Companion

> **Your all-in-one platform for tracking attendance, managing schedules, and staying organized throughout college.**

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://acadhub.kuberbassi.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Made with AI](https://img.shields.io/badge/built%20with-agentic%20AI-orange)](https://github.com/google/agentic)


---

## ✨ Features

### 📊 Smart Attendance Tracking
- **Real-time Analytics**: Visual charts showing attendance trends
- **Bunk Calculator**: Know exactly when you can (or can't) skip class
- **Multi-Semester Support**: Isolated data for each semester
- **Medical Leave Tracking**: Separate medical attendance calculations
- **Calendar View**: See your complete attendance history at a glance
- **v2.0.0** 🚀: Automated version checking and in-app updates
- **Real-time Sync**: Changes on web instantly reflect on mobile via Socket.IO

### 📅 Dynamic Timetable
- **Customizable Structure**: Define your own periods and breaks
- **Quick Attendance**: Mark attendance directly from timetable
- **Today's Classes**: Highlighted view of current day schedule
- **Subject Management**: Full CRUD operations for subjects

### 🔔 Unified Notifications
- **Google Classroom Integration**: Automatic sync with assignments and announcements
- **University Notices**: Live-scraped official circulars
- **Smart Filtering**: Only see what matters to you

### 🎓 Onboarding & Help
- **Interactive Tutorial**: 11-step onboarding flow with emojis
- **How to Use Guide**: In-app guide accessible from Settings
- **Theme Support**: Dark/Light mode with consistent styling

### 🔒 Data Safety
- **Cache Versioning**: Automatic migration on app updates
- **Safe Updates**: No data loss when updating the app
- **Offline Persistence**: Works without internet connection

### 🎯 Skills Tracker
- **Progress Monitoring**: Track skill development across categories
- **Visual Indicators**: Progress bars and level badges
- **Categories**: Programming, Design, Languages, Business, Creative & more

### 📱 Progressive Web App (PWA)
- **Install Anywhere**: Works on mobile, tablet, and desktop
- **Offline Support**: Core functionality works without internet
- **Push Notifications**: Get alerted even when browser is closed
- **Update System**: Checks GitHub for new APK releases automatically

### 📲 Native Mobile App
- **React Native**: Smooth 120fps performance on iOS/Android
- **Dark Mode**: Automatic theme switching
- **Haptic Feedback**: Premium tactile interactions
- **Optimized UI**: Material Design 3 components

---

## 🚀 Quick Start

### Web Application

```bash
# Clone repository
git clone https://github.com/kuberbassi/acadhub.git
cd acadhub

# Backend setup
cd api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

Access at: **http://localhost:5173**

### Mobile Application

```bash
cd mobile
npm install
npx expo start
```

Scan QR code with Expo Go app or press `i` for iOS simulator / `a` for Android

### 🐳 Running with Docker

Run the entire stack (Frontend + Backend + Database) with a single command:

```bash
# Build and start services
docker-compose up --build
```
    
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **MongoDB**: `localhost:27017`

---

## 🛠️ Tech Stack

### Frontend
- **React 18** with Vite - Lightning-fast dev server
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Beautiful animations
- **Recharts** - Data visualization

### Mobile
- **React Native (Expo)** - Managed workflow
- **Expo Go** - Quick testing
- **Hermes Engine** - Optimized JS performance
- **120fps Support** - ProMotion displays

### Backend
- **Flask** - Python web framework
- **MongoDB Atlas** - Cloud database
- **Google OAuth 2.0** - Secure authentication
- **Google Classroom API** - Automatic sync
- **Beautiful Soup** - Web scraping

---

## 📋 Prerequisites

- **Node.js** 18+ & npm
- **Python** 3.8+
- **MongoDB** connection string
- **Google Cloud** project with OAuth credentials

---

## ⚙️ Configuration

### Environment Variables

**Backend** (`api/.env`):
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/
FLASK_SECRET_KEY=your-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/callback
```

**Frontend** (`frontend/.env`):
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

**Mobile** (`mobile/app.json`):
Already configured - just update API endpoint in `mobile/src/services/api.js`

---

##Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable APIs:
   - Google Classroom API
   - Google Calendar API (optional)
4. Create OAuth 2.0 credentials
5. Add authorized origins:
   - `http://localhost:5173`
   - `http://localhost:5000`
6. Add redirect URIs:
   - `http://localhost:5000/api/auth/callback`
7. Copy credentials to `.env` files

---

## 📱 Mobile App Setup

### Development Build (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for Android
eas build --platform android --profile preview

# Build for iOS (macOS only)
eas build --platform ios --profile preview
```

### Testing with Expo Go

```bash
npx expo start
```

**Limitations in Expo Go:**
- Push notifications don't work (use development build)
- Some native modules limited

---

## 🗂️ Project Structure

```
acadhub/
├── frontend/          # React web app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── types/
│   └── public/
├── mobile/            # React Native app
│   ├── src/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── services/  # 90+ API endpoints
│   │   └── contexts/
│   └── app.json
├── api/               # Flask backend
│   ├── api/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   └── ...
│   └── run.py
└── README.md
```

---

## 🎯 Key Features Explained

### Semester Management
Switch between semesters seamlessly. Each semester has:
- Isolated timetable
- Separate attendance logs
- Individual subject list
- Independent analytics

### Attendance Calculator
Smart algorithm that calculates:
- Current attendance percentage
- Classes needed to reach target %
- Maximum safe skips remaining
- Impact of each attendance mark

### Google Classroom Sync
Automatically fetches:
- Course announcements
- Assignments with due dates
- Materials and resources
- All in one unified feed

---

## 🚢 Deployment

### Frontend (Vercel/Netlify)

```bash
cd frontend
npm run build
# Deploy 'dist' folder
```

### Backend (Railway/Render)

```bash
# Deploy via Git integration
# Set environment variables in dashboard
```

### Mobile (App Store / Play Store)

```bash
# Build production
eas build --platform all --profile production

# Submit to stores
eas submit
```

---

## 🧪 Testing

### Web
```bash
cd frontend
npm run test           # Unit tests
npm run test:e2e       # E2E tests
```

### Backend
```bash
cd api
python -m pytest       # Run all tests
```

### Mobile
Use the [Testing Checklist](docs/testing_checklist.md) for manual testing

---

## 📈 Performance

- **Web**: Lighthouse score 95+
- **Mobile**: 120fps on ProMotion displays
- **Backend**: Sub-100ms API response times
- **PWA**: Instant load with service worker

---

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file

---

## 🙏 Acknowledgments

- Built entirely through **Agentic AI** prompt engineering
- Demonstrates modern full-stack development practices
- Showcases human-AI collaboration in software engineering

---

## 📞 Contact

**Kuber Bassi**  
- GitHub: [@kuberbassi](https://github.com/kuberbassi)
- Email: kuberbassi2007@gmail.com
- Website: [kuberbassi.com](https://kuberbassi.com)

---

<div align="center">
  <sub>Built with ❤️ using Agentic AI</sub>
</div>
