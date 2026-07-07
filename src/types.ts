export type CoffeeCategory = 'Whole Bean' | 'Ground' | 'Beverage' | 'Food' | 'Merchandise' | 'Bundle' | 'Unclassified';

export interface CustomizationOptions {
  size?: 'Small' | 'Medium' | 'Large';
  milk?: 'None' | 'Whole' | 'Oat' | 'Almond' | 'Soy';
  sugar?: 'None' | 'Low' | 'Medium' | 'High';
}

export type BrewMethod = 'Espresso' | 'Jebena' | 'Filter' | 'Cold Brew' | 'French Press';

export interface FlavorProfile {
  sweetness: number; // 0-10
  acidity: number;
  body: number;
  floral: number;
  nutty: number;
}

export interface Coffee {
  id: string;
  name: string;
  description: string;
  price: number;
  category: CoffeeCategory;
  image: string;
  origin: string;
  regionStory?: string; // Storytelling
  roast: 'Light' | 'Medium' | 'Dark' | 'N/A';
  tags: string[]; // For smart search
  isBreakfast?: boolean;
  isLunch?: boolean;
  flavorProfile?: FlavorProfile;
  availableBrewMethods?: BrewMethod[];
}

export interface CartItem extends Coffee {
  quantity: number;
  customization?: CustomizationOptions;
  branchId?: string;
}

export type UserRole = 'Sales Rep' | 'Admin' | 'Payment Collector' | 'Factory/Ops' | 'Marketing' | 'Management' | 'Customer' | 'Driver';

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface Driver {
  id: string;
  name: string;
  status: 'Available' | 'Busy' | 'Offline';
  currentLocation: Location;
  vehicleType: 'Motorcycle' | 'Bicycle' | 'Car';
  rating: number;
  totalEarnings: number;
  activeTripId?: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  basePrice: number;
  surgeMultiplier: number;
  boundary: Location[]; // Simple polygon points
}

export interface DeliveryTrip {
  id: string;
  driverId: string;
  orderIds: string[];
  status: 'Assigned' | 'Picked Up' | 'En Route' | 'Completed';
  startTime: string;
  endTime?: string;
  route: Location[];
  estimatedTime: number; // minutes
}

export type CustomerSegment = 'New' | 'Regular' | 'VIP' | 'Churn Risk';

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  tin?: string;
  accountNumber?: string;
  externalCustomerId?: string;
  walletBalance: number;
  loyaltyPoints: number;
  usualOrder?: CartItem;
  driverProfile?: Driver;
  // Customer Management Fields
  totalSpent?: number;
  orderCount?: number;
  segment?: CustomerSegment;
  joinDate?: string;
  lastOrderDate?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'Raw Material' | 'Packaging' | 'Finished Good';
  quantity: number;
  unit: string; // kg, liters, units
  minThreshold: number;
  lastRestocked: string;
  supplier?: string;
  branchId?: string; // Optional: if null, it's central/shared warehouse
}

export interface AIInsight {
  id: string;
  type: 'Demand Prediction' | 'Inventory Warning' | 'Promotion Suggestion';
  title: string;
  description: string;
  confidence: number; // 0-1
  impact: 'Low' | 'Medium' | 'High';
  actionable?: boolean;
  timestamp: string;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  discountType: 'Percentage' | 'Fixed Amount' | 'BOGO';
  discountValue: number;
  code?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  targetSegment?: CustomerSegment;
}

export interface PaymentNote {
  text: string;
  user: string;
  timestamp: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  amount: number;
  refundedAmount?: number;
  method: 'Telebirr' | 'M-Pesa' | 'Card' | 'Wallet' | 'Cheque' | 'Cash' | 'Unknown';
  status: 'Pending' | 'Cleared' | 'Bounced' | 'Refunded' | 'Partially Refunded';
  receiptNumber?: string;
  chequeNumber?: string;
  bank?: string;
  customerName: string;
  customerEmail?: string;
  dueDate?: string;
  timestamp: string;
  notes?: PaymentNote[];
}

export interface RefundRecord {
  id: string;
  paymentId: string;
  orderId: string;
  amount: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  timestamp: string;
  processedBy?: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'Credit' | 'Debit';
  description: string;
  timestamp: string;
}

export interface PayoutRecord {
  id: string;
  driverId: string;
  amount: number;
  status: 'Pending' | 'Processed';
  timestamp: string;
  method: 'Bank Transfer' | 'Telebirr';
}

export interface FinancialReport {
  totalRevenue: number;
  totalRefunds: number;
  netCashFlow: number;
  pendingPayouts: number;
  dailyBreakdown: { date: string; revenue: number; refunds: number }[];
}

