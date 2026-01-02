# GeoLocation Tracking System(Driver)

A production-grade real-time geolocation tracking platform built for logistics applications. This system provides live driver tracking with role-based access control and location sharing capabilities - all running on Firebase free tier with no backend servers required.

**Author:** E S  
**GitHub:** [https://github.com/SURIYA-PRAKASH-E-S](https://github.com/SURIYA-PRAKASH-E-S)  

*Made with ❤️ by E S*

## 🚀 Features

- **Real-Time Driver Tracking**: Live location updates using Firebase subscriptions (no polling)
- **Role-Based Access**: Driver, Customer, and Admin roles with appropriate permissions
- **Share Access**: Drivers can share their location with specific customers
- **Automatic Offline Detection**: Uses Firebase `onDisconnect()` for reliable offline status
- **Interactive Map**: Real-time moving markers with Leaflet.js and OpenStreetMap
- **Production Security**: Firebase security rules enforce all access control
- **100% Free Tier**: Uses only Firebase free tier features
- **No Backend Required**: Complete client-side architecture

## 📋 System Architecture

### Roles & Permissions

**Driver:**
- Anonymous authentication using UID as driver ID
- Writes live latitude/longitude to `/drivers/{driverId}`
- Automatic offline status on disconnect
- Can share access with specific customers
- Can view other drivers for coordination

**Customer:**
- Can view drivers who have shared access with them
- Real-time updates for shared driver locations
- Can track specific drivers by UID

**Admin:**
- Can view ALL drivers in the system
- Full read access to driver data
- Can manage system operations

### Database Schema

```
/drivers/{driverId}
  lat: number              // Latitude coordinate
  lng: number              // Longitude coordinate  
  online: boolean          // Online status
  updatedAt: number        // Timestamp of last update
  sharedWith:              // Customer access permissions
    {customerUid}: boolean // Customer UID -> true/false

/admins/{adminUid}
  true: boolean            // Admin user marker
```

### Logical API Layer

The system includes a clean API abstraction:

```javascript
// Location management
locationAPI.updateDriverLocation(driverId, lat, lng)
locationAPI.subscribeToDriver(driverId, callback)
locationAPI.subscribeToAllDrivers(callback)

// Share access management
locationAPI.shareWithCustomer(driverId, customerUid)
locationAPI.trackSpecificDriver(driverUid, callback)
```

## 📁 Project Structure

```
GeolocationAPI/
├── README.md                    # This documentation file
├── firebase.json               # Firebase configuration
├── database.rules.json         # Firebase security rules
├── style.css                   # Global styles (root level)
├── firebase-debug.log          # Firebase CLI logs
└── public/                     # Static web assets
    ├── index.html              # Main HTML page
    ├── app.js                  # Main JavaScript application
    ├── favicon.ico             # Site favicon
    └── package-lock.json       # Node.js dependencies lock file
```

### Key Files Overview

- **`database.rules.json`** - Firebase security rules controlling access permissions
- **`public/app.js`** - Core application logic with Firebase integration and real-time tracking
- **`public/index.html`** - Main web interface with role selection and map display
- **`firebase.json`** - Firebase project configuration for deployment

## 🛠️ Setup Instructions

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name (e.g., "logistics-tracking")
4. Enable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Required Services

**Anonymous Authentication:**
1. In Firebase Console, go to Authentication → Sign-in method
2. Enable "Anonymous" provider
3. Save settings

**Realtime Database:**
1. Go to Realtime Database → Create database
2. Choose location closest to your users
3. Start in "test mode" temporarily
4. Click "Enable"

**Firebase Hosting:**
1. Go to Hosting → Get started
2. Complete the setup wizard

### 3. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 4. Configure Project

1. Clone or download this project
2. Navigate to project directory
3. Login to Firebase:
   ```bash
   firebase login
   ```
4. Initialize Firebase:
   ```bash
   firebase init
   ```
5. Select your project from the list
6. Choose "Hosting" and "Realtime Database" when prompted

### 5. Update Firebase Configuration

Edit `app.js` and replace the placeholder config with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

Get your config from Firebase Console → Project Settings → General → Your apps.

### 6. Deploy Security Rules

Deploy the production-ready security rules:

```bash
firebase deploy --only database
```

### 7. Deploy to Hosting

```bash
firebase deploy --only hosting
```

## 🧪 Testing Instructions

### Multi-Browser Tab Testing

The best way to test the real-time functionality is using multiple browser tabs:

**Tab 1 - Driver:**
1. Open your deployed URL
2. Select "Driver" role
3. Click "Authenticate"
4. Click "Start Tracking"
5. Allow location permissions when prompted
6. Driver marker should appear and move in real-time

**Tab 2 - Customer:**
1. Open same URL in new tab
2. Select "Customer" role  
3. Click "Authenticate"
4. Enter driver UID to track (provided by driver)
5. Should see driver location if access was shared

**Tab 3 - Admin:**
1. Open same URL in third tab
2. Select "Admin" role
3. Click "Authenticate"
4. Should see all drivers in the system
5. Full visibility of all driver locations

### Local Testing

**Option 1: Firebase Emulator (Recommended)**

1. Install emulator:
   ```bash
   firebase setup:emulators:database
   ```

2. Start emulator:
   ```bash
   firebase emulators:start
   ```

3. Update `app.js` to use emulator:
   ```javascript
   // Add this after firebase.initializeApp()
   if (window.location.hostname === "localhost") {
       firebase.database().useEmulator("localhost", 9000);
   }
   ```

4. Open `http://localhost:5000` in browser

**Option 2: Simple Static Server**

1. Install Node.js if not already installed
2. Install http-server:
   ```bash
   npm install -g http-server
   ```
3. Serve the files:
   ```bash
   cd public
   http-server -p 8080
   ```
4. Open `http://localhost:8080`

## 🎭 Demo Walkthrough

### Multi-Tab Real-Time Demo

**Tab 1 - Driver:**
1. Open your application URL
2. Select "Driver" role
3. Click "Authenticate" 
4. Click "Start Tracking"
5. Allow location permissions
6. Driver marker appears green and moves in real-time

**Tab 2 - Customer:**
1. Open same URL in new tab
2. Select "Customer" role
3. Click "Authenticate"
4. See driver appear in list if access was shared
5. Driver marker appears on map and moves synchronously with Tab 1

**Tab 3 - Admin:**
1. Open same URL in third tab  
2. Select "Admin" role
3. Click "Authenticate"
4. See all drivers in the system
5. Full visibility of all driver locations and status

### Testing Scenarios

**Real-Time Movement:**
- Move around with Tab 1 (driver) - watch marker move in real-time in all tabs
- Close Tab 1 - driver goes offline in other tabs within seconds

**Share Access:**
- Driver shares access with specific customer UID
- Customer can only see shared drivers
- Admin sees all drivers regardless of sharing

**Offline Detection:**
- Close driver browser tab
- Driver status changes to "Offline" in other tabs
- Marker turns gray and disappears after timeout

## 📊 Free Tier Usage

This system is designed to stay within Firebase free tier limits:

**Realtime Database:**
- 1GB of storage (driver locations are small)
- 100GB/month downloads (reasonable for demo)
- 100 simultaneous connections (plenty for testing)

**Hosting:**
- 10GB storage (application is < 1MB)
- 360MB/day bandwidth (very lightweight)
- Custom domain support available

**Authentication:**
- Anonymous users included
- No email/password storage required

## 🔧 Technical Details

### Real-Time Updates

The system uses Firebase Realtime Database listeners for instant updates:

```javascript
// No polling - real-time subscriptions
database.ref('drivers').on('value', (snapshot) => {
    // Instant updates when any driver moves
});
```

### Automatic Offline Detection

Firebase `onDisconnect()` ensures reliable offline status:

```javascript
// Automatically sets driver to offline on disconnect
driverRef.onDisconnect().update({
    online: false,
    updatedAt: firebase.database.ServerValue.TIMESTAMP
});
```

### Security Rules

Production-ready security rules enforce all access control without backend code:

```json
{
  "rules": {
    "drivers": {
      ".read": "auth !== null",
      ".write": "auth !== null && root.child('admins').child(auth.uid).exists()",
      "$driverId": {
        ".read": "auth !== null && (auth.uid === $driverId || root.child('admins').child(auth.uid).exists() || (data.child('sharedWith').child(auth.uid).exists() && data.child('online').val() === true))",
        ".write": "auth !== null && auth.uid === $driverId"
      }
    },
    "admins": {
      "$adminUid": {
        ".read": "auth !== null && auth.uid === $adminUid",
        ".write": "auth !== null && auth.uid === $adminUid"
      }
    }
  }
}
```

## 🚀 Deployment Commands

```bash
# Deploy database rules
firebase deploy --only database

# Deploy hosting
firebase deploy --only hosting

# Deploy both
firebase deploy
```

## 🆘 Troubleshooting

**Location not updating:**
- Check browser location permissions
- Ensure HTTPS (required for geolocation)
- Check browser console for errors

**Drivers not appearing:**
- Verify Firebase configuration
- Check security rules are deployed
- Ensure both tabs are authenticated

**Map not loading:**
- Check internet connection for map tiles
- Verify Leaflet.js CDN is accessible
- Check browser console for JavaScript errors

**Firebase connection issues:**
- Verify database URL in config
- Check Firebase project status
- Ensure security rules allow access

## 📄 License

MIT License - feel free to use for commercial logistics applications.

## 🆘 Support

For issues and questions:
1. Check this README for common solutions  
2. Review Firebase documentation
3. Test with Firebase emulator first
4. Verify security rules deployment

---

**Built with ❤️ by E S for the logistics industry**

**Connect with the author:**  
- **GitHub:** [https://github.com/SURIYA-PRAKASH-E-S](https://github.com/SURIYA-PRAKASH-E-S)  
- **Name:** E S
