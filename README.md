 Smart Navigation Filter

**Intelligent Indoor Navigation System for Real-Time Path Optimization and Inclusive Emergency Evacuation**


---

## What It Does

An indoor navigation and emergency evacuation app for buildings where GPS doesn't work. The system uses BLE Bluetooth beacons for real-time indoor positioning and guides users to their destination through a 3D interactive map. During emergencies, it detects fire via computer vision and automatically reroutes users to the nearest safe exit.

Built for people with disabilities — wheelchair users get stair-free routes, visually impaired users get voice and haptic guidance, and an SOS button sends the user's exact indoor location to rescue teams.

## How It Works

```
BLE Beacons → Phone detects signal strength → App calculates position
     ↓
3D Map shows blue dot at your location
     ↓
Select destination → Dijkstra's algorithm finds shortest path
     ↓
Fire detected by webcam → Firebase alert → App reroutes around fire
     ↓
SOS button → SMS with indoor location sent to rescue team
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React, Three.js (3D rendering) |
| Mobile | Capacitor (native Android app) |
| Positioning | BLE iBeacon protocol, RSSI trilateration |
| Pathfinding | Dijkstra's algorithm with dynamic edge-blocking |
| Fire Detection | Python, OpenCV (HSV thresholding, blob detection, flicker analysis) |
| Database | Firebase Firestore (real-time sync) |
| Auth | Firebase Authentication |
| SOS | Textbelt SMS API + Firebase |

## Project Structure

```
src/
├── App.jsx              # Main app — auth, routing, SOS/panic system
├── MapView3D.jsx        # 3D map renderer, BLE scanning, pathfinding UI
├── MapView.jsx          # 2D map view
├── pathfinding.js       # Dijkstra's algorithm implementation
├── firebase.js          # Firebase config
├── data/
│   └── buildingData.js  # Building map — nodes, edges, walls, beacons, fire zones
├── App.css
└── index.css

fire_detector.py         # Webcam-based fire detection (runs on laptop)
```

## Features

- **Indoor Positioning** — BLE beacons track user location in real-time where GPS can't reach
- **3D Interactive Map** — Walk through the building with a blue dot following your position
- **Accessible Routing** — Wheelchair users automatically get stair-free routes
- **Fire Detection** — Webcam + OpenCV detects flames and sends alerts to all connected devices within 1 second
- **Dynamic Rerouting** — When fire is detected, blocked exits are removed from the navigation graph and a new safe path is calculated instantly
- **SOS Alert** — Sends user's indoor position and disability profile to rescue teams via SMS
- **Multi-modal Feedback** — Visual path rendering, voice navigation, and vibration patterns

## Setup

### Prerequisites

- Node.js 18+
- Android Studio (for phone deployment)
- Python 3.9+ (for fire detection)
- Firebase project with Firestore and Authentication enabled

### Install & Run

```bash
# Clone
git clone https://github.com/nurull603/Smart-Navigation-Filter.git
cd Smart-Navigation-Filter

# Install dependencies
npm install

# Create .env with your Firebase config
# VITE_FIREBASE_API_KEY=...
# VITE_FIREBASE_AUTH_DOMAIN=...
# VITE_FIREBASE_PROJECT_ID=...
# VITE_FIREBASE_STORAGE_BUCKET=...
# VITE_FIREBASE_MESSAGING_SENDER_ID=...
# VITE_FIREBASE_APP_ID=...

# Dev server (browser testing)
npm run dev -- --host

# Build for Android
npm run build
npx cap sync
npx cap open android
```

### Fire Detection

```bash
# Install Python dependencies
pip3 install opencv-python firebase-admin

# Place firebase-key.json on Desktop (from Firebase Console → Settings → Service Accounts)

# Run
cd ~/Desktop
python3 fire_detector.py
```

## Hardware

- **BLE Beacons** — Blue Charm BC011, iBeacon mode, configured via BeaconSet+ app
- **Webcam** — Any laptop webcam (for fire detection station)
- **Phone** — Android device with BLE support

## Firebase Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fire_alerts/{document=**} { allow read, write: if true; }
    match /users/{document=**} { allow read, write: if true; }
    match /rescue_alerts/{document=**} { allow read, write: if true; }
  }
}
```

## Team

- Julio Tito
- Cinchan Harikrishna
- Nurullah Dogan
- Roshani Patel
- Venesha Arockiasamy

**Advisors:** Dr. Katherine Grace August (IEEE) & Dr. Sasan Haghani

Rutgers University — School of Engineering — ECE Department — Capstone S26-10
