import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import Svg, { Polyline, Circle } from 'react-native-svg';

// ── Relative time ─────────────────────────────────────────────────────────────
const relTime = ts => {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(ts).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });
};

// ── Single animated tick ──────────────────────────────────────────────────────
const Tick = ({ color, delay = 0 }) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.6);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 180, easing: Easing.out(Easing.ease) }),
    );
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 14, stiffness: 260, mass: 0.6 }),
    );
  }, [color]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Reanimated.View style={style}>
      <Svg width={12} height={10} viewBox="0 0 12 10">
        <Polyline
          points="1,5 4,8 11,1"
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Reanimated.View>
  );
};

// ── Sending dot — withRepeat, no setInterval ──────────────────────────────────
const SendingDot = () => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true, // reverse — smooth pulse
    );
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Reanimated.View style={style}>
      <Svg width={10} height={10} viewBox="0 0 10 10">
        <Circle cx={5} cy={5} r={3.5} fill="#94A3B8" />
      </Svg>
    </Reanimated.View>
  );
};

// ── Tick icon group ───────────────────────────────────────────────────────────
const TickIcon = ({ status }) => {
  if (status === 'sending') return <SendingDot />;

  const isSent = status === 'sent';
  const isRead = status === 'read';
  const color = isRead ? '#FF0059' : '#94A3B8';

  if (isSent) {
    return (
      <View style={s.tickWrap}>
        <Tick color={color} delay={0} />
      </View>
    );
  }

  // delivered + read — double tick
  return (
    <View style={s.tickWrap}>
      <View style={s.tickFirst}>
        <Tick color={color} delay={0} />
      </View>
      <View style={s.tickSecond}>
        <Tick color={color} delay={isRead ? 80 : 40} />
      </View>
    </View>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export const DeliveryStatus = ({ status, createdAt }) => {
  if (!status) return null;

  const time = relTime(createdAt);
  const isRead = status === 'read';
  const color = isRead ? '#FF0059' : '#94A3B8';

  // "Sent now" hidden — cleaner UI, only show delivered + read
  const label =
    status === 'read'
      ? `Seen ${time}`
      : status === 'delivered'
      ? `Delivered ${time}`
      : ''; // sent — no label, just tick

  // Read pops, rest stays subtle
  const labelOpacity = isRead ? 1 : 0.7;

  return (
    <View style={s.wrap}>
      <TickIcon status={status} />
      {!!label && (
        <Text style={[s.label, { color, opacity: labelOpacity }]}>{label}</Text>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 3,
    marginBottom: 6,
    paddingRight: 4,
    gap: 4,
  },
  tickWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 20,
    height: 10,
  },
  tickFirst: {
    position: 'absolute',
    left: 0,
  },
  tickSecond: {
    position: 'absolute',
    left: 7,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
