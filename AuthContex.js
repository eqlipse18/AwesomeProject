import AsyncStorage from '@react-native-async-storage/async-storage';

import { createContext, useEffect, useState } from 'react';

import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [profileComplete, setProfileComplete] = useState(null);
  const [token, setToken] = useState(null); // initially null
  const [userId, setUserId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // loading flag
  const [userInfo, setUserInfo] = useState(null);
  const [authUser, setAuthUser] = useState(null);

  // ════════════════════════════════════════════════════════════════════════════
  // FETCH STORED TOKEN & USERID ON APP START
  // ════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setAuthLoading(true);

        // Fetch token from AsyncStorage
        const storedToken = await AsyncStorage.getItem('token');
        // Fetch userId from AsyncStorage (NEW!)
        const storedUserId = await AsyncStorage.getItem('userId');
        // Fetch profileComplete from AsyncStorage
        const storedProfileComplete = await AsyncStorage.getItem(
          'profileComplete',
        );

        if (storedToken) {
          setToken(storedToken);

          // Decode token to get userId (fallback if not in storage)
          const decodedToken = jwtDecode(storedToken);
          const decodedUserId = decodedToken.sub || decodedToken.userId;

          // Use stored userId if available, otherwise use decoded userId
          const userIdToSet = storedUserId || decodedUserId;
          setUserId(userIdToSet);

          console.log('[AuthContext] Token restored. userId:', userIdToSet);

          if (storedProfileComplete !== null) {
            console.log(
              '[AuthContext] storedProfileComplete:',
              storedProfileComplete,
            );
            setProfileComplete(JSON.parse(storedProfileComplete));
          }
        }
      } catch (err) {
        console.log('Error fetching token:', err);
      } finally {
        setAuthLoading(false);
      }
    };

    fetchUser();
  }, []);

  // ════════════════════════════════════════════════════════════════════════════
  // WHEN TOKEN CHANGES, EXTRACT & STORE USERID
  // ════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const updateUserIdFromToken = async () => {
      if (token) {
        try {
          // Decode token to get userId
          const decodedToken = jwtDecode(token);
          const extractedUserId = decodedToken.sub || decodedToken.userId;

          if (extractedUserId) {
            setUserId(extractedUserId);
            // Store userId in AsyncStorage
            await AsyncStorage.setItem('userId', extractedUserId);
            console.log(
              '[AuthContext] Stored userId in AsyncStorage:',
              extractedUserId,
            );
          }
        } catch (err) {
          console.error('[AuthContext] Error decoding token:', err);
        }
      }
    };

    updateUserIdFromToken();
  }, [token]);

  // ════════════════════════════════════════════════════════════════════════════
  // SIGN OUT - CLEAR TOKEN & USERID
  // ════════════════════════════════════════════════════════════════════════════

  const signOut = async () => {
    try {
      // Clear token, userId, and profileComplete from AsyncStorage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('userId'); // Clear userId (NEW!)
      await AsyncStorage.removeItem('profileComplete');

      // Clear state
      setToken(null);
      setUserId(null); // Clear userId state (NEW!)
      setProfileComplete(null);

      console.log('[AuthContext] Signed out. Cleared token and userId.');
    } catch (err) {
      console.error('[AuthContext] Error during sign out:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        setToken,
        userId, // ← Now available!
        setUserId,
        authUser,
        setAuthUser,
        userInfo,
        setUserInfo,
        authLoading, // provide loading state
        profileComplete,
        setProfileComplete,
        signOut, // ← Provide sign out method
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
