import AsyncStorage from '@react-native-async-storage/async-storage';
import {jwtDecode} from 'jwt-decode';
import {createContext, useEffect, useState} from 'react';
import 'core-js/stable/atob';
const AuthContext = createContext();
const AuthProvider = ({children}) => {
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [authUser, setAuthUser] = useState(
    AsyncStorage.getItem('token') || null,
  );

  useEffect(() => {
    const fetchUser = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      setToken(token);
      //  npm install jwt-decode core-js
      const decodedToken = jwtDecode(token);
      //   const userId = decodedToken.userId;
      //   setUserId(userId);
      setUserId(decodedToken.userId);
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
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export {AuthContext, AuthProvider}; //--> go to app.js for auth setup
