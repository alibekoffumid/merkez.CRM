import { LayoutDashboard, Users, Package, DollarSign, Receipt, ChefHat, Activity } from 'lucide-react';

export const getNavItems = (t) => [
  { 
    id: 'dashboard',
    name: t('sidebar.dashboard'), 
    icon: LayoutDashboard, 
    path: '/', 
    color: 'hover:text-merkez-blue hover:bg-blue-50' 
  },
  { 
    id: 'crm',
    name: t('sidebar.crm'), 
    icon: Users, 
    path: '/crm', 
    color: 'hover:text-merkez-red hover:bg-red-50' 
  },
  { 
    id: 'warehouse',
    name: t('sidebar.warehouse'), 
    icon: Package, 
    path: '/warehouse', 
    color: 'hover:text-merkez-yellow hover:bg-yellow-50' 
  },
  { 
    id: 'restaurant',
    name: t('sidebar.restaurant'), 
    icon: ChefHat, 
    path: '/restaurant', 
    color: 'hover:text-merkez-green hover:bg-green-50' 
  },
  { 
    id: 'finance',
    name: t('sidebar.finance'), 
    icon: DollarSign, 
    path: '/finance', 
    color: 'hover:text-merkez-green hover:bg-green-50' 
  },
  { 
    id: 'callCenter',
    name: t('sidebar.callCenter'), 
    icon: Users, 
    path: '/call-center', 
    color: 'hover:text-merkez-blue hover:bg-blue-50' 
  },
  { 
    id: 'eTaxes',
    name: t('sidebar.etaxes') || 'E-taxes', 
    icon: Receipt, 
    path: '/dashboard/e-taxes', 
    color: 'hover:text-merkez-blue hover:bg-blue-50'
  },
  { 
    id: 'dental',
    name: t('sidebar.dental'), 
    icon: Activity, 
    path: '/dental', 
    color: 'hover:text-merkez-blue hover:bg-blue-50',
    roles: ['admin', 'dentist']
  },
];
