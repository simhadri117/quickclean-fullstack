import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../data/auth_repository.dart';
import '../domain/app_user.dart';
import '../../cleaner/presentation/cleaner_home_screen.dart';
import '../../home/presentation/home_screen.dart';
import 'login_screen.dart';

class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authRepositoryProvider).authStateChanges;

    return StreamBuilder<User?>(
      stream: authState,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        
        final user = snapshot.data;
        if (user != null) {
          return FutureBuilder<AppUser?>(
            future: ref.read(authRepositoryProvider).getUserData(user.uid),
            builder: (context, userSnapshot) {
              if (userSnapshot.connectionState == ConnectionState.waiting) {
                return const Scaffold(body: Center(child: CircularProgressIndicator()));
              }
              
              final appUser = userSnapshot.data;
              if (appUser?.role == 'cleaner') {
                return CleanerHomeScreen(user: user);
              }
              return const HomeScreen();
            },
          );
        }
        
        return const LoginScreen();
      },
    );
  }
}
