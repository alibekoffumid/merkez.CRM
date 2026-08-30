import React from 'react';
import { useTranslation } from 'react-i18next';

const WarehouseSkeleton = () => {
  const { t, i18n } = useTranslation();
  const rows = Array.from({ length: 8 });

  return (
    <div className="w-full animate-in fade-in duration-300">
      {/* Desktop Table Skeleton */}
      <table className="hidden md:table w-full text-left border-collapse">
        <thead className="sticky top-0 bg-gray-50/90 backdrop-blur-sm z-10">
          <tr className="border-b border-gray-100 text-[10px] uppercase text-gray-500 tracking-wider">
            <th className="pl-8 pr-2 py-4 w-10">
              <div className="w-5 h-5 rounded shimmer-element" />
            </th>
            <th className="font-medium px-2 py-4">{t('warehouse.thName') || 'MƏHSUL SERİYA'}</th>
            <th className="font-medium px-2 py-4">{t('warehouse.thBarcode') || 'BARKOD'}</th>
            <th className="font-medium px-2 py-4">{t('warehouse.thCategory') || 'KATEQORİYA'}</th>
            <th className="font-medium px-2 py-4">{i18n.language === 'az' ? 'TƏDARÜKÇÜ' : 'ПОСТАВЩИК'}</th>
            <th className="font-medium px-2 py-4">{t('warehouse.thPurchasePrice') || 'MAYA QİYMƏTİ'}</th>
            <th className="font-medium px-2 py-4">{t('warehouse.thPrice') || 'SATIŞ QİYMƏTİ'}</th>
            <th className="font-medium px-2 py-4">{t('warehouse.thStock') || 'STOK'}</th>
            <th className="font-medium px-2 py-4">{t('warehouse.thStatus') || 'STATUS'}</th>
            <th className="font-medium px-2 py-4 pr-6 text-right">{t('warehouse.thActions') || 'ƏMƏLİYYATLAR'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((_, idx) => (
            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
              <td className="pl-8 pr-2 py-4">
                <div className="w-5 h-5 rounded shimmer-element" />
              </td>
              <td className="px-2 py-4">
                <div className="space-y-1.5">
                  <div className="w-48 h-4 rounded-md shimmer-element" />
                  <div className="w-24 h-2.5 rounded shimmer-element opacity-60" />
                </div>
              </td>
              <td className="px-2 py-4">
                <div className="w-24 h-5 rounded-md shimmer-element" />
              </td>
              <td className="px-2 py-4">
                <div className="w-28 h-5 rounded-full shimmer-element" />
              </td>
              <td className="px-2 py-4">
                <div className="w-20 h-5 rounded-full shimmer-element" />
              </td>
              <td className="px-2 py-4">
                <div className="w-14 h-4 rounded shimmer-element" />
              </td>
              <td className="px-2 py-4">
                <div className="w-16 h-4 rounded shimmer-element font-bold" />
              </td>
              <td className="px-2 py-4">
                <div className="w-12 h-4 rounded shimmer-element" />
              </td>
              <td className="px-2 py-4">
                <div className="w-16 h-5 rounded-full shimmer-element" />
              </td>
              <td className="px-2 py-4 pr-6 text-right">
                <div className="w-6 h-6 rounded-lg shimmer-element ml-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile Card Skeleton */}
      <div className="md:hidden p-4 space-y-3">
        {rows.slice(0, 5).map((_, idx) => (
          <div key={idx} className="p-4 bg-white rounded-xl border border-gray-100 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-40 h-4 rounded shimmer-element" />
              <div className="w-14 h-5 rounded-full shimmer-element" />
            </div>
            <div className="flex items-center justify-between">
              <div className="w-28 h-3.5 rounded shimmer-element" />
              <div className="w-16 h-4 rounded shimmer-element" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WarehouseSkeleton;
