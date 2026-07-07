import { Coffee, Order, DailySales, UserProfile } from './types';

export const COFFEES: Coffee[] = [
  {
    id: 'COF-HARAR-001',
    name: 'Harar Longberry',
    description: 'Fruit-forward Ethiopian whole bean coffee with winey notes and a smooth finish.',
    price: 5.5,
    category: 'Whole Bean',
    image: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=900&q=80',
    origin: 'Harar, Ethiopia',
    regionStory: 'A classic eastern Ethiopian profile associated with dry processing and deep fruit character.',
    roast: 'Medium',
    tags: ['harar', 'whole bean', 'fruity', 'ethiopian'],
    flavorProfile: { sweetness: 8, acidity: 6, body: 7, floral: 4, nutty: 5 },
    availableBrewMethods: ['Jebena', 'Filter', 'French Press']
  },
  {
    id: 'BEV-MAC-003',
    name: 'Macchiato',
    description: 'Tomoca-style espresso with steamed milk.',
    price: 1.75,
    category: 'Beverage',
    image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=900&q=80',
    origin: 'House Blend',
    roast: 'Dark',
    tags: ['macchiato', 'espresso', 'milk', 'breakfast'],
    isBreakfast: true,
    isLunch: true,
    availableBrewMethods: ['Espresso']
  }
];

export const USER_PROFILE: UserProfile = {
  id: 'USER-Admin',
  name: 'Demo Admin',
  email: 'admin@tomoca.com',
  role: 'Admin',
  walletBalance: 450.00,
  loyaltyPoints: 1250,
  driverProfile: {
    id: 'USER-Driver',
    name: 'Demo Driver',
    status: 'Available',
    currentLocation: { lat: 9.0222, lng: 38.7468 },
    vehicleType: 'Car',
    rating: 4.8,
    totalEarnings: 450.00
  }
};

export const MOCK_ORDERS: Order[] = [];

export const SALES_DATA: DailySales[] = [];
