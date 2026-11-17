export type Appearance = "light" | "dark" | "auto";
export type ThemePreset = "brand" | "professional" | "modern" | "contrast";
export type Role = "owner" | "admin" | "manager" | "employee";
export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type PaymentMethod = "cash" | "card" | "upi" | "bank" | "credit" | "other";
export type PaymentStatus = "paid" | "partial" | "unpaid";
export type MovementType = "in" | "out" | "adjustment" | "sale";
export type TargetPeriod = "monthly" | "quarterly" | "annual";
export type InvoiceTemplate = "modern" | "classic" | "minimal";
export type InvoiceStatus = "issued" | "cancelled";
export type InvoiceSupplyType = "intra" | "inter";
export type SubscriptionPlan = "starter" | "growth";
export type SubscriptionStatus = "trial" | "selected";
export interface InvoiceDesignSettings { prefix:string; template:InvoiceTemplate; accentColor:string; showLogo:boolean; defaultDueDays:number; footerNote:string; terms:string; }
export interface InvoiceLineItem { id:string; productId?:string; description:string; hsnSac?:string; quantity:number; unit:string; rate:number; discount:number; taxRate:number; taxableValue:number; taxAmount:number; total:number; }
export interface InvoiceRecord {
  id:string; businessId:string; invoiceNumber:string; status:InvoiceStatus; issueDate:string; dueDate?:string;
  sellerName:string; sellerLegalName?:string; sellerGstin?:string; sellerAddress?:string; sellerState?:string; sellerStateCode?:string; sellerPhone?:string; sellerEmail?:string;
  customerId?:string; customerName:string; customerGstin?:string; customerAddress?:string; customerState?:string; customerStateCode?:string; customerPhone?:string; customerEmail?:string;
  placeOfSupply:string; placeOfSupplyCode?:string; supplyType:InvoiceSupplyType; reverseCharge:boolean;
  items:InvoiceLineItem[]; subtotal:number; discountTotal:number; taxableValue:number; cgst:number; sgst:number; igst:number; taxTotal:number; total:number;
  notes?:string; terms?:string; createdAt:string; updatedAt:string;
}
export const DEFAULT_INVOICE_SETTINGS:InvoiceDesignSettings = {prefix:"INV",template:"modern",accentColor:"#176B73",showLogo:true,defaultDueDays:0,footerNote:"Thank you for your business.",terms:""};

export type ModuleId =
  | "products"
  | "inventory"
  | "pos"
  | "sales"
  | "customers"
  | "expenses"
  | "targets"
  | "tasks"
  | "team"
  | "marketing"
  | "reports"
  | "suppliers"
  | "purchases"
  | "bookings"
  | "trips"
  | "vehicles"
  | "drivers"
  | "fuel"
  | "maintenance"
  | "properties"
  | "rooms"
  | "guests"
  | "ota"
  | "leads"
  | "clients"
  | "services"
  | "projects"
  | "invoices"
  | "materials"
  | "production"
  | "orders"
  | "returns"
  | "reservations"
  | "menu"
  | "tables"
  | "shipments"
  | "jobs"
  | "sites";

export type PermissionKey =
  | "revenue"
  | "expenses"
  | "profit"
  | "sales"
  | "inventory"
  | "customers"
  | "tasks"
  | "reports"
  | "team"
  | "settings"
  | "marketing";

export type IndustryId =
  | "retail"
  | "travel"
  | "hospitality"
  | "agency"
  | "manufacturing"
  | "ecommerce"
  | "restaurant"
  | "logistics"
  | "services"
  | "construction"
  | "other";

export interface Business {
  id: string;
  name: string;
  logoDataUrl?: string;
  industry: IndustryId;
  businessType: string;
  country: string;
  currency: string;
  timezone: string;
  phone?: string;
  email?: string;
  website?: string;
  location?: string; address?:string; state?:string; stateCode?:string; postalCode?:string;
  gstRegistered?:boolean; gstin?:string; legalName?:string; invoiceSettings?:InvoiceDesignSettings;
  subscriptionPlan?:SubscriptionPlan; subscriptionStatus?:SubscriptionStatus; trialStartedAt?:string; trialEndsAt?:string;
  brandColors: string[];
  themePreset: ThemePreset;
  appearance: Appearance;
  enabledModules: ModuleId[];
  moduleOrder: ModuleId[];
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  sku: string;
  barcode?: string;
  category?: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  imageDataUrl?: string;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  businessId: string;
  productId: string;
  type: MovementType;
  quantity: number;
  resultingStock: number;
  reason?: string;
  refId?: string;
  createdAt: string;
}

