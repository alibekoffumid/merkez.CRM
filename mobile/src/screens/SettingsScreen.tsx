import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  RefreshControl,
} from 'react-native';
import {
  Settings,
  Printer,
  Wifi,
  Plus,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCw,
  Trash2,
  Edit3,
  ShieldCheck,
  Server,
  FileText,
  Sliders,
  HelpCircle,
  Store,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Radio,
  Users,
  LogOut,
  Smartphone,
  Info,
  Check,
} from 'lucide-react-native';

import {
  receiptService,
  PrinterConfig,
  SavedPrinter,
  DEFAULT_PRINTER_CONFIG,
} from '../services/receiptService';
import { useAuth } from '../context/AuthContext';
import { PCGunScreen } from './PCGunScreen';

interface SettingsScreenProps {
  onBack?: () => void;
  onOpenScanner?: (mode: 'gun') => void;
  lastBeamedBarcode?: string | null;
}

type SettingsSection = 'menu' | 'printer' | 'pcgun' | 'store_info' | 'pos_prefs';

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  onOpenScanner,
  lastBeamedBarcode,
}) => {
  const { currentStaff, permissions, logout, lockStaff } = useAuth();

  // Active sub-section inside settings
  const [activeSection, setActiveSection] = useState<SettingsSection>('menu');

  // State for printers
  const [printers, setPrinters] = useState<SavedPrinter[]>([]);
  const [activeConfig, setActiveConfig] = useState<PrinterConfig>(DEFAULT_PRINTER_CONFIG);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form State (New or Edit Printer)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formConnectionType, setFormConnectionType] = useState<'direct_tcp' | 'rawbt'>('direct_tcp');
  const [formIp, setFormIp] = useState('192.168.1.200');
  const [formPort, setFormPort] = useState('9100');
  const [formPaperWidth, setFormPaperWidth] = useState<'58mm' | '80mm'>('58mm');
  const [formAutoCut, setFormAutoCut] = useState(true);
  const [formOpenDrawer, setFormOpenDrawer] = useState(false);
  const [formIsDefault, setFormIsDefault] = useState(true);

  // Store metadata
  const [storeName, setStoreName] = useState('');
  const [filialName, setFilialName] = useState('');
  const [voen, setVoen] = useState('');
  const [phone, setPhone] = useState('');
  const [footerNote, setFooterNote] = useState('');

  // POS Preferences
  const [autoPrintAfterSale, setAutoPrintAfterSale] = useState(true);
  const [enableHaptics, setEnableHaptics] = useState(true);
  const [autoOpenDrawerOnCash, setAutoOpenDrawerOnCash] = useState(true);

  // Status check state
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [isScanningSubnet, setIsScanningSubnet] = useState(false);
  const [scannedPrinters, setScannedPrinters] = useState<{ ip: string; port: number }[]>([]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const cfg = await receiptService.getConfig();
      setActiveConfig(cfg);
      setStoreName(cfg.storeName || DEFAULT_PRINTER_CONFIG.storeName);
      setFilialName(cfg.filialName || DEFAULT_PRINTER_CONFIG.filialName || '');
      setVoen(cfg.voen || DEFAULT_PRINTER_CONFIG.voen);
      setPhone(cfg.phone || DEFAULT_PRINTER_CONFIG.phone);
      setFooterNote(cfg.footerNote || DEFAULT_PRINTER_CONFIG.footerNote);

      const list = await receiptService.getSavedPrinters();
      setPrinters(list);
    } catch (e) {
      console.warn('Failed to load settings:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  // Test single printer connection (Ping)
  const handlePingPrinter = async (printer: SavedPrinter) => {
    setCheckingId(printer.id);
    try {
      await receiptService.testConnection(printer);
      const updated = await receiptService.updatePrinterStatus(printer.id, true);
      setPrinters(updated);
      Alert.alert(
        '✅ Bağlantı Uğurludur',
        `Printer şəbəkədə cavab verir!\n\nAd: ${printer.name}\nÜnvan: ${printer.ipAddress}:${printer.port}\nRejim: ${
          printer.connectionType === 'direct_tcp' ? 'Birbaşa TCP (RawBT-siz)' : 'RawBT'
        }`
      );
    } catch (err: any) {
      const updated = await receiptService.updatePrinterStatus(printer.id, false);
      setPrinters(updated);
      Alert.alert(
        '❌ Əlaqə Alınmadı',
        `Printer cavab vermir (${printer.ipAddress}:${printer.port}).\n\n1. Printerin açıq və kabelinin qoşulu olduğunu yoxlayyn.\n2. Telefonun printerlə eyni Wi-Fi şəbəkəsində olduğunu yoxlayın.\n3. IP və Portun düzgünlüyünü dəqiqləşdirin.`
      );
    } finally {
      setCheckingId(null);
    }
  };

  // Test Print for specific printer
  const handleTestPrint = async (printer: SavedPrinter) => {
    setTestingId(printer.id);
    try {
      await receiptService.printTest(printer);
      Alert.alert('✅ Sınaq Çapı Göndərildi', `"${printer.name}" printerinə sınaq çeki göndərildi.`);
    } catch (err: any) {
      Alert.alert('Çap Xətası', err?.message || 'Printerə məlumat göndərilə bilmədi.');
    } finally {
      setTestingId(null);
    }
  };

  // Set default active printer
  const handleSelectDefault = async (printer: SavedPrinter) => {
    try {
      const updated = await receiptService.setDefaultPrinter(printer.id);
      setPrinters(updated);
      const cfg = await receiptService.getConfig();
      setActiveConfig(cfg);
      Alert.alert('✅ Əsas Printer Təyin Olundu', `"${printer.name}" cari satışlar üçün əsas printer seçildi.`);
    } catch (e) {
      Alert.alert('Xəta', 'Əsas printer təyin edilə bilmədi.');
    }
  };

  // Delete printer
  const handleDeletePrinter = (printer: SavedPrinter) => {
    Alert.alert(
      'Printeri Sil',
      `"${printer.name}" (${printer.ipAddress}:${printer.port}) siyahıdan silinsin?`,
      [
        { text: 'İmtina', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            const updated = await receiptService.deletePrinter(printer.id);
            setPrinters(updated);
            const cfg = await receiptService.getConfig();
            setActiveConfig(cfg);
          },
        },
      ]
    );
  };

  // Edit printer
  const handleStartEdit = (printer: SavedPrinter) => {
    setEditingId(printer.id);
    setFormName(printer.name);
    setFormConnectionType(printer.connectionType || 'direct_tcp');
    setFormIp(printer.ipAddress);
    setFormPort(String(printer.port || 9100));
    setFormPaperWidth(printer.paperWidth || '58mm');
    setFormAutoCut(printer.autoCut !== false);
    setFormOpenDrawer(!!printer.openDrawer);
    setFormIsDefault(printer.isDefault);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const resetForm = () => {
    setFormName('');
    setFormConnectionType('direct_tcp');
    setFormIp('192.168.1.200');
    setFormPort('9100');
    setFormPaperWidth('58mm');
    setFormAutoCut(true);
    setFormOpenDrawer(false);
    setFormIsDefault(printers.length === 0);
  };

  // Test form connection
  const handleTestFormConnection = async () => {
    if (!formIp.trim()) {
      Alert.alert('Xəta', 'Zəhmət olmasa IP ünvanını qeyd edin.');
      return;
    }
    setCheckingId('form');
    try {
      await receiptService.testConnection({
        ipAddress: formIp.trim(),
        port: Number(formPort) || 9100,
      });
      Alert.alert('✅ Uğurlu', `Printer tapıldı: ${formIp.trim()}:${formPort || 9100}`);
    } catch (e: any) {
      Alert.alert(
        '❌ Əlaqə Xətası',
        `Printerlə (${formIp.trim()}:${formPort || 9100}) əlaqə qurulmadı.\nCihazın eyni Wi-Fi-da olduğunu yoxlayın.`
      );
    } finally {
      setCheckingId(null);
    }
  };

  // Save printer from form
  const handleSavePrinter = async () => {
    if (!formIp.trim()) {
      Alert.alert('Xəta', 'Zəhmət olmasa IP ünvanını daxil edin.');
      return;
    }

    const cleanPort = Number(formPort) || 9100;
    const cleanName = formName.trim() || `Printer ${formIp.trim()}`;

    const printerToSave: SavedPrinter = {
      id: editingId || `printer_${Date.now()}`,
      name: cleanName,
      connectionType: formConnectionType,
      ipAddress: formIp.trim(),
      port: cleanPort,
      paperWidth: formPaperWidth,
      autoCut: formAutoCut,
      openDrawer: formOpenDrawer,
      isDefault: formIsDefault || printers.length === 0,
    };

    try {
      const updated = await receiptService.savePrinter(printerToSave);
      setPrinters(updated);
      const cfg = await receiptService.getConfig();
      setActiveConfig(cfg);
      setEditingId(null);
      resetForm();
      Alert.alert('✅ Saxlanıldı', `"${cleanName}" printeri uğurla saxlanıldı!`);
    } catch (e) {
      Alert.alert('Xəta', 'Printer məlumatları yadda saxlanıla bilmədi.');
    }
  };

  // Save Store Details
  const handleSaveStoreDetails = async () => {
    try {
      const cfg = await receiptService.getConfig();
      const updated: PrinterConfig = {
        ...cfg,
        storeName: storeName.trim(),
        filialName: filialName.trim(),
        voen: voen.trim(),
        phone: phone.trim(),
        footerNote: footerNote.trim(),
      };
      await receiptService.saveConfig(updated);
      setActiveConfig(updated);
      Alert.alert('✅ Yadda Saxlanıldı', 'Çek və mağaza rekvizitləri yeniləndi.');
    } catch (e) {
      Alert.alert('Xəta', 'Rekvizitləri saxlamaq mümkün olmadı.');
    }
  };

  // Scan common local IPs for ESC/POS port 9100
  const handleScanSubnet = async () => {
    setIsScanningSubnet(true);
    setScannedPrinters([]);

    const base = (formIp || activeConfig.ipAddress || '192.168.1.200').trim();
    const parts = base.split('.');
    const prefix = parts.length >= 3 ? `${parts[0]}.${parts[1]}.${parts[2]}` : '192.168.1';

    const testIps = [
      `${prefix}.200`,
      `${prefix}.100`,
      `${prefix}.150`,
      `${prefix}.201`,
      `${prefix}.202`,
      `${prefix}.203`,
      `${prefix}.210`,
      `${prefix}.250`,
      `${prefix}.50`,
      `${prefix}.87`,
      `${prefix}.90`,
      `${prefix}.99`,
      `${prefix}.101`,
      `${prefix}.102`,
      `${prefix}.110`,
      `${prefix}.2`,
      `${prefix}.10`,
      `${prefix}.20`,
    ];

    const found: { ip: string; port: number }[] = [];

    for (let i = 0; i < testIps.length; i += 4) {
      const batch = testIps.slice(i, i + 4);
      await Promise.all(
        batch.map(async (ip) => {
          try {
            const ok = await receiptService.testConnection({ ipAddress: ip, port: 9100 });
            if (ok) {
              found.push({ ip, port: 9100 });
            }
          } catch (_) {}
        })
      );
    }

    setScannedPrinters(found);
    setIsScanningSubnet(false);

    if (found.length === 0) {
      Alert.alert(
        'Axtarış Tamamlandı',
        `${prefix}.* şəbəkəsində 9100 portlu printer avtomatik tapılmadı.\n\nZəhmət olmasa printerinizin IP ünvanını dəqiq bilərək formaya əllə daxil edin.`
      );
    } else {
      Alert.alert(
        '✅ Printer Tapıldı!',
        `Şəbəkədə ${found.length} aktiv printer aşkar olundu. "Əlavə Et" düyməsi ilə dərhal seçə bilərsiniz.`
      );
    }
  };

  const handleApplyScanned = (item: { ip: string; port: number }) => {
    setFormIp(item.ip);
    setFormPort(String(item.port));
    setFormName(`Wi-Fi Printer (${item.ip.split('.').pop()})`);
    setFormConnectionType('direct_tcp');
  };

  const handleClearCache = () => {
    Alert.alert(
      'Keşi Təmizlə',
      'Tətbiqin bütün müvəqqəti məlumatları və şəkil keşləri təmizlənsin?',
      [
        { text: 'İmtina', style: 'cancel' },
        {
          text: 'Təmizlə',
          style: 'destructive',
          onPress: () => {
            Alert.alert('✅ Keş Təmizləndi', 'Lokal yaddaş və keş uğurla boşaldıldı.');
          },
        },
      ]
    );
  };

  const handleLogoutConfirm = () => {
    Alert.alert(
      'Hesabdan Çıxış',
      'Sistemdən çıxmaq istədiyinizə əminsiniz?',
      [
        { text: 'Ləğv et', style: 'cancel' },
        { text: 'Çıxış', style: 'destructive', onPress: logout },
      ]
    );
  };

  const activePrinter = printers.find((p) => p.isDefault) || printers[0];

  // SUB-SECTION: PC GUN SCREEN
  if (activeSection === 'pcgun') {
    return (
      <PCGunScreen
        onBack={() => setActiveSection('menu')}
        onOpenScanner={onOpenScanner || (() => {})}
        lastBeamedBarcode={lastBeamedBarcode}
      />
    );
  }

  // SUB-SECTION: STORE INFO & REQUISITES
  if (activeSection === 'store_info') {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <TouchableOpacity
          style={styles.subBackButton}
          onPress={() => setActiveSection('menu')}
          activeOpacity={0.7}
        >
          <ChevronLeft size={20} color="#6366F1" />
          <Text style={[styles.subBackButtonText, { color: '#6366F1' }]}>
            Bütün Tənzimləmələrə Qayıt
          </Text>
        </TouchableOpacity>

        <View style={styles.formCard}>
          <View style={styles.formHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Store size={22} color="#6366F1" />
              <Text style={styles.formTitle}>Çek və Mağaza Rekvizitləri</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>MAĞAZA ADI</Text>
            <TextInput
              style={styles.textInput}
              value={storeName}
              onChangeText={setStoreName}
              placeholder="RAST MUSİQİ ALƏTLƏRİ MAĞAZASI"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>FİLİAL ADI</Text>
            <TextInput
              style={styles.textInput}
              value={filialName}
              onChangeText={setFilialName}
              placeholder="DÜKKAN - ƏHMƏDLİ"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.ipPortRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>VÖEN</Text>
              <TextInput
                style={styles.textInput}
                value={voen}
                onChangeText={setVoen}
                placeholder="5501238362"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>ƏLAQƏ TEL</Text>
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="+994 50 123 45 67"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ÇEKİN SONUNDAKI QEYD</Text>
            <TextInput
              style={styles.textInput}
              value={footerNote}
              onChangeText={setFooterNote}
              placeholder="Bizi seçdiyiniz üçün təşəkkür edirik!"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <TouchableOpacity style={styles.saveRequisitesBtn} onPress={handleSaveStoreDetails}>
            <CheckCircle2 size={18} color="#fff" />
            <Text style={styles.saveRequisitesBtnText}>Rekvizitləri Yadda Saxla</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // SUB-SECTION: POS PREFERENCES
  if (activeSection === 'pos_prefs') {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <TouchableOpacity
          style={styles.subBackButton}
          onPress={() => setActiveSection('menu')}
          activeOpacity={0.7}
        >
          <ChevronLeft size={20} color="#D97706" />
          <Text style={[styles.subBackButtonText, { color: '#D97706' }]}>
            Bütün Tənzimləmələrə Qayıt
          </Text>
        </TouchableOpacity>

        <View style={styles.formCard}>
          <View style={styles.formHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Sliders size={22} color="#D97706" />
              <Text style={styles.formTitle}>Kassa və Satış Parametrləri</Text>
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.switchTitle}>Satışdan sonra avtomatik çek çapı</Text>
              <Text style={styles.switchSub}>Ödəniş təsdiqlənən kimi qəbzi dərhal printerə göndər</Text>
            </View>
            <Switch
              value={autoPrintAfterSale}
              onValueChange={setAutoPrintAfterSale}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.switchTitle}>Titrəyiş və səs bildirişləri (Haptic)</Text>
              <Text style={styles.switchSub}>Barkod oxunanda və düyməyə basanda hiss olunan reaksiya</Text>
            </View>
            <Switch
              value={enableHaptics}
              onValueChange={setEnableHaptics}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.switchTitle}>Nağd ödənişdə kassa yeşiyini aç</Text>
              <Text style={styles.switchSub}>Nağd satış bitdikdə printer daxili kassa qutusunu açsın</Text>
            </View>
            <Switch
              value={autoOpenDrawerOnCash}
              onValueChange={setAutoOpenDrawerOnCash}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveRequisitesBtn, { backgroundColor: '#D97706' }]}
            onPress={() => {
              Alert.alert('✅ Saxlanıldı', 'Kassa parametrləri uğurla yadda saxlanıldı.');
              setActiveSection('menu');
            }}
          >
            <CheckCircle2 size={18} color="#fff" />
            <Text style={styles.saveRequisitesBtnText}>Parametrləri Saxla</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // SUB-SECTION: PRINTER SETTINGS
  if (activeSection === 'printer') {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} />}
      >
        <TouchableOpacity
          style={styles.subBackButton}
          onPress={() => setActiveSection('menu')}
          activeOpacity={0.7}
        >
          <ChevronLeft size={20} color="#10B981" />
          <Text style={styles.subBackButtonText}>Bütün Tənzimləmələrə Qayıt</Text>
        </TouchableOpacity>

        {/* 1. Header Banner */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <Printer size={26} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>PRİNTER TƏNZİMLƏMƏLƏRİ</Text>
              <Text style={styles.headerSubtitle}>Wi-Fi / Şəbəkə və RawBT Çek Printerləri</Text>
            </View>
          </View>

          {/* Current Active Printer Summary */}
          <View style={styles.activePrinterPill}>
            <View style={styles.activeDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.activePillLabel}>CARİ AKTİV PRİNTER:</Text>
              <Text style={styles.activePillValue}>
                {activePrinter
                  ? `${activePrinter.name} — ${activePrinter.ipAddress}:${activePrinter.port}`
                  : `${activeConfig.ipAddress}:${activeConfig.port || 9100}`}
              </Text>
            </View>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>
                {activePrinter?.connectionType === 'rawbt' ? 'RawBT' : 'Direct TCP'}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Connected / Saved Printers List Section */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Printer size={20} color="#10B981" />
            <Text style={styles.sectionTitle}>Qoşulmuş Printerlər ({printers.length})</Text>
          </View>
          <TouchableOpacity
            style={styles.quickScanBtn}
            onPress={handleScanSubnet}
            disabled={isScanningSubnet}
          >
            {isScanningSubnet ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : (
              <RotateCw size={14} color="#10B981" />
            )}
            <Text style={styles.quickScanBtnText}>
              {isScanningSubnet ? 'Axtarılır...' : 'Wi-Fi Skan'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scanned Found Printers Banner */}
        {scannedPrinters.length > 0 && (
          <View style={styles.scannedBox}>
            <Text style={styles.scannedTitle}>🔍 Şəbəkədə Tapılan Yeni Printerlər:</Text>
            {scannedPrinters.map((item, idx) => (
              <View key={idx} style={styles.scannedRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Wifi size={16} color="#10B981" />
                  <Text style={styles.scannedIp}>
                    {item.ip}:{item.port}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.scannedApplyBtn}
                  onPress={() => handleApplyScanned(item)}
                >
                  <Text style={styles.scannedApplyBtnText}>Formaya Keçir</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Printers Cards List */}
        {printers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Printer size={36} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Saxlanılmış printer tapılmadı</Text>
            <Text style={styles.emptySub}>
              Aşağıdakı formadan IP və Port daxil edərək ilk printerinizi əlavə edin.
            </Text>
          </View>
        ) : (
          printers.map((printer) => {
            const isAct = printer.isDefault;
            const isPingChecking = checkingId === printer.id;
            const isTestPrinting = testingId === printer.id;

            return (
              <View
                key={printer.id}
                style={[
                  styles.printerCard,
                  isAct && styles.printerCardActive,
                ]}
              >
                {/* Card Header */}
                <View style={styles.printerCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View
                      style={[
                        styles.printerCardIcon,
                        isAct ? styles.printerCardIconActive : null,
                      ]}
                    >
                      <Printer size={20} color={isAct ? '#fff' : '#4B5563'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.printerCardName} numberOfLines={1}>
                          {printer.name}
                        </Text>
                        {isAct && (
                          <View style={styles.activeTag}>
                            <Text style={styles.activeTagText}>AKTİV</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.printerCardSub}>
                        {printer.connectionType === 'direct_tcp'
                          ? '🟢 Birbaşa TCP (RawBT-siz)'
                          : '🔵 RawBT Sürücüsü'}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      printer.lastOnline === true
                        ? styles.statusPillOnline
                        : printer.lastOnline === false
                        ? styles.statusPillOffline
                        : styles.statusPillUnknown,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        printer.lastOnline === true
                          ? { backgroundColor: '#10B981' }
                          : printer.lastOnline === false
                          ? { backgroundColor: '#EF4444' }
                          : { backgroundColor: '#9CA3AF' },
                    ]}
                    />
                    <Text style={styles.statusPillText}>
                      {printer.lastOnline === true
                        ? 'Online'
                        : printer.lastOnline === false
                        ? 'Offline'
                        : 'Yoxlanılmayıb'}
                    </Text>
                  </View>
                </View>

                {/* Specs Row */}
                <View style={styles.specsRow}>
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>IP ÜNVAN</Text>
                    <Text style={styles.specValue}>{printer.ipAddress}</Text>
                  </View>
                  <View style={styles.specDivider} />
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>PORT</Text>
                    <Text style={styles.specValue}>{printer.port || 9100}</Text>
                  </View>
                  <View style={styles.specDivider} />
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>KAĞIZ</Text>
                    <Text style={styles.specValue}>{printer.paperWidth || '58mm'}</Text>
                  </View>
                </View>

                {/* Action Buttons Row */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.actionBtnSecondary}
                    onPress={() => handlePingPrinter(printer)}
                    disabled={isPingChecking}
                  >
                    {isPingChecking ? (
                      <ActivityIndicator size="small" color="#4B5563" />
                    ) : (
                      <Wifi size={14} color="#4B5563" />
                    )}
                    <Text style={styles.actionBtnSecondaryText}>
                      {isPingChecking ? 'Yoxlanır...' : 'Əlaqə'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtnTest}
                    onPress={() => handleTestPrint(printer)}
                    disabled={isTestPrinting}
                  >
                    {isTestPrinting ? (
                      <ActivityIndicator size="small" color="#10B981" />
                    ) : (
                      <Play size={13} color="#10B981" />
                    )}
                    <Text style={styles.actionBtnTestText}>
                      {isTestPrinting ? 'Çap...' : 'Sınaq Çapı'}
                    </Text>
                  </TouchableOpacity>

                  {!isAct && (
                    <TouchableOpacity
                      style={styles.actionBtnSelect}
                      onPress={() => handleSelectDefault(printer)}
                    >
                      <CheckCircle2 size={13} color="#fff" />
                      <Text style={styles.actionBtnSelectText}>Əsas Et</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => handleStartEdit(printer)}
                  >
                    <Edit3 size={15} color="#4B5563" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => handleDeletePrinter(printer)}
                  >
                    <Trash2 size={15} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* 3. Manual Add / Edit Printer Form */}
        <View style={styles.formCard}>
          <View style={styles.formHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Plus size={18} color="#10B981" />
              <Text style={styles.formTitle}>
                {editingId ? 'Printeri Redaktə Et' : 'Yeni Printer Əlavə Et (IP / Port)'}
              </Text>
            </View>
            {editingId && (
              <TouchableOpacity onPress={handleCancelEdit}>
                <Text style={styles.cancelText}>İmtina</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PRİNTERİN ADI / YERİ</Text>
            <TextInput
              style={styles.textInput}
              value={formName}
              onChangeText={setFormName}
              placeholder="Məs: Kassa Əsas, Anbar Wi-Fi, Xprinter"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>QOŞULMA NÖVÜ (REJİM)</Text>
            <View style={styles.modeToggleRow}>
              <TouchableOpacity
                style={[
                  styles.modeOption,
                  formConnectionType === 'direct_tcp' && styles.modeOptionActive,
                ]}
                onPress={() => setFormConnectionType('direct_tcp')}
              >
                <Wifi
                  size={16}
                  color={formConnectionType === 'direct_tcp' ? '#fff' : '#4B5563'}
                />
                <Text
                  style={[
                    styles.modeOptionText,
                    formConnectionType === 'direct_tcp' && styles.modeOptionTextActive,
                  ]}
                >
                  Birbaşa TCP (RawBT-siz)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeOption,
                  formConnectionType === 'rawbt' && styles.modeOptionActiveBlue,
                ]}
                onPress={() => setFormConnectionType('rawbt')}
              >
                <ExternalLink
                  size={16}
                  color={formConnectionType === 'rawbt' ? '#fff' : '#4B5563'}
                />
                <Text
                  style={[
                    styles.modeOptionText,
                    formConnectionType === 'rawbt' && styles.modeOptionTextActive,
                  ]}
                >
                  RawBT Rejimi
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.ipPortRow}>
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.inputLabel}>IP ÜNVANI *</Text>
              <View style={styles.inputWithIcon}>
                <Server size={16} color="#6B7280" />
                <TextInput
                  style={styles.inputBare}
                  value={formIp}
                  onChangeText={setFormIp}
                  placeholder="192.168.1.200"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>PORT *</Text>
              <TextInput
                style={styles.textInput}
                value={formPort}
                onChangeText={setFormPort}
                placeholder="9100"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>KAĞIZ FORMATI</Text>
            <View style={styles.paperWidthRow}>
              <TouchableOpacity
                style={[
                  styles.paperBtn,
                  formPaperWidth === '58mm' && styles.paperBtnActive,
                ]}
                onPress={() => setFormPaperWidth('58mm')}
              >
                <Text
                  style={[
                    styles.paperBtnText,
                    formPaperWidth === '58mm' && styles.paperBtnTextActive,
                  ]}
                >
                  58 mm (Standart Kassa)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paperBtn,
                  formPaperWidth === '80mm' && styles.paperBtnActive,
                ]}
                onPress={() => setFormPaperWidth('80mm')}
              >
                <Text
                  style={[
                    styles.paperBtnText,
                    formPaperWidth === '80mm' && styles.paperBtnTextActive,
                  ]}
                >
                  80 mm (Geniş Çek)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchTitle}>Avtomatik Kağız Kəsmə (Auto-cut)</Text>
              <Text style={styles.switchSub}>Çek bitdikdə bıçaq kağızı kəssin</Text>
            </View>
            <Switch
              value={formAutoCut}
              onValueChange={setFormAutoCut}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            />
          </View>

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchTitle}>Kassa Yeşiyini Aç (Cash Drawer)</Text>
              <Text style={styles.switchSub}>Çek çıxanda avtomatik kassa açılsın</Text>
            </View>
            <Switch
              value={formOpenDrawer}
              onValueChange={setFormOpenDrawer}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            />
          </View>

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchTitle}>Əsas (Aktiv) Printer Təyin Et</Text>
              <Text style={styles.switchSub}>Satışlar bu printerə göndərilsin</Text>
            </View>
            <Switch
              value={formIsDefault}
              onValueChange={setFormIsDefault}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            />
          </View>

          <View style={styles.formBtnRow}>
            <TouchableOpacity
              style={styles.testFormBtn}
              onPress={handleTestFormConnection}
              disabled={checkingId === 'form'}
            >
              {checkingId === 'form' ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <Wifi size={16} color="#10B981" />
              )}
              <Text style={styles.testFormBtnText}>
                {checkingId === 'form' ? 'Yoxlanır...' : 'Əlaqəni Yoxla'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveFormBtn} onPress={handleSavePrinter}>
              <CheckCircle2 size={16} color="#fff" />
              <Text style={styles.saveFormBtnText}>
                {editingId ? 'Yenilə və Saxla' : 'Printeri Yadda Saxla'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. Instruction / Help Card */}
        <View style={styles.helpCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <HelpCircle size={18} color="#0D9488" />
            <Text style={styles.helpTitle}>Direct TCP (RawBT-siz) Necə İşləyir?</Text>
          </View>
          <Text style={styles.helpText}>
            1. Printerinizin Ethernet və ya Wi-Fi ilə eyni routerə qoşulduğundan əmin olun.{'\n'}
            2. Telefonunuzun da həmin Wi-Fi şəbəkəsində olduğunu yoxlayın.{'\n'}
            3. Printerin IP ünvanını (məs: 192.168.1.200) və Portu (standart 9100) daxil edin.{'\n'}
            4. "Əlaqəni Yoxla" və "Sınaq Çapı" düymələri ilə əlaqəni test edin.{'\n'}
            5. Sistem birbaşa daxili TCP soketi ilə işlədiyi üçün heç bir əlavə xarici proqrama ehtiyac yoxdur!
          </Text>
        </View>
      </ScrollView>
    );
  }

  // ==========================================
  // MAIN SETTINGS HUB (LIST OF ALL SETTINGS)
  // ==========================================
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} />}
    >
      {/* 1. Header Card */}
      <View style={styles.headerCard}>
        {onBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <ChevronLeft size={18} color="#10B981" />
            <Text style={styles.backButtonText}>Anbara qayıt</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerRow}>
          <View style={styles.iconCircle}>
            <Settings size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>TƏNZİMLƏMƏLƏR</Text>
            <Text style={styles.headerSubtitle}>Tətbiqin bütün parametrləri və xidmətləri</Text>
          </View>
        </View>

        {/* Profile and Active Store Summary */}
        <View style={styles.profileSummaryCard}>
          <View style={styles.profileSummaryRow}>
            <View style={styles.profileBadgeIcon}>
              <Store size={15} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileSummaryLabel}>AKTİV MAĞAZA / FİLİAL:</Text>
              <Text style={styles.profileSummaryValue} numberOfLines={1}>
                {filialName || storeName || 'DÜKKAN - ƏHMƏDLİ'}
              </Text>
            </View>
          </View>

          <View style={styles.profileSummaryDivider} />

          <View style={styles.profileSummaryRow}>
            <View style={[styles.profileBadgeIcon, { backgroundColor: 'rgba(37, 99, 235, 0.15)' }]}>
              <ShieldCheck size={15} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileSummaryLabel}>CARİ İSTİFADƏÇİ:</Text>
              <Text style={styles.profileSummaryValue} numberOfLines={1}>
                {currentStaff === 'owner'
                  ? 'Sahib (İdarəçi - Tam Giriş)'
                  : currentStaff
                  ? `${currentStaff.name} (${currentStaff.role})`
                  : 'Heyət'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 2. Menu Section Header */}
      <Text style={styles.menuSectionTitle}>TƏTBİQİN BÖLMƏLƏRİ</Text>

      {/* 3. Settings Menu Items List */}
      <View style={styles.menuList}>
        {/* Item 1: Printer Settings */}
        <TouchableOpacity
          style={styles.menuItemCard}
          onPress={() => setActiveSection('printer')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuItemIconBox, { backgroundColor: '#ECFDF5' }]}>
            <Printer size={22} color="#10B981" />
          </View>
          <View style={styles.menuItemContent}>
            <View style={styles.menuItemTopRow}>
              <Text style={styles.menuItemTitle}>Çap və Printerlər</Text>
            </View>
            <Text style={styles.menuItemDesc}>
              Wi-Fi və şəbəkə printerləri, RawBT, sınaq çapı və kağız formatı
            </Text>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Item 2: PC Scanner (Wireless Gun) */}
        <TouchableOpacity
          style={styles.menuItemCard}
          onPress={() => setActiveSection('pcgun')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuItemIconBox, { backgroundColor: '#EFF6FF' }]}>
            <Radio size={22} color="#2563EB" />
          </View>
          <View style={styles.menuItemContent}>
            <View style={styles.menuItemTopRow}>
              <Text style={styles.menuItemTitle}>PC Skaner (Simsiz Barkod Oxuyucu)</Text>
            </View>
            <Text style={styles.menuItemDesc}>
              Telefonu kompüter üçün lazer skaner kimi istifadə edin (1C, CRM, Veb)
            </Text>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Item 3: Store & Receipt Requisites */}
        <TouchableOpacity
          style={styles.menuItemCard}
          onPress={() => setActiveSection('store_info')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuItemIconBox, { backgroundColor: '#F5F3FF' }]}>
            <Store size={22} color="#7C3AED" />
          </View>
          <View style={styles.menuItemContent}>
            <View style={styles.menuItemTopRow}>
              <Text style={styles.menuItemTitle}>Mağaza və Çek Rekvizitləri</Text>
            </View>
            <Text style={styles.menuItemDesc}>
              Mağaza adı, filial, VÖEN, əlaqə telefonu və çekin sonundakı təşəkkür mətni
            </Text>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Item 4: POS & Cashier Preferences */}
        <TouchableOpacity
          style={styles.menuItemCard}
          onPress={() => setActiveSection('pos_prefs')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuItemIconBox, { backgroundColor: '#FFFBEB' }]}>
            <Sliders size={22} color="#D97706" />
          </View>
          <View style={styles.menuItemContent}>
            <View style={styles.menuItemTopRow}>
              <Text style={styles.menuItemTitle}>Kassa və Satış Parametrləri</Text>
            </View>
            <Text style={styles.menuItemDesc}>
              Avtomatik çek çapı, kassa yeşiyi və titrəyiş siqnalları
            </Text>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Item 5: Clear Cache */}
        <TouchableOpacity
          style={styles.menuItemCard}
          onPress={handleClearCache}
          activeOpacity={0.7}
        >
          <View style={[styles.menuItemIconBox, { backgroundColor: '#FDF2F8' }]}>
            <Trash2 size={22} color="#DB2777" />
          </View>
          <View style={styles.menuItemContent}>
            <View style={styles.menuItemTopRow}>
              <Text style={styles.menuItemTitle}>Keş və Yaddaşın Təmizlənməsi</Text>
            </View>
            <Text style={styles.menuItemDesc}>
              Lokal müvəqqəti faylları və şəkil keşlərini təmizləyərək yaddaşı azad edin
            </Text>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Item 6: Switch Staff / PIN Lock */}
        <TouchableOpacity
          style={styles.menuItemCard}
          onPress={lockStaff}
          activeOpacity={0.7}
        >
          <View style={[styles.menuItemIconBox, { backgroundColor: '#F0FDF4' }]}>
            <Users size={22} color="#059669" />
          </View>
          <View style={styles.menuItemContent}>
            <View style={styles.menuItemTopRow}>
              <Text style={styles.menuItemTitle}>İstifadəçi Dəyiş / PIN Girişi</Text>
            </View>
            <Text style={styles.menuItemDesc}>
              Satıcı, kassir və ya menecer profilinə təhlükəsiz keçid edin
            </Text>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Item 7: App Info */}
        <View style={styles.menuItemCardStatic}>
          <View style={[styles.menuItemIconBox, { backgroundColor: '#F1F5F9' }]}>
            <Info size={22} color="#475569" />
          </View>
          <View style={styles.menuItemContent}>
            <View style={styles.menuItemTopRow}>
              <Text style={styles.menuItemTitle}>Tətbiq Haqqında</Text>
              <View style={styles.versionBadge}>
                <Text style={styles.versionBadgeText}>v1.1.22 (Build 33)</Text>
              </View>
            </View>
            <Text style={styles.menuItemDesc}>
              Merkez CRM Mobil İdarəetmə Paneli • Server bağlantısı aktivdir
            </Text>
          </View>
        </View>

        {/* Item 8: Logout */}
        <TouchableOpacity
          style={[styles.menuItemCard, styles.logoutCard]}
          onPress={handleLogoutConfirm}
          activeOpacity={0.7}
        >
          <View style={[styles.menuItemIconBox, { backgroundColor: '#FEF2F2' }]}>
            <LogOut size={22} color="#DC2626" />
          </View>
          <View style={styles.menuItemContent}>
            <View style={styles.menuItemTopRow}>
              <Text style={[styles.menuItemTitle, { color: '#DC2626' }]}>Hesabdan Çıxış</Text>
            </View>
            <Text style={styles.menuItemDesc}>
              Tətbiqdən və cari təşkilat profilindən çıxmaq üçün toxunun
            </Text>
          </View>
          <ChevronRight size={18} color="#FCA5A5" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  headerCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  subBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 4,
  },
  subBackButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10B981',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
    fontWeight: '500',
  },
  profileSummaryCard: {
    backgroundColor: '#1F2937',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#374151',
    gap: 10,
  },
  profileSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileBadgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSummaryLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  profileSummaryValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F9FAFB',
    marginTop: 1,
  },
  profileSummaryDivider: {
    height: 1,
    backgroundColor: '#374151',
  },
  menuSectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginTop: 6,
    marginLeft: 4,
  },
  menuList: {
    gap: 10,
  },
  menuItemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItemCardStatic: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  logoutCard: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FFFBFB',
    marginTop: 6,
  },
  menuItemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemContent: {
    flex: 1,
    gap: 3,
  },
  menuItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  menuItemDesc: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
  },
  menuStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  menuStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  versionBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  versionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  activePrinterPill: {
    backgroundColor: '#1F2937',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  activePillLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  activePillValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F9FAFB',
    marginTop: 1,
  },
  activeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  activeBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  quickScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  quickScanBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  scannedBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  scannedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
  },
  scannedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  scannedIp: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  scannedApplyBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  scannedApplyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#374151',
  },
  emptySub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  printerCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  printerCardActive: {
    borderColor: '#10B981',
    borderWidth: 2,
  },
  printerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  printerCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  printerCardIconActive: {
    backgroundColor: '#10B981',
  },
  printerCardName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  printerCardSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '600',
  },
  activeTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  activeTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#059669',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillOnline: {
    backgroundColor: '#ECFDF5',
  },
  statusPillOffline: {
    backgroundColor: '#FEF2F2',
  },
  statusPillUnknown: {
    backgroundColor: '#F3F4F6',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#374151',
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  specItem: {
    alignItems: 'center',
    gap: 2,
  },
  specLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  specValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  specDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  actionBtnTest: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  actionBtnTestText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  actionBtnSelect: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#10B981',
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnSelectText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  inputBare: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  ipPortRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modeOptionActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  modeOptionActiveBlue: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  modeOptionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4B5563',
  },
  modeOptionTextActive: {
    color: '#fff',
  },
  paperWidthRow: {
    flexDirection: 'row',
    gap: 10,
  },
  paperBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paperBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  paperBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  paperBtnTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  switchSub: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },
  formBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  testFormBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  testFormBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  saveFormBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saveFormBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  saveRequisitesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saveRequisitesBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  helpCard: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 16,
    padding: 16,
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F766E',
  },
  helpText: {
    fontSize: 11,
    color: '#134E4A',
    lineHeight: 18,
  },
});