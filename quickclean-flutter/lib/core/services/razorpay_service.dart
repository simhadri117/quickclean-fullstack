import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'package:flutter/foundation.dart';

class RazorpayService {
  late Razorpay _razorpay;
  final String apiKey = "rzp_test_ScxtWVUozsRssS";

  void init({
    required Function(PaymentSuccessResponse) onSuccess,
    required Function(PaymentFailureResponse) onFailure,
    required Function(ExternalWalletResponse) onExternalWallet,
  }) {
    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, onSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, onFailure);
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, onExternalWallet);
  }

  void openCheckout({
    required double amount,
    required String contact,
    required String email,
    required String description,
  }) {
    var options = {
      'key': apiKey,
      'amount': (amount * 100).toInt(), // amount in the smallest currency unit
      'name': 'QuickClean Services',
      'description': description,
      'timeout': 300, // in seconds
      'prefill': {'contact': contact, 'email': email}
    };

    try {
      _razorpay.open(options);
    } catch (e) {
      debugPrint('Error: e');
    }
  }

  void dispose() {
    _razorpay.clear();
  }
}
