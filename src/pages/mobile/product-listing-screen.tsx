import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App.native';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductListing'>;

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  quality: z.string().min(1, 'Quality description is required'),
  targetPrice: z.number().min(0, 'Price must be positive'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  condition: z.enum(['new', 'used', 'perishable']),
  category: z.enum(['fruits', 'vegetables', 'dairy', 'other']),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function ProductListingScreen({ route, navigation }: Props) {
  const editProduct = route.params?.product;
  const [adminSearchQuery, setAdminSearchQuery] = useState('');

  const { control, handleSubmit, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: editProduct ? {
      name: editProduct.name,
      quantity: editProduct.quantity,
      quality: editProduct.quality,
      targetPrice: Number(editProduct.targetPrice),
      city: editProduct.city,
      state: editProduct.state,
      condition: editProduct.condition,
      category: editProduct.category,
    } : {
      name: '',
      quantity: 1,
      quality: '',
      targetPrice: 0,
      city: '',
      state: '',
      condition: 'new',
      category: 'other',
    }
  });

  const onSubmit = async (data: ProductFormData) => {
    try {
      const endpoint = editProduct ? `/api/products/${editProduct.id}` : '/api/products';
      const method = editProduct ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (response.ok) {
        navigation.navigate('Profile');
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to save product');
      }
    } catch (error) {
      console.error('Product submission error:', error);
      Alert.alert('Error', 'Failed to connect to server');
    }
  };

  // Function to search admins
  const searchAdmins = () => {
    // This will trigger searching for admins based on the adminSearchQuery
    Alert.alert('Searching', `Searching for admins with query: ${adminSearchQuery}`);
    // Actual implementation would go here
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>{editProduct ? 'Edit Product' : 'List New Product'}</Text>

        {/* Add Admin Search Section */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for local admins..."
            value={adminSearchQuery}
            onChangeText={setAdminSearchQuery}
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={searchAdmins}
          >
            <Text style={styles.searchButtonText}>Search Admins</Text>
          </TouchableOpacity>
        </View>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Product Name</Text>
              <TextInput
                style={styles.input}
                onChangeText={onChange}
                value={value}
                placeholder="Enter product name"
              />
              {errors.name && (
                <Text style={styles.errorText}>{errors.name.message}</Text>
              )}
            </View>
          )}
        />
        {/* Other input fields would go here */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit(onSubmit)}
        >
          <Text style={styles.submitButtonText}>
            {editProduct ? 'Update Product' : 'Create Product'}
          </Text>
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
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#18181b',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  searchButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#18181b',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});