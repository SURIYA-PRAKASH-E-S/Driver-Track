// Firebase configuration - Replace with your config
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Global variables
let map;
let userRole = null;
let currentUser = null;
let isTracking = false;
let watchPositionId = null;
let markers = {};
let driversRef = null;
let driversListener = null;

// DOM elements
const elements = {
    roleSelect: document.getElementById('roleSelect'),
    authBtn: document.getElementById('authBtn'),
    userRole: document.getElementById('userRole'),
    userId: document.getElementById('userId'),
    driverControls: document.getElementById('driverControls'),
    customerControls: document.getElementById('customerControls'),
    customerUid: document.getElementById('customerUid'),
    shareBtn: document.getElementById('shareBtn'),
    trackingStatus: document.getElementById('trackingStatus'),
    toggleTracking: document.getElementById('toggleTracking'),
    driverUid: document.getElementById('driverUid'),
    trackDriverBtn: document.getElementById('trackDriverBtn'),
    onlineCount: document.getElementById('onlineCount'),
    totalCount: document.getElementById('totalCount'),
    driverListContent: document.getElementById('driverListContent'),
    notification: document.getElementById('notification'),
    systemTitle: document.getElementById('systemTitle'),
    zoomToLocation: document.getElementById('zoomToLocation')
};

// Initialize map
function initMap() {
    console.log('Initializing map...');
    const mapElement = document.getElementById('map');
    console.log('Map element found:', !!mapElement);
    
    try {
        map = L.map('map').setView([40.7128, -74.0060], 13);
        console.log('Map object created:', !!map);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        console.log('Map initialized successfully');
    } catch (error) {
        console.error('Error initializing map:', error);
        showNotification('Failed to initialize map', 'error');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    elements.notification.textContent = message;
    elements.notification.className = `notification ${type}`;
    elements.notification.classList.remove('hidden');
    
    setTimeout(() => {
        elements.notification.classList.add('hidden');
    }, 3000);
}

// Create custom icon for markers
function createIcon(color, isPulse = false) {
    const iconHtml = `
        <div style="
            background: ${color};
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            ${isPulse ? 'animation: pulse 2s infinite;' : ''}
        "></div>
    `;
    
    return L.divIcon({
        html: iconHtml,
        className: 'custom-marker',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
    });
}

// Add pulse animation
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.7; }
        100% { transform: scale(1); opacity: 1; }
    }
