import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { AuthContext } from '../AuthContex';
import Config from 'react-native-config';

const API = Config.API_BASE_URL || 'http://192.168.100.154:9000';

// ── Same options as registration ──────────────────────────────────────────
const GOALS = [
  'Long-term Parter',
  'Short-term Fun',
  'Making new Friends',
  'Still Figuring Out',
];

const DRINK_OPTIONS = ['Never', 'Socially', 'Often', 'Prefer not to say'];
const SMOKE_OPTIONS = ['Never', 'Socially', 'Often', 'Prefer not to say'];

const HOBBIES_LIST = [
  'Music',
  'Movies',
  'Travel',
  'Fitness',
  'Gaming',
  'Cooking',
  'Reading',
  'Art',
  'Photography',
  'Dancing',
  'Yoga',
  'Sports',
  'Hiking',
  'Netflix',
  'Foodie',
  'Fashion',
  'Tech',
  'Nature',
];

// ── Components ────────────────────────────────────────────────────────────
const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}) => (
  <View style={ep.field}>
    <Text style={ep.fieldLabel}>{label}</Text>
    <TextInput
      style={[ep.fieldInput, multiline && ep.fieldInputMulti]}
      value={value ? String(value) : ''}
      onChangeText={onChangeText}
      placeholder={placeholder || label}
      placeholderTextColor="#94A3B8"
      multiline={multiline}
      keyboardType={keyboardType || 'default'}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
  </View>
);

