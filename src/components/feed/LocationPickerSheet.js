/**
 * LocationPickerSheet.js
 * Nepal city picker — bottom sheet
 * Each city carries lat/lng → used as Haversine origin in /feed
 *
 * Usage:
 *   <LocationPickerSheet
 *     visible={showPicker}
 *     onClose={() => setShowPicker(false)}
 *     onSelect={(city) => handleCitySelect(city)}
 *     selectedCity={selectedCity}
 *   />
 *
 * city object: { name: 'Kathmandu', lat: 27.7172, lng: 85.3240 }
 * Special: { name: 'My Current Location', lat: null, lng: null }
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.72;

// ════════════════════════════════════════════════════════════════════════════
// NEPAL CITIES — lat/lng for Haversine origin
// ════════════════════════════════════════════════════════════════════════════

export const NEPAL_CITIES = [
  // Bagmati Province
  { name: 'Kathmandu', lat: 27.7172, lng: 85.324, province: 'Bagmati' },
  { name: 'Lalitpur', lat: 27.6644, lng: 85.3188, province: 'Bagmati' },
  { name: 'Bhaktapur', lat: 27.671, lng: 85.4298, province: 'Bagmati' },
  { name: 'Kirtipur', lat: 27.6833, lng: 85.2833, province: 'Bagmati' },
  { name: 'Hetauda', lat: 27.4167, lng: 85.0333, province: 'Bagmati' },
  { name: 'Bharatpur', lat: 27.6833, lng: 84.4333, province: 'Bagmati' },
  { name: 'Bidur', lat: 27.9, lng: 85.15, province: 'Bagmati' },
  { name: 'Dhulikhel', lat: 27.619, lng: 85.5487, province: 'Bagmati' },
  { name: 'Banepa', lat: 27.6304, lng: 85.5226, province: 'Bagmati' },
  { name: 'Panauti', lat: 27.5833, lng: 85.5167, province: 'Bagmati' },

  // Gandaki Province
  { name: 'Pokhara', lat: 28.2096, lng: 83.9856, province: 'Gandaki' },
  { name: 'Damauli', lat: 27.9667, lng: 84.3, province: 'Gandaki' },
  { name: 'Baglung', lat: 28.2667, lng: 83.5833, province: 'Gandaki' },
  { name: 'Gorkha', lat: 28.0, lng: 84.6333, province: 'Gandaki' },
  { name: 'Besisahar', lat: 28.2333, lng: 84.3833, province: 'Gandaki' },
  { name: 'Waling', lat: 27.9974, lng: 83.783, province: 'Gandaki' },
  { name: 'Kusma', lat: 28.2333, lng: 83.6833, province: 'Gandaki' },

  // Lumbini Province
  { name: 'Butwal', lat: 27.7006, lng: 83.4532, province: 'Lumbini' },
  { name: 'Bhairahawa', lat: 27.5053, lng: 83.4524, province: 'Lumbini' },
  { name: 'Tansen', lat: 27.8667, lng: 83.55, province: 'Lumbini' },
  { name: 'Tulsipur', lat: 28.1333, lng: 82.3, province: 'Lumbini' },
  { name: 'Nepalgunj', lat: 28.05, lng: 81.6167, province: 'Lumbini' },
  { name: 'Ghorahi', lat: 28.0333, lng: 82.4833, province: 'Lumbini' },
  { name: 'Parasi', lat: 27.55, lng: 83.7333, province: 'Lumbini' },
  { name: 'Kapilvastu', lat: 27.5667, lng: 83.05, province: 'Lumbini' },
  { name: 'Tamghas', lat: 28.0833, lng: 83.2833, province: 'Lumbini' },
  { name: 'Bhalubang', lat: 27.8833, lng: 82.8, province: 'Lumbini' },
  { name: 'Sunwal', lat: 27.5833, lng: 83.6167, province: 'Lumbini' },

  // Province No. 1
  { name: 'Biratnagar', lat: 26.4833, lng: 87.2833, province: 'Koshi' },
  { name: 'Dharan', lat: 26.8167, lng: 87.2833, province: 'Koshi' },
  { name: 'Itahari', lat: 26.6667, lng: 87.2833, province: 'Koshi' },
  { name: 'Damak', lat: 26.6667, lng: 87.6833, province: 'Koshi' },
  { name: 'Birtamod', lat: 26.6333, lng: 87.9833, province: 'Koshi' },
  { name: 'Urlabari', lat: 26.6, lng: 87.4167, province: 'Koshi' },
  { name: 'Ilam', lat: 26.9167, lng: 87.9167, province: 'Koshi' },
  { name: 'Mechinagar', lat: 26.6295, lng: 88.0855, province: 'Koshi' },
  { name: 'Dhankuta', lat: 26.9833, lng: 87.35, province: 'Koshi' },
  { name: 'Inaruwa', lat: 26.6167, lng: 87.15, province: 'Koshi' },
  { name: 'Triyuga', lat: 26.75, lng: 86.7833, province: 'Koshi' },
  { name: 'Diktel', lat: 27.2167, lng: 86.7833, province: 'Koshi' },

  // Madhesh Province
  { name: 'Birgunj', lat: 27.0167, lng: 84.8667, province: 'Madhesh' },
  { name: 'Janakpur', lat: 26.7167, lng: 85.9333, province: 'Madhesh' },
  { name: 'Rajbiraj', lat: 26.5333, lng: 86.7333, province: 'Madhesh' },
  { name: 'Lahan', lat: 26.7167, lng: 86.4833, province: 'Madhesh' },
  { name: 'Kalaiya', lat: 27.0333, lng: 85.0, province: 'Madhesh' },
  { name: 'Jaleshwar', lat: 26.65, lng: 85.7833, province: 'Madhesh' },
  { name: 'Malangwa', lat: 26.86, lng: 85.56, province: 'Madhesh' },
  { name: 'Gaur', lat: 26.7667, lng: 85.2833, province: 'Madhesh' },
  { name: 'Mirchaiya', lat: 26.65, lng: 86.6167, province: 'Madhesh' },
  { name: 'Siraha', lat: 26.65, lng: 86.2, province: 'Madhesh' },
  { name: 'Bardibas', lat: 26.9667, lng: 85.9167, province: 'Madhesh' },

  // Sudurpashchim Province
  { name: 'Dhangadhi', lat: 28.7, lng: 80.5833, province: 'Sudurpashchim' },
  {
    name: 'Mahendranagar',
    lat: 28.9667,
    lng: 80.1833,
    province: 'Sudurpashchim',
  },
  { name: 'Tikapur', lat: 28.5167, lng: 81.1333, province: 'Sudurpashchim' },
  { name: 'Attariya', lat: 28.8167, lng: 80.5667, province: 'Sudurpashchim' },
  { name: 'Dipayal', lat: 29.2667, lng: 81.2, province: 'Sudurpashchim' },
  {
    name: 'Baglung (Far West)',
    lat: 29.0,
    lng: 81.0,
    province: 'Sudurpashchim',
  },
  { name: 'Bajura', lat: 29.4, lng: 81.1833, province: 'Sudurpashchim' },

  // Karnali Province
  { name: 'Birendranagar', lat: 28.5833, lng: 81.6167, province: 'Karnali' },
  { name: 'Jumla', lat: 29.2833, lng: 82.1833, province: 'Karnali' },
  { name: 'Dunai', lat: 28.95, lng: 82.8833, province: 'Karnali' },
  { name: 'Salyan', lat: 28.3667, lng: 82.15, province: 'Karnali' },
  { name: 'Dailekh', lat: 28.85, lng: 81.7167, province: 'Karnali' },
  { name: 'Rukumkot', lat: 28.6, lng: 82.6333, province: 'Karnali' },

  // Popular hill / tourist towns
  { name: 'Nagarkot', lat: 27.7167, lng: 85.5167, province: 'Bagmati' },
  { name: 'Chitwan', lat: 27.5291, lng: 84.3542, province: 'Bagmati' },
  { name: 'Lumbini (Town)', lat: 27.4833, lng: 83.2762, province: 'Lumbini' },
  { name: 'Mustang', lat: 28.9833, lng: 83.85, province: 'Gandaki' },
  { name: 'Manang', lat: 28.6667, lng: 84.0167, province: 'Gandaki' },
];

// Sort alphabetically
NEPAL_CITIES.sort((a, b) => a.name.localeCompare(b.name));

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export default function LocationPickerSheet({
  visible,
  onClose,
  onSelect,
  selectedCity = null, // { name, lat, lng } or null (= GPS)
}) {
  const [query, setQuery] = useState('');
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const inputRef = useRef(null);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : SHEET_HEIGHT,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
    if (visible) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [visible]);

  // Drag to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) slideAnim.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100 || g.vy > 0.8) onClose();
        else
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
      },
    }),
  ).current;

  // Filtered list
  const filteredCities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NEPAL_CITIES;
    return NEPAL_CITIES.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.province.toLowerCase().includes(q),
    );
  }, [query]);

  const handleSelect = useCallback(
    city => {
      onSelect(city);
      onClose();
    },
    [onSelect, onClose],
  );

  const handleGPS = useCallback(() => {
    onSelect(null); // null = use device GPS
    onClose();
  }, [onSelect, onClose]);

  const renderItem = useCallback(
    ({ item }) => {
      const isSelected = selectedCity?.name === item.name;
      return (
        <TouchableOpacity
          style={[styles.cityRow, isSelected && styles.cityRowSelected]}
          onPress={() => handleSelect(item)}
          activeOpacity={0.7}
        >
          <View style={styles.cityRowLeft}>
            <Text style={styles.cityIcon}>🏙️</Text>
            <View>
              <Text
                style={[styles.cityName, isSelected && styles.cityNameSelected]}
              >
                {item.name}
              </Text>
              <Text style={styles.cityProvince}>{item.province}</Text>
            </View>
          </View>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
      );
    },
    [selectedCity, handleSelect],
  );

  return (
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
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choose Location</Text>
          <View style={{ width: 56 }} />
        </View>

        {/* Search */}
        <View style={styles.searchWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search city or province..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        {/* GPS option — always first */}
        <TouchableOpacity
          style={[styles.gpsRow, !selectedCity && styles.cityRowSelected]}
          onPress={handleGPS}
          activeOpacity={0.7}
        >
          <View style={styles.cityRowLeft}>
            <Text style={styles.cityIcon}>📍</Text>
            <View>
              <Text
                style={[
                  styles.cityName,
                  !selectedCity && styles.cityNameSelected,
                ]}
              >
                My Current Location
              </Text>
              <Text style={styles.cityProvince}>Use GPS</Text>
            </View>
          </View>
          {!selectedCity && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Cities list */}
        <FlatList
          data={filteredCities}
          keyExtractor={item => item.name}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No cities found for "{query}"
              </Text>
            </View>
          }
        />
      </Animated.View>
    </Modal>
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
    height: SHEET_HEIGHT,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  dragArea: { paddingTop: 10, paddingBottom: 4, alignItems: 'center' },
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
    paddingVertical: 12,
  },
  cancelText: { fontSize: 15, color: '#94A3B8', fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },

  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#0F172A', paddingVertical: 0 },

  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
    marginBottom: 4,
  },

  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  cityRowSelected: { backgroundColor: '#FFF1F5' },
  cityRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cityIcon: { fontSize: 18 },
  cityName: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  cityNameSelected: { color: '#FF0059' },
  cityProvince: { fontSize: 12, color: '#94A3B8', marginTop: 1 },
  checkmark: { fontSize: 16, color: '#FF0059', fontWeight: '700' },

  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#94A3B8' },
});
