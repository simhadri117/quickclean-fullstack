import 'package:cloud_firestore/cloud_firestore.dart';

class BookingModel {
  final String id;
  final String userId;
  final String serviceId;
  final String serviceName;
  final double price;
  final String address;
  final String status; // pending, confirmed, in_progress, completed
  final DateTime timestamp;
  final String? cleanerId;

  BookingModel({
    required this.id,
    required this.userId,
    required this.serviceId,
    required this.serviceName,
    required this.price,
    required this.address,
    required this.status,
    required this.timestamp,
    this.cleanerId,
  });

  factory BookingModel.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    return BookingModel(
      id: doc.id,
      userId: data['userId'] ?? '',
      serviceId: data['serviceId'] ?? '',
      serviceName: data['serviceName'] ?? '',
      price: (data['price'] ?? 0).toDouble(),
      address: data['address'] ?? '',
      status: data['status'] ?? 'pending',
      timestamp: (data['timestamp'] as Timestamp).toDate(),
      cleanerId: data['cleanerId'],
    );
  }
}
