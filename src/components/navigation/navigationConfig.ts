import {
  ShoppingBag, Package, Users, Store, MapPin, Tag,
  BarChart3, Shield, Settings, Clock, Utensils,
  Truck, History, User, ShoppingCart, CreditCard,
  Bell, Calendar, Home
} from 'lucide-react';
import { NavigationConfig, NavigationTheme } from './navigation-types';

export const navigationConfig: NavigationConfig = {
  CUSTOMER: [
    // {
    //   href: '/',
    //   label: 'Home',
    //   icon: Home,
    // },
    {
      href: '/vendors',
      label: 'Browse Vendors',
      icon: ShoppingBag,
    },
    {
      href: '/orders',
      label: 'Orders',
      icon: Package,
    },
    // {
    //   href: '/cart',
    //   label: 'Cart',
    //   icon: ShoppingCart,
    //   badge: true,
    // },
    {
      label: 'My Account',
      icon: User,
      children: [
        {
          href: '/profile',
          label: 'Profile',
          icon: User,
        },
        {
          href: '/profile/addresses',
          label: 'Addresses',
          icon: MapPin,
        },
        // {
        //   href: '/orders',
        //   label: 'Order History',
        //   icon: History,
        // },
        {
          href: '/notifications',
          label: 'Notifications',
          icon: Bell,
        },
      ],
    },
  ],

  SUPER_ADMIN: [
    {
      href: '/admin/dashboard',
      label: 'Dashboard',
      icon: BarChart3,
    },
    {
      href: '/vendors',
      label: 'Browse Vendors',
      icon: ShoppingBag,
    },
    {
      label: 'Management',
      icon: Settings,
      children: [
        {
          href: '/admin/users',
          label: 'Users',
          icon: Users,
          description: 'Manage all platform users',
        },
        {
          href: '/admin/vendors',
          label: 'Vendors',
          icon: Store,
          description: 'Manage vendor accounts',
        },
        {
          href: '/admin/delivery-partners',
          label: 'Delivery Partners',
          icon: Truck,
          description: 'Manage delivery partners',
        },
        {
          href: '/admin/products',
          label: 'Products',
          icon: Package,
          description: 'Manage all products',
        },
      ],
    },
    {
      label: 'Orders',
      icon: ShoppingCart,
      children: [
        {
          href: '/admin/orders',
          label: 'All Orders',
          icon: ShoppingCart,
        },
        {
          href: '/admin/orders?status=PENDING',
          label: 'Pending Orders',
          icon: Clock,
        },
        {
          href: '/admin/orders?status=DELIVERED',
          label: 'Completed Orders',
          icon: Package,
        },
      ],
    },
    {
      label: 'Configuration',
      icon: Settings,
      children: [
        {
          href: '/admin/service-areas',
          label: 'Service Areas',
          icon: MapPin,
        },
        {
          href: '/admin/categories',
          label: 'Categories',
          icon: Tag,
        },
        {
          href: '/admin/default-meal-slots',
          label: 'Default Meal Slots',
          icon: Calendar,
        },
      ],
    },
  ],

  VENDOR: [
    {
      href: '/vendor/dashboard',
      label: 'Dashboard',
      icon: BarChart3,
    },
    {
      href: '/vendors',
      label: 'Browse Vendors',
      icon: ShoppingBag,
    },
    {
      label: 'My Business',
      icon: Store,
      children: [
        {
          href: '/vendor/products',
          label: 'Products',
          icon: Package,
        },
        {
          href: '/vendor/orders',
          label: 'Orders',
          icon: ShoppingCart,
        },
        {
          href: '/vendor/operating-hours',
          label: 'Operating Hours',
          icon: Clock,
        },
      ],
    },
    {
      label: 'Fulfillment',
      icon: Truck,
      children: [
        {
          href: '/vendor/meal-slots',
          label: 'Meal Slots',
          icon: Utensils,
          description: 'Manage meal time slots',
        },
        {
          href: '/vendor/settings/fulfillment',
          label: 'Fulfillment Settings',
          icon: Settings,
          description: 'Configure delivery, pickup, eat-in',
        },
      ],
    },
    {
      href: '/vendor/profile',
      label: 'Profile',
      icon: User,
      divider: true,
    },
  ],

  DELIVERY_PARTNER: [
    {
      href: '/vendors',
      label: 'Browse Vendors',
      icon: ShoppingBag,
    },
    {
      label: 'Deliveries',
      icon: Truck,
      children: [
        {
          href: '/delivery/available',
          label: 'Available',
          icon: MapPin,
          description: 'View available deliveries',
        },
        {
          href: '/delivery/active',
          label: 'Active',
          icon: Package,
          description: 'Your active deliveries',
        },
        {
          href: '/delivery/history',
          label: 'History',
          icon: History,
          description: 'Past deliveries',
        },
      ],
    },
    {
      label: 'Earnings',
      icon: CreditCard,
      children: [
        {
          href: '/delivery/earnings',
          label: 'Overview',
          icon: BarChart3,
        },
        {
          href: '/delivery/earnings/history',
          label: 'Payment History',
          icon: History,
        },
      ],
    },
    {
      href: '/delivery/profile',
      label: 'Profile',
      icon: User,
    },
  ],

  GUEST: [
    {
      href: '/vendors',
      label: 'Browse Vendors',
      icon: ShoppingBag,
    },
    {
      href: '/auth/login',
      label: 'Login',
      icon: User,
    },
  ],
};

export const navigationThemes: Record<string, NavigationTheme> = {
  CUSTOMER: {
    logoColor: 'bg-blue-600',
    logoIcon: ShoppingBag,
    logoText: 'Marketplace',
    accentColor: 'blue',
  },
  SUPER_ADMIN: {
    logoColor: 'bg-purple-600',
    logoIcon: Shield,
    logoText: 'Admin Portal',
    accentColor: 'purple',
  },
  VENDOR: {
    logoColor: 'bg-orange-600',
    logoIcon: Store,
    logoText: 'Vendor Dashboard',
    accentColor: 'orange',
  },
  DELIVERY_PARTNER: {
    logoColor: 'bg-green-600',
    logoIcon: Truck,
    logoText: 'Delivery Partner',
    accentColor: 'green',
  },
  GUEST: {
    logoColor: 'bg-blue-600',
    logoIcon: ShoppingBag,
    logoText: 'Marketplace',
    accentColor: 'blue',
  },
};
