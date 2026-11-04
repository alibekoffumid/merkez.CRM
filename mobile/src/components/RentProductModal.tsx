import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import {
  X,
  KeyRound,
  User,
  Phone,
  CreditCard,
  Calendar,
  DollarSign,
  Camera,
  CheckCircle,
  AlertTriangle,
  Package,
  ShieldCheck,
  Trash2,
  Clock,
} from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Product } from '../types';
import { rentalService } from '../services/rentalService';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

interface RentProductModalProps {
  visible: boolean;
  onClose: () => void;
  products: Product[];
  onSuccess?: () => void;
}

export const RentProductModal: React.FC<RentProductModalProps> = ({
  visible,
  onClose,
  products = [],
  onSuccess,
}) => {
  const { user, profile } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();

  const [loading, setLoading] = useState(false);

  // Client Details
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientIdSerial, setClientIdSerial] = useState('');
  const [clientFin, setClientFin] = useState('');

  // Media (Base64 URIs or storage URLs)
  const [idPhotoFront, setIdPhotoFront] = useState('');
  const [idPhotoBack, setIdPhotoBack] = useState('');
  const [toolPhotoBefore, setToolPhotoBefore] = useState('');
  const [conditionNotes, setConditionNotes] = useState('Saz vəziyyətdə, tam işlək.');

  // Camera in-modal viewfinder
  const [activeCameraTarget, setActiveCameraTarget] = useState<'idFront' | 'idBack' | 'tool' | null>(null);
  const cameraRef = useRef<CameraView>(null);

  // Duration
  const [daysCount, setDaysCount] = useState(3);
  const [startDateStr, setStartDateStr] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDateStr, setDueDateStr] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });

  // Financials
  const [depositAmount, setDepositAmount] = useState(0);
  const [rentalFee, setRentalFee] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Nağd');

  // Compute total retail value of selected products
  const totalRetailPrice = products.reduce((acc, p) => acc + (p.price || p.sale_price || 0), 0);

  useEffect(() => {
    if (visible) {
      setDepositAmount(totalRetailPrice);
      setRentalFee('');
      setClientName('');
      setClientPhone('');
      setClientIdSerial('');
      setClientFin('');
      setIdPhotoFront('');
      setIdPhotoBack('');
      setToolPhotoBefore('');
      setConditionNotes('Saz vəziyyətdə, tam işlək.');
      setDaysCount(3);

      const today = new Date().toISOString().split('T')[0];
      setStartDateStr(today);
      const in3 = new Date();
      in3.setDate(in3.getDate() + 3);
      setDueDateStr(in3.toISOString().split('T')[0]);
    }
  }, [visible, totalRetailPrice]);

  const setDurationPreset = (days: number) => {
    setDaysCount(days);
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDueDateStr(d.toISOString().split('T')[0]);
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const pic = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.6,
      });

      if (pic && pic.base64) {
        const url = await rentalService.uploadImage(pic.base64);
        if (activeCameraTarget === 'idFront') setIdPhotoFront(url);
        else if (activeCameraTarget === 'idBack') setIdPhotoBack(url);
        else if (activeCameraTarget === 'tool') setToolPhotoBefore(url);
      }
      setActiveCameraTarget(null);
    } catch (err) {
      Alert.alert('Xəta', 'Şəkil çəkilə bilmədi');
      setActiveCameraTarget(null);
    }
  };

  const handleSubmit = async () => {
    if (products.length === 0) {
      Alert.alert('Xəta', 'İcarəyə veriləcək məhsul seçilməyib');
      return;
    }

    if (!clientName.trim()) {
      Alert.alert('Xəta', 'Müştərinin Ad və Soyadını daxil edin');
      return;
    }

    if (!clientPhone.trim()) {
      Alert.alert('Xəta', 'Müştərinin əlaqə nömrəsini daxil edin');
      return;
    }

    if (!clientIdSerial.trim() && !clientFin.trim()) {
      Alert.alert('Xəta', 'Şəxsiyyət vəsiqəsi seriyasını və ya FİN kodunu daxil edin');
      return;
    }

    if (!idPhotoFront) {
      Alert.alert('Xəta', 'Şəxsiyyət vəsiqəsinin şəklini çəkin (Məcburidir)');
      return;
    }

    if (!toolPhotoBefore) {
      Alert.alert('Xəta', 'Alətin cari vəziyyətinin şəklini çəkin (Məcburidir)');
      return;
    }

    try {
      setLoading(true);

      for (const prod of products) {
        const itemDeposit = products.length === 1 ? Number(depositAmount) : (prod.price || prod.sale_price || 0);
        const itemFee = products.length === 1 ? Number(rentalFee) || 0 : Math.round(((Number(rentalFee) || 0) / products.length) * 100) / 100;

        await rentalService.createRental({
          product: prod,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          clientIdSerial: clientIdSerial.trim().toUpperCase(),
          clientFin: clientFin.trim().toUpperCase(),
          idPhotoFront,
          idPhotoBack,
          toolPhotoBefore,
          conditionNotes,
          depositAmount: itemDeposit,
          rentalFee: itemFee,
          paymentMethod,
          startDate: startDateStr,
          dueDate: dueDateStr,
          userId: user?.id || profile?.id,
        });
      }

      Alert.alert(
        'Uğurlu',
        `${products.length} məhsul icarəyə verildi.\nGirov məbləği: ₼${depositAmount}`
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert('Xəta', e.message || 'İcarə qeydiyyatında xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <KeyRound size={20} color="#fff" />
              </View>
              <View>
                <Text style={styles.title}>İcarəyə Ver (Girovla)</Text>
                <Text style={styles.subTitle}>
                  {products.length} məhsul üçün qeydiyyat
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Camera Viewfinder Overlay if taking photo */}
          {activeCameraTarget ? (
            <View style={styles.cameraContainer}>
              <CameraView ref={cameraRef} style={styles.cameraView} facing="back">
                <View style={styles.cameraUi}>
                  <TouchableOpacity
                    style={styles.cancelCameraBtn}
                    onPress={() => setActiveCameraTarget(null)}
                  >
                    <X size={24} color="#fff" />
                  </TouchableOpacity>
                  <Text style={styles.cameraInstruction}>
                    {activeCameraTarget === 'idFront'
                      ? 'Şəxsiyyət vəsiqəsi (Ön tərəfi)'
                      : activeCameraTarget === 'idBack'
                      ? 'Şəxsiyyət vəsiqəsi (Arxa tərəfi)'
                      : 'Alətin cari vəziyyəti'}
                  </Text>
                  <TouchableOpacity style={styles.shutterBtn} onPress={takePhoto}>
                    <View style={styles.shutterInner} />
                  </TouchableOpacity>
                </View>
              </CameraView>
            </View>
          ) : (
            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
              
              {/* 1. Selected Products List */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Package size={16} color="#4F46E5" />
                  <Text style={styles.sectionTitle}>İcarəyə Verilən Məhsullar</Text>
                </View>
                {products.map((p, idx) => (
                  <View key={p.id || idx} style={styles.productRow}>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.productBarcode}>{p.barcode || 'Barkodsuz'}</Text>
                    </View>
                    <Text style={styles.productPrice}>
                      ₼{(p.price || p.sale_price || 0).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>

              {/* 2. Customer Information */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <User size={16} color="#4F46E5" />
                  <Text style={styles.sectionTitle}>Müştəri Məlumatları (Məcburidir)</Text>
                </View>

                <Text style={styles.inputLabel}>Ad və Soyad *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Məs: Əli Məmmədov"
                  placeholderTextColor="#9CA3AF"
                  value={clientName}
                  onChangeText={setClientName}
                />

                <Text style={styles.inputLabel}>Əlaqə Nömrəsi *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+994 50 123 45 67"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  value={clientPhone}
                  onChangeText={setClientPhone}
                />

                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Ş/V Seriya və № *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="AZE 12345678"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="characters"
                      value={clientIdSerial}
                      onChangeText={(t) => setClientIdSerial(t.toUpperCase())}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>FİN Kod (7 simvol) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="7ABC123"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="characters"
                      maxLength={7}
                      value={clientFin}
                      onChangeText={(t) => setClientFin(t.toUpperCase())}
                    />
                  </View>
                </View>
              </View>

              {/* 3. Photo Captures */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Camera size={16} color="#4F46E5" />
                  <Text style={styles.sectionTitle}>Foto Təsdiqlər (Məcburidir)</Text>
                </View>

                {/* ID Front */}
                <Text style={styles.inputLabel}>Şəxsiyyət Vəsiqəsi (Ön tərəfi) *</Text>
                {idPhotoFront ? (
                  <View style={styles.photoPreviewWrap}>
                    <Image source={{ uri: idPhotoFront }} style={styles.photoPreview} />
                    <TouchableOpacity
                      style={styles.deletePhotoBtn}
                      onPress={() => setIdPhotoFront('')}
                    >
                      <Trash2 size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.cameraTriggerBtn}
                    onPress={async () => {
                      if (!permission?.granted) await requestPermission();
                      setActiveCameraTarget('idFront');
                    }}
                  >
                    <Camera size={20} color="#4F46E5" />
                    <Text style={styles.cameraTriggerText}>Vəsiqənin ön tərəfini çək</Text>
                  </TouchableOpacity>
                )}

                {/* ID Back */}
                <Text style={styles.inputLabel}>Şəxsiyyət Vəsiqəsi (Arxa tərəfi)</Text>
                {idPhotoBack ? (
                  <View style={styles.photoPreviewWrap}>
                    <Image source={{ uri: idPhotoBack }} style={styles.photoPreview} />
                    <TouchableOpacity
                      style={styles.deletePhotoBtn}
                      onPress={() => setIdPhotoBack('')}
                    >
                      <Trash2 size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.cameraTriggerBtn}
                    onPress={async () => {
                      if (!permission?.granted) await requestPermission();
                      setActiveCameraTarget('idBack');
                    }}
                  >
                    <Camera size={20} color="#6B7280" />
                    <Text style={styles.cameraTriggerTextGray}>Vəsiqənin arxa tərəfini çək</Text>
                  </TouchableOpacity>
                )}

                {/* Tool Before */}
                <Text style={styles.inputLabel}>Alətin Cari Vəziyyəti (Foto) *</Text>
                {toolPhotoBefore ? (
                  <View style={styles.photoPreviewWrap}>
                    <Image source={{ uri: toolPhotoBefore }} style={styles.photoPreview} />
                    <TouchableOpacity
                      style={styles.deletePhotoBtn}
                      onPress={() => setToolPhotoBefore('')}
                    >
                      <Trash2 size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.cameraTriggerBtn, { borderColor: '#F59E0B' }]}
                    onPress={async () => {
                      if (!permission?.granted) await requestPermission();
                      setActiveCameraTarget('tool');
                    }}
                  >
                    <Camera size={20} color="#D97706" />
                    <Text style={[styles.cameraTriggerText, { color: '#D97706' }]}>
                      Alətin cari sazlığını çək
                    </Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.inputLabel}>Alətin vəziyyəti haqqında qeyd</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Cızıq, qüsur və ya sazlıq qeydi..."
                  placeholderTextColor="#9CA3AF"
                  value={conditionNotes}
                  onChangeText={setConditionNotes}
                />
              </View>

              {/* 4. Rental Duration */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Calendar size={16} color="#4F46E5" />
                  <Text style={styles.sectionTitle}>İcarə Müddəti</Text>
                </View>

                {/* Duration Pills */}
                <View style={styles.pillRow}>
                  {[
                    { label: '+1 gün', days: 1 },
                    { label: '+3 gün', days: 3 },
                    { label: '+1 həftə', days: 7 },
                    { label: '+2 həftə', days: 14 },
                    { label: '+1 ay', days: 30 },
                  ].map((preset) => (
                    <TouchableOpacity
                      key={preset.days}
                      style={[
                        styles.pill,
                        daysCount === preset.days && styles.pillActive,
                      ]}
                      onPress={() => setDurationPreset(preset.days)}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          daysCount === preset.days && styles.pillTextActive,
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.dateBox}>
                  <Text style={styles.dateLabel}>Qaytarılma tarixi:</Text>
                  <Text style={styles.dateVal}>{dueDateStr}</Text>
                </View>
              </View>

              {/* 5. Deposit and Fees */}
              <View style={[styles.sectionCard, styles.depositCard]}>
                <View style={styles.sectionHeader}>
                  <ShieldCheck size={18} color="#059669" />
                  <Text style={[styles.sectionTitle, { color: '#065F46' }]}>
                    Girov Depoziti (Tam Məbləğ)
                  </Text>
                </View>
                <Text style={styles.depositDesc}>
                  Müştəri məhsulun tam dəyərini girov olaraq ödəyir.
                </Text>

                <View style={styles.depositInputRow}>
                  <Text style={styles.currencySymbol}>₼</Text>
                  <TextInput
                    style={styles.depositInput}
                    keyboardType="numeric"
                    value={String(depositAmount)}
                    onChangeText={(t) => setDepositAmount(Number(t) || 0)}
                  />
                </View>

                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>İcarə Haqqı (AZN)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      keyboardType="numeric"
                      value={rentalFee}
                      onChangeText={setRentalFee}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Ödəniş Üsulu</Text>
                    <View style={styles.methodSelector}>
                      {['Nağd', 'Kart'].map((m) => (
                        <TouchableOpacity
                          key={m}
                          style={[
                            styles.methodBtn,
                            paymentMethod === m && styles.methodBtnActive,
                          ]}
                          onPress={() => setPaymentMethod(m)}
                        >
                          <Text
                            style={[
                              styles.methodBtnText,
                              paymentMethod === m && styles.methodBtnTextActive,
                            ]}
                          >
                            {m}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>

            </ScrollView>
          )}

          {/* Footer Submit */}
          {!activeCameraTarget && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <KeyRound size={18} color="#fff" />
                    <Text style={styles.submitBtnText}>İCARƏYƏ VER VƏ TƏSDİQLƏ</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '94%',
    minHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#312E81',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
  },
  subTitle: {
    fontSize: 11,
    color: '#C7D2FE',
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    gap: 12,
    paddingBottom: 20,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productInfo: {
    flex: 1,
    paddingRight: 8,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  productBarcode: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#4F46E5',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  col: {
    flex: 1,
  },
  cameraTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: '#EEF2FF',
  },
  cameraTriggerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  cameraTriggerTextGray: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  photoPreviewWrap: {
    position: 'relative',
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#EF4444',
    padding: 6,
    borderRadius: 8,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  pillActive: {
    backgroundColor: '#4F46E5',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  pillTextActive: {
    color: '#fff',
  },
  dateBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    padding: 10,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4338CA',
  },
  dateVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#312E81',
  },
  depositCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  depositDesc: {
    fontSize: 11,
    color: '#065F46',
    marginBottom: 8,
  },
  depositInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
    marginRight: 6,
  },
  depositInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: '#065F46',
    paddingVertical: 8,
  },
  methodSelector: {
    flexDirection: 'row',
    gap: 6,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 9,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    alignItems: 'center',
  },
  methodBtnActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  methodBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  methodBtnTextActive: {
    color: '#fff',
  },
  footer: {
    padding: 14,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 14,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraView: {
    flex: 1,
  },
  cameraUi: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
    alignItems: 'center',
  },
  cancelCameraBtn: {
    alignSelf: 'flex-start',
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  cameraInstruction: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  shutterBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
});

