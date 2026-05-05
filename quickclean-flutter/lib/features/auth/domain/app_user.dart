import 'package:cloud_firestore/cloud_firestore.dart';

class AppUser {
  final String uid;
  final String? email;
  final String? name;
  final String? phone;
  final int points;
  final String role; // 'customer' or 'cleaner'
  final String? fcmToken;

  AppUser({
    required this.uid,
    this.email,
    this.name,
    this.phone,
    this.points = 0,
    this.fcmToken,
    this.role = 'customer',
  });

  factory AppUser.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    return AppUser(
      uid: doc.id,
      email: data['email'],
      name: data['name'],
      phone: data['phone'],
      points: data['points'] ?? 0,
      fcmToken: data['fcmToken'],
      role: data['role'] ?? 'customer',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'email': email,
      'name': name,
      'phone': phone,
      'points': points,
      'fcmToken': fcmToken,
      'role': role,
    };
  }
}
