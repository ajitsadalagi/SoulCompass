import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

// Define proper types
interface Product {
  id: number;
  name: string;
  category: string;
  targetPrice: number;
  quantity: number;
  quality: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  listingType: 'buyer' | 'seller';
  sellerUsername: string;
  sellerAdminType?: 'super_admin' | 'local_admin';
  sellerAdminStatus?: 'approved' | 'pending' | 'rejected';

}

// Sort products to show admin listings first
const sortProductsByAdminStatus = (products: Product[]) => {
  return [...products].sort((a, b) => {
    const getAdminPriority = (product: Product) => {
      if (!product.sellerAdminStatus) return 0;
      if (product.sellerAdminType === 'super_admin' && product.sellerAdminStatus === 'approved') return 2;
      if (product.sellerAdminType === 'local_admin' && product.sellerAdminStatus === 'approved') return 1;
      return 0;
    };
    return getAdminPriority(b) - getAdminPriority(a);
  });
};

const getTextStyle = (product: Product, isTitle = false) => {
  const baseStyle = {
    fontSize: isTitle ? 18 : 14,
    fontWeight: isTitle ? '700' : '400' as const,
    marginBottom: 4,
  };

  if (!product.listingType) return { ...baseStyle, color: '#16a34a' };

  return {
    ...baseStyle,
    color: product.listingType === 'buyer' ? '#dc2626' : '#16a34a',
  };
};

const ProductCard = ({ item, onPress }: { item: Product; onPress: () => void }) => {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shadowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(shadowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(shadowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ]),
      ])
    ).start();
  }, []);

  const getCardStyle = () => {
    const isBuyerListing = item.listingType === 'buyer';
    const sellerAdminType = item.sellerAdminType;
    const sellerAdminStatus = item.sellerAdminStatus;
    const isApprovedAdmin = sellerAdminStatus === 'approved';

    const baseStyle = {
      ...styles.productCard,
      borderWidth: 2,
    };

    if (isApprovedAdmin && sellerAdminType === 'super_admin') {
      const glowColor = isBuyerListing ? 'rgba(239, 68, 68, ' : 'rgba(34, 197, 94, ';
      return {
        ...baseStyle,
        borderColor: isBuyerListing ? '#ef4444' : '#22c55e',
        backgroundColor: isBuyerListing ? '#fef2f2' : '#f0fdf4',
        transform: [
          { scale: 1.02 },
          {
            translateY: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -2],
            }),
          },
        ],
        shadowColor: isBuyerListing ? '#ef4444' : '#22c55e',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: shadowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.3, 0.8],
        }),
        shadowRadius: shadowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [4, 12],
        }),
        elevation: shadowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [6, 12],
        }),
      };
    }

    if (isApprovedAdmin && sellerAdminType === 'local_admin') {
      const glowColor = isBuyerListing ? 'rgba(239, 68, 68, ' : 'rgba(34, 197, 94, ';
      return {
        ...baseStyle,
        borderColor: isBuyerListing ? '#f87171' : '#4ade80',
        backgroundColor: isBuyerListing ? '#fff1f2' : '#f0fdf4',
        transform: [
          { scale: 1.01 },
          {
            translateY: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -1],
            }),
          },
        ],
        shadowColor: isBuyerListing ? '#f87171' : '#4ade80',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: shadowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.2, 0.6],
        }),
        shadowRadius: shadowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [3, 8],
        }),
        elevation: shadowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [4, 8],
        }),
      };
    }

    // Regular listing styles based on type
    return {
      ...baseStyle,
      borderColor: isBuyerListing ? '#dc2626' : '#16a34a',
      backgroundColor: '#fff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    };
  };

  return (
    <Animated.View style={getCardStyle()}>
      <TouchableOpacity onPress={onPress}>
        <View style={styles.productInfo}>
          <Text style={[styles.title, getTextStyle(item, true)]}>{item.name}</Text>
          <Text style={getTextStyle(item)}>{item.category}</Text>
          <Text style={getTextStyle(item)}>₹{item.targetPrice}</Text>
          <Text style={getTextStyle(item)}>
            Quantity: {item.quantity}
          </Text>
          <Text style={getTextStyle(item)}>
            Quality: {item.quality}
          </Text>
          <Text style={getTextStyle(item)}>
            Seller: {item.sellerUsername}
          </Text>
          <Text style={getTextStyle(item)}>{item.city}, {item.state}</Text>
        </View>

        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: item.latitude,
              longitude: item.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
          >
            <Marker
              coordinate={{
                latitude: item.latitude,
                longitude: item.longitude,
              }}
            />
          </MapView>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ProductSearchScreen({ navigation }: { navigation: any }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
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
        renderItem={({ item }) => (
          <ProductCard
            item={item}
            onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
          />
        )}
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
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  productInfo: {
    padding: 16,
  },
  mapContainer: {
    height: 150,
  },
  map: {
    flex: 1,
  },
});