`;
document.head.appendChild(style);

// Authenticate user
async function authenticate() {
    const role = elements.roleSelect.value;
    
    if (!role) {
        showNotification('Please select a role', 'error');
        return;
    }
    
    try {
        elements.authBtn.disabled = true;
        elements.authBtn.textContent = 'Authenticating...';
        
        // Anonymous authentication
        const result = await auth.signInAnonymously();
        currentUser = result.user;
        userRole = role;
        
        // Update UI
        elements.userRole.textContent = `Role: ${role.charAt(0).toUpperCase() + role.slice(1)}`;
        elements.userId.textContent = currentUser.uid;
        elements.authBtn.textContent = 'Authenticated';
        elements.authBtn.disabled = true;
        elements.roleSelect.disabled = true;
        
        // Update title based on role
        if (role === 'driver') {
            elements.systemTitle.textContent = '🚚 GeoLocation Tracking System (Driver)';
        } else if (role === 'admin') {
            elements.systemTitle.textContent = '🚚 GeoLocation Tracking System (Admin)';
        } else if (role === 'customer') {
            elements.systemTitle.textContent = '🚚 GeoLocation Tracking System (Customer)';
        }
        
        // Show role-specific controls
        if (role === 'driver') {
            elements.driverControls.classList.remove('hidden');
        } else if (role === 'customer') {
            elements.customerControls.classList.remove('hidden');
        }
        
        // Start listening for drivers
        startListeningToDrivers();
        
        showNotification(`Authenticated as ${role}`, 'success');
        
    } catch (error) {
        console.error('Authentication error:', error);
        showNotification('Authentication failed', 'error');
        elements.authBtn.disabled = false;
        elements.authBtn.textContent = 'Authenticate';
    }
}

// Start listening to drivers
function startListeningToDrivers() {
    console.log('Starting to listen for drivers...');
    console.log('User role:', userRole);
    console.log('Current user:', currentUser?.uid);
    
    if (driversListener) {
        console.log('Removing existing driver listener');
        driversListener.off();
    }
    
    driversRef = database.ref('drivers');
    console.log('Drivers reference created:', driversRef.toString());
    
    if (userRole === 'admin') {
        // Admin can see all drivers
        console.log('Setting up admin driver listener');
        driversListener = driversRef.on('value', (snapshot) => {
            const drivers = snapshot.val() || {};
            console.log('Admin - received driver data:', Object.keys(drivers).length, 'drivers');
            console.log('Driver data:', drivers);
            updateDriversList(drivers);
            updateMapMarkers(drivers);
        }, (error) => {
            console.error('Admin driver listener error:', error);
        });
    } else if (userRole === 'customer') {
        // Customer can only see shared drivers
        console.log('Setting up customer driver listener');
        driversListener = driversRef.on('value', (snapshot) => {
            const allDrivers = snapshot.val() || {};
            console.log('Customer - received all drivers:', Object.keys(allDrivers).length);
            const sharedDrivers = {};
            
            Object.keys(allDrivers).forEach(driverId => {
                const driver = allDrivers[driverId];
                if (driver.sharedWith && driver.sharedWith[currentUser.uid]) {
                    sharedDrivers[driverId] = driver;
                }
            });
            
            console.log('Customer - shared drivers:', Object.keys(sharedDrivers).length);
            updateDriversList(sharedDrivers);
            updateMapMarkers(sharedDrivers);
        }, (error) => {
            console.error('Customer driver listener error:', error);
        });
    } else if (userRole === 'driver') {
        // Driver can see all other drivers (for demo purposes)
        console.log('Setting up driver driver listener');
        driversListener = driversRef.on('value', (snapshot) => {
            const allDrivers = snapshot.val() || {};
            console.log('Driver - received all drivers:', Object.keys(allDrivers).length);
            const otherDrivers = {};
            
            Object.keys(allDrivers).forEach(driverId => {
                if (driverId !== currentUser.uid) {
                    otherDrivers[driverId] = allDrivers[driverId];
                }
            });
            
            console.log('Driver - other drivers:', Object.keys(otherDrivers).length);
            updateDriversList(otherDrivers);
            updateMapMarkers(otherDrivers);
        }, (error) => {
            console.error('Driver driver listener error:', error);
        });
    } else {
        console.warn('Unknown user role:', userRole);
    }
}

// Update drivers list
function updateDriversList(drivers) {
    console.log('Updating drivers list with:', drivers);
    const driverIds = Object.keys(drivers);
    console.log('Driver IDs found:', driverIds);
    let onlineCount = 0;
    
    const html = driverIds.map(driverId => {
        const driver = drivers[driverId];
        const isOnline = driver.online;
        const lastUpdate = driver.updatedAt ? new Date(driver.updatedAt).toLocaleString() : 'Never';
        
        if (isOnline) onlineCount++;
        
        return `
            <div class="driver-item ${isOnline ? '' : 'offline'}">
                <div class="driver-info">
                    <div class="driver-id">Driver: ${driverId.substring(0, 8)}...</div>
                    <div class="driver-status">Status: ${isOnline ? 'Online' : 'Offline'}</div>
                    <div class="driver-location">Last Update: ${lastUpdate}</div>
                </div>
                <div class="driver-actions">
                    <button class="btn btn-primary btn-small" onclick="focusOnDriver('${driverId}')">
                        View
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    console.log('Final counts - Online:', onlineCount, 'Total:', driverIds.length);
    elements.driverListContent.innerHTML = html || '<p style="color: #7f8c8d; text-align: center;">No drivers available</p>';
    elements.onlineCount.textContent = onlineCount;
    elements.totalCount.textContent = driverIds.length;
    console.log('UI updated with new counts');
}

