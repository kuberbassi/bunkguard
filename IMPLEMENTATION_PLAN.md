# Ultimate BunkGuard Evolution Plan

## Goal
Transform BunkGuard from a simple tracker into a **professional, LMS-style Academic Manager**. The focus is on precision, advanced metrics, and a premium "University Portal" aesthetic.

## User Review Required
> [!IMPORTANT]
> **Google Classroom Integration**: You will need to enable the "Google Classroom API" in your Google Cloud Console and add the formatting scopes to your OAuth consent screen for this to work.

## Proposed Features (Phased)

### Phase 1: The "LMS" Foundation (Navigation & Layout)
-   **App Shell Layout**: Replace simple header with a persistent **Sidebar Navigation**.
    -   Links: Dashboard, Analytics, Schedule (Timetable), Calendar, Planner, Settings.
-   **Professional Polish**: Refine typography and spacing to match Stripe/Vercel dashboards.

### Phase 2: Advanced Analytics (The "Metrics" Request)
-   **Analytics Page**:
    -   **Attendance Trend Line**: Visual graph showing how attendance has changed over the semester.
    -   **"Bunk Habits"**: Bar chart showing which days of the week you miss most.
    -   **Prediction Engine**: "If you maintain this rate, you will end with X%."

### Phase 3: Planner & Practicals
-   **Academic Planner**: A Kanban board for Assignments and Exams.
-   **Practicals Tracker**:
    -   Auto-detects "Lab" slots from Timetable.
    -   Tracks "Experiments Completed" vs "Total" (10-15 typical).
    -   Hardcopy submission status tracker.

### Phase 4: Integrations (Google Classroom)
-   **Classroom Sync**:
    -   Fetch "CourseWork" (Assignments) from Google Classroom.
    -   Auto-populate the **Planner** with these due dates.
    -   Link to "Materials" (Notes) for subjects.

## Implementation Steps (Current Session)

### 1. New Layout System
#### [NEW] [components/layout/AppLayout.tsx](file:///K:/Kuber Bassi/Dev/Projects/bunkguard/frontend/src/components/layout/AppLayout.tsx)
-   Sidebar with navigation items.
-   Top bar for Breadcrumbs/User Profile.
-   Main content area.

### 2. Analytics Module
#### [NEW] [pages/Analytics.tsx](file:///K:/Kuber Bassi/Dev/Projects/bunkguard/frontend/src/pages/Analytics.tsx)
-   Integrate `recharts`.
-   Attendance Trends & Day-wise breakdown.

### 3. Planner & Classroom Service
#### [NEW] [services/google-classroom.service.ts](file:///K:/Kuber Bassi/Dev/Projects/bunkguard/frontend/src/services/google-classroom.service.ts)
-   Service to fetch courses and coursework.
#### [NEW] [pages/Planner.tsx](file:///K:/Kuber Bassi/Dev/Projects/bunkguard/frontend/src/pages/Planner.tsx)
-   Sourcing data from both local manual entry and Google Classroom.
