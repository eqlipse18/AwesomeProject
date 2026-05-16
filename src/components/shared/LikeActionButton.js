import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useState, useCallback } from 'react';
import axios from 'axios';
import Config from 'react-native-config';
import { emitLikeUpdate } from '../../hooks/useLikeStatus';

const API = Config.API_BASE_URL || 'http://192.168.100.154:9000';

export const LikeActionButton = ({
  token,
  targetUserId,
  targetName,
  targetImage,
  uiState,
  matchId,
  navigation,
  size = 'large', // 'large' | 'small' (for cards)
  style,
}) => {
  const [acting, setActing] = useState(false);
  const [localState, setLocalState] = useState(uiState);
  const [localMatchId, setLocalMatchId] = useState(matchId);

  // Update when parent uiState changes
  React.useEffect(() => {
    setLocalState(uiState);
    setLocalMatchId(matchId);
  }, [uiState, matchId]);

  const handleLike = useCallback(async () => {
    if (acting || localState === 'liked') return;
    setActing(true);
    try {
      const resp = await axios.post(
        `${API}/swipe`,
        { likedId: targetUserId, type: 'like' },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const isMatch = resp.data.match;
      const newMatchId = resp.data.matchId;

      // Instant local update
      setLocalState(isMatch ? 'chat' : 'liked');
      if (isMatch) setLocalMatchId(newMatchId);

      // Broadcast to all screens
      emitLikeUpdate({ toUserId: targetUserId, isMatch, matchId: newMatchId });

      // Navigate to chat on match
      if (isMatch && navigation) {
        setTimeout(() => {
          navigation.navigate('Conversation', {
            matchId: newMatchId,
            targetUserId: targetUserId,
            name: targetName,
            image: targetImage,
          });
        }, 600);
      }
    } catch (e) {
      console.error('[LikeActionButton]', e.message);
    } finally {
      setActing(false);
    }
  }, [
    acting,
    localState,
    token,
    targetUserId,
    targetName,
    targetImage,
    navigation,
  ]);

  const handleChat = useCallback(() => {
    if (!navigation || !localMatchId) return;
    navigation.navigate('Conversation', {
      matchId: localMatchId,
      targetUserId: targetUserId,
      name: targetName,
      image: targetImage,
    });
  }, [navigation, localMatchId, targetUserId, targetName, targetImage]);

  // ── Render based on state ──────────────────────────────────────────────
  if (localState === 'chat') {
    return (
      <TouchableOpacity
        style={[st.btn, st.chatBtn, size === 'small' && st.btnSmall, style]}
        onPress={handleChat}
        activeOpacity={0.85}
      >
        <Text style={st.ico}>💬</Text>
        {size === 'large' && <Text style={st.txt}>Start Chat</Text>}
      </TouchableOpacity>
    );
  }

  if (localState === 'liked') {
    return (
      <View
        style={[st.btn, st.likedBtn, size === 'small' && st.btnSmall, style]}
      >
        <Text style={st.ico}>✓</Text>
        {size === 'large' && (
          <Text style={[st.txt, { color: '#94A3B8' }]}>Liked</Text>
        )}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        st.btn,
        localState === 'like_back' ? st.likeBackBtn : st.likeBtn,
        size === 'small' && st.btnSmall,
        style,
      ]}
      onPress={handleLike}
      disabled={acting}
      activeOpacity={0.85}
    >
      {acting ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <Text style={st.ico}>{localState === 'like_back' ? '❤️' : '🔥'}</Text>
          {size === 'large' && (
            <Text style={st.txt}>
              {localState === 'like_back' ? 'Like Back' : 'Like Profile'}
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const st = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    flex: 1,
  },
  btnSmall: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    flex: 0,
  },
  likeBtn: { backgroundColor: '#FF0059' },
  likeBackBtn: { backgroundColor: '#EC4899' },
  chatBtn: { backgroundColor: '#22C55E' },
  likedBtn: { backgroundColor: '#F1F5F9' },
  ico: { fontSize: 16 },
  txt: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