export type LeadStage = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
export interface Lead {
  id: string;
  businessId: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  source?: string;
  stage: LeadStage;
  value: number;
  expectedCloseDate?: string;
  followUpAt?: string;
  assignedTo?: string;
  notes?: string;
  convertedCustomerId?: string;
  createdAt: string;
  updatedAt: string;
}
export interface Customer {
  id: string;
  businessId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  state?: string;
  stateCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  sku: string;
  qty: number;
  unitPrice: number;
  costPrice: number;
  discount: number;
}

export interface Sale {
  id: string;
  businessId: string;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  costTotal: number;
  grossProfit: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  outstanding: number;
  note?: string;
  createdAt: string;
}

export type SupplierStatus = "active" | "inactive";
export type PurchasePaymentStatus = "paid" | "partial" | "pending";

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  notes?: string;
  status: SupplierStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitCost: number;
  total: number;
}

export interface Purchase {
  id: string;
  businessId: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  subtotal: number;
  total: number;
  paidAmount: number;
  balance: number;
  paymentStatus: PurchasePaymentStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  businessId: string;
  category: string;
  amount: number;
  vendor?: string;
  notes?: string;
  date: string;
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  businessId: string;
  name: string;
  system?: boolean;
}

export interface Target {
  id: string;
  businessId: string;
  period: TargetPeriod;
  year: number;
  month?: number;
  quarter?: number;
  amount: number;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  businessId: string;
  name: string;
  role: Role;
  email?: string;
  phone?: string;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  businessId: string;
  title: string;
  description?: string;
  assignedTo?: string;
  priority: TaskPriority;
  dueDate?: string;
  reminder?: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  businessId: string;
  name: string;
  channel: string;
  adSpend: number;
  clicks: number;
  impressions: number;
  leads: number;
  customers: number;
  revenue: number;
  date: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  businessId: string;
  customerId?: string;
  type: "sale" | "note" | "followup" | "system";
  message: string;
  refId?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  businessId: string;
  key: string;
  type:
    | "low_stock"
    | "out_of_stock"
    | "overdue_task"
    | "target_risk"
    | "expense_anomaly"
    | "pending_payment"
    | "customer_followup"
    | "marketing_change";
  title: string;
  body: string;
  href?: AppHref;
  actionLabel?: string;
  read: boolean;
  createdAt: string;
}

export interface WorkspaceDB {
  version: 1;
  businesses: Business[];
  products: Product[];
  movements: StockMovement[];
  customers: Customer[];
  leads: Lead[];
  suppliers: Supplier[];
  purchases: Purchase[];
  sales: Sale[];
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  targets: Target[];
  members: TeamMember[];
  tasks: TaskItem[];
  campaigns: Campaign[];
  activity: Activity[];
  notifications: AppNotification[];
  invoices: InvoiceRecord[];
}

export const SYSTEM_EXPENSE_CATEGORIES = [
  "Salary",
  "Rent",
  "Marketing",
  "Software",
  "Transportation",
  "Raw materials",
  "Packaging",
  "Utilities",
  "Other",
] as const;

export const BUSINESS_TYPES = [
  "Sole proprietor",
  "Partnership",
  "LLC",
  "Private limited",
  "Corporation",
  "Non-profit",
  "Other",
] as const;

export const UNITS = ["pcs", "kg", "g", "L", "ml", "box", "pack", "m", "hr", "service"] as const;

export const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "upi", label: "UPI" },
  { id: "bank", label: "Bank transfer" },
  { id: "credit", label: "On credit" },
  { id: "other", label: "Other" },
];

export const CORE_IMPLEMENTED: ModuleId[] = [
  "products",
  "inventory",
  "pos",
  "sales",
  "customers",
  "leads",
  "expenses",
  "targets",
  "tasks",
  "team",
  "suppliers",
  "purchases",
  "marketing",
  "reports",
  "invoices",
];

