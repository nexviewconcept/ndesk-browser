import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { colors } from './colors';
import { PreferenceStorage } from '../services/StorageManager';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState('light'); // Default to light

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await PreferenceStorage.get('theme_preference', 'light');
      setThemeModeState(savedTheme);
    };
    loadTheme();
  }, []);

  const setThemeMode = async (mode) => {
    setThemeModeState(mode);
    await PreferenceStorage.save('theme_preference', mode);
  };

  // Determine if active mode is dark
  const isDark = themeMode === 'system' 
    ? systemColorScheme === 'dark' 
    : themeMode === 'dark';

  const theme = isDark ? colors.dark : colors.light;

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, theme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export { colors } from './colors';
export { typography } from './typography';
