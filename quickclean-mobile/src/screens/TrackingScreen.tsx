import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Dimensions, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Phone, MessageSquare, ShieldCheck, Zap, Navigation, CheckCircle2, Star, Clock } from 'lucide-react-native';
import { db } from '../../firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');

const defaultCenter = {
  latitude: 17.3850,
  longitude: 78.4867,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function TrackingScreen({ route, navigation }: any) {
  const { serviceId } = route.params;
  const [loading, setLoading] = useState(true);
  const [arrived, setArrived] = useState(false);
  const [eta, setEta] = useState(3);
  const [cleanerPos, setCleanerPos] = useState({ latitude: 17.3880, longitude: 78.4887 });
  const [userPos, setUserPos] = useState(defaultCenter);
  const [cleanerName, setCleanerName] = useState('Partner');
  
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    // Simulation of cleaner movement
    const interval = setInterval(() => {
      setCleanerPos(prev => {
        const newLat = prev.latitude - 0.0002;
        const newLng = prev.longitude - 0.0002;
        
        if (newLat <= userPos.latitude + 0.0001) {
          setArrived(true);
          setEta(0);
          clearInterval(interval);
          return { latitude: userPos.latitude, longitude: userPos.longitude };
        }
        
        setEta(prevEta => Math.max(1, prevEta - (Math.random() > 0.8 ? 1 : 0)));
        return { latitude: newLat, longitude: newLng };
      });
    }, 3000);

    setLoading(false);
    return () => clearInterval(interval);
  }, [userPos]);

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4F46E5" />
    </View>
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={userPos}
        provider={PROVIDER_GOOGLE}
      >
        <Marker coordinate={userPos} title="You">
          <View style={styles.userMarker}>
            <View style={styles.userMarkerInner} />
          </View>
        </Marker>

        <Marker coordinate={cleanerPos}>
          <View style={styles.cleanerMarker}>
            <Text style={{ fontSize: 32 }}>👩🏽‍🔧</Text>
          </View>
        </Marker>

        <Polyline
          coordinates={[cleanerPos, userPos]}
          strokeColor="#4F46E5"
          strokeWidth={3}
          lineDashPattern={[5, 5]}
        />
      </MapView>

      <SafeAreaView style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ChevronRight size={24} color="#0F172A" style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.statusBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.statusText}>{arrived ? 'ARRIVED' : 'LIVE TRACKING'}</Text>
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.etaRow}>
            <View style={[styles.iconBox, arrived && styles.arrivedBox]}>
              {arrived ? <CheckCircle2 size={32} color="white" /> : <Clock size={32} color="white" />}
            </View>
            <View>
              <Text style={styles.etaLabel}>{arrived ? 'Service Ready' : 'Estimated Arrival'}</Text>
              <Text style={styles.etaValue}>{arrived ? 'Professional Arrived' : `${eta} Minutes`}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.cleanerRow}>
            <View style={styles.cleanerAvatar}>
              <Text style={{ fontSize: 30 }}>👩🏽‍🔧</Text>
            </View>
            <View style={styles.cleanerInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.cleanerName}>{cleanerName}</Text>
                <ShieldCheck size={16} color="#4F46E5" />
              </View>
              <View style={styles.ratingRow}>
                <Star size={14} color="#FBBF24" fill="#FBBF24" />
                <Text style={styles.ratingText}>4.9 • Premium Partner</Text>
              </View>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn}>
                <Phone size={20} color="#4F46E5" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <MessageSquare size={20} color="#4F46E5" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.payBtn, !arrived && styles.disabledPayBtn]} 
            onPress={() => navigation.navigate('Profile')}
          >
            <Zap size={20} color="white" />
            <Text style={styles.payBtnText}>Complete & Pay</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  headerContent: {
    flex: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 1,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrivedBox: {
    backgroundColor: '#10B981',
  },
  etaLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  etaValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 20,
  },
  cleanerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  cleanerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cleanerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  cleanerName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  disabledPayBtn: {
    opacity: 0.5,
  },
  payBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
  },
  userMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  userMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4F46E5',
  },
  cleanerMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function ChevronRight({ size, color, style }: any) {
  return (
    <View style={style}>
      <Text style={{ fontSize: size, color }}>›</Text>
    </View>
  );
}
