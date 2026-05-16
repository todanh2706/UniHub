import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Search, User, CheckCircle, Database, QrCode } from 'lucide-react-native';
import { RootStackParamList } from '../../App';
import api from '../api/axios';
import { saveCheckin, getPendingCount } from '../api/offlineDb';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

type Props = NativeStackScreenProps<RootStackParamList, 'AttendeeList'>;

interface Attendee {
  id: string;
  studentName: string;
  studentEmail: string;
  status: string;
}

const generateUUID = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

export default function AttendeeListScreen({ route, navigation }: Props) {
  const { workshopId, workshopTitle } = route.params;
  const isOnline = useOnlineStatus();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [localCheckedInIds, setLocalCheckedInIds] = useState<Set<string>>(new Set());

  const fetchAttendees = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/organizer/workshops/${workshopId}/registrations`, { params: { size: 500 } });
      setAttendees(res.data.content || []);
    } catch (error) {
      console.error('Failed to fetch attendees:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAttendees();
    });
    return unsubscribe;
  }, [navigation, workshopId]);

  const handleManualCheckin = async (registrationId: string) => {
    const clientEventId = generateUUID();
    const checkedInAt = new Date().toISOString();

    if (isOnline) {
      try {
        await api.post('/checkins/sync', {
          items: [{ qrToken: registrationId, clientEventId, checkedInAt }]
        });
        setAttendees(prev => prev.map(a =>
          a.id === registrationId ? { ...a, status: 'CHECKED_IN' } : a
        ));
        Alert.alert('Thành công', 'Check-in thành công!');
        return;
      } catch (e) {
        console.warn('Online sync failed, falling back to offline', e);
      }
    }

    try {
      saveCheckin(registrationId, clientEventId, checkedInAt);
      setLocalCheckedInIds(prev => new Set(prev).add(registrationId));
      setAttendees(prev => prev.map(a =>
        a.id === registrationId ? { ...a, status: 'CHECKED_IN' } : a
      ));
      Alert.alert('Đã lưu offline', 'Sẽ đồng bộ khi có mạng.');
    } catch (e) {
      Alert.alert('Lỗi', 'Lỗi khi lưu dữ liệu.');
    }
  };

  const filteredAttendees = attendees.filter(a =>
    a.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.studentEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderAttendee = ({ item }: { item: Attendee }) => {
    const isCheckedIn = item.status === 'CHECKED_IN' || localCheckedInIds.has(item.id);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <User size={20} color="#4F46E5" />
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{item.studentName}</Text>
            <Text style={styles.email}>{item.studentEmail}</Text>
          </View>
          <View style={[styles.statusBadge, item.status === 'CONFIRMED' ? styles.statusConfirmed : styles.statusWarning]}>
            <Text style={[styles.statusText, item.status === 'CONFIRMED' ? styles.statusTextConfirmed : styles.statusTextWarning]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {isCheckedIn ? (
            <View style={styles.checkedInRow}>
              <CheckCircle size={18} color="#10B981" />
              <Text style={styles.checkedInText}>Check-in Successful</Text>
              {localCheckedInIds.has(item.id) && (
                <View style={styles.offlineBadge}>
                  <Database size={12} color="#F59E0B" />
                  <Text style={styles.offlineText}>OFFLINE</Text>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.checkinButton}
              onPress={() => handleManualCheckin(item.id)}
            >
              <Text style={styles.checkinButtonText}>Confirm Presence</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerControls}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search student..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#94A3B8"
          />
        </View>
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={() => navigation.navigate('CheckinScanner', { workshopId })}
        >
          <QrCode size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredAttendees}
          keyExtractor={item => item.id}
          renderItem={renderAttendee}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={<Text style={styles.emptyText}>No attendees found</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerControls: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#0F172A',
  },
  scanButton: {
    width: 44,
    height: 44,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  email: { fontSize: 13, color: '#64748B', marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusConfirmed: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  statusWarning: { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextConfirmed: { color: '#10B981' },
  statusTextWarning: { color: '#F59E0B' },
  actionRow: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
    alignItems: 'flex-end',
  },
  checkedInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkedInText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  offlineText: { fontSize: 10, fontWeight: '700', color: '#F59E0B' },
  checkinButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  checkinButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#64748B', fontSize: 15 },
});
