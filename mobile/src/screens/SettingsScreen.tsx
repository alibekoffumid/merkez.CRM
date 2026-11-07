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
  ExternalLink,
} from 'lucide-react-native';

import {
  receiptService,
  PrinterConfig,
  SavedPrinter,
  DEFAULT_PRINTER_CONFIG,
} from '../services/receiptService';
import { useAuth } from '../context/AuthContext';

export const SettingsScreen: React.FC = () => {
  const { currentStaff, permissions } = useAuth();

  // State
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
        `Printer cavab vermir (${printer.ipAddress}:${printer.port}).\n\n1. Printerin açıq və kabelinin qoşulu olduğunu yoxlayın.\n2. Telefonun printerlə eyni Wi-Fi şəbəkəsində olduğunu yoxlayın.\n3. IP və Portun düzgünlüyünü dəqiqləşdirin.`
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

    // Determine subnet prefix based on formIp or active IP
    const base = (formIp || activeConfig.ipAddress || '192.168.1.200').trim();
    const parts = base.split('.');
    const prefix = parts.length >= 3 ? `${parts[0]}.${parts[1]}.${parts[2]}` : '192.168.1';

    // Scan common printer IPs in commercial networks
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

    // Test in parallel batches of 4
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

  const activePrinter = printers.find((p) => p.isDefault) || printers[0];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} />}
    >
      {/* 1. Header Banner */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.iconCircle}>
            <Sliders size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>TƏNZİMLƏMƏLƏR</Text>
            <Text style={styles.headerSubtitle}>Printerlər, Şəbəkə və Kassa Parametrləri</Text>
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

                {/* Status Indicator Pill */}
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

              {/* IP / Port Specs Row */}
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
                {/* Ping / Test Socket */}
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

                {/* Test Print */}
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

                {/* Make Active Default */}
                {!isAct && (
                  <TouchableOpacity
                    style={styles.actionBtnSelect}
                    onPress={() => handleSelectDefault(printer)}
                  >
                    <CheckCircle2 size={13} color="#fff" />
                    <Text style={styles.actionBtnSelectText}>Əsas Et</Text>
                  </TouchableOpacity>
                )}

                {/* Edit */}
                <TouchableOpacity
                  style={styles.actionIconBtn}
                  onPress={() => handleStartEdit(printer)}
                >
                  <Edit3 size={15} color="#4B5563" />
                </TouchableOpacity>

                {/* Delete */}
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

        {/* Printer Name Input */}
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

        {/* Connection Type Switcher */}
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

        {/* IP and Port Inputs Row */}
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

        {/* Paper Width Selection */}
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

        {/* Switches Row */}
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

        {/* Action Buttons */}
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

      {/* 4. Store & Receipt Requisites */}
      <View style={styles.formCard}>
        <View style={styles.formHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Store size={18} color="#4F46E5" />
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
          <Text style={styles.saveRequisitesBtnText}>Rekvizitləri Yadda Saxla</Text>
        </TouchableOpacity>
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
          5. Sistem birbaşa daxili TCP soketi ilə işlədiyi üçün heç bir əlavə xarici proqrama (RawBT və s.) ehtiyac yoxdur!
        </Text>
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
    gap: 16,
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
    fontSize: 14,
    fontWeight: '700',
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
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  printerCardActive: {
    borderColor: '#10B981',
    backgroundColor: '#FAFCFA',
  },
  printerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  printerCardIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  printerCardIconActive: {
    backgroundColor: '#10B981',
  },
  printerCardName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  activeTag: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
  },
  printerCardSub: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
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
    fontWeight: '700',
    color: '#374151',
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  specItem: {
    flex: 1,
    alignItems: 'center',
  },
  specDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
  },
  specLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  specValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  actionBtnSecondaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  actionBtnTest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  actionBtnTestText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  actionBtnSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#10B981',
    marginLeft: 'auto',
  },
  actionBtnSelectText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  actionIconBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 14,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formTitle: {
    fontSize: 14,
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
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modeOptionActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  modeOptionActiveBlue: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  modeOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  modeOptionTextActive: {
    color: '#fff',
  },
  ipPortRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputBare: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  paperWidthRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paperBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paperBtnActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  paperBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  paperBtnTextActive: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  switchTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  switchSub: {
    fontSize: 10,
    color: '#9CA3AF',
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
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  testFormBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  saveFormBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#10B981',
  },
  saveFormBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  saveRequisitesBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveRequisitesBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  helpCard: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
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
    color: '#115E59',
    lineHeight: 18,
    fontWeight: '500',
  },
});

