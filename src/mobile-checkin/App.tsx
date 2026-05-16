import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import WorkshopListScreen from './src/screens/WorkshopListScreen';
import AttendeeListScreen from './src/screens/AttendeeListScreen';
import CheckinScannerScreen from './src/screens/CheckinScannerScreen';
import LoginScreen from './src/screens/LoginScreen';
import SyncManager from './src/components/SyncManager';
import { initDB } from './src/api/offlineDb';
import { useAuthStore } from './src/store/useAuthStore';

export type RootStackParamList = {
  Login: undefined;
  WorkshopList: undefined;
  AttendeeList: { workshopId: string; workshopTitle: string };
  CheckinScanner: { workshopId?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    try {
      initDB();
    } catch (e) {
      console.error('Failed to init DB:', e);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {token && <SyncManager />}
        <Stack.Navigator
          initialRouteName={token ? "WorkshopList" : "Login"}
          screenOptions={{
            headerStyle: { backgroundColor: '#F8FAFC' },
            headerTintColor: '#0F172A',
            headerTitleStyle: { fontWeight: '600' },
            headerShadowVisible: false,
          }}
        >
          {!token ? (
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
              options={{ headerShown: false }} 
            />
          ) : (
            <>
              <Stack.Screen 
                name="WorkshopList" 
                component={WorkshopListScreen} 
                options={{ title: 'Check-in Portal' }} 
              />
              <Stack.Screen 
                name="AttendeeList" 
                component={AttendeeListScreen} 
                options={({ route }) => ({ title: route.params.workshopTitle })} 
              />
              <Stack.Screen 
                name="CheckinScanner" 
                component={CheckinScannerScreen} 
                options={{ title: 'Quét mã QR', headerBackTitle: 'Back' }} 
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
