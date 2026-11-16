export type ThemeMode = 'light' | 'dark' | 'auto';
export type ThemeId = 'brand' | 'professional' | 'modern';
export type PaymentStatus = 'paid' | 'pending' | 'refunded';
export type InventoryMovementType = 'stock-in' | 'stock-out' | 'adjustment';
export type TaskStatus = 'Todo' | 'In Progress' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TeamRole = 'Owner' | 'Admin' | 'Manager' | 'Executive' | 'Staff';
export type CampaignStatus = 'Draft' | 'Active' | 'Completed';

export type WorkspaceSetup = {
  businessName: string;
  industry: string;
  country: string;
  currency: string;
  timezone: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  gstRegistered?: boolean;
  gstin?: string;
  legalBusinessName?: string;
  logoDataUrl: string;
  brandColor: string;
  themeId: ThemeId;
  themeMode: ThemeMode;
  enabledModules: string[];
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minimumStock: number;
  unit: string;
  imageDataUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type InventoryMovement = {
  id: string;
  productId: string;
  type: InventoryMovementType;
  quantity: number;
  note: string;
  createdAt: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type SaleItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  total: number;
};

export type Sale = {
  id: string;
  customerId: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  costTotal: number;
  grossProfit: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
};

export type Expense = {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
};

export type RevenueTargetPeriod = 'monthly' | 'quarterly' | 'annual';

export type RevenueTarget = {
  id: string;
  period: RevenueTargetPeriod;
  label: string;
  amount: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  priority: TaskPriority;
  dueDate: string;
  reminder: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: TeamRole;
  department: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
};

export type MarketingCampaign = {
  id: string;
  name: string;
  channel: string;
  objective: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
  revenue: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type BusinessState = {
  workspace: WorkspaceSetup | null;
  products: Product[];
  inventoryMovements: InventoryMovement[];
  customers: Customer[];
  sales: Sale[];
  expenses: Expense[];
  revenueTargets: RevenueTarget[];
  tasks: Task[];
  teamMembers: TeamMember[];
  campaigns: MarketingCampaign[];
};

export type BusinessMetrics = {
  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: number;
  revenueTarget: number;
  revenueAchieved: number;
  targetRemaining: number;
  targetAchievement: number;
  requiredDailyRevenue: number;
  requiredWeeklyRevenue: number;
  salesCount: number;
  customerCount: number;
  taskCount: number;
  overdueTaskCount: number;
  lowStockCount: number;
  outOfStockCount: number;
};