import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Barcode, AlertTriangle, ArrowDownRight, ArrowUpRight, Plus, ShoppingCart } from 'lucide-react-native';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onReceive?: () => void;
  onDispatch?: () => void;
  onAddToCart?: () => void;
  canViewCostPrices?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  onPress,
  onReceive,
  onDispatch,
  onAddToCart,
  canViewCostPrices = true,
}) => {
  const isCritical =
    Number(product.stock_quantity || 0) <=
    (product.critical_stock && product.critical_stock > 0 ? product.critical_stock : 5);
  const isOutOfStock = product.stock_quantity <= 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.mainRow}>
        <View style={styles.infoCol}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>

          {/* Badges row */}
          <View style={styles.badgesRow}>
            {product.barcode ? (
              <View style={styles.barcodeBadge}>
                <Barcode size={12} color="#6B7280" />
                <Text style={styles.barcodeText}>{product.barcode}</Text>
              </View>
            ) : product.article_number ? (
              <View style={styles.barcodeBadge}>
                <Text style={styles.barcodeText}>Art: {product.article_number}</Text>
              </View>
            ) : null}

            {product.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{product.category}</Text>
              </View>
            )}

            {product.supplier_name ? (
              <View style={styles.supplierBadge}>
                <Text style={styles.supplierText} numberOfLines={1}>
                  {product.supplier_name}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Stock badge */}
        <View style={styles.stockCol}>
          <View
            style={[
              styles.stockBadge,
              isOutOfStock
                ? styles.stockOut
                : isCritical
                ? styles.stockCritical
                : styles.stockGood,
            ]}
          >
            {isCritical && <AlertTriangle size={12} color={isOutOfStock ? '#EF4444' : '#F59E0B'} />}
            <Text
              style={[
                styles.stockNumber,
                isOutOfStock
                  ? styles.stockTextOut
                  : isCritical
                  ? styles.stockTextCritical
                  : styles.stockTextGood,
              ]}
            >
              {product.stock_quantity}
            </Text>
            <Text style={styles.stockUnit}>{product.unit || 'əd.'}</Text>
          </View>
        </View>
      </View>

      {/* Footer: Admin vs Non-admin layout */}
      {canViewCostPrices ? (
        <View style={styles.footerCol}>
          {/* Prices Row: Satış, Maya, Zavod */}
          <View style={styles.pricesRow}>
            <Text style={styles.salePrice}>
              {Number(product.sale_price || product.price || 0).toFixed(2)} ₼
            </Text>

            {product.purchase_price !== undefined && product.purchase_price > 0 && (
              <View style={styles.pricePill}>
                <Text style={styles.priceLabel}>Maya:</Text>
                <Text style={styles.purchasePrice}>
                  {Number(product.purchase_price).toFixed(2)} ₼
                </Text>
              </View>
            )}

            {product.factory_price ? (
              <View style={[styles.pricePill, styles.pricePillIndigo]}>
                <Text style={[styles.priceLabel, styles.priceLabelIndigo]}>Zavod:</Text>
                <Text style={styles.factoryPrice}>
                  {product.factory_price}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionsContainer}>
            {onReceive && (
              <TouchableOpacity style={styles.actionBtnGreen} onPress={onReceive}>
                <ArrowDownRight size={14} color="#10B981" />
                <Text style={styles.actionBtnTextGreen}>Qəbul</Text>
              </TouchableOpacity>
            )}
            {onDispatch && (
              <TouchableOpacity style={styles.actionBtnRed} onPress={onDispatch}>
                <ArrowUpRight size={14} color="#EF4444" />
                <Text style={styles.actionBtnTextRed}>Silinmə</Text>
              </TouchableOpacity>
            )}
            {onAddToCart && (
              <TouchableOpacity style={styles.actionBtnCart} onPress={onAddToCart}>
                <ShoppingCart size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        /* Staff / Non-admin layout: Price on left, Cart button on right on same line */
        <View style={styles.staffFooterRow}>
          <Text style={styles.salePrice}>
            {Number(product.sale_price || product.price || 0).toFixed(2)} ₼
          </Text>

          {onAddToCart && (
            <TouchableOpacity
              style={styles.staffCartBtn}
              onPress={onAddToCart}
              activeOpacity={0.8}
            >
              <ShoppingCart size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoCol: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 22,
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  barcodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  barcodeText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '600',
  },
  supplierBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    maxWidth: 130,
  },
  supplierText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  stockCol: {
    alignItems: 'flex-end',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stockGood: {
    backgroundColor: '#ECFDF5',
  },
  stockCritical: {
    backgroundColor: '#FFFBEB',
  },
  stockOut: {
    backgroundColor: '#FEF2F2',
  },
  stockNumber: {
    fontSize: 16,
    fontWeight: '800',
  },
  stockTextGood: {
    color: '#059669',
  },
  stockTextCritical: {
    color: '#D97706',
  },
  stockTextOut: {
    color: '#DC2626',
  },
  stockUnit: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  footerCol: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 10,
  },
  pricesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  salePrice: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
    marginRight: 4,
  },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pricePillIndigo: {
    backgroundColor: '#EEF2FF',
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  priceLabelIndigo: {
    color: '#4F46E5',
  },
  purchasePrice: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '700',
  },
  factoryPrice: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '700',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnGreen: {
    flex: 1,
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
  actionBtnTextGreen: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnRed: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  actionBtnTextRed: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnCart: {
    backgroundColor: '#10B981',
    width: 38,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  staffCartBtn: {
    backgroundColor: '#10B981',
    width: 44,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
});
