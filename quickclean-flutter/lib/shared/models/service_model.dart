class ServiceModel {
  final String id;
  final String name;
  final double price;
  final int timeMins;
  final String icon;
  final String? imageUrl;

  ServiceModel({
    required this.id,
    required this.name,
    required this.price,
    required this.timeMins,
    required this.icon,
    this.imageUrl,
  });

  factory ServiceModel.fromFirestore(Map<String, dynamic> data, String id) {
    return ServiceModel(
      id: id,
      name: data['name'] ?? '',
      price: (data['price'] ?? 0).toDouble(),
      timeMins: data['timeMins'] ?? 30,
      icon: data['icon'] ?? '✨',
      imageUrl: data['imageUrl'],
    );
  }
}
