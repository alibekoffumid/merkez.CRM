import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  Package,
  Layers,
  ShoppingBag,
  Radio,
  Barcode,
  Wrench,
} from 'lucide-react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { WarehouseScreen } from './src/screens/WarehouseScreen';
import { OperationsScreen } from './src/screens/OperationsScreen';
import { POSScreen } from './src/screens/POSScreen';
import { RepairsScreen } from './src/screens/RepairsScreen';
import { PCGunScreen } from './src/screens/PCGunScreen';
import { ScannerModal, ScannerMode } from './src/components/ScannerModal';
import { StaffPinGuardModal } from './src/components/StaffPinGuardModal';
import { Product, POSCartItem } from './src/types';
import { productService } from './src/services/productService';
import { scannerSyncService } from './src/services/scannerSyncService';

type Tab = 'warehouse' | 'operations' | 'pos' | 'repairs' | 'pcgun';

// Main Application entry point

function MainApp() {
  const { session, loading, currentStaff, permissions, isStaffLocked } = useAuth();
  const [currentTab, setCurrentTab] = useState<Tab>('warehouse');
  const [loadedTabs, setLoadedTabs] = useState<Set<Tab>>(new Set(['warehouse']));
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannerMode, setScannerMode] = useState<ScannerMode>('terminal');

  const handleTabPress = (tab: Tab) => {
    setLoadedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
    setCurrentTab(tab);
  };

  // Switch default tab if Master
  React.useEffect(() => {
    if (permissions.isMaster) {
      handleTabPress('repairs');
    } else if (permissions.isCashier && currentTab === 'operations') {
      handleTabPress('pos');
    }
  }, [permissions.isMaster, permissions.isCashier]);

  // Global POS Cart
  const [cart, setCart] = useState<POSCartItem[]>([]);

  // Pass scanned barcode to warehouse screen
  const [externalBarcode, setExternalBarcode] = useState<string | null>(null);
  const [lastBeamedBarcode, setLastBeamedBarcode] = useState<string | null>(null);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Merkez sistemi yüklənir...</Text>
      </View>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  const handleOpenScanner = (mode: ScannerMode = 'terminal') => {
    setScannerMode(mode);
    setScannerVisible(true);
  };

  const handleScanResult = async (barcode: string, mode: ScannerMode) => {
    if (mode === 'gun') {
      // Beam straight to PC
      setLastBeamedBarcode(barcode);
      await scannerSyncService.beamBarcodeToPC('merkez-pc-1', barcode);
    } else if (mode === 'pos') {
      // Lookup product and add to cart
      const prod = await productService.lookupByBarcode(barcode);
      if (prod) {
        addToCart(prod);
      } else {
        Alert.alert('Məhsul tapılmadı', `${barcode} barkodu bazada qeydiyyatda deyil`);
      }
    } else if (mode === 'stocktake') {
      // Count stocktake
      const prod = await productService.lookupByBarcode(barcode);
      if (prod) {
        await productService.updateStock(prod.id, (prod.stock_quantity || 0) + 1);
      }
    } else {
      // Terminal: pass barcode to warehouse screen to open product details
      setExternalBarcode(barcode);
      handleTabPress('warehouse');
    }
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx].quantity += 1;
        return next;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as POSCartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const updateItemPrice = (
    productId: string,
    customPrice?: number,
    discount?: number,
    discountType?: 'percent' | 'fixed'
  ) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, customPrice, discount, discountType }
          : item
      )
    );
  };

  const totalCartCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Screen Views - Preserved in memory once loaded for instant 0ms tab switching */}
      <View style={styles.screenArea}>
        {loadedTabs.has('warehouse') && (
          <View style={[styles.screenTab, currentTab !== 'warehouse' && styles.screenHidden]}>
            <WarehouseScreen
              onOpenScanner={handleOpenScanner}
              onAddToCart={addToCart}
              externalScannedBarcode={externalBarcode}
              onClearScannedBarcode={() => setExternalBarcode(null)}
            />
          </View>
        )}

        {loadedTabs.has('operations') && (
          <View style={[styles.screenTab, currentTab !== 'operations' && styles.screenHidden]}>
            <OperationsScreen />
          </View>
        )}

        {loadedTabs.has('pos') && (
          <View style={[styles.screenTab, currentTab !== 'pos' && styles.screenHidden]}>
            <POSScreen
              cart={cart}
              onUpdateQuantity={updateCartQuantity}
              onRemoveItem={removeFromCart}
              onClearCart={() => setCart([])}
              onOpenScanner={handleOpenScanner}
              onUpdateItemPrice={updateItemPrice}
            />
          </View>
        )}

        {loadedTabs.has('repairs') && (
          <View style={[styles.screenTab, currentTab !== 'repairs' && styles.screenHidden]}>
            <RepairsScreen />
          </View>
        )}

        {loadedTabs.has('pcgun') && (
          <View style={[styles.screenTab, currentTab !== 'pcgun' && styles.screenHidden]}>
            <PCGunScreen
              onOpenScanner={handleOpenScanner}
              lastBeamedBarcode={lastBeamedBarcode}
            />
          </View>
        )}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        {/* If Master: Show Repairs */}
        {permissions.isMaster ? (
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => handleTabPress('repairs')}
          >
            <Wrench
              size={22}
              color={currentTab === 'repairs' ? '#10B981' : '#9CA3AF'}
            />
            <Text
              style={[
                styles.navLabel,
                currentTab === 'repairs' && styles.navLabelActive,
              ]}
            >
              Təmir
            </Text>
          </TouchableOpacity>
        ) : (
          /* Tab 1: Warehouse */
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => handleTabPress('warehouse')}
          >
            <Package
              size={22}
              color={currentTab === 'warehouse' ? '#10B981' : '#9CA3AF'}
            />
            <Text
              style={[
                styles.navLabel,
                currentTab === 'warehouse' && styles.navLabelActive,
              ]}
            >
              Anbar
            </Text>
          </TouchableOpacity>
        )}

        {/* Tab 2: Operations (Tarixçə) - Hidden for Cashier and Master */}
        {!permissions.isCashier && !permissions.isMaster && (
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => handleTabPress('operations')}
          >
            <Layers
              size={22}
              color={currentTab === 'operations' ? '#10B981' : '#9CA3AF'}
            />
            <Text
              style={[
                styles.navLabel,
                currentTab === 'operations' && styles.navLabelActive,
              ]}
            >
              Tarixçə
            </Text>
          </TouchableOpacity>
        )}

        {/* Tab 3: POS (Kassa) - Hidden for Master */}
        {!permissions.isMaster && (
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => handleTabPress('pos')}
          >
            <View>
              <ShoppingBag
                size={22}
                color={currentTab === 'pos' ? '#10B981' : '#9CA3AF'}
              />
              {totalCartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{totalCartCount}</Text>
                </View>
              )}
            </View>
            <Text
              style={[styles.navLabel, currentTab === 'pos' && styles.navLabelActive]}
            >
              Kassa
            </Text>
          </TouchableOpacity>
        )}

        {/* Tab 4: Repairs */}
        {!permissions.isMaster && (
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => handleTabPress('repairs')}
          >
            <Wrench
              size={22}
              color={currentTab === 'repairs' ? '#10B981' : '#9CA3AF'}
            />
            <Text
              style={[
                styles.navLabel,
                currentTab === 'repairs' && styles.navLabelActive,
              ]}
            >
              Təmir
            </Text>
          </TouchableOpacity>
        )}

        {/* Tab 5: Wireless PC Gun */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => handleTabPress('pcgun')}
        >
          <Radio
            size={22}
            color={currentTab === 'pcgun' ? '#10B981' : '#9CA3AF'}
          />
          <Text
            style={[
              styles.navLabel,
              currentTab === 'pcgun' && styles.navLabelActive,
            ]}
          >
            PC Skaner
          </Text>
        </TouchableOpacity>
      </View>

      {/* Floating Scanner Action Button (Right Edge above bottom menu) - hidden on POS screen */}
      {currentTab !== 'pos' && (
        <TouchableOpacity
          style={styles.floatingScannerFab}
          onPress={() => handleOpenScanner(permissions.isCashier ? 'pos' : 'terminal')}
          activeOpacity={0.85}
        >
          <Barcode size={26} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Camera Barcode Scanner Modal */}
      <ScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleScanResult}
        initialMode={scannerMode}
        pcConnected={true}
      />

      {/* Staff Role PIN Guard Modal */}
      <StaffPinGuardModal
        visible={isStaffLocked}
        canCancel={!!currentStaff}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  screenArea: {
    flex: 1,
  },
  screenTab: {
    flex: 1,
  },
  screenHidden: {
    display: 'none',
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    height: Platform.OS === 'ios' ? 76 : 64,
    paddingBottom: Platform.OS === 'ios' ? 16 : 6,
    paddingTop: 6,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  navLabelActive: {
    color: '#10B981',
  },
  floatingScannerFab: {
    position: 'absolute',
    right: 18,
    bottom: Platform.OS === 'ios' ? 96 : 82,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
});
