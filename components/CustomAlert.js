// CustomAlert.js
import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, Animated } from 'react-native';

const CustomAlert = ({ visible, title, message, onClose }) => {
  const [scale] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 12,
        stiffness: 150,
      }).start();
    } else {
      scale.setValue(0);
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}
      >
        <Animated.View
          style={{
            width: 300,
            padding: 20,
            borderRadius: 15,
            backgroundColor: '#fff',
            transform: [{ scale }],
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 5 },
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 10 }}>
            {title}
          </Text>
          <Text style={{ fontSize: 16, color: '#555', marginBottom: 20 }}>
            {message}
          </Text>
          <Pressable
            onPress={onClose}
            style={{
              alignSelf: 'flex-end',
              paddingHorizontal: 15,
              paddingVertical: 8,
              backgroundColor: '#ff0090',
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>OK</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default CustomAlert;
