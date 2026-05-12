import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { User, LogOut, Zap, Calendar, Clock, ShieldCheck, ChevronRight, Star } from 'lucide-react-native';
import { db, auth } from '../../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export default function ProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    const fetchBookings = async () => {
      if (auth.currentUser) {
        const q = query(
          collection(db, 'bookings'),
          where('userId', '==', auth.currentUser.uid),
          orderBy('timestamp', 'desc')
        );
        const snapshot = await getDocs(q);
        setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
      setLoading(false);
    };
    fetchBookings();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronRight size={24} color="#0F172A" style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {auth.currentUser?.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{auth.currentUser?.displayName || 'Clean Enthusiast'}</Text>
          <Text style={styles.userEmail}>{auth.currentUser?.email}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Points</Text>
              <Text style={styles.statValue}>1,240</Text>
            </View>
            <View style={[styles.statBox, styles.statBorder]}>
              <Text style={styles.statLabel}>Bookings</Text>
              <Text style={styles.statValue}>{bookings.length}</Text>
            </View>
          </View>
        </View>

        {/* Promo Card */}
        <View style={styles.promoCard}>
          <View style={styles.promoIcon}>
            <ShieldCheck size={32} color="white" />
          </View>
          <View style={styles.promoContent}>
            <Text style={styles.promoTitle}>Premium Protection</Text>
            <Text style={styles.promoSubtitle}>All services insured up to ₹10,000</Text>
          </View>
        </View>

        {/* History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Booking History</Text>
          
          {loading ? (
            <ActivityIndicator size="small" color="#4F46E5" style={{ marginTop: 20 }} />
          ) : bookings.length > 0 ? (
            bookings.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyIcon}>
                  <Text style={{ fontSize: 24 }}>✨</Text>
                </View>
                <View style={styles.historyMain}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.serviceName}>{item.serviceName || 'Cleaning'}</Text>
                    <Text style={styles.priceText}>₹{item.price}</Text>
                  </View>
                  <View style={styles.historyFooter}>
                    <View style={styles.timeInfo}>
                      <Calendar size={12} color="#94A3B8" />
                      <Text style={styles.timeText}>
                        {item.timestamp?.toDate().toLocaleDateString() || 'Recent'}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, item.status === 'pending' && styles.pendingBadge]}>
                      <Text style={[styles.statusText, item.status === 'pending' && styles.pendingText]}>
                        {item.status?.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No bookings found.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 24,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 4,
    borderColor: '#EEF2FF',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '900',
    color: 'white',
  },
  userName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statBorder: {
    borderLeftWidth: 1,
    borderLeftColor: '#F1F5F9',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4F46E5',
  },
  promoCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },
  promoIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: 'white',
    marginBottom: 4,
  },
  promoSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C7D2FE',
  },
  historySection: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 20,
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  historyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyMain: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#4F46E5',
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#059669',
  },
  pendingBadge: {
    backgroundColor: '#FFFBEB',
  },
  pendingText: {
    color: '#D97706',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
});

function ChevronRight({ size, color, style }: any) {
  return (
    <View style={style}>
      <Text style={{ fontSize: size, color }}>›</Text>
    </View>
  );
}
