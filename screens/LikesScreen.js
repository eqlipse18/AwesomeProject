/**
 * LikesScreen - Two tabs: LIKES + MATCHES
 *
 * Tab 1 (LIKES):
 * - Sent likes (profiles I liked)
 * - Received likes (blurred for free users)
 * - Send Message Request button (PAID)
 * - View Profile button (FREE)
 *
 * Tab 2 (MATCHES):
 * - Pending SUPERLIKEs (awaiting approval)
 * - Accepted matches
 * - Rejected notifications (auto-disappear after 1 day)
 * - Chat + View Profile buttons
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
  BlurView,
  Alert,
} from 'react-native';
import { TabView, SceneMap } from 'react-native-tab-view';
import { AuthContext } from '../AuthContex';
import {
  useLikes,
  useMatchRequests,
  useSubscription,
} from '../src/hooks/usePremiumHooks';
import { PremiumModal } from '../src/components/swipe/PremiumModal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LikesScreen = ({ navigation }) => {
  const { token, userId } = useContext(AuthContext);
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'likes', title: 'Likes' },
    { key: 'matches', title: 'Matches' },
  ]);

  // ── Hooks ──
  const {
    sentLikes,
    receivedLikes,
    loading,
    error,
    isBlurred,
    refetchSent,
    refetchReceived,
  } = useLikes({ token });
  const {
    requests,
    loading: requestsLoading,
    refetch: refetchRequests,
  } = useMatchRequests({ token });
  const { subscription } = useSubscription({ token });

  const [refreshing, setRefreshing] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // ── Refresh ──
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchSent(), refetchReceived(), refetchRequests()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchSent, refetchReceived, refetchRequests]);

  // ── Tab Scenes ──
  const LikesScene = () => (
    <View style={styles.sceneContainer}>
      <View style={styles.subTabs}>
        <Text style={styles.subTabLabel}>
          💬 Sent Likes ({sentLikes.length})
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : sentLikes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="heart-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No sent likes yet</Text>
          <Text style={styles.emptySubtext}>
            Start swiping to like profiles
          </Text>
        </View>
      ) : (
        <FlatList
          data={sentLikes}
          keyExtractor={item => item.userId}
          renderItem={({ item }) => (
            <LikedProfileCard
              profile={item}
              navigation={navigation}
              type="sent"
              isPremium={subscription?.isPremium}
              setShowPremiumModal={setShowPremiumModal}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          scrollEnabled={true}
          nestedScrollEnabled={true}
        />
      )}

      {/* Received Likes Section */}
      <View style={styles.subTabs}>
        <Text style={styles.subTabLabel}>
          ⭐ Received Likes ({receivedLikes.length})
        </Text>
      </View>

      {isBlurred ? (
        <View style={styles.blurredContainer}>
          <MaterialCommunityIcons name="lock-outline" size={50} color="#999" />
          <Text style={styles.blurredText}>
            Upgrade to Premium to see who liked you
          </Text>
          <TouchableOpacity
            style={styles.premiumButton}
            onPress={() => setShowPremiumModal(true)}
          >
            <Text style={styles.premiumButtonText}>Upgrade Now</Text>
          </TouchableOpacity>
        </View>
      ) : receivedLikes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="heart-multiple-outline"
            size={60}
            color="#ccc"
          />
          <Text style={styles.emptyText}>No received likes yet</Text>
          <Text style={styles.emptySubtext}>
            Impress someone to get a like!
          </Text>
        </View>
      ) : (
        <FlatList
          data={receivedLikes}
          keyExtractor={item => item.userId}
          renderItem={({ item }) => (
            <LikedProfileCard
              profile={item}
              navigation={navigation}
              type="received"
              isPremium={subscription?.isPremium}
              setShowPremiumModal={setShowPremiumModal}
            />
          )}
          scrollEnabled={false}
          nestedScrollEnabled={false}
        />
      )}
    </View>
  );

  const MatchesScene = () => (
    <View style={styles.sceneContainer}>
      {/* Pending SUPERLIKEs */}
      {requests.length > 0 && (
        <View>
          <View style={styles.subTabs}>
            <Text style={styles.subTabLabel}>
              ⭐ Pending Approval ({requests.length})
            </Text>
          </View>

          <FlatList
            data={requests}
            keyExtractor={item => item.requestId}
            renderItem={({ item }) => (
              <PendingSuperlikikeCard request={item} navigation={navigation} />
            )}
            scrollEnabled={false}
            nestedScrollEnabled={false}
          />
        </View>
      )}

      {/* Accepted Matches */}
      <View style={styles.subTabs}>
        <Text style={styles.subTabLabel}>✅ Active Matches (Coming Soon)</Text>
      </View>

      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="cards-heart-outline"
          size={60}
          color="#ccc"
        />
        <Text style={styles.emptyText}>No active matches yet</Text>
        <Text style={styles.emptySubtext}>Mutual likes will appear here</Text>
      </View>

      {requestsLoading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </View>
  );

  const renderScene = SceneMap({
    likes: LikesScene,
    matches: MatchesScene,
  });

  return (
    <View style={styles.container}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: SCREEN_WIDTH }}
      />

      {/* Premium Modal */}
      <PremiumModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        feature="RECEIVED_LIKES"
        onSelectPlan={planType => {
          setShowPremiumModal(false);
          // TODO: Navigate to payment or call subscription hook
          Alert.alert('Plan Selected', `You selected ${planType}`);
        }}
      />
    </View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// LikedProfileCard Component
