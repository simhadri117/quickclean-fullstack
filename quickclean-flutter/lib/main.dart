import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:quickclean_flutter/core/theme/app_theme.dart';
import 'package:quickclean_flutter/features/auth/presentation/auth_gate.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase with options for Web support
  await Firebase.initializeApp(
    options: const FirebaseOptions(
      apiKey: "AIzaSyCh5mbuxSJjimz7pFOnj1cx9IVpAQj4dRo",
      authDomain: "quickclean-808d9.firebaseapp.com",
      projectId: "quickclean-808d9",
      storageBucket: "quickclean-808d9.firebasestorage.app",
      messagingSenderId: "440258467095",
      appId: "1:440258467095:web:242a4526c344a03bcc9352",
    ),
  );
  
  runApp(
    const ProviderScope(
      child: QuickCleanApp(),
    ),
  );
}

class QuickCleanApp extends StatelessWidget {
  const QuickCleanApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'QuickClean',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.system,
      home: const AuthGate(),
    );
  }
}
