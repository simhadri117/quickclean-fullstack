import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, ActivityIndicator } from 'react-native';
import { Zap, User, MapPin, Navigation, Star, ChevronRight } from 'lucide-react-native';
import { db, auth } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';

const { width } = Dimensions.get('window');

interface Service {
  id: string;
  name: string;
  price: number;
  icon: string;
}

export default function HomeScreen({ navigation }: any) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [address, setAddress] = useState('Select Location...');

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'services'));
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
        setServices(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const handleBook = () => {
    if (!selectedService) return;
    navigation.navigate('Tracking', { serviceId: selectedService });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.nav}>
        <View style={styles.navLeft}>
          <View style={styles.logoBox}>
            <Zap size={20} color="white" />
          </View>
          <Text style={styles.navTitle}>QuickClean</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
          <User size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Professional Cleaning{'\n'}
            <Text style={styles.heroHighlight}>At Your Doorstep.</Text>
          </Text>

          <TouchableOpacity style={styles.locationPicker}>
            <View style={styles.locationLeft}>
              <MapPin size={24} color="#4F46E5" />
              <Text style={styles.addressText} numberOfLines={1}>{address}</Text>
            </View>
            <View style={styles.locateBtn}>
              <Navigation size={18} color="#4F46E5" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Services</Text>
            <View style={styles.titleLine} />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.grid}>
              {services.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.serviceCard,
                    selectedService === service.id && styles.selectedCard
                  ]}
                  onPress={() => setSelectedService(service.id)}
                >
                  <Text style={styles.serviceIcon}>{service.icon || '✨'}</Text>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.servicePrice}>₹{service.price}</Text>
                    <View style={[
                      styles.cardArrow,
                      selectedService === service.id && styles.selectedArrow
                    ]}>
                      <ChevronRight size={16} color={selectedService === service.id ? 'white' : '#94A3B8'} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Booking Bar */}
      {selectedService && (
        <View style={styles.bookingBar}>
          <View style={styles.bookingInfo}>
            <Text style={styles.bookingLabel}>Selected Service</Text>
            <Text style={styles.bookingValue}>
              {services.find(s => s.id === selectedService)?.name}
            </Text>
          </View>
          <TouchableOpacity style={styles.bookBtn} onPress={handleBook}>
            <Text style={styles.bookBtnText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    width: 40,
    height: 40,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  hero: {
    backgroundColor: '#0F172A',
    padding: 32,
    paddingTop: 48,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: 'white',
    lineHeight: 40,
    marginBottom: 32,
  },
  heroHighlight: {
    color: '#818CF8',
  },
  locationPicker: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  locationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingLeft: 12,
    gap: 12,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  locateBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    padding: 24,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  titleLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    borderRadius: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  serviceCard: {
    width: (width - 64) / 2,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedCard: {
    borderColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.1,
    transform: [{ translateY: -4 }],
  },
  serviceIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  servicePrice: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4F46E5',
  },
  cardArrow: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedArrow: {
    backgroundColor: '#4F46E5',
  },
  bookingBar: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  bookingInfo: {
    flex: 1,
  },
  bookingLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bookingValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  bookBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  bookBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
});
