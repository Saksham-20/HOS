# 🚛 TruckerPro — HOS Compliance & GPS Tracking System

A full-stack trucking compliance and real-time GPS tracking system built with React Native and Node.js.

This project simulates an electronic logging device (ELD) style workflow where drivers can record duty status, while administrators monitor compliance and trip activity.

---

## ✨ Key Features

### 👨‍✈️ Driver App (React Native)

* Secure driver authentication
* Daily log (HOS) management
* Background GPS tracking
* Real-time location updates
* Trip route playback on map
* Offline-safe location handling

---

### 🧑‍💼 Admin / Backend

* REST API built with Node.js & Express
* Trip and log management
* GPS coordinate ingestion pipeline
* Request validation with Zod
* Centralized error handling
* Rate limiting & security middleware
* PostgreSQL database integration

---

## 🗺️ Route Playback

The system stores GPS coordinates and reconstructs trip routes using map polylines, enabling:

* trip history visualization
* driver activity review
* compliance monitoring

---

## 🏗️ Tech Stack

**Mobile**

* React Native
* Expo Location
* React Navigation
* Context API

**Backend**

* Node.js
* Express.js
* PostgreSQL
* Zod (API validation)
* Jest + Supertest (testing)
* Docker

---

## 🧪 Test Coverage

Basic automated tests included:

* Auth API test
* GPS ingestion test
* Logs API test
* React Native render test

---

## 📦 Project Structure

```
HOS/
├── src/                # React Native app
├── backend/            # Express API
├── __tests__/          # Test suite
├── ios/                # iOS project
├── android/            # Android project
└── Dockerfile
```

---

## ⚙️ Local Setup

### 1️⃣ Clone repo

```bash
git clone <your-repo-url>
cd HOS
```

---

### 2️⃣ Backend setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

---

### 3️⃣ Mobile app

```bash
cd ..
npm install
npx expo start
```

---

## 🔐 Environment Variables

Create `.env` in backend:

```
PORT=5000
DATABASE_URL=your_postgres_url
JWT_SECRET=your_secret
```

---

## 🚀 Deployment

Backend is configured for:

* Docker
* Render / Railway style deployment

See:

* `backend/render.yaml`
* `RENDER_DEPLOYMENT.md`

---

## 🧭 Future Improvements

Planned enhancements:

* HOS violation detection
* WebSocket live tracking
* Offline sync queue
* Advanced analytics dashboard
* AI-powered compliance insights

---

## 👨‍💻 Author

**Nishant Puri**

* Final-year Computer Science student
* Software Engineer Intern
* Open to remote opportunities worldwide

---

## ⚠️ Note

This project was developed with the assistance of AI development tools (Claude, Cursor) while focusing on understanding full-stack architecture, GPS telemetry flows, and production backend practices.
