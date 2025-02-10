import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
  ProductListing: { product?: any };
  ProductSearch: undefined;
  Profile: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = 
  NativeStackScreenProps<RootStackParamList, T>;

export type NavigationProps = {
  navigation: RootStackScreenProps<keyof RootStackParamList>['navigation'];
};
