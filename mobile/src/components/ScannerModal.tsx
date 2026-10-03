import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import {
  X,
  Zap,
  ZapOff,
  RotateCcw,
  Radio,
  Package,
  Layers,
  ShoppingBag,
} from 'lucide-react-native';

interface ScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (barcode: string, mode: ScannerMode) => void;
  initialMode?: ScannerMode;
  pcConnected?: boolean;
}

export type ScannerMode = 'terminal' | 'gun' | 'stocktake' | 'pos';

const { width, height } = Dimensions.get('window');
const SCAN_FRAME_SIZE = Math.min(width * 0.75, 280);

export const ScannerModal: React.FC<ScannerModalProps> = ({
  visible,
  onClose,
  onScan,
  initialMode = 'terminal',
  pcConnected = false,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<ScannerMode>(initialMode);
  const [torch, setTorch] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [scanned, setScanned] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  // Laser animation line
  const [scanAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setScanned(false);
      setLastScannedCode(null);
      startScanAnimation();
    }
  }, [visible, initialMode]);

  const startScanAnimation = () => {
    scanAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: SCAN_FRAME_SIZE - 4,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned || !data) return;

    // Trigger haptic vibration
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      // ignore on simulator
    }

    setLastScannedCode(data);

    if (mode === 'stocktake') {
      // In stocktake mode, quick debounce instead of closing
      setScanned(true);
      onScan(data, mode);
      setTimeout(() => setScanned(false), 900);
    } else {
      setScanned(true);
      onScan(data, mode);
      setTimeout(() => {
        setScanned(false);
        if (mode !== 'gun') {
          onClose();
        }
      }, 400);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {!permission?.granted ? (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionTitle}>Kameraya icazə tələb olunur</Text>
            <Text style={styles.permissionSub}>
              Məhsulların barkodunu skan etmək üçün tətbiqin kameraya icazəsi lazımdır.
            </Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>Kameraya icazə ver</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeSimpleBtn} onPress={onClose}>
              <Text style={styles.closeSimpleBtnText}>Bağla</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing={facing}
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes: [
                  'ean13',
                  'ean8',
                  'code128',
                  'code39',
                  'upc_a',
                  'upc_e',
                  'qr',
                ],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />

            {/* Top Bar Controls */}
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.circleBtn} onPress={onClose}>
                <X color="#fff" size={24} />
              </TouchableOpacity>

              <View style={styles.titleContainer}>
                <View style={styles.titleBadge}>
                  {mode === 'gun' ? (
                    <Radio color="#10B981" size={15} />
                  ) : mode === 'pos' ? (
                    <ShoppingBag color="#10B981" size={15} />
                  ) : mode === 'stocktake' ? (
                    <Layers color="#10B981" size={15} />
                  ) : (
                    <Package color="#10B981" size={15} />
                  )}
                  <Text style={styles.headerTitle}>
                    {mode === 'gun'
                      ? 'PC ÜÇÜN SKANER'
                      : mode === 'pos'
                      ? 'ÇEKƏ SKAN ET'
                      : mode === 'stocktake'
                      ? 'İNVENTARİZASİYA'
                      : 'ANBAR SKANERİ'}
                  </Text>
                </View>
                {mode === 'gun' && (
                  <View style={styles.pcStatusBadge}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: pcConnected ? '#10B981' : '#F59E0B' },
                      ]}
                    />
                    <Text style={styles.pcStatusText}>
                      {pcConnected ? 'PC-yə qoşuldu' : 'Kanal aktivdir'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.rightButtons}>
                <TouchableOpacity
                  style={[styles.circleBtn, torch && styles.circleBtnActive]}
                  onPress={() => setTorch(!torch)}
                >
                  {torch ? <Zap color="#FFD700" size={20} /> : <ZapOff color="#fff" size={20} />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.circleBtn}
                  onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
                >
                  <RotateCcw color="#fff" size={20} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Viewfinder Target */}
            <View style={styles.targetContainer}>
              <View style={styles.scannerFrame}>
                {/* Laser animation */}
                <Animated.View
                  style={[
                    styles.laserLine,
                    {
                      transform: [{ translateY: scanAnim }],
                    },
                  ]}
                />
                {/* 4 Corner Markers */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>

              {lastScannedCode && (
                <View style={styles.lastScanBubble}>
                  <Text style={styles.lastScanLabel}>Oxunan kod:</Text>
                  <Text style={styles.lastScanVal}>{lastScannedCode}</Text>
                </View>
              )}
            </View>

            {/* Bottom Mode Switcher */}
            <View style={styles.bottomControls}>
              <View style={styles.modeTabs}>
                <TouchableOpacity
                  style={[styles.modeTab, mode === 'terminal' && styles.modeTabActive]}
                  onPress={() => setMode('terminal')}
                >
                  <Package
                    size={16}
                    color={mode === 'terminal' ? '#10B981' : 'rgba(255,255,255,0.7)'}
                  />
                  <Text
                    style={[styles.modeTabText, mode === 'terminal' && styles.modeTabTextActive]}
                  >
                    Məhsul
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modeTab, mode === 'gun' && styles.modeTabActive]}
                  onPress={() => setMode('gun')}
                >
                  <Radio
                    size={16}
                    color={mode === 'gun' ? '#10B981' : 'rgba(255,255,255,0.7)'}
                  />
                  <Text style={[styles.modeTabText, mode === 'gun' && styles.modeTabTextActive]}>
                    PC üçün
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modeTab, mode === 'pos' && styles.modeTabActive]}
                  onPress={() => setMode('pos')}
                >
                  <ShoppingBag
                    size={16}
                    color={mode === 'pos' ? '#10B981' : 'rgba(255,255,255,0.7)'}
                  />
                  <Text style={[styles.modeTabText, mode === 'pos' && styles.modeTabTextActive]}>
                    Kassa
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modeTab, mode === 'stocktake' && styles.modeTabActive]}
                  onPress={() => setMode('stocktake')}
                >
                  <Layers
                    size={16}
                    color={mode === 'stocktake' ? '#10B981' : 'rgba(255,255,255,0.7)'}
                  />
                  <Text
                    style={[styles.modeTabText, mode === 'stocktake' && styles.modeTabTextActive]}
                  >
                    İnventar
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.hintText}>
                {mode === 'gun'
                  ? 'Hər bir barkod dərhal kompüterinizin ekranına ötürülür'
                  : mode === 'stocktake'
                  ? 'Qalıqların sayımı üçün fasiləsiz skan rejimi'
                  : mode === 'pos'
                  ? 'Məhsul dərhal cari satış çekinə əlavə edilir'
                  : 'Məhsul məlumatına baxmaq üçün kameranı barkoda yönəldin'}
              </Text>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#111827',
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionSub: {
    color: '#9CA3AF',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  permissionBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  permissionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  closeSimpleBtn: {
    marginTop: 16,
    paddingVertical: 10,
  },
  closeSimpleBtnText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 35,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(17, 24, 39, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleBtnActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  rightButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  titleContainer: {
    alignItems: 'center',
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(17, 24, 39, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  pcStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pcStatusText: {
    color: '#E5E7EB',
    fontSize: 11,
    fontWeight: '600',
  },
  targetContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: SCAN_FRAME_SIZE,
    height: SCAN_FRAME_SIZE,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  laserLine: {
    height: 3,
    width: '100%',
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#10B981',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  lastScanBubble: {
    marginTop: 24,
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  lastScanLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  lastScanVal: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  bottomControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 25,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    borderRadius: 24,
    padding: 4,
    gap: 4,
    width: '100%',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 18,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  modeTabText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: '#10B981',
    fontWeight: '700',
  },
  hintText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 20,
  },
});
