import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

// Import screens
import HomeScreen from './src/pages/mobile/home-screen';
import AuthScreen from './src/pages/mobile/auth-screen';
import ProductListingScreen from './src/pages/mobile/product-listing-screen';
import ProductSearchScreen from './src/pages/mobile/product-search-screen';
import ProfileScreen from './src/pages/mobile/profile-screen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator 
            initialRouteName="Auth"
            screenOptions={{
              headerStyle: {
                backgroundColor: '#3b82f6',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          >
            <Stack.Screen 
              name="Auth" 
              component={AuthScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Home" 
              component={HomeScreen}
              options={{ title: 'Universal Marketplace' }}
            />
            <Stack.Screen 
              name="ProductListing" 
              component={ProductListingScreen}
              options={{ title: 'List a Product' }}
            />
            <Stack.Screen 
              name="ProductSearch" 
              component={ProductSearchScreen}
              options={{ title: 'Search Products' }}
            />
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen}
              options={{ title: 'My Profile' }}
            />
          </Stack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}