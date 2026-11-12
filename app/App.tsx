import React from 'react';
import { Pressable, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DownloadListScreen } from './src/screens/DownloadListScreen';
import { DownloadDetailScreen } from './src/screens/DownloadDetailScreen';
import { AddDownloadScreen } from './src/screens/AddDownloadScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { colors } from './src/theme/tokens';
import { DownloadProvider } from './src/services/DownloadContext';

export type RootStackParamList = {
  List: undefined;
  Detail: { id: string };
  Add: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <DownloadProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="light" />
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
              headerTitleStyle: { fontWeight: '600' },
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen
              name="List"
              component={DownloadListScreen}
              options={({ navigation }) => ({
                title: 'Queora',
                headerRight: () => (
                  <Pressable
                    onPress={() => navigation.navigate('Settings')}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel="Settings"
                  >
                    <Text style={{ color: colors.accent, fontWeight: '600', marginRight: 4 }}>
                      Settings
                    </Text>
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen name="Detail" component={DownloadDetailScreen} options={{ title: 'Transfer' }} />
            <Stack.Screen name="Add" component={AddDownloadScreen} options={{ title: 'New download', presentation: 'modal' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
          </Stack.Navigator>
        </NavigationContainer>
      </DownloadProvider>
    </SafeAreaProvider>
  );
}
