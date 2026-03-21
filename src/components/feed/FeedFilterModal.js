/**
 * FeedFilterModal.js — with City Picker integrated
 *
 * Location row:
 * - Tap → LocationPickerSheet opens
 * - Select city → city lat/lng stored as selectedCity
 * - Select GPS → selectedCity = null (use device location)
 * - onApply sends customLat/customLng when city selected
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import Slider from '@react-native-community/slider';
import LocationPickerSheet from './LocationPickerSheet';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.88;

const GOALS = [
  { key: 'Long-term Parter', label: 'Long-term Partner', emoji: '💑' },
  { key: 'Short-term Fun', label: 'Short-term Fun', emoji: '🥂' },
  { key: 'Making new Friends', label: 'Making new Friends', emoji: '🤝' },
  { key: 'Still Figuring Out', label: 'Still Figuring Out', emoji: '🤔' },
];

const SHOW_ME_OPTIONS = ['Women', 'Men', 'Everyone'];

const SectionLabel = ({ label }) => (
  <View style={styles.sectionLabelRow}>
    <Text style={styles.sectionLabel}>{label}</Text>
  </View>
);

const Divider = () => <View style={styles.divider} />;

export default function FeedFilterModal({
  visible,
  onClose,
  onApply,
  initialFilters = {},
  currentCity = '', // GPS city name (from LocationContext)
}) {
  const [ageRange, setAgeRange] = useState([
    initialFilters.ageMin ?? 18,
    initialFilters.ageMax ?? 50,
  ]);
  const [distance, setDistance] = useState(initialFilters.distance ?? 100);
  const [expandSearch, setExpandSearch] = useState(
    initialFilters.expandSearch ?? true,
  );
  const [showMe, setShowMe] = useState(initialFilters.showMe ?? 'Women');
  const [goals, setGoals] = useState(initialFilters.goals ?? []);
  const [verifiedOnly, setVerifiedOnly] = useState(
    initialFilters.verifiedOnly ?? false,
  );

  // ── Selected city: null = use GPS, { name, lat, lng } = custom ──
  const [selectedCity, setSelectedCity] = useState(
    initialFilters.selectedCity ?? null,
  );
  const [showCityPicker, setShowCityPicker] = useState(false);

  // Sync when modal opens
  useEffect(() => {
    if (!visible) return;
    setAgeRange([initialFilters.ageMin ?? 18, initialFilters.ageMax ?? 50]);
    setDistance(initialFilters.distance ?? 100);
    setExpandSearch(initialFilters.expandSearch ?? true);
    setShowMe(initialFilters.showMe ?? 'Women');
    setGoals(initialFilters.goals ?? []);
    setVerifiedOnly(initialFilters.verifiedOnly ?? false);
    setSelectedCity(initialFilters.selectedCity ?? null);
  }, [visible]); // eslint-disable-line

  // Slide-up animation
  const slideAnim = useRef(new Animated.Value(MODAL_HEIGHT)).current;
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : MODAL_HEIGHT,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [visible]);

  // Drag to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) slideAnim.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 || g.vy > 0.8) onClose();
        else
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
      },
    }),
  ).current;

  const toggleGoal = useCallback(key => {
    setGoals(prev =>
      prev.includes(key) ? prev.filter(g => g !== key) : [...prev, key],
    );
  }, []);

  const cycleShowMe = useCallback(() => {
    setShowMe(
      prev =>
        SHOW_ME_OPTIONS[
          (SHOW_ME_OPTIONS.indexOf(prev) + 1) % SHOW_ME_OPTIONS.length
        ],
    );
  }, []);

  // ✅ Apply — send customLat/customLng when city manually selected
  const handleApply = useCallback(() => {
    onApply({
      ageMin: ageRange[0],
      ageMax: ageRange[1],
      distance,
      expandSearch,
      showMe,
      goals,
      verifiedOnly,
      selectedCity, // { name, lat, lng } | null
      customLat: selectedCity?.lat ?? null,
      customLng: selectedCity?.lng ?? null,
    });
    onClose();
  }, [
    ageRange,
    distance,
    expandSearch,
    showMe,
    goals,
    verifiedOnly,
    selectedCity,
    onApply,
    onClose,
  ]);

  // Display label for location row
  const locationLabel = selectedCity
    ? selectedCity.name
    : 'My Current Location';
  const locationSub = selectedCity
    ? selectedCity.province
    : currentCity || 'GPS';

  const ageLabel = `${ageRange[0]} - ${
    ageRange[1] >= 50 ? '50+' : ageRange[1]
  }`;
  const distanceLabel = distance >= 100 ? '100km+' : `${distance}km`;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          {/* Drag handle */}
          <View {...panResponder.panHandlers} style={styles.dragArea}>
            <View style={styles.dragHandle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.headerBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.headerClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Show me</Text>
            <TouchableOpacity
              onPress={handleApply}
              style={styles.headerBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.headerOK}>OK</Text>
            </TouchableOpacity>
          </View>

          <Divider />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* ── LOCATION — tappable, opens city picker ── */}
            <TouchableOpacity
              style={styles.row}
              onPress={() => setShowCityPicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.rowLabel}>Location</Text>
              <View style={styles.rowRight}>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={[
                      styles.rowValuePrimary,
                      selectedCity && styles.rowValueCity,
                    ]}
                  >
                    {locationLabel}
                  </Text>
                  <Text style={styles.rowValueSub}>{locationSub}</Text>
                </View>
                <Text style={styles.rowChevron}>›</Text>
              </View>
            </TouchableOpacity>

            {/* Distance hint under location */}
            <View style={styles.distanceHint}>
              <Text style={styles.distanceHintText}>
                📍 Showing profiles within {distanceLabel} of {locationLabel}
              </Text>
            </View>

            <Divider />

            {/* ── AGE ── */}
            <View style={styles.sliderSection}>
              <View style={styles.sliderHeader}>
                <Text style={styles.rowLabel}>Age</Text>
                <Text style={styles.sliderValue}>{ageLabel}</Text>
              </View>
              <MultiSlider
                values={ageRange}
                min={18}
                max={50}
                step={1}
                sliderLength={SCREEN_WIDTH - 48}
                onValuesChange={vals => setAgeRange(vals)}
                selectedStyle={styles.sliderSelected}
                unselectedStyle={styles.sliderUnselected}
                markerStyle={styles.sliderThumb}
                pressedMarkerStyle={styles.sliderThumbPressed}
                containerStyle={{ paddingTop: 6 }}
                trackStyle={{ height: 4, borderRadius: 2 }}
              />
            </View>

            <Divider />

            {/* ── DISTANCE ── */}
            <View style={styles.sliderSection}>
              <View style={styles.sliderHeader}>
                <Text style={styles.rowLabel}>Distance</Text>
                <Text style={styles.sliderValue}>{distanceLabel}</Text>
              </View>
              <Slider
                style={{ width: SCREEN_WIDTH - 48, height: 40, marginLeft: -4 }}
                minimumValue={1}
                maximumValue={100}
                step={1}
                value={distance}
                onValueChange={val => setDistance(Math.round(val))}
                minimumTrackTintColor="#FF0059"
                maximumTrackTintColor="#E2E8F0"
                thumbTintColor={
                  Platform.OS === 'android' ? '#FF0059' : undefined
                }
              />
            </View>

            <Divider />

            {/* ── EXPAND SEARCH ── */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Expand Search Area</Text>
                <Text style={styles.rowSubtext}>
                  Automatically expand search radius
                </Text>
              </View>
              <Switch
                value={expandSearch}
                onValueChange={setExpandSearch}
                trackColor={{ false: '#E2E8F0', true: '#FF0059' }}
                thumbColor="#fff"
                ios_backgroundColor="#E2E8F0"
              />
            </View>

            <Divider />

            {/* ── SHOW ME ── */}
            <TouchableOpacity
              style={styles.row}
              onPress={cycleShowMe}
              activeOpacity={0.7}
            >
              <Text style={styles.rowLabel}>Show Me</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowValuePrimary}>{showMe}</Text>
                <Text style={styles.rowChevron}>›</Text>
              </View>
            </TouchableOpacity>

            <Divider />

            {/* ── ADVANCED FILTERS ── */}
            <SectionLabel label="Advanced Filters" />

            <View style={styles.advancedSection}>
              <Text style={styles.advancedLabel}>Relationship Goals</Text>
              <View style={styles.goalsGrid}>
                {GOALS.map(g => {
                  const active = goals.includes(g.key);
                  return (
                    <TouchableOpacity
                      key={g.key}
                      style={[styles.goalCard, active && styles.goalCardActive]}
                      onPress={() => toggleGoal(g.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.goalEmoji}>{g.emoji}</Text>
                      <Text
                        style={[
                          styles.goalLabel,
                          active && styles.goalLabelActive,
                        ]}
                      >
                        {g.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── VERIFIED ONLY ── */}
            <View style={[styles.row, { marginTop: 4 }]}>
              <Text style={styles.rowLabel}>Verified profiles only</Text>
              <Switch
                value={verifiedOnly}
                onValueChange={setVerifiedOnly}
                trackColor={{ false: '#E2E8F0', true: '#FF0059' }}
                thumbColor="#fff"
                ios_backgroundColor="#E2E8F0"
              />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </Modal>

      {/* ✅ City Picker — rendered outside main modal to avoid z-index issues */}
      <LocationPickerSheet
        visible={showCityPicker}
        onClose={() => setShowCityPicker(false)}
        onSelect={city => setSelectedCity(city)}
        selectedCity={selectedCity}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: MODAL_HEIGHT,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  dragArea: { paddingTop: 10, paddingBottom: 6, alignItems: 'center' },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerBtn: { minWidth: 40 },
  headerClose: { fontSize: 16, color: '#64748B', fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  headerOK: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF0059',
    textAlign: 'right',
  },

  divider: { height: 1, backgroundColor: '#F1F5F9' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  rowLabel: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  rowSubtext: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowValuePrimary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'right',
  },
  rowValueCity: { color: '#FF0059' }, // ← highlight when city manually selected
  rowValueSub: { fontSize: 12, color: '#94A3B8', textAlign: 'right' },
  rowChevron: { fontSize: 20, color: '#CBD5E1', marginLeft: 2, marginTop: -1 },

  distanceHint: { paddingHorizontal: 24, marginTop: -8, marginBottom: 10 },
  distanceHintText: { fontSize: 12, color: '#94A3B8' },

  sliderSection: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 10 },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sliderValue: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  sliderSelected: { backgroundColor: '#FF0059' },
  sliderUnselected: { backgroundColor: '#E2E8F0' },
  sliderThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderThumbPressed: { width: 32, height: 32, borderRadius: 16 },

  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  advancedSection: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 16 },
  advancedLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 14,
  },
  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  goalCard: {
    width: (SCREEN_WIDTH - 48 - 10) / 2,
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    gap: 8,
  },
  goalCardActive: { borderColor: '#FF0059', backgroundColor: '#FFF1F5' },
  goalEmoji: { fontSize: 26 },
  goalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  goalLabelActive: { color: '#FF0059' },
});
