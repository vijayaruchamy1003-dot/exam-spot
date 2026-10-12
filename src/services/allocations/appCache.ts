import AsyncStorage from '@react-native-async-storage/async-storage';
import { AllocationCache } from '@/services/allocations/cache';

export const appCache = new AllocationCache(AsyncStorage);
