import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';

class TrackingScreen extends StatefulWidget {
  final String bookingId;
  const TrackingScreen({super.key, required this.bookingId});

  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen> {
  GoogleMapController? _mapController;
  StreamSubscription? _bookingSubscription;
  StreamSubscription? _cleanerSubscription;

  LatLng _userLocation = const LatLng(17.4483, 78.3915); // Hitech City
  LatLng? _cleanerLocation;
  String _status = 'on_the_way';
  String _cleanerName = 'Partner';
  int _eta = 5;

  final Set<Marker> _markers = {};

  @override
  void initState() {
    super.initState();
    _listenToBooking();
  }

  void _listenToBooking() {
    _bookingSubscription = FirebaseFirestore.instance
        .collection('bookings')
        .doc(widget.bookingId)
        .snapshots()
        .listen((doc) {
      if (doc.exists) {
        final data = doc.data()!;
        setState(() {
          _status = data['status'] ?? 'on_the_way';
        });

        final cleanerId = data['cleanerId'];
        if (cleanerId != null) {
          _listenToCleaner(cleanerId);
        }
      }
    });
  }

  void _listenToCleaner(String cleanerId) {
    _cleanerSubscription?.cancel();
    _cleanerSubscription = FirebaseFirestore.instance
        .collection('cleaners')
        .doc(cleanerId)
        .snapshots()
        .listen((doc) {
      if (doc.exists) {
        final data = doc.data()!;
        final lat = data['lat'];
        final lng = data['lng'];
        if (lat != null && lng != null) {
          final newLoc = LatLng(lat, lng);
          setState(() {
            _cleanerLocation = newLoc;
            _cleanerName = data['name'] ?? 'Partner';
            _updateMarkers();
          });
          _mapController?.animateCamera(CameraUpdate.newLatLng(newLoc));
        }
      }
    });
  }

  void _updateMarkers() {
    _markers.clear();
    // User Marker
    _markers.add(
      Marker(
        markerId: const MarkerId('user'),
        position: _userLocation,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRose),
      ),
    );
    // Cleaner Marker
    if (_cleanerLocation != null) {
      _markers.add(
        Marker(
          markerId: const MarkerId('cleaner'),
          position: _cleanerLocation!,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueViolet),
          infoWindow: InfoWindow(title: '$_cleanerName (Partner)'),
        ),
      );
    }
  }

  @override
  void dispose() {
    _bookingSubscription?.cancel();
    _cleanerSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Background Map
          GoogleMap(
            initialCameraPosition: CameraPosition(target: _userLocation, zoom: 15),
            onMapCreated: (c) {
              _mapController = c;
              _mapController!.setMapStyle(_darkMapStyle);
            },
            markers: _markers,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
          ),

          // Top Info Bar
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFF7C3AED),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 20)],
                ),
                child: Row(
                  children: [
                    const Icon(LucideIcons.zap, color: Colors.white, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('LIVE TRACKING', style: GoogleFonts.plusJakartaSans(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.w800)),
                          Text('Partner is on the way', style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Bottom Status Card
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: _buildStatusCard(),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusCard() {
    bool isArrived = _status == 'arrived';

    return Container(
      padding: const EdgeInsets.fromLTRB(24, 32, 24, 40),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(40)),
        boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 30, offset: Offset(0, -5))],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: const Color(0xFFF3E8FF),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const Center(child: Text('👩🏽‍🔧', style: TextStyle(fontSize: 32))),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isArrived ? 'Partner Arrived! ✨' : 'Arriving in $_eta mins',
                      style: GoogleFonts.plusJakartaSans(fontSize: 22, fontWeight: FontWeight.w900, color: const Color(0xFF1E293B)),
                    ),
                    Text('$_cleanerName • 4.9 Rating', style: GoogleFonts.plusJakartaSans(color: Colors.grey, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          Row(
            children: [
              Expanded(child: _buildActionBtn(LucideIcons.phone, 'Call')),
              const SizedBox(width: 12),
              Expanded(child: _buildActionBtn(LucideIcons.messageSquare, 'Chat')),
            ],
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: isArrived ? () {} : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7C3AED),
                padding: const EdgeInsets.symmetric(vertical: 20),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                elevation: 0,
              ),
              child: Text(
                isArrived ? 'Start Cleaning & Pay' : 'Waiting for Arrival...',
                style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionBtn(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 18, color: const Color(0xFF1E293B)),
          const SizedBox(width: 8),
          Text(label, style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, color: const Color(0xFF1E293B))),
        ],
      ),
    );
  }

  static const String _darkMapStyle = '''[{"elementType":"geometry","stylers":[{"color":"#212121"}]},{"elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"elementType":"labels.text.fill","stylers":[{"color":"#757575"}]},{"elementType":"labels.text.stroke","stylers":[{"color":"#212121"}]},{"featureType":"administrative","elementType":"geometry","stylers":[{"color":"#757575"}]},{"featureType":"administrative.country","elementType":"labels.text.fill","stylers":[{"color":"#9e9e9e"}]},{"featureType":"administrative.land_parcel","stylers":[{"visibility":"off"}]},{"featureType":"administrative.locality","elementType":"labels.text.fill","stylers":[{"color":"#bdbdbd"}]},{"featureType":"poi","elementType":"labels.text.fill","stylers":[{"color":"#757575"}]},{"featureType":"poi.park","elementType":"geometry","stylers":[{"color":"#181818"}]},{"featureType":"poi.park","elementType":"labels.text.fill","stylers":[{"color":"#616161"}]},{"featureType":"poi.park","elementType":"labels.text.stroke","stylers":[{"color":"#1b1b1b"}]},{"featureType":"road","elementType":"geometry.fill","stylers":[{"color":"#2c2c2c"}]},{"featureType":"road","elementType":"labels.text.fill","stylers":[{"color":"#8a8a8a"}]},{"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#373737"}]},{"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#3c3c3c"}]},{"featureType":"road.highway.controlled_access","elementType":"geometry","stylers":[{"color":"#4e4e4e"}]},{"featureType":"road.local","elementType":"labels.text.fill","stylers":[{"color":"#616161"}]},{"featureType":"transit","elementType":"labels.text.fill","stylers":[{"color":"#757575"}]},{"featureType":"water","elementType":"geometry","stylers":[{"color":"#000000"}]},{"featureType":"water","elementType":"labels.text.fill","stylers":[{"color":"#3d3d3d"}]}]''';
}
