import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  CalendarCheck,
  Bot,
  Boxes,
  CheckSquare2,
  CircleDollarSign,
  ContactRound,
  FileBarChart2,
  Megaphone,
  PackageSearch,
  Settings2,
  ShoppingBag,
  Target,
  UsersRound,
} from 'lucide-react';

export type ModuleDefinition = {
  slug: string;
  label: string;
  description: string;
  icon: LucideIcon;
  group: 'workspace' | 'operations' | 'insight';
  accent: 'coral' | 'teal' | 'gold' | 'slate';
};

export const modules: ModuleDefinition[] = [
  {
    slug: 'dashboard',
    label: 'Dashboard',
    description: 'Your operating overview',
    icon: BarChart3,
    group: 'workspace',
    accent: 'coral',
  },
  {
    slug: 'sales',
    label: 'Sales',
    description: 'Pipeline and point of sale',
    icon: ShoppingBag,
    group: 'operations',
    accent: 'coral',
  },
  {
    slug: 'products',
    label: 'Products',
    description: 'Catalog and offers',
    icon: Boxes,
    group: 'operations',
    accent: 'teal',
  },
  {
    slug: 'inventory',
    label: 'Inventory',
    description: 'Stock and movement',
    icon: PackageSearch,
    group: 'operations',
    accent: 'gold',
  },
  {
    slug: 'customers',
    label: 'Customers',
    description: 'Relationships and records',
    icon: ContactRound,
    group: 'operations',
    accent: 'teal',
  },
  {
    slug: 'expenses',
    label: 'Expenses',
    description: 'Costs and cash outflow',
    icon: CircleDollarSign,
    group: 'operations',
    accent: 'coral',
  },
  {
    slug: 'revenue-targets',
    label: 'Revenue targets',
    description: 'Plans and pacing',
    icon: Target,
    group: 'insight',
    accent: 'gold',
  },
  {
    slug: 'marketing',
    label: 'Marketing',
    description: 'Channels and campaigns',
    icon: Megaphone,
    group: 'insight',
    accent: 'teal',
  },
  {
    slug: 'tasks',
    label: 'Tasks',
    description: 'Work and reminders',
    icon: CheckSquare2,
    group: 'workspace',
    accent: 'gold',
  },
  {
    slug: 'attendance',
    label: 'Attendance',
    description: 'GPS check-in, selfie and shift records',
    icon: CalendarCheck,
    group: 'workspace',
    accent: 'gold',
  },
  {
    slug: 'team',
    label: 'Team',
    description: 'People and permissions',
    icon: UsersRound,
    group: 'workspace',
    accent: 'teal',
  },
  {
    slug: 'reports',
    label: 'Reports',
    description: 'KPI views and exports',
    icon: FileBarChart2,
    group: 'insight',
    accent: 'slate',
  },
  {
    slug: 'ai-advisor',
    label: 'AI advisor',
    description: 'A thinking partner for your business',
    icon: Bot,
    group: 'insight',
    accent: 'coral',
  },
];

export const settingsModule: ModuleDefinition = {
  slug: 'settings',
  label: 'Settings',
  description: 'Workspace preferences',
  icon: Settings2,
  group: 'workspace',
  accent: 'slate',
};

export const moduleLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  sales: 'Sales',
  products: 'Products',
  inventory: 'Inventory',
  customers: 'Customers',
  expenses: 'Expenses',
  'revenue-targets': 'Revenue Targets',
  marketing: 'Marketing',
  tasks: 'Tasks',
  team: 'Team',
  attendance: 'Attendance',
  reports: 'Reports',
  'ai-advisor': 'AI Advisor',
  pos: 'POS',
  bookings: 'Bookings',
  vehicles: 'Vehicles',
  drivers: 'Drivers',
  trips: 'Trips',
  fuel: 'Fuel',
  maintenance: 'Maintenance',
  properties: 'Properties',
  rooms: 'Rooms',
  guests: 'Guests',
  ota: 'OTA',
  revenue: 'Revenue',
  leads: 'Leads',
  projects: 'Projects',
  services: 'Services',
  invoices: 'Invoices',
  'raw-materials': 'Raw Materials',
  production: 'Production',
  suppliers: 'Suppliers',
  orders: 'Orders',
  returns: 'Returns',
};

export const moduleDescriptions: Record<string, string> = {
  pos: 'Checkout and payment capture',
  bookings: 'Reservations and availability',
  vehicles: 'Fleet and vehicle records',
  drivers: 'Driver profiles and assignments',
  trips: 'Trip schedules and routes',
  fuel: 'Fuel usage and costs',
  maintenance: 'Service and repair history',
  properties: 'Property portfolio',
  rooms: 'Room inventory and availability',
  guests: 'Guest records and stays',
  ota: 'Online travel channels',
  revenue: 'Revenue streams',
  leads: 'Prospects and pipeline',
  projects: 'Client projects and delivery',
  services: 'Service catalog',
  invoices: 'Invoices and collections',
  'raw-materials': 'Materials and suppliers',
  production: 'Production runs',
  suppliers: 'Supplier relationships',
  orders: 'Orders and fulfillment',
  returns: 'Returns and refunds',
};

export const recommendedModulesByIndustry: Record<string, string[]> = {
  Retail: ['products', 'inventory', 'pos', 'customers', 'expenses', 'marketing', 'reports'],
  'Travel & Tourism': ['bookings', 'vehicles', 'drivers', 'trips', 'fuel', 'maintenance', 'customers', 'expenses', 'reports'],
  Hospitality: ['properties', 'rooms', 'bookings', 'guests', 'ota', 'revenue', 'expenses', 'marketing', 'reports'],
  'Agency / Services': ['customers', 'leads', 'projects', 'tasks', 'team', 'services', 'invoices', 'expenses', 'reports'],
  Manufacturing: ['products', 'raw-materials', 'inventory', 'production', 'suppliers', 'sales', 'expenses', 'reports'],
  'E-commerce': ['products', 'inventory', 'orders', 'customers', 'marketing', 'returns', 'expenses', 'reports'],
  Other: ['products', 'customers', 'expenses', 'tasks', 'reports'],
};

export const baseModuleSlugs = modules.map((module) => module.slug);

export const moduleOptions = Object.keys(moduleLabels);

export function defaultModulesForIndustry(industry: string) {
  return Array.from(new Set(['dashboard', 'tasks', 'team', ...(recommendedModulesByIndustry[industry] ?? recommendedModulesByIndustry.Other)]));
}

export const moduleBySlug = (slug: string) =>
  modules.find((module) => module.slug === slug) ?? settingsModule;