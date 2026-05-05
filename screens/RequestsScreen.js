import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  FadeInDown,
  FadeOutLeft,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useRequests } from '../src/hooks/useRequests';

const formatLastActive = ts => {
  if (!ts) return 'Offline';
  const diff = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (diff < 2) return 'Online';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
};

// ── Request Row ───────────────────────────────────────────────────────────────
const RequestRow = ({ request, onAccept, onReject, onPress, index }) => {
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const mountedRef = useRef(true); // ← unmount guard
  const scale = useSharedValue(1);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleAccept = async e => {
    e.stopPropagation(); // ← row onPress rokta hai
    if (accepting || rejecting) return;
    setAccepting(true);
    scale.value = withSpring(0.97);
    await onAccept(request.requestId, request.createdAt);
    if (mountedRef.current) setAccepting(false);
  };

  const handleReject = async e => {
    e.stopPropagation(); // ← row onPress rokta hai
    if (rejecting || accepting) return;
    setRejecting(true);
    await onReject(request.requestId, request.createdAt);
    if (mountedRef.current) setRejecting(false);
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(280)}
      exiting={FadeOutLeft.duration(300)}
      layout={LinearTransition.springify()}
      style={animStyle}
    >
      <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.8}>
        {/* Avatar */}
        <View style={s.avatarWrap}>
          {request.senderImage ? (
            <Image source={{ uri: request.senderImage }} style={s.avatar} />
          ) : (
            <LinearGradient
              colors={['#FFC2CD', '#B90034']}
              style={s.avatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={s.avatarInitial}>
                {request.senderName?.[0]?.toUpperCase() || '?'}
              </Text>
            </LinearGradient>
          )}
          <View
            style={[
              s.onlineDot,
              {
                backgroundColor: request.senderIsOnline ? '#22C55E' : '#94A3B8',
              },
            ]}
          />
          {request.fromSuperlike && (
            <View style={s.superlikeBadge}>
              <Text style={s.superlikeIco}>⭐</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={s.info}>
          <Text style={s.name} numberOfLines={1}>
            {request.senderName}
            {request.senderAge ? `, ${request.senderAge}` : ''}
          </Text>
          <Text style={s.status}>
            {request.senderIsOnline
              ? '🟢 Online'
              : formatLastActive(request.senderLastActive)}
          </Text>
          {request.fromSuperlike && (
            <Text style={s.superlikeTxt}>⭐ Superliked you</Text>
          )}
        </View>

        {/* Action buttons — TouchableOpacity stops propagation via onPress param */}
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.actionBtn, s.rejectBtn, rejecting && s.btnDisabled]}
            onPress={handleReject} // ← e.stopPropagation inside
            disabled={rejecting || accepting}
            activeOpacity={0.8}
          >
            <Text style={s.rejectIco}>{rejecting ? '⏳' : '✕'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionBtn, s.acceptBtn, accepting && s.btnDisabled]}
            onPress={handleAccept} // ← e.stopPropagation inside
            disabled={accepting || rejecting}
            activeOpacity={0.8}
          >
            <Text style={s.acceptIco}>{accepting ? '⏳' : '✓'}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function RequestsScreen({ navigation }) {
  const { received, loading, fetchReceived, acceptRequest, rejectRequest } =
    useRequests();

  useEffect(() => {
    fetchReceived();
  }, [fetchReceived]);

  const handleAccept = useCallback(
    async (requestId, createdAt) => {
      if (!createdAt) {
        console.error('[RequestsScreen] missing createdAt for', requestId);
        return;
      }
      const result = await acceptRequest(requestId, createdAt);
      if (result.success && result.matchId) {
        const req = received.find(r => r.requestId === requestId);
        navigation.replace('Conversation', {
          matchId: result.matchId,
          targetUserId: req?.senderId,
          name: req?.senderName,
          image: req?.senderImage,
        });
      }
    },
    [acceptRequest, received, navigation],
  );

  const handleReject = useCallback(
    async (requestId, createdAt) => {
      await rejectRequest(requestId, createdAt);
    },
    [rejectRequest],
  );

  const handleRowPress = useCallback(
    req => {
      console.log('[RequestsScreen] row press:', JSON.stringify(req, null, 2));
      navigation.navigate('UserProfile', {
        userId: req.senderId,
        targetUserId: req.senderId,
        name: req.senderName,
        image: req.senderImage,
        fromRequest: true,
        requestId: req.requestId,
        createdAt: req.createdAt,
      });
    },
    [navigation],
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffedff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={s.backIco}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Message Requests</Text>
        <View style={s.badge}>
          <Text style={s.badgeTxt}>{received.length}</Text>
        </View>
      </View>

      {received.length === 0 && !loading ? (
        <View style={s.empty}>
          <Text style={s.emptyIco}>💌</Text>
          <Text style={s.emptyTitle}>No requests yet</Text>
          <Text style={s.emptySub}>
            When someone superlieks you or sends a request, it'll show up here
          </Text>
        </View>
      ) : (
        <FlatList
          data={received}
          keyExtractor={item => item.requestId}
          renderItem={({ item, index }) => (
            <RequestRow
              request={item}
              index={index}
              onAccept={handleAccept}
              onReject={handleReject}
              onPress={() => handleRowPress(item)}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={s.sep} />}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffedff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backIco: { fontSize: 20, color: '#1A1A1A' },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    fontFamily: 'Nunito-Bold',
  },
  badge: {
    backgroundColor: '#B90034',
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },

  list: { paddingVertical: 8, paddingBottom: 40 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  avatarWrap: { marginRight: 14, position: 'relative' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  avatarInitial: { fontSize: 22, color: '#fff', fontWeight: '700' },
  onlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#ffedff',
  },
  superlikeBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  superlikeIco: { fontSize: 11 },

  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 3 },
  status: { fontSize: 12, color: '#94A3B8', marginBottom: 2 },
  superlikeTxt: { fontSize: 11, color: '#F59E0B', fontWeight: '600' },

  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectBtn: { backgroundColor: '#FEE2E2' },
  acceptBtn: { backgroundColor: '#DCFCE7' },
  rejectIco: { fontSize: 16, color: '#EF4444', fontWeight: '800' },
  acceptIco: { fontSize: 16, color: '#22C55E', fontWeight: '800' },

  sep: { height: 2, backgroundColor: 'transparent' },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 40,
  },
  emptyIco: { fontSize: 52 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  emptySub: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  btnDisabled: { opacity: 0.5 },
});
