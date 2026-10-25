import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import {
  X,
  Printer,
  Wifi,
  Save,
  FileText,
  HelpCircle,
  Building,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import {
  receiptService,
  PrinterConfig,
  DEFAULT_PRINTER_CONFIG,
} from '../services/receiptService';

interface PrinterSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (config: PrinterConfig) => void;
}

export const PrinterSettingsModal: React.FC<PrinterSettingsModalProps> = ({
  visible,
  onClose,
  onSaved,
}) => {
  const [config, setConfig] = useState<PrinterConfig>(DEFAULT_PRINTER_CONFIG);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (visible) {
      loadConfig();
    }
  }, [visible]);

  const loadConfig = async () => {
    setLoading(true);
    const cfg = await receiptService.getConfig();
    setConfig(cfg);
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    await receiptService.saveConfig(config);
    setLoading(false);
    onSaved?.(config);
    Alert.alert('Uğurlu', 'Printer tənzimləmələri yadda saxlanıldı!');
    onClose();
  };

  const [testingSocket, setTestingSocket] = useState(false);

  const handleTestConnection = async () => {
    setTestingSocket(true);
    try {
      await receiptService.testConnection(config);
      Alert.alert(
        '✅ Bağlantı Uğurludur',
        `Printer şəbəkədə tapıldı!\n\nÜnvan: ${config.ipAddress}:${config.port || 9100}\nStatus: Cavab verir (Online)`
      );
    } catch (e: any) {
      Alert.alert(
        '❌ Printer Tapılmadı',
        `Printerə qoşulmaq olmadı (${config.ipAddress}:${config.port || 9100}).\n\n1. Printerin yandırıldığını və kabelin taxıldığını yoxlayın.\n2. Telefonun printerlə eyni Wi-Fi şəbəkəsində olduğunu yoxlayın.`
      );
    } finally {
      setTestingSocket(false);
    }
  };

  const handleTestPrint = async () => {
    setTesting(true);
    try {
      await receiptService.printTest(config);
    } catch (e: any) {
      Alert.alert('Çap Xətası', e.message || 'Sınaq çapı göndərilə bilmədi');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Printer size={18} color="#fff" />
              </View>
              <View>
                <Text style={styles.title}>Printer Tənzimləmələri</Text>
                <Text style={styles.subtitle}>LAN / Wi-Fi Şəbəkə Termoprinteri</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#10B981" />
            </View>
          ) : (
            <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
              {/* Connection Box */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Wifi size={16} color="#10B981" />
                  <Text style={styles.cardTitle}>ŞƏBƏKƏ PARAMETRLƏRİ (LAN)</Text>
                </View>

                {/* Print Mode Selector */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Çap Rejimi</Text>
                  <View style={styles.toggleRow}>
                    <TouchableOpacity
                      style={[
                        styles.toggleBtn,
                        config.connectionType !== 'rawbt' && styles.toggleBtnActive,
                      ]}
                      onPress={() => setConfig({ ...config, connectionType: 'direct_tcp' })}
                    >
                      <Text
                        style={[
                          styles.toggleBtnText,
                          config.connectionType !== 'rawbt' && styles.toggleBtnTextActive,
                        ]}
                      >
                        ⚡ Birbaşa LAN (RawBT-siz)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.toggleBtn,
                        config.connectionType === 'rawbt' && styles.toggleBtnActive,
                      ]}
                      onPress={() => setConfig({ ...config, connectionType: 'rawbt' })}
                    >
                      <Text
                        style={[
                          styles.toggleBtnText,
                          config.connectionType === 'rawbt' && styles.toggleBtnTextActive,
                        ]}
                      >
                        📱 RawBT Sürücüsü
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.hint}>
                    {config.connectionType === 'rawbt'
                      ? 'Çeki telefondakı RawBT tətbiqi vasitəsilə göndərir.'
                      : 'RawBT tələb olunmur! Çek birbaşa router/Wi-Fi vasitəsilə printerə göndərilir.'}
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Printerin IP Ünvanı</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="məs: 192.168.1.200"
                    placeholderTextColor="#9CA3AF"
                    value={config.ipAddress}
                    onChangeText={(txt: string) => setConfig({ ...config, ipAddress: txt.trim() })}
                    keyboardType="numeric"
                    autoCapitalize="none"
                  />
                  <Text style={styles.hint}>
                    Printerin arxasına taxılmış LAN kabelinin qoşulduğu routerdən aldığı IP.
                  </Text>
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.label}>Port</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="9100"
                      placeholderTextColor="#9CA3AF"
                      value={String(config.port || 9100)}
                      onChangeText={(txt: string) => setConfig({ ...config, port: parseInt(txt) || 9100 })}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Kağız Eni</Text>
                    <View style={styles.toggleRow}>
                      <TouchableOpacity
                        style={[
                          styles.toggleBtn,
                          config.paperWidth === '58mm' && styles.toggleBtnActive,
                        ]}
                        onPress={() => setConfig({ ...config, paperWidth: '58mm' })}
                      >
                        <Text
                          style={[
                            styles.toggleBtnText,
                            config.paperWidth === '58mm' && styles.toggleBtnTextActive,
                          ]}
                        >
                          58 mm
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.toggleBtn,
                          config.paperWidth === '80mm' && styles.toggleBtnActive,
                        ]}
                        onPress={() => setConfig({ ...config, paperWidth: '80mm' })}
                      >
                        <Text
                          style={[
                            styles.toggleBtnText,
                            config.paperWidth === '80mm' && styles.toggleBtnTextActive,
                          ]}
                        >
                          80 mm
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Ping / Test Socket Button */}
                <TouchableOpacity
                  style={[styles.pingBtn, testingSocket && styles.btnDisabled]}
                  onPress={handleTestConnection}
                  disabled={testingSocket}
                  activeOpacity={0.8}
                >
                  {testingSocket ? (
                    <ActivityIndicator size="small" color="#10B981" />
                  ) : (
                    <>
                      <Wifi size={15} color="#10B981" />
                      <Text style={styles.pingBtnText}>Printer Bağlantısını Yoxla (Ping)</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Auto-print Switch */}
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchLabel}>Avtomatik Çap</Text>
                    <Text style={styles.switchSub}>
                      Satış təsdiqləndikdən dərhal sonra çeki printerə göndər
                    </Text>
                  </View>
                  <Switch
                    value={config.autoPrint}
                    onValueChange={(val: boolean) => setConfig({ ...config, autoPrint: val })}
                    trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
                    thumbColor={config.autoPrint ? '#10B981' : '#F3F4F6'}
                  />
                </View>

                {/* Auto-cut Switch */}
                <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchLabel}>Avtomatik Kağız Kəsmə</Text>
                    <Text style={styles.switchSub}>
                      Çap bitdikdən sonra printerin daxili bıçağını işə sal
                    </Text>
                  </View>
                  <Switch
                    value={config.autoCut !== false}
                    onValueChange={(val: boolean) => setConfig({ ...config, autoCut: val })}
                    trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
                    thumbColor={config.autoCut !== false ? '#10B981' : '#F3F4F6'}
                  />
                </View>
              </View>

              {/* Store & Header Details */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Building size={16} color="#6366F1" />
                  <Text style={styles.cardTitle}>ÇEK BAŞLIĞI VƏ MƏLUMATLAR</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Obyekt / Mağaza Adı</Text>
                  <TextInput
                    style={styles.input}
                    value={config.storeName}
                    onChangeText={(txt: string) => setConfig({ ...config, storeName: txt })}
                    placeholder="RAST MUSİQİ ALƏTLƏRİ MAĞAZASI"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Fəaliyyət Sahəsi (Alt Başlıq)</Text>
                  <TextInput
                    style={styles.input}
                    value={config.storeSubtitle}
                    onChangeText={(txt: string) => setConfig({ ...config, storeSubtitle: txt })}
                    placeholder="Musiqi Alətlərinin Satışı və Təmiri"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>TS Adı</Text>
                  <TextInput
                    style={styles.input}
                    value={config.tsName}
                    onChangeText={(txt: string) => setConfig({ ...config, tsName: txt })}
                    placeholder="MUSİQİ ALƏTLƏRİ SATIŞI VƏ TƏMİRİ"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>TS Ünvanı</Text>
                  <TextInput
                    style={styles.input}
                    value={config.tsAddress}
                    onChangeText={(txt: string) => setConfig({ ...config, tsAddress: txt })}
                    placeholder="AZ1142 BAKI ŞƏHƏRİ XƏTAİ RAYONU ev.18A m.92"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>VÖ Adı (Vergi Ödəyicisi)</Text>
                  <TextInput
                    style={styles.input}
                    value={config.voName}
                    onChangeText={(txt: string) => setConfig({ ...config, voName: txt })}
                    placeholder="ŞƏKƏROV KAMRAN MUSA OĞLU"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.label}>VÖEN</Text>
                    <TextInput
                      style={styles.input}
                      value={config.voen}
                      onChangeText={(txt: string) => setConfig({ ...config, voen: txt })}
                      placeholder="5501238362"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Obyektin Kodu</Text>
                    <TextInput
                      style={styles.input}
                      value={config.objectCode}
                      onChangeText={(txt: string) => setConfig({ ...config, objectCode: txt })}
                      placeholder="5501238362-20001"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.label}>Kassa Nömrəsi</Text>
                    <TextInput
                      style={styles.input}
                      value={config.kassaNumber}
                      onChangeText={(txt: string) => setConfig({ ...config, kassaNumber: txt })}
                      placeholder="V1E0969392"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Filial</Text>
                    <TextInput
                      style={styles.input}
                      value={config.filialName}
                      onChangeText={(txt: string) => setConfig({ ...config, filialName: txt })}
                      placeholder="DÜKKAN - ƏHMƏDLİ"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Telefon</Text>
                  <TextInput
                    style={styles.input}
                    value={config.phone}
                    onChangeText={(txt: string) => setConfig({ ...config, phone: txt })}
                    placeholder="+994 50 123 45 67"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Çekin Sonundakı Mesaj</Text>
                  <TextInput
                    style={styles.input}
                    value={config.footerNote}
                    onChangeText={(txt: string) => setConfig({ ...config, footerNote: txt })}
                    placeholder="Bizi seçdiyiniz üçün təşəkkür edirik!"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Guide Accordion */}
              <TouchableOpacity
                style={styles.guideToggle}
                onPress={() => setShowGuide(!showGuide)}
                activeOpacity={0.8}
              >
                <View style={styles.guideToggleLeft}>
                  <HelpCircle size={16} color="#2563EB" />
                  <Text style={styles.guideToggleText}>
                    Obyektdə Kompütersiz Quraşdırma Təlimatı
                  </Text>
                </View>
                {showGuide ? (
                  <ChevronUp size={18} color="#2563EB" />
                ) : (
                  <ChevronDown size={18} color="#2563EB" />
                )}
              </TouchableOpacity>

              {showGuide && (
                <View style={styles.guideBox}>
                  <Text style={styles.guideTitle}>📍 Addım-addım quraşdırma:</Text>
                  
                  <Text style={styles.guideStep}>
                    <Text style={styles.guideBold}>1. Self-Test çıxarın:</Text> Printeri söndürün. FEED düyməsini basıb saxlayaraq printeri yandırın, 2 saniyə sonra buraxın. Çıxan çekdə <Text style={styles.guideBold}>IP Address</Text> sətrinə baxın (məsələn: 192.168.1.100).
                  </Text>

                  <Text style={styles.guideStep}>
                    <Text style={styles.guideBold}>2. RawBT tətbiqi:</Text> Android telefonunuza Google Play-dən pulsuz <Text style={styles.guideBold}>RawBT print service</Text> quraşdırın. RawBT elektron fiskal çeki və yoxlama üçün QR kodu dəqiq qrafik rejimdə birbaşa termoprinterə ötürür.
                  </Text>

                  <Text style={styles.guideStep}>
                    <Text style={styles.guideBold}>3. Alt şəbəkə fərqli olarsa (məsələn 192.168.123.100):</Text> Telefonun Wi-Fi parametrlərində IP-ni müvəqqəti Statik edib 192.168.123.50 yazın, Chrome brauzerdə http://192.168.123.100 açıb printerin IP-sini routerinizin diapazonuna dəyişin (və ya DHCP edin).
                  </Text>
                </View>
              )}

              {/* Test Print Button */}
              <TouchableOpacity
                style={[styles.testBtn, testing && styles.btnDisabled]}
                onPress={handleTestPrint}
                disabled={testing}
                activeOpacity={0.8}
              >
                {testing ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <>
                    <Printer size={16} color="#2563EB" />
                    <Text style={styles.testBtnText}>Sınaq Çapı Göndər (Test Print)</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* Footer Save Button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Ləğv et</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, loading && styles.btnDisabled]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Save size={16} color="#fff" />
              <Text style={styles.saveBtnText}>Yadda Saxla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  loadingBox: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 16,
  },
  contentInner: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  hint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#10B981',
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 4,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  switchSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    paddingRight: 10,
  },
  guideToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 14,
  },
  guideToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  guideToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D4ED8',
    flex: 1,
  },
  guideBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  guideStep: {
    fontSize: 12,
    lineHeight: 18,
    color: '#334155',
    marginBottom: 8,
  },
  guideBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  pingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 6,
    marginBottom: 8,
  },
  pingBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 16,
  },
  testBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
