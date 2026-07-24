import 'dotenv/config';
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { randomUUID } from 'crypto';
import { createServer as createViteServer } from 'vite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Coffee, Order, PaymentRecord, ProductionTask, Issue, Driver, DeliveryTrip, DeliveryZone, Location, RefundRecord, WalletTransaction, PayoutRecord, InventoryItem, UserProfile, AIInsight, Promotion, Branch, BusinessKPIs, Recommendation, ChurnPrediction, PriceAdjustment, Integration, IoTDevice, DeliveryPartner, HeatmapPoint, DirectMessage, UserRole, CartItem, OrderStatus, SavedReport, ParsedSalesDocument, SalesImportRecord, SalesImportLine } from './src/types';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = Number(process.env.PORT) || 3000;

  // Runtime state cache loaded from and persisted to Supabase
  let orders: Order[] = [];
  let payments: PaymentRecord[] = [];
  let productionTasks: ProductionTask[] = [];
  let issues: Issue[] = [];
  let refunds: RefundRecord[] = [];
  let walletTransactions: WalletTransaction[] = [];
  let payouts: PayoutRecord[] = [];
  let coffees: Coffee[] = [];
  let drivers: Driver[] = [];
  let trips: DeliveryTrip[] = [];
  let zones: DeliveryZone[] = [];
  let inventory: InventoryItem[] = [];
  let customers: UserProfile[] = [];
  let insights: AIInsight[] = [];
  let savedReports: SavedReport[] = [];
  let promotions: Promotion[] = [];
  let salesImports: SalesImportRecord[] = [];

  // Advanced Analytics & AI State
  let branches: Branch[] = [];
  let kpis: BusinessKPIs = {
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    customerRetention: 0,
    activeUsers: 0,
    conversionRate: 0
  };
  let recommendations: Recommendation[] = [];
  let churnPredictions: ChurnPrediction[] = [];
  let priceAdjustments: PriceAdjustment[] = [];

  let integrations: Integration[] = [];

  let iotDevices: IoTDevice[] = [];

  let deliveryPartners: DeliveryPartner[] = [];

  let heatmapData: HeatmapPoint[] = [];

  let messages: DirectMessage[] = [];
  let userDirectory: Array<{ id: string; name: string; role: UserRole }> = [];


  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAdmin: SupabaseClient | null = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      })
    : null;

  if (!supabaseAdmin) {
    console.warn('Supabase persistence is disabled. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server to make Supabase the main database.');
  }

  const validRoles: UserRole[] = ['Sales Rep', 'Admin', 'Payment Collector', 'Factory/Ops', 'Marketing', 'Management', 'Customer', 'Driver'];
  const normalizeRole = (role?: string | null): UserRole => validRoles.includes(role as UserRole) ? role as UserRole : 'Customer';

  type ArrayEntityKey =
    | 'orders' | 'payments' | 'productionTasks' | 'issues' | 'drivers' | 'trips' | 'zones'
    | 'refunds' | 'walletTransactions' | 'payouts' | 'inventory' | 'customers' | 'insights'
    | 'savedReports' | 'promotions' | 'coffees' | 'branches' | 'recommendations' | 'churnPredictions'
    | 'priceAdjustments' | 'integrations' | 'iotDevices' | 'deliveryPartners' | 'heatmapData'
    | 'messages' | 'salesImports';

  // Business records start empty and are loaded only from Supabase.
  // The application never seeds products, orders, branches, customers, drivers, inventory,
  // analytics, or any other business data with examples or mock values.

  const arrayEntityAccessors: Record<ArrayEntityKey, { get: () => any[]; set: (items: any[]) => void }> = {
    orders: { get: () => orders, set: (v) => { orders = v as Order[]; } },
    payments: { get: () => payments, set: (v) => { payments = v as PaymentRecord[]; } },
    productionTasks: { get: () => productionTasks, set: (v) => { productionTasks = v as ProductionTask[]; } },
    issues: { get: () => issues, set: (v) => { issues = v as Issue[]; } },
    drivers: { get: () => drivers, set: (v) => { drivers = v as Driver[]; } },
    trips: { get: () => trips, set: (v) => { trips = v as DeliveryTrip[]; } },
    zones: { get: () => zones, set: (v) => { zones = v as DeliveryZone[]; } },
    refunds: { get: () => refunds, set: (v) => { refunds = v as RefundRecord[]; } },
    walletTransactions: { get: () => walletTransactions, set: (v) => { walletTransactions = v as WalletTransaction[]; } },
    payouts: { get: () => payouts, set: (v) => { payouts = v as PayoutRecord[]; } },
    inventory: { get: () => inventory, set: (v) => { inventory = v as InventoryItem[]; } },
    customers: { get: () => customers, set: (v) => { customers = v as UserProfile[]; } },
    insights: { get: () => insights, set: (v) => { insights = v as AIInsight[]; } },
    savedReports: { get: () => savedReports, set: (v) => { savedReports = v as SavedReport[]; } },
    promotions: { get: () => promotions, set: (v) => { promotions = v as Promotion[]; } },
    coffees: { get: () => coffees, set: (v) => { coffees = v as Coffee[]; } },
    branches: { get: () => branches, set: (v) => { branches = v as Branch[]; } },
    recommendations: { get: () => recommendations, set: (v) => { recommendations = v as Recommendation[]; } },
    churnPredictions: { get: () => churnPredictions, set: (v) => { churnPredictions = v as ChurnPrediction[]; } },
    priceAdjustments: { get: () => priceAdjustments, set: (v) => { priceAdjustments = v as PriceAdjustment[]; } },
    integrations: { get: () => integrations, set: (v) => { integrations = v as Integration[]; } },
    iotDevices: { get: () => iotDevices, set: (v) => { iotDevices = v as IoTDevice[]; } },
    deliveryPartners: { get: () => deliveryPartners, set: (v) => { deliveryPartners = v as DeliveryPartner[]; } },
    heatmapData: { get: () => heatmapData, set: (v) => { heatmapData = v as HeatmapPoint[]; } },
    messages: { get: () => messages, set: (v) => { messages = v as DirectMessage[]; } },
    salesImports: { get: () => salesImports, set: (v) => { salesImports = v as SalesImportRecord[]; } }
  };

  const arrayEntityKeys = Object.keys(arrayEntityAccessors) as ArrayEntityKey[];

  const getEntityId = (item: any, fallbackPrefix: string) => {
    if (item?.id) return String(item.id);
    if (item?.userId) return String(item.userId);
    if (item?.coffeeId && item?.branchId) return `${item.coffeeId}-${item.branchId}`;
    if (item?.coffeeId) return String(item.coffeeId);
    return `${fallbackPrefix}-${randomUUID()}`;
  };

  const normalizeBusinessKey = (value?: string | null) => cleanKey(value || '');

  function cleanKey(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  const orderMatchesCustomer = (order: Order, customer: UserProfile): boolean => {
    const pairs = [
      [order.customerEmail, customer.email],
      [order.customerPhone, customer.phone],
      [order.customerTin, customer.tin],
      [order.accountNumber, customer.accountNumber],
      [order.customerName, customer.name]
    ];
    return pairs.some(([a, b]) => Boolean(a && b && normalizeBusinessKey(a) === normalizeBusinessKey(b)));
  };

  const recalculateBusinessState = () => {
    const activeOrders = orders.filter(o => o.status !== 'Cancelled');
    const totalRevenue = activeOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const totalOrders = activeOrders.length;
    const customerOrderCount = new Map<string, number>();

    activeOrders.forEach(order => {
      const key = normalizeBusinessKey(order.customerEmail || order.customerPhone || order.customerTin || order.accountNumber || order.customerName);
      if (key) customerOrderCount.set(key, (customerOrderCount.get(key) || 0) + 1);
    });

    const uniqueCustomers = customerOrderCount.size;
    const repeatCustomers = Array.from(customerOrderCount.values()).filter(count => count > 1).length;
    const now = new Date();
    const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

    branches = branches.map(branch => {
      const branchOrders = activeOrders.filter(o => o.branchId === branch.id);
      const branchRevenue = branchOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const currentRevenue = branchOrders
        .filter(o => new Date(o.timestamp) >= currentMonthStart)
        .reduce((sum, o) => sum + Number(o.total || 0), 0);
      const previousRevenue = branchOrders
        .filter(o => {
          const date = new Date(o.timestamp);
          return date >= previousMonthStart && date < currentMonthStart;
        })
        .reduce((sum, o) => sum + Number(o.total || 0), 0);
      const growth = previousRevenue > 0
        ? Number((((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1))
        : 0;
      return {
        ...branch,
        revenue: branchRevenue,
        orders: branchOrders.length,
        avgOrderValue: branchOrders.length ? branchRevenue / branchOrders.length : 0,
        growth
      };
    });

    customers = customers.map(customer => {
      const customerOrders = activeOrders
        .filter(order => orderMatchesCustomer(order, customer))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const spent = customerOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const orderCount = customerOrders.length;
      return {
        ...customer,
        totalSpent: spent,
        orderCount,
        lastOrderDate: customerOrders.at(-1)?.timestamp || customer.lastOrderDate,
        segment: spent > 10000 ? 'VIP' : orderCount > 3 ? 'Regular' : customer.segment || 'New'
      };
    });

    deliveryPartners = deliveryPartners.map(partner => partner.id === 'DP-INTERNAL'
      ? { ...partner, activeOrders: orders.filter(o => o.type === 'Delivery' && !['Delivered', 'Cancelled'].includes(o.status)).length }
      : partner
    );

    kpis = {
      totalRevenue,
      totalOrders,
      avgOrderValue: totalOrders ? totalRevenue / totalOrders : 0,
      customerRetention: uniqueCustomers ? Math.round((repeatCustomers / uniqueCustomers) * 100) : 0,
      activeUsers: uniqueCustomers,
      // Conversion requires lead/session data, which the current schema does not collect.
      conversionRate: 0
    };
  };

  const getStatePayload = () => {
    recalculateBusinessState();
    return {
      orders, payments, productionTasks, issues, drivers, trips, zones, refunds,
      walletTransactions, payouts, inventory, customers, insights, savedReports, promotions, coffees,
      branches, kpis, recommendations, churnPredictions, priceAdjustments,
      integrations, iotDevices, deliveryPartners, heatmapData, messages, salesImports, userDirectory
    };
  };

  const persistFullState = async () => {
    if (!supabaseAdmin) throw new Error('Supabase persistence is not configured on the server.');
    try {
      recalculateBusinessState();
      for (const key of arrayEntityKeys) {
        const collection = arrayEntityAccessors[key].get();
        const rows = collection.map(item => ({
          entity_type: key,
          entity_id: getEntityId(item, key),
          data: item,
          updated_at: new Date().toISOString()
        }));

        if (rows.length > 0) {
          const { error: upsertError } = await supabaseAdmin
            .from('tomoca_platform_entities')
            .upsert(rows, { onConflict: 'entity_type,entity_id' });
          if (upsertError) throw upsertError;
        }

        const currentIds = rows.map(r => r.entity_id);
        const { data: existing, error: selectError } = await supabaseAdmin
          .from('tomoca_platform_entities')
          .select('entity_id')
          .eq('entity_type', key);
        if (selectError) throw selectError;

        const staleIds = (existing || []).map(r => r.entity_id).filter(id => !currentIds.includes(id));
        if (staleIds.length > 0) {
          const { error: deleteError } = await supabaseAdmin
            .from('tomoca_platform_entities')
            .delete()
            .eq('entity_type', key)
            .in('entity_id', staleIds);
          if (deleteError) throw deleteError;
        }
      }

      const { error: kpiError } = await supabaseAdmin.from('tomoca_platform_entities').upsert({
        entity_type: 'kpis',
        entity_id: 'current',
        data: kpis,
        updated_at: new Date().toISOString()
      }, { onConflict: 'entity_type,entity_id' });
      if (kpiError) throw kpiError;

      if (salesImports.length > 0) {
        const auditRows = salesImports.map(record => ({
          id: record.id,
          source_file_name: record.sourceFileName || '',
          source_file_hash: record.sourceFileHash || '',
          status: record.status,
          document: record.document || null,
          order_id: record.orderId || null,
          error_message: record.errorMessage || null,
          imported_by: record.importedBy || null,
          created_at: record.createdAt,
          updated_at: record.updatedAt
        }));
        const { error: auditError } = await supabaseAdmin
          .from('sales_document_imports')
          .upsert(auditRows, { onConflict: 'id' });
        if (auditError) throw auditError;
      }
    } catch (err) {
      console.error('Failed to persist Tomoca state to Supabase:', err);
      throw err;
    }
  };

  const clearBusinessState = () => {
    for (const key of arrayEntityKeys) arrayEntityAccessors[key].set([]);
    kpis = {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      customerRetention: 0,
      activeUsers: 0,
      conversionRate: 0
    };
  };

  const refreshUserDirectory = async () => {
    userDirectory = [];
    if (!supabaseAdmin) return;
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role')
      .order('full_name', { ascending: true });
    if (error) {
      console.warn('Could not load the Supabase user directory:', error.message);
      return;
    }
    userDirectory = (data || []).map(profile => ({
      id: String(profile.id),
      name: String(profile.full_name || 'User'),
      role: normalizeRole(profile.role)
    }));
  };

  const loadStateFromSupabase = async () => {
    clearBusinessState();
    if (!supabaseAdmin) {
      console.warn('Supabase is not configured; all business pages will remain empty until a database connection is provided.');
      return;
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('tomoca_platform_entities')
        .select('entity_type, entity_id, data')
        .neq('entity_type', 'kpis');

      if (error) throw error;

      const grouped = new Map<string, any[]>();
      for (const row of data || []) {
        const list = grouped.get(row.entity_type) || [];
        list.push(row.data);
        grouped.set(row.entity_type, list);
      }

      for (const key of arrayEntityKeys) {
        arrayEntityAccessors[key].set(grouped.get(key) || []);
      }

      recalculateBusinessState();
      await refreshUserDirectory();
      console.log(`Loaded Tomoca platform state from Supabase (${data?.length || 0} rows).`);
    } catch (err) {
      clearBusinessState();
      console.error('Could not load Tomoca state from Supabase. Business pages were left empty to avoid displaying mock data:', err);
    }
  };

  const emitSync = () => io.emit('sync', getStatePayload());

  const isPointInsideBoundary = (point: Location, boundary: Location[]) => {
    if (!Array.isArray(boundary) || boundary.length < 3) return false;
    let inside = false;
    for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
      const xi = boundary[i].lng;
      const yi = boundary[i].lat;
      const xj = boundary[j].lng;
      const yj = boundary[j].lat;
      const intersects = ((yi > point.lat) !== (yj > point.lat))
        && (point.lng < ((xj - xi) * (point.lat - yi)) / ((yj - yi) || Number.EPSILON) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  };

  const calculateDeliveryFee = (order: Order) => {
    if (order.type !== 'Delivery') return 0;
    const zone = order.location
      ? zones.find(candidate => isPointInsideBoundary(order.location as Location, candidate.boundary || []))
      : undefined;
    if (!zone) {
      order.deliveryFee = 0;
      order.surgeMultiplier = 1;
      return 0;
    }
    const fee = Number((Number(zone.basePrice || 0) * Number(zone.surgeMultiplier || 1)).toFixed(2));
    order.deliveryFee = fee;
    order.surgeMultiplier = Number(zone.surgeMultiplier || 1);
    return fee;
  };

  const syncAfterChange = async (eventName?: string, payload?: any) => {
    await persistFullState();
    if (eventName) io.emit(eventName, payload);
    emitSync();
  };

  app.use(express.json({ limit: '50mb' }));

  app.get('/healthz', (_req, res) => {
    res.json({
      ok: true,
      service: 'tomoca-sales-platform',
      supabase: Boolean(supabaseAdmin),
      time: new Date().toISOString()
    });
  });

  const requireHttpRoles = (allowedRoles: UserRole[]) => async (req: any, res: any, next: any) => {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Supabase server authentication is not configured.' });
    }
    const authorization = String(req.headers.authorization || '');
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    if (!token) return res.status(401).json({ error: 'Authentication is required.' });

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: 'Invalid or expired Supabase session.' });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();
    if (profileError) return res.status(500).json({ error: 'Could not verify the user role.' });
    const role = normalizeRole(profile?.role);
    if (role !== 'Admin' && role !== 'Management' && !allowedRoles.includes(role)) {
      return res.status(403).json({ error: `The ${role} role cannot perform this operation.` });
    }
    req.authenticatedUser = { id: data.user.id, role };
    next();
  };

  await loadStateFromSupabase();

  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);


  // AI Setup
  const ai = hasGeminiKey ? new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  }) : null as any;

  const cleanText = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\s+/g, ' ').trim();
  };

  const parseMoney = (value: unknown): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const raw = cleanText(value);
    if (!raw) return 0;
    const negative = /^\(.*\)$/.test(raw);
    const normalized = raw
      .replace(/[−–—]/g, '-')
      .replace(/[^0-9,.-]/g, '')
      .replace(/,(?=\d{3}(?:\D|$))/g, '')
      .replace(',', '.');
    const number = Number.parseFloat(normalized);
    if (!Number.isFinite(number)) return 0;
    return negative ? -Math.abs(number) : number;
  };

  const normalizePaymentMethod = (value: unknown): PaymentRecord['method'] => {
    const method = cleanText(value).toLowerCase();
    if (method.includes('telebirr')) return 'Telebirr';
    if (method.includes('m-pesa') || method.includes('mpesa')) return 'M-Pesa';
    if (method.includes('card') || method.includes('visa') || method.includes('mastercard')) return 'Card';
    if (method.includes('wallet')) return 'Wallet';
    if (method.includes('cheque') || method.includes('check')) return 'Cheque';
    if (method.includes('cash')) return 'Cash';
    return 'Unknown';
  };

  const inferCategory = (description: string): SalesImportLine['category'] => {
    const text = description.toLowerCase();
    if (/(machine|equipment|mug|merch|grinder|brewer|accessor)/.test(text)) return 'Merchandise';
    if (/(macchiato|espresso|latte|cappuccino|tea|juice|drink|beverage)/.test(text)) return 'Beverage';
    if (/(croissant|cake|sandwich|food|pastry|meal)/.test(text)) return 'Food';
    if (/(ground|powder)/.test(text)) return 'Ground';
    if (/(bundle|combo|package)/.test(text)) return 'Bundle';
    return 'Unclassified';
  };

  const normalizeTransactionDate = (value: unknown, dateMode?: string, specificDate?: string): string => {
    if (dateMode === 'specific_date' && specificDate) {
      const date = new Date(`${specificDate}T12:00:00Z`);
      return Number.isNaN(date.getTime()) ? '' : date.toISOString();
    }
    const raw = cleanText(value);
    if (!raw) return '';
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
  };

  const normalizeParsedDocument = (raw: any, dateMode?: string, specificDate?: string): ParsedSalesDocument => {
    const sourceLines = Array.isArray(raw?.lineItems) ? raw.lineItems : Array.isArray(raw?.items) ? raw.items : [];
    const lineItems: SalesImportLine[] = sourceLines
      .map((line: any, index: number) => {
        const description = cleanText(line?.description || line?.name);
        const quantity = Math.max(0, parseMoney(line?.quantity));
        const statedUnitPrice = Math.max(0, parseMoney(line?.unitPrice ?? line?.price));
        const statedLineTotal = Math.max(0, parseMoney(line?.lineTotal ?? line?.total));
        const unitPrice = statedUnitPrice || (quantity > 0 && statedLineTotal > 0 ? Number((statedLineTotal / quantity).toFixed(2)) : 0);
        const lineTotal = statedLineTotal || Number((quantity * unitPrice).toFixed(2));
        return {
          id: cleanText(line?.id || line?.code) || `LINE-${index + 1}`,
          description,
          unit: cleanText(line?.unit),
          quantity,
          unitPrice,
          lineTotal,
          category: ['Whole Bean', 'Ground', 'Beverage', 'Food', 'Merchandise', 'Bundle', 'Unclassified'].includes(line?.category)
            ? line.category
            : inferCategory(description)
        } as SalesImportLine;
      })
      .filter((line: SalesImportLine) => line.description || line.lineTotal > 0);

    const calculatedSubtotal = Number(lineItems.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2));
    const statedSubtotal = Math.max(0, parseMoney(raw?.subtotal));
    const statedVat = Math.max(0, parseMoney(raw?.vat ?? raw?.tax));
    const statedGrandTotal = Math.max(0, parseMoney(raw?.grandTotal ?? raw?.total));
    const subtotal = statedSubtotal || calculatedSubtotal;
    const grandTotal = statedGrandTotal || Number((subtotal + statedVat).toFixed(2));
    const vat = statedVat || (grandTotal >= subtotal ? Number((grandTotal - subtotal).toFixed(2)) : 0);

    const warnings = Array.isArray(raw?.warnings) ? raw.warnings.map(cleanText).filter(Boolean) : [];
    if (!cleanText(raw?.customerName)) warnings.push('Customer name was not confidently detected.');
    if (!normalizeTransactionDate(raw?.transactionDate ?? raw?.date, dateMode, specificDate)) warnings.push('Transaction date requires review.');
    if (!lineItems.length) warnings.push('No line items were detected.');
    if (grandTotal <= 0) warnings.push('Grand total requires review.');
    if (calculatedSubtotal > 0 && statedSubtotal > 0 && Math.abs(calculatedSubtotal - statedSubtotal) > 0.05) {
      warnings.push(`The line-item total (${calculatedSubtotal}) differs from the stated subtotal (${statedSubtotal}).`);
    }
    if (grandTotal > 0 && subtotal + vat > 0 && Math.abs(grandTotal - (subtotal + vat)) > 0.05) {
      warnings.push('Subtotal plus VAT does not match the grand total.');
    }

    return {
      documentType: cleanText(raw?.documentType),
      sellerName: cleanText(raw?.sellerName),
      customerName: cleanText(raw?.customerName),
      customerEmail: cleanText(raw?.customerEmail),
      customerPhone: cleanText(raw?.customerPhone),
      customerTin: cleanText(raw?.customerTin ?? raw?.tin),
      customerAddress: cleanText(raw?.customerAddress ?? raw?.address),
      accountNumber: cleanText(raw?.accountNumber),
      transactionDate: normalizeTransactionDate(raw?.transactionDate ?? raw?.date, dateMode, specificDate),
      referenceNumber: cleanText(raw?.referenceNumber ?? raw?.reference),
      fsNumber: cleanText(raw?.fsNumber ?? raw?.fsNo ?? raw?.FSNO),
      station: cleanText(raw?.station),
      store: cleanText(raw?.store),
      paymentMethod: normalizePaymentMethod(raw?.paymentMethod),
      currency: cleanText(raw?.currency) || 'ETB',
      subtotal,
      vat,
      grandTotal,
      lineItems,
      confidence: Math.max(0, Math.min(1, Number(raw?.confidence || 0))),
      warnings: Array.from(new Set(warnings))
    };
  };

  // API Routes
  app.post('/api/parse-historical-sales', requireHttpRoles(['Sales Rep', 'Admin', 'Management']), async (req: any, res) => {
    const importId = randomUUID();
    const now = new Date().toISOString();
    const { fileData, mimeType, dateMode, specificDate, fileName, fileHash } = req.body || {};

    const recordFailure = async (message: string) => {
      const failed: SalesImportRecord = {
        id: importId,
        sourceFileName: cleanText(fileName),
        sourceFileHash: cleanText(fileHash),
        status: 'Failed',
        errorMessage: message,
        createdAt: now,
        importedBy: req.authenticatedUser?.id,
        updatedAt: new Date().toISOString()
      };
      salesImports.unshift(failed);
      await persistFullState();
    };

    try {
      if (!hasGeminiKey) {
        const message = 'GEMINI_API_KEY is not configured on the server. Add it to .env to process scanned PDF sales documents.';
        await recordFailure(message);
        return res.status(503).json({ error: message });
      }
      if (!fileData || !mimeType || !fileName || !fileHash) {
        const message = 'The file data, MIME type, filename, and file hash are required.';
        await recordFailure(message);
        return res.status(400).json({ error: message });
      }

      const existingImport = salesImports.find(item => item.status === 'Imported' && item.sourceFileHash === fileHash);
      if (existingImport) {
        const duplicateRecord: SalesImportRecord = {
          id: importId,
          sourceFileName: cleanText(fileName),
          sourceFileHash: cleanText(fileHash),
          status: 'Duplicate',
          document: existingImport.document,
          orderId: existingImport.orderId,
          errorMessage: 'This exact file has already been imported.',
          importedBy: req.authenticatedUser?.id,
          createdAt: now,
          updatedAt: new Date().toISOString()
        };
        salesImports.unshift(duplicateRecord);
        await persistFullState();
        return res.status(409).json({
          error: duplicateRecord.errorMessage,
          duplicate: true,
          orderId: existingImport.orderId
        });
      }

      const prompt = `Read this real sales document. It may be an image-only scanned PDF, a photo, an invoice, a receipt, a cash sales attachment, a spreadsheet, or plain text.

Extract only information that is visible in the supplied document. Do not invent, guess, simulate, or generate customer emails, dates, references, products, amounts, addresses, or payment methods. Use an empty string for missing text and 0 for missing amounts. The title "Cash Sales Attachment" is sufficient evidence for paymentMethod "Cash".

Return one raw JSON object with this exact structure:
{
  "documentType": "",
  "sellerName": "",
  "customerName": "",
  "customerEmail": "",
  "customerPhone": "",
  "customerTin": "",
  "customerAddress": "",
  "accountNumber": "",
  "transactionDate": "ISO 8601 date-time, or empty string",
  "referenceNumber": "",
  "fsNumber": "",
  "station": "",
  "store": "",
  "paymentMethod": "Telebirr | M-Pesa | Card | Wallet | Cheque | Cash | Unknown",
  "currency": "ETB or the currency printed in the document",
  "subtotal": 0,
  "vat": 0,
  "grandTotal": 0,
  "lineItems": [
    {
      "id": "printed item ID/code or empty string",
      "description": "full printed description",
      "unit": "printed unit or empty string",
      "quantity": 0,
      "unitPrice": 0,
      "lineTotal": 0,
      "category": "Whole Bean | Ground | Beverage | Food | Merchandise | Bundle | Unclassified"
    }
  ],
  "confidence": 0,
  "warnings": ["only genuine uncertainties or unreadable fields"]
}

Preserve decimal values exactly as printed. Read every row in the item table. Do not return markdown or explanations.`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: [{ inlineData: { data: fileData, mimeType } }, prompt],
          config: { responseMimeType: 'application/json' }
        });
      } catch (primaryError) {
        console.warn('gemini-2.5-pro failed; falling back to gemini-2.5-flash.', primaryError);
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ inlineData: { data: fileData, mimeType } }, prompt],
          config: { responseMimeType: 'application/json' }
        });
      }

      const responseText = response.text?.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim() || '{}';
      const parsed = JSON.parse(responseText);
      const document = normalizeParsedDocument(parsed, dateMode, specificDate);
      const parsedRecord: SalesImportRecord = {
        id: importId,
        sourceFileName: cleanText(fileName),
        sourceFileHash: cleanText(fileHash),
        status: 'Parsed',
        document,
        importedBy: req.authenticatedUser?.id,
        createdAt: now,
        updatedAt: new Date().toISOString()
      };
      salesImports.unshift(parsedRecord);
      await persistFullState();
      res.json({ importId, document });
    } catch (err: any) {
      const message = err?.message || 'Failed to parse the sales document.';
      console.error('Error parsing historical sales:', err);
      if (!salesImports.some(item => item.id === importId)) await recordFailure(message);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/parse-receipt', requireHttpRoles(['Customer', 'Sales Rep', 'Payment Collector']), async (req, res) => {
    try {
      if (!hasGeminiKey) {
        return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server. Add it to .env to enable receipt/cheque parsing.' });
      }
      const { fileData, mimeType, paymentMethod } = req.body;
      if (!fileData || !mimeType) {
        return res.status(400).json({ error: "Missing file data or mime type" });
      }

      let prompt = "Extract the transaction or receipt number from this document. Respond strictly in JSON format with key: \"receiptNumber\". Only return the raw JSON object, no markdown blocks.";
      
      if (paymentMethod === 'Cheque') {
        prompt = "Extract the cheque number, bank name, and due date (if any) from this document. Respond strictly in JSON format with keys: \"chequeNumber\", \"bank\", \"dueDate\". Only return the raw JSON object, no markdown blocks.";
      }

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              inlineData: {
                data: fileData,
                mimeType: mimeType
              }
            },
            prompt
          ],
        });
      } catch (err: any) {
        if (err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('high demand') || err?.status === 'UNAVAILABLE') {
          console.log("gemini-2.5-flash unavailable, falling back to gemini-2.5-flash-8b...");
          response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-8b',
            contents: [
              {
                inlineData: {
                  data: fileData,
                  mimeType: mimeType
                }
              },
              prompt
            ],
          });
        } else {
          throw err;
        }
      }

      let extractedData = {};
      try {
        const text = response.text ? response.text.trim().replace(/^```(?:json)?/, '').replace(/```$/, '').trim() : '{}';
        extractedData = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse JSON from AI response", response.text);
        // Fallback for simple receipt numbers if JSON parsing fails
        if (paymentMethod !== 'Cheque') {
           extractedData = { receiptNumber: response.text?.trim() };
        }
      }
      
      res.json(extractedData);
    } catch (err: any) {
      console.error("Error parsing receipt/cheque:", err);
      res.status(500).json({ error: "Failed to parse receipt/cheque" });
    }
  });

  app.post('/api/generate-advanced-report', requireHttpRoles(['Sales Rep', 'Marketing']), async (req, res) => {
    try {
      if (!hasGeminiKey) {
        return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server. Add it to .env to enable AI report generation.' });
      }
      const { startDate, endDate, filteredOrders, filteredPayments, uploadedFile } = req.body;
      
      const prompt = `
        You are an advanced data analysis AI. Analyze the following business data for the date range ${startDate} to ${endDate}.
        ${uploadedFile ? "There is also an uploaded file containing previous historical sales or supplementary records. You MUST analyze this embedded file data in parallel with the JSON data to identify historical trends or prior sales results. Smoothly integrate insights derived from the uploaded file into your report." : ""}
        
        Orders Data (JSON):
        ${JSON.stringify(filteredOrders)}
        
        Payments Data (JSON):
        ${JSON.stringify(filteredPayments)}
        
        Create a comprehensive analytics report in Markdown format following this exact template. ONLY use the data provided above and the embedded uploaded file (if present). DO NOT invent, simulate, or mock any data. If data is missing for a section, state "Insufficient data available."
        
        # Sales Performance Report

        **Company/Organization:** TO.MO.CA. COFFEE PLC
        **Report Period:** ${startDate} to ${endDate}
        **Prepared By:** AI Analytics System
        **Date:** ${new Date().toISOString().split('T')[0]}
        
        ---
        
        ## 1. Executive Summary
        
        This report presents a detailed analysis of sales performance for the period of **${startDate} to ${endDate}**. It reviews overall revenue, sales growth, product/service performance, customer trends, regional performance, and key challenges affecting sales outcomes.
        
        [Fill in the rest of the template based on the data provided]
        
        ## 2. Sales Objectives
        
        [Fill in]
        
        ## 3. Overall Sales Performance
        
        [Include markdown table as per template]
        
        [Performance Analysis text]
        
        ## 4. Sales Trend Analysis
        
        [Include markdown table as per template]
        
        [Trend Interpretation text]
        
        ## 5. Product or Service Performance
        
        [Include markdown table as per template]
        
        [Product/Service Analysis text]
        
        ## 6. Customer Analysis
        
        [Include markdown table as per template]
        
        [Customer Insights text]
        
        ## 7. Regional or Branch Sales Performance
        
        [Include markdown table as per template]
        
        [Regional Analysis text]
        
        ## 8. Sales Team Performance
        
        [Include markdown table as per template]
        
        [Team Performance Analysis text]
        
        ## 9. Marketing and Promotion Impact
        
        [Fill in based STRICTLY on data. If no data, say "Insufficient data"]
        
        ## 10. Key Challenges
        
        [Fill in]
        
        ## 11. Key Findings
        
        [Fill in]
        
        ## 12. Recommendations
        
        [Fill in]
        
        ## 13. Conclusion
        
        [Fill in]
        
        ## 14. Appendix
        
        [Fill in Appendix data]
      `;

      let contents: any[] = [prompt];
      if (uploadedFile) {
        contents.unshift({
          inlineData: {
            data: uploadedFile.data,
            mimeType: uploadedFile.mimeType
          }
        });
      }

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: contents,
        });
      } catch (err: any) {
        if (err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('high demand') || err?.status === 'UNAVAILABLE') {
          console.log("gemini-2.5-flash unavailable, falling back to gemini-2.5-flash-8b...");
          response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-8b',
            contents: contents,
          });
        } else {
          throw err;
        }
      }

      const savedReport: SavedReport = {
        id: `REP-${Date.now()}`,
        title: `Business Performance Report: ${startDate} to ${endDate}`,
        startDate,
        endDate,
        markdown: response.text || '',
        timestamp: new Date().toISOString()
      };
      savedReports.unshift(savedReport);
      await syncAfterChange('saved_reports_updated', savedReports);
      res.json(savedReport);
    } catch (err) {
      console.error("AI Report generation failed:", err);
      res.status(500).json({ error: "Failed to generate report", details: err?.message || String(err) });
    }
  });

  app.get('/api/state', requireHttpRoles(validRoles), (req, res) => {
    res.json({ 
      orders, payments, productionTasks, issues, drivers, trips, zones, refunds, 
      walletTransactions, payouts, inventory, customers, insights, savedReports, promotions, coffees,
      branches, kpis, recommendations, churnPredictions, priceAdjustments,
      integrations, iotDevices, deliveryPartners, heatmapData, messages, salesImports
    });
  });

  // WebSocket logic
  io.use(async (socket, next) => {
    const handshakeUser = socket.handshake.auth?.user as Partial<UserProfile> | undefined;
    const token = socket.handshake.auth?.token as string | undefined;

    try {
      if (supabaseAdmin) {
        if (!token) return next(new Error('Supabase authentication is required.'));
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !data.user) return next(new Error('Invalid or expired Supabase session.'));

        let profileRole: string | undefined;
        let fullName = data.user.user_metadata?.full_name as string | undefined;
        let walletBalance = 0;
        let loyaltyPoints = 0;
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('full_name, role, wallet_balance, loyalty_points')
          .eq('id', data.user.id)
          .maybeSingle();
        if (profileError) console.warn('Could not read the authenticated profile:', profileError.message);
        profileRole = profile?.role;
        fullName = profile?.full_name || fullName;
        walletBalance = Number(profile?.wallet_balance || 0);
        loyaltyPoints = Number(profile?.loyalty_points || 0);

        socket.data.user = {
          id: data.user.id,
          name: fullName || data.user.email?.split('@')[0] || 'User',
          email: data.user.email || '',
          role: normalizeRole(profileRole),
          walletBalance,
          loyaltyPoints
        };
        return next();
      }

      // Without server-side Supabase credentials the socket is read-only Customer access.
      socket.data.user = {
        id: handshakeUser?.id || `ANON-${socket.id}`,
        name: handshakeUser?.name || 'Guest',
        email: handshakeUser?.email || '',
        role: 'Customer',
        walletBalance: 0,
        loyaltyPoints: 0
      };
      next();
    } catch (err) {
      console.error('Socket auth failed:', err);
      socket.data.user = { id: `ANON-${socket.id}`, name: 'Guest', role: 'Customer' };
      next();
    }
  });

  const canRun = (socket: any, eventName: string, allowedRoles: UserRole[]) => {
    const role = normalizeRole(socket.data.user?.role);
    if (role === 'Admin' || role === 'Management' || allowedRoles.includes(role)) return true;
    socket.emit('permission_denied', {
      event: eventName,
      role,
      message: `Your role (${role}) cannot run ${eventName}.`
    });
    return false;
  };

  const guarded = <T,>(socket: any, eventName: string, allowedRoles: UserRole[], handler: (payload: T) => Promise<void> | void) => {
    socket.on(eventName, async (payload: T) => {
      if (!canRun(socket, eventName, allowedRoles)) return;
      try {
        await handler(payload);
      } catch (err: any) {
        console.error(`Socket event ${eventName} failed:`, err);
        socket.emit('operation_error', { event: eventName, message: err?.message || 'Operation failed' });
      }
    });
  };

  type ConfirmSalesImportPayload = {
    importId: string;
    sourceFileName: string;
    sourceFileHash: string;
    branchId?: string;
    document: ParsedSalesDocument;
  };

  const importedDocumentDuplicate = (payload: ConfirmSalesImportPayload): Order | undefined => {
    const document = payload.document;
    const date = document.transactionDate ? new Date(document.transactionDate).toISOString().slice(0, 10) : '';
    return orders.find(order => {
      if (order.importId === payload.importId) return false;
      if (payload.sourceFileHash && order.sourceFileHash === payload.sourceFileHash) return true;
      const sameReference = Boolean(document.referenceNumber && order.referenceNumber && normalizeBusinessKey(document.referenceNumber) === normalizeBusinessKey(order.referenceNumber));
      const sameFs = Boolean(document.fsNumber && order.fsNumber && normalizeBusinessKey(document.fsNumber) === normalizeBusinessKey(order.fsNumber));
      const sameDate = Boolean(date && order.timestamp && new Date(order.timestamp).toISOString().slice(0, 10) === date);
      const sameTotal = Math.abs(Number(order.total || 0) - Number(document.grandTotal || 0)) < 0.01;
      return (sameReference || sameFs) && sameDate && sameTotal;
    });
  };

  const resolveImportedBranchId = (document: ParsedSalesDocument, requestedBranchId?: string): string | undefined => {
    if (requestedBranchId && branches.some(branch => branch.id === requestedBranchId)) return requestedBranchId;
    const documentLocation = normalizeBusinessKey([document.store, document.station].filter(Boolean).join(' '));
    if (!documentLocation) return undefined;
    return branches.find(branch => {
      const branchKey = normalizeBusinessKey(`${branch.id} ${branch.name} ${branch.location}`);
      return branchKey.includes(documentLocation) || documentLocation.includes(normalizeBusinessKey(branch.name));
    })?.id;
  };

  const upsertImportedCustomer = (document: ParsedSalesDocument, timestamp: string) => {
    const candidate: Partial<UserProfile> = {
      name: document.customerName,
      email: document.customerEmail || '',
      phone: document.customerPhone || undefined,
      address: document.customerAddress || undefined,
      tin: document.customerTin || undefined,
      accountNumber: document.accountNumber || undefined
    };
    const existing = customers.find(customer => {
      const pairs = [
        [candidate.email, customer.email],
        [candidate.phone, customer.phone],
        [candidate.tin, customer.tin],
        [candidate.accountNumber, customer.accountNumber],
        [candidate.name, customer.name]
      ];
      return pairs.some(([a, b]) => Boolean(a && b && normalizeBusinessKey(a) === normalizeBusinessKey(b)));
    });

    if (existing) {
      existing.name = candidate.name || existing.name;
      existing.email = candidate.email || existing.email;
      existing.phone = candidate.phone || existing.phone;
      existing.address = candidate.address || existing.address;
      existing.tin = candidate.tin || existing.tin;
      existing.accountNumber = candidate.accountNumber || existing.accountNumber;
      existing.lastOrderDate = timestamp;
      return existing;
    }

    const identity = document.customerTin || document.customerEmail || document.accountNumber || document.customerName;
    const customer: UserProfile = {
      id: identity ? `CUST-${normalizeBusinessKey(identity).slice(0, 48)}` : `CUST-${randomUUID()}`,
      name: document.customerName,
      email: document.customerEmail || '',
      role: 'Customer',
      phone: document.customerPhone || undefined,
      address: document.customerAddress || undefined,
      tin: document.customerTin || undefined,
      accountNumber: document.accountNumber || undefined,
      walletBalance: 0,
      loyaltyPoints: 0,
      totalSpent: 0,
      orderCount: 0,
      segment: 'New',
      joinDate: timestamp,
      lastOrderDate: timestamp
    };
    customers.push(customer);
    return customer;
  };

  const confirmSalesImport = async (payload: ConfirmSalesImportPayload, importedBy?: string) => {
    const document = normalizeParsedDocument(payload.document);
    const errors: string[] = [];
    if (!payload.importId) errors.push('Import ID is missing.');
    if (!payload.sourceFileName) errors.push('Source filename is missing.');
    if (!payload.sourceFileHash) errors.push('Source file hash is missing.');
    if (!document.customerName) errors.push('Customer name is required.');
    if (!document.transactionDate || Number.isNaN(new Date(document.transactionDate).getTime())) errors.push('A valid transaction date is required.');
    if (!document.lineItems.length) errors.push('At least one sales line is required.');
    if (document.lineItems.some(line => !line.description || line.quantity <= 0 || line.unitPrice < 0 || line.lineTotal < 0)) {
      errors.push('Each sales line needs a description, positive quantity, and valid amounts.');
    }
    if (document.grandTotal <= 0) errors.push('Grand total must be greater than zero.');
    if (document.paymentMethod === 'Unknown') errors.push('Select a payment method before importing.');

    if (errors.length) throw new Error(errors.join(' '));

    const duplicate = importedDocumentDuplicate({ ...payload, document });
    if (duplicate) {
      const record = salesImports.find(item => item.id === payload.importId);
      if (record) {
        record.status = 'Duplicate';
        record.orderId = duplicate.id;
        record.document = document;
        record.updatedAt = new Date().toISOString();
      }
      await persistFullState();
      return { success: false, duplicate: true, orderId: duplicate.id, message: 'This sale is already in the system.' };
    }

    const timestamp = new Date(document.transactionDate).toISOString();
    const orderId = `IMP-${randomUUID()}`;
    const branchId = resolveImportedBranchId(document, payload.branchId);
    const items: CartItem[] = document.lineItems.map((line, index) => ({
      id: line.id || `LINE-${index + 1}`,
      name: line.description,
      description: line.description,
      price: Number(line.unitPrice),
      quantity: Number(line.quantity),
      category: line.category,
      image: '',
      origin: '',
      roast: 'N/A',
      tags: [],
      branchId
    }));

    const order: Order = {
      id: orderId,
      items,
      total: Number(document.grandTotal.toFixed(2)),
      status: 'Delivered',
      customerName: document.customerName,
      customerEmail: document.customerEmail || '',
      customerPhone: document.customerPhone || undefined,
      address: document.customerAddress || '',
      timestamp,
      type: 'Imported',
      paymentMethod: document.paymentMethod,
      branchId,
      source: 'Imported Document',
      importId: payload.importId,
      sourceFileName: payload.sourceFileName,
      sourceFileHash: payload.sourceFileHash,
      documentType: document.documentType,
      referenceNumber: document.referenceNumber,
      fsNumber: document.fsNumber,
      customerTin: document.customerTin,
      accountNumber: document.accountNumber,
      station: document.station,
      store: document.store,
      subtotal: Number(document.subtotal.toFixed(2)),
      vat: Number(document.vat.toFixed(2)),
      currency: document.currency || 'ETB'
    };

    const payment: PaymentRecord = {
      id: `PAY-${orderId}`,
      orderId,
      amount: order.total,
      method: document.paymentMethod,
      status: document.paymentMethod === 'Cheque' ? 'Pending' : 'Cleared',
      customerName: document.customerName,
      customerEmail: document.customerEmail || undefined,
      receiptNumber: document.referenceNumber || document.fsNumber || undefined,
      timestamp
    };

    orders.push(order);
    payments.push(payment);
    upsertImportedCustomer(document, timestamp);

    const importRecord = salesImports.find(item => item.id === payload.importId);
    const updatedRecord: SalesImportRecord = {
      id: payload.importId,
      sourceFileName: payload.sourceFileName,
      sourceFileHash: payload.sourceFileHash,
      status: 'Imported',
      document,
      orderId,
      importedBy,
      createdAt: importRecord?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (importRecord) Object.assign(importRecord, updatedRecord);
    else salesImports.unshift(updatedRecord);

    await persistFullState();
    emitSync();
    return { success: true, duplicate: false, orderId, message: 'Sales document imported successfully.' };
  };

  io.on('connection', async (socket) => {
    await refreshUserDirectory();
    console.log('User connected:', socket.id, socket.data.user?.role);

    // Initial sync
    socket.emit('sync', getStatePayload());

    guarded<Order>(socket, 'create_order', ['Sales Rep', 'Customer', 'Admin'], async (incomingOrder) => {
      const order: Order = { ...incomingOrder };
      order.id = order.id || `ORD-${randomUUID()}`;
      order.timestamp = order.timestamp || new Date().toISOString();
      order.status = order.status || 'Pending';
      order.branchId = order.branchId || order.items?.find((item: any) => item.branchId)?.branchId;

      if (normalizeRole(socket.data.user?.role) === 'Customer') {
        order.customerName = socket.data.user?.name || order.customerName;
        order.customerEmail = socket.data.user?.email || order.customerEmail;
        order.salesRepId = undefined;
      }

      const subtotal = (order.items || []).reduce((sum: number, item: CartItem) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
      const deliveryFee = calculateDeliveryFee(order);
      order.total = Number((subtotal + deliveryFee).toFixed(2));

      if (order.paymentMethod === 'Wallet') {
        const transaction: WalletTransaction = {
          id: `WT-${Date.now()}`,
          userId: order.customerEmail,
          amount: order.total,
          type: 'Debit',
          description: `Order #${order.id}`,
          timestamp: new Date().toISOString()
        };
        walletTransactions.push(transaction);
        io.emit('wallet_transaction_added', transaction);
      }

      orders.push(order);

      const payment: PaymentRecord = {
        id: `PAY-${order.id}`,
        orderId: order.id,
        amount: order.total,
        method: order.paymentMethod as any,
        status: order.paymentMethod === 'Cheque' ? 'Pending' : 'Cleared',
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        chequeNumber: (order as any).chequeNumber,
        bank: (order as any).bank,
        dueDate: (order as any).dueDate,
        timestamp: new Date().toISOString()
      };
      payments.push(payment);

      const task: ProductionTask = {
        id: `TASK-${order.id}`,
        orderId: order.id,
        items: order.items,
        status: 'Not Started',
        updatedAt: new Date().toISOString()
      };
      productionTasks.push(task);

      // Inventory is changed only when a real inventory row exactly matches a sold product.
      // This avoids invented bean/cup deductions when no product-to-inventory mapping exists.
      inventory = inventory.map(inventoryItem => {
        if (order.branchId && inventoryItem.branchId && inventoryItem.branchId !== order.branchId) return inventoryItem;
        const soldQuantity = order.items
          .filter(item => normalizeBusinessKey(item.id) === normalizeBusinessKey(inventoryItem.id) || normalizeBusinessKey(item.name) === normalizeBusinessKey(inventoryItem.name))
          .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        return soldQuantity > 0
          ? { ...inventoryItem, quantity: Math.max(0, Number(inventoryItem.quantity || 0) - soldQuantity) }
          : inventoryItem;
      });

      const existingCustomer = customers.find(customer => orderMatchesCustomer(order, customer));
      if (existingCustomer) {
        existingCustomer.name = order.customerName || existingCustomer.name;
        existingCustomer.email = order.customerEmail || existingCustomer.email;
        existingCustomer.phone = order.customerPhone || existingCustomer.phone;
        existingCustomer.address = order.address || existingCustomer.address;
        existingCustomer.lastOrderDate = order.timestamp;
      } else {
        customers.push({
          id: order.customerEmail || order.customerPhone || `CUST-${randomUUID()}`,
          name: order.customerName,
          email: order.customerEmail || '',
          phone: order.customerPhone,
          address: order.address,
          role: 'Customer',
          walletBalance: 0,
          loyaltyPoints: 0,
          totalSpent: 0,
          orderCount: 0,
          segment: 'New',
          joinDate: order.timestamp,
          lastOrderDate: order.timestamp
        });
      }

      await persistFullState();
      io.emit('order_created', { order, task });
      emitSync();
    });

    guarded<{ orderId: string, status: OrderStatus }>(socket, 'update_order_status', ['Sales Rep', 'Factory/Ops', 'Driver', 'Admin'], async ({ orderId, status }) => {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      if (normalizeRole(socket.data.user?.role) === 'Driver') {
        const ownsOrder = trips.some(trip => trip.driverId === socket.data.user?.id && trip.orderIds.includes(orderId));
        if (!ownsOrder) throw new Error('Drivers can update only orders assigned to their own trip.');
      }
      order.status = status;
      await syncAfterChange('order_updated', order);
    });

    guarded<PaymentRecord>(socket, 'add_payment', ['Admin', 'Sales Rep', 'Payment Collector'], async (payment) => {
      payments.push(payment);
      await syncAfterChange('payment_added', payment);
    });

    guarded<{ paymentId: string, status: PaymentRecord['status'] }>(socket, 'update_payment_status', ['Admin', 'Payment Collector'], async ({ paymentId, status }) => {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) return;
      payment.status = status;
      await syncAfterChange('payment_updated', payment);
    });

    guarded<{ paymentId: string, note: any }>(socket, 'add_payment_note', ['Admin', 'Sales Rep', 'Payment Collector'], async ({ paymentId, note }) => {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) return;
      if (!payment.notes) payment.notes = [];
      payment.notes.push(note);
      await syncAfterChange('payment_note_added', { paymentId, note });
    });

    socket.on('confirm_sales_import', async (payload: ConfirmSalesImportPayload, acknowledge?: (response: any) => void) => {
      if (!canRun(socket, 'confirm_sales_import', ['Sales Rep', 'Admin', 'Management'])) {
        acknowledge?.({ success: false, message: 'You do not have permission to import sales documents.' });
        return;
      }
      try {
        const result = await confirmSalesImport(payload, socket.data.user?.id);
        acknowledge?.(result);
      } catch (err: any) {
        const record = salesImports.find(item => item.id === payload?.importId);
        if (record) {
          record.status = 'Failed';
          record.errorMessage = err?.message || 'Import failed.';
          record.updatedAt = new Date().toISOString();
          await persistFullState();
        }
        const message = err?.message || 'Import failed.';
        socket.emit('operation_error', { event: 'confirm_sales_import', message });
        acknowledge?.({ success: false, message });
      }
    });

    guarded<AIInsight>(socket, 'save_insight', ['Sales Rep', 'Admin', 'Marketing'], async (insight) => {
      insights.unshift(insight);
      await syncAfterChange('insights_updated', insights);
    });

    guarded<SavedReport>(socket, 'save_report', ['Sales Rep', 'Admin', 'Marketing'], async (report) => {
      const existingIndex = savedReports.findIndex(r => r.id === report.id);
      const normalizedReport: SavedReport = {
        ...report,
        timestamp: report.timestamp || new Date().toISOString()
      };
      if (existingIndex >= 0) {
        savedReports[existingIndex] = normalizedReport;
      } else {
        savedReports.unshift(normalizedReport);
      }
      await syncAfterChange('saved_reports_updated', savedReports);
    });

    guarded<string>(socket, 'delete_report', ['Sales Rep', 'Admin', 'Marketing'], async (reportId) => {
      savedReports = savedReports.filter(r => r.id !== reportId);
      await syncAfterChange('saved_reports_updated', savedReports);
    });

    guarded<RefundRecord>(socket, 'process_refund', ['Sales Rep', 'Admin', 'Payment Collector'], async (refund) => {
      refunds.push(refund);
      const payment = payments.find(p => p.id === refund.paymentId);
      if (payment) {
        payment.refundedAmount = (payment.refundedAmount || 0) + refund.amount;
        payment.status = payment.refundedAmount >= payment.amount ? 'Refunded' : 'Partially Refunded';

        if (payment.method === 'Wallet') {
          const transaction: WalletTransaction = {
            id: `WT-${Date.now()}`,
            userId: payment.customerEmail || payment.customerName,
            amount: refund.amount,
            type: 'Credit',
            description: `Refund for Order #${payment.orderId}`,
            timestamp: new Date().toISOString()
          };
          walletTransactions.push(transaction);
          io.emit('wallet_transaction_added', transaction);
        }
        io.emit('payment_updated', payment);
      }
      await syncAfterChange('refund_processed', refund);
    });

    guarded<{ userId: string, amount: number }>(socket, 'wallet_top_up', ['Sales Rep', 'Admin', 'Payment Collector'], async ({ userId, amount }) => {
      const transaction: WalletTransaction = {
        id: `WT-${Date.now()}`,
        userId,
        amount,
        type: 'Credit',
        description: 'Wallet Top-up',
        timestamp: new Date().toISOString()
      };
      walletTransactions.push(transaction);
      await syncAfterChange('wallet_transaction_added', transaction);
    });

    guarded<PayoutRecord>(socket, 'request_payout', ['Admin', 'Driver'], async (incomingPayout) => {
      const role = normalizeRole(socket.data.user?.role);
      const driverId = role === 'Driver' ? socket.data.user?.id : incomingPayout.driverId;
      const driver = drivers.find(item => item.id === driverId);
      if (!driver) throw new Error('The driver record could not be found.');
      const amount = Number(incomingPayout.amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Payout amount must be greater than zero.');
      if (amount > Number(driver.totalEarnings || 0)) throw new Error('Payout amount exceeds the driver balance.');
      const payout: PayoutRecord = {
        ...incomingPayout,
        id: incomingPayout.id || `PO-${randomUUID()}`,
        driverId: driver.id,
        amount,
        status: 'Pending',
        timestamp: new Date().toISOString()
      };
      payouts.push(payout);
      await syncAfterChange('payout_requested', payout);
    });

    guarded<{ payoutId: string, status: 'Processed' }>(socket, 'process_payout', ['Admin'], async ({ payoutId, status }) => {
      const payout = payouts.find(p => p.id === payoutId);
      if (!payout) return;
      payout.status = status;
      const driver = drivers.find(d => d.id === payout.driverId);
      if (driver) driver.totalEarnings = Math.max(0, driver.totalEarnings - payout.amount);
      await syncAfterChange('payout_updated', payout);
    });

    guarded<{ taskId: string, status: ProductionTask['status'] }>(socket, 'update_production_status', ['Admin', 'Factory/Ops'], async ({ taskId, status }) => {
      const task = productionTasks.find(t => t.id === taskId);
      if (!task) return;
      task.status = status;
      task.updatedAt = new Date().toISOString();

      const order = orders.find(o => o.id === task.orderId);
      if (order) {
        order.status = status as any;
        if (status === 'Ready for Dispatch' && order.type === 'Delivery' && !order.tripId) {
          const availableDriver = drivers.find(d => d.status === 'Available');
          if (availableDriver) {
            const trip: DeliveryTrip = {
              id: `TRIP-${order.id}`,
              driverId: availableDriver.id,
              orderIds: [order.id],
              status: 'Assigned',
              startTime: new Date().toISOString(),
              route: order.location ? [availableDriver.currentLocation, order.location] : [availableDriver.currentLocation],
              estimatedTime: 0
            };
            trips.push(trip);
            availableDriver.status = 'Busy';
            availableDriver.activeTripId = trip.id;
            order.driverId = availableDriver.id;
            order.tripId = trip.id;
            io.emit('trip_assigned', { trip, driver: availableDriver });
          }
        }
        io.emit('order_updated', order);
      }
      await syncAfterChange('production_updated', task);
    });

    guarded<InventoryItem>(socket, 'update_inventory', ['Admin', 'Factory/Ops'], async (updatedItem) => {
      inventory = inventory.map(item => item.id === updatedItem.id ? updatedItem : item);
      await syncAfterChange('inventory_updated', inventory);
    });

    guarded<InventoryItem>(socket, 'add_inventory', ['Admin', 'Factory/Ops'], async (newItem) => {
      inventory.push(newItem);
      await syncAfterChange('inventory_updated', inventory);
    });

    guarded<UserProfile>(socket, 'update_customer', ['Admin', 'Sales Rep', 'Marketing'], async (updatedCustomer) => {
      customers = customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c);
      await syncAfterChange('customers_updated', customers);
    });

    guarded<Promotion>(socket, 'add_promotion', ['Admin', 'Marketing'], async (newPromotion) => {
      promotions.push(newPromotion);
      await syncAfterChange('promotions_updated', promotions);
    });

    guarded<string>(socket, 'toggle_promotion', ['Admin', 'Marketing'], async (promoId) => {
      const promo = promotions.find(p => p.id === promoId);
      if (!promo) return;
      promo.isActive = !promo.isActive;
      await syncAfterChange('promotions_updated', promotions);
    });

    guarded<Coffee>(socket, 'update_coffee', ['Admin', 'Factory/Ops'], async (updatedCoffee) => {
      coffees = coffees.map(c => c.id === updatedCoffee.id ? updatedCoffee : c);
      await syncAfterChange('coffees_updated', coffees);
    });

    guarded<Coffee>(socket, 'add_coffee', ['Admin', 'Factory/Ops'], async (newCoffee) => {
      coffees.push(newCoffee);
      await syncAfterChange('coffees_updated', coffees);
    });

    guarded<string>(socket, 'delete_coffee', ['Admin', 'Factory/Ops'], async (coffeeId) => {
      coffees = coffees.filter(c => c.id !== coffeeId);
      await syncAfterChange('coffees_updated', coffees);
    });

    guarded<Branch>(socket, 'add_branch', ['Admin'], async (newBranch) => {
      branches.push({ ...newBranch, revenue: newBranch.revenue || 0, orders: newBranch.orders || 0, avgOrderValue: newBranch.avgOrderValue || 0 });
      await syncAfterChange('branches_updated', branches);
    });

    guarded<Branch>(socket, 'update_branch', ['Admin'], async (updatedBranch) => {
      branches = branches.map(b => b.id === updatedBranch.id ? updatedBranch : b);
      await syncAfterChange('branches_updated', branches);
    });

    guarded<string>(socket, 'delete_branch', ['Admin'], async (branchId) => {
      branches = branches.filter(b => b.id !== branchId);
      await syncAfterChange('branches_updated', branches);
    });

    guarded<{ driverId: string, location: Location }>(socket, 'driver_location_update', ['Admin', 'Driver'], async ({ driverId, location }) => {
      const role = normalizeRole(socket.data.user?.role);
      const effectiveDriverId = role === 'Driver' ? socket.data.user?.id : driverId;
      if (role === 'Driver' && driverId !== effectiveDriverId) throw new Error('Drivers can update only their own location.');
      if (!Number.isFinite(location?.lat) || !Number.isFinite(location?.lng)) throw new Error('A valid latitude and longitude are required.');
      const driver = drivers.find(d => d.id === effectiveDriverId);
      if (!driver) throw new Error('The driver record could not be found.');
      driver.currentLocation = location;
      await syncAfterChange('driver_location_updated', { driverId: effectiveDriverId, location });
    });

    guarded<{ tripId: string, status: DeliveryTrip['status'] }>(socket, 'update_trip_status', ['Admin', 'Driver'], async ({ tripId, status }) => {
      const trip = trips.find(t => t.id === tripId);
      if (!trip) return;
      if (normalizeRole(socket.data.user?.role) === 'Driver' && trip.driverId !== socket.data.user?.id) {
        throw new Error('Drivers can update only their own assigned trip.');
      }
      trip.status = status;
      if (status === 'Completed') {
        trip.endTime = new Date().toISOString();
        const driver = drivers.find(d => d.id === trip.driverId);
        if (driver) {
          driver.status = 'Available';
          driver.activeTripId = undefined;
        }
        trip.orderIds.forEach(orderId => {
          const order = orders.find(o => o.id === orderId);
          if (order) order.status = 'Delivered';
        });
      } else if (status === 'Picked Up') {
        trip.orderIds.forEach(orderId => {
          const order = orders.find(o => o.id === orderId);
          if (order) order.status = 'Out for Delivery';
        });
      }
      await syncAfterChange('trip_updated', trip);
    });

    guarded<Issue>(socket, 'report_issue', ['Sales Rep', 'Admin', 'Customer', 'Driver', 'Factory/Ops', 'Payment Collector'], async (issue) => {
      issues.push(issue);
      await syncAfterChange('issue_reported', issue);
    });

    guarded<Integration>(socket, 'update_integration', ['Admin', 'Factory/Ops'], async (updated) => {
      integrations = integrations.map(i => i.id === updated.id ? updated : i);
      await syncAfterChange('integrations_updated', integrations);
    });

    guarded<string>(socket, 'sync_integration', ['Admin', 'Factory/Ops'], async (id) => {
      const integration = integrations.find(i => i.id === id);
      if (!integration) return;
      integration.lastSync = new Date().toISOString();
      if (id === 'INT-SUPABASE') integration.status = supabaseAdmin ? 'Connected' : 'Disconnected';
      await syncAfterChange('integrations_updated', integrations);
    });

    guarded<IoTDevice>(socket, 'update_iot_device', ['Admin', 'Factory/Ops'], async (updated) => {
      iotDevices = iotDevices.map(d => d.id === updated.id ? updated : d);
      await syncAfterChange('iot_devices_updated', iotDevices);
    });

    guarded<DeliveryPartner>(socket, 'update_delivery_partner', ['Admin', 'Factory/Ops'], async (updated) => {
      deliveryPartners = deliveryPartners.map(p => p.id === updated.id ? updated : p);
      await syncAfterChange('delivery_partners_updated', deliveryPartners);
    });

    guarded<{ issueId: string, comment: any }>(socket, 'add_comment', ['Sales Rep', 'Admin', 'Customer', 'Driver', 'Factory/Ops', 'Payment Collector'], async ({ issueId, comment }) => {
      const issue = issues.find(i => i.id === issueId);
      if (!issue) return;
      issue.comments.push(comment);
      await syncAfterChange('comment_added', { issueId, comment });
    });

    guarded<DirectMessage>(socket, 'send_message', validRoles, async (incomingMessage) => {
      const msg: DirectMessage = {
        ...incomingMessage,
        id: incomingMessage.id || `MSG-${randomUUID()}`,
        senderId: socket.data.user?.id,
        senderName: socket.data.user?.name || 'User',
        timestamp: new Date().toISOString(),
        isRead: false
      };
      messages.push(msg);
      await syncAfterChange('message_received', msg);
    });

    guarded<string>(socket, 'mark_message_read', validRoles, async (id) => {
      const msg = messages.find(m => m.id === id);
      if (!msg) return;
      msg.isRead = true;
      await syncAfterChange('message_updated', msg);
    });
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