export type AppHref =
  | "/"
  | "/sell"
  | "/products"
  | "/inventory"
  | "/customers"
  | "/leads"
  | "/suppliers"
  | "/purchases"
  | "/sales"
  | "/expenses"
  | "/targets"
  | "/tasks"
  | "/team"
  | "/marketing"
  | "/more"
  | "/settings"
  | "/actions"
  | "/advisor"
  | "/inbox"
  | "/reports"
  | "/attendance"
  | "/invoices"
  | "/onboarding";

export interface ModuleDef {
  id: ModuleId;
  label: string;
  description: string;
  path: AppHref;
  implemented: boolean;
}

export const MODULE_CATALOG: Record<ModuleId, ModuleDef> = {
  products: { id: "products", label: "Products", description: "Catalog, SKUs, pricing", path: "/products", implemented: true },
  inventory: { id: "inventory", label: "Inventory", description: "Stock levels and movements", path: "/inventory", implemented: true },
  pos: { id: "pos", label: "Point of sale", description: "Fast mobile checkout", path: "/sell", implemented: true },
  sales: { id: "sales", label: "Sales", description: "Orders and revenue history", path: "/sales", implemented: true },
  customers: { id: "customers", label: "Customers", description: "Profiles and purchase history", path: "/customers", implemented: true },
  leads: { id: "leads", label: "Leads", description: "Lead pipeline, follow-ups and conversion", path: "/leads", implemented: true },
  expenses: { id: "expenses", label: "Expenses", description: "Costs by category", path: "/expenses", implemented: true },
  targets: { id: "targets", label: "Targets", description: "Revenue goals and pace", path: "/targets", implemented: true },
  tasks: { id: "tasks", label: "Tasks", description: "Work that needs doing", path: "/tasks", implemented: true },
  team: { id: "team", label: "Team", description: "People and roles", path: "/team", implemented: true },
  marketing: { id: "marketing", label: "Marketing", description: "Spend, leads, and ROAS", path: "/marketing", implemented: true },
  reports: { id: "reports", label: "Reports", description: "Financial, sales and marketing analytics", path: "/reports", implemented: true },
  suppliers: { id: "suppliers", label: "Suppliers", description: "Supplier contacts and purchase history", path: "/suppliers", implemented: true },
  purchases: { id: "purchases", label: "Purchases", description: "Goods receipts, stock updates and supplier balances", path: "/purchases", implemented: true },
  bookings: { id: "bookings", label: "Bookings", description: "Reservations and trips", path: "/more", implemented: false },
  trips: { id: "trips", label: "Trips", description: "Itineraries", path: "/more", implemented: false },
  vehicles: { id: "vehicles", label: "Vehicles", description: "Fleet", path: "/more", implemented: false },
  drivers: { id: "drivers", label: "Drivers", description: "Driver roster", path: "/more", implemented: false },
  fuel: { id: "fuel", label: "Fuel", description: "Fuel logs", path: "/more", implemented: false },
  maintenance: { id: "maintenance", label: "Maintenance", description: "Service records", path: "/more", implemented: false },
  properties: { id: "properties", label: "Properties", description: "Hotels and stays", path: "/more", implemented: false },
  rooms: { id: "rooms", label: "Rooms", description: "Room inventory", path: "/more", implemented: false },
  guests: { id: "guests", label: "Guests", description: "Guest profiles", path: "/more", implemented: false },
  ota: { id: "ota", label: "OTA", description: "Channel managers", path: "/more", implemented: false },
  leads: { id: "leads", label: "Leads", description: "Pipeline", path: "/more", implemented: false },
  clients: { id: "clients", label: "Clients", description: "Retainers", path: "/more", implemented: false },
  services: { id: "services", label: "Services", description: "Service catalog", path: "/more", implemented: false },
  projects: { id: "projects", label: "Projects", description: "Delivery work", path: "/more", implemented: false },
  invoices: { id: "invoices", label: "Invoices", description: "Custom invoices and customer billing history", path: "/invoices", implemented: true },
  materials: { id: "materials", label: "Raw materials", description: "BOM inputs", path: "/more", implemented: false },
  production: { id: "production", label: "Production", description: "Work orders", path: "/more", implemented: false },
  orders: { id: "orders", label: "Orders", description: "Online orders", path: "/more", implemented: false },
  returns: { id: "returns", label: "Returns", description: "RMA flow", path: "/more", implemented: false },
  reservations: { id: "reservations", label: "Reservations", description: "Table bookings", path: "/more", implemented: false },
  menu: { id: "menu", label: "Menu", description: "Dishes and modifiers", path: "/more", implemented: false },
  tables: { id: "tables", label: "Tables", description: "Floor plan", path: "/more", implemented: false },
  shipments: { id: "shipments", label: "Shipments", description: "Deliveries", path: "/more", implemented: false },
  jobs: { id: "jobs", label: "Jobs", description: "Work tickets", path: "/more", implemented: false },
  sites: { id: "sites", label: "Sites", description: "Job sites", path: "/more", implemented: false },
};

