import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../auth/data/auth_repository.dart';
import '../../auth/domain/app_user.dart';

class CleanerHomeScreen extends ConsumerStatefulWidget {
  final User user;
  const CleanerHomeScreen({super.key, required this.user});

  @override
  ConsumerState<CleanerHomeScreen> createState() => _CleanerHomeScreenState();
}

class _CleanerHomeScreenState extends ConsumerState<CleanerHomeScreen> with SingleTickerProviderStateMixin {
  bool _isOnline = false;
  bool _isToggling = false;
  StreamSubscription<Position>? _positionStream;
  Position? _currentPosition;
  AppUser? _profile;
  late AnimationController _animationController;
  
  GoogleMapController? _mapController;
  final Set<Marker> _markers = {};

  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..forward();
    _checkInitialStatus();
    _listenToProfile();
  }

  void _listenToProfile() {
    _firestore.collection('cleaners').doc(widget.user.uid).snapshots().listen((snapshot) {
      if (snapshot.exists) {
        setState(() {
          _profile = AppUser.fromFirestore(snapshot);
        });
      }
    });
  }

  Future<void> _checkInitialStatus() async {
    final doc = await _firestore.collection('cleaners').doc(widget.user.uid).get();
    if (doc.exists) {
      setState(() {
        _isOnline = doc.data()?['isOnline'] ?? false;
      });
      if (_isOnline) _startTracking();
    } else {
      await _firestore.collection('cleaners').doc(widget.user.uid).set({
        'uid': widget.user.uid,
        'name': widget.user.displayName ?? 'Cleaner',
        'isOnline': false,
        'lat': null,
        'lng': null,
        'earnings': 0,
        'completedJobs': 0,
        'lastUpdated': FieldValue.serverTimestamp(),
      });
    }
  }

  Future<void> _toggleOnline() async {
    setState(() => _isToggling = true);
    try {
      final newStatus = !_isOnline;
      if (newStatus) {
        LocationPermission permission = await Geolocator.checkPermission();
        if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.deniedForever || permission == LocationPermission.denied) return;
        _startTracking();
      } else {
        _stopTracking();
      }

      await _firestore.collection('cleaners').doc(widget.user.uid).update({
        'isOnline': newStatus,
        'lastUpdated': FieldValue.serverTimestamp(),
      });

      setState(() => _isOnline = newStatus);
    } finally {
      setState(() => _isToggling = false);
    }
  }

  void _startTracking() {
    _positionStream = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 10),
    ).listen((Position position) {
      setState(() {
        _currentPosition = position;
        _updateMarkers(position);
      });
      _updateLocationInFirestore(position);
      
      if (_mapController != null) {
        _mapController!.animateCamera(CameraUpdate.newLatLng(LatLng(position.latitude, position.longitude)));
      }
    });
  }

  void _updateMarkers(Position position) {
    _markers.clear();
    _markers.add(
      Marker(
        markerId: const MarkerId('current_location'),
        position: LatLng(position.latitude, position.longitude),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueViolet),
        infoWindow: const InfoWindow(title: 'My Location'),
      ),
    );
  }

  void _stopTracking() {
    _positionStream?.cancel();
    _positionStream = null;
    setState(() {
       _currentPosition = null;
       _markers.clear();
    });
  }

  Future<void> _updateLocationInFirestore(Position position) async {
    if (!_isOnline) return;
    await _firestore.collection('cleaners').doc(widget.user.uid).update({
      'lat': position.latitude,
      'lng': position.longitude,
      'lastUpdated': FieldValue.serverTimestamp(),
    });
  }

  @override
  void dispose() {
    _animationController.dispose();
    _stopTracking();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      body: Stack(
        children: [
          // Background Map (Integrated)
          if (_isOnline && _currentPosition != null)
            _buildMapView()
          else
            _buildAestheticBackground(),
          
          SafeArea(
            child: Column(
              children: [
                _buildTopNav(),
                Expanded(
                  child: SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 20),
                          _buildWelcomeSection(),
                          const SizedBox(height: 28),
                          _buildStatusCard(),
                          const SizedBox(height: 32),
                          _buildStatsRow(),
                          const SizedBox(height: 32),
                          _buildActiveJobCard(),
                          const SizedBox(height: 40),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMapView() {
    return Container(
      height: MediaQuery.of(context).size.height * 0.45,
      decoration: BoxDecoration(
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.5), blurRadius: 40)],
      ),
      child: GoogleMap(
        initialCameraPosition: CameraPosition(
          target: LatLng(_currentPosition?.latitude ?? 0, _currentPosition?.longitude ?? 0),
          zoom: 15,
        ),
        onMapCreated: (controller) {
          _mapController = controller;
          _mapController!.setMapStyle(_darkMapStyle);
        },
        markers: _markers,
        myLocationEnabled: true,
        myLocationButtonEnabled: false,
        zoomControlsEnabled: false,
      ),
    );
  }

  Widget _buildAestheticBackground() {
    return Stack(
      children: [
        Positioned(
          top: -150,
          right: -100,
          child: Container(
            width: 400,
            height: 400,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  const Color(0xFF7C3AED).withOpacity(0.2),
                  const Color(0xFFEC4899).withOpacity(0.05),
                  Colors.transparent,
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTopNav() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      decoration: BoxDecoration(
        color: _isOnline ? Colors.black.withOpacity(0.6) : Colors.transparent,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          CircleAvatar(
            radius: 20,
            backgroundImage: widget.user.photoURL != null 
                ? CachedNetworkImageProvider(widget.user.photoURL!)
                : null,
            backgroundColor: const Color(0xFF7C3AED),
            child: widget.user.photoURL == null 
                ? Text(widget.user.displayName?[0] ?? 'C', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))
                : null,
          ),
          Row(
            children: [
              _buildIconButton(LucideIcons.bell),
              const SizedBox(width: 12),
              GestureDetector(
                onTap: () => ref.read(authRepositoryProvider).signOut(),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    color: const Color(0xFFEF4444).withOpacity(0.1),
                    border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.2)),
                  ),
                  child: Row(
                    children: [
                      const Icon(LucideIcons.logOut, color: Color(0xFFFCA5A5), size: 14),
                      const SizedBox(width: 6),
                      Text(
                        'Logout',
                        style: GoogleFonts.plusJakartaSans(color: const Color(0xFFFCA5A5), fontSize: 12, fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildIconButton(IconData icon) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withOpacity(0.05),
        border: Border.all(color: Colors.white10),
      ),
      child: Icon(icon, color: Colors.white, size: 18),
    );
  }

  Widget _buildWelcomeSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'PARTNER DASHBOARD',
          style: GoogleFonts.plusJakartaSans(
            color: const Color(0xFF7C3AED),
            fontSize: 12,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Hello, ${widget.user.displayName?.split(' ')[0] ?? 'Partner'} 👋',
          style: GoogleFonts.plusJakartaSans(fontSize: 32, fontWeight: FontWeight.w800, color: Colors.white),
        ),
      ],
    );
  }

  Widget _buildStatusCard() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(30),
      child: BackdropFilter(
        filter: ColorFilter.mode(Colors.black.withOpacity(0.2), BlendMode.darken),
        child: Container(
          width: double.infinity,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(30),
            color: _isOnline ? Colors.white.withOpacity(0.05) : const Color(0xFF1E293B).withOpacity(0.5),
            border: Border.all(color: _isOnline ? const Color(0xFF10B981).withOpacity(0.3) : Colors.white10),
          ),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _isOnline ? const Color(0xFF10B981).withOpacity(0.1) : Colors.white.withOpacity(0.05),
                  ),
                  child: Icon(
                    _isOnline ? LucideIcons.zap : LucideIcons.moon,
                    color: _isOnline ? const Color(0xFF10B981) : Colors.white38,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _isOnline ? 'LIVE & ONLINE' : 'CURRENTLY OFFLINE',
                        style: GoogleFonts.plusJakartaSans(
                          color: _isOnline ? const Color(0xFF10B981) : Colors.white38,
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1,
                        ),
                      ),
                      Text(
                        _isOnline ? 'Tracking active' : 'Disconnected',
                        style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: _isOnline,
                  onChanged: _isToggling ? null : (_) => _toggleOnline(),
                  activeColor: const Color(0xFF10B981),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatsRow() {
    return Row(
      children: [
        _buildStatCard('Earnings', '₹${_profile?.points ?? 0}', const Color(0xFF7C3AED)),
        const SizedBox(width: 16),
        _buildStatCard('Completed', '${_profile?.points ?? 0}', const Color(0xFF0EA5E9)),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(28),
          color: Colors.white.withOpacity(0.03),
          border: Border.all(color: Colors.white10),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(LucideIcons.barChart3, color: color, size: 20),
            const SizedBox(height: 16),
            Text(value, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800)),
            Text(label, style: GoogleFonts.plusJakartaSans(color: Colors.white38, fontSize: 12, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }

  Widget _buildActiveJobCard() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'PENDING REQUESTS',
              style: GoogleFonts.plusJakartaSans(color: Colors.white38, fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 1),
            ),
            const Icon(LucideIcons.chevronRight, color: Colors.white38, size: 16),
          ],
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(32),
            color: Colors.white.withOpacity(0.05),
            border: Border.all(color: const Color(0xFF7C3AED).withOpacity(0.2)),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: CachedNetworkImage(
                      imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6958?auto=format&fit=crop&q=80&w=200',
                      width: 60,
                      height: 60,
                      fit: BoxFit.cover,
                    ),
                  ),
                  const SizedBox(width: 20),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Deep House Cleaning', style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
                        Text('Hitech City • 2.4 km', style: GoogleFonts.plusJakartaSans(color: Colors.white38, fontSize: 13)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 28),
              Row(
                children: [
                  Expanded(
                    child: _buildActionButton('Reject', Colors.white.withOpacity(0.05), Colors.white70),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildActionButton('Accept Job', const Color(0xFF7C3AED), Colors.white),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildActionButton(String label, Color bg, Color text) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Center(
        child: Text(
          label,
          style: GoogleFonts.plusJakartaSans(color: text, fontSize: 14, fontWeight: FontWeight.w800),
        ),
      ),
    );
  }

  static const String _darkMapStyle = '''
[
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "administrative.country",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#181818"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1b1b1b"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#2c2c2c"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8a8a8a"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#373737"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#3c3c3c"
      }
    ]
  },
  {
    "featureType": "road.highway.controlled_access",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#4e4e4e"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#000000"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#3d3d3d"
      }
    ]
  }
]
''';
}
