import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { RootStackScreenProps } from '../../types/navigation';

type Props = RootStackScreenProps<'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const [user, setUser] = useState<any>(null);
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/user');
        if (!response.ok) {
          if (response.status === 401) {
            navigation.replace('Auth');
            return;
          }
          throw new Error('Failed to fetch user data');
        }
        const data = await response.json();
        setUser(data);
        if (data.roles.includes('seller')) {
          await fetchUserProducts();
        }
      } catch (error) {
        console.error('Profile load error:', error);
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndLoadData();
  }, [navigation]);

  const fetchUserProducts = async () => {
    try {
      const response = await fetch('/api/products/seller');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      setUserProducts(data);
    } catch (error) {
      console.error('Failed to fetch user products:', error);
      Alert.alert('Error', 'Failed to load products');
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        navigation.replace('Auth');
      }
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const handleEditProduct = (product: any) => {
    navigation.navigate('ProductListing', { product });
  };

  const handleDeleteProduct = async (productId: number) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`/api/products/${productId}`, {
                method: 'DELETE',
              });
              if (response.ok) {
                await fetchUserProducts();
                Alert.alert('Success', 'Product deleted successfully');
              } else {
                throw new Error('Failed to delete product');
              }
            } catch (error) {
              console.error('Failed to delete product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => navigation.replace('Profile')}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Username</Text>
          <Text style={styles.value}>{user.username}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Roles</Text>
          <View style={styles.roleContainer}>
            {user.roles.map((role: string, index: number) => (
              <View key={index} style={styles.roleTag}>
                <Text style={styles.roleText}>{role}</Text>
              </View>
            ))}
          </View>
        </View>

        {user.adminType && user.adminType !== 'none' && (
          <View style={styles.section}>
            <Text style={styles.label}>Admin Type</Text>
            <Text style={styles.value}>{user.adminType}</Text>
          </View>
        )}

        {user.roles.includes('seller') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Products</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('ProductListing', { product: null })}
            >
              <Text style={styles.addButtonText}>+ Add New Product</Text>
            </TouchableOpacity>
            {userProducts.map((product: any) => (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productDetail}>Quantity: {product.quantity}</Text>
                  <Text style={styles.productDetail}>Price: ₹{product.targetPrice}</Text>
                  <Text style={styles.timestamp}>
                    Listed on: {format(new Date(product.createdAt), 'PPp')}
                  </Text>
                </View>
                <View style={styles.productActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => handleEditProduct(product)}
                  >
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteProduct(product.id)}
                  >
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  header: {
    padding: 20,
    backgroundColor: '#f4f4f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#18181b',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#18181b',
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#18181b',
  },
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  roleTag: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    color: '#0284c7',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#22c55e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  productCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  productInfo: {
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#18181b',
  },
  productDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  productActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButton: {
    backgroundColor: '#3b82f6',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    margin: 20,
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});