const SelectChip = ({ label, selected, onPress }) => (
  <TouchableOpacity
    style={[ep.chip, selected && ep.chipSelected]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={[ep.chipTxt, selected && ep.chipTxtSelected]}>{label}</Text>
  </TouchableOpacity>
);

const SectionHeader = ({ title }) => (
  <Text style={ep.sectionTitle}>{title}</Text>
);

// ── Main ──────────────────────────────────────────────────────────────────
export default function EditProfileScreen({ navigation }) {
  const { token } = useContext(AuthContext);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    hometown: '',
    jobTitle: '',
    goals: '',
    drink: '',
    smoke: '',
    height: '',
    hobbies: [],
    datingPreferences: '',
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const toggleHobby = h => {
    setForm(prev => ({
      ...prev,
      hobbies: prev.hobbies.includes(h)
        ? prev.hobbies.filter(x => x !== h)
        : prev.hobbies.length < 10
        ? [...prev.hobbies, h]
        : prev.hobbies,
    }));
  };

  // Fetch profile
  useEffect(() => {
    axios
      .get(`${API}/user-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(r => {
        if (r.data.success) {
          const u = r.data.user;
          setForm({
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            hometown: u.hometown || '',
            jobTitle: u.jobTitle || '',
            goals: u.goals || '',
            drink: u.drink || '',
            smoke: u.smoke || '',
            height: u.height ? String(u.height) : '',
            hobbies: Array.isArray(u.hobbies) ? u.hobbies : [],
            datingPreferences: u.datingPreferences || '',
          });
        }
      })
      .catch(e => console.error('[EditProfile] fetch:', e.message));
  }, [token]);

  const handleSave = useCallback(async () => {
    if (!form.firstName.trim()) {
      Alert.alert('Required', 'First name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const resp = await axios.put(
        `${API}/update-profile`,
        {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          hometown: form.hometown.trim(),
          jobTitle: form.jobTitle.trim(),
          goals: form.goals,
          drink: form.drink,
          smoke: form.smoke,
          height: form.height ? Number(form.height) : null,
          hobbies: form.hobbies,
          datingPreferences: form.datingPreferences,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (resp.data.success) {
        Alert.alert('✓ Saved', 'Profile updated!');
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert('Error', 'Could not save. Try again.');
      console.error('[EditProfile] save:', e.message);
    } finally {
      setSaving(false);
    }
  }, [form, token, navigation]);

  return (
    <SafeAreaView style={ep.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F0EB" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={ep.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={ep.backIco}>←</Text>
          </TouchableOpacity>
          <Text style={ep.headerTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={8}>
            <Text style={[ep.saveBtn, saving && ep.saveBtnDisabled]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={ep.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Basic Info ─────────────────────────────────────── */}
          <View style={ep.section}>
            <SectionHeader title="Basic Info" />
            <Field
              label="First Name"
              value={form.firstName}
              onChangeText={v => set('firstName', v)}
            />
            <Field
              label="Last Name"
              value={form.lastName}
              onChangeText={v => set('lastName', v)}
            />
            <Field
              label="Hometown"
              value={form.hometown}
              onChangeText={v => set('hometown', v)}
              placeholder="Where are you from?"
            />
            <Field
              label="Job Title"
              value={form.jobTitle}
              onChangeText={v => set('jobTitle', v)}
              placeholder="What do you do?"
            />
            <Field
              label="Height (cm)"
              value={form.height}
              onChangeText={v => set('height', v.replace(/[^0-9]/g, ''))}
              placeholder="e.g. 175"
              keyboardType="number-pad"
            />
          </View>

          {/* ── Looking For ────────────────────────────────────── */}
          <View style={ep.section}>
            <SectionHeader title="I'm Looking For" />
            <View style={ep.chipRow}>
              {GOALS.map(g => (
                <SelectChip
                  key={g}
                  label={g}
                  selected={form.goals === g}
                  onPress={() => set('goals', g)}
                />
              ))}
            </View>
          </View>

          {/* ── Lifestyle ──────────────────────────────────────── */}
          <View style={ep.section}>
            <SectionHeader title="Lifestyle" />

            <Text style={ep.subLabel}>Drinking</Text>
            <View style={ep.chipRow}>
              {DRINK_OPTIONS.map(d => (
                <SelectChip
                  key={d}
                  label={d}
                  selected={form.drink === d}
                  onPress={() => set('drink', d)}
                />
              ))}
            </View>

            <Text style={[ep.subLabel, { marginTop: 14 }]}>Smoking</Text>
            <View style={ep.chipRow}>
              {SMOKE_OPTIONS.map(s => (
                <SelectChip
                  key={s}
                  label={s}
                  selected={form.smoke === s}
                  onPress={() => set('smoke', s)}
                />
              ))}
            </View>
          </View>

          {/* ── Hobbies ────────────────────────────────────────── */}
          <View style={ep.section}>
            <SectionHeader
              title={`Hobbies & Interests (${form.hobbies.length}/10)`}
            />
            <View style={ep.chipRow}>
              {HOBBIES_LIST.map(h => (
                <SelectChip
                  key={h}
                  label={h}
                  selected={form.hobbies.includes(h)}
                  onPress={() => toggleHobby(h)}
                />
              ))}
            </View>
          </View>

          {/* ── Show Me (Dating Preference) ────────────────────── */}
          <View style={ep.section}>
            <SectionHeader title="Show Me" />
            <View style={ep.chipRow}>
              {['Women', 'Men', 'Everyone'].map(d => (
                <SelectChip
                  key={d}
                  label={d}
                  selected={form.datingPreferences === d}
                  onPress={() => set('datingPreferences', d)}
                />
              ))}
            </View>
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[ep.saveBottomBtn, saving && ep.saveBottomBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={ep.saveBottomTxt}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const ep = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0EB' },
  scroll: { paddingBottom: 60 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backIco: { fontSize: 20, color: '#1A1A1A' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  saveBtn: { fontSize: 15, fontWeight: '700', color: '#B90034' },
  saveBtnDisabled: { color: '#94A3B8' },

  section: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B90034',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },

  field: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fieldInputMulti: { minHeight: 90, textAlignVertical: 'top' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  chipSelected: { borderColor: '#B90034', backgroundColor: '#FFF1F5' },
  chipTxt: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  chipTxtSelected: { color: '#B90034', fontWeight: '700' },

  saveBottomBtn: {
    backgroundColor: '#B90034',
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveBottomBtnDisabled: { backgroundColor: '#94A3B8' },
  saveBottomTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