export interface IndustryDef {
  id: IndustryId;
  label: string;
  description: string;
  recommended: ModuleId[];
  extra: ModuleId[];
}

export const INDUSTRIES: IndustryDef[] = [
  {
    id: "retail",
    label: "Retail",
    description: "Shops, boutiques, and product sellers",
    recommended: ["products", "inventory", "pos", "customers", "suppliers", "purchases", "expenses", "marketing", "targets", "tasks", "reports"],
    extra: ["team"],
  },
  {
    id: "travel",
    label: "Travel",
    description: "Tours, transport, and travel desks",
    recommended: ["customers", "leads", "sales", "suppliers", "purchases", "tasks", "team", "expenses", "marketing", "targets", "reports"],
    extra: ["bookings", "trips", "vehicles", "drivers", "fuel", "maintenance"],
  },
  {
    id: "hospitality",
    label: "Hospitality",
    description: "Hotels, homestays, and lodging",
    recommended: ["customers", "leads", "sales", "suppliers", "purchases", "expenses", "tasks", "team", "marketing", "targets", "reports"],
    extra: ["properties", "rooms", "bookings", "guests", "ota"],
  },
  {
    id: "agency",
    label: "Agency",
    description: "Studios, consultants, and retainers",
    recommended: ["customers", "leads", "sales", "suppliers", "purchases", "tasks", "team", "expenses", "marketing", "targets", "reports"],
    extra: ["clients", "services", "projects", "invoices"],
  },
  {
    id: "manufacturing",
    label: "Manufacturing",
    description: "Makers and production units",
    recommended: ["products", "inventory", "sales", "customers", "suppliers", "purchases", "expenses", "tasks", "targets", "reports"],
    extra: ["materials", "production", "team"],
  },
  {
    id: "ecommerce",
    label: "E-commerce",
    description: "Online product businesses",
    recommended: ["products", "inventory", "sales", "customers", "suppliers", "purchases", "expenses", "marketing", "targets", "tasks", "reports"],
    extra: ["orders", "returns"],
  },
  {
    id: "restaurant",
    label: "Restaurant",
    description: "Cafes, kitchens, and QSR",
    recommended: ["products", "inventory", "pos", "customers", "suppliers", "purchases", "expenses", "tasks", "team", "targets", "reports"],
    extra: ["menu", "reservations", "tables"],
  },
  {
    id: "logistics",
    label: "Logistics",
    description: "Freight, last-mile, and fleet",
    recommended: ["customers", "sales", "suppliers", "purchases", "tasks", "team", "expenses", "targets", "reports"],
    extra: ["shipments", "vehicles", "drivers", "fuel", "maintenance"],
  },
  {
    id: "services",
    label: "Services",
    description: "Studios, salons, and local services",
    recommended: ["customers", "leads", "sales", "suppliers", "purchases", "tasks", "team", "expenses", "marketing", "targets", "reports"],
    extra: ["services", "bookings", "invoices"],
  },
  {
    id: "construction",
    label: "Construction",
    description: "Contractors and builders",
    recommended: ["customers", "sales", "suppliers", "purchases", "tasks", "team", "expenses", "targets", "reports"],
    extra: ["jobs", "sites", "materials", "invoices"],
  },
  {
    id: "other",
    label: "Other",
    description: "Start with the core operating system",
    recommended: ["products", "inventory", "pos", "customers", "suppliers", "purchases", "sales", "expenses", "targets", "tasks", "marketing", "reports"],
    extra: ["team"],
  },
];

