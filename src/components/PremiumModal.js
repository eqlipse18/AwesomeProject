/**
 * Premium Modals & Components
 *
 * - PremiumModal: Shows Plus/Ultra plans with pricing
 * - DailyLimitModal: Shows when daily limit reached
 * - FeatureLockedModal: Shows when feature requires premium
 * - PlanSelectionModal: Choose plan to purchase
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ════════════════════════════════════════════════════════════════════════════
// 1. PremiumModal - Feature locked, show upgrade options
// ════════════════════════════════════════════════════════════════════════════

export const PremiumModal = ({
  visible,
  onClose,
  feature = 'SUPERLIKE',
  onSelectPlan,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Unlock Premium</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Content */}
          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Icon & Message */}
            <View style={styles.featureSection}>
              <View style={styles.featureIconContainer}>
                {feature === 'SUPERLIKE' && (
                  <MaterialCommunityIcons
                    name="star-outline"
                    size={60}
                    color="#FFD700"
                  />
                )}
                {feature === 'REWIND' && (
                  <MaterialCommunityIcons
                    name="undo"
                    size={60}
                    color="#007AFF"
                  />
                )}
                {feature === 'MESSAGE_REQUEST' && (
                  <MaterialCommunityIcons
                    name="message-text-outline"
                    size={60}
                    color="#FF0059"
                  />
                )}
                {feature === 'RECEIVED_LIKES' && (
                  <MaterialCommunityIcons
                    name="heart-multiple"
                    size={60}
                    color="#FF69B4"
                  />
                )}
              </View>

              <Text style={styles.featureTitle}>
                {feature === 'SUPERLIKE' && 'Send SUPERLIKEs'}
                {feature === 'REWIND' && 'Rewind Cards'}
                {feature === 'MESSAGE_REQUEST' && 'Send Messages'}
                {feature === 'RECEIVED_LIKES' && 'See Who Likes You'}
              </Text>

              <Text style={styles.featureDescription}>
                {feature === 'SUPERLIKE' &&
                  '⭐ Send special likes that stand out'}
                {feature === 'REWIND' && '↩️ Undo your last swipe'}
                {feature === 'MESSAGE_REQUEST' &&
                  '💬 Connect with anyone you like'}
                {feature === 'RECEIVED_LIKES' &&
                  "👀 Discover who's interested in you"}
              </Text>
            </View>

            {/* Plans */}
            <View style={styles.plansSection}>
              <Text style={styles.plansTitle}>Choose Your Plan</Text>

              {/* Plus Plan */}
              <PlanCard
                name="Flame Plus"
                duration="15 Days"
                price="₹299"
                badge="POPULAR"
                features={[
                  '5 SUPERLIKEs per day',
                  '10 Rewinds per day',
                  'See received likes',
                ]}
                highlighted={false}
                onSelect={() => onSelectPlan('Plus')}
              />

              {/* Ultra Plan */}
              <PlanCard
                name="Flame Ultra"
                duration="30 Days"
                price="₹399"
                badge="BEST VALUE"
                features={[
                  'Unlimited SUPERLIKEs',
                  'Unlimited Rewinds',
                  'See received likes',
                  'Priority support',
                ]}
                highlighted={true}
                onSelect={() => onSelectPlan('Ultra')}
              />

              <Text style={styles.disclaimerText}>
                💳 Subscriptions renew automatically unless cancelled
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 2. PlanCard Component
// ════════════════════════════════════════════════════════════════════════════

const PlanCard = ({
  name,
  duration,
  price,
  badge,
  features,
  highlighted,
  onSelect,
}) => {
  return (
    <TouchableOpacity
      style={[styles.planCard, highlighted && styles.planCardHighlighted]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      {badge && highlighted && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}

      <View style={styles.planHeader}>
        <View>
          <Text style={styles.planName}>{name}</Text>
          <Text style={styles.planDuration}>{duration}</Text>
        </View>
        <Text style={styles.planPrice}>{price}</Text>
      </View>

      <View style={styles.featuresList}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <MaterialCommunityIcons
              name="check-circle"
              size={18}
              color={highlighted ? '#007AFF' : '#999'}
            />
            <Text style={styles.featureItemText}>{feature}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.selectButton,
          highlighted && styles.selectButtonHighlighted,
        ]}
        onPress={onSelect}
      >
        <Text style={styles.selectButtonText}>
          {highlighted ? 'Select Ultra' : 'Select Plus'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 3. DailyLimitModal - Show when daily limit reached
// ════════════════════════════════════════════════════════════════════════════

export const DailyLimitModal = ({
  visible,
  onClose,
  feature = 'SUPERLIKE',
  resetTime = '00:00',
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.limitModalOverlay}>
        <View style={styles.limitModalContent}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={60}
            color="#FF9800"
          />

          <Text style={styles.limitTitle}>Daily Limit Reached</Text>

          <Text style={styles.limitMessage}>
            {feature === 'SUPERLIKE' &&
              "⭐ You've used all 5 SUPERLIKEs for today"}
            {feature === 'REWIND' && "↩️ You've used all 10 Rewinds for today"}
          </Text>

          <View style={styles.limitInfo}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={20}
              color="#666"
            />
            <Text style={styles.limitInfoText}>
              Your limits reset at {resetTime}
            </Text>
          </View>

          <TouchableOpacity style={styles.limitButton} onPress={onClose}>
            <Text style={styles.limitButtonText}>Got It</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.limitButton, styles.limitButtonSecondary]}
            onPress={onClose}
          >
            <Text style={styles.limitButtonTextSecondary}>
              ✨ Upgrade to Unlimited
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 4. FeatureLockedModal - Show feature is locked
// ════════════════════════════════════════════════════════════════════════════

export const FeatureLockedModal = ({
  visible,
  onClose,
  feature = 'SUPERLIKE',
  onUpgrade,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.lockedModalOverlay}>
        <View style={styles.lockedModalContent}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={28} color="#333" />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.lockedIconContainer}>
            {feature === 'MESSAGE_REQUEST' && (
              <MaterialCommunityIcons
                name="lock-outline"
                size={80}
                color="#FF0059"
              />
            )}
            {feature === 'RECEIVED_LIKES' && (
              <MaterialCommunityIcons
                name="lock-outline"
                size={80}
                color="#FF69B4"
              />
            )}
          </View>

          {/* Title & Description */}
          <Text style={styles.lockedTitle}>
            {feature === 'MESSAGE_REQUEST' && 'Send Message Requests'}
            {feature === 'RECEIVED_LIKES' && 'See Who Likes You'}
          </Text>

          <Text style={styles.lockedDescription}>
            {feature === 'MESSAGE_REQUEST' &&
              "Connect with anyone on your likes list, even if they haven't seen your profile yet."}
            {feature === 'RECEIVED_LIKES' &&
              "Discover who's interested in you. Upgrade to Premium to unlock this feature."}
          </Text>

          {/* Benefits */}
          <View style={styles.benefitsList}>
            {feature === 'MESSAGE_REQUEST' && (
              <>
                <BenefitItem text="💬 Send direct messages" />
                <BenefitItem text="⭐ Get priority visibility" />
                <BenefitItem text="🎯 Better matches" />
              </>
            )}
            {feature === 'RECEIVED_LIKES' && (
              <>
                <BenefitItem text="👀 See all your admirers" />
                <BenefitItem text="💡 Smarter dating choices" />
                <BenefitItem text="🔥 Save time, find love" />
              </>
            )}
          </View>

          {/* Buttons */}
          <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade}>
            <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.notNowButton} onPress={onClose}>
            <Text style={styles.notNowButtonText}>Not Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 5. BenefitItem Component
