import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  StatusBar,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../AuthContex';
import Config from 'react-native-config';
import FeedFilterModal from '../src/components/feed/FeedFilterModal';
import LocationPickerSheet from '../src/components/feed/LocationPickerSheet';

const API = Config.API_BASE_URL || 'http://192.168.100.154:9000';

const SectionHeader = ({ title, badge }) => (
  <View style={ss.sectionHeader}>
    <Text style={ss.sectionTitle}>{title}</Text>
    {badge && (
      <View style={ss.vipBadge}>
        <Text style={ss.vipTxt}>{badge}</Text>
      </View>
    )}
  </View>
);

const SettingRow = ({ ico, title, sub, onPress, right }) => (
  <TouchableOpacity style={ss.row} onPress={onPress} activeOpacity={0.7}>
    {ico && (
      <View style={ss.rowIco}>
        <Text style={{ fontSize: 18 }}>{ico}</Text>
      </View>
    )}
    <View style={ss.rowInfo}>
      <Text style={ss.rowTitle}>{title}</Text>
      {sub && <Text style={ss.rowSub}>{sub}</Text>}
    </View>
    {right || <Text style={ss.rowChevron}>›</Text>}
  </TouchableOpacity>
);

export default function SettingsScreen({ navigation }) {
  const { token, userId, setToken, setUserId } = useContext(AuthContext);
  const [filters, setFilters] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [hideLast, setHideLast] = useState(false);
  const [currentCity, setCurrentCity] = useState('');

  const fetchFilters = useCallback(async () => {
    try {
      const resp = await axios.get(`${API}/filter-preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.data.success) {
        setFilters(resp.data.filters);
        setCurrentCity(resp.data.city || '');
      }
    } catch (e) {
      console.error('[Settings] fetchFilters:', e.message);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchFilters();
    }, [fetchFilters]),
  );

  // SettingsScreen.js — handleFilterApply mein navigate add karo
  const handleFilterApply = useCallback(
    async newFilters => {
      try {
        const payload = {
          ageRange: newFilters.ageRange ?? [
            newFilters.ageMin ?? 18,
            newFilters.ageMax ?? 50,
          ],
          distance: newFilters.distance,
          expandSearch: newFilters.expandSearch,
          showMe: newFilters.showMe,
          goals: newFilters.goals,
          verifiedOnly: newFilters.verifiedOnly,
          selectedCity: newFilters.selectedCity,
          customLat: newFilters.customLat,
          customLng: newFilters.customLng,
        };

        await axios.patch(`${API}/filter-preferences`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setFilters(prev => ({
          ...prev,
          ageMin: payload.ageRange[0],
          ageMax: payload.ageRange[1],
          distance: payload.distance ?? prev.distance,
          expandSearch: payload.expandSearch ?? prev.expandSearch,
          showMe: payload.showMe ?? prev.showMe,
          verifiedOnly: payload.verifiedOnly ?? prev.verifiedOnly,
          selectedCity: payload.selectedCity ?? prev.selectedCity,
        }));

        DeviceEventEmitter.emit('filter_updated');

        // ← Navigate to Home tab instantly
        navigation.navigate('Tabs', { screen: 'Home' });
      } catch (e) {
        console.error('[Settings] handleFilterApply:', e.message);
      }
    },
    [token, navigation],
  );

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.post(
              `${API}/auth/signout`,
              {},
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
          } catch (e) {
            console.warn('[Settings] signout API:', e.message);
          } finally {
            // Clear auth context
            setToken?.(null);
            setUserId?.(null);
            navigation.reset({ index: 0, routes: [{ name: 'SignIn' }] });
          }
        },
      },
    ]);
  }, [token, navigation, setToken, setUserId]);

  const handleToggle = useCallback(
    async (key, value) => {
      const updated = { ...filters, [key]: value };
      setFilters(updated); // instant local update

      const payload = {
        ageRange: [updated.ageMin ?? 18, updated.ageMax ?? 50],
        distance: updated.distance,
        expandSearch: updated.expandSearch,
        showMe: updated.showMe,
        goals: updated.goals,
        verifiedOnly: updated.verifiedOnly,
        selectedCity: updated.selectedCity,
        customLat: updated.customLat,
        customLng: updated.customLng,
      };

      await axios
        .patch(`${API}/filter-preferences`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(e => console.error('[Settings] toggle:', e.message));

      DeviceEventEmitter.emit('filter_updated');
      // ← navigate NAHI karo toggle pe, sirf FeedFilterModal OK pe navigate karo
    },
    [filters, token],
  );

  // Discovery filter summary
  const distLabel =
    filters?.distance >= 100 ? '100km+' : `${filters?.distance || 100}km`;
  const ageLabel = `${filters?.ageMin || 18} - ${
    (filters?.ageMax || 50) >= 50 ? '50+' : filters?.ageMax
  }`;
  const locLabel = filters?.selectedCity?.name || currentCity || 'My Location';

  return (
    <SafeAreaView style={ss.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F0EB" />

      {/* Header */}
      <View style={ss.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={ss.backIco}>←</Text>
        </TouchableOpacity>
        <Text style={ss.headerTitle}>Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={ss.scroll}
      >
        {/* ── Discovery Settings ─────────────────────────────────── */}
        <SectionHeader title="Discovery Settings" />

        <View style={ss.card}>
          <TouchableOpacity
            style={ss.row}
            onPress={() => setShowFilter(true)}
            activeOpacity={0.7}
          >
            <View style={ss.rowInfo}>
              <Text style={ss.rowTitle}>Location</Text>
              <Text style={ss.rowSub}>{locLabel}</Text>
            </View>
            <Text style={[ss.rowValue, { color: '#B90034' }]}>
              {filters?.selectedCity ? 'Custom' : 'GPS'}
            </Text>
            <Text style={ss.rowChevron}>›</Text>
          </TouchableOpacity>

          <View style={ss.rowDiv} />

          <TouchableOpacity
            style={ss.row}
            onPress={() => setShowFilter(true)}
            activeOpacity={0.7}
          >
            <View style={ss.rowInfo}>
              <Text style={ss.rowTitle}>Distance</Text>
            </View>
            <Text style={[ss.rowValue, { color: '#B90034' }]}>{distLabel}</Text>
            <Text style={ss.rowChevron}>›</Text>
          </TouchableOpacity>

          <View style={ss.rowDiv} />

          <View style={ss.row}>
            <View style={ss.rowInfo}>
              <Text style={ss.rowTitle}>Expand Search Area</Text>
              <Text style={ss.rowSub}>Automatically expand search radius</Text>
            </View>
            <Switch
              value={filters?.expandSearch ?? true}
              onValueChange={v => handleToggle('expandSearch', v)}
              trackColor={{ false: '#E2E8F0', true: '#B90034' }}
              thumbColor="#fff"
            />
          </View>

          <View style={ss.rowDiv} />

          <TouchableOpacity
            style={ss.row}
            onPress={() => setShowFilter(true)}
            activeOpacity={0.7}
          >
            <View style={ss.rowInfo}>
              <Text style={ss.rowTitle}>Show Me</Text>
            </View>
            <Text style={[ss.rowValue, { color: '#B90034' }]}>
              {filters?.showMe || 'Everyone'}
            </Text>
            <Text style={ss.rowChevron}>›</Text>
          </TouchableOpacity>

          <View style={ss.rowDiv} />

          <TouchableOpacity
            style={ss.row}
            onPress={() => setShowFilter(true)}
            activeOpacity={0.7}
          >
            <View style={ss.rowInfo}>
              <Text style={ss.rowTitle}>Age</Text>
            </View>
            <Text style={[ss.rowValue, { color: '#B90034' }]}>{ageLabel}</Text>
            <Text style={ss.rowChevron}>›</Text>
          </TouchableOpacity>

          <View style={ss.rowDiv} />

          <TouchableOpacity
            style={ss.row}
            onPress={() => setShowFilter(true)}
            activeOpacity={0.7}
          >
            <View style={ss.rowInfo}>
              <Text style={ss.rowTitle}>I'm Looking For</Text>
            </View>
            <Text style={ss.rowChevron}>›</Text>
          </TouchableOpacity>

          <View style={ss.rowDiv} />

          <View style={ss.row}>
            <View style={ss.rowInfo}>
              <Text style={ss.rowTitle}>Verified profiles only</Text>
            </View>
            <Switch
              value={filters?.verifiedOnly ?? false}
              onValueChange={v => handleToggle('verifiedOnly', v)}
              trackColor={{ false: '#E2E8F0', true: '#B90034' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ── Privacy Settings ───────────────────────────────────── */}
        <SectionHeader title="Privacy Settings" badge="VIP" />

        <View style={ss.card}>
          <View style={ss.row}>
            <View style={ss.rowInfo}>
              <Text style={ss.rowTitle}>Hide Last Seen</Text>
              <Text style={ss.rowSub}>People can't see when you're online</Text>
            </View>
            <Switch
              value={hideLast}
              onValueChange={setHideLast}
              trackColor={{ false: '#E2E8F0', true: '#B90034' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ── App Settings ───────────────────────────────────────── */}
        <SectionHeader title="App Settings" />

        <View style={ss.card}>
          <SettingRow
            ico="👤"
            title="Personal Information"
            sub="Edit your name and profile info"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <View style={ss.rowDiv} />
          <SettingRow
            ico="🔒"
            title="Privacy & Permission"
            sub="Contacts and My Album"
            onPress={() => {}}
          />
          <View style={ss.rowDiv} />
          <SettingRow
            ico="🔔"
            title="Notification & Chat"
            sub="Chat and notification settings"
            onPress={() => {}}
          />
          <View style={ss.rowDiv} />
          <SettingRow
            ico="💾"
            title="Data & Storage"
            sub="Data preferences and storage settings"
            onPress={() => {}}
          />
          <View style={ss.rowDiv} />
          <SettingRow
            ico="🛡️"
            title="Account & Security"
            sub="Linked Account Management"
            onPress={() => {}}
          />
        </View>

        {/* ── Other ─────────────────────────────────────────────── */}
        <View style={[ss.card, { marginTop: 12 }]}>
          <SettingRow
            ico="📢"
            title="Feedback"
            sub="Let us know your experience"
            onPress={() => {}}
          />
          <View style={ss.rowDiv} />
          <SettingRow ico="❓" title="Help" onPress={() => {}} />
          <View style={ss.rowDiv} />
          <SettingRow
            ico="🔗"
            title="Share Flame"
            sub="Invite your friends"
            onPress={() => {}}
          />
          <View style={ss.rowDiv} />
          <SettingRow
            ico="ℹ️"
            title="About Flame"
            sub="More information about Flame"
            onPress={() => {}}
          />
        </View>

        {/* ── Sign Out ───────────────────────────────────────────── */}
        <TouchableOpacity
          style={ss.signOutBtn}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Text style={ss.signOutTxt}>SIGN OUT</Text>
        </TouchableOpacity>

        <Text style={ss.version}>Flame v1.0.0</Text>
      </ScrollView>

      {/* Filter modal */}
      {filters && (
        <FeedFilterModal
          visible={showFilter}
          onClose={() => setShowFilter(false)}
          onApply={handleFilterApply}
          initialFilters={{
            ...filters,
            // ageRange array bhi pass karo — modal dono formats handle kar leta hai
            ageRange: [filters.ageMin ?? 18, filters.ageMax ?? 50],
          }}
          currentCity={currentCity}
        />
      )}
    </SafeAreaView>
  );
}

const ss = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0EB' },
  scroll: { paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backIco: { fontSize: 20, color: '#1A1A1A' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B90034',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vipBadge: {
    backgroundColor: '#FCD34D',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  vipTxt: { fontSize: 10, fontWeight: '800', color: '#92400E' },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowIco: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '500', color: '#1A1A1A' },
  rowSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  rowValue: { fontSize: 14, fontWeight: '600' },
  rowChevron: { fontSize: 20, color: '#CBD5E1' },
  rowDiv: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
  },

  signOutBtn: {
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  signOutTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
  },
  version: {
    textAlign: 'center',
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 20,
  },
});
