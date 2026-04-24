import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';

const { width: W } = Dimensions.get('window');
const COL = 3;
const CELL = (W - 2) / COL;

const FILTERS = ['All', 'Photos', 'Videos', 'Links'];

export default function SharedMediaScreen({ navigation, route }) {
  const { messages = [] } = route.params;
  const [activeFilter, setActiveFilter] = useState('All');

  const items = useMemo(() => {
    return messages
      .filter(m => {
        if (activeFilter === 'Photos') return m.type === 'image';
        if (activeFilter === 'Videos') return m.type === 'video';
        if (activeFilter === 'Links') return m.type === 'link';
        return m.type === 'image' || m.type === 'video' || m.type === 'link';
      })
      .reverse(); // newest first
  }, [messages, activeFilter]);

  const renderMedia = ({ item }) => (
    <TouchableOpacity
      style={s.cell}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('MediaPreview', { uri: item.content })}
    >
      <Image source={{ uri: item.content }} style={s.img} resizeMode="cover" />
      {item.type === 'video' && (
        <View style={s.videoOverlay}>
          <Text style={s.videoIco}>▶</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderLink = ({ item }) => (
    <TouchableOpacity style={s.linkRow} activeOpacity={0.7}>
      <View style={s.linkIcon}>
        <Text style={{ fontSize: 18 }}>🔗</Text>
      </View>
      <View style={s.linkInfo}>
        <Text style={s.linkUrl} numberOfLines={1}>
          {item.content}
        </Text>
        <Text style={s.linkDate}>
          {new Date(item.createdAt).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const isGrid = activeFilter !== 'Links';

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          hitSlop={12}
        >
          <Text style={s.backIco}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>All media</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter chips */}
      <View style={s.chipRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[s.chip, activeFilter === f && s.chipActive]}
            onPress={() => setActiveFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[s.chipTxt, activeFilter === f && s.chipTxtActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {items.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIco}>
            {activeFilter === 'Links' ? '🔗' : '📷'}
          </Text>
          <Text style={s.emptyTxt}>No {activeFilter.toLowerCase()} yet</Text>
        </View>
      ) : isGrid ? (
        <FlatList
          data={items}
          numColumns={COL}
          keyExtractor={item => item.messageId}
          renderItem={renderMedia}
          contentContainerStyle={s.grid}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.messageId}
          renderItem={renderLink}
          contentContainerStyle={s.linkList}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 40, justifyContent: 'center' },
  backIco: { fontSize: 20, color: '#0F172A' },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },

  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  chipActive: { backgroundColor: '#FF0059', borderColor: '#FF0059' },
  chipTxt: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  chipTxtActive: { color: '#fff' },

  grid: { gap: 1 },
  cell: { width: CELL, height: CELL, margin: 0.5 },
  img: { width: '100%', height: '100%', backgroundColor: '#F1F5F9' },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  videoIco: { fontSize: 22, color: '#fff' },

  linkList: { paddingHorizontal: 16 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  linkIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkInfo: { flex: 1 },
  linkUrl: { fontSize: 14, color: '#FF0059', fontWeight: '500' },
  linkDate: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: '#F1F5F9' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyIco: { fontSize: 48 },
  emptyTxt: { fontSize: 15, color: '#94A3B8' },
});
