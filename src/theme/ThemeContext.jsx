import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { colors } from './colors';
import { StorageManager } from '../services/StorageManager';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState('dark'); // Default to dark

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await StorageManager.get('theme_preference', 'dark');
      setThemeModeState(savedTheme);
    };
    loadTheme();
  }, []);

  const setThemeMode = async (mode) => {
    setThemeModeState(mode);
    await StorageManager.save('theme_preference', mode);
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