export const COUNTRIES: { name: string; currency: string; tz: string }[] = [
  { name: "India", currency: "INR", tz: "Asia/Kolkata" },
  { name: "United States", currency: "USD", tz: "America/New_York" },
  { name: "United Kingdom", currency: "GBP", tz: "Europe/London" },
  { name: "United Arab Emirates", currency: "AED", tz: "Asia/Dubai" },
  { name: "Singapore", currency: "SGD", tz: "Asia/Singapore" },
  { name: "Australia", currency: "AUD", tz: "Australia/Sydney" },
  { name: "Canada", currency: "CAD", tz: "America/Toronto" },
  { name: "Germany", currency: "EUR", tz: "Europe/Berlin" },
  { name: "France", currency: "EUR", tz: "Europe/Paris" },
  { name: "Netherlands", currency: "EUR", tz: "Europe/Amsterdam" },
  { name: "Spain", currency: "EUR", tz: "Europe/Madrid" },
  { name: "Italy", currency: "EUR", tz: "Europe/Rome" },
  { name: "Brazil", currency: "BRL", tz: "America/Sao_Paulo" },
  { name: "Mexico", currency: "MXN", tz: "America/Mexico_City" },
  { name: "South Africa", currency: "ZAR", tz: "Africa/Johannesburg" },
  { name: "Nigeria", currency: "NGN", tz: "Africa/Lagos" },
  { name: "Kenya", currency: "KES", tz: "Africa/Nairobi" },
  { name: "Indonesia", currency: "IDR", tz: "Asia/Jakarta" },
  { name: "Malaysia", currency: "MYR", tz: "Asia/Kuala_Lumpur" },
  { name: "Philippines", currency: "PHP", tz: "Asia/Manila" },
  { name: "Thailand", currency: "THB", tz: "Asia/Bangkok" },
  { name: "Vietnam", currency: "VND", tz: "Asia/Ho_Chi_Minh" },
  { name: "Japan", currency: "JPY", tz: "Asia/Tokyo" },
  { name: "South Korea", currency: "KRW", tz: "Asia/Seoul" },
  { name: "China", currency: "CNY", tz: "Asia/Shanghai" },
  { name: "Saudi Arabia", currency: "SAR", tz: "Asia/Riyadh" },
  { name: "Pakistan", currency: "PKR", tz: "Asia/Karachi" },
  { name: "Bangladesh", currency: "BDT", tz: "Asia/Dhaka" },
  { name: "Sri Lanka", currency: "LKR", tz: "Asia/Colombo" },
  { name: "New Zealand", currency: "NZD", tz: "Pacific/Auckland" },
];

export const ROLE_PERMISSIONS: Record<Role, PermissionKey[] | "*"> = {
  owner: "*",
  admin: [
    "revenue",
    "expenses",
    "profit",
    "sales",
    "inventory",
    "customers",
    "tasks",
    "reports",
    "team",
    "settings",
    "marketing",
  ],
  manager: ["sales", "inventory", "customers", "tasks", "reports", "marketing"],
  employee: ["sales", "inventory", "customers", "tasks"],
};

export function canRole(role: Role, permission: PermissionKey): boolean {
  const set = ROLE_PERMISSIONS[role];
  if (set === "*") return true;
  return set.includes(permission);
}

export function emptyDb(): WorkspaceDB {
  return {
    version: 1,
    businesses: [],
    products: [],
    movements: [],
    customers: [],
    leads: [],
    suppliers: [],
    purchases: [],
    sales: [],
    expenses: [],
    expenseCategories: [],
    targets: [],
    members: [],
    tasks: [],
    campaigns: [],
    activity: [],
    notifications: [],
    invoices: [],
  };
}

export function recommendModules(industry: IndustryId): ModuleId[] {
  const def = INDUSTRIES.find((i) => i.id === industry) ?? INDUSTRIES[INDUSTRIES.length - 1];
  const unique = new Set<ModuleId>([...def.recommended, "reports", "invoices"]);
  return Array.from(unique);
}
