// utils/socket.js — CLIENT SIDE ONLY
import { io } from 'socket.io-client'; // ← socket.io-client, not socket.io
import Config from 'react-native-config';

const API_BASE_URL = Config.API_BASE_URL || 'http://192.168.100.154:9000';

let socketInstance = null;

export const getSocket = token => {
  if (!socketInstance || !socketInstance.connected) {
    socketInstance = io(API_BASE_URL, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
  }
  return socketInstance;
};