// ════════════════════════════════════════════════════════════════════════════

const BenefitItem = ({ text }) => (
  <View style={styles.benefitItem}>
    <MaterialCommunityIcons name="check-circle" size={20} color="#007AFF" />
    <Text style={styles.benefitText}>{text}</Text>
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// 6. PaymentProcessingModal - Show during payment
// ════════════════════════════════════════════════════════════════════════════

export const PaymentProcessingModal = ({ visible, planName, planPrice }) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.paymentOverlay}>
        <View style={styles.paymentContent}>
          <ActivityIndicator
            size="large"
            color="#007AFF"
            style={{ marginBottom: 20 }}
          />

          <Text style={styles.paymentTitle}>Processing Payment</Text>

          <Text style={styles.paymentSubtitle}>
            {planName} - {planPrice}
          </Text>

          <Text style={styles.paymentMessage}>
            Please wait while we process your payment...
          </Text>
        </View>
      </View>
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 7. PaymentSuccessModal - Show after successful payment
// ════════════════════════════════════════════════════════════════════════════

export const PaymentSuccessModal = ({
  visible,
  onClose,
  planName,
  daysRemaining,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.successOverlay}>
        <View style={styles.successContent}>
          <View style={styles.successIconContainer}>
            <MaterialCommunityIcons
              name="check-circle"
              size={80}
              color="#4CAF50"
            />
          </View>

          <Text style={styles.successTitle}>Payment Successful!</Text>

          <Text style={styles.successSubtitle}>
            You're now a {planName} member
          </Text>

          <View style={styles.successInfo}>
            <Text style={styles.successInfoText}>
              ✨ You have {daysRemaining} days remaining
            </Text>
            <Text style={styles.successInfoText}>
              🎉 Start enjoying premium features!
            </Text>
          </View>

          <TouchableOpacity style={styles.successButton} onPress={onClose}>
            <Text style={styles.successButtonText}>Let's Go! 🚀</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // Premium Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalContent: {
    padding: 16,
  },
  featureSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  featureIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

  // Plans Section
  plansSection: {
    marginBottom: 30,
  },
  plansTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  planCardHighlighted: {
    backgroundColor: '#EFF7FF',
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  planDuration: {
    fontSize: 13,
    color: '#666',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  featuresList: {
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  featureItemText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  selectButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectButtonHighlighted: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
  },
  selectButtonHighlightedText: {
    color: '#fff',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },

  // Daily Limit Modal
  limitModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 20,
    width: SCREEN_WIDTH - 40,
  },
  limitTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  limitMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  limitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
    gap: 10,
  },
  limitInfoText: {
    fontSize: 13,
    color: '#666',
  },
  limitButton: {
    width: '100%',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  limitButtonSecondary: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  limitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  limitButtonTextSecondary: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
  },

  // Feature Locked Modal
  lockedModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  lockedModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    paddingTop: 20,
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginRight: 16,
    marginBottom: 10,
  },
  lockedIconContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  lockedDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
    lineHeight: 20,
  },
  benefitsList: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  upgradeButton: {
    marginHorizontal: 16,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  notNowButton: {
    marginHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  notNowButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },

  // Payment Modal
  paymentOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  paymentSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  paymentMessage: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },

  // Success Modal
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  successInfo: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  successInfoText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  successButton: {
    width: '100%',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default {
  PremiumModal,
  DailyLimitModal,
  FeatureLockedModal,
  PaymentProcessingModal,
  PaymentSuccessModal,
};
