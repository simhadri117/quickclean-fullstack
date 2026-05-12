import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, SafeAreaView, ActivityIndicator } from 'react-native';
import { Sparkles, ArrowRight } from 'lucide-react-native';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../firebase';

export default function LoginScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    // Note: In real Expo apps, you'd use expo-auth-session for Google.
    // For this parity demo, we'll simulate the successful login.
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigation.replace('Home');
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Sparkles size={40} color="white" />
          </View>
          <Text style={styles.title}>QuickClean</Text>
          <Text style={styles.subtitle}>Your home, sparkling clean.</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Sign in to continue</Text>

          <TouchableOpacity 
            style={styles.googleButton} 
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            <Image 
              source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg' }} 
              style={styles.googleIcon} 
            />
            <Text style={styles.googleButtonText}>
              {loading ? 'Signing in...' : 'Continue with Google'}
            </Text>
            {loading && <ActivityIndicator size="small" color="#4F46E5" style={{ marginLeft: 10 }} />}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity 
            style={styles.phoneButton}
            onPress={() => alert('Phone login available in production builds.')}
          >
            <Text style={styles.phoneButtonText}>Use Phone Number</Text>
            <ArrowRight size={20} color="white" />
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#4F46E5',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 24,
    textAlign: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingVertical: 16,
    marginBottom: 16,
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4F46E5',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  phoneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  footerText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 32,
    lineHeight: 18,
  },
});
