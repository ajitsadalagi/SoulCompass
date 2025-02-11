import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

// Add sorting function for admin listings
const sortProductsByAdminStatus = (products) => {
  return [...products].sort((a, b) => {
    const getAdminPriority = (product) => {
      const admin = product.admins?.[0];
      if (!admin) return 0;
      if (admin.adminType === 'super_admin' && admin.adminStatus === 'approved') return 2;
      if (admin.adminType === 'local_admin' && admin.adminStatus === 'approved') return 1;
      return 0;
    };
    return getAdminPriority(b) - getAdminPriority(a);
  });
};

// Add function to get card style based on admin status
const getCardStyle = (product) => {
  const admin = product.admins?.[0];
  if (!admin) return styles.productCard;

  if (admin.adminType === 'super_admin' && admin.adminStatus === 'approved') {
    return [styles.productCard, styles.superAdminCard];
  }
  if (admin.adminType === 'local_admin' && admin.adminStatus === 'approved') {
    return [styles.productCard, styles.localAdminCard];
  }
  return styles.productCard;
};

export default function ProductSearchScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [currentLocation, setCurrentLocation] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Denied',
            'Please enable location services to use nearby search features.',
            [{ text: 'OK' }]
          );
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          ...currentLocation,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        console.error('Error getting location:', error);
        Alert.alert(
          'Location Error',
          'Unable to get your current location. Using default location.',
          [{ text: 'OK' }]
        );
      }
    })();
  }, []);

  const searchProducts = async () => {
    try {
      const response = await fetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        // Sort products to show admin listings first
        const sortedProducts = sortProductsByAdminStatus(data);
        setProducts(sortedProducts);
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert(
        'Search Error',
        'Failed to search products. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderProduct = ({ item }) => (
    <TouchableOpacity 
      style={getCardStyle(item)}
      onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
    >
      <View style={styles.productInfo}>
        <Text style={[styles.productName, { color: '#16a34a' }]}>{item.name}</Text>
        <Text style={styles.productCategory}>{item.category}</Text>
        <Text style={styles.productPrice}>${item.targetPrice}</Text>
        <Text style={styles.sellerInfo}>
          Seller: <Text style={{ color: '#9333ea' }}>{item.sellerUsername}</Text>
        </Text>
        <Text style={styles.productLocation}>{item.city}, {item.state}</Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: item.latitude || currentLocation.latitude,
            longitude: item.longitude || currentLocation.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
          <Marker
            coordinate={{
              latitude: item.latitude || currentLocation.latitude,
              longitude: item.longitude || currentLocation.longitude,
            }}
          />
        </MapView>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={searchProducts}
        />
        <TouchableOpacity style={styles.searchButton} onPress={searchProducts}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.productList}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    padding: 16,
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  productList: {
    padding: 16,
  },
  productCard: {
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  // Add styles for admin cards
  superAdminCard: {
    borderWidth: 2,
    borderColor: '#8b5cf6', // violet-500
    shadowColor: '#c4b5fd', // violet-200
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  localAdminCard: {
    borderWidth: 2,
    borderColor: '#a855f7', // purple-500
    shadowColor: '#e9d5ff', // purple-200
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  productInfo: {
    padding: 16,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 4,
  },
  productLocation: {
    fontSize: 14,
    color: '#6b7280',
  },
  sellerInfo: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  mapContainer: {
    height: 150,
  },
  map: {
    flex: 1,
  },
});