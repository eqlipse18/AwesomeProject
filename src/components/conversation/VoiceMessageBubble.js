import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  LinearTransition,
} from 'react-native-reanimated';
import NitroSound from 'react-native-nitro-sound';

const fmtMs = ms => {
  const s = Math.floor((ms || 0) / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};

// Stable fake waveform using sin — same every render
const makeFakeBars = (count = 40) =>
  Array.from(
    { length: count },
    (_, i) => ((Math.sin(i * 2.3 + 1) + 1) / 2) * 0.72 + 0.15,
  );

export const VoiceMessageBubble = ({ message, isOwn }) => {
  const uri = message.content;
  const totalMs = message.duration || 0;
  const bars =
    message.waveform?.length > 0 ? message.waveform : makeFakeBars(40);

  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const listenerRef = useRef(null);

  const progressFraction = totalMs > 0 ? currentMs / totalMs : 0;
  const activeBars = Math.floor(progressFraction * bars.length);

  const stopPlayback = useCallback(async () => {
    try {
      player.removePlayBackListener();
      await NitroSound.stopPlayer();
    } catch {}
    setPlaying(false);
    setCurrentMs(0);
  }, []);

  const togglePlay = useCallback(async () => {
    if (playing) {
      await stopPlayback();
      return;
    }

    try {
      setPlaying(true);
      await NitroSound.startPlayer(uri);
      NitroSound.addPlayBackListener(e => {
        setCurrentMs(e.currentPosition);
        if (e.currentPosition >= (e.duration || totalMs) - 150) {
          player.removePlayBackListener();
          setPlaying(false);
          setCurrentMs(0);
        }
      });
    } catch (e) {
      console.error('[VoicePlayback]', e);
      setPlaying(false);
    }
  }, [playing, uri, totalMs, stopPlayback]);

  useEffect(() => {
    return async () => {
      if (playing) {
        await NitroSound.stopPlayer().catch(() => {});
        NitroSound.removePlayBackListener();
      }
    };
  }, [playing]);

  const displayMs = playing ? currentMs : totalMs;

  return (
    <Animated.View layout={LinearTransition.springify()} style={s.wrap}>
      {/* Play/Pause */}
      <TouchableOpacity
        onPress={togglePlay}
        style={[s.playBtn, isOwn ? s.playBtnOwn : s.playBtnOther]}
        activeOpacity={0.8}
      >
        <Text style={[s.playIco, isOwn && s.playIcoOwn]}>
          {playing ? '⏸' : '▶'}
        </Text>
      </TouchableOpacity>

      {/* Waveform */}
      <View style={s.waveform}>
        {bars.map((h, i) => {
          const active = i < activeBars;
          return (
            <View
              key={i}
              style={[
                s.bar,
                { height: Math.max(3, h * 28) },
                isOwn
                  ? active
                    ? s.barActiveOwn
                    : s.barInactiveOwn
                  : active
                  ? s.barActiveOther
                  : s.barInactiveOther,
              ]}
            />
          );
        })}
      </View>

      {/* Duration */}
      <Text style={[s.dur, isOwn ? s.durOwn : s.durOther]}>
        {fmtMs(displayMs)}
      </Text>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minWidth: 200,
    maxWidth: 255,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  playBtnOwn: { backgroundColor: 'rgba(255,255,255,0.25)' },
  playBtnOther: { backgroundColor: '#FFE4EC' },
  playIco: { fontSize: 13, color: '#FF0059' },
  playIcoOwn: { color: '#fff' },
  waveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 32,
  },
  bar: { width: 3, borderRadius: 2 },
  barActiveOwn: { backgroundColor: 'rgba(255,255,255,0.95)' },
  barInactiveOwn: { backgroundColor: 'rgba(255,255,255,0.3)' },
  barActiveOther: { backgroundColor: '#FF0059' },
  barInactiveOther: { backgroundColor: '#CBD5E1' },
  dur: { fontSize: 11, fontWeight: '600', minWidth: 32, textAlign: 'right' },
  durOwn: { color: 'rgba(255,255,255,0.85)' },
  durOther: { color: '#64748B' },
});
