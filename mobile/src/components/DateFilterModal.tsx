import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  RotateCcw,
} from 'lucide-react-native';

export type DatePreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export interface DateFilterRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  preset: DatePreset;
}

interface DateFilterModalProps {
  visible: boolean;
  onClose: () => void;
  currentRange: DateFilterRange;
  onApply: (range: DateFilterRange) => void;
}

const MONTH_NAMES = [
  'Yanvar',
  'Fevral',
  'Mart',
  'Aprel',
  'May',
  'İyun',
  'İyul',
  'Avqust',
  'Sentyabr',
  'Oktyabr',
  'Noyabr',
  'Dekabr',
];

const WEEK_DAYS = ['B.e', 'Ç.a', 'Ç.', 'C.a', 'C.', 'Ş.', 'B.'];

export const formatYMD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getPresetRange = (preset: DatePreset): { startDate: string; endDate: string } => {
  const now = new Date();
  const todayYMD = formatYMD(now);

  switch (preset) {
    case 'today':
      return { startDate: todayYMD, endDate: todayYMD };

    case 'yesterday': {
      const yest = new Date();
      yest.setDate(yest.getDate() - 1);
      const yestYMD = formatYMD(yest);
      return { startDate: yestYMD, endDate: yestYMD };
    }

    case 'week': {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      return { startDate: formatYMD(weekAgo), endDate: todayYMD };
    }

    case 'month': {
      const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      return { startDate: startOfMonth, endDate: todayYMD };
    }

    case 'all':
    default:
      return { startDate: '', endDate: '' };
  }
};

export const formatDisplayDate = (ymd: string): string => {
  if (!ymd) return '';
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
};

export const DateFilterModal: React.FC<DateFilterModalProps> = ({
  visible,
  onClose,
  currentRange,
  onApply,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>(currentRange.preset);
  const [tempStart, setTempStart] = useState<string>(currentRange.startDate);
  const [tempEnd, setTempEnd] = useState<string>(currentRange.endDate);

  const initialDate = currentRange.startDate ? new Date(currentRange.startDate) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  useEffect(() => {
    if (visible) {
      setSelectedPreset(currentRange.preset);
      setTempStart(currentRange.startDate);
      setTempEnd(currentRange.endDate);
      const d = currentRange.startDate ? new Date(currentRange.startDate) : new Date();
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [visible, currentRange]);

  const handleSelectPreset = (preset: DatePreset) => {
    setSelectedPreset(preset);
    const { startDate, endDate } = getPresetRange(preset);
    setTempStart(startDate);
    setTempEnd(endDate);
    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  };

  const changeMonth = (delta: number) => {
    let nextMonth = viewMonth + delta;
    let nextYear = viewYear;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear--;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    }
    setViewMonth(nextMonth);
    setViewYear(nextYear);
  };

  const handleDayPress = (day: number) => {
    const clickedYMD = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedPreset('custom');

    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(clickedYMD);
      setTempEnd('');
    } else {
      // tempStart exists, tempEnd is empty
      if (clickedYMD < tempStart) {
        setTempStart(clickedYMD);
        setTempEnd('');
      } else {
        setTempEnd(clickedYMD);
      }
    }
  };

  const handleApply = () => {
    let finalStart = tempStart;
    let finalEnd = tempEnd;

    if (finalStart && !finalEnd) {
      finalEnd = finalStart;
    }

    onApply({
      startDate: finalStart,
      endDate: finalEnd,
      preset: selectedPreset,
    });
    onClose();
  };

  const handleReset = () => {
    setSelectedPreset('all');
    setTempStart('');
    setTempEnd('');
    onApply({
      startDate: '',
      endDate: '',
      preset: 'all',
    });
    onClose();
  };

  // Calendar calculations
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const todayYMD = formatYMD(new Date());

  const effectiveEnd = tempEnd || tempStart;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <CalendarIcon size={20} color="#10B981" />
              </View>
              <View>
                <Text style={styles.title}>Tarixə görə filtrlə</Text>
                <Text style={styles.subTitle}>
                  {tempStart
                    ? tempEnd && tempEnd !== tempStart
                      ? `${formatDisplayDate(tempStart)} — ${formatDisplayDate(tempEnd)}`
                      : formatDisplayDate(tempStart)
                    : 'Bütün dövr üzrə'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Presets Chips */}
            <View style={styles.presetsWrapper}>
              <Text style={styles.sectionLabel}>Tez seçimlər</Text>
              <View style={styles.presetsGrid}>
                {[
                  { id: 'all', label: 'Bütün dövr' },
                  { id: 'today', label: 'Bu gün' },
                  { id: 'yesterday', label: 'Dünən' },
                  { id: 'week', label: 'Son 7 gün' },
                  { id: 'month', label: 'Bu ay' },
                ].map((item) => {
                  const isActive = selectedPreset === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.presetChip,
                        isActive && styles.presetChipActive,
                      ]}
                      onPress={() => handleSelectPreset(item.id as DatePreset)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          isActive && styles.presetChipTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Interactive Calendar Card */}
            <View style={styles.calendarCard}>
              {/* Month Navigation */}
              <View style={styles.monthNav}>
                <TouchableOpacity
                  style={styles.navArrowBtn}
                  onPress={() => changeMonth(-1)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <ChevronLeft size={20} color="#374151" />
                </TouchableOpacity>

                <Text style={styles.monthYearText}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </Text>

                <TouchableOpacity
                  style={styles.navArrowBtn}
                  onPress={() => changeMonth(1)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <ChevronRight size={20} color="#374151" />
                </TouchableOpacity>
              </View>

              {/* Weekday Row */}
              <View style={styles.weekdaysRow}>
                {WEEK_DAYS.map((wd, i) => (
                  <Text key={i} style={styles.weekdayText}>
                    {wd}
                  </Text>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.daysGrid}>
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.dayCellEmpty} />
                ))}

                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const dayYMD = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isToday = dayYMD === todayYMD;

                  const isStart = tempStart === dayYMD;
                  const isEnd = tempEnd === dayYMD;
                  const isInRange =
                    tempStart &&
                    tempEnd &&
                    dayYMD > tempStart &&
                    dayYMD < tempEnd;

                  const isSelectedDay = isStart || isEnd;

                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayCell,
                        isInRange && styles.dayCellInRange,
                        isSelectedDay && styles.dayCellSelected,
                      ]}
                      onPress={() => handleDayPress(day)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isToday && !isSelectedDay && styles.dayTextToday,
                          isInRange && styles.dayTextInRange,
                          isSelectedDay && styles.dayTextSelected,
                        ]}
                      >
                        {day}
                      </Text>
                      {isToday && !isSelectedDay && (
                        <View style={styles.todayDot} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={handleReset}
              activeOpacity={0.8}
            >
              <RotateCcw size={15} color="#6B7280" />
              <Text style={styles.resetBtnText}>Sıfırla</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={handleApply}
              activeOpacity={0.8}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.applyBtnText}>Tətbiq et</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  subTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  presetsWrapper: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  presetChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  presetChipTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  calendarCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 16,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  navArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthYearText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  weekdayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellEmpty: {
    width: `${100 / 7}%`,
    height: 40,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginVertical: 1,
    position: 'relative',
  },
  dayCellInRange: {
    backgroundColor: '#D1FAE5',
    borderRadius: 0,
  },
  dayCellSelected: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  dayTextToday: {
    color: '#10B981',
    fontWeight: '900',
  },
  dayTextInRange: {
    color: '#065F46',
    fontWeight: '800',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  todayDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  applyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
