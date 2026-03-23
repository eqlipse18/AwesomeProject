/**
 * useSwipeStackHook — with expandSearch support
 *
 * New returns:
 *   expandedTo        — null | number (km) — feed was auto-expanded to this radius
 *   originalDistance  — what user set
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://192.168.100.154:9000';

const createApiClient = token =>
  axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });

export function useSwipeStack({ token, filters = {} }) {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [matchData, setMatchData] = useState(null);
  const [showMatchNotification, setShowMatchNotification] = useState(false);

  // ✅ Expand state — shown as toast/banner in HomeScreen
  const [expandedTo, setExpandedTo] = useState(null);
  const [originalDistance, setOriginalDistance] = useState(null);

  const loadedUserIds = useRef(new Set());
  const apiClient = useRef(null);
  const isLoadingMore = useRef(false);
  const currentIndex = useRef(0);

  const [activeFilters, setActiveFilters] = useState(filters);

  useEffect(() => {
    if (token) apiClient.current = createApiClient(token);
  }, [token]);

  // ════════════════════════════════════════════════════════════════════════
  // fetchFeed
  // ════════════════════════════════════════════════════════════════════════

  const fetchFeed = useCallback(
    async (cursor = null, isInitial = false) => {
      if (!apiClient.current) {
        setError('Not authenticated');
        return;
      }
      try {
        if (isInitial) setLoading(true);
        setError(null);
        if (isInitial) setExpandedTo(null); // reset on new fetch

        const limit = isInitial ? 50 : 20;

        const params = {
          limit,
          ...(cursor && { cursor }),
          ...(activeFilters.ageMin != null && { minAge: activeFilters.ageMin }),
          ...(activeFilters.ageMax != null && { maxAge: activeFilters.ageMax }),
          ...(activeFilters.distance != null && {
            distance: activeFilters.distance,
          }),
          // showMe sirf tab bhejo jab actual value ho — null/undefined skip
          ...(activeFilters.showMe &&
            activeFilters.showMe !== 'null' && {
              showMe: activeFilters.showMe,
            }),
          ...(activeFilters.verifiedOnly && { verifiedOnly: 'true' }),
          ...(activeFilters.goals?.length && {
            goals: activeFilters.goals.join(','),
          }),
          expandSearch: String(activeFilters.expandSearch ?? true),
          ...(activeFilters.customLat != null && {
            customLat: activeFilters.customLat,
          }),
          ...(activeFilters.customLng != null && {
            customLng: activeFilters.customLng,
          }),
        };

        const response = await apiClient.current.get('/feed', { params });
        if (!response.data.success)
          throw new Error(response.data.error || 'Failed to fetch feed');

        const newUsers = response.data.users || [];
        const uniqueUsers = newUsers.filter(
          u => !loadedUserIds.current.has(u.userId),
        );
        uniqueUsers.forEach(u => loadedUserIds.current.add(u.userId));

        setFeed(prev => {
          const updated = !cursor ? uniqueUsers : [...prev, ...uniqueUsers];
          console.log('[useSwipeStack] Feed updated. Cards:', updated.length);
          return updated;
        });

        setNextCursor(response.data.nextCursor || null);

        // ✅ Store expand info for HomeScreen banner
        if (response.data.expandedTo) {
          setExpandedTo(response.data.expandedTo);
          setOriginalDistance(response.data.originalDistance);
          console.log(
            `[useSwipeStack] 📍 Expanded from ${response.data.originalDistance}km → ${response.data.expandedTo}km`,
          );
        }

        if (isInitial) setIsInitialLoading(false);
        return { success: true, count: uniqueUsers.length };
      } catch (err) {
        const msg = err.response?.data?.error || err.message || 'Unknown error';
        setError(msg);
        console.error('[useSwipeStack] Fetch error:', msg);
        return { success: false, error: msg };
      } finally {
        setLoading(false);
      }
    },
    [activeFilters],
  );

  // ── Initial load + filter change trigger ──
  useEffect(() => {
    if (!token) return;
    loadedUserIds.current.clear();
    setFeed([]);
    setNextCursor(null);
    setIsInitialLoading(true);
    currentIndex.current = 0;
    fetchFeed(null, true);
  }, [token, activeFilters, fetchFeed]);

  // ── Silent pagination ──
  const checkAndLoadMore = useCallback(
    index => {
      currentIndex.current = index;
      const shouldLoad =
        (index === 45 || (index - 5) % 20 === 0) &&
        !isLoadingMore.current &&
        nextCursor;

      if (shouldLoad) {
        isLoadingMore.current = true;
        fetchFeed(nextCursor, false).finally(() => {
          isLoadingMore.current = false;
        });
      }
    },
    [nextCursor, fetchFeed],
  );

  // ── Manual refetch ──
  const refetchFeed = useCallback(async () => {
    loadedUserIds.current.clear();
    setFeed([]);
    setNextCursor(null);
    setIsInitialLoading(true);
    currentIndex.current = 0;
    return fetchFeed(null, true);
  }, [fetchFeed]);

  // ── handleSwipe ──
  const handleSwipe = useCallback(
    async (likedId, type) => {
      if (!apiClient.current)
        return { success: false, error: 'Not authenticated' };
      if (!['like', 'superlike', 'pass'].includes(type))
        return { success: false, error: 'Invalid swipe type' };
      try {
        setError(null);
        const response = await apiClient.current.post('/swipe', {
          likedId,
          type,
        });
        if (!response.data.success)
          throw new Error(response.data.error || 'Failed to process swipe');
        checkAndLoadMore(currentIndex.current + 1);
        if (response.data.match) {
          setMatchData({ matchId: response.data.matchId, likedId, type });
          setShowMatchNotification(true);
          setTimeout(() => setShowMatchNotification(false), 4000);
        }
        return {
          success: true,
          match: response.data.match,
          matchId: response.data.matchId,
          likedId,
        };
      } catch (err) {
        const msg = err.response?.data?.error || err.message || 'Unknown error';
        setError(msg);
        return { success: false, error: msg };
      }
    },
    [checkAndLoadMore],
  );

  // ── updateFilters — only trigger ──
  const updateFilters = useCallback(newFilters => {
    setActiveFilters(newFilters);
    loadedUserIds.current.clear();
    setFeed([]);
    setNextCursor(null);
    setIsInitialLoading(true);
    currentIndex.current = 0;
  }, []);

  // ── dismissExpand — user dismissed the expand banner ──
  const dismissExpand = useCallback(() => {
    setExpandedTo(null);
    setOriginalDistance(null);
  }, []);

  const dismissMatch = useCallback(() => {
    setShowMatchNotification(false);
    setMatchData(null);
  }, []);

  return {
    feed,
    loading,
    error,
    isInitialLoading,
    hasMore: !!nextCursor,
    fetchFeed,
    refetchFeed,
    handleSwipe,
    updateFilters,
    checkAndLoadMore,
    matchData,
    showMatchNotification,
    dismissMatch,
    // ✅ expand state
    expandedTo,
    originalDistance,
    dismissExpand,
    feedLength: feed.length,
    isInitialized: feed.length > 0,
  };
}

export function useMatches({ token }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const apiClient = useRef(null);

  useEffect(() => {
    if (token) apiClient.current = createApiClient(token);
  }, [token]);

  const fetchMatches = useCallback(async () => {
    if (!apiClient.current) {
      setError('Not authenticated');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.current.get('/matches');
      if (!response.data.success)
        throw new Error(response.data.error || 'Failed to fetch matches');
      setMatches(response.data.matches || []);
      return { success: true, count: response.data.matches?.length || 0 };
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Unknown error';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchMatches();
  }, [token, fetchMatches]);

  return {
    matches,
    loading,
    error,
    refetch: fetchMatches,
    count: matches.length,
  };
}
