import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Radio,
  Barcode,
  Send,
  CheckCircle,
  Wifi,
  Laptop,
  ArrowRight,
  Trash2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { scannerSyncService } from '../services/scannerSyncService';

interface PCGunScreenProps {
  onOpenScanner: (mode: 'gun') => void;
  lastBeamedBarcode?: string | null;
}

interface ScanLog {
  id: string;
  barcode: string;
  time: string;
  status: 'sent' | 'ack';
}

export const PCGunScreen: React.FC<PCGunScreenProps> = ({
  onOpenScanner,
  lastBeamedBarcode,
}) => {
  const [roomCode, setRoomCode] = useState('merkez-pc-1');
  const [connected, setConnected] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [logs, setLogs] = useState<ScanLog[]>([]);

  useEffect(() => {
    connectRoom();
    return () => {
      scannerSyncService.disconnect();
    };
  }, [roomCode]);

  useEffect(() => {
    if (lastBeamedBarcode) {
      addLog(lastBeamedBarcode);
    }
  }, [lastBeamedBarcode]);

  const connectRoom = () => {
    scannerSyncService.initPCChannel(roomCode, (feedback) => {
      Alert.alert('PC qəbulu təsdiqlədi', feedback);
    });
    setConnected(true);
  };

  const addLog = (code: string) => {
    const newEntry: ScanLog = {
      id: `${Date.now()}-${Math.random()}`,
      barcode: code,
      time: new Date().toLocaleTimeString('az-AZ'),
      status: 'sent',
    };
    setLogs((prev) => [newEntry, ...prev.slice(0, 49)]);
  };

  const handleManualSend = async () => {
    if (!manualCode.trim()) return;
    const code = manualCode.trim();
    setManualCode('');

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    const ok = await scannerSyncService.beamBarcodeToPC(roomCode, code);
    if (ok) {
      addLog(code);
    } else {
      Alert.alert('Xəta', 'PC-yə ötürmək mümkün olmadı');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>PC üçün Simsiz Skaner</Text>
          <Text style={styles.sub}>
            Telefon kompüter üçün lazer skaner rolunu oynayır
          </Text>
        </View>

        {/* Sync Room Card */}
        <View style={styles.syncCard}>
          <View style={styles.syncCardTop}>
            <View style={styles.pcIconBox}>
              <Laptop size={22} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.syncCardTitle}>Kompüterlə əlaqə kanalı</Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: connected ? '#10B981' : '#F59E0B' },
                  ]}
                />
                <Text style={styles.statusText}>
                  {connected ? 'Kanal aktivdir (<50ms)' : 'Qoşulur...'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.roomInputRow}>
            <TextInput
              style={styles.roomInput}
              value={roomCode}
              onChangeText={setRoomCode}
              placeholder="Kanal kodu (məs. pc-1)"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.reconnectBtn} onPress={connectRoom}>
              <Wifi size={16} color="#fff" />
              <Text style={styles.reconnectBtnText}>Qoşul</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Big Laser Trigger Button */}
        <TouchableOpacity
          style={styles.bigLaserBtn}
          onPress={() => onOpenScanner('gun')}
          activeOpacity={0.85}
        >
          <View style={styles.laserInner}>
            <Barcode size={38} color="#fff" />
            <Text style={styles.laserBtnTitle}>SKAN ETMƏYƏ BAŞLA</Text>
            <Text style={styles.laserBtnSub}>
              Kamera oxuyur → barkod dərhal kompüterə yazılır
            </Text>
          </View>
        </TouchableOpacity>

        {/* Manual Code Input Bar */}
        <View style={styles.manualBar}>
          <TextInput
            style={styles.manualInput}
            value={manualCode}
            onChangeText={setManualCode}
            placeholder="Barkodu əl ilə daxil edin..."
            keyboardType="numeric"
            onSubmitEditing={handleManualSend}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleManualSend}>
            <Send size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Scanned Log History */}
        <View style={styles.logsHeader}>
          <Text style={styles.logsTitle}>Ötürmə tarixçəsi ({logs.length})</Text>
          {logs.length > 0 && (
            <TouchableOpacity onPress={() => setLogs([])}>
              <Text style={styles.clearLogsText}>Təmizlə</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.logRow}>
              <View style={styles.logLeft}>
                <Barcode size={16} color="#10B981" />
                <Text style={styles.logBarcode}>{item.barcode}</Text>
              </View>
              <View style={styles.logRight}>
                <Text style={styles.logTime}>{item.time}</Text>
                <CheckCircle size={14} color="#10B981" />
              </View>
            </View>
          )}
          contentContainerStyle={styles.logsList}
          ListEmptyComponent={
            <View style={styles.emptyLogs}>
              <Text style={styles.emptyLogsText}>
                Barkodu skan edib kompüterə ötürmək üçün yuxarıdakı yaşıl düyməyə basın
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },
  sub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  syncCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  syncCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pcIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  roomInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  roomInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    color: '#111827',
  },
  reconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  reconnectBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  bigLaserBtn: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#10B981',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  laserInner: {
    alignItems: 'center',
  },
  laserBtnTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 10,
    letterSpacing: 0.5,
  },
  laserBtnSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 4,
  },
  manualBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    gap: 8,
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
  },
  sendBtn: {
    backgroundColor: '#111827',
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  logsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  clearLogsText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  logsList: {
    paddingHorizontal: 16,
    paddingBottom: 90,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logBarcode: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  logRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  emptyLogs: {
    paddingVertical: 30,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyLogsText: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
