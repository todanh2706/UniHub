import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Calendar, ChevronRight, QrCode, Database, Wifi, WifiOff, LogOut } from 'lucide-react-native';
import { RootStackParamList } from '../../App';
import api from '../api/axios';
import { getPendingCount } from '../api/offlineDb';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useAuthStore } from '../store/useAuthStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'WorkshopList'>;

interface Workshop {
  id: string;
  title: string;
  startTime: string;
  roomName: string;
}

export default function WorkshopListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const isOnline = useOnlineStatus();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const logout = useAuthStore((state) => state.logout);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={logout} style={{ marginRight: 15 }}>
          <LogOut size={22} color="#EF4444" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, logout]);

  const fetchWorkshops = async () => {
    try {
      const res = await api.get('/organizer/workshops');
      setWorkshops(res.data);
    } catch (error) {
      console.error('Failed to fetch workshops:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshData = () => {
    setRefreshing(true);
    fetchWorkshops();
    setPendingCount(getPendingCount());
  };

  useFocusEffect(
    useCallback(() => {
      setPendingCount(getPendingCount());
    }, [])
  );

  useEffect(() => {
    fetchWorkshops();
  }, []);

  const renderWorkshop = ({ item }: { item: Workshop }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate('AttendeeList', { workshopId: item.id, workshopTitle: item.title })}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          <Calendar size={24} color="#4F46E5" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <View style={styles.subtitleContainer}>
            <Text style={styles.subtitle}>{item.roomName || 'Room TBD'}</Text>
            <Text style={styles.separator}>|</Text>
            <Text style={styles.subtitle}>{new Date(item.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</Text>
          </View>
        </View>
      </View>
      <ChevronRight size={20} color="#CBD5E1" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Network Status & Pending Sync */}
      <View style={styles.statusHeader}>
        <View style={[styles.statusBadge, isOnline ? styles.onlineBadge : styles.offlineBadge]}>
          {isOnline ? <Wifi size={14} color="#10B981" /> : <WifiOff size={14} color="#F59E0B" />}
          <Text style={[styles.statusText, isOnline ? styles.onlineText : styles.offlineText]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
        {pendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Database size={14} color="#64748B" />
            <Text style={styles.pendingText}>{pendingCount} chờ sync</Text>
          </View>
        )}
      </View>

      {/* Global Scanner Button */}
      <TouchableOpacity 
        style={styles.scanButton}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('CheckinScanner', {})}
      >
        <QrCode size={24} color="#FFF" />
        <Text style={styles.scanButtonText}>Quét QR Check-in nhanh</Text>
        {pendingCount > 0 && (
          <View style={styles.scanBadge}>
            <Text style={styles.scanBadgeText}>{pendingCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Select Workshop</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={workshops}
          keyExtractor={item => item.id}
          renderItem={renderWorkshop}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshData} colors={['#4F46E5']} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No workshops found</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  onlineBadge: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  offlineBadge: { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
  statusText: { fontSize: 13, fontWeight: '600' },
  onlineText: { color: '#10B981' },
  offlineText: { color: '#F59E0B' },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  pendingText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  scanButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  scanButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  scanBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  scanBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  listContainer: { paddingBottom: 40 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: { flex: 1, paddingRight: 12 },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtitle: { fontSize: 13, color: '#64748B' },
  separator: { marginHorizontal: 6, color: '#CBD5E1' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#64748B', fontSize: 15 },
});
