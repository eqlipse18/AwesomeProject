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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setAuthLoading(true);

        const storedToken = await AsyncStorage.getItem('token');
        const storedProfileComplete = await AsyncStorage.getItem(
          'profileComplete',
        );

        if (storedToken) {
          setToken(storedToken);

          const decodedToken = jwtDecode(storedToken);

          setUserId(decodedToken.sub);

          if (storedProfileComplete !== null) {
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
  return (
    <AuthContext.Provider
      value={{
        token,
        setToken,
        userId,
        setUserId,
        authUser,
        setAuthUser,
        userInfo,
        setUserInfo,
        authLoading, // provide loading state
        profileComplete,
        setProfileComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