// Update map markers
function updateMapMarkers(drivers) {
    // Remove old markers
    Object.values(markers).forEach(marker => {
        map.removeLayer(marker);
    });
    markers = {};
    
    // Add new markers
    Object.keys(drivers).forEach(driverId => {
        const driver = drivers[driverId];
        if (driver.lat && driver.lng) {
            const color = driver.online ? '#27ae60' : '#95a5a6';
            const isCurrentUser = userRole === 'driver' && driverId === currentUser.uid;
            const icon = isCurrentUser ? createIcon('#3498db', true) : createIcon(color);
            
            const marker = L.marker([driver.lat, driver.lng], { icon })
                .addTo(map)
                .bindPopup(`
                    <strong>Driver: ${driverId.substring(0, 8)}...</strong><br>
                    Status: ${driver.online ? 'Online' : 'Offline'}<br>
                    Location: ${driver.lat.toFixed(6)}, ${driver.lng.toFixed(6)}<br>
                    Last Update: ${driver.updatedAt ? new Date(driver.updatedAt).toLocaleString() : 'Never'}
                `);
            
            markers[driverId] = marker;
        }
    });
}

// Zoom to current user location
function zoomToMyLocation() {
    if (userRole !== 'driver' || !isTracking || !markers[currentUser.uid]) {
        showNotification('Please start tracking first', 'warning');
        return;
    }
    
    const marker = markers[currentUser.uid];
    const latLng = marker.getLatLng();
    
    map.setView(latLng, 18, {
        animate: true,
        duration: 1
    });
    
    marker.openPopup();
    showNotification('Zoomed to your location', 'success');
}

// Focus on specific driver
function focusOnDriver(driverId) {
    if (markers[driverId]) {
        const marker = markers[driverId];
        map.setView(marker.getLatLng(), 16);
        marker.openPopup();
    }
}

// Start tracking for driver
function startTracking() {
    if (!navigator.geolocation) {
        showNotification('Geolocation not supported. Using demo location.', 'warning');
        useMockLocation();
        return;
    }
    
    isTracking = true;
    elements.trackingStatus.textContent = 'Tracking: ON';
    elements.trackingStatus.classList.add('active');
    elements.toggleTracking.textContent = 'Stop Tracking';
    elements.toggleTracking.classList.remove('btn-success');
    elements.toggleTracking.classList.add('btn-danger');
    
    // Set up onDisconnect for offline status
    const driverRef = database.ref(`drivers/${currentUser.uid}`);
    driverRef.onDisconnect().update({
        online: false,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Start watching position
    watchPositionId = navigator.geolocation.watchPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            
            try {
                await driverRef.update({
                    lat: latitude,
                    lng: longitude,
                    online: true,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                });
                
                // Update current user marker
                console.log('Updating marker for user:', currentUser.uid);
                console.log('Location:', latitude, longitude);
                console.log('Map exists:', !!map);
                
                if (markers[currentUser.uid]) {
                    console.log('Updating existing marker');
                    markers[currentUser.uid].setLatLng([latitude, longitude]);
                } else {
                    console.log('Creating new marker');
                    try {
                        const marker = L.marker([latitude, longitude], { 
                            icon: createIcon('#3498db', true) 
                        })
                            .addTo(map)
                            .bindPopup(`
                                <strong>Your Location</strong><br>
                                Driver ID: ${currentUser.uid}<br>
                                Status: Online<br>
                                Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
                            `);
                        
                        markers[currentUser.uid] = marker;
                        console.log('Marker created successfully');
                        
                        // Center map on user location
                        map.setView([latitude, longitude], 15);
                        
                    } catch (markerError) {
                        console.error('Error creating marker:', markerError);
                        showNotification('Failed to create map marker', 'error');
                    }
                }
                
            } catch (error) {
                console.error('Error updating location:', error);
                showNotification('Failed to update location', 'error');
            }
        },
        (error) => {
            console.error('Geolocation error:', error);
            let errorMessage = 'Failed to get location';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Location permission denied. Please enable location access.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Location information unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Location request timed out. Retrying with lower accuracy...';
                    // Retry with lower accuracy settings
                    setTimeout(() => {
                        if (isTracking) {
                            startTrackingWithLowAccuracy();
                        }
                    }, 2000);
                    break;
                default:
                    errorMessage = `Unknown error: ${error.message}`;
            }
            
            showNotification(errorMessage, 'error');
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
    
    showNotification('Tracking started', 'success');
}

// Start tracking with lower accuracy (fallback)
function startTrackingWithLowAccuracy() {
    if (!navigator.geolocation) {
        showNotification('Geolocation is not supported by your browser', 'error');
        return;
    }
    
    const driverRef = database.ref(`drivers/${currentUser.uid}`);
    
    // Clear existing watch if any
    if (watchPositionId) {
        navigator.geolocation.clearWatch(watchPositionId);
    }
    
    // Start watching position with lower accuracy
    watchPositionId = navigator.geolocation.watchPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            
            try {
                await driverRef.update({
                    lat: latitude,
                    lng: longitude,
                    online: true,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                });
                
                // Update current user marker
                if (markers[currentUser.uid]) {
                    markers[currentUser.uid].setLatLng([latitude, longitude]);
                } else {
                    const marker = L.marker([latitude, longitude], { 
                        icon: createIcon('#3498db', true) 
                    })
                        .addTo(map)
                        .bindPopup(`
                            <strong>Your Location</strong><br>
                            Driver ID: ${currentUser.uid}<br>
                            Status: Online<br>
                            Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
                        `);
                    
                    markers[currentUser.uid] = marker;
                }
                
                showNotification('Tracking with lower accuracy', 'info');
                
            } catch (error) {
                console.error('Error updating location:', error);
                showNotification('Failed to update location', 'error');
            }
        },
        (error) => {
            console.error('Low accuracy geolocation error:', error);
            showNotification('Unable to get location. Using mock location for demo.', 'warning');
            // Use mock location for demo purposes
            useMockLocation();
        },
        {
            enableHighAccuracy: false,
            timeout: 30000,
            maximumAge: 60000 // Allow cached location up to 1 minute
        }
    );
}

