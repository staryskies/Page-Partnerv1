const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

module.exports = router;

// filepath: c:\Users\Yichen zuo\Downloads\Artemis-main\Page-Partnerv1\src\server.js
const authRoutes = require('./routes/auth');

// Add auth routes
app.use('/api/auth', authRoutes);

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WebView from 'react-native-webview';
import LoginScreen from './screens/LoginScreen';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkLoginStatus = async () => {
      const token = await AsyncStorage.getItem('userToken');
      setIsLoggedIn(!!token);
    };
    checkLoginStatus();
  }, []);

  const handleLogin = async (username, password) => {
    try {
      const response = await fetch('https://page-partnerv1.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid username or password');
      }

      const data = await response.json();
      await AsyncStorage.setItem('userToken', data.token);
      setIsLoggedIn(true);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <View style={styles.container}>
      {isLoggedIn ? (
        <WebView source={{ uri: 'https://page-partnerv1.onrender.com/' }} />
      ) : (
        <LoginScreen onLogin={handleLogin} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});