// ════════════════════════════════════════════════════════════════════════════

const LikedProfileCard = ({
  profile,
  navigation,
  type,
  isPremium,
  setShowPremiumModal,
}) => {
  const handleSendMessage = () => {
    Alert.alert(
      isPremium ? 'Send Message' : 'Premium Feature',
      isPremium
        ? 'Send a message to this user?'
        : 'Upgrade to Premium to send messages',
      [
        {
          text: isPremium ? 'Cancel' : 'Upgrade',
          onPress: () => {
            if (!isPremium) {
              setShowPremiumModal(true);
            }
          },
        },
        {
          text: isPremium ? 'Send' : 'Cancel',
          onPress: () => {
            // TODO: Implement send message logic
            Alert.alert('Message sent!', `Message sent to ${profile.name}`);
          },
        },
      ],
    );
  };

  const handleViewProfile = () => {
    navigation.navigate('Profile', {
      userId: profile.userId,
      profile: profile,
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardImageContainer}>
        <Image
          source={{ uri: profile.image }}
          style={styles.cardImage}
          defaultSource={require('../assets/Images/default-avatar.png')}
        />
        {type === 'received' && !isPremium && (
          <BlurView intensity={90} style={styles.blurOverlay} />
        )}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>
            {profile.name}, {profile.age}
          </Text>
          {type === 'sent' && (
            <MaterialCommunityIcons name="heart" size={20} color="#FF0059" />
          )}
          {type === 'received' && (
            <MaterialCommunityIcons name="star" size={20} color="#FFD700" />
          )}
        </View>

        <Text style={styles.cardLocation}>📍 {profile.hometown}</Text>

        <View style={styles.cardButtons}>
          {!isPremium && type === 'received' ? (
            <TouchableOpacity
              style={[styles.button, styles.buttonDisabled]}
              disabled
            >
              <MaterialCommunityIcons name="lock" size={18} color="#999" />
              <Text style={styles.buttonTextDisabled}>Locked</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleSendMessage}
            >
              <MaterialCommunityIcons
                name="message-text-outline"
                size={18}
                color="#007AFF"
              />
              <Text style={styles.buttonText}>Message</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleViewProfile}
          >
            <MaterialCommunityIcons name="eye-outline" size={18} color="#666" />
            <Text style={styles.buttonTextSecondary}>View</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// PendingSuperlikikeCard Component
// ════════════════════════════════════════════════════════════════════════════

const PendingSuperlikikeCard = ({ request, navigation }) => {
  const { superliker } = request;
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      // TODO: Call acceptRequest hook
      Alert.alert('Success!', 'SUPERLIKE accepted! You matched! 💕');
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      // TODO: Call rejectRequest hook
      Alert.alert('Rejected', 'SUPERLIKE rejected. It will disappear soon.');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <View style={styles.superlikikeCard}>
      <View style={styles.superlikikeImageContainer}>
        <Image
          source={{ uri: superliker.image }}
          style={styles.superlikikeImage}
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
            style={[styles.button, styles.buttonDanger]}
            onPress={handleReject}
            disabled={rejecting}
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
            style={[styles.button, styles.buttonSuccess]}
            onPress={handleAccept}
            disabled={accepting}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  sceneContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },

  // Tabs
  subTabs: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  subTabLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },

  // Like Cards
  card: {
    margin: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardImageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#f5f5f5',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  cardContent: {
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  cardLocation: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  cardButtons: {
    flexDirection: 'row',
    gap: 10,
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
  buttonPrimary: {
    backgroundColor: '#E8F1FF',
  },
  buttonSecondary: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  buttonTextSecondary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  buttonTextDisabled: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },

  // Blurred Section
  blurredContainer: {
    margin: 12,
    padding: 30,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurredText: {
    fontSize: 14,
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
  },
  premiumButton: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  premiumButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
  buttonSuccess: {
    flex: 1,
    backgroundColor: '#4CAF50',
  },
  buttonDanger: {
    flex: 1,
    backgroundColor: '#F44336',
  },
});

export default LikesScreen;
