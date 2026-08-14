import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './src/theme/ThemeContext';
import { TabProvider } from './src/context/TabContext';
import { AppNavigator } from './src/navigation/AppNavigator';

function SplashScreenComponent({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2500); // Display splash for 2.5 seconds
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.splashContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0516" />
      <Image
        source={require('./assets/splash.png')}
        style={styles.splashImage}
        resizeMode="contain"
      />
    </View>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <TabProvider>
          {showSplash ? (
            <SplashScreenComponent onFinish={() => setShowSplash(false)} />
          ) : (
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          )}
        </TabProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#0A0516',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashImage: {
    width: '100%',
    height: '100%',
  },
});

