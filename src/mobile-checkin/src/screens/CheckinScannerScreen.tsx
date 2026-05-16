import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Database, Wifi, WifiOff, X } from 'lucide-react-native';
import { RootStackParamList } from '../../App';
import { saveCheckin, getPendingCount, markAsSynced } from '../api/offlineDb';
import api from '../api/axios';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

type Props = NativeStackScreenProps<RootStackParamList, 'CheckinScanner'>;

const generateUUID = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

export default function CheckinScannerScreen({ navigation }: Props) {
  const isOnline = useOnlineStatus();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getCameraPermissions();
    setPendingCount(getPendingCount());
  }, []);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    const qrToken = data.trim();
    if (!qrToken) {
      Alert.alert('Lỗi', 'Mã QR không hợp lệ.', [{ text: 'OK', onPress: () => setScanned(false) }]);
      return;
    }

    const clientEventId = generateUUID();
    const checkedInAt = new Date().toISOString();

    try {
      saveCheckin(qrToken, clientEventId, checkedInAt);
      
      if (isOnline) {
        try {
          const res = await api.post('/checkins/sync', {
            items: [{ qrToken, clientEventId, checkedInAt }]
          });
          
          if (res.status === 200) {
            markAsSynced([clientEventId]);
            Alert.alert('Thành công', 'Check-in thành công!', [{ text: 'Tiếp tục quét', onPress: () => setScanned(false) }]);
          }
        } catch (syncError) {
          console.warn('Sync error on scan, falling back to offline', syncError);
          setPendingCount(getPendingCount());
          Alert.alert('Đã lưu offline', 'Sẽ đồng bộ khi có mạng.', [{ text: 'Tiếp tục quét', onPress: () => setScanned(false) }]);
        }
      } else {
        setPendingCount(getPendingCount());
        Alert.alert('Đã lưu offline', 'Sẽ đồng bộ khi có mạng.', [{ text: 'Tiếp tục quét', onPress: () => setScanned(false) }]);
      }
    } catch (dbError) {
      console.error(dbError);
      Alert.alert('Lỗi', 'Không thể lưu dữ liệu.', [{ text: 'Thử lại', onPress: () => setScanned(false) }]);
    }
  };

  if (hasPermission === null) {
    return <View style={styles.center}><Text>Đang yêu cầu quyền camera...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.center}><Text>Không có quyền truy cập camera.</Text></View>;
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
        </View>
      </CameraView>

      <View style={styles.bottomBar}>
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, isOnline ? styles.onlineBadge : styles.offlineBadge]}>
            {isOnline ? <Wifi size={16} color="#10B981" /> : <WifiOff size={16} color="#F59E0B" />}
            <Text style={[styles.statusText, isOnline ? styles.onlineText : styles.offlineText]}>
              {isOnline ? 'Online — Tự động đồng bộ' : 'Offline — Đang lưu tạm'}
            </Text>
          </View>
        </View>

        {pendingCount > 0 && (
          <View style={styles.pendingRow}>
            <Database size={14} color="#64748B" />
            <Text style={styles.pendingText}>{pendingCount} bản ghi chờ đồng bộ lên hệ thống</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#4F46E5',
    backgroundColor: 'transparent',
    borderRadius: 24,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F8FAFC',
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
  },
  statusRow: { marginBottom: 8 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  onlineBadge: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  offlineBadge: { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
  statusText: { fontSize: 13, fontWeight: '600' },
  onlineText: { color: '#10B981' },
  offlineText: { color: '#F59E0B' },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
});
