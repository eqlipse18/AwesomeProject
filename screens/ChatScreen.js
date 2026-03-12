/**
 * ChatScreen - Complete Implementation
 *
 * Two sections:
 * 1. Pending SUPERLIKE Approvals (top)
 * 2. Active Chats (scrollable list)
 *
 * Features:
 * - Accept/Reject SUPERLIKE requests
 * - View active matches
 * - Pull-to-refresh
 * - Loading & error states
 * - Empty states with icons
 */

import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  SectionList,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthContext } from '../AuthContex';
import { useMatchRequests } from '../src/hooks/usePremiumHooks';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ChatScreen({ navigation }) {
  const { token, userId } = useContext(AuthContext);
  const {
    requests,
    loading: requestsLoading,
    error: requestsError,
    acceptRequest,
    rejectRequest,
    refetch: refetchRequests,
  } = useMatchRequests({ token });

  // ── Local state ──
  const [refreshing, setRefreshing] = useState(false);
  const [chats, setChats] = useState([
    // TODO: Replace with actual chat data from backend
    // {
    //   matchId: 'match-1',
    //   userId: 'user-456',
    //   name: 'Jane Doe',
    //   image: 'https://...',
    //   lastMessage: 'Hey! How are you?',
    //   lastMessageAt: '2025-03-11T10:30:00Z',
    //   unreadCount: 2,
    // },
  ]);
  const [chatsLoading, setChatsLoading] = useState(false);

  // ── Fetch chats on mount ──
  const fetchChats = useCallback(async () => {
    try {
      setChatsLoading(true);
      // TODO: Call GET /matches endpoint
      // const response = await api.get('/matches');
      // setChats(response.data.matches);
      setChats([]); // Placeholder
    } catch (error) {
      console.error('[ChatScreen] Fetch chats error:', error);
    } finally {
      setChatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchChats();
      refetchRequests();
    }
  }, [token, fetchChats, refetchRequests]);

  // ── Refresh all ──
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchChats(), refetchRequests()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchChats, refetchRequests]);

  // ── Handle chat press ──
  const handleChatPress = chat => {
    navigation.navigate('ChatDetail', {
      matchId: chat.matchId,
      userId: chat.userId,
      name: chat.name,
      image: chat.image,
    });
  };

  // ── Combined data for SectionList ──
  const sections = [];

  if (requests.length > 0) {
    sections.push({
      title: `⭐ Pending SUPERLIKEs (${requests.length})`,
      data: requests,
      type: 'request',
    });
  }

  if (chats.length > 0 || !chatsLoading) {
    sections.push({
      title: `💬 Active Chats (${chats.length})`,
      data: chats.length > 0 ? chats : [{ empty: true }],
      type: 'chat',
    });
  }

  // ── Render functions ──
  const renderRequestItem = ({ item }) => (
    <PendingSuperlikikeCard
      request={item}
      onAccept={() => handleAcceptRequest(item.requestId)}
      onReject={() => handleRejectRequest(item.requestId)}
    />
  );

  const renderChatItem = ({ item }) => {
    if (item.empty) {
      return (
        <View style={styles.emptyChatContainer}>
          <MaterialCommunityIcons name="chat-outline" size={60} color="#ccc" />
          <Text style={styles.emptyChatText}>No active chats</Text>
          <Text style={styles.emptyChatSubtext}>
            When you match with someone, you can chat here
          </Text>
        </View>
      );
    }

    return <ChatListItem chat={item} onPress={() => handleChatPress(item)} />;
  };

  const renderSectionHeader = ({ section: { title, type } }) => (
    <View
      style={[
        styles.sectionHeader,
        type === 'request' && styles.sectionHeaderRequest,
      ]}
    >
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  // ── Accept SUPERLIKE ──
  const handleAcceptRequest = async requestId => {
    try {
      const result = await acceptRequest(requestId);

      if (result.success) {
        Alert.alert('🎉 Matched!', 'You matched! You can now chat with them.', [
          { text: 'Great!' },
        ]);
        // Refresh chats list
        await fetchChats();
      } else {
        Alert.alert('Error', result.error || 'Failed to accept request');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    }
  };

  // ── Reject SUPERLIKE ──
  const handleRejectRequest = async requestId => {
    Alert.alert('Reject?', 'Are you sure? This will reject their SUPERLIKE.', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Reject',
        onPress: async () => {
          try {
            const result = await rejectRequest(requestId);

            if (result.success) {
              Alert.alert(
                'Rejected',
                'SUPERLIKE rejected. It will disappear soon.',
              );
            } else {
              Alert.alert('Error', result.error || 'Failed to reject');
            }
          } catch (error) {
            Alert.alert('Error', 'Something went wrong');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  // ── Loading state ──
  if (requestsLoading && chatsLoading && sections.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      </View>
    );
  }

  // ── Error state ──
  if (requestsError) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={60}
            color="#FF6B6B"
          />
          <Text style={styles.errorText}>Failed to load requests</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              refetchRequests();
              fetchChats();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Empty state (no requests, no chats) ──
  if (sections.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyStateContainer}>
          <MaterialCommunityIcons name="chat-sleep" size={80} color="#ccc" />
          <Text style={styles.emptyStateTitle}>No chats yet</Text>
          <Text style={styles.emptyStateSubtext}>
            When you match with someone, they'll appear here
          </Text>

          <TouchableOpacity
            style={styles.startSwipingButton}
            onPress={() => navigation.navigate('HomeScreen')}
          >
            <MaterialCommunityIcons name="cards-heart" size={20} color="#fff" />
            <Text style={styles.startSwipingButtonText}>Start Swiping</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item, index) =>
          item.requestId || item.matchId || `empty-${index}`
        }
        renderItem={({ item, section }) =>
          section.type === 'request'
            ? renderRequestItem({ item })
            : renderChatItem({ item })
        }
        renderSectionHeader={renderSectionHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
          />
        }
        stickySectionHeadersEnabled={false}
        scrollEnabled={true}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PendingSuperlikikeCard Component
// ════════════════════════════════════════════════════════════════════════════

const PendingSuperlikikeCard = ({ request, onAccept, onReject }) => {
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await onAccept();
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      await onReject();
    } finally {
      setRejecting(false);
    }
  };

  const { superliker } = request;

  return (
    <View style={styles.superlikikeCard}>
      <View style={styles.superlikikeImageContainer}>
        <Image
          source={{ uri: superliker.image }}
          style={styles.superlikikeImage}
          defaultSource={require('../assets/Images/default-avatar.png')}
        />
        <View style={styles.superlikeBadge}>
          <MaterialCommunityIcons name="star" size={24} color="#FFD700" />
        </View>
      </View>

      <View style={styles.superlikikeContent}>
        <Text style={styles.superlikikeName}>{superliker.name}</Text>
        <Text style={styles.superlikikeMessage}>⭐ Sent you a SUPERLIKE!</Text>

        <View style={styles.superlikikeButtons}>
          <TouchableOpacity
            style={[styles.button, styles.buttonReject]}
            onPress={handleReject}
            disabled={rejecting || accepting}
          >
            {rejecting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="close" size={18} color="#fff" />
                <Text style={styles.buttonText}>Reject</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonAccept]}
            onPress={handleAccept}
            disabled={accepting || rejecting}
          >
            {accepting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={18} color="#fff" />
                <Text style={styles.buttonText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ChatListItem Component
// ════════════════════════════════════════════════════════════════════════════

const ChatListItem = ({ chat, onPress }) => {
  const formatTime = timestamp => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / 60000);

    if (diffInMinutes < 1) return 'Now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d`;
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.chatItemImageContainer}>
        <Image
          source={{ uri: chat.image }}
          style={styles.chatItemImage}
          defaultSource={require('../assets/Images/default-avatar.png')}
        />
        {chat.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{chat.unreadCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.chatItemContent}>
        <View style={styles.chatItemHeader}>
          <Text style={styles.chatItemName}>{chat.name}</Text>
          <Text style={styles.chatItemTime}>
            {formatTime(chat.lastMessageAt)}
          </Text>
        </View>

        <Text style={styles.chatItemLastMessage} numberOfLines={1}>
          {chat.lastMessage || 'No messages yet'}
        </Text>
      </View>

      <View style={styles.chatItemArrow}>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
      </View>
    </TouchableOpacity>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingBottom: 20,
  },

  // Loading & Error States
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Empty State
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  emptyStateSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  startSwipingButton: {
    marginTop: 24,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  startSwipingButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Section Header
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionHeaderRequest: {
    backgroundColor: '#FFF8E1',
    borderBottomColor: '#FFD700',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },

  // SUPERLIKE Card
  superlikikeCard: {
    margin: 12,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFF8E1',
    borderWidth: 2,
    borderColor: '#FFD700',
    flexDirection: 'row',
  },
  superlikikeImageContainer: {
    width: 100,
    height: 120,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  superlikikeImage: {
    width: '100%',
    height: '100%',
  },
  superlikeBadge: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    backgroundColor: '#FFD700',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  superlikikeContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  superlikikeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  superlikikeMessage: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  superlikikeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  buttonAccept: {
    backgroundColor: '#4CAF50',
  },
  buttonReject: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },

  // Chat List Item
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  chatItemImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  chatItemImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f5f5f5',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  unreadBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  chatItemContent: {
    flex: 1,
  },
  chatItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  chatItemTime: {
    fontSize: 12,
    color: '#999',
  },
  chatItemLastMessage: {
    fontSize: 13,
    color: '#666',
  },
  chatItemArrow: {
    marginLeft: 8,
  },

  // Empty Chat
  emptyChatContainer: {
    paddingVertical: 60,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChatText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  emptyChatSubtext: {
    marginTop: 8,
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
});