export interface ProductionTask {
  id: string;
  orderId: string;
  items: CartItem[];
  status: 'Not Started' | 'Roasting' | 'Grinding' | 'Packaging' | 'Ready for Dispatch';
  assignedTo?: string;
  updatedAt: string;
}

export interface Issue {
  id: string;
  orderId: string;
  reportedBy: string;
  assignedTo?: string;
  priority: 'Low' | 'Medium' | 'High';
  role: UserRole;
  description: string;
  status: 'Open' | 'Resolved';
  timestamp: string;
  comments: { user: string; text: string; timestamp: string }[];
}

export type OrderStatus = 'Pending' | 'Processing' | 'Roasting' | 'Grinding' | 'Packaging' | 'Ready for Dispatch' | 'Out for Delivery' | 'Delivered' | 'Cancelled';

export interface Branch {
  id: string;
  name: string;
  location: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
  growth: number;
  managerId?: string;
  status: 'Active' | 'Inactive' | 'Maintenance';
  coordinates?: Location;
}

export interface BusinessKPIs {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  customerRetention: number;
  activeUsers: number;
  conversionRate: number;
}

export interface Recommendation {
  userId: string;
  recommendedSkus: string[]; // Coffee IDs
  reason: string;
}

export interface ChurnPrediction {
  userId: string;
  riskScore: number; // 0-1
  reason: string;
  suggestedAction: string;
}

export interface PriceAdjustment {
  coffeeId: string;
  originalPrice: number;
  currentPrice: number;
  reason: string;
  expiresAt: string;
  branchId?: string; // Geo-based pricing
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  address: string;
  location?: Location; // GPS coordinates
  timestamp: string;
  type: 'Pickup' | 'Delivery' | 'Imported';
  paymentMethod: 'Telebirr' | 'M-Pesa' | 'Card' | 'Wallet' | 'Cheque' | 'Cash' | 'Unknown';
  receiptNumber?: string;
  bank?: string;
  chequeNumber?: string;
  dueDate?: string;
  salesRepId?: string;
  driverId?: string;
  tripId?: string;
  deliveryFee?: number;
  surgeMultiplier?: number;
  eta?: string;
  branchId?: string; // Added for store comparison
  source?: 'Application' | 'Imported Document';
  importId?: string;
  sourceFileName?: string;
  sourceFileHash?: string;
  documentType?: string;
  referenceNumber?: string;
  fsNumber?: string;
  customerTin?: string;
  accountNumber?: string;
  station?: string;
  store?: string;
  subtotal?: number;
  vat?: number;
  currency?: string;
}

export interface SalesImportLine {
  id: string;
  description: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  category: CoffeeCategory;
}

export interface ParsedSalesDocument {
  documentType?: string;
  sellerName?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerTin?: string;
  customerAddress?: string;
  accountNumber?: string;
  transactionDate: string;
  referenceNumber?: string;
  fsNumber?: string;
  station?: string;
  store?: string;
  paymentMethod: PaymentRecord['method'];
  currency?: string;
  subtotal: number;
  vat: number;
  grandTotal: number;
  lineItems: SalesImportLine[];
  confidence?: number;
  warnings?: string[];
}

export interface SalesImportRecord {
  id: string;
  sourceFileName: string;
  sourceFileHash: string;
  status: 'Parsed' | 'Imported' | 'Duplicate' | 'Failed';
  document?: ParsedSalesDocument;
  orderId?: string;
  errorMessage?: string;
  importedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailySales {
  date: string;
  sales: number;
  orders: number;
}

export interface Integration {
  id: string;
  name: string;
  type: 'Accounting' | 'SMS' | 'CRM' | 'Delivery' | 'IoT';
  status: 'Connected' | 'Disconnected' | 'Error';
  lastSync?: string;
  config: Record<string, any>;
}

export interface IoTDevice {
  id: string;
  branchId: string;
  name: string;
  type: 'Espresso Machine' | 'Grinder' | 'Brewer';
  status: 'Online' | 'Offline' | 'Maintenance';
  metrics: {
    temperature?: number;
    pressure?: number;
    shotsToday?: number;
    waterLevel?: number;
    lastCleaned?: string;
  };
}

export interface DeliveryPartner {
  id: string;
  name: string;
  apiStatus: 'Active' | 'Inactive';
  activeOrders: number;
  avgDeliveryTime: number;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number; // 0-1
}

export interface SavedReport {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  markdown: string;
  timestamp: string;
}
