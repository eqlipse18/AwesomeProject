import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import NitroSound from 'react-native-nitro-sound';

const fmtMs = ms => {
  const total = Math.max(0, Math.floor((ms || 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const makeFakeBars = (n = 30) =>
  Array.from(
    { length: n },
    (_, i) => ((Math.sin(i * 2.1) + Math.sin(i * 0.7) + 2) / 4) * 0.7 + 0.15,
  );

// Dynamic width based on duration
// Short: <10s → 140px, Medium: 10-30s → 200px, Long: >30s → 260px
const getBubbleWidth = durationMs => {
  const sec = Math.floor((durationMs || 0) / 1000);
  if (sec < 10) return 150;
  if (sec < 30) return 210;
  return 260;
};

// How many bars to show based on width
const getBarsToShow = width => Math.floor((width - 80) / 5);

export const VoiceMessageBubble = ({ message, isOwn }) => {
  const uri = message.content;
  const totalMs = message.duration || 0;
  const allBars =
    message.waveform?.length > 0 ? message.waveform : makeFakeBars(50);

  const bubbleW = getBubbleWidth(totalMs);
  const maxBarsVisible = getBarsToShow(bubbleW);
  const isLong = allBars.length > maxBarsVisible; // needs scroll

  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const isPlayingRef = useRef(false);
  const waveScrollRef = useRef(null);

  const progress = totalMs > 0 ? currentMs / totalMs : 0;
  const activeBars = Math.floor(progress * allBars.length);
  const displayMs = playing && currentMs > 0 ? currentMs : totalMs;

  // Auto scroll waveform as playing
  useEffect(() => {
    if (!playing || !isLong) return;
    const scrollWidth = allBars.length * 5;
    const targetX = progress * scrollWidth;
    waveScrollRef.current?.scrollTo({ x: targetX, animated: false });
  }, [currentMs, playing, isLong, progress, allBars.length]);

  const stopPlay = useCallback(async () => {
    try {
      NitroSound.removePlayBackListener();
      await NitroSound.stopPlayer();
    } catch {}
    isPlayingRef.current = false;
    setPlaying(false);
    setCurrentMs(0);
    // Scroll back to start
    waveScrollRef.current?.scrollTo({ x: 0, animated: true });
  }, []);

  const togglePlay = useCallback(async () => {
    if (playing) {
      await stopPlay();
      return;
    }
    try {
      isPlayingRef.current = true;
      setPlaying(true);
      await NitroSound.startPlayer(uri);
      NitroSound.addPlayBackListener(e => {
        if (!isPlayingRef.current) return;
        setCurrentMs(e.currentPosition || 0);
        if (e.currentPosition >= (e.duration || totalMs) - 150) {
          NitroSound.removePlayBackListener();
          isPlayingRef.current = false;
          setPlaying(false);
          setCurrentMs(0);
          waveScrollRef.current?.scrollTo({ x: 0, animated: true });
        }
      });
    } catch (e) {
      console.error('[VoicePlayback]', e.message);
      setPlaying(false);
      isPlayingRef.current = false;
    }
  }, [playing, uri, totalMs, stopPlay]);

  useEffect(() => {
    return () => {
      if (isPlayingRef.current) {
        NitroSound.stopPlayer().catch(() => {});
        NitroSound.removePlayBackListener();
      }
    };
  }, []);

  return (
    <View style={[s.wrap, { width: bubbleW }]}>
      {/* Play/Pause */}
      <TouchableOpacity
        onPress={togglePlay}
        style={[s.playBtn, isOwn ? s.playBtnOwn : s.playBtnOther]}
        activeOpacity={0.75}
      >
        <Text style={[s.playIco, isOwn && s.playIcoOwn]}>
          {playing ? '⏸' : '▶'}
        </Text>
      </TouchableOpacity>

      {/* Right section */}
      <View style={s.right}>
        {/* Waveform — scrollable for long, static for short */}
        {isLong ? (
          <ScrollView
            ref={waveScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false} // auto scroll only — no manual
            style={s.waveScroll}
            contentContainerStyle={s.waveContent}
          >
            {allBars.map((h, i) => {
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
          </ScrollView>
        ) : (
          <View style={s.waveStatic}>
            {allBars.slice(0, maxBarsVisible).map((h, i) => {
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
        )}

        {/* Duration */}
        <Text style={[s.dur, isOwn ? s.durOwn : s.durOther]}>
          {fmtMs(displayMs)}
        </Text>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
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

  right: { flex: 1, gap: 3 },

  // Static waveform
  waveStatic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 30,
  },

  // Scrollable waveform
  waveScroll: { height: 30 },
  waveContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  bar: { width: 3, borderRadius: 2 },
  barActiveOwn: { backgroundColor: 'rgba(255,255,255,0.95)' },
  barInactiveOwn: { backgroundColor: 'rgba(255,255,255,0.3)' },
  barActiveOther: { backgroundColor: '#FF0059' },
  barInactiveOther: { backgroundColor: '#CBD5E1' },

  dur: { fontSize: 11, fontWeight: '600' },
  durOwn: { color: 'rgba(255,255,255,0.75)' },
  durOther: { color: '#64748B' },
});
