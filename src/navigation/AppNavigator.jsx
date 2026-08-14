import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BrowserScreen } from '../screens/BrowserScreen';
import { TabManagerScreen } from '../screens/TabManagerScreen';
import { BookmarksScreen } from '../screens/BookmarksScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PrivacyScreen } from '../screens/PrivacyScreen';
import { FeedbackScreen } from '../screens/FeedbackScreen';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Browser"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Browser" component={BrowserScreen} />
      <Stack.Screen name="TabManager" component={TabManagerScreen} />
      <Stack.Screen name="Bookmarks" component={BookmarksScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
    </Stack.Navigator>
  );
};