// Use mock location for demo purposes
function useMockLocation() {
    // Default to a central location (e.g., New York City)
    const mockLat = 40.7128;
    const mockLng = -74.0060;
    
    const driverRef = database.ref(`drivers/${currentUser.uid}`);
    
    driverRef.update({
        lat: mockLat,
        lng: mockLng,
        online: true,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Update current user marker
    if (markers[currentUser.uid]) {
        markers[currentUser.uid].setLatLng([mockLat, mockLng]);
    } else {
        const marker = L.marker([mockLat, mockLng], { 
            icon: createIcon('#3498db', true) 
        })
            .addTo(map)
            .bindPopup(`
                <strong>Demo Location</strong><br>
                Driver ID: ${currentUser.uid}<br>
                Status: Online (Demo Mode)<br>
                Location: ${mockLat.toFixed(6)}, ${mockLng.toFixed(6)}
            `);
        
        markers[currentUser.uid] = marker;
    }
    
    map.setView([mockLat, mockLng], 13);
    showNotification('Using demo location (NYC)', 'info');
}

// Stop tracking
function stopTracking() {
    isTracking = false;
    elements.trackingStatus.textContent = 'Tracking: OFF';
    elements.trackingStatus.classList.remove('active');
    elements.toggleTracking.textContent = 'Start Tracking';
    elements.toggleTracking.classList.remove('btn-danger');
    elements.toggleTracking.classList.add('btn-success');
    
    if (watchPositionId) {
        navigator.geolocation.clearWatch(watchPositionId);
        watchPositionId = null;
    }
    
    // Update offline status
    const driverRef = database.ref(`drivers/${currentUser.uid}`);
    driverRef.update({
        online: false,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Remove current user marker
    if (markers[currentUser.uid]) {
        map.removeLayer(markers[currentUser.uid]);
        delete markers[currentUser.uid];
    }
    
    showNotification('Tracking stopped', 'info');
}

// Share access with customer
async function shareWithCustomer() {
    const customerUid = elements.customerUid.value.trim();
    
    if (!customerUid) {
        showNotification('Please enter customer UID', 'error');
        return;
    }
    
    try {
        const driverRef = database.ref(`drivers/${currentUser.uid}/sharedWith/${customerUid}`);
        await driverRef.set(true);
        
        elements.customerUid.value = '';
        showNotification(`Access shared with customer ${customerUid.substring(0, 8)}...`, 'success');
        
    } catch (error) {
        console.error('Error sharing access:', error);
        showNotification('Failed to share access', 'error');
    }
}

// Track specific driver (customer function)
function trackSpecificDriver() {
    const driverUid = elements.driverUid.value.trim();
    
    if (!driverUid) {
        showNotification('Please enter driver UID', 'error');
        return;
    }
    
    const driverRef = database.ref(`drivers/${driverUid}`);
    
    driverRef.on('value', (snapshot) => {
        const driver = snapshot.val();
        
        if (!driver) {
            showNotification('Driver not found', 'error');
            return;
        }
        
        if (driver.sharedWith && driver.sharedWith[currentUser.uid]) {
            if (driver.lat && driver.lng) {
                if (markers[driverUid]) {
                    markers[driverUid].setLatLng([driver.lat, driver.lng]);
                } else {
                    const color = driver.online ? '#27ae60' : '#95a5a6';
                    const marker = L.marker([driver.lat, driver.lng], { icon: createIcon(color) })
                        .addTo(map)
                        .bindPopup(`
                            <strong>Driver: ${driverUid.substring(0, 8)}...</strong><br>
                            Status: ${driver.online ? 'Online' : 'Offline'}<br>
                            Location: ${driver.lat.toFixed(6)}, ${driver.lng.toFixed(6)}<br>
                            Last Update: ${driver.updatedAt ? new Date(driver.updatedAt).toLocaleString() : 'Never'}
                        `);
                    
                    markers[driverUid] = marker;
                }
                
                map.setView([driver.lat, driver.lng], 16);
                showNotification('Tracking driver', 'success');
            }
        } else {
            showNotification('Access not shared by this driver', 'warning');
        }
    });
    
    elements.driverUid.value = '';
}

// Event listeners
elements.authBtn.addEventListener('click', authenticate);
elements.toggleTracking.addEventListener('click', () => {
    if (isTracking) {
        stopTracking();
    } else {
        startTracking();
    }
});
elements.shareBtn.addEventListener('click', shareWithCustomer);
elements.trackDriverBtn.addEventListener('click', trackSpecificDriver);
elements.zoomToLocation.addEventListener('click', zoomToMyLocation);

// Handle authentication state changes
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
    } else {
        // Clean up if user signs out
        if (driversListener) {
            driversListener.off();
        }
        if (isTracking) {
            stopTracking();
        }
        
        // Reset UI
        elements.userRole.textContent = 'Not authenticated';
        elements.userId.textContent = '';
        elements.authBtn.textContent = 'Authenticate';
        elements.authBtn.disabled = false;
        elements.roleSelect.disabled = false;
        elements.driverControls.classList.add('hidden');
        elements.customerControls.classList.add('hidden');
        
        userRole = null;
        currentUser = null;
    }
});

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    showNotification('Welcome! Please select a role and authenticate to begin.', 'info');
    
    // Test Firebase connectivity
    setTimeout(() => {
        console.log('Testing Firebase connectivity...');
        const testRef = database.ref('.info/connected');
        testRef.on('value', (snapshot) => {
            console.log('Firebase connected:', snapshot.val());
        });
    }, 1000);
    
    // Test marker after 2 seconds to verify map is working
    setTimeout(() => {
        if (map) {
            console.log('Adding test marker to verify map functionality...');
            try {
                const testMarker = L.marker([40.7128, -74.0060], { 
                    icon: createIcon('#27ae60', false) 
                })
                    .addTo(map)
                    .bindPopup('Test Marker - Map is working!');
                
                console.log('Test marker added successfully');
            } catch (error) {
                console.error('Failed to add test marker:', error);
            }
        } else {
            console.error('Map not available for test marker');
        }
    }, 2000);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (isTracking && currentUser) {
        const driverRef = database.ref(`drivers/${currentUser.uid}`);
        driverRef.update({
            online: false,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        });
    }
});
