import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  Coffee as CoffeeIcon, 
  ShoppingCart, 
  Truck, 
  BarChart3, 
  Store, 
  Plus, 
  Minus, 
  Trash2, 
  Package,
  Menu,
  X,
  ChevronRight,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  Search,
  User,
  Wallet,
  CreditCard,
  Smartphone,
  MapPin,
  Bell,
  Star,
  History,
  RotateCcw,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  MessageSquare,
  FileText,
  Activity,
  Database,
  Send,
  TrendingDown,
  Zap,
  LayoutGrid,
  Settings,
  Target,
  Brain,
  Tag,
  Warehouse,
  Edit3,
  Link2,
  Cpu,
  MessageSquareText,
  Calculator,
  Globe,
  Loader,
  Upload,
  Sparkles,
  Download,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { io, Socket } from 'socket.io-client';
import { cn } from './lib/utils';
import { supabase } from './lib/supabase';
import { Coffee, CartItem, Order, OrderStatus, CustomizationOptions, UserProfile, UserRole, PaymentRecord, ProductionTask, Issue, Driver, DeliveryTrip, DeliveryZone, Location as GeoLocation, RefundRecord, WalletTransaction, PayoutRecord, InventoryItem, AIInsight, SavedReport, Promotion, Branch, BusinessKPIs, Recommendation, ChurnPrediction, PriceAdjustment, Integration, IoTDevice, DeliveryPartner, FlavorProfile, HeatmapPoint, DirectMessage, ParsedSalesDocument, SalesImportLine, SalesImportRecord } from './types';

// --- WebSocket Connection ---
let socket: Socket;

// --- Currency Context ---
export type Currency = 'ETB';

export const EXCHANGE_RATES: Record<Currency, number> = { ETB: 1 };

export const CURRENCY_SYMBOLS: Record<Currency, string> = { ETB: 'ETB ' };

export const CurrencyContext = React.createContext<{
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatPrice: (priceInETB: number) => string;
}>({
  currency: 'ETB',
  setCurrency: () => {},
  formatPrice: (p) => `ETB ${p.toFixed(2)}`
});

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const [currency, setCurrency] = useState<Currency>('ETB');

  const formatPrice = (priceInETB: number) => {
    const converted = priceInETB * EXCHANGE_RATES[currency];
    return `${CURRENCY_SYMBOLS[currency]}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};

const ALL_ROLES: UserRole[] = ['Sales Rep', 'Admin', 'Payment Collector', 'Factory/Ops', 'Marketing', 'Management', 'Customer', 'Driver'];

const normalizeUserRole = (value?: string | null): UserRole => {
  return ALL_ROLES.includes(value as UserRole) ? value as UserRole : 'Customer';
};

const createEntityId = (prefix: string): string => {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${globalThis.crypto?.getRandomValues?.(new Uint32Array(1))[0] || 0}`;
  return `${prefix}-${suffix}`;
};

const getSupabaseAccessToken = async (): Promise<string> => {
  if (!supabase) throw new Error('Supabase is not configured. Add the VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('Your Supabase session is missing or expired. Sign in again.');
  return token;
};

const getApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_SOCKET_URL || '';
  return String(configuredUrl).replace(/\/$/, '');
};

const apiUrl = (path: string) => `${getApiBaseUrl()}${path}`;

const getSocketUrl = () => getApiBaseUrl() || undefined;

const RoleRoute = ({ user, roles, children }: { user: UserProfile; roles: UserRole[]; children: React.ReactNode }) => {
  if (user.role === 'Admin' || user.role === 'Management' || roles.includes(user.role)) return <>{children}</>;
  return <Navigate to="/profile" replace />;
};

const buildUserProfileFromSupabaseUser = async (authUser: any, fallbackRole?: UserRole): Promise<UserProfile> => {
  let profileData: any = null;
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, role, wallet_balance, loyalty_points')
        .eq('id', authUser.id)
        .maybeSingle();
      if (error) {
        console.warn('Could not load profile row; falling back to auth metadata.', error.message);
      } else {
        profileData = data;
      }
    } catch (err) {
      console.warn('Could not load profile row; falling back to auth metadata.', err);
    }
  }

  return {
    id: authUser.id,
    name: profileData?.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
    email: authUser.email || '',
    role: normalizeUserRole(profileData?.role || authUser.user_metadata?.role || fallbackRole),
    walletBalance: Number(profileData?.wallet_balance || 0),
    loyaltyPoints: Number(profileData?.loyalty_points || 0)
  };
};

// --- Components ---

const Sidebar = ({ 
  user, 
  logout, 
  isInstallable, 
  onInstall 
}: { 
  user: UserProfile; 
  logout: () => void; 
  isInstallable: boolean; 
  onInstall: () => void; 
}) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: 'Storefront', path: '/', icon: CoffeeIcon, roles: ['Customer', 'Sales Rep', 'Admin', 'Management'] },
    { name: 'My Analytics', path: '/my-analytics', icon: TrendingUp, roles: ['Customer', 'Sales Rep', 'Admin', 'Management'] },
    { name: 'Sales Dashboard', path: '/sales-dashboard', icon: BarChart3, roles: ['Sales Rep', 'Admin', 'Management'] },
    { name: 'Driver App', path: '/driver', icon: Truck, roles: ['Driver', 'Admin', 'Management'] },
    { name: 'Logistics', path: '/logistics', icon: MapPin, roles: ['Factory/Ops', 'Driver', 'Admin', 'Management'] },
    { name: 'My Orders', path: '/tracking', icon: History, roles: ['Customer', 'Sales Rep', 'Admin', 'Management'] },
    { name: 'Order Creation', path: '/order-creation', icon: Plus, roles: ['Sales Rep', 'Admin', 'Management'] },
    { name: 'Proforma Invoice', path: '/proforma', icon: FileText, roles: ['Sales Rep', 'Admin', 'Management'] },
    { name: 'AI Report', path: '/ai-report', icon: Brain, roles: ['Sales Rep', 'Marketing', 'Admin', 'Management'] },
    { name: 'Payment Tracking', path: '/payments', icon: DollarSign, roles: ['Sales Rep', 'Payment Collector', 'Admin', 'Management'] },
    { name: 'Cheque Follow-Up', path: '/cheque-followup', icon: Bell, roles: ['Payment Collector', 'Admin', 'Management'] },
    { name: 'Factory Production', path: '/production', icon: Activity, roles: ['Factory/Ops', 'Admin', 'Management'] },
    { name: 'Marketing Analytics', path: '/analytics', icon: TrendingUp, roles: ['Marketing', 'Admin', 'Management'] },
    { name: 'Finance Dashboard', path: '/finance', icon: Wallet, roles: ['Payment Collector', 'Admin', 'Management'] },
    { name: 'Admin Dashboard', path: '/admin', icon: LayoutGrid, roles: ['Admin', 'Management'] },
    { name: 'Products', path: '/admin/products', icon: CoffeeIcon, roles: ['Factory/Ops', 'Admin', 'Management'] },
    { name: 'Inventory', path: '/admin/inventory', icon: Warehouse, roles: ['Factory/Ops', 'Admin', 'Management'] },
    { name: 'Branches', path: '/admin/branches', icon: MapPin, roles: ['Admin', 'Management'] },
    { name: 'Customers', path: '/admin/customers', icon: Users, roles: ['Sales Rep', 'Marketing', 'Admin', 'Management'] },
    { name: 'AI Insights', path: '/admin/insights', icon: Brain, roles: ['Marketing', 'Admin', 'Management'] },
    { name: 'Advanced Analytics', path: '/admin/advanced-analytics', icon: BarChart3, roles: ['Marketing', 'Admin', 'Management'] },
    { name: 'Promotions', path: '/admin/promotions', icon: Tag, roles: ['Marketing', 'Admin', 'Management'] },
    { name: 'Integrations', path: '/admin/integrations', icon: Link2, roles: ['Factory/Ops', 'Admin', 'Management'] },
    { name: 'Refund Management', path: '/refunds', icon: RotateCcw, roles: ['Sales Rep', 'Payment Collector', 'Admin', 'Management'] },
    { name: 'Exception Log', path: '/collaboration', icon: MessageSquare, roles: ['Customer', 'Sales Rep', 'Payment Collector', 'Factory/Ops', 'Driver', 'Admin', 'Management'] },
    { name: 'Profile', path: '/profile', icon: User, roles: ALL_ROLES },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(user.role));

  const { currency } = React.useContext(CurrencyContext);

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#151A22] rounded-full shadow-md text-[#00E5FF]"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-[#151A22] border-r border-[#00E5FF]/10 transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 pb-4">
          <h1 className="serif text-3xl font-bold text-[#00E5FF] tracking-tight">TOMOCA</h1>
          <p className="text-[10px] uppercase tracking-widest text-[#00E5FF]/60 mt-1">Coffee Roasters</p>
        </div>

        <div className="px-8 pb-4">
          <div className="w-full p-2 bg-[#0B0E14] rounded-xl text-xs font-bold text-[#00E5FF] text-center">
            Currency: {currency}
          </div>
        </div>

        <nav className="px-4 space-y-2 overflow-y-auto h-[calc(100vh-300px)] custom-scrollbar">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group",
                  isActive 
                    ? "bg-[#FF0055] text-[#E0E7FF] shadow-lg shadow-[#FF0055]/20" 
                    : "text-[#A5B4FC]/60 hover:bg-[#FF0055]/5 hover:text-[#00E5FF]"
                )}
              >
                <item.icon size={20} className={cn(isActive ? "text-[#E0E7FF]" : "text-[#00E5FF]/60 group-hover:text-[#00E5FF]")} />
                <span className="font-medium">{item.name}</span>
                {isActive && <motion.div layoutId="activeNav" className="ml-auto w-1.5 h-1.5 rounded-full bg-[#151A22]" />}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-8 left-4 right-4 space-y-4">
          <div className="p-4 bg-[#FF0055]/5 rounded-2xl border border-[#00E5FF]/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FF0055] text-[#E0E7FF] flex items-center justify-center font-bold">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#00E5FF] truncate">{user.name}</p>
                <p className="text-[10px] text-[#00E5FF]/60 truncate uppercase tracking-widest font-bold">{user.role}</p>
              </div>
            </div>
          </div>
          {isInstallable && (
            <button 
              onClick={onInstall}
              className="w-full py-3 bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 rounded-xl text-xs font-bold hover:bg-[#00E5FF]/25 hover:border-[#00E5FF]/40 transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#00E5FF]/5"
            >
              <Download size={14} /> Install App
            </button>
          )}
          <button 
            onClick={logout}
            className="w-full py-3 bg-[#0B0E14] text-[#00E5FF] rounded-xl text-xs font-bold hover:bg-[#FF0055] hover:text-[#E0E7FF] transition-all"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

const Login = ({ onLogin }: { onLogin: (user: UserProfile) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        if (data?.user) {
          onLogin(await buildUserProfileFromSupabaseUser(data.user));
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { full_name: name }
          }
        });
        if (error) throw error;
        
        if (data?.user) {
          onLogin(await buildUserProfileFromSupabaseUser(data.user, 'Customer'));
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#151A22] w-full max-w-md p-10 rounded-[48px] shadow-2xl shadow-[#FF0055]/10 border border-[#00E5FF]/10 hover:border-[#00E5FF]/30 transition-all duration-500"
      >
        <div className="text-center space-y-4 mb-10 flex flex-col items-center">
          <img src="/logo.png" alt="Tomoca System Logo" className="w-24 h-24 rounded-full shadow-lg border-2 border-[#00E5FF]/20 object-cover mb-2" />
          <h1 className="serif text-5xl font-bold text-[#00E5FF] tracking-tight">TOMOCA</h1>
          <p className="text-sm font-bold uppercase tracking-widest text-[#A5B4FC]/60">
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[#FF0055]/10 border border-[#FF0055]/20 rounded-2xl text-[#FF0055] text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[#A5B4FC]/60 ml-2">Full Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  required={!isLogin}
                  className="w-full bg-[#0B0E14] border border-[#00E5FF]/20 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#00E5FF] transition-all font-mono text-sm shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] placeholder-[#A5B4FC]/30"
                  placeholder="John Doe"
                />
              </div>
              <p className="px-2 text-[10px] leading-relaxed text-[#A5B4FC]/40">New accounts are created as Customer accounts. An administrator assigns internal staff roles from the Supabase profiles table.</p>
            </>
          )}
          
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#A5B4FC]/60 ml-2">Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-[#0B0E14] border border-[#00E5FF]/20 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#00E5FF] transition-all font-mono text-sm shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] placeholder-[#A5B4FC]/30"
              placeholder="name@example.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#A5B4FC]/60 ml-2">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-[#0B0E14] border border-[#00E5FF]/20 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#00E5FF] transition-all font-mono text-sm shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] placeholder-[#A5B4FC]/30"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#00E5FF] to-[#00B3FF] hover:from-[#00B3FF] hover:to-[#00E5FF] text-[#0B0E14] font-bold uppercase tracking-widest py-4 rounded-2xl shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-[#00E5FF]/10 text-center space-y-4 flex flex-col">
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-[#00E5FF] hover:text-[#00B3FF] text-sm font-bold tracking-widest uppercase transition-colors"
          >
            {isLogin ? 'Need an account?' : 'Already have an account?'}
          </button>
        </div>
        
        <p className="text-[10px] text-[#A5B4FC]/40 uppercase tracking-widest font-bold mt-12 text-center">
          Powered by Tomoca Roasters • 2026
        </p>
      </motion.div>
    </div>
  );
};

// --- Views ---

const FlavorRadar = ({ profile }: { profile: FlavorProfile }) => {
  const data = [
    { subject: 'Sweetness', A: profile.sweetness, fullMark: 10 },
    { subject: 'Acidity', A: profile.acidity, fullMark: 10 },
    { subject: 'Body', A: profile.body, fullMark: 10 },
    { subject: 'Floral', A: profile.floral, fullMark: 10 },
    { subject: 'Nutty', A: profile.nutty, fullMark: 10 },
  ];

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#00E5FF" strokeOpacity={0.1} />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#00E5FF', fontSize: 8, fontWeight: 600 }} />
          <Radar
            name="Flavor"
            dataKey="A"
            stroke="#00E5FF"
            strokeWidth={2}
            style={{ filter: "drop-shadow(0 0 5px rgba(0,229,255,0.7))" }}
            fill="#00E5FF"
            fillOpacity={0.2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

const HeatmapView = ({ data }: { data: HeatmapPoint[] }) => {
  const bounds = useMemo(() => {
    if (!data.length) return null;
    const latitudes = data.map(point => point.lat);
    const longitudes = data.map(point => point.lng);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    return {
      minLat,
      maxLat,
      minLng,
      maxLng,
      latRange: Math.max(maxLat - minLat, 0.001),
      lngRange: Math.max(maxLng - minLng, 0.001)
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="serif text-4xl">Demand Coordinates</h2>
          <p className="text-sm text-[#00E5FF]/60 mt-2">Recorded demand points loaded from Supabase.</p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]/50">{data.length} points</span>
      </div>

      <div className="relative aspect-video bg-[#0B0E14] rounded-[48px] overflow-hidden border border-[#00E5FF]/10">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(0,229,255,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,.25) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        {!bounds ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <MapPin size={36} className="text-[#00E5FF]/20 mb-3" />
            <p className="text-sm text-[#A5B4FC]/40">No demand coordinates have been recorded.</p>
          </div>
        ) : data.map((point, index) => {
          const left = 6 + ((point.lng - bounds.minLng) / bounds.lngRange) * 88;
          const top = 94 - ((point.lat - bounds.minLat) / bounds.latRange) * 88;
          const intensity = Math.max(0, Math.min(1, Number(point.intensity || 0)));
          return (
            <motion.div
              key={`${point.lat}-${point.lng}-${index}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              <div
                className="rounded-full border border-[#00E5FF]/30"
                style={{
                  width: `${28 + intensity * 70}px`,
                  height: `${28 + intensity * 70}px`,
                  background: `radial-gradient(circle, rgba(255,0,85,${0.25 + intensity * 0.55}) 0%, rgba(255,0,85,0) 70%)`
                }}
              />
              <div className="hidden group-hover:block absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-[#151A22] border border-[#00E5FF]/10 px-3 py-2 text-[9px] font-mono shadow-xl z-10">
                {point.lat.toFixed(5)}, {point.lng.toFixed(5)} · {(intensity * 100).toFixed(0)}%
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const Storefront = ({ addToCart, user, coffees, recommendations, priceAdjustments, branches, heatmapData }: { addToCart: (c: Coffee, custom?: CustomizationOptions, branchId?: string) => void, user: UserProfile, coffees: Coffee[], recommendations: Recommendation[], priceAdjustments: PriceAdjustment[], branches: Branch[], heatmapData: HeatmapPoint[] }) => {
  const { formatPrice } = React.useContext(CurrencyContext);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || '');
  const [customizingItem, setCustomizingItem] = useState<Coffee | null>(null);

  useEffect(() => {
    if (!selectedBranchId && branches[0]?.id) setSelectedBranchId(branches[0].id);
  }, [branches, selectedBranchId]);

  const categories = ['All', 'Whole Bean', 'Beverage', 'Food', 'Merchandise', 'Bundle'];

  const currentTime = new Date().getHours();
  const isBreakfastTime = currentTime >= 6 && currentTime < 11;
  const isLunchTime = currentTime >= 11 && currentTime < 15;

  const userRecommendations = recommendations.find(r => r.userId === user.id);

  const filteredCoffees = useMemo(() => {
    return coffees.filter(c => {
      const matchesFilter = filter === 'All' || c.category === filter;
      const matchesSearch = searchQuery === '' || 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (filter === 'All' && searchQuery === '') {
        if (isBreakfastTime && c.isLunch && !c.isBreakfast) return false;
        if (isLunchTime && c.isBreakfast && !c.isLunch) return false;
      }

      return matchesFilter && matchesSearch;
    });
  }, [filter, searchQuery, isBreakfastTime, isLunchTime, coffees]);

  const handleAddClick = (coffee: Coffee) => {
    if (coffee.category === 'Beverage' || coffee.category === 'Food') {
      setCustomizingItem(coffee);
    } else {
      addToCart(coffee, undefined, selectedBranchId);
    }
  };

  const getAdjustedPrice = (coffeeId: string, originalPrice: number) => {
    const adjustment = priceAdjustments.find(p => p.coffeeId === coffeeId && (!p.branchId || p.branchId === selectedBranchId));
    return adjustment ? adjustment.currentPrice : originalPrice;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <AnimatePresence>
        {customizingItem && (
          <CustomizationModal 
            item={customizingItem} 
            onClose={() => setCustomizingItem(null)} 
            onConfirm={(custom) => {
              addToCart(customizingItem, custom, selectedBranchId);
              setCustomizingItem(null);
            }} 
          />
        )}
      </AnimatePresence>

      <header className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="serif text-4xl font-light text-[#00E5FF] drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">
              {isBreakfastTime ? 'Good Morning,' : isLunchTime ? 'Lunch is Served,' : 'Welcome Back,'} {user.name.split(' ')[0]}
            </h2>
            <p className="text-sm text-[#A5B4FC]/60 mt-2">
              {isBreakfastTime ? 'Start your day with our signature roast.' : 'Time for a midday coffee break.'}
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00E5FF]/40" size={18} />
              <input 
                type="text" 
                placeholder="Search 'strong', 'healthy'..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[#0B0E14] rounded-2xl border border-[#00E5FF]/20 focus:outline-none focus:border-[#00E5FF] focus:shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all text-sm text-[#E0E7FF]"
              />
            </div>
            <div className="relative w-full md:w-64">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00E5FF]/40" size={18} />
              <select 
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[#0B0E14] rounded-2xl border border-[#00E5FF]/20 focus:outline-none focus:border-[#00E5FF] focus:shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all text-sm appearance-none text-[#E0E7FF]"
              >
                {branches.length === 0 && <option value="">No branches configured</option>}
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {userRecommendations && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-[#151A22] border border-[#FF0055]/50 text-[#E0E7FF] rounded-[32px] shadow-[0_0_20px_rgba(255,0,85,0.15)] relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#151A22]/10 blur-[40px] rounded-full" />
            <div className="flex items-center gap-4 mb-4">
              <div className="p-2 bg-[#FF0055]/10 text-[#FF0055] rounded-xl">
                <Brain size={20} />
              </div>
              <h3 className="serif text-xl">AI Recommendation for You</h3>
            </div>
            <p className="text-xs opacity-80 mb-6 max-w-md">{userRecommendations.reason}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {userRecommendations.recommendedSkus.map(sku => {
                const coffee = coffees.find(c => c.id === sku);
                if (!coffee) return null;
                return (
                  <button 
                    key={sku}
                    onClick={() => handleAddClick(coffee)}
                    className="p-3 bg-[#151A22]/10 hover:bg-[#151A22]/20 rounded-2xl transition-all text-left flex items-center gap-3 group"
                  >
                    {coffee.image ? (
                      <img src={coffee.image} alt={coffee.name} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#0B0E14] flex items-center justify-center"><Package size={16} className="text-[#00E5FF]/30" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold truncate">{coffee.name}</p>
                      <p className="text-[8px] opacity-60">{formatPrice(getAdjustedPrice(coffee.id, coffee.price))}</p>
                    </div>
                    <Plus size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        <div className="flex gap-2 p-1 bg-[#0B0E14] rounded-full border border-[#00E5FF]/20 shadow-[0_0_15px_rgba(0,229,255,0.1)] overflow-x-auto no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                filter === cat ? "bg-[#FF0055] text-[#E0E7FF]" : "text-[#00E5FF]/60 hover:text-[#00E5FF]"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCoffees.length === 0 && (
          <div className="sm:col-span-2 xl:col-span-3 py-16 text-center rounded-[32px] border border-dashed border-[#00E5FF]/20 bg-[#151A22]/40">
            <Package className="mx-auto mb-4 text-[#00E5FF]/30" size={36} />
            <h3 className="serif text-2xl text-[#E0E7FF]">No products available</h3>
            <p className="text-xs text-[#A5B4FC]/50 mt-2">Add products in Menu Items to make them available here.</p>
          </div>
        )}
        {filteredCoffees.map((coffee) => {
          const adjustedPrice = getAdjustedPrice(coffee.id, coffee.price);
          const isAdjusted = adjustedPrice !== coffee.price;
          
          return (
            <motion.div 
              layout
              key={coffee.id}
              className="group bg-[#151A22] rounded-[32px] overflow-hidden border border-[#00E5FF]/20 shadow-[0_0_15px_rgba(0,229,255,0.02)] hover:border-[#00E5FF]/60 transition-all duration-500 hover:shadow-[0_0_30px_rgba(0,229,255,0.15)] hover:-translate-y-1"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-[#0B0E14] flex items-center justify-center">
                {coffee.image ? (
                  <img src={coffee.image} alt={coffee.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                ) : (
                  <Package size={48} className="text-[#00E5FF]/20" aria-label="No product image" />
                )}
                <div className="absolute top-4 right-4 px-3 py-1 bg-[#151A22]/90 backdrop-blur-sm rounded-full text-[10px] font-bold tracking-wider uppercase text-[#00E5FF]">
                  {coffee.roast === 'N/A' ? coffee.category : `${coffee.roast} Roast`}
                </div>
                {isAdjusted && (
                  <div className="absolute bottom-4 left-4 px-3 py-1 bg-emerald-500 text-[#E0E7FF] rounded-full text-[8px] font-bold uppercase tracking-widest flex items-center gap-1">
                    <Zap size={10} /> Dynamic Price
                  </div>
                )}
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="serif text-2xl font-medium text-[#E0E7FF]">{coffee.name}</h3>
                    <p className="text-[10px] text-[#00E5FF]/60 italic">{coffee.origin}</p>
                  </div>
                  <div className="text-right">
                    {isAdjusted && <p className="text-[10px] text-red-500 line-through opacity-60">{formatPrice(coffee.price)}</p>}
                    <span className={cn("text-lg font-semibold", isAdjusted ? "text-emerald-600" : "text-[#00E5FF]")}>
                      {formatPrice(adjustedPrice)}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-[#A5B4FC]/60 line-clamp-2 leading-relaxed">{coffee.description}</p>

                {coffee.flavorProfile && (
                  <div className="pt-2">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-[#00E5FF]/40 mb-2">Flavor Profile</p>
                    <FlavorRadar profile={coffee.flavorProfile} />
                  </div>
                )}

                {coffee.regionStory && (
                  <div className="p-4 bg-[#0B0E14] rounded-2xl border border-[#00E5FF]/10 shadow-[inner_0_0_10px_rgba(0,229,255,0.05)]">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-[#00E5FF]/40 mb-2">Origin Story</p>
                    <p className="text-[10px] text-[#00E5FF]/80 leading-relaxed italic">"{coffee.regionStory}"</p>
                  </div>
                )}

                <div className="pt-4 flex items-center justify-between">
                  <div className="flex gap-1">
                    {coffee.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[8px] uppercase tracking-widest font-bold px-2 py-0.5 bg-[#0B0E14] text-[#00E5FF]/60 rounded-full">{tag}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    {coffee.availableBrewMethods && (
                      <div className="flex gap-1">
                        {coffee.availableBrewMethods.map(method => (
                          <div key={method} className="w-8 h-8 rounded-xl bg-[#0B0E14] flex items-center justify-center text-[#00E5FF]/60 hover:text-[#00E5FF] transition-colors cursor-help group/method relative">
                            <CoffeeIcon size={14} />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#A5B4FC] text-[#E0E7FF] text-[8px] rounded opacity-0 group-hover/method:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              {method}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button 
                      onClick={() => handleAddClick(coffee)}
                      className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[#FF0055] text-[#FF0055] rounded-full text-xs font-bold hover:bg-[#FF0055] hover:text-[#0B0E14] transition-all hover:shadow-[0_0_15px_rgba(255,0,85,0.6)]"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="pt-12 border-t border-[#00E5FF]/10">
        <HeatmapView data={heatmapData} />
      </div>
    </div>
  );
};

const CustomizationModal = ({ item, onClose, onConfirm }: { item: Coffee, onClose: () => void, onConfirm: (custom: CustomizationOptions) => void }) => {
  const [size, setSize] = useState<any>('Medium');
  const [milk, setMilk] = useState<any>('None');
  const [sugar, setSugar] = useState<any>('None');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#151A22] w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl">
        <div className="relative h-48 bg-[#0B0E14] flex items-center justify-center">
          {item.image ? (
            <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <Package size={48} className="text-[#00E5FF]/20" aria-label="No product image" />
          )}
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-[#151A22]/80 backdrop-blur-sm rounded-full text-[#00E5FF]"><X size={20} /></button>
        </div>
        <div className="p-8 space-y-6">
          <h3 className="serif text-2xl font-medium text-[#E0E7FF]">{item.name}</h3>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40 mb-2">Size</p>
              <div className="flex gap-2">
                {['Small', 'Medium', 'Large'].map(s => (
                  <button key={s} onClick={() => setSize(s)} className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-all border", size === s ? "bg-[#FF0055] text-[#E0E7FF] border-[#00E5FF]" : "bg-[#151A22] text-[#00E5FF] border-[#00E5FF]/10")}>{s}</button>
                ))}
              </div>
            </div>
            {item.category === 'Beverage' && (
              <>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40 mb-2">Milk</p>
                  <div className="grid grid-cols-3 gap-2">
                    {['None', 'Whole', 'Oat', 'Almond', 'Soy'].map(m => (
                      <button key={m} onClick={() => setMilk(m)} className={cn("py-2 rounded-xl text-xs font-bold transition-all border", milk === m ? "bg-[#FF0055] text-[#E0E7FF] border-[#00E5FF]" : "bg-[#151A22] text-[#00E5FF] border-[#00E5FF]/10")}>{m}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40 mb-2">Sugar</p>
                  <div className="flex gap-2">
                    {['None', 'Low', 'Medium', 'High'].map(s => (
                      <button key={s} onClick={() => setSugar(s)} className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-all border", sugar === s ? "bg-[#FF0055] text-[#E0E7FF] border-[#00E5FF]" : "bg-[#151A22] text-[#00E5FF] border-[#00E5FF]/10")}>{s}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <button onClick={() => onConfirm({ size, milk, sugar })} className="w-full py-4 bg-[#FF0055] text-[#E0E7FF] rounded-full font-bold shadow-xl shadow-[#FF0055]/20">Add to Basket</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Payments = ({ payments, updateStatus }: { payments: PaymentRecord[], updateStatus: (id: string, status: any) => void }) => {
  const [filter, setFilter] = useState('All');
  
  const filteredPayments = filter === 'All' ? payments : payments.filter(p => p.method === filter);
  const chequeTotal = payments.filter(p => p.method === 'Cheque' && p.status === 'Pending').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="serif text-4xl font-light">Payment Tracking</h2>
          <p className="text-sm text-[#A5B4FC]/60 mt-2">Manage collections and cheque aggregation.</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Pending Cheques</p>
          <p className="text-3xl font-light text-[#00E5FF]">ETB {chequeTotal.toFixed(2)}</p>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {['All', 'Telebirr', 'M-Pesa', 'Card', 'Wallet', 'Cheque'].map(m => (
          <button key={m} onClick={() => setFilter(m)} className={cn("px-4 py-2 rounded-full text-xs font-bold transition-all border", filter === m ? "bg-[#FF0055] text-[#E0E7FF] border-[#00E5FF]" : "bg-[#151A22] text-[#00E5FF] border-[#00E5FF]/10")}>{m}</button>
        ))}
      </div>

      <div className="bg-[#151A22] rounded-[32px] border border-[#00E5FF]/10 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0B0E14] text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/60">
              <th className="p-6">ID</th>
              <th className="p-6">Order</th>
              <th className="p-6">Method</th>
              <th className="p-6">Amount</th>
              <th className="p-6">Status</th>
              <th className="p-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#00E5FF]/5">
            {filteredPayments.map(p => (
              <tr key={p.id} className="hover:bg-[#0B0E14]/30 transition-colors">
                <td className="p-6 text-sm font-bold">{p.id}</td>
                <td className="p-6 text-sm">{p.orderId}</td>
                <td className="p-6">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    {p.method === 'Cheque' ? <FileText size={14} /> : <Smartphone size={14} />}
                    {p.method} {p.chequeNumber && <span className="opacity-40">#{p.chequeNumber}</span>}
                  </div>
                </td>
                <td className="p-6 text-sm font-bold">ETB {p.amount.toFixed(2)}</td>
                <td className="p-6">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    p.status === 'Cleared' ? "bg-emerald-100 text-emerald-700" : p.status === 'Bounced' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {p.status}
                  </span>
                </td>
                <td className="p-6">
                  {p.status === 'Pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => updateStatus(p.id, 'Cleared')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-[#E0E7FF] transition-all"><CheckCircle2 size={14} /></button>
                      <button onClick={() => updateStatus(p.id, 'Bounced')} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-[#E0E7FF] transition-all"><X size={14} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Production = ({ tasks, updateStatus }: { tasks: ProductionTask[], updateStatus: (id: string, status: any) => void }) => {
  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h2 className="serif text-4xl font-light">Factory Operations</h2>
        <p className="text-sm text-[#A5B4FC]/60 mt-2">Monitor and update production status in real-time.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {['Queued', 'Roasting', 'Grinding', 'Packaging'].map(status => (
          <div key={status} className="bg-[#151A22] p-6 rounded-[32px] border border-[#00E5FF]/10">
            <h3 className="serif text-xl mb-4 border-b border-[#00E5FF]/5 pb-2">{status}</h3>
            <div className="space-y-3">
              {tasks.filter(t => t.status === status).map(task => (
                <div key={task.id} className="p-4 bg-[#0B0E14] rounded-2xl border border-[#00E5FF]/5 space-y-3">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold">{task.orderId}</p>
                    <p className="text-[10px] text-[#A5B4FC]/40">{new Date(task.updatedAt).toLocaleTimeString()}</p>
                  </div>
                  <div className="space-y-1">
                    {task.items.map((item, i) => (
                      <p key={i} className="text-[10px] font-medium text-[#00E5FF]">{item.quantity}x {item.name}</p>
                    ))}
                  </div>
                  <div className="flex gap-1 pt-2">
                    {['Queued', 'Roasting', 'Grinding', 'Packaging', 'Ready'].filter(s => s !== status).map(s => (
                      <button 
                        key={s} 
                        onClick={() => updateStatus(task.id, s)}
                        className="flex-1 py-1 bg-[#151A22] text-[8px] font-bold uppercase tracking-widest text-[#00E5FF] rounded-lg border border-[#00E5FF]/10 hover:bg-[#FF0055] hover:text-[#E0E7FF] transition-all"
                      >
                        {s.charAt(0)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Collaboration = ({ issues, reportIssue, addComment, user }: { issues: Issue[], reportIssue: (issue: Issue) => void, addComment: (id: string, comment: any) => void, user: UserProfile }) => {
  const [newIssue, setNewIssue] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [newComment, setNewComment] = useState('');

  const handleReport = () => {
    if (!newIssue) return;
    const issue: Issue = {
      id: createEntityId('ISS'),
      orderId: 'N/A',
      reportedBy: user.name,
      role: user.role,
      description: newIssue,
      status: 'Open',
      priority: 'Medium',
      timestamp: new Date().toISOString(),
      comments: []
    };
    reportIssue(issue);
    setNewIssue('');
  };

  const handleAddComment = () => {
    if (!newComment || !selectedIssue) return;
    const comment = {
      user: user.name,
      text: newComment,
      timestamp: new Date().toISOString()
    };
    addComment(selectedIssue.id, comment);
    setNewComment('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      <div className="lg:col-span-2 space-y-8">
        <header>
          <h2 className="serif text-4xl font-light">Cross-Role Collaboration</h2>
          <p className="text-sm text-[#A5B4FC]/60 mt-2">Resolve issues and exceptions together.</p>
        </header>

        <div className="bg-[#151A22] p-8 rounded-[32px] border border-[#00E5FF]/10 space-y-6">
          <div className="flex gap-4">
            <input 
              type="text" 
              placeholder="Report an issue or exception..." 
              value={newIssue}
              onChange={(e) => setNewIssue(e.target.value)}
              className="flex-1 px-6 py-4 bg-[#0B0E14] rounded-2xl border border-[#00E5FF]/10 focus:outline-none focus:border-[#00E5FF] transition-all text-sm"
            />
            <button 
              onClick={handleReport}
              className="px-8 py-4 bg-[#FF0055] text-[#E0E7FF] rounded-2xl font-bold shadow-lg shadow-[#FF0055]/20 hover:bg-[#FF0055]/80 transition-all flex items-center gap-2"
            >
              <Plus size={18} /> Report
            </button>
          </div>

          <div className="space-y-4">
            {issues.map(issue => (
              <div 
                key={issue.id} 
                onClick={() => setSelectedIssue(issue)}
                className={cn(
                  "p-6 rounded-[24px] border transition-all cursor-pointer",
                  selectedIssue?.id === issue.id ? "bg-[#FF0055] text-[#E0E7FF] border-[#00E5FF]" : "bg-[#151A22] border-[#00E5FF]/10 hover:border-[#00E5FF]/30"
                )}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest", issue.status === 'Open' ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600")}>
                      {issue.status}
                    </span>
                    <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{issue.id}</span>
                  </div>
                  <span className="text-[10px] opacity-40">{new Date(issue.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-sm font-medium leading-relaxed">{issue.description}</p>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#0B0E14] text-[#00E5FF] flex items-center justify-center text-[10px] font-bold">
                      {issue.reportedBy.charAt(0)}
                    </div>
                    <span className="text-[10px] font-bold opacity-60">{issue.reportedBy} ({issue.role})</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold opacity-60">
                    <MessageSquare size={12} /> {issue.comments.length} comments
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#151A22] rounded-[32px] border border-[#00E5FF]/10 flex flex-col h-[calc(100vh-12rem)] sticky top-8">
        {selectedIssue ? (
          <>
            <div className="p-8 border-b border-[#00E5FF]/10">
              <h3 className="serif text-2xl mb-2">Discussion</h3>
              <p className="text-xs text-[#A5B4FC]/40 line-clamp-2">{selectedIssue.description}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {selectedIssue.comments.map((c, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#00E5FF]">{c.user}</span>
                    <span className="text-[8px] text-[#A5B4FC]/40">{new Date(c.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="p-4 bg-[#0B0E14] rounded-2xl rounded-tl-none text-xs leading-relaxed">
                    {c.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 bg-[#0B0E14]/50 border-t border-[#00E5FF]/10">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Add a comment..." 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 px-4 py-3 bg-[#151A22] rounded-xl border border-[#00E5FF]/10 focus:outline-none focus:border-[#00E5FF] text-xs"
                />
                <button 
                  onClick={handleAddComment}
                  className="p-3 bg-[#FF0055] text-[#E0E7FF] rounded-xl hover:bg-[#FF0055]/80 transition-all"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
            <div className="p-6 bg-[#0B0E14] rounded-full text-[#00E5FF]/20">
              <MessageSquare size={48} />
            </div>
            <p className="text-sm text-[#A5B4FC]/40 italic">Select an issue to join the discussion.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App ---

// --- Admin Dashboard Components ---

const AdminDashboard = ({ inventory, customers, insights, promotions, coffees }: { inventory: InventoryItem[], customers: UserProfile[], insights: AIInsight[], promotions: Promotion[], coffees: Coffee[] }) => {
  const { formatPrice } = React.useContext(CurrencyContext);
  const lowStock = inventory.filter(i => i.quantity <= i.minThreshold);
  const activePromos = promotions.filter(p => p.isActive);
  const vipCustomers = customers.filter(c => c.segment === 'VIP');


  return (
    <div className="space-y-12 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="serif text-6xl font-light tracking-tight text-[#00E5FF]">Admin Control</h1>
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#00E5FF]/40 mt-2">Business Intelligence & Operations</p>
        </div>
        <div className="px-6 py-4 bg-[#151A22] rounded-[32px] border border-[#00E5FF]/10 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40 mb-1">Persistence</p>
          <p className="text-sm font-bold">Changes are saved through the authenticated server</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Inventory Alerts', value: lowStock.length, sub: 'Items below threshold', icon: Warehouse, color: 'text-amber-500' },
          { label: 'VIP Customers', value: vipCustomers.length, sub: 'High-value segment', icon: Users, color: 'text-[#00E5FF]' },
          { label: 'Active Promos', value: activePromos.length, sub: 'Live campaigns', icon: Tag, color: 'text-emerald-500' },
          { label: 'Menu Items', value: coffees.length, sub: 'Active products', icon: CoffeeIcon, color: 'text-blue-500' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm hover:shadow-md transition-all"
          >
            <div className={cn("w-12 h-12 rounded-2xl bg-[#0B0E14] flex items-center justify-center mb-6", stat.color)}>
              <stat.icon size={24} />
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40 mb-1">{stat.label}</p>
            <h3 className="serif text-4xl mb-1">{stat.value}</h3>
            <p className="text-[10px] font-medium text-[#00E5FF]/60">{stat.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-[#151A22] p-10 rounded-[64px] border border-[#00E5FF]/10 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="serif text-2xl">Inventory Status</h3>
              <Link to="/admin/inventory" className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF] hover:underline">View All</Link>
            </div>
            <div className="space-y-4">
              {inventory.slice(0, 4).map(item => (
                <div key={item.id} className="flex items-center justify-between p-6 bg-[#0B0E14] rounded-[32px]">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-3 h-3 rounded-full", item.quantity <= item.minThreshold ? "bg-red-500" : "bg-emerald-500")} />
                    <div>
                      <p className="text-sm font-bold">{item.name}</p>
                      <p className="text-[10px] text-[#00E5FF]/40 uppercase tracking-widest">{item.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{item.quantity} {item.unit}</p>
                    <div className="w-32 bg-[#151A22] h-1 rounded-full mt-2 overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-500", item.quantity <= item.minThreshold ? "bg-red-500" : "bg-[#FF0055]")}
                        style={{ width: `${Math.min(100, (item.quantity / (item.minThreshold * 2)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-[#151A22] p-10 rounded-[64px] border border-[#00E5FF]/10 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="serif text-2xl">Recent Customer Activity</h3>
              <Link to="/admin/customers" className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF] hover:underline">Manage Customers</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-[#00E5FF]/10">
                    <th className="pb-4 text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Customer</th>
                    <th className="pb-4 text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Segment</th>
                    <th className="pb-4 text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Total Orders</th>
                    <th className="pb-4 text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Total Spent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#00E5FF]/5">
                  {customers.slice(0, 5).map(customer => (
                    <tr key={customer.id} className="group hover:bg-[#0B0E14]/50 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#FF0055] text-[#E0E7FF] flex items-center justify-center text-[10px] font-bold">
                            {customer.name.charAt(0)}
                          </div>
                          <p className="text-xs font-bold">{customer.name}</p>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest",
                          customer.segment === 'VIP' ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
                        )}>
                          {customer.segment}
                        </span>
                      </td>
                      <td className="py-4 text-xs font-medium">{customer.orderCount}</td>
                      <td className="py-4 text-xs font-bold">{formatPrice(customer.totalSpent || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        <div className="space-y-8">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="bg-[#A5B4FC] p-10 rounded-[64px] text-[#E0E7FF] shadow-xl">
            <div className="flex items-center gap-3 mb-8">
              <Brain className="text-purple-400" size={24} />
              <h3 className="serif text-2xl">AI Insights</h3>
            </div>
            <div className="space-y-6">
              {insights.map(insight => (
                <div key={insight.id} className="p-6 bg-[#151A22]/5 rounded-[32px] border border-[#00E5FF]/30/10 hover:bg-[#151A22]/10 transition-all cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-purple-400">{insight.type}</span>
                    <span className="text-[10px] font-medium opacity-40">{insight.impact} Impact</span>
                  </div>
                  <h4 className="text-sm font-bold mb-2">{insight.title}</h4>
                  <p className="text-[10px] leading-relaxed opacity-60 mb-4">{insight.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1 bg-[#151A22]/10 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-400" style={{ width: `${insight.confidence * 100}%` }} />
                      </div>
                      <span className="text-[8px] font-bold opacity-40">{Math.round(insight.confidence * 100)}% Conf.</span>
                    </div>
                    {insight.actionable && (
                      <button className="text-[8px] font-bold uppercase tracking-widest text-purple-400 hover:underline">Take Action</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }} className="bg-[#151A22] p-10 rounded-[64px] border border-[#00E5FF]/10 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="serif text-2xl">Active Promos</h3>
              <Link to="/admin/promotions" className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF] hover:underline">Manage</Link>
            </div>
            <div className="space-y-4">
              {promotions.filter(p => p.isActive).map(promo => (
                <div key={promo.id} className="p-6 bg-[#0B0E14] rounded-[32px] border border-[#00E5FF]/5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-2 bg-[#151A22] rounded-xl">
                      <Tag size={16} className="text-[#00E5FF]" />
                    </div>
                    <span className="text-[10px] font-bold text-[#00E5FF]">{promo.code}</span>
                  </div>
                  <h4 className="text-sm font-bold mb-1">{promo.title}</h4>
                  <p className="text-[10px] text-[#00E5FF]/60 mb-4">{promo.description}</p>
                  <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-widest">
                    <span className="text-emerald-600">{promo.discountValue}% {promo.discountType}</span>
                    <span className="opacity-40">Ends {new Date(promo.endDate).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const ProductManagement = ({ coffees, onUpdate, onAdd, onDelete }: { coffees: Coffee[], onUpdate: (c: Coffee) => void, onAdd: (c: Coffee) => void, onDelete: (id: string) => void }) => {
  const { formatPrice } = React.useContext(CurrencyContext);
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<Coffee | null>(null);

  return (
    <div className="space-y-12 pb-24">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="serif text-6xl font-light tracking-tight text-[#00E5FF]">Menu Items</h1>
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#00E5FF]/40 mt-2">Product Catalog & Pricing</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="px-8 py-4 bg-[#FF0055] text-[#E0E7FF] rounded-[32px] text-xs font-bold uppercase tracking-widest hover:bg-[#FF0055]/80 transition-all flex items-center gap-2"
        >
          <Plus size={16} /> New Product
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {coffees.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 py-16 text-center rounded-[40px] border border-dashed border-[#00E5FF]/20 bg-[#151A22]/40">
            <Package className="mx-auto mb-4 text-[#00E5FF]/30" size={36} />
            <h3 className="serif text-2xl">No products configured</h3>
            <p className="text-xs text-[#A5B4FC]/50 mt-2">Use New Product to create the first real catalog item.</p>
          </div>
        )}
        {coffees.map(coffee => (
          <motion.div 
            key={coffee.id}
            layout
            className="bg-[#151A22] rounded-[48px] border border-[#00E5FF]/10 overflow-hidden shadow-sm hover:shadow-md transition-all"
          >
            <div className="relative h-48 bg-[#0B0E14] flex items-center justify-center">
              {coffee.image ? (
                <img src={coffee.image} alt={coffee.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Package size={42} className="text-[#00E5FF]/20" aria-label="No product image" />
              )}
              <div className="absolute top-4 right-4 px-3 py-1 bg-[#151A22]/90 backdrop-blur-sm rounded-full text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]">
                {coffee.category}
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="serif text-2xl mb-1">{coffee.name}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]/40">{coffee.roast} Roast • {coffee.origin}</p>
                </div>
                <span className="text-xl font-bold text-[#00E5FF]">ETB {coffee.price.toFixed(2)}</span>
              </div>
              <p className="text-xs text-[#00E5FF]/60 line-clamp-2">{coffee.description}</p>
              <div className="flex gap-2 pt-4 border-t border-[#00E5FF]/5">
                <button 
                  onClick={() => setEditingItem(coffee)}
                  className="flex-1 py-3 bg-[#0B0E14] text-[#00E5FF] rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#FF0055] hover:text-[#E0E7FF] transition-all"
                >
                  Edit Item
                </button>
                <button 
                  onClick={() => onDelete(coffee.id)}
                  className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-[#E0E7FF] transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {(isAdding || editingItem) && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#151A22] w-full max-w-lg rounded-[64px] p-12 shadow-2xl relative"
          >
            <button onClick={() => { setIsAdding(false); setEditingItem(null); }} className="absolute top-8 right-8 text-[#00E5FF]/40 hover:text-[#00E5FF]">
              <X size={24} />
            </button>
            <h2 className="serif text-4xl mb-8">{editingItem ? 'Edit Product' : 'New Product'}</h2>
            <form className="space-y-6" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const itemData = {
                id: editingItem?.id || createEntityId('C'),
                name: formData.get('name') as string,
                description: formData.get('description') as string,
                price: Number(formData.get('price')),
                category: formData.get('category') as any,
                image: (formData.get('image') as string || '').trim(),
                origin: formData.get('origin') as string,
                roast: formData.get('roast') as any,
                tags: (formData.get('tags') as string).split(',').map(t => t.trim()),
                isBreakfast: formData.get('isBreakfast') === 'on',
                isLunch: formData.get('isLunch') === 'on'
              };
              if (editingItem) onUpdate(itemData);
              else onAdd(itemData);
              setIsAdding(false);
              setEditingItem(null);
            }}>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]/40 ml-4">Product Name</label>
                <input name="name" defaultValue={editingItem?.name} required className="w-full px-8 py-4 bg-[#0B0E14] rounded-[32px] border-none focus:ring-2 focus:ring-[#00E5FF]/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]/40 ml-4">Price (ETB)</label>
                  <input name="price" type="number" step="0.01" defaultValue={editingItem?.price} required className="w-full px-8 py-4 bg-[#0B0E14] rounded-[32px] border-none focus:ring-2 focus:ring-[#00E5FF]/20" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]/40 ml-4">Category</label>
                  <select name="category" defaultValue={editingItem?.category} className="w-full px-8 py-4 bg-[#0B0E14] rounded-[32px] border-none focus:ring-2 focus:ring-[#00E5FF]/20">
                    <option>Whole Bean</option>
                    <option>Beverage</option>
                    <option>Food</option>
                    <option>Merchandise</option>
                    <option>Bundle</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]/40 ml-4">Roast</label>
                  <select name="roast" defaultValue={editingItem?.roast} className="w-full px-8 py-4 bg-[#0B0E14] rounded-[32px] border-none focus:ring-2 focus:ring-[#00E5FF]/20">
                    <option>Light</option>
                    <option>Medium</option>
                    <option>Dark</option>
                    <option>N/A</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]/40 ml-4">Origin</label>
                  <input name="origin" defaultValue={editingItem?.origin} required className="w-full px-8 py-4 bg-[#0B0E14] rounded-[32px] border-none focus:ring-2 focus:ring-[#00E5FF]/20" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]/40 ml-4">Description</label>
                <textarea name="description" defaultValue={editingItem?.description} required className="w-full px-8 py-4 bg-[#0B0E14] rounded-[32px] border-none focus:ring-2 focus:ring-[#00E5FF]/20 h-20 resize-none" />
              </div>
              <div className="flex gap-8 px-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="isBreakfast" defaultChecked={editingItem?.isBreakfast} className="w-4 h-4 rounded border-[#00E5FF]/20 text-[#00E5FF] focus:ring-[#00E5FF]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]/60">Breakfast</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="isLunch" defaultChecked={editingItem?.isLunch} className="w-4 h-4 rounded border-[#00E5FF]/20 text-[#00E5FF] focus:ring-[#00E5FF]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]/60">Lunch</span>
                </label>
              </div>
              <button type="submit" className="w-full py-5 bg-[#FF0055] text-[#E0E7FF] rounded-[32px] font-bold uppercase tracking-widest hover:bg-[#FF0055]/80 transition-all shadow-lg shadow-[#FF0055]/20">
                {editingItem ? 'Update Product' : 'Add to Catalog'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const BranchManagement = ({ branches, onAdd, onUpdate, onDelete }: { branches: Branch[], onAdd: (b: Branch) => void, onUpdate: (b: Branch) => void, onDelete: (id: string) => void }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const BranchForm = ({ initialData, onSubmit, onCancel }: { initialData?: Partial<Branch>, onSubmit: (b: any) => void, onCancel: () => void }) => {
    const [formData, setFormData] = useState({
      name: initialData?.name || '',
      location: initialData?.location || '',
      status: initialData?.status || 'Active',
      managerId: initialData?.managerId || '',
    });

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Branch Name</label>
            <input 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full p-4 bg-[#0B0E14] rounded-2xl border-none text-xs"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Location</label>
            <input 
              value={formData.location}
              onChange={e => setFormData({...formData, location: e.target.value})}
              className="w-full p-4 bg-[#0B0E14] rounded-2xl border-none text-xs"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Status</label>
            <select 
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value as any})}
              className="w-full p-4 bg-[#0B0E14] rounded-2xl border-none text-xs"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Manager ID</label>
            <input 
              value={formData.managerId}
              onChange={e => setFormData({...formData, managerId: e.target.value})}
              className="w-full p-4 bg-[#0B0E14] rounded-2xl border-none text-xs"
            />
          </div>
        </div>
        <div className="flex gap-4 pt-4">
          <button onClick={() => onSubmit(formData)} className="flex-1 py-4 bg-[#FF0055] text-[#E0E7FF] rounded-2xl text-xs font-bold uppercase tracking-widest">
            {initialData?.id ? 'Update Branch' : 'Add Branch'}
          </button>
          <button onClick={onCancel} className="flex-1 py-4 bg-[#0B0E14] text-[#00E5FF] rounded-2xl text-xs font-bold uppercase tracking-widest">
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12 pb-24">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="serif text-6xl font-light tracking-tight text-[#00E5FF]">Branches</h1>
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#00E5FF]/40 mt-2">Franchise & Location Management</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="px-8 py-4 bg-[#FF0055] text-[#E0E7FF] rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-[#FF0055]/20"
        >
          <Plus size={16} /> Add Location
        </button>
      </header>

      {isAdding && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#151A22] p-12 rounded-[64px] border border-[#00E5FF]/10 shadow-sm">
          <h3 className="serif text-3xl mb-8">New Branch Details</h3>
          <BranchForm 
            onSubmit={(data) => {
              onAdd({ 
                ...data, 
                id: `B${branches.length + 1}`, 
                revenue: 0, 
                orders: 0, 
                avgOrderValue: 0, 
                growth: 0 
              });
              setIsAdding(false);
            }} 
            onCancel={() => setIsAdding(false)} 
          />
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {branches.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 py-16 text-center rounded-[40px] border border-dashed border-[#00E5FF]/20 bg-[#151A22]/40">
            <MapPin className="mx-auto mb-4 text-[#00E5FF]/30" size={36} />
            <h3 className="serif text-2xl">No branches configured</h3>
            <p className="text-xs text-[#A5B4FC]/50 mt-2">Create a branch before assigning sales, inventory, or delivery activity.</p>
          </div>
        )}
        {branches.map(branch => (
          <motion.div 
            key={branch.id}
            className="bg-[#151A22] p-10 rounded-[48px] border border-[#00E5FF]/10 shadow-sm group hover:border-[#00E5FF]/30 transition-all"
          >
            <div className="flex justify-between items-start mb-8">
              <div className="w-16 h-16 rounded-3xl bg-[#0B0E14] flex items-center justify-center text-[#00E5FF]">
                <MapPin size={32} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingBranch(branch)} className="p-3 bg-[#0B0E14] rounded-xl text-[#00E5FF]/40 hover:text-[#00E5FF] transition-colors">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => onDelete(branch.id)} className="p-3 bg-[#0B0E14] rounded-xl text-red-300 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <h3 className="serif text-3xl mb-2">{branch.name}</h3>
            <p className="text-xs text-[#00E5FF]/60 mb-8">{branch.location}</p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-[#0B0E14] rounded-2xl border border-[#00E5FF]/10 shadow-[inner_0_0_10px_rgba(0,229,255,0.05)]">
                <p className="text-[8px] uppercase tracking-widest font-bold opacity-40 mb-1">Status</p>
                <p className={cn(
                  "text-xs font-bold",
                  branch.status === 'Active' ? "text-emerald-600" : "text-red-500"
                )}>{branch.status}</p>
              </div>
              <div className="p-4 bg-[#0B0E14] rounded-2xl border border-[#00E5FF]/10 shadow-[inner_0_0_10px_rgba(0,229,255,0.05)]">
                <p className="text-[8px] uppercase tracking-widest font-bold opacity-40 mb-1">Growth</p>
                <p className="text-xs font-bold">{branch.growth}%</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-xs">
                <span className="opacity-40">Total Revenue</span>
                <span className="font-bold">ETB {branch.revenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="opacity-40">Total Orders</span>
                <span className="font-bold">{branch.orders}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {editingBranch && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#FF0055]/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#151A22] p-12 rounded-[64px] border border-[#00E5FF]/10 shadow-2xl max-w-2xl w-full"
            >
              <h3 className="serif text-3xl mb-8">Edit Branch: {editingBranch.name}</h3>
              <BranchForm 
                initialData={editingBranch}
                onSubmit={(data) => {
                  onUpdate({ ...editingBranch, ...data });
                  setEditingBranch(null);
                }}
                onCancel={() => setEditingBranch(null)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const InventoryManagement = ({ inventory, branches, onUpdate, onAdd }: { inventory: InventoryItem[], branches: Branch[], onUpdate: (item: InventoryItem) => void, onAdd: (item: InventoryItem) => void }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const categories = ['All', ...new Set(inventory.map(i => i.category))];

  const filteredInventory = inventory.filter(i => {
    const matchesCategory = filter === 'All' || i.category === filter;
    const matchesBranch = branchFilter === 'All' || i.branchId === branchFilter;
    return matchesCategory && matchesBranch;
  });

  return (
    <div className="space-y-12 pb-24">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="serif text-6xl font-light tracking-tight text-[#00E5FF]">Inventory</h1>
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#00E5FF]/40 mt-2">Shared Supply Chain Management</p>
        </div>
        <div className="flex gap-4">
          <select 
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-6 py-4 bg-[#151A22] rounded-full border border-[#00E5FF]/10 text-xs font-bold uppercase tracking-widest focus:outline-none"
          >
            <option value="All">All Branches (Shared)</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button 
            onClick={() => setIsAdding(true)}
            className="px-8 py-4 bg-[#FF0055] text-[#E0E7FF] rounded-[32px] text-xs font-bold uppercase tracking-widest hover:bg-[#FF0055]/80 transition-all flex items-center gap-2 shadow-xl shadow-[#FF0055]/20"
          >
            <Plus size={16} /> Add Item
          </button>
        </div>
      </header>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={cn(
              "px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
              filter === cat ? "bg-[#FF0055] text-[#E0E7FF]" : "bg-[#151A22] text-[#00E5FF] border border-[#00E5FF]/10"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredInventory.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 py-16 text-center rounded-[40px] border border-dashed border-[#00E5FF]/20 bg-[#151A22]/40">
            <Package className="mx-auto mb-4 text-[#00E5FF]/30" size={36} />
            <h3 className="serif text-2xl">No inventory items found</h3>
            <p className="text-xs text-[#A5B4FC]/50 mt-2">Add a real stock item or change the active filters.</p>
          </div>
        )}
        {filteredInventory.map(item => (
          <motion.div 
            key={item.id}
            layout
            className="bg-[#151A22] p-10 rounded-[64px] border border-[#00E5FF]/10 shadow-sm relative overflow-hidden group"
          >
            {item.quantity <= item.minThreshold && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
            )}
            <div className="flex justify-between items-start mb-8">
              <div className="w-14 h-14 rounded-3xl bg-[#0B0E14] flex items-center justify-center text-[#00E5FF]">
                <Package size={28} />
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40 mb-1">Stock Level</p>
                <h4 className={cn("serif text-3xl", item.quantity <= item.minThreshold ? "text-red-500" : "text-[#00E5FF]")}>
                  {item.quantity} <span className="text-sm font-sans font-medium opacity-40">{item.unit}</span>
                </h4>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-bold mb-1">{item.name}</h3>
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">
                {item.category} • {item.branchId ? branches.find(b => b.id === item.branchId)?.name : 'Central Warehouse'}
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                <span className="opacity-40">Min Threshold</span>
                <span>{item.minThreshold} {item.unit}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                <span className="opacity-40">Last Restocked</span>
                <span>{new Date(item.lastRestocked).toLocaleDateString()}</span>
              </div>
              {item.supplier && (
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="opacity-40">Supplier</span>
                  <span>{item.supplier}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-6 border-t border-[#00E5FF]/5">
              <button 
                onClick={() => onUpdate({ ...item, quantity: item.quantity + 10, lastRestocked: new Date().toISOString() })}
                className="flex-1 py-3 bg-[#0B0E14] text-[#00E5FF] rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#FF0055] hover:text-[#E0E7FF] transition-all"
              >
                Restock +10
              </button>
              <button className="p-3 bg-[#151A22] border border-[#00E5FF]/10 text-[#00E5FF] rounded-2xl hover:bg-[#0B0E14] transition-all">
                <Settings size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#151A22] w-full max-w-lg rounded-[64px] p-12 shadow-2xl relative"
          >
            <button onClick={() => setIsAdding(false)} className="absolute top-8 right-8 text-[#00E5FF]/40 hover:text-[#00E5FF]">
              <X size={24} />
            </button>
            <h2 className="serif text-4xl mb-8">Add Stock Item</h2>
            <form className="space-y-6" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              onAdd({
                id: createEntityId('I'),
                name: formData.get('name') as string,
                category: formData.get('category') as any,
                quantity: Number(formData.get('quantity')),
                unit: formData.get('unit') as string,
                minThreshold: Number(formData.get('minThreshold')),
                lastRestocked: new Date().toISOString(),
                supplier: formData.get('supplier') as string
              });
              setIsAdding(false);
            }}>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]/40 ml-4">Item Name</label>
                <input name="name" required className="w-full px-8 py-4 bg-[#0B0E14] rounded-[32px] border-none focus:ring-2 focus:ring-[#00E5FF]/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]/40 ml-4">Category</label>
                  <select name="category" className="w-full px-8 py-4 bg-[#0B0E14] rounded-[32px] border-none focus:ring-2 focus:ring-[#00E5FF]/20">
                    <option>Raw Material</option>
                    <option>Packaging</option>
                    <option>Finished Good</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]/40 ml-4">Unit</label>
                  <input name="unit" placeholder="kg, liters, units" required className="w-full px-8 py-4 bg-[#0B0E14] rounded-[32px] border-none focus:ring-2 focus:ring-[#00E5FF]/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]/40 ml-4">Initial Qty</label>
                  <input name="quantity" type="number" required className="w-full px-8 py-4 bg-[#0B0E14] rounded-[32px] border-none focus:ring-2 focus:ring-[#00E5FF]/20" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]/40 ml-4">Min Threshold</label>
                  <input name="minThreshold" type="number" required className="w-full px-8 py-4 bg-[#0B0E14] rounded-[32px] border-none focus:ring-2 focus:ring-[#00E5FF]/20" />
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-[#FF0055] text-[#E0E7FF] rounded-[32px] font-bold uppercase tracking-widest hover:bg-[#FF0055]/80 transition-all mt-4 shadow-lg shadow-[#FF0055]/20">
                Add to Inventory
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const AdvancedAnalytics = ({ branches, kpis, orders }: { branches: Branch[], kpis: BusinessKPIs, orders: Order[] }) => {
  const [selectedBranchId, setSelectedBranchId] = useState('All');

  const filteredKpis = useMemo(() => {
    if (selectedBranchId === 'All') return kpis;
    const branch = branches.find(b => b.id === selectedBranchId);
    if (!branch) return kpis;
    return {
      ...kpis,
      totalRevenue: branch.revenue,
      totalOrders: branch.orders,
      avgOrderValue: branch.avgOrderValue,
    };
  }, [selectedBranchId, kpis, branches]);

  const branchRevenueShare = useMemo(() => {
    const total = branches.reduce((sum, branch) => sum + Number(branch.revenue || 0), 0);
    return branches.map(branch => ({
      label: branch.name,
      value: total > 0 ? (Number(branch.revenue || 0) / total) * 100 : 0,
      revenue: Number(branch.revenue || 0)
    })).sort((a, b) => b.revenue - a.revenue);
  }, [branches]);

  const peakHourData = useMemo(() => {
    const bins = Array.from({ length: 12 }, (_, index) => ({ label: `${String(index * 2).padStart(2, '0')}:00`, count: 0 }));
    orders.forEach(order => {
      const date = new Date(order.timestamp);
      if (Number.isNaN(date.getTime()) || order.status === 'Cancelled') return;
      bins[Math.floor(date.getHours() / 2)].count += 1;
    });
    const max = Math.max(0, ...bins.map(bin => bin.count));
    return bins.map(bin => ({ ...bin, percentage: max > 0 ? (bin.count / max) * 100 : 0 }));
  }, [orders]);

  return (
    <div className="space-y-12 pb-24 animate-fade-in">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="serif text-6xl font-light tracking-tight text-[#00E5FF]">Business Intelligence</h1>
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#00E5FF]/40 mt-2">Real-time Performance & Store Comparison</p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="px-6 py-3 bg-[#151A22] rounded-full border border-[#00E5FF]/10 text-xs font-bold uppercase tracking-widest focus:outline-none shadow-sm"
          >
            <option value="All">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <div className="flex items-center gap-3 px-6 py-3 bg-[#151A22] rounded-full border border-[#00E5FF]/10 shadow-sm">
            <Database size={16} className="text-[#00E5FF]/60" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Persisted Sales Metrics</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Total Revenue', value: `ETB ${filteredKpis.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Customer Retention', value: `${filteredKpis.customerRetention}%`, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Conversion Rate', value: `${filteredKpis.conversionRate}%`, icon: Target, color: 'text-purple-500', bg: 'bg-purple-50' },
        ].map((kpi, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#151A22] p-10 rounded-[48px] border border-[#00E5FF]/10 shadow-sm"
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6", kpi.bg, kpi.color)}>
              <kpi.icon size={28} />
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40 mb-2">{kpi.label}</p>
            <h3 className="serif text-5xl text-[#00E5FF]">{kpi.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="bg-[#151A22] p-12 rounded-[64px] border border-[#00E5FF]/10 shadow-sm">
        <h2 className="serif text-4xl mb-10">Store Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40 border-b border-[#00E5FF]/5">
                <th className="pb-6">Branch Name</th>
                <th className="pb-6">Location</th>
                <th className="pb-6 text-right">Revenue</th>
                <th className="pb-6 text-right">Orders</th>
                <th className="pb-6 text-right">Avg Order</th>
                <th className="pb-6 text-right">Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#00E5FF]/5">
              {branches.map((branch) => (
                <tr key={branch.id} className="group hover:bg-[#0B0E14]/30 transition-colors">
                  <td className="py-8">
                    <p className="text-lg font-bold text-[#00E5FF]">{branch.name}</p>
                    <p className="text-[10px] text-[#00E5FF]/40 font-medium">{branch.id}</p>
                  </td>
                  <td className="py-8 text-sm text-[#00E5FF]/60">{branch.location}</td>
                  <td className="py-8 text-right font-bold text-[#00E5FF]">ETB {branch.revenue.toLocaleString()}</td>
                  <td className="py-8 text-right text-sm">{branch.orders.toLocaleString()}</td>
                  <td className="py-8 text-right text-sm">ETB {branch.avgOrderValue.toFixed(2)}</td>
                  <td className="py-8 text-right">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      branch.growth >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    )}>
                      {branch.growth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {Math.abs(branch.growth)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#A5B4FC] p-12 rounded-[64px] text-[#E0E7FF] relative overflow-hidden">
          <h3 className="serif text-3xl mb-6">Revenue Share by Branch</h3>
          <div className="space-y-6">
            {branchRevenueShare.map((branch, index) => (
              <div key={branch.label} className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold opacity-60">
                  <span>{branch.label}</span>
                  <span>{branch.value.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-[#151A22]/10 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${branch.value}%` }} transition={{ duration: 1, delay: index * 0.05 }} className="h-full bg-emerald-500" />
                </div>
              </div>
            ))}
            {!branchRevenueShare.length && <p className="text-sm opacity-50">No branch data has been added.</p>}
          </div>
        </div>

        <div className="bg-[#151A22] p-12 rounded-[64px] border border-[#00E5FF]/10 shadow-sm">
          <h3 className="serif text-3xl mb-6 text-[#00E5FF]">Orders by Time of Day</h3>
          <div className="h-64 flex items-end gap-2">
            {peakHourData.map(bin => (
              <div key={bin.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div className="text-[8px] font-bold text-[#00E5FF]/50">{bin.count}</div>
                <motion.div initial={{ height: 0 }} animate={{ height: `${bin.percentage}%` }} className="w-full min-h-[2px] bg-[#FF0055]/30 rounded-t-xl" />
                <span className="text-[7px] font-bold text-[#00E5FF]/40 -rotate-45 origin-top-left whitespace-nowrap">{bin.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const CustomerManagement = ({ customers, orders, churnPredictions, onUpdate }: { customers: UserProfile[], orders: Order[], churnPredictions: ChurnPrediction[], onUpdate: (c: UserProfile) => void }) => {
  const [selectedCustomer, setSelectedCustomer] = useState<UserProfile | null>(null);
  const selectedCustomerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    const normalize = (value?: string) => (value || '').trim().toLowerCase();
    return orders.filter(order => {
      const matches = [
        selectedCustomer.email && normalize(order.customerEmail) === normalize(selectedCustomer.email),
        selectedCustomer.phone && normalize(order.customerPhone) === normalize(selectedCustomer.phone),
        selectedCustomer.tin && normalize(order.customerTin) === normalize(selectedCustomer.tin),
        selectedCustomer.accountNumber && normalize(order.accountNumber) === normalize(selectedCustomer.accountNumber),
        selectedCustomer.name && normalize(order.customerName) === normalize(selectedCustomer.name)
      ];
      return matches.some(Boolean);
    });
  }, [orders, selectedCustomer]);

  return (
    <div className="space-y-12 pb-24">
      <header>
        <h1 className="serif text-6xl font-light tracking-tight text-[#00E5FF]">Customers</h1>
        <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#00E5FF]/40 mt-2">Relationship Management & Segmentation</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 bg-[#151A22] p-12 rounded-[64px] border border-[#00E5FF]/10 shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <h3 className="serif text-3xl">Customer Directory</h3>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00E5FF]/40" size={16} />
              <input placeholder="Search customers..." className="pl-12 pr-6 py-3 bg-[#0B0E14] rounded-2xl border-none text-xs focus:ring-2 focus:ring-[#00E5FF]/20 w-64" />
            </div>
          </div>

          <div className="space-y-4">
            {customers.map(customer => (
              <motion.div 
                key={customer.id}
                onClick={() => setSelectedCustomer(customer)}
                className={cn(
                  "p-6 rounded-[32px] border transition-all cursor-pointer flex items-center justify-between group",
                  selectedCustomer?.id === customer.id 
                    ? "bg-[#FF0055] border-[#00E5FF] text-[#E0E7FF] shadow-xl shadow-[#FF0055]/20" 
                    : "bg-[#0B0E14] border-transparent hover:border-[#00E5FF]/20"
                )}
              >
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold transition-colors",
                    selectedCustomer?.id === customer.id ? "bg-[#151A22] text-[#00E5FF]" : "bg-[#151A22] text-[#00E5FF] shadow-sm"
                  )}>
                    {customer.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{customer.name}</h4>
                    <p className={cn("text-xs opacity-60", selectedCustomer?.id === customer.id ? "text-[#E0E7FF]" : "text-[#00E5FF]")}>{customer.email || customer.phone || customer.tin || customer.accountNumber || "No contact identifier"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right hidden md:block">
                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-1">Total Spent</p>
                    <p className="text-sm font-bold">ETB {customer.totalSpent?.toLocaleString()}</p>
                  </div>
                  <div className={cn(
                    "px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest",
                    customer.segment === 'VIP' 
                      ? "bg-purple-100 text-purple-600" 
                      : (selectedCustomer?.id === customer.id ? "bg-[#151A22]/20 text-[#E0E7FF]" : "bg-blue-100 text-blue-600")
                  )}>
                    {customer.segment}
                  </div>
                  <ChevronRight size={20} className="opacity-40" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {selectedCustomer ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#151A22] p-12 rounded-[64px] border border-[#00E5FF]/10 shadow-sm sticky top-8"
            >
              <div className="text-center mb-10">
                <div className="w-24 h-24 rounded-[40px] bg-[#FF0055] text-[#E0E7FF] flex items-center justify-center text-4xl font-bold mx-auto mb-6 shadow-xl shadow-[#FF0055]/20">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <h3 className="serif text-3xl mb-2">{selectedCustomer.name}</h3>
                <p className="text-xs text-[#00E5FF]/60">{selectedCustomer.email || selectedCustomer.phone || selectedCustomer.tin || selectedCustomer.accountNumber || "No contact identifier"}</p>
                <div className="mt-6 flex justify-center gap-2">
                  <span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-[10px] font-bold uppercase tracking-widest">{selectedCustomer.segment}</span>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-widest">Active</span>
                  {churnPredictions.find(p => p.userId === selectedCustomer.id) && (
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                      churnPredictions.find(p => p.userId === selectedCustomer.id)!.riskScore > 0.5 ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-600"
                    )}>
                      Churn Risk: {(churnPredictions.find(p => p.userId === selectedCustomer.id)!.riskScore * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>

              {churnPredictions.find(p => p.userId === selectedCustomer.id) && (
                <div className="mb-10 p-6 bg-red-50 rounded-[32px] border border-red-100">
                  <div className="flex items-center gap-3 mb-2 text-red-600">
                    <AlertCircle size={18} />
                    <h4 className="text-xs font-bold uppercase tracking-widest">AI Churn Warning</h4>
                  </div>
                  <p className="text-xs text-red-700/70 mb-4">{churnPredictions.find(p => p.userId === selectedCustomer.id)!.reason}</p>
                  <div className="p-4 bg-[#151A22] rounded-2xl border border-red-100">
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1">Suggested Action</p>
                    <p className="text-xs font-medium text-[#00E5FF]">{churnPredictions.find(p => p.userId === selectedCustomer.id)!.suggestedAction}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="p-6 bg-[#0B0E14] rounded-[32px] text-center">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40 mb-1">Orders</p>
                  <p className="text-xl font-bold">{selectedCustomer.orderCount}</p>
                </div>
                <div className="p-6 bg-[#0B0E14] rounded-[32px] text-center">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40 mb-1">Points</p>
                  <p className="text-xl font-bold">{selectedCustomer.loyaltyPoints}</p>
                </div>
              </div>

              <div className="space-y-6 mb-10">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#00E5FF]/40 border-b border-[#00E5FF]/10 pb-4">Purchase History</h4>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {selectedCustomerOrders.map(order => (
                    <div key={order.id} className="flex justify-between items-center p-3 bg-[#0B0E14] rounded-xl">
                      <div>
                        <p className="text-[10px] font-bold">{order.id}</p>
                        <p className="text-[8px] opacity-40">{new Date(order.timestamp).toLocaleDateString()}</p>
                      </div>
                      <p className="text-xs font-bold">ETB {order.total.toFixed(2)}</p>
                    </div>
                  ))}
                  {selectedCustomerOrders.length === 0 && (
                    <p className="text-[10px] text-center opacity-40 italic py-4">No orders found.</p>
                  )}
                </div>
              </div>

              <div className="space-y-6 mb-10">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#00E5FF]/40 border-b border-[#00E5FF]/10 pb-4">Customer Details</h4>
                <div className="space-y-4">
                  <div className="flex justify-between text-xs">
                    <span className="opacity-40">Joined</span>
                    <span className="font-bold">{new Date(selectedCustomer.joinDate || '').toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="opacity-40">Last Order</span>
                    <span className="font-bold">{new Date(selectedCustomer.lastOrderDate || '').toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="opacity-40">Wallet Balance</span>
                    <span className="font-bold text-emerald-600">ETB {selectedCustomer.walletBalance}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={() => onUpdate({ ...selectedCustomer, segment: selectedCustomer.segment === 'VIP' ? 'Regular' : 'VIP' })}
                  className="w-full py-4 bg-[#FF0055] text-[#E0E7FF] rounded-[24px] text-xs font-bold uppercase tracking-widest hover:bg-[#FF0055]/80 transition-all"
                >
                  Toggle VIP Status
                </button>
                <button className="w-full py-4 bg-[#0B0E14] text-[#00E5FF] rounded-[24px] text-xs font-bold uppercase tracking-widest hover:bg-[#FF0055] hover:text-[#E0E7FF] transition-all">
                  Send Promotion
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="bg-[#0B0E14] p-12 rounded-[64px] border border-dashed border-[#00E5FF]/20 text-center h-[600px] flex flex-col items-center justify-center">
              <Users size={48} className="text-[#00E5FF]/20 mb-6" />
              <p className="serif text-2xl text-[#00E5FF]/40">Select a customer to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AIInsights = ({ insights }: { insights: AIInsight[] }) => {
  const averageConfidence = insights.length
    ? Math.round((insights.reduce((sum, insight) => sum + Number(insight.confidence || 0), 0) / insights.length) * 100)
    : 0;
  const highImpactCount = insights.filter(insight => insight.impact === 'High').length;
  const actionableCount = insights.filter(insight => insight.actionable).length;

  return (
    <div className="space-y-12 pb-24">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="serif text-6xl font-light tracking-tight text-[#00E5FF]">AI Insights</h1>
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#00E5FF]/40 mt-2">Predictive Analytics & Recommendations</p>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 bg-[#151A22] rounded-full border border-[#00E5FF]/10 shadow-sm">
          <Brain size={16} className="text-purple-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Engine Active</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {insights.map((insight, i) => (
          <motion.div 
            key={insight.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#151A22] p-12 rounded-[64px] border border-[#00E5FF]/10 shadow-sm hover:shadow-xl transition-all group"
          >
            <div className="flex justify-between items-start mb-10">
              <div className={cn(
                "w-16 h-16 rounded-3xl flex items-center justify-center",
                insight.impact === 'High' ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"
              )}>
                {insight.type === 'Demand Prediction' ? <TrendingUp size={32} /> : <AlertCircle size={32} />}
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40 mb-1">Confidence</p>
                <h4 className="serif text-3xl text-[#00E5FF]">{Math.round(insight.confidence * 100)}%</h4>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <span className={cn(
                  "px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest",
                  insight.impact === 'High' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                )}>
                  {insight.impact} Impact
                </span>
                <span className="text-[10px] text-[#00E5FF]/40 font-bold uppercase tracking-widest">{insight.type}</span>
              </div>
              <h3 className="serif text-4xl mb-4 group-hover:text-[#00E5FF] transition-colors">{insight.title}</h3>
              <p className="text-sm text-[#00E5FF]/60 leading-relaxed">{insight.description}</p>
            </div>

            <div className="pt-10 border-t border-[#00E5FF]/5 flex items-center justify-between">
              <p className="text-[10px] font-medium text-[#00E5FF]/40">Generated {new Date(insight.timestamp).toLocaleTimeString()}</p>
              {insight.actionable && (
                <button className="px-8 py-4 bg-[#A5B4FC] text-[#E0E7FF] rounded-[24px] text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2">
                  Execute Strategy <ChevronRight size={14} />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-[#A5B4FC] p-12 rounded-[64px] text-[#E0E7FF]">
        <h2 className="serif text-4xl mb-6">Insight Quality Summary</h2>
        <p className="text-sm opacity-60 mb-8">These figures are calculated only from saved AI insights. No forecast performance is shown until validated insight records exist.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div><p className="text-3xl font-bold mb-1">{insights.length}</p><p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Saved insights</p></div>
          <div><p className="text-3xl font-bold mb-1">{averageConfidence}%</p><p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Avg. confidence</p></div>
          <div><p className="text-3xl font-bold mb-1">{highImpactCount}</p><p className="text-[10px] uppercase tracking-widest font-bold opacity-40">High impact</p></div>
          <div><p className="text-3xl font-bold mb-1">{actionableCount}</p><p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Actionable</p></div>
        </div>
      </div>
    </div>
  );
};

const PromotionsManagement = ({ promotions, onAdd, onToggle }: { promotions: Promotion[], onAdd: (p: Promotion) => void, onToggle: (id: string) => void }) => {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="space-y-12 pb-24">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="serif text-6xl font-light tracking-tight text-[#00E5FF]">Promotions</h1>
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#00E5FF]/40 mt-2">Campaign Management & Growth</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="px-8 py-4 bg-[#FF0055] text-[#E0E7FF] rounded-[32px] text-xs font-bold uppercase tracking-widest hover:bg-[#FF0055]/80 transition-all flex items-center gap-2"
        >
          <Plus size={16} /> Create Campaign
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {promotions.map(promo => (
          <motion.div 
            key={promo.id}
            className={cn(
              "bg-[#151A22] p-10 rounded-[64px] border transition-all relative overflow-hidden",
              promo.isActive ? "border-[#00E5FF]/10 shadow-sm" : "border-dashed border-[#00E5FF]/20 opacity-60"
            )}
          >
            <div className="flex justify-between items-start mb-8">
              <div className={cn(
                "w-14 h-14 rounded-3xl flex items-center justify-center",
                promo.isActive ? "bg-[#0B0E14] text-[#00E5FF]" : "bg-gray-100 text-gray-400"
              )}>
                <Tag size={28} />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">{promo.isActive ? 'Active' : 'Inactive'}</span>
                <button 
                  onClick={() => onToggle(promo.id)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    promo.isActive ? "bg-emerald-500" : "bg-gray-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-[#151A22] transition-all",
                    promo.isActive ? "right-1" : "left-1"
                  )} />
                </button>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-[#FF0055]/5 text-[#00E5FF] rounded-lg text-[10px] font-bold tracking-widest">{promo.code}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]/40">{promo.targetSegment}</span>
              </div>
              <h3 className="serif text-3xl mb-2">{promo.title}</h3>
              <p className="text-xs text-[#00E5FF]/60 leading-relaxed">{promo.description}</p>
            </div>

            <div className="p-6 bg-[#0B0E14] rounded-[32px] mb-8">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40 mb-1">Discount</p>
                  <p className="text-2xl font-bold text-emerald-600">{promo.discountType === 'Percentage' ? '' : 'ETB '}{promo.discountValue}{promo.discountType === 'Percentage' ? '%' : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40 mb-1">Validity</p>
                  <p className="text-xs font-bold">{new Date(promo.startDate).toLocaleDateString()} - {new Date(promo.endDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <button className="w-full py-4 bg-[#151A22] border border-[#00E5FF]/10 text-[#00E5FF] rounded-[24px] text-[10px] font-bold uppercase tracking-widest hover:bg-[#FF0055] hover:text-[#E0E7FF] transition-all">
              Edit Campaign
            </button>
          </motion.div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#151A22] w-full max-w-lg rounded-[64px] p-12 shadow-2xl relative"
          >
            <button onClick={() => setIsAdding(false)} className="absolute top-8 right-8 text-[#00E5FF]/40 hover:text-[#00E5FF]">
              <X size={24} />
            </button>
            <h2 className="serif text-4xl mb-8">New Campaign</h2>
            <form className="space-y-6" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              onAdd({
                id: createEntityId('PROM'),
                title: formData.get('title') as string,
                description: formData.get('description') as string,
                discountType: formData.get('discountType') as any,
                discountValue: Number(formData.get('discountValue')),
                code: formData.get('code') as string,
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
                isActive: true,
                targetSegment: formData.get('targetSegment') as any
              });
              setIsAdding(false);
            }}>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]/40 ml-4">Campaign Title</label>
                <input name="title" required className="w-full px-8 py-4 bg-[#0B0E14] rounded-[32px] border-none focus:ring-2 focus:ring-[#00E5FF]/20" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]/40 ml-4">Description</label>
                <textarea name="description" required className="w-full px-8 py-4 bg-[#0B0E14] rounded-[32px] border-none focus:ring-2 focus:ring-[#00E5FF]/20 h-24 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]/40 ml-4">Promo Code</label>
                  <input name="code" required className="w-full px-8 py-4 bg-[#0B0E14] rounded-[32px] border-none focus:ring-2 focus:ring-[#00E5FF]/20" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]/40 ml-4">Target Segment</label>
                  <select name="targetSegment" className="w-full px-8 py-4 bg-[#0B0E14] rounded-[32px] border-none focus:ring-2 focus:ring-[#00E5FF]/20">
                    <option>All</option>
                    <option>VIP</option>
                    <option>Regular</option>
                    <option>New</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]/40 ml-4">Type</label>
                  <select name="discountType" className="w-full px-8 py-4 bg-[#0B0E14] rounded-[32px] border-none focus:ring-2 focus:ring-[#00E5FF]/20">
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Fixed">Fixed Amount (ETB)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]/40 ml-4">Value</label>
                  <input name="discountValue" type="number" required className="w-full px-8 py-4 bg-[#0B0E14] rounded-[32px] border-none focus:ring-2 focus:ring-[#00E5FF]/20" />
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-[#FF0055] text-[#E0E7FF] rounded-[32px] font-bold uppercase tracking-widest hover:bg-[#FF0055]/80 transition-all mt-4 shadow-lg shadow-[#FF0055]/20">
                Launch Campaign
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const IntegrationsManagement = ({ integrations, iotDevices, deliveryPartners, onSync, onUpdateIoT, onUpdateDelivery }: { 
  integrations: Integration[], 
  iotDevices: IoTDevice[], 
  deliveryPartners: DeliveryPartner[],
  onSync: (id: string) => void,
  onUpdateIoT: (d: IoTDevice) => void,
  onUpdateDelivery: (p: DeliveryPartner) => void
}) => {
  const [activeTab, setActiveTab] = useState<'Software' | 'IoT' | 'Delivery'>('Software');

  return (
    <div className="space-y-12 pb-24">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="serif text-6xl font-light tracking-tight text-[#00E5FF]">Integrations</h1>
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#00E5FF]/40 mt-2">External Services & IoT Control</p>
        </div>
        <div className="flex gap-2 bg-[#0B0E14] p-1.5 rounded-2xl">
          {['Software', 'IoT', 'Delivery'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                activeTab === tab ? "bg-[#151A22] text-[#00E5FF] shadow-sm" : "text-[#00E5FF]/40 hover:text-[#00E5FF]"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'Software' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {integrations.map(int => (
            <motion.div 
              key={int.id}
              className="bg-[#151A22] p-10 rounded-[48px] border border-[#00E5FF]/10 shadow-sm flex flex-col"
            >
              <div className="flex justify-between items-start mb-8">
                <div className={cn(
                  "w-16 h-16 rounded-3xl flex items-center justify-center",
                  int.status === 'Connected' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-400"
                )}>
                  {int.type === 'Accounting' && <Calculator size={32} />}
                  {int.type === 'SMS' && <MessageSquareText size={32} />}
                  {int.type === 'CRM' && <Users size={32} />}
                  {int.type === 'Delivery' && <Truck size={32} />}
                </div>
                <div className="text-right">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest",
                    int.status === 'Connected' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  )}>
                    {int.status}
                  </span>
                  {int.lastSync && (
                    <p className="text-[8px] uppercase tracking-widest font-bold opacity-30 mt-2">
                      Synced {new Date(int.lastSync).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              <h3 className="serif text-3xl mb-2">{int.name}</h3>
              <p className="text-xs text-[#00E5FF]/40 mb-8">{int.type} Integration</p>
              
              <div className="mt-auto pt-6 border-t border-[#00E5FF]/5 flex gap-4">
                <button 
                  onClick={() => onSync(int.id)}
                  className="flex-1 py-4 bg-[#FF0055] text-[#E0E7FF] rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#FF0055]/80 transition-all"
                >
                  Sync Now
                </button>
                <button className="flex-1 py-4 bg-[#0B0E14] text-[#00E5FF] rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#e5e5e0] transition-all">
                  Configure
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 'IoT' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {iotDevices.map(device => (
            <motion.div 
              key={device.id}
              className="bg-[#151A22] p-10 rounded-[48px] border border-[#00E5FF]/10 shadow-sm"
            >
              <div className="flex justify-between items-start mb-8">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center",
                  device.status === 'Online' ? "bg-emerald-50 text-emerald-600" : 
                  device.status === 'Maintenance' ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-400"
                )}>
                  <Cpu size={28} />
                </div>
                <div className="text-right">
                  <p className="text-[8px] uppercase tracking-widest font-bold opacity-40 mb-1">Status</p>
                  <p className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    device.status === 'Online' ? "text-emerald-600" : 
                    device.status === 'Maintenance' ? "text-amber-600" : "text-red-500"
                  )}>{device.status}</p>
                </div>
              </div>
              <h3 className="serif text-2xl mb-1">{device.name}</h3>
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/30 mb-8">{device.type}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                {device.metrics.temperature && (
                  <div className="p-4 bg-[#0B0E14] rounded-2xl border border-[#00E5FF]/10 shadow-[inner_0_0_10px_rgba(0,229,255,0.05)]">
                    <p className="text-[8px] uppercase tracking-widest font-bold opacity-40 mb-1">Temp</p>
                    <p className="text-sm font-bold">{device.metrics.temperature}°C</p>
                  </div>
                )}
                {device.metrics.shotsToday && (
                  <div className="p-4 bg-[#0B0E14] rounded-2xl border border-[#00E5FF]/10 shadow-[inner_0_0_10px_rgba(0,229,255,0.05)]">
                    <p className="text-[8px] uppercase tracking-widest font-bold opacity-40 mb-1">Shots</p>
                    <p className="text-sm font-bold">{device.metrics.shotsToday}</p>
                  </div>
                )}
                {device.metrics.waterLevel && (
                  <div className="p-4 bg-[#0B0E14] rounded-2xl border border-[#00E5FF]/10 shadow-[inner_0_0_10px_rgba(0,229,255,0.05)]">
                    <p className="text-[8px] uppercase tracking-widest font-bold opacity-40 mb-1">Water</p>
                    <p className="text-sm font-bold">{device.metrics.waterLevel}%</p>
                  </div>
                )}
                {device.metrics.pressure && (
                  <div className="p-4 bg-[#0B0E14] rounded-2xl border border-[#00E5FF]/10 shadow-[inner_0_0_10px_rgba(0,229,255,0.05)]">
                    <p className="text-[8px] uppercase tracking-widest font-bold opacity-40 mb-1">Pressure</p>
                    <p className="text-sm font-bold">{device.metrics.pressure} bar</p>
                  </div>
                )}
              </div>

              <button 
                onClick={() => onUpdateIoT({ ...device, status: device.status === 'Online' ? 'Offline' : 'Online' })}
                className="w-full py-4 bg-[#0B0E14] text-[#00E5FF] rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#e5e5e0] transition-all"
              >
                {device.status === 'Online' ? 'Turn Off' : 'Turn On'}
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 'Delivery' && (
        <div className="bg-[#151A22] p-12 rounded-[64px] border border-[#00E5FF]/10 shadow-sm">
          <h2 className="serif text-4xl mb-10">Delivery Partners</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {deliveryPartners.map(partner => (
              <div key={partner.id} className="p-8 bg-[#0B0E14] rounded-[40px] space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#151A22] flex items-center justify-center text-[#00E5FF]">
                      <Globe size={20} />
                    </div>
                    <h4 className="font-bold">{partner.name}</h4>
                  </div>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    partner.apiStatus === 'Active' ? "bg-emerald-500" : "bg-red-500"
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[8px] uppercase tracking-widest font-bold opacity-40 mb-1">Active Orders</p>
                    <p className="text-xl font-bold">{partner.activeOrders}</p>
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-widest font-bold opacity-40 mb-1">Avg Time</p>
                    <p className="text-xl font-bold">{partner.avgDeliveryTime}m</p>
                  </div>
                </div>
                <button 
                  onClick={() => onUpdateDelivery({ ...partner, apiStatus: partner.apiStatus === 'Active' ? 'Inactive' : 'Active' })}
                  className="w-full py-3 bg-[#151A22] text-[#00E5FF] rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#151A22]/80 transition-all"
                >
                  {partner.apiStatus === 'Active' ? 'Disable API' : 'Enable API'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ChatDrawer = ({ 
  isOpen, 
  onClose, 
  messages, 
  user,
  recipients,
  sendMessage,
  markRead
}: { 
  isOpen: boolean;
  onClose: () => void;
  messages: DirectMessage[];
  user: UserProfile;
  recipients: UserDirectoryEntry[];
  sendMessage: (receiverId: string, recipientName: string, text: string) => void;
  markRead: (id: string) => void;
}) => {
  const [recipient, setRecipient] = useState<string>('');
  const [text, setText] = useState('');

  const availableRecipients = recipients.filter(entry => {
    if (entry.id === user.id) return false;
    if (user.role === 'Customer') return ['Sales Rep', 'Admin', 'Management'].includes(entry.role);
    return true;
  });
  const myMessages = messages.filter(m => m.receiverId === user.id || m.senderId === user.id);
  const unreadCount = messages.filter(m => m.receiverId === user.id && !m.isRead).length;

  useEffect(() => {
    if (!availableRecipients.some(entry => entry.id === recipient)) {
      setRecipient(availableRecipients[0]?.id || '');
    }
  }, [availableRecipients, recipient]);

  useEffect(() => {
    if (isOpen) {
      messages.forEach(m => {
        if (m.receiverId === user.id && !m.isRead) {
          markRead(m.id);
        }
      });
    }
  }, [isOpen, messages, markRead, user.id]);

  const handleSend = () => {
    const selectedRecipient = availableRecipients.find(entry => entry.id === recipient);
    if (!text.trim() || !selectedRecipient) return;
    sendMessage(selectedRecipient.id, selectedRecipient.name, text.trim());
    setText('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]" />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-y-0 right-0 w-full max-w-md bg-[#151A22] z-[70] shadow-2xl flex flex-col">
            <div className="p-8 border-b border-[#00E5FF]/10 flex justify-between items-center">
              <div>
                <h2 className="serif text-3xl text-[#00E5FF]">Messages</h2>
                <p className="text-xs uppercase tracking-widest font-bold text-[#00E5FF]/40 mt-1">{unreadCount} Unread</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-[#0B0E14] rounded-full transition-colors"><X size={24} className="text-[#00E5FF]" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {myMessages.length === 0 ? (
                <div className="text-center py-12 text-[#A5B4FC]/40">
                  <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="font-bold">No messages yet</p>
                </div>
              ) : (
                myMessages.map(m => {
                  const isMine = m.senderId === user.id;
                  return (
                    <div key={m.id} className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>
                      <div className={cn(
                        "max-w-[80%] p-4 rounded-[24px]",
                        isMine ? "bg-[#FF0055] text-[#E0E7FF] rounded-br-sm" : "bg-[#0B0E14] text-[#A5B4FC] rounded-bl-sm"
                      )}>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">{isMine ? 'You' : m.senderName}</p>
                        <p className="text-sm">{m.message}</p>
                      </div>
                      <span className="text-[10px] text-[#A5B4FC]/40 font-bold uppercase tracking-widest mt-2">
                        {new Date(m.timestamp).toLocaleTimeString()} {isMine && (m.isRead ? '• Read' : '• Sent')}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-8 border-t border-[#00E5FF]/10 bg-[#0B0E14] space-y-4">
              <select 
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                disabled={availableRecipients.length === 0}
                className="w-full p-4 bg-[#151A22] rounded-2xl border-none text-sm font-bold text-[#00E5FF] focus:ring-0 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {availableRecipients.length === 0
                  ? <option value="">No available recipients</option>
                  : availableRecipients.map(entry => <option key={entry.id} value={entry.id}>{entry.name} ({entry.role})</option>)}
              </select>
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Type a message..."
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  className="flex-1 px-6 py-4 rounded-full border-none shadow-sm text-sm focus:ring-2 focus:ring-[#00E5FF]/20"
                />
                <button 
                  onClick={handleSend}
                  disabled={!recipient || !text.trim()}
                  className="w-14 h-14 bg-[#FF0055] text-[#E0E7FF] flex items-center justify-center rounded-full shadow-lg hover:scale-105 transition-transform disabled:opacity-40 disabled:hover:scale-100"
                >
                  <MessageSquare size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA install choice: ${outcome}`);
    setDeferredPrompt(null);
    setIsInstallable(false);
  };
  
  // Shared State
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [productionTasks, setProductionTasks] = useState<ProductionTask[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const driversRef = useRef<Driver[]>([]);
  const [trips, setTrips] = useState<DeliveryTrip[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [coffees, setCoffees] = useState<Coffee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [kpis, setKpis] = useState<BusinessKPIs | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [churnPredictions, setChurnPredictions] = useState<ChurnPrediction[]>([]);
  const [priceAdjustments, setPriceAdjustments] = useState<PriceAdjustment[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [iotDevices, setIotDevices] = useState<IoTDevice[]>([]);
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartner[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [salesImports, setSalesImports] = useState<SalesImportRecord[]>([]);
  const [userDirectory, setUserDirectory] = useState<UserDirectoryEntry[]>([]);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);

  useEffect(() => {
    driversRef.current = drivers;
  }, [drivers]);

  useEffect(() => {
    const initAuth = async () => {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(await buildUserProfileFromSupabaseUser(session.user));
        }
        
        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            setUser(await buildUserProfileFromSupabaseUser(session.user));
          } else {
            setUser(null);
          }
        });

        setAuthLoading(false);
        return () => authListener.subscription.unsubscribe();
      }
      setAuthLoading(false);
      return undefined;
    };
    let cleanup: (() => void) | undefined;
    initAuth().then(result => { cleanup = result; });
    return () => cleanup?.();
  }, []);

  useEffect(() => {
    if (!user) return;

    let activeSocket: Socket | null = null;
    let cancelled = false;

    const setupSocket = async () => {
      let token: string | undefined;
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token;
      }

      if (cancelled) return;

      activeSocket = io(getSocketUrl(), {
        auth: { token, user },
        transports: ['websocket', 'polling'],
        withCredentials: false
      });
      socket = activeSocket;

      activeSocket.on('sync', (state) => {
        setOrders(state.orders || []);
        setPayments(state.payments || []);
        setProductionTasks(state.productionTasks || []);
        setIssues(state.issues || []);
        setDrivers(state.drivers || []);
        setTrips(state.trips || []);
        setZones(state.zones || []);
        setRefunds(state.refunds || []);
        setWalletTransactions(state.walletTransactions || []);
        setPayouts(state.payouts || []);
        setInventory(state.inventory || []);
        setCustomers(state.customers || []);
        setInsights(state.insights || []);
        setSavedReports(state.savedReports || []);
        setPromotions(state.promotions || []);
        setCoffees(state.coffees || []);
        setBranches(state.branches || []);
        setKpis(state.kpis || null);
        setRecommendations(state.recommendations || []);
        setChurnPredictions(state.churnPredictions || []);
        setPriceAdjustments(state.priceAdjustments || []);
        setIntegrations(state.integrations || []);
        setIotDevices(state.iotDevices || []);
        setDeliveryPartners(state.deliveryPartners || []);
        setHeatmapData(state.heatmapData || []);
        setMessages(state.messages || []);
        setSalesImports(state.salesImports || []);
        setUserDirectory(state.userDirectory || []);
      });

      activeSocket.on('permission_denied', (payload) => {
        addNotification(payload?.message || 'You do not have permission to perform that action.');
      });

      activeSocket.on('operation_error', (payload) => {
        addNotification(payload?.message || 'Operation failed.');
      });

      activeSocket.on('message_received', (msg) => {
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        if (msg.receiverId === user.id) {
          addNotification(`New message from ${msg.senderName}`);
        }
      });

      activeSocket.on('message_updated', (updated) => {
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      });

      activeSocket.on('integrations_updated', setIntegrations);
      activeSocket.on('iot_devices_updated', setIotDevices);
      activeSocket.on('delivery_partners_updated', setDeliveryPartners);
      activeSocket.on('branches_updated', setBranches);

      activeSocket.on('refund_processed', (refund) => {
        setRefunds(prev => prev.some(r => r.id === refund.id) ? prev : [...prev, refund]);
        addNotification(`Refund Processed: ${refund.id}`);
      });

      activeSocket.on('wallet_transaction_added', (transaction) => {
        setWalletTransactions(prev => prev.some(t => t.id === transaction.id) ? prev : [...prev, transaction]);
        if (user.email === transaction.userId) {
          addNotification(`Wallet ${transaction.type}: ETB ${transaction.amount}`);
        }
      });

      activeSocket.on('payout_requested', (payout) => {
        setPayouts(prev => prev.some(p => p.id === payout.id) ? prev : [...prev, payout]);
        addNotification(`Payout Requested: ${payout.id}`);
      });

      activeSocket.on('payout_updated', (payout) => {
        setPayouts(prev => prev.map(p => p.id === payout.id ? payout : p));
      });

      activeSocket.on('order_created', ({ order, task }) => {
        setOrders(prev => prev.some(o => o.id === order.id) ? prev : [...prev, order]);
        setProductionTasks(prev => prev.some(t => t.id === task.id) ? prev : [...prev, task]);
        addNotification(`New Order: ${order.id}`);
      });

      activeSocket.on('order_updated', (order) => {
        setOrders(prev => prev.map(o => o.id === order.id ? order : o));
      });

      activeSocket.on('payment_added', (payment) => {
        setPayments(prev => prev.some(p => p.id === payment.id) ? prev : [...prev, payment]);
        addNotification(`Payment Received: ${payment.id}`);
      });

      activeSocket.on('payment_updated', (payment) => {
        setPayments(prev => prev.map(p => p.id === payment.id ? payment : p));
      });

      activeSocket.on('payment_note_added', ({ paymentId, note }) => {
        setPayments(prev => prev.map(p => {
          if (p.id === paymentId) {
            return { ...p, notes: [...(p.notes || []), note] };
          }
          return p;
        }));
      });

      activeSocket.on('production_updated', (task) => {
        setProductionTasks(prev => prev.map(t => t.id === task.id ? task : t));
      });

      activeSocket.on('trip_assigned', ({ trip, driver }) => {
        setTrips(prev => prev.some(t => t.id === trip.id) ? prev : [...prev, trip]);
        setDrivers(prev => prev.map(d => d.id === driver.id ? driver : d));
      });

      activeSocket.on('trip_updated', (trip) => {
        setTrips(prev => prev.map(t => t.id === trip.id ? trip : t));
      });

      activeSocket.on('inventory_updated', setInventory);
      activeSocket.on('customers_updated', setCustomers);
      activeSocket.on('insights_updated', setInsights);
      activeSocket.on('saved_reports_updated', setSavedReports);
      activeSocket.on('promotions_updated', setPromotions);
      activeSocket.on('coffees_updated', setCoffees);

      activeSocket.on('driver_location_updated', ({ driverId, location }) => {
        setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, currentLocation: location } : d));
      });

      activeSocket.on('issue_reported', (issue) => {
        setIssues(prev => prev.some(i => i.id === issue.id) ? prev : [...prev, issue]);
        addNotification(`Issue Reported: ${issue.id}`);
      });

      activeSocket.on('comment_added', ({ issueId, comment }) => {
        setIssues(prev => prev.map(i => {
          if (i.id === issueId) {
            return { ...i, comments: [...i.comments, comment] };
          }
          return i;
        }));
      });

    };

    setupSocket();

    return () => {
      cancelled = true;
      activeSocket?.disconnect();
    };
  }, [user]);

  const addToCart = (coffee: Coffee, customization?: CustomizationOptions, branchId?: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === coffee.id && item.branchId === branchId && JSON.stringify(item.customization) === JSON.stringify(customization));
      if (existing) {
        return prev.map(item => (item.id === coffee.id && item.branchId === branchId && JSON.stringify(item.customization) === JSON.stringify(customization)) ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...coffee, quantity: 1, customization, branchId }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateCartQuantity = (id: string, quantity: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity } : item));
  };

  const addNotification = (msg: string) => {
    setNotifications(prev => [msg, ...prev].slice(0, 5));
    setTimeout(() => setNotifications(prev => prev.filter(m => m !== msg)), 3000);
  };

  const placeOrder = (customerData?: any) => {
    if (!user || cart.length === 0) return;
    
    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

    const executeOrder = () => {
      const order: Order = {
        id: createEntityId('ORD'),
        items: cart,
        total,
        status: 'Pending',
        customerName: customerData?.name || user.name,
        customerEmail: customerData?.email || user.email,
        customerPhone: customerData?.phone,
        address: customerData?.address || '',
        timestamp: new Date().toISOString(),
        type: customerData?.type || 'Pickup',
        paymentMethod: customerData?.paymentMethod || 'Telebirr',
        receiptNumber: customerData?.receiptNumber,
        branchId: customerData?.branchId || cart.find(item => item.branchId)?.branchId,
        salesRepId: user.role === 'Sales Rep' ? user.id : undefined,
        location: customerData?.type === 'Delivery' && customerData?.location
          ? { ...customerData.location, address: customerData?.address || customerData.location.address }
          : undefined
      };

      if (order.paymentMethod === 'Cheque' && customerData) {
        order.bank = customerData.bank;
        order.chequeNumber = customerData.chequeNumber;
        order.dueDate = customerData.dueDate;
      }

      socket.emit('create_order', order);
      setCart([]);
      setIsCartOpen(false);
      addNotification('Order placed successfully!');
    };

    executeOrder();
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4">
        <div className="text-[#00E5FF] font-bold tracking-widest uppercase animate-pulse">Loading Platform...</div>
      </div>
    );
  }

  if (!user) return <Login onLogin={setUser} />;

  const linkedCustomer = customers.find(customer =>
    customer.id === user.id || Boolean(user.email && customer.email && customer.email.toLowerCase() === user.email.toLowerCase())
  );
  const linkedDriver = drivers.find(driver => driver.id === user.id);
  const linkedUser: UserProfile = {
    ...user,
    phone: linkedCustomer?.phone || user.phone,
    address: linkedCustomer?.address || user.address,
    tin: linkedCustomer?.tin || user.tin,
    accountNumber: linkedCustomer?.accountNumber || user.accountNumber,
    walletBalance: linkedCustomer?.walletBalance ?? user.walletBalance,
    loyaltyPoints: linkedCustomer?.loyaltyPoints ?? user.loyaltyPoints,
    totalSpent: linkedCustomer?.totalSpent ?? user.totalSpent,
    orderCount: linkedCustomer?.orderCount ?? user.orderCount,
    segment: linkedCustomer?.segment || user.segment,
    lastOrderDate: linkedCustomer?.lastOrderDate || user.lastOrderDate,
    driverProfile: linkedDriver || user.driverProfile
  };

  const customerOwnsOrder = (order: Order) => {
    const emailMatch = Boolean(linkedUser.email && order.customerEmail && linkedUser.email.toLowerCase() === order.customerEmail.toLowerCase());
    const phoneMatch = Boolean(linkedUser.phone && order.customerPhone && linkedUser.phone.replace(/\D/g, '') === order.customerPhone.replace(/\D/g, ''));
    return emailMatch || phoneMatch;
  };
  const driverOrderIds = new Set(trips.filter(trip => trip.driverId === linkedUser.id).flatMap(trip => trip.orderIds));
  const visibleOrders = linkedUser.role === 'Customer'
    ? orders.filter(customerOwnsOrder)
    : linkedUser.role === 'Driver'
      ? orders.filter(order => order.driverId === linkedUser.id || driverOrderIds.has(order.id))
      : orders;
  const visibleOrderIds = new Set(visibleOrders.map(order => order.id));
  const visiblePayments = linkedUser.role === 'Customer' || linkedUser.role === 'Driver'
    ? payments.filter(payment => visibleOrderIds.has(payment.orderId))
    : payments;
  const visibleTrips = linkedUser.role === 'Driver'
    ? trips.filter(trip => trip.driverId === linkedUser.id)
    : linkedUser.role === 'Customer'
      ? trips.filter(trip => trip.orderIds.some(orderId => visibleOrderIds.has(orderId)))
      : trips;
  const visibleIssues = linkedUser.role === 'Customer' || linkedUser.role === 'Driver'
    ? issues.filter(issue => visibleOrderIds.has(issue.orderId) || issue.reportedBy === linkedUser.id || issue.reportedBy === linkedUser.name)
    : issues;
  const visibleDriverIds = new Set([
    ...visibleOrders.map(order => order.driverId).filter((id): id is string => Boolean(id)),
    ...visibleTrips.map(trip => trip.driverId)
  ]);
  const visibleDrivers = linkedUser.role === 'Driver'
    ? drivers.filter(driver => driver.id === linkedUser.id)
    : linkedUser.role === 'Customer'
      ? drivers.filter(driver => visibleDriverIds.has(driver.id))
      : drivers;

  return (
    <CurrencyProvider>
      <Router>
        <div className="min-h-screen flex">
        <Sidebar 
          user={linkedUser} 
          logout={handleLogout} 
          isInstallable={isInstallable} 
          onInstall={handleInstallClick} 
        />
        
        <main className="flex-1 lg:ml-64 p-4 md:p-8 lg:p-12 pb-24 lg:pb-12">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Storefront addToCart={addToCart} user={linkedUser} coffees={coffees} recommendations={recommendations} priceAdjustments={priceAdjustments} branches={branches} heatmapData={heatmapData} />} />
              <Route path="/sales-dashboard" element={<RoleRoute user={linkedUser} roles={['Sales Rep']}><SalesDashboard orders={orders} payments={payments} branches={branches} salesImports={salesImports} socket={socket} /></RoleRoute>} />
              <Route path="/order-creation" element={<RoleRoute user={linkedUser} roles={['Sales Rep']}><OrderCreation addToCart={addToCart} removeFromCart={removeFromCart} updateCartQuantity={updateCartQuantity} placeOrder={placeOrder} cart={cart} coffees={coffees} /></RoleRoute>} />
              <Route path="/proforma" element={<RoleRoute user={linkedUser} roles={['Sales Rep']}><ProformaInvoicePage coffees={coffees} /></RoleRoute>} />
              <Route path="/ai-report" element={<RoleRoute user={linkedUser} roles={['Sales Rep', 'Marketing']}><AIReportPage orders={orders} payments={payments} socket={socket} savedReports={savedReports} /></RoleRoute>} />
              <Route path="/payments" element={<RoleRoute user={linkedUser} roles={['Sales Rep', 'Payment Collector']}><PaymentTracking payments={payments} updateStatus={(id, status) => socket.emit('update_payment_status', { paymentId: id, status })} /></RoleRoute>} />
              <Route path="/production" element={<RoleRoute user={linkedUser} roles={['Factory/Ops']}><FactoryProduction tasks={productionTasks} updateStatus={(id, status) => socket.emit('update_production_status', { taskId: id, status })} /></RoleRoute>} />
              <Route path="/analytics" element={<RoleRoute user={linkedUser} roles={['Marketing']}><MarketingAnalytics orders={orders} /></RoleRoute>} />
              <Route path="/finance" element={<RoleRoute user={linkedUser} roles={['Payment Collector']}><FinanceDashboard orders={orders} payments={payments} refunds={refunds} payouts={payouts} processPayout={(id) => socket.emit('process_payout', { payoutId: id, status: 'Processed' })} /></RoleRoute>} />
              <Route path="/admin" element={<RoleRoute user={linkedUser} roles={[]}><AdminDashboard inventory={inventory} customers={customers} insights={insights} promotions={promotions} coffees={coffees} /></RoleRoute>} />
              <Route path="/admin/products" element={<RoleRoute user={linkedUser} roles={['Factory/Ops']}><ProductManagement coffees={coffees} onUpdate={(c) => socket.emit('update_coffee', c)} onAdd={(c) => socket.emit('add_coffee', c)} onDelete={(id) => socket.emit('delete_coffee', id)} /></RoleRoute>} />
              <Route path="/admin/inventory" element={<RoleRoute user={linkedUser} roles={['Factory/Ops']}><InventoryManagement inventory={inventory} branches={branches} onUpdate={(item) => socket.emit('update_inventory', item)} onAdd={(item) => socket.emit('add_inventory', item)} /></RoleRoute>} />
              <Route path="/admin/branches" element={<RoleRoute user={linkedUser} roles={[]}><BranchManagement branches={branches} onAdd={(b) => socket.emit('add_branch', b)} onUpdate={(b) => socket.emit('update_branch', b)} onDelete={(id) => socket.emit('delete_branch', id)} /></RoleRoute>} />
              <Route path="/admin/customers" element={<RoleRoute user={linkedUser} roles={['Sales Rep', 'Marketing']}><CustomerManagement customers={customers} orders={orders} churnPredictions={churnPredictions} onUpdate={(c) => socket.emit('update_customer', c)} /></RoleRoute>} />
              <Route path="/admin/insights" element={<RoleRoute user={linkedUser} roles={['Marketing']}><AIInsights insights={insights} /></RoleRoute>} />
              <Route path="/admin/advanced-analytics" element={<RoleRoute user={linkedUser} roles={['Marketing']}>{kpis ? <AdvancedAnalytics branches={branches} kpis={kpis} orders={orders} /> : <div>Loading...</div>}</RoleRoute>} />
              <Route path="/admin/promotions" element={<RoleRoute user={linkedUser} roles={['Marketing']}><PromotionsManagement promotions={promotions} onAdd={(p) => socket.emit('add_promotion', p)} onToggle={(id) => socket.emit('toggle_promotion', id)} /></RoleRoute>} />
              <Route path="/admin/integrations" element={<RoleRoute user={linkedUser} roles={['Factory/Ops']}><IntegrationsManagement integrations={integrations} iotDevices={iotDevices} deliveryPartners={deliveryPartners} onSync={(id) => socket.emit('sync_integration', id)} onUpdateIoT={(d) => socket.emit('update_iot_device', d)} onUpdateDelivery={(p) => socket.emit('update_delivery_partner', p)} /></RoleRoute>} />
              <Route path="/refunds" element={<RoleRoute user={linkedUser} roles={['Sales Rep', 'Payment Collector']}><RefundManagement payments={payments} refunds={refunds} processRefund={(r) => socket.emit('process_refund', r)} /></RoleRoute>} />
              <Route path="/collaboration" element={<ExceptionLog issues={visibleIssues} user={linkedUser} reportIssue={(i) => socket.emit('report_issue', i)} addComment={(id, c) => socket.emit('add_comment', { issueId: id, comment: c })} />} />
              <Route path="/profile" element={<Profile user={linkedUser} coffees={coffees} orders={visibleOrders} onUpdateUser={(updated) => setUser(updated)} />} />
              <Route path="/tracking" element={<OrderTracking orders={visibleOrders} issues={visibleIssues} drivers={visibleDrivers} trips={visibleTrips} />} />
              <Route path="/my-analytics" element={<PersonalAnalytics user={linkedUser} orders={visibleOrders} payments={visiblePayments} trips={visibleTrips} />} />
              <Route path="/cheque-followup" element={<RoleRoute user={linkedUser} roles={['Payment Collector']}><ChequeFollowUp payments={payments} updateStatus={(id, s) => socket.emit('update_payment_status', { paymentId: id, status: s })} addNote={(id, n) => socket.emit('add_payment_note', { paymentId: id, note: n })} user={linkedUser} /></RoleRoute>} />
              <Route path="/driver" element={<RoleRoute user={linkedUser} roles={['Driver']}><DriverDashboard user={linkedUser} orders={orders} trips={trips} updateTripStatus={(id, s) => socket.emit('update_trip_status', { tripId: id, status: s })} updateLocation={(l) => socket.emit('driver_location_update', { driverId: linkedUser.id, location: l })} /></RoleRoute>} />
              <Route path="/logistics" element={<RoleRoute user={linkedUser} roles={['Factory/Ops', 'Driver']}><LogisticsManagement drivers={visibleDrivers} trips={visibleTrips} orders={visibleOrders} zones={zones} /></RoleRoute>} />
            </Routes>
          </div>
        </main>

        {/* Notifications */}
        <div className="fixed top-4 right-4 z-[110] space-y-2 pointer-events-none">
          <AnimatePresence>
            {notifications.map((note, i) => (
              <motion.div key={i} initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }} className="bg-[#FF0055] text-[#E0E7FF] px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 pointer-events-auto">
                <Bell size={16} />
                <span className="text-xs font-bold">{note}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Message Trigger */}
        <button 
          onClick={() => setIsMessagesOpen(true)} 
          className={cn(
            "fixed z-30 p-4 bg-[#151A22] text-[#00E5FF] rounded-full shadow-2xl flex items-center gap-3 border border-[#00E5FF]/10 hover:bg-[#0B0E14] transition-colors",
            linkedUser.role === 'Customer' ? "bottom-24 right-8" : "bottom-8 right-8"
          )}
        >
          <MessageSquare size={24} />
          {messages.filter(m => m.receiverId === linkedUser.id && !m.isRead).length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#00E5FF]/30" />
          )}
        </button>

        <ChatDrawer 
          isOpen={isMessagesOpen}
          onClose={() => setIsMessagesOpen(false)}
          messages={messages}
          user={linkedUser}
          recipients={userDirectory}
          sendMessage={(receiverId, recipientName, text) => {
            socket.emit('send_message', {
              id: createEntityId('MSG'),
              senderId: linkedUser.id,
              senderName: linkedUser.name,
              receiverId,
              message: text,
              timestamp: new Date().toISOString(),
              isRead: false
            });
          }}
          markRead={(id) => socket.emit('mark_message_read', id)}
        />

        {/* Floating Cart Trigger */}
        {linkedUser.role === 'Customer' && (
          <button onClick={() => setIsCartOpen(true)} className="fixed bottom-8 right-8 z-30 p-4 bg-[#FF0055] text-[#E0E7FF] rounded-full shadow-2xl flex items-center gap-3">
            <ShoppingCart size={24} />
            {cart.length > 0 && <span className="bg-[#151A22] text-[#00E5FF] text-[10px] font-bold px-2 py-0.5 rounded-full">{cart.reduce((s, i) => s + i.quantity, 0)}</span>}
          </button>
        )}

        {/* Cart Drawer (Simplified for brevity) */}
        <AnimatePresence>
          {isCartOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]" />
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-y-0 right-0 w-full max-w-md bg-[#151A22] z-[70] shadow-2xl flex flex-col p-8">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="serif text-3xl">Basket</h2>
                  <button onClick={() => setIsCartOpen(false)}><X size={24} /></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center">
                      <span className="text-sm font-bold">{item.quantity}x {item.name}</span>
                      <span className="text-sm font-bold">ETB {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-8 border-t border-[#00E5FF]/10 space-y-4">
                  <div className="flex justify-between text-xl serif">
                    <span>Total</span>
                    <span>ETB {cart.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}</span>
                  </div>
                  <button onClick={() => placeOrder()} className="w-full py-4 bg-[#FF0055] text-[#E0E7FF] rounded-full font-bold">Place Order</button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        </div>
    </Router>
    </CurrencyProvider>
  );
}

// --- Reusing existing views with minor updates ---
const AIReportPage = ({ 
  orders, 
  payments, 
  socket, 
  savedReports = [] 
}: { 
  orders: Order[], 
  payments: PaymentRecord[], 
  socket: any, 
  savedReports?: SavedReport[] 
}) => {
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<SavedReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string, data: string, mimeType: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMarkdown, setEditedMarkdown] = useState('');

  // History date filters
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  // Filter saved reports based on creation date
  const filteredSavedReports = useMemo(() => {
    return savedReports.filter(r => {
      const reportDate = r.timestamp ? new Date(r.timestamp).toISOString().split('T')[0] : '';
      if (historyStartDate && reportDate < historyStartDate) return false;
      if (historyEndDate && reportDate > historyEndDate) return false;
      return true;
    });
  }, [savedReports, historyStartDate, historyEndDate]);

  const handleSaveToInsights = () => {
    if (report) {
      if (isEditing) {
        setReport({ ...report, markdown: editedMarkdown });
        setIsEditing(false);
      }
      
      const insightId = `ai-${Date.now()}`;
      socket.emit('save_insight', {
        id: insightId,
        type: 'Demand Prediction',
        title: `AI Analytics Insight: ${startDate} to ${endDate}`,
        description: isEditing ? editedMarkdown : report.markdown,
        confidence: 0.95
      });
      alert('Saved to Insights successfully!');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.type === 'application/vnd.ms-excel') {
        const fileReader = new FileReader();
        fileReader.onload = async (event) => {
          const XLSX = await import('xlsx');
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, {type: 'array'});
          let csvStr = "";
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            csvStr += `--- Sheet: ${sheetName} ---\n`;
            csvStr += XLSX.utils.sheet_to_csv(worksheet) + "\n\n";
          });
          setUploadedFile({
            name: file.name + ".csv",
            data: btoa(unescape(encodeURIComponent(csvStr))),
            mimeType: 'text/csv'
          });
        };
        fileReader.readAsArrayBuffer(file);
      } else if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const fileReader = new FileReader();
        fileReader.onload = async (event) => {
          try {
            const mammoth = await import('mammoth');
            const arrayBuffer = event.target?.result as ArrayBuffer;
            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            const text = result.value;
            setUploadedFile({
              name: file.name + ".txt",
              data: btoa(unescape(encodeURIComponent(text))),
              mimeType: 'text/plain'
            });
          } catch(err) {
            console.error("Docx parsing failed:", err);
            alert("Failed to parse Word document.");
          }
        };
        fileReader.readAsArrayBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Data = event.target?.result?.toString().split(',')[1];
          if (base64Data) {
             setUploadedFile({
                name: file.name,
                data: base64Data,
                mimeType: file.type || (file.name.endsWith('.csv') ? 'text/csv' : 'text/plain')
             });
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const filteredOrders = orders.filter(o => {
        const d = new Date(o.timestamp).toISOString().split('T')[0];
        return d >= startDate && d <= endDate;
      });
      const filteredPayments = payments.filter(p => {
        const d = new Date(p.timestamp).toISOString().split('T')[0];
        return d >= startDate && d <= endDate;
      });

      const token = await getSupabaseAccessToken();
      const res = await fetch(apiUrl('/api/generate-advanced-report'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ startDate, endDate, filteredOrders, filteredPayments, uploadedFile })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'The report could not be generated.');
      setReport(data);
    } catch (err) {
      console.error("Failed to generate report", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = async () => {
    const element = document.getElementById('ai-report-content');
    if (!element) return;
    try {
      const dataUrl = await toPng(element, { quality: 0.95 });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Tomoca_AI_Report_${startDate}_to_${endDate}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF", err);
    }
  };

  const handleSaveChanges = () => {
    if (report) {
      const updatedReport = {
        ...report,
        markdown: editedMarkdown
      };
      setReport(updatedReport);
      socket.emit('save_report', updatedReport);
      setIsEditing(false);
    }
  };

  const handleDeleteReport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this report from backend history?')) {
      socket.emit('delete_report', id);
      if (report && report.id === id) {
        setReport(null);
      }
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="serif text-4xl font-light">AI Advanced Report</h2>
          <p className="text-sm text-[#A5B4FC99] mt-2">Generate comprehensive business reports utilizing generative AI data analysis. Import previous sales data (PDF, DOCX, Excel) to include historical trends.</p>
        </div>
        <div className="flex items-center gap-4 bg-[#151A22] p-2 rounded-2xl border border-[#00E5FF1A] flex-wrap">
          <div className="flex items-center gap-2 border-r border-[#00E5FF1A] pr-4">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".pdf,.docx,.doc,.xls,.xlsx,.csv,text/plain,image/*" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#0B0E14] text-[#A5B4FC] px-4 py-2 rounded-xl text-sm flex items-center gap-2 hover:text-[#00E5FF] transition-all"
              title="Import PDF, Excel, or Word previous sales data"
            >
              <Upload size={16} /> 
              {uploadedFile ? <span className="max-w-[100px] truncate">{uploadedFile.name}</span> : "Import Previous Sales Data"}
            </button>
            {uploadedFile && (
              <button 
                onClick={() => setUploadedFile(null)} 
                className="text-[#FF0055] hover:text-[#FF0055]/80 p-1 bg-[#FF0055]/10 rounded-full"
                title="Remove file"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <input 
            type="date" 
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="bg-[#0B0E14] text-[#E0E7FF] border-none rounded-xl px-4 py-2 text-sm focus:outline-none"
          />
          <span className="text-[#00E5FF66]">to</span>
          <input 
            type="date" 
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="bg-[#0B0E14] text-[#E0E7FF] border-none rounded-xl px-4 py-2 text-sm focus:outline-none"
          />
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-[#00E5FF] text-[#0B0E14] font-bold px-6 py-2 rounded-xl text-sm flex items-center gap-2 hover:bg-[#00E5FFE6] transition-all disabled:opacity-50"
          >
            {isGenerating ? <Loader className="animate-spin" size={16} /> : <Brain size={16} />}
            {isGenerating ? "Analyzing..." : "Generate Insights"}
          </button>
          {report && !isGenerating && (
            <>
              <button 
                onClick={handleDownloadReport}
                className="bg-[#151A22] text-[#00E5FF] font-bold px-6 py-2 rounded-xl text-sm flex items-center gap-2 hover:bg-[#00E5FF1A] transition-all border border-[#00E5FF33]"
              >
                <Download size={16} /> Export PDF
              </button>
              <button 
                onClick={() => {
                  const text = encodeURIComponent(`Tomoca AI Report (${startDate} to ${endDate})\n\n` + report?.markdown?.substring(0, 1000) + `...\n\n[Full report available in Tomoca System]`);
                  window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${text}`, '_blank');
                }}
                className="bg-[#0088cc] text-white font-bold px-6 py-2 rounded-xl text-sm flex items-center gap-2 hover:bg-[#0088cc]/80 transition-all shadow-[0_0_15px_rgba(0,136,204,0.3)]"
              >
                <Send size={16} /> Send to Telegram
              </button>
              <button 
                onClick={handleSaveToInsights}
                className="bg-[#FF0055] text-white font-bold px-6 py-2 rounded-xl text-sm flex items-center gap-2 hover:bg-[#FF0055]/80 transition-all shadow-[0_0_15px_rgba(255,0,85,0.3)]"
              >
                <Brain size={16} /> Save to Insights
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Main report area */}
        <div className="lg:col-span-3 space-y-6">
          {report && !isGenerating ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4" id="ai-report-content">
              <div className="flex justify-between items-center bg-[#151A22] p-4 rounded-2xl border border-[#00E5FF1A]">
                <div>
                  <h3 className="text-lg font-bold text-[#00E5FF]">{report.title}</h3>
                  <p className="text-xs text-[#A5B4FC]/60">Report Range: {report.startDate} to {report.endDate}</p>
                </div>
                <div className="flex gap-4">
                  {isEditing ? (
                    <>
                      <button onClick={() => setIsEditing(false)} className="text-sm text-[#A5B4FC]/60 hover:text-white transition-colors">Cancel</button>
                      <button 
                        onClick={handleSaveChanges}
                        className="bg-[#00E5FF] text-[#0B0E14] px-4 py-2 rounded-lg font-bold text-sm hover:opacity-80"
                      >
                        Save Changes
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => {
                        setEditedMarkdown(report.markdown);
                        setIsEditing(true);
                      }}
                      className="bg-[#151A22] border border-[#00E5FF33] px-4 py-2 rounded-lg text-[#00E5FF] font-bold text-sm hover:bg-[#00E5FF1A] transition-colors"
                    >
                      Edit Report
                    </button>
                  )}
                </div>
              </div>
              <div className="bg-[#151A22] p-8 rounded-[32px] border border-[#FF005533] relative overflow-hidden group w-full text-[#E0E7FF] prose prose-invert max-w-none">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF00550D] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-[#FF00551A] transition-colors"></div>
                {isEditing ? (
                  <textarea 
                    value={editedMarkdown}
                    onChange={e => setEditedMarkdown(e.target.value)}
                    className="w-full h-[600px] bg-transparent text-[#E0E7FF] border-none outline-none resize-y font-mono text-sm CustomScrollbar"
                  />
                ) : (
                  <div className="markdown-body">
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {report.markdown}
                    </Markdown>
                  </div>
                )}
              </div>
            </motion.div>
          ) : isGenerating ? (
            <div className="h-96 flex flex-col items-center justify-center bg-[#151A22] border border-[#00E5FF1A] rounded-[32px]">
              <Loader className="animate-spin text-[#00E5FF] w-12 h-12 mb-4" />
              <p className="text-[#A5B4FC99] text-sm font-semibold">Generating & Storing Business Report in Backend...</p>
              <p className="text-xs text-[#A5B4FC]/40 mt-1">Analyzing sales data, payment records, and trends.</p>
            </div>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-[#00E5FF1A] rounded-[32px] bg-[#151A22]/30">
              <Brain className="text-[#00E5FF33] w-16 h-16 mb-4" />
              <p className="text-[#A5B4FC99] text-lg">Select a date range and click Generate Insights.</p>
              <p className="text-[#A5B4FC]/40 text-xs mt-1">Or select a previously generated report from the history panel.</p>
            </div>
          )}
        </div>

        {/* Right history/filter panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#151A22] p-6 rounded-[32px] border border-[#00E5FF1A] space-y-6">
            <div className="flex items-center justify-between border-b border-[#00E5FF1A] pb-4">
              <div className="flex items-center gap-2">
                <History className="text-[#00E5FF] w-5 h-5" />
                <h3 className="serif text-xl font-light">Saved Reports</h3>
              </div>
              <span className="bg-[#00E5FF]/15 text-[#00E5FF] text-xs font-bold px-2 py-0.5 rounded-full">
                {savedReports.length}
              </span>
            </div>

            {/* Date Filters for History List */}
            <div className="space-y-3 bg-[#0B0E14] p-4 rounded-2xl border border-[#00E5FF0D]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#A5B4FC]/60">
                <Calendar size={14} className="text-[#00E5FF]" />
                <span>Filter History By Date</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="text-[10px] text-[#A5B4FC]/40 uppercase font-semibold">Start Date</label>
                  <input 
                    type="date" 
                    value={historyStartDate}
                    onChange={e => setHistoryStartDate(e.target.value)}
                    className="w-full bg-[#151A22] text-[#E0E7FF] border border-[#00E5FF1A] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#A5B4FC]/40 uppercase font-semibold">End Date</label>
                  <input 
                    type="date" 
                    value={historyEndDate}
                    onChange={e => setHistoryEndDate(e.target.value)}
                    className="w-full bg-[#151A22] text-[#E0E7FF] border border-[#00E5FF1A] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
                {(historyStartDate || historyEndDate) && (
                  <button
                    onClick={() => {
                      setHistoryStartDate('');
                      setHistoryEndDate('');
                    }}
                    className="text-[10px] text-[#FF0055] hover:underline font-semibold mt-1 text-left flex items-center gap-1"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>

            {/* History List */}
            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1 CustomScrollbar">
              {filteredSavedReports.length === 0 ? (
                <div className="text-center py-8 text-[#A5B4FC]/40 text-xs">
                  <FileText className="mx-auto w-8 h-8 mb-2 opacity-20" />
                  No matching reports found
                </div>
              ) : (
                filteredSavedReports.map(rep => {
                  const isActive = report?.id === rep.id;
                  const formattedGenDate = rep.timestamp 
                    ? new Date(rep.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Unknown Date';

                  return (
                    <div
                      key={rep.id}
                      onClick={() => {
                        setReport(rep);
                        setStartDate(rep.startDate);
                        setEndDate(rep.endDate);
                        setIsEditing(false);
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between gap-3 ${
                        isActive
                          ? "bg-[#00E5FF]/10 border-[#00E5FF] shadow-lg"
                          : "bg-[#0B0E14] border-[#00E5FF1A] hover:border-[#00E5FF33]"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1 min-w-0">
                          <h4 className={`text-xs font-bold truncate ${isActive ? "text-[#00E5FF]" : "text-[#E0E7FF]"}`}>
                            {rep.startDate} to {rep.endDate}
                          </h4>
                          <p className="text-[10px] text-[#A5B4FC]/60 truncate">
                            {rep.title}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteReport(rep.id, e)}
                          className="text-[#A5B4FC]/40 hover:text-[#FF0055] p-1 bg-[#151A22]/50 hover:bg-[#FF0055]/15 rounded-lg transition-colors"
                          title="Delete Report"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between border-t border-[#00E5FF0A] pt-2">
                        <span className="text-[9px] text-[#A5B4FC]/40">
                          Gen: {formattedGenDate}
                        </span>
                        {isActive && (
                          <span className="bg-[#00E5FF]/20 text-[#00E5FF] text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

type UserDirectoryEntry = {
  id: string;
  name: string;
  role: UserRole;
};

type SalesImportReview = {
  importId: string;
  sourceFileName: string;
  sourceFileHash: string;
  branchId?: string;
  document: ParsedSalesDocument;
};

const SalesDashboard = ({
  orders,
  payments,
  branches,
  salesImports,
  socket
}: {
  orders: Order[];
  payments: PaymentRecord[];
  branches: Branch[];
  salesImports: SalesImportRecord[];
  socket: any;
}) => {
  const { formatPrice } = React.useContext(CurrencyContext);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [dateMode, setDateMode] = useState<'ai_detect' | 'specific_date'>('ai_detect');
  const [specificDate, setSpecificDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [review, setReview] = useState<SalesImportReview | null>(null);
  const [importResult, setImportResult] = useState<{ success: boolean; count?: number; fileName?: string; message?: string } | null>(null);

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
    }
    return btoa(binary);
  };

  const textToBase64 = (text: string) => {
    const bytes = new TextEncoder().encode(text);
    return arrayBufferToBase64(bytes.buffer);
  };

  const sha256 = async (buffer: ArrayBuffer) => {
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const processFile = async (file: File, data: string, mimeType: string, fileHash: string) => {
    const token = await getSupabaseAccessToken();
    const response = await fetch(apiUrl('/api/parse-historical-sales'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        fileData: data,
        mimeType,
        fileName: file.name,
        fileHash,
        dateMode,
        specificDate
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'The document could not be processed.');
    if (!result.document) throw new Error('No structured sales data was returned from the document.');
    setReview({
      importId: result.importId,
      sourceFileName: file.name,
      sourceFileHash: fileHash,
      document: result.document
    });
  };

  const handleHistoricalUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);
    try {
      const originalBuffer = await file.arrayBuffer();
      const fileHash = await sha256(originalBuffer);
      const lowerName = file.name.toLowerCase();

      if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(new Uint8Array(originalBuffer), { type: 'array' });
        const sheetText = workbook.SheetNames.map(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          return `--- Sheet: ${sheetName} ---\n${XLSX.utils.sheet_to_csv(worksheet)}`;
        }).join('\n\n');
        await processFile(file, textToBase64(sheetText), 'text/csv', fileHash);
      } else if (lowerName.endsWith('.docx')) {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ arrayBuffer: originalBuffer });
        await processFile(file, textToBase64(result.value), 'text/plain', fileHash);
      } else {
        const fallbackMime = lowerName.endsWith('.pdf')
          ? 'application/pdf'
          : lowerName.endsWith('.csv')
            ? 'text/csv'
            : lowerName.endsWith('.txt')
              ? 'text/plain'
              : file.type || 'application/octet-stream';
        await processFile(file, arrayBufferToBase64(originalBuffer), fallbackMime, fileHash);
      }
    } catch (error: any) {
      setImportResult({
        success: false,
        fileName: file.name,
        message: error?.message || 'Failed to process the document.'
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateDocument = <K extends keyof ParsedSalesDocument>(key: K, value: ParsedSalesDocument[K]) => {
    setReview(current => current ? { ...current, document: { ...current.document, [key]: value } } : current);
  };

  const updateLine = (index: number, key: keyof SalesImportLine, value: string | number) => {
    setReview(current => {
      if (!current) return current;
      const lineItems = current.document.lineItems.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        const next = { ...line, [key]: value } as SalesImportLine;
        if (key === 'quantity' || key === 'unitPrice') {
          next.lineTotal = Number((Number(next.quantity || 0) * Number(next.unitPrice || 0)).toFixed(2));
        }
        return next;
      });
      const subtotal = Number(lineItems.reduce((sum, line) => sum + Number(line.lineTotal || 0), 0).toFixed(2));
      return {
        ...current,
        document: {
          ...current.document,
          lineItems,
          subtotal,
          grandTotal: Number((subtotal + Number(current.document.vat || 0)).toFixed(2))
        }
      };
    });
  };

  const addLine = () => {
    setReview(current => current ? {
      ...current,
      document: {
        ...current.document,
        lineItems: [...current.document.lineItems, {
          id: `LINE-${current.document.lineItems.length + 1}`,
          description: '',
          unit: '',
          quantity: 1,
          unitPrice: 0,
          lineTotal: 0,
          category: 'Unclassified'
        }]
      }
    } : current);
  };

  const removeLine = (index: number) => {
    setReview(current => {
      if (!current) return current;
      const lineItems = current.document.lineItems.filter((_, lineIndex) => lineIndex !== index);
      const subtotal = Number(lineItems.reduce((sum, line) => sum + Number(line.lineTotal || 0), 0).toFixed(2));
      return {
        ...current,
        document: {
          ...current.document,
          lineItems,
          subtotal,
          grandTotal: Number((subtotal + Number(current.document.vat || 0)).toFixed(2))
        }
      };
    });
  };

  const confirmImport = () => {
    if (!review) return;
    const document = review.document;
    const localErrors: string[] = [];
    if (!document.customerName.trim()) localErrors.push('Customer name is required.');
    if (!document.transactionDate || Number.isNaN(new Date(document.transactionDate).getTime())) localErrors.push('A valid transaction date is required.');
    if (!document.lineItems.length) localErrors.push('At least one sales line is required.');
    if (document.lineItems.some(line => !line.description.trim() || Number(line.quantity) <= 0)) localErrors.push('Each line needs a description and positive quantity.');
    if (Number(document.grandTotal) <= 0) localErrors.push('Grand total must be greater than zero.');
    if (document.paymentMethod === 'Unknown') localErrors.push('Select the payment method.');
    if (localErrors.length) {
      setImportResult({ success: false, fileName: review.sourceFileName, message: localErrors.join(' ') });
      return;
    }

    setIsConfirming(true);
    socket.emit('confirm_sales_import', review, (response: any) => {
      setIsConfirming(false);
      if (response?.success) {
        setImportResult({ success: true, count: 1, fileName: review.sourceFileName, message: `Order ${response.orderId} was saved to Supabase.` });
        setReview(null);
      } else {
        setImportResult({ success: false, fileName: review.sourceFileName, message: response?.message || 'The import could not be saved.' });
      }
    });
  };

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const currentMonthOrders = orders.filter(order => order.status !== 'Cancelled' && new Date(order.timestamp) >= currentMonthStart);
  const previousMonthOrders = orders.filter(order => {
    const date = new Date(order.timestamp);
    return order.status !== 'Cancelled' && date >= previousMonthStart && date < currentMonthStart;
  });
  const monthlySales = currentMonthOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const previousMonthSales = previousMonthOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const monthlyGrowth = previousMonthSales > 0 ? ((monthlySales - previousMonthSales) / previousMonthSales) * 100 : null;
  const pendingPaymentRecords = payments.filter(payment => payment.status === 'Pending');
  const pendingPayments = pendingPaymentRecords.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const overdueCheques = pendingPaymentRecords.filter(payment => payment.method === 'Cheque' && payment.dueDate && new Date(payment.dueDate) < now).length;
  const activeOrders = orders.filter(order => !['Delivered', 'Cancelled'].includes(order.status)).length;
  const awaitingProduction = orders.filter(order => ['Pending', 'Processing'].includes(order.status)).length;

  const dailyData = useMemo(() => {
    const data = new Map<string, number>();
    orders.filter(order => order.status !== 'Cancelled').forEach(order => {
      const date = new Date(order.timestamp);
      if (Number.isNaN(date.getTime())) return;
      const key = date.toISOString().slice(0, 10);
      data.set(key, (data.get(key) || 0) + Number(order.total || 0));
    });
    return Array.from(data.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const companyRankings = useMemo(() => {
    const data = new Map<string, number>();
    orders.filter(order => order.status !== 'Cancelled' && order.customerName.trim()).forEach(order => {
      data.set(order.customerName, (data.get(order.customerName) || 0) + Number(order.total || 0));
    });
    return Array.from(data.entries()).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [orders]);

  const inputClass = 'w-full bg-[#0B0E14] border border-[#00E5FF]/15 rounded-xl px-3 py-2 text-sm text-[#E0E7FF] focus:outline-none focus:border-[#00E5FF]';

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-[#00E5FF]/10">
        <div>
          <h2 className="serif text-4xl font-light">Sales Dashboard</h2>
          <p className="text-sm text-[#A5B4FC]/60 mt-2">Real sales, payment, customer, branch, and imported-document data from Supabase.</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center items-stretch gap-4 bg-[#151A22] p-4 rounded-[32px] border border-[#00E5FF]/15 shadow-2xl w-full lg:w-auto">
          <div className="flex flex-col gap-1 pr-0 sm:pr-4 sm:border-r border-[#00E5FF]/10">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#A5B4FC]/40">Document Date</span>
            <div className="flex bg-[#0B0E14] p-1 rounded-xl border border-[#00E5FF]/10 mt-1">
              <button type="button" onClick={() => setDateMode('ai_detect')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${dateMode === 'ai_detect' ? 'bg-[#00E5FF]/15 text-[#00E5FF]' : 'text-[#A5B4FC]/60'}`}>
                <Brain size={14} /> Read from document
              </button>
              <button type="button" onClick={() => setDateMode('specific_date')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${dateMode === 'specific_date' ? 'bg-[#00E5FF]/15 text-[#00E5FF]' : 'text-[#A5B4FC]/60'}`}>
                <Calendar size={14} /> Override date
              </button>
            </div>
          </div>

          {dateMode === 'specific_date' && (
            <div className="flex flex-col gap-1 min-w-[140px]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#00E5FF]">Sales date</span>
              <input type="date" value={specificDate} onChange={event => setSpecificDate(event.target.value)} className={inputClass} />
            </div>
          )}

          <div className="flex flex-col justify-end gap-1.5">
            <input type="file" ref={fileInputRef} onChange={handleHistoricalUpload} className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff,.docx,.xls,.xlsx,.csv,.txt,image/*,application/pdf" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="cursor-pointer bg-[#00E5FF] text-[#0B0E14] font-bold px-6 py-3 rounded-[32px] text-sm flex items-center justify-center gap-2 disabled:opacity-50 h-[46px]">
              {isImporting ? <Loader className="animate-spin" size={16} /> : <Upload size={16} />}
              <span>{isImporting ? 'Reading document…' : 'Import Sales Document'}</span>
            </button>
            <p className="text-[9px] text-[#A5B4FC]/30 text-center font-mono">Scanned PDF · Image · Excel · DOCX · CSV</p>
          </div>
        </div>
      </header>

      {importResult && (
        <div className={`flex items-start gap-4 p-5 rounded-[24px] border shadow-2xl ${importResult.success ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300' : 'bg-red-950/60 border-red-500/30 text-red-300'}`}>
          {importResult.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <div className="flex-1">
            <p className="font-bold text-sm">{importResult.success ? 'Import completed' : 'Import needs attention'}</p>
            <p className="text-xs mt-1 opacity-80">{importResult.message || importResult.fileName}</p>
          </div>
          <button onClick={() => setImportResult(null)}><X size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#151A22] p-8 rounded-[32px] border border-[#00E5FF]/10 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Current-month revenue</p>
          <p className="text-4xl font-light text-[#00E5FF] mt-2">{formatPrice(monthlySales)}</p>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-[#A5B4FC]/60">
            {monthlyGrowth === null ? 'No prior-month baseline' : <>{monthlyGrowth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {monthlyGrowth.toFixed(1)}% vs prior month</>}
          </div>
        </div>
        <div className="bg-[#151A22] p-8 rounded-[32px] border border-[#00E5FF]/10 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Order pipeline</p>
          <p className="text-4xl font-light text-[#00E5FF] mt-2">{activeOrders} Active</p>
          <div className="mt-4 flex items-center gap-2 text-amber-500 text-xs font-bold"><Clock size={14} /> {awaitingProduction} awaiting production</div>
        </div>
        <div className="bg-[#151A22] p-8 rounded-[32px] border border-[#00E5FF]/10 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Pending collections</p>
          <p className="text-4xl font-light text-[#00E5FF] mt-2">{formatPrice(pendingPayments)}</p>
          <div className="mt-4 flex items-center gap-2 text-red-500 text-xs font-bold"><AlertCircle size={14} /> {overdueCheques} overdue cheque{overdueCheques === 1 ? '' : 's'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm">
          <h3 className="serif text-2xl mb-6">Daily Sales Trend</h3>
          {dailyData.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2937" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#00E5FF' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#00E5FF' }} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #1F2937', backgroundColor: '#0B0E14', color: '#E0E7FF' }} />
                  <Line type="monotone" dataKey="value" stroke="#FF0055" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="py-24 text-center text-sm text-[#A5B4FC]/40">No sales have been recorded.</p>}
        </div>

        <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm">
          <h3 className="serif text-2xl mb-6">Order Pipeline Status</h3>
          <div className="space-y-4">
            {(['Pending', 'Processing', 'Roasting', 'Grinding', 'Packaging', 'Ready for Dispatch', 'Out for Delivery'] as OrderStatus[]).map(status => {
              const count = orders.filter(order => order.status === status).length;
              const percentage = orders.length ? (count / orders.length) * 100 : 0;
              return (
                <div key={status} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-[#00E5FF]/60"><span>{status}</span><span>{count}</span></div>
                  <div className="h-2 bg-[#0B0E14] rounded-full overflow-hidden"><div className="h-full bg-[#FF0055]" style={{ width: `${percentage}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm">
          <h3 className="serif text-2xl mb-6 flex items-center gap-2"><TrendingUp className="text-[#00E5FF]" /> Company Sales Ranking</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="text-[10px] uppercase tracking-widest text-[#00E5FF]/40 border-b border-[#00E5FF]/10"><th className="pb-4">Rank</th><th className="pb-4">Company</th><th className="pb-4 text-right">Sales</th></tr></thead>
              <tbody>
                {companyRankings.slice(0, 10).map((company, index) => <tr key={company.name} className="border-b border-[#00E5FF]/5"><td className="py-4 text-xs">{index + 1}</td><td className="py-4 font-bold">{company.name}</td><td className="py-4 text-right text-[#00E5FF]">{formatPrice(company.total)}</td></tr>)}
                {!companyRankings.length && <tr><td colSpan={3} className="py-10 text-center text-sm text-[#A5B4FC]/40">No customer sales data.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm">
          <h3 className="serif text-2xl mb-6">Document Import History</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
            {salesImports.slice(0, 12).map(item => (
              <div key={item.id} className="p-4 bg-[#0B0E14] rounded-2xl border border-[#00E5FF]/5 flex items-center justify-between gap-4">
                <div className="min-w-0"><p className="text-sm font-bold truncate">{item.sourceFileName || 'Unnamed file'}</p><p className="text-[10px] text-[#A5B4FC]/40">{new Date(item.updatedAt).toLocaleString()} {item.orderId ? `· ${item.orderId}` : ''}</p></div>
                <span className={`text-[9px] uppercase font-bold px-3 py-1 rounded-full ${item.status === 'Imported' ? 'bg-emerald-500/10 text-emerald-400' : item.status === 'Failed' || item.status === 'Duplicate' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{item.status}</span>
              </div>
            ))}
            {!salesImports.length && <p className="py-10 text-center text-sm text-[#A5B4FC]/40">No documents have been processed.</p>}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {review && (
          <div className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto my-8 bg-[#151A22] border border-[#00E5FF]/20 rounded-[40px] p-6 md:p-10 shadow-2xl">
              <div className="flex justify-between items-start gap-4 mb-8">
                <div><h3 className="serif text-3xl">Review Extracted Sale</h3><p className="text-xs text-[#A5B4FC]/50 mt-1">Nothing is saved until you confirm. Correct unclear scanned values here.</p></div>
                <button onClick={() => setReview(null)} className="p-2 rounded-full bg-[#0B0E14]"><X size={20} /></button>
              </div>

              {(review.document.warnings || []).length > 0 && (
                <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
                  {(review.document.warnings || []).map((warning, index) => <p key={index}>• {warning}</p>)}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="space-y-1"><span className="text-[10px] uppercase font-bold text-[#A5B4FC]/50">Customer name *</span><input className={inputClass} value={review.document.customerName} onChange={event => updateDocument('customerName', event.target.value)} /></label>
                <label className="space-y-1"><span className="text-[10px] uppercase font-bold text-[#A5B4FC]/50">TIN</span><input className={inputClass} value={review.document.customerTin || ''} onChange={event => updateDocument('customerTin', event.target.value)} /></label>
                <label className="space-y-1"><span className="text-[10px] uppercase font-bold text-[#A5B4FC]/50">Account number</span><input className={inputClass} value={review.document.accountNumber || ''} onChange={event => updateDocument('accountNumber', event.target.value)} /></label>
                <label className="space-y-1"><span className="text-[10px] uppercase font-bold text-[#A5B4FC]/50">Email</span><input type="email" className={inputClass} value={review.document.customerEmail || ''} onChange={event => updateDocument('customerEmail', event.target.value)} /></label>
                <label className="space-y-1"><span className="text-[10px] uppercase font-bold text-[#A5B4FC]/50">Phone</span><input className={inputClass} value={review.document.customerPhone || ''} onChange={event => updateDocument('customerPhone', event.target.value)} /></label>
                <label className="space-y-1"><span className="text-[10px] uppercase font-bold text-[#A5B4FC]/50">Address</span><input className={inputClass} value={review.document.customerAddress || ''} onChange={event => updateDocument('customerAddress', event.target.value)} /></label>
                <label className="space-y-1"><span className="text-[10px] uppercase font-bold text-[#A5B4FC]/50">Date and time *</span><input type="datetime-local" className={inputClass} value={review.document.transactionDate ? new Date(new Date(review.document.transactionDate).getTime() - new Date(review.document.transactionDate).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} onChange={event => updateDocument('transactionDate', event.target.value ? new Date(event.target.value).toISOString() : '')} /></label>
                <label className="space-y-1"><span className="text-[10px] uppercase font-bold text-[#A5B4FC]/50">Reference</span><input className={inputClass} value={review.document.referenceNumber || ''} onChange={event => updateDocument('referenceNumber', event.target.value)} /></label>
                <label className="space-y-1"><span className="text-[10px] uppercase font-bold text-[#A5B4FC]/50">FS number</span><input className={inputClass} value={review.document.fsNumber || ''} onChange={event => updateDocument('fsNumber', event.target.value)} /></label>
                <label className="space-y-1"><span className="text-[10px] uppercase font-bold text-[#A5B4FC]/50">Station</span><input className={inputClass} value={review.document.station || ''} onChange={event => updateDocument('station', event.target.value)} /></label>
                <label className="space-y-1"><span className="text-[10px] uppercase font-bold text-[#A5B4FC]/50">Store</span><input className={inputClass} value={review.document.store || ''} onChange={event => updateDocument('store', event.target.value)} /></label>
                <label className="space-y-1"><span className="text-[10px] uppercase font-bold text-[#A5B4FC]/50">Payment method *</span><select className={inputClass} value={review.document.paymentMethod} onChange={event => updateDocument('paymentMethod', event.target.value as PaymentRecord['method'])}>{['Unknown', 'Cash', 'Cheque', 'Card', 'Telebirr', 'M-Pesa', 'Wallet'].map(method => <option key={method}>{method}</option>)}</select></label>
                <label className="space-y-1"><span className="text-[10px] uppercase font-bold text-[#A5B4FC]/50">Branch</span><select className={inputClass} value={review.branchId || ''} onChange={event => setReview(current => current ? { ...current, branchId: event.target.value || undefined } : current)}><option value="">Not matched</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
                <label className="space-y-1"><span className="text-[10px] uppercase font-bold text-[#A5B4FC]/50">Document type</span><input className={inputClass} value={review.document.documentType || ''} onChange={event => updateDocument('documentType', event.target.value)} /></label>
              </div>

              <div className="mt-8 overflow-x-auto">
                <div className="flex justify-between items-center mb-3"><h4 className="font-bold">Sales lines</h4><button onClick={addLine} className="text-xs font-bold text-[#00E5FF] flex items-center gap-1"><Plus size={14} /> Add line</button></div>
                <table className="w-full min-w-[900px] text-left">
                  <thead><tr className="text-[9px] uppercase text-[#A5B4FC]/50"><th className="p-2">ID</th><th className="p-2">Description *</th><th className="p-2">Unit</th><th className="p-2">Qty *</th><th className="p-2">Unit price</th><th className="p-2">Line total</th><th className="p-2">Category</th><th /></tr></thead>
                  <tbody>{review.document.lineItems.map((line, index) => <tr key={`${line.id}-${index}`} className="border-t border-[#00E5FF]/5"><td className="p-2"><input className={inputClass} value={line.id} onChange={event => updateLine(index, 'id', event.target.value)} /></td><td className="p-2"><input className={inputClass} value={line.description} onChange={event => updateLine(index, 'description', event.target.value)} /></td><td className="p-2"><input className={inputClass} value={line.unit || ''} onChange={event => updateLine(index, 'unit', event.target.value)} /></td><td className="p-2"><input type="number" step="any" min="0" className={inputClass} value={line.quantity} onChange={event => updateLine(index, 'quantity', Number(event.target.value))} /></td><td className="p-2"><input type="number" step="any" min="0" className={inputClass} value={line.unitPrice} onChange={event => updateLine(index, 'unitPrice', Number(event.target.value))} /></td><td className="p-2"><input type="number" step="any" min="0" className={inputClass} value={line.lineTotal} onChange={event => updateLine(index, 'lineTotal', Number(event.target.value))} /></td><td className="p-2"><select className={inputClass} value={line.category} onChange={event => updateLine(index, 'category', event.target.value)}>{['Whole Bean', 'Ground', 'Beverage', 'Food', 'Merchandise', 'Bundle', 'Unclassified'].map(category => <option key={category}>{category}</option>)}</select></td><td className="p-2"><button onClick={() => removeLine(index)} className="p-2 text-red-400"><Trash2 size={16} /></button></td></tr>)}</tbody>
                </table>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4 md:items-end">
                <label className="space-y-1"><span className="text-[10px] uppercase font-bold text-[#A5B4FC]/50">Currency</span><input className={inputClass} value={review.document.currency || 'ETB'} onChange={event => updateDocument('currency', event.target.value)} /></label>
                <label className="space-y-1"><span className="text-[10px] uppercase font-bold text-[#A5B4FC]/50">Subtotal</span><input type="number" step="any" className={inputClass} value={review.document.subtotal} onChange={event => updateDocument('subtotal', Number(event.target.value))} /></label>
                <label className="space-y-1"><span className="text-[10px] uppercase font-bold text-[#A5B4FC]/50">VAT</span><input type="number" step="any" className={inputClass} value={review.document.vat} onChange={event => { const vat = Number(event.target.value); setReview(current => current ? { ...current, document: { ...current.document, vat, grandTotal: Number((Number(current.document.subtotal || 0) + vat).toFixed(2)) } } : current); }} /></label>
                <label className="space-y-1"><span className="text-[10px] uppercase font-bold text-[#A5B4FC]/50">Grand total *</span><input type="number" step="any" className={inputClass} value={review.document.grandTotal} onChange={event => updateDocument('grandTotal', Number(event.target.value))} /></label>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3"><button onClick={() => setReview(null)} className="px-6 py-3 rounded-2xl bg-[#0B0E14] font-bold">Cancel</button><button onClick={confirmImport} disabled={isConfirming} className="px-8 py-3 rounded-2xl bg-[#00E5FF] text-[#0B0E14] font-bold flex items-center justify-center gap-2 disabled:opacity-50">{isConfirming ? <Loader className="animate-spin" size={16} /> : <CheckCircle size={16} />} Confirm and save to Supabase</button></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProformaInvoicePage = ({ coffees }: { coffees: Coffee[] }) => {
  const { formatPrice, currency } = React.useContext(CurrencyContext);
  const [items, setItems] = useState<CartItem[]>([]);

  const addToProforma = (coffee: Coffee) => {
    setItems(prev => {
      const existing = prev.find(item => item.id === coffee.id);
      if (existing) {
        return prev.map(item => item.id === coffee.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...coffee, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, q: number) => {
    if (q < 1) {
      setItems(prev => prev.filter(item => item.id !== id));
    } else {
      setItems(prev => prev.map(item => item.id === id ? { ...item, quantity: q } : item));
    }
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotal = total / 1.15; // Assuming price includes 15% VAT, let's decouple
  const vat = total - subtotal;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('proforma-invoice-element');
    if (!element) return;
    try {
      const dataUrl = await toPng(element, { quality: 0.95 });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Proforma_${today.replace(/\//g, '-')}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF", err);
    }
  };

  const today = new Date().toLocaleDateString('en-GB');
  const [quotationNumber] = useState(() => `PF-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}`);

  return (
    <div className="space-y-8 animate-fade-in print:p-0 print:bg-white print:text-black">
      {/* Actions & Product Selection (hidden in print mode) */}
      <div className="flex flex-col md:flex-row gap-6 print:hidden items-stretch">
        {/* Product Selection */}
        <div className="flex-1 bg-[#151A22] rounded-[32px] p-6 border border-[#00E5FF]/10 flex flex-col justify-center">
          <h2 className="text-lg font-bold text-[#E0E7FF] mb-4 flex items-center gap-2">
            <CoffeeIcon className="text-[#00E5FF]" size={20} /> Add Items to Proforma
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
            {coffees.map(coffee => (
              <div key={coffee.id} className="min-w-[180px] flex-shrink-0 flex items-center justify-between p-3 bg-[#0B0E14] rounded-2xl border border-[#00E5FF]/5">
                <div>
                  <h3 className="font-bold text-sm text-[#E0E7FF]">{coffee.name}</h3>
                  <p className="text-xs text-[#A5B4FC]/60">{formatPrice(coffee.price)}</p>
                </div>
                <button 
                  onClick={() => addToProforma(coffee)}
                  className="p-2 bg-[#00E5FF]/10 text-[#00E5FF] rounded-xl hover:bg-[#00E5FF] hover:text-[#0B0E14] transition-all"
                >
                  <Plus size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="w-full md:w-64 flex flex-col justify-center gap-3 bg-[#151A22] rounded-[32px] p-6 border border-[#00E5FF]/10">
          <button onClick={handlePrint} className="w-full py-3 h-[50px] bg-[#151A22] text-[#E0E7FF] border border-[#00E5FF]/20 rounded-xl font-bold uppercase tracking-widest hover:border-[#00E5FF] hover:bg-[#00E5FF]/10 transition-all flex items-center justify-center gap-2 text-sm">
            <Upload size={16} /> Print
          </button>
          <button onClick={handleDownloadPDF} className="w-full py-3 h-[50px] bg-[#00E5FF] text-[#0B0E14] rounded-xl font-bold uppercase tracking-widest hover:bg-[#00B3CC] transition-all flex items-center justify-center gap-2 text-sm">
            <Download size={16} /> Download
          </button>
        </div>
      </div>

        {/* Printable Area */}
      <div id="proforma-invoice-element" className="bg-white text-black mx-auto w-full max-w-[850px] border border-transparent print:border-none p-4 md:p-8 font-serif">
        <h1 className="text-center font-bold text-2xl mb-2 uppercase tracking-tight font-sans">PROFORMA INVOICE</h1>

        <table className="w-full border-collapse border-2 border-black text-xs leading-snug">
          <colgroup>
            <col className="w-[45%]" />
            <col className="w-[20%]" />
            <col className="w-[15%]" />
            <col className="w-[20%]" />
          </colgroup>
          <tbody>
            {/* Row 1 */}
            <tr>
              <td colSpan={2} className="border border-black bg-[#e5e7eb] p-1 font-bold">References:</td>
              <td colSpan={2} className="border border-black bg-[#e5e7eb] p-1 font-bold">Contact Address:</td>
            </tr>
            <tr>
              <td colSpan={2} className="border border-black p-2 align-top outline-none focus:bg-[#f8fafc] transition-colors" contentEditable suppressContentEditableWarning>
                <div className="font-bold">TO.MO.CA. COFEE PLC</div>
                <div className="font-bold mt-1">Quotation number: {quotationNumber}</div>
                <div className="font-bold text-xl mt-1">Date: {today}</div>
                <div className="font-bold text-lg mt-1 tracking-tight text-gray-400">Enter buyer name</div>
              </td>
              <td colSpan={2} className="border border-black p-2 align-top leading-tight outline-none focus:bg-[#f8fafc] transition-colors" contentEditable suppressContentEditableWarning>
                <div className="font-bold">Telephone Number(s)</div>
                <div className="mt-1"><span className="font-bold">Off:</span> 251-11-1689279</div>
                <div><span className="font-bold">Fax:</span> 251-11-16894059</div>
                <div><span className="font-bold">Mobile:</span> +251-9 91 27 20 10</div>
                <div><span className="font-bold">Mobile:</span> 0924299301</div>
                <div><span className="font-bold">E-mail:</span> info@tomocacoffee.com</div>
              </td>
            </tr>

            {/* Row 3 */}
            <tr>
              <td className="border border-black bg-[#e5e7eb] p-1 font-bold">Seller Name and Address:</td>
              <td className="border border-black bg-[#e5e7eb] p-1 font-bold">Buyer Name and Address:</td>
              <td colSpan={2} className="border border-black bg-[#e5e7eb] p-1 font-bold">Ship to Address:</td>
            </tr>
            
            {/* Row 4 */}
            <tr>
              <td className="border border-black p-2 align-top leading-tight outline-none focus:bg-[#f8fafc] transition-colors" contentEditable suppressContentEditableWarning>
                <div>TO.MO.CA. COFFEE PLC</div>
                <div>Wavell street, House No. 858/3</div>
                <div>Addis Ababa, Ethiopia</div>
                <div>P.O.Box: 24615</div>
                <div><span className="font-bold">Off:</span> 251-11-1689279</div>
                <div><span className="font-bold">Fax:</span> 251-11-16894059</div>
                <div>E-mail: tomoca@ethionet.et</div>
              </td>
              <td className="border border-black p-2 align-top outline-none focus:bg-[#f8fafc] transition-colors" contentEditable suppressContentEditableWarning>
                <div className="font-bold text-lg leading-none mb-2 text-gray-400">Enter buyer name</div>
                <div className="text-sm text-gray-400">Enter buyer address</div>
              </td>
              <td colSpan={2} className="border border-black p-2 align-top outline-none focus:bg-[#f8fafc] transition-colors" contentEditable suppressContentEditableWarning>
                <div className="font-bold text-lg leading-none mb-2 text-gray-400">Enter buyer name</div>
                <div className="text-sm text-gray-400">Enter buyer address</div>
              </td>
            </tr>

            {/* Row 5 */}
            <tr>
              <td className="border border-black bg-[#e5e7eb] p-1 font-bold">Conditions of Sale and Terms of Payment:</td>
              <td className="border border-black bg-[#e5e7eb] p-1 font-bold">Transportation method:</td>
              <td colSpan={2} rowSpan={2} className="border border-black p-2 align-top text-xs outline-none focus:bg-[#f8fafc] transition-colors" contentEditable suppressContentEditableWarning>
                <div><span className="font-bold">Country of Origin:</span> Ethiopia</div>
                <div className="font-bold mt-2">Total Number of Packages:</div>
                <div className="font-bold mt-2">Total Net Weight (kgs):</div>
                <div className="font-bold mt-2">Total Gross Weight (kgs):</div>
              </td>
            </tr>

            {/* Row 6 */}
            <tr>
              <td className="border border-black p-2 align-top pb-6 outline-none focus:bg-[#f8fafc] transition-colors" contentEditable suppressContentEditableWarning>
                <div className="font-bold">Title Transfer Occurs At:</div>
                <div>TO.MO.CA. warehouse: <span className="inline-block w-8 border-b border-black"></span></div>
                <div>Customer warehouse: <span className="inline-block w-8 border-b border-black"></span></div>
                <div className="font-bold mt-4">Payment Terms:</div>
                <div>Cash <span className="inline-block w-6 border-b border-black"></span> Credit X</div>
              </td>
              <td className="border border-black p-2 align-top outline-none focus:bg-[#f8fafc] transition-colors" contentEditable suppressContentEditableWarning>
              </td>
            </tr>
            
            {/* Row 7 - Items header */}
            <tr>
              <td className="border border-black bg-[#e5e7eb] p-1 font-bold">Item Number, Product Description</td>
              <td className="border border-black bg-[#e5e7eb] p-1 font-bold text-center">Quantity</td>
              <td className="border border-black bg-[#e5e7eb] p-1 font-bold text-center">Unit Price<br/>ETB</td>
              <td className="border border-black bg-[#e5e7eb] p-1 font-bold text-center">Total Price<br/>ETB</td>
            </tr>

            {/* Row 8 - Items content */}
            <tr>
              <td className="border border-black p-3 align-top min-h-[200px] h-[250px] outline-none focus:bg-[#f8fafc] transition-colors" contentEditable suppressContentEditableWarning>
                 {items.length === 0 && <div className="text-[#a5b4fc] italic">No items</div>}
                 {items.map(item => (
                    <div key={item.id} className="mb-6">
                       <div><span className="underline">{item.quantity * 1000}gm</span> {item.name} in Dark or Medium Roast</div>
                       <ul className="list-disc pl-6 mt-2 ml-4 flex flex-col items-start text-xs">
                         <li className="pl-1">Premium Roasted coffee Beans or Ground in Dark or Medium Roast Packed in 500gr or 250gr High quality food valve standard Pouch.</li>
                       </ul>
                    </div>
                 ))}
              </td>
              <td className="border border-black align-top outline-none focus:bg-[#f8fafc] transition-colors" contentEditable suppressContentEditableWarning>
                  <div className="flex flex-col pt-3">
                  {items.map((item, idx) => (
                     <div key={idx} className="mb-6 mt-1 text-center font-serif">{item.quantity * 1000}gr</div>
                  ))}
                  </div>
              </td>
              <td className="border border-black align-top outline-none focus:bg-[#f8fafc] transition-colors" contentEditable suppressContentEditableWarning>
                 <div className="flex flex-col pt-3">
                  {items.map((item, idx) => (
                     <div key={idx} className="mb-6 mt-1 text-center font-serif">{(item.price).toFixed(2)}</div>
                  ))}
                 </div>
              </td>
              <td className="border border-black align-top relative outline-none focus:bg-[#f8fafc] transition-colors" contentEditable suppressContentEditableWarning>
                <div className="flex flex-col pt-3">
                   {items.map((item, idx) => (
                     <div key={idx} className="mb-6 mt-1 text-right pr-4 font-serif">{(item.price * item.quantity).toFixed(2)}</div>
                   ))}
                </div>
              </td>
            </tr>

            {/* Subtotals */}
            <tr>
              <td colSpan={3} className="border border-black bg-[#e5e7eb] p-1 font-bold text-right pr-4">SUBTOTAL</td>
              <td className="border border-black p-1 text-right pr-4 font-serif outline-none focus:bg-[#f8fafc] transition-colors" contentEditable suppressContentEditableWarning>{subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="border border-black bg-[#e5e7eb] p-1 font-bold text-right pr-4">VAT (15%)</td>
              <td className="border border-black p-1 text-right pr-4 font-serif outline-none focus:bg-[#f8fafc] transition-colors" contentEditable suppressContentEditableWarning>{vat.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="border border-black bg-[#e5e7eb] p-1 font-bold text-right pr-4">TOTAL</td>
              <td className="border border-black p-1 text-right pr-4 font-serif outline-none focus:bg-[#f8fafc] transition-colors" contentEditable suppressContentEditableWarning>{total.toFixed(2)}</td>
            </tr>

            {/* Amount in words */}
            <tr>
              <td colSpan={4} className="border border-black p-2 font-bold outline-none focus:bg-[#f8fafc] transition-colors" contentEditable suppressContentEditableWarning>
                 Price in Letter <span className="font-normal italic ml-1">________________________________________________ birr only</span>
              </td>
            </tr>
            
            {/* Notes */}
            <tr>
              <td colSpan={4} className="border border-black p-2 align-top outline-none focus:bg-[#f8fafc] transition-colors" contentEditable suppressContentEditableWarning>
                 <div className="font-bold underline mb-1">Notes:</div>
                 <ul className="list-disc pl-5 ml-4 space-y-0.5">
                   <li>This Proforma is valid only for 30 days.</li>
                   <li>For Bulk Delivery (Above 30Kg 48 hours) a PO must be sent by fax or email.</li>
                   <li>Lead Time for a delivery order is 5 Days</li>
                   <li>Weekly deliveries are free of charge</li>
                 </ul>
              </td>
            </tr>
            <tr>
              <td colSpan={2} className="border border-black p-3 font-bold align-top outline-none focus:bg-[#f8fafc] transition-colors" contentEditable suppressContentEditableWarning>
                Authorized Name & Signature: KIRUBEL SEYOUM
              </td>
              <td colSpan={2} className="border border-black p-3 font-bold align-middle outline-none focus:bg-[#f8fafc] transition-colors" contentEditable suppressContentEditableWarning>
                Company: <span className="font-normal">TO.MO.CACOFFEE PLC</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const OrderCreation = ({ addToCart, removeFromCart, updateCartQuantity, placeOrder, cart, coffees }: { addToCart: (c: Coffee) => void, removeFromCart: (id: string) => void, updateCartQuantity: (id: string, q: number) => void, placeOrder: (customer: any) => void, cart: CartItem[], coffees: Coffee[] }) => {
  const { formatPrice } = React.useContext(CurrencyContext);
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    type: 'Delivery' as 'Pickup' | 'Delivery',
    paymentMethod: 'Telebirr' as any,
    bank: '',
    chequeNumber: '',
    dueDate: '',
    receiptNumber: ''
  });

  const [errors, setErrors] = useState<any>({});
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          resolve(content.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const token = await getSupabaseAccessToken();
      const res = await fetch(apiUrl('/api/parse-receipt'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fileData: base64Data, mimeType: file.type, paymentMethod: customer.paymentMethod })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'The document could not be parsed.');
      setCustomer(prev => ({ 
        ...prev, 
        receiptNumber: data.receiptNumber || prev.receiptNumber,
        chequeNumber: data.chequeNumber || prev.chequeNumber,
        bank: data.bank || prev.bank,
        dueDate: data.dueDate || prev.dueDate
      }));
    } catch (error) {
      console.error("Failed to parse document", error);
    } finally {
      setIsUploading(false);
    }
  };

  const validate = () => {
    const newErrors: any = {};
    if (!customer.name) newErrors.name = 'Name is required';
    if (!customer.email) newErrors.email = 'Email is required';
    if (!customer.address) newErrors.address = 'Address is required';
    if (['Telebirr', 'M-Pesa'].includes(customer.paymentMethod)) {
      if (!customer.receiptNumber) newErrors.receiptNumber = 'Receipt number is required';
    }
    if (customer.paymentMethod === 'Cheque') {
      if (!customer.bank) newErrors.bank = 'Bank is required';
      if (!customer.chequeNumber) newErrors.chequeNumber = 'Cheque number is required';
      if (!customer.dueDate) newErrors.dueDate = 'Due date is required';
    }
    if (cart.length === 0) newErrors.cart = 'Basket is empty';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceOrder = () => {
    if (validate()) {
      placeOrder(customer);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-fade-in">
      <div className="space-y-8">
        <header>
          <h2 className="serif text-4xl font-light">New Order</h2>
          <p className="text-sm text-[#A5B4FC]/60 mt-2">Comprehensive order entry with SKU management.</p>
        </header>

        <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm space-y-6">
          <h3 className="serif text-2xl">Customer Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Full Name *</label>
              <input 
                type="text" 
                value={customer.name}
                onChange={e => setCustomer({...customer, name: e.target.value})}
                className={cn("w-full px-4 py-3 bg-[#0B0E14] rounded-xl border focus:outline-none transition-all text-sm", errors.name ? "border-red-500" : "border-[#00E5FF]/10 focus:border-[#00E5FF]")}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Email *</label>
              <input 
                type="email" 
                value={customer.email}
                onChange={e => setCustomer({...customer, email: e.target.value})}
                className={cn("w-full px-4 py-3 bg-[#0B0E14] rounded-xl border focus:outline-none transition-all text-sm", errors.email ? "border-red-500" : "border-[#00E5FF]/10 focus:border-[#00E5FF]")}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Phone</label>
              <input 
                type="tel" 
                value={customer.phone}
                onChange={e => setCustomer({...customer, phone: e.target.value})}
                className="w-full px-4 py-3 bg-[#0B0E14] rounded-xl border border-[#00E5FF]/10 focus:border-[#00E5FF] focus:outline-none transition-all text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Order Type</label>
              <select 
                value={customer.type}
                onChange={e => setCustomer({...customer, type: e.target.value as any})}
                className="w-full px-4 py-3 bg-[#0B0E14] rounded-xl border border-[#00E5FF]/10 focus:border-[#00E5FF] focus:outline-none transition-all text-sm"
              >
                <option value="Delivery">Delivery</option>
                <option value="Pickup">Pickup</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Delivery Address *</label>
            <textarea 
              value={customer.address}
              onChange={e => setCustomer({...customer, address: e.target.value})}
              className={cn("w-full px-4 py-3 bg-[#0B0E14] rounded-xl border focus:outline-none transition-all text-sm h-24", errors.address ? "border-red-500" : "border-[#00E5FF]/10 focus:border-[#00E5FF]")}
            />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {['Telebirr', 'M-Pesa', 'Cheque'].map(m => (
                <button 
                  key={m}
                  onClick={() => setCustomer({...customer, paymentMethod: m as any})}
                  className={cn("py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border", customer.paymentMethod === m ? "bg-[#FF0055] text-[#E0E7FF] border-[#00E5FF]" : "bg-[#151A22] text-[#00E5FF] border-[#00E5FF]/10")}
                >
                  {m}
                </button>
              ))}
            </div>
            
            {['Telebirr', 'M-Pesa'].includes(customer.paymentMethod) && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-4 border-t border-[#00E5FF]/5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Receipt / Transaction Number *</label>
                    <label className={cn("text-[10px] cursor-pointer uppercase tracking-widest font-bold flex items-center gap-1 transition-all", isUploading ? "text-[#00E5FF]/40" : "text-[#00E5FF] hover:text-[#FF0055]")}>
                      {isUploading ? <><Loader className="animate-spin" size={12} /> Parsing AI...</> : <><Upload size={12} /> Auto-fill with AI</>}
                      <input type="file" accept="image/*,application/pdf,text/csv" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                    </label>
                  </div>
                  <input 
                    type="text" 
                    value={customer.receiptNumber}
                    placeholder="Enter manually or upload receipt"
                    onChange={e => setCustomer({...customer, receiptNumber: e.target.value})}
                    className={cn("w-full px-4 py-3 bg-[#0B0E14] rounded-xl border focus:outline-none transition-all text-sm text-[#E0E7FF]", errors.receiptNumber ? "border-red-500" : "border-[#00E5FF]/10 focus:border-[#00E5FF]")}
                  />
                </div>
              </motion.div>
            )}
            
            {customer.paymentMethod === 'Cheque' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-4 border-t border-[#00E5FF]/5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Cheque Details</h4>
                  <label className={cn("text-[10px] cursor-pointer uppercase tracking-widest font-bold flex items-center gap-1 transition-all", isUploading ? "text-[#00E5FF]/40" : "text-[#00E5FF] hover:text-[#FF0055]")}>
                    {isUploading ? <><Loader className="animate-spin" size={12} /> Parsing AI...</> : <><Upload size={12} /> Auto-fill with AI</>}
                    <input type="file" accept="image/*,application/pdf,text/csv" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Bank *</label>
                    <input 
                      type="text" 
                      value={customer.bank}
                      onChange={e => setCustomer({...customer, bank: e.target.value})}
                      className={cn("w-full px-4 py-3 bg-[#0B0E14] rounded-xl border focus:outline-none transition-all text-sm", errors.bank ? "border-red-500" : "border-[#00E5FF]/10 focus:border-[#00E5FF]")}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Cheque # *</label>
                    <input 
                      type="text" 
                      value={customer.chequeNumber}
                      onChange={e => setCustomer({...customer, chequeNumber: e.target.value})}
                      className={cn("w-full px-4 py-3 bg-[#0B0E14] rounded-xl border focus:outline-none transition-all text-sm", errors.chequeNumber ? "border-red-500" : "border-[#00E5FF]/10 focus:border-[#00E5FF]")}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Due Date *</label>
                    <input 
                      type="date" 
                      value={customer.dueDate}
                      onChange={e => setCustomer({...customer, dueDate: e.target.value})}
                      className={cn("w-full px-4 py-3 bg-[#0B0E14] rounded-xl border focus:outline-none transition-all text-sm", errors.dueDate ? "border-red-500" : "border-[#00E5FF]/10 focus:border-[#00E5FF]")}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm flex flex-col h-full">
          <h3 className="serif text-2xl mb-6">SKU Management</h3>
          <div className="flex-1 overflow-y-auto space-y-4 mb-8">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-[#A5B4FC]/40 italic text-sm">No items added to SKU table.</div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40 border-b border-[#00E5FF]/5">
                    <th className="pb-4">SKU / Item</th>
                    <th className="pb-4 text-center">Qty</th>
                    <th className="pb-4 text-right">Price</th>
                    <th className="pb-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#00E5FF]/5">
                  {cart.map((item, i) => (
                    <tr key={i}>
                      <td className="py-4">
                        <p className="text-sm font-bold">{item.name}</p>
                        <p className="text-[10px] text-[#A5B4FC]/40">{item.category} • {item.roast} Roast</p>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => updateCartQuantity(item.id, Math.max(1, item.quantity - 1))} className="p-1 hover:bg-[#0B0E14] rounded-md"><Minus size={12} /></button>
                          <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateCartQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-[#0B0E14] rounded-md"><Plus size={12} /></button>
                        </div>
                      </td>
                      <td className="py-4 text-right text-sm font-bold">{formatPrice(item.price * item.quantity)}</td>
                      <td className="py-4 text-right">
                        <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          <div className="pt-6 border-t border-[#00E5FF]/10 space-y-4">
            <div className="flex justify-between text-2xl serif">
              <span>Total Amount</span>
              <span>{formatPrice(cart.reduce((s, i) => s + i.price * i.quantity, 0) + (customer.type === 'Delivery' ? 2.5 : 0))}</span>
            </div>
            {errors.cart && <p className="text-xs text-red-500 font-bold">{errors.cart}</p>}
            <button 
              onClick={handlePlaceOrder}
              className="w-full py-4 bg-[#FF0055] text-[#E0E7FF] rounded-full font-bold shadow-xl shadow-[#FF0055]/20 hover:bg-[#FF0055]/80 transition-all"
            >
              Confirm & Place Order
            </button>
          </div>
        </div>

        <div className="bg-[#0B0E14] p-6 rounded-[32px] border border-[#00E5FF]/5">
          <h4 className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40 mb-4">Quick Add SKUs</h4>
          <div className="grid grid-cols-2 gap-2">
            {coffees.slice(0, 4).map(c => (
              <button 
                key={c.id} 
                onClick={() => addToCart(c)}
                className="p-3 bg-[#151A22] rounded-xl border border-[#00E5FF]/10 text-left hover:border-[#00E5FF] transition-all"
              >
                <p className="text-[10px] font-bold truncate">{c.name}</p>
                <p className="text-[8px] text-[#00E5FF] font-bold">ETB {c.price.toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentTracking = ({ payments, updateStatus }: { payments: PaymentRecord[], updateStatus: (id: string, status: any) => void }) => {
  const { formatPrice } = React.useContext(CurrencyContext);
  const [groupBy, setGroupBy] = useState<'bank' | 'customer' | 'dueDate'>('bank');

  const aggregated = useMemo(() => {
    const groups: { [key: string]: PaymentRecord[] } = {};
    payments.forEach(p => {
      const key = groupBy === 'bank' ? (p.bank || 'Unspecified Bank') : 
                  groupBy === 'customer' ? p.customerName : 
                  (p.dueDate || 'No Due Date');
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return groups;
  }, [payments, groupBy]);

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="serif text-4xl font-light">Payment Tracking</h2>
          <p className="text-sm text-[#A5B4FC]/60 mt-2">Cheque aggregation and collection management.</p>
        </div>
        <div className="flex gap-2 p-1 bg-[#151A22] rounded-full border border-[#00E5FF]/10">
          {(['bank', 'customer', 'dueDate'] as const).map(g => (
            <button 
              key={g} 
              onClick={() => setGroupBy(g)}
              className={cn("px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all", groupBy === g ? "bg-[#FF0055] text-[#E0E7FF]" : "text-[#00E5FF]/40 hover:text-[#00E5FF]")}
            >
              By {g}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-6">
        {Object.entries(aggregated).map(([group, items]: [string, PaymentRecord[]]) => (
          <div key={group} className="bg-[#151A22] rounded-[32px] border border-[#00E5FF]/10 overflow-hidden shadow-sm">
            <div className="bg-[#0B0E14] px-8 py-4 flex justify-between items-center border-b border-[#00E5FF]/10">
              <h3 className="serif text-xl">{group}</h3>
              <p className="text-sm font-bold text-[#00E5FF]">{items.length} Cheques • {formatPrice(items.reduce((s: number, i: PaymentRecord) => s + i.amount, 0))}</p>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40 border-b border-[#00E5FF]/5">
                  <th className="p-6">Cheque #</th>
                  <th className="p-6">Customer</th>
                  <th className="p-6">Due Date</th>
                  <th className="p-6">Amount</th>
                  <th className="p-6">Status</th>
                  <th className="p-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#00E5FF]/5">
                {items.map((p: PaymentRecord) => (
                  <tr key={p.id} className="hover:bg-[#0B0E14]/30 transition-colors">
                    <td className="p-6 text-sm font-bold">{p.chequeNumber || 'N/A'}</td>
                    <td className="p-6 text-sm">{p.customerName}</td>
                    <td className="p-6 text-sm">{p.dueDate || 'N/A'}</td>
                    <td className="p-6 text-sm font-bold">{formatPrice(p.amount)}</td>
                    <td className="p-6">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        p.status === 'Cleared' ? "bg-emerald-100 text-emerald-700" : p.status === 'Bounced' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-6">
                      {p.status === 'Pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => updateStatus(p.id, 'Cleared')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-[#E0E7FF] transition-all"><CheckCircle2 size={14} /></button>
                          <button onClick={() => updateStatus(p.id, 'Bounced')} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-[#E0E7FF] transition-all"><X size={14} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};

const FactoryProduction = ({ tasks, updateStatus }: { tasks: ProductionTask[], updateStatus: (id: string, status: any) => void }) => {
  const statuses = ['Not Started', 'Roasting', 'Grinding', 'Packaging', 'Ready for Dispatch'] as const;

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h2 className="serif text-4xl font-light">Factory Production</h2>
        <p className="text-sm text-[#A5B4FC]/60 mt-2">SKU breakdown and real-time status management.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statuses.map(status => (
          <div key={status} className="bg-[#151A22] p-6 rounded-[32px] border border-[#00E5FF]/10 flex flex-col min-h-[500px]">
            <div className="flex justify-between items-center mb-6 border-b border-[#00E5FF]/5 pb-4">
              <h3 className="serif text-xl">{status}</h3>
              <span className="bg-[#FF0055] text-[#E0E7FF] text-[10px] font-bold px-2 py-0.5 rounded-full">
                {tasks.filter(t => t.status === status).length}
              </span>
            </div>
            <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar">
              {tasks.filter(t => t.status === status).map(task => (
                <div key={task.id} className="p-5 bg-[#0B0E14] rounded-[24px] border border-[#00E5FF]/5 space-y-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Order ID</p>
                      <p className="text-sm font-bold">{task.orderId}</p>
                    </div>
                    <p className="text-[8px] text-[#A5B4FC]/40 font-bold uppercase tracking-widest">{new Date(task.updatedAt).toLocaleTimeString()}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">SKU Breakdown</p>
                    {task.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center bg-[#151A22]/50 p-2 rounded-lg">
                        <span className="text-[10px] font-medium">{item.name}</span>
                        <span className="text-[10px] font-bold bg-[#FF0055]/10 px-2 py-0.5 rounded-full">{item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex flex-wrap gap-1">
                    {statuses.filter(s => s !== status).map(s => (
                      <button 
                        key={s} 
                        onClick={() => updateStatus(task.id, s)}
                        className="px-2 py-1 bg-[#151A22] text-[8px] font-bold uppercase tracking-widest text-[#00E5FF] rounded-lg border border-[#00E5FF]/10 hover:bg-[#FF0055] hover:text-[#E0E7FF] transition-all"
                      >
                        Move to {s.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChequeFollowUp = ({ payments, updateStatus, addNote, user }: { payments: PaymentRecord[], updateStatus: (id: string, status: any) => void, addNote: (id: string, note: any) => void, user: UserProfile }) => {
  const { formatPrice } = React.useContext(CurrencyContext);
  const [activeTab, setActiveTab] = useState<'Urgent' | 'Overdue' | 'All'>('All');
  const [search, setSearch] = useState('');
  const [bankFilter, setBankFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [noteText, setNoteText] = useState('');

  const today = new Date();

  const processedPayments = useMemo(() => {
    return payments
      .filter(p => p.method === 'Cheque')
      .map(p => {
        const dueDate = p.dueDate ? new Date(p.dueDate) : null;
        const diffDays = dueDate ? Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : -999;
        
        let priority: 'High' | 'Medium' | 'Low' = 'Low';
        if (diffDays > 7) priority = 'High';
        else if (diffDays > 0) priority = 'Medium';

        return { ...p, diffDays, priority };
      });
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return processedPayments.filter(p => {
      const matchesSearch = p.customerName.toLowerCase().includes(search.toLowerCase()) || p.chequeNumber?.includes(search);
      const matchesBank = bankFilter === 'All' || p.bank === bankFilter;
      const matchesPriority = priorityFilter === 'All' || p.priority === priorityFilter;
      
      const matchesTab = activeTab === 'All' || 
                        (activeTab === 'Overdue' && p.diffDays > 0 && p.status === 'Pending') ||
                        (activeTab === 'Urgent' && p.priority === 'High' && p.status === 'Pending');

      return matchesSearch && matchesBank && matchesPriority && matchesTab;
    });
  }, [processedPayments, search, bankFilter, priorityFilter, activeTab]);

  const stats = useMemo(() => {
    const pending = processedPayments.filter(p => p.status === 'Pending');
    return {
      total: processedPayments.length,
      pending: pending.length,
      overdue: pending.filter(p => p.diffDays > 0).length,
      highPriority: pending.filter(p => p.priority === 'High').length
    };
  }, [processedPayments]);

  const bankAggregation = useMemo(() => {
    const agg: { [key: string]: { count: number, total: number } } = {};
    processedPayments.filter(p => p.status === 'Pending').forEach(p => {
      const bank = p.bank || 'Unknown';
      if (!agg[bank]) agg[bank] = { count: 0, total: 0 };
      agg[bank].count += 1;
      agg[bank].total += p.amount;
    });
    return Object.entries(agg).sort((a, b) => b[1].total - a[1].total);
  }, [processedPayments]);

  const banks = Array.from(new Set(processedPayments.map(p => p.bank).filter(Boolean)));

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="serif text-4xl font-light">Cheque Follow-Up</h2>
          <p className="text-sm text-[#A5B4FC]/60 mt-2">Prioritized collection management and follow-up.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#151A22] p-6 rounded-[32px] border border-[#00E5FF]/10 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Total Cheques</p>
          <p className="text-3xl font-light text-[#00E5FF] mt-2">{stats.total}</p>
        </div>
        <div className="bg-[#151A22] p-6 rounded-[32px] border border-[#00E5FF]/10 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Pending Clearance</p>
          <p className="text-3xl font-light text-amber-600 mt-2">{stats.pending}</p>
        </div>
        <div className="bg-[#151A22] p-6 rounded-[32px] border border-[#00E5FF]/10 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Overdue</p>
          <p className="text-3xl font-light text-red-600 mt-2">{stats.overdue}</p>
        </div>
        <div className="bg-[#151A22] p-6 rounded-[32px] border border-[#00E5FF]/10 shadow-sm border-l-4 border-l-red-500">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">High Priority</p>
          <p className="text-3xl font-light text-red-700 mt-2">{stats.highPriority}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex p-1 bg-[#151A22] rounded-full border border-[#00E5FF]/10 w-full md:w-auto">
              {['Urgent', 'Overdue', 'All'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={cn(
                    "flex-1 md:flex-none px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                    activeTab === tab ? "bg-[#FF0055] text-[#E0E7FF]" : "text-[#00E5FF]/40 hover:text-[#00E5FF]"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00E5FF]/40" size={16} />
                <input 
                  type="text" 
                  placeholder="Search customer or cheque..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-2 bg-[#151A22] border border-[#00E5FF]/10 rounded-full text-sm focus:outline-none focus:border-[#00E5FF]/40"
                />
              </div>
              <select 
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-4 py-2 bg-[#151A22] border border-[#00E5FF]/10 rounded-full text-sm focus:outline-none"
              >
                <option value="All">All Priority</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredPayments.map(p => (
              <div key={p.id} className={cn(
                "bg-[#151A22] p-6 rounded-[32px] border transition-all hover:shadow-md",
                p.status === 'Cleared' ? "border-emerald-100 opacity-60" : 
                p.diffDays > 0 ? "border-red-100" : "border-[#00E5FF]/10"
              )}>
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1 flex gap-6">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                      p.status === 'Cleared' ? "bg-emerald-50 text-emerald-600" :
                      p.diffDays > 0 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                    )}>
                      <FileText size={20} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-lg">{p.customerName}</h4>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest",
                          p.priority === 'High' ? "bg-red-100 text-red-700" :
                          p.priority === 'Medium' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                        )}>
                          {p.priority} Priority
                        </span>
                      </div>
                      <p className="text-xs text-[#A5B4FC]/40 font-mono">
                        {p.bank} • Cheque #{p.chequeNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col md:items-end justify-center gap-1">
                    <p className="text-2xl font-light text-[#00E5FF]">{formatPrice(p.amount)}</p>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                      <Calendar size={12} className="text-[#00E5FF]/40" />
                      <span className={p.diffDays > 0 ? "text-red-600" : "text-[#00E5FF]/60"}>
                        Due {p.dueDate} {p.diffDays > 0 && `(${p.diffDays}d overdue)`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setSelectedPayment(p)}
                      className="px-4 py-2 bg-[#0B0E14] text-[#00E5FF] rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#FF0055] hover:text-[#E0E7FF] transition-all flex items-center gap-2"
                    >
                      <MessageSquare size={14} /> Follow Up
                    </button>
                    {p.status === 'Pending' && (
                      <button 
                        onClick={() => updateStatus(p.id, 'Cleared')}
                        className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-600 hover:text-[#E0E7FF] transition-all flex items-center gap-2"
                      >
                        <CheckCircle2 size={14} /> Mark Cleared
                      </button>
                    )}
                  </div>
                </div>
                
                {p.notes && p.notes.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#00E5FF]/5 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Recent Notes</p>
                    {p.notes.slice(-2).map((note, i) => (
                      <div key={i} className="flex justify-between items-start text-xs bg-[#0B0E14]/50 p-3 rounded-xl">
                        <p className="text-[#A5B4FC]/80 italic">"{note.text}"</p>
                        <span className="text-[8px] text-[#00E5FF]/40 font-bold uppercase">{new Date(note.timestamp).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm">
            <h3 className="serif text-2xl mb-6">Bank Aggregation</h3>
            <div className="space-y-4">
              {bankAggregation.map(([bank, data]) => (
                <button 
                  key={bank}
                  onClick={() => setBankFilter(bank === bankFilter ? 'All' : bank)}
                  className={cn(
                    "w-full p-4 rounded-2xl border transition-all text-left group",
                    bankFilter === bank ? "bg-[#FF0055] border-[#00E5FF] text-[#E0E7FF]" : "bg-[#0B0E14]/50 border-transparent hover:border-[#00E5FF]/20"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={cn("text-[10px] uppercase tracking-widest font-bold", bankFilter === bank ? "text-[#E0E7FF]/60" : "text-[#00E5FF]/40")}>{bank}</p>
                      <p className="text-lg font-bold mt-1">ETB {data.total.toLocaleString()}</p>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-bold", bankFilter === bank ? "bg-[#151A22]/20 text-[#E0E7FF]" : "bg-[#FF0055]/10 text-[#00E5FF]")}>
                      {data.count}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#FF0055] p-8 rounded-[48px] text-[#E0E7FF] space-y-6">
            <div className="w-12 h-12 bg-[#151A22]/10 rounded-2xl flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <div className="space-y-2">
              <h3 className="serif text-2xl">Collection Goal</h3>
              <p className="text-sm text-[#E0E7FF]/60">Target for this week: ETB 50,000</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                <span>Progress</span>
                <span>65%</span>
              </div>
              <div className="h-2 bg-[#151A22]/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#151A22] w-[65%]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#151A22] w-full max-w-lg rounded-[48px] p-10 shadow-2xl space-y-8"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="serif text-3xl">Follow Up</h3>
                  <p className="text-sm text-[#A5B4FC]/60 mt-2">{selectedPayment.customerName} • {formatPrice(selectedPayment.amount)}</p>
                </div>
                <button onClick={() => setSelectedPayment(null)} className="p-2 hover:bg-[#0B0E14] rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/60">Add Note</label>
                  <textarea 
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Enter follow-up details (e.g., 'Customer promised payment by Friday')..."
                    className="w-full p-4 bg-[#0B0E14] rounded-3xl text-sm focus:outline-none min-h-[120px]"
                  />
                </div>
                <button 
                  onClick={() => {
                    if (noteText) {
                      addNote(selectedPayment.id, { text: noteText, user: user.name, timestamp: new Date().toISOString() });
                      setNoteText('');
                      setSelectedPayment(null);
                    }
                  }}
                  className="w-full py-4 bg-[#FF0055] text-[#E0E7FF] rounded-full font-bold uppercase tracking-widest hover:bg-[#FF0055]/80 transition-all flex items-center justify-center gap-2"
                >
                  <Send size={18} /> Save Note
                </button>
              </div>

              {selectedPayment.notes && selectedPayment.notes.length > 0 && (
                <div className="space-y-4">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/60">History</p>
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                    {selectedPayment.notes.map((note, i) => (
                      <div key={i} className="p-4 bg-[#0B0E14]/50 rounded-2xl space-y-1">
                        <p className="text-sm">{note.text}</p>
                        <div className="flex justify-between text-[10px] text-[#00E5FF]/40 font-bold uppercase">
                          <span>{note.user}</span>
                          <span>{new Date(note.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MarketingAnalytics = ({ orders }: { orders: Order[] }) => {
  const skuSales = useMemo(() => {
    const data: { [key: string]: number } = {};
    orders.forEach(o => o.items.forEach(i => {
      data[i.name] = (data[i.name] || 0) + i.quantity;
    }));
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const roastDemand = useMemo(() => {
    const data: { [key: string]: number } = {};
    orders.forEach(o => o.items.forEach(i => {
      if (i.roast !== 'N/A') {
        data[i.roast] = (data[i.roast] || 0) + i.quantity;
      }
    }));
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const beanRatio = useMemo(() => {
    let whole = 0;
    let ground = 0;
    orders.forEach(o => o.items.forEach(i => {
      if (i.category === 'Whole Bean') whole += i.quantity;
      if (i.category === 'Ground') ground += i.quantity;
    }));
    return [
      { name: 'Whole Bean', value: whole },
      { name: 'Ground', value: ground }
    ];
  }, [orders]);

  const salesRepPerformance = useMemo(() => {
    const data: { [key: string]: number } = {};
    orders.forEach(o => {
      if (o.salesRepId) {
        data[o.salesRepId] = (data[o.salesRepId] || 0) + o.total;
      }
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [orders]);

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h2 className="serif text-4xl font-light">Marketing Analytics</h2>
        <p className="text-sm text-[#A5B4FC]/60 mt-2">SKU performance and consumer demand insights.</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm">
          <h3 className="serif text-2xl mb-8">SKU Sales Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skuSales}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2937" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#00E5FF', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#00E5FF', fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #1F2937', backgroundColor: '#0B0E14', color: '#E0E7FF', boxShadow: '0 10px 30px rgba(0, 229, 255, 0.1)' }} itemStyle={{ color: '#00E5FF' }} />
                <Bar dataKey="value" fill="#FF0055" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm">
          <h3 className="serif text-2xl mb-8">Roast Level Demand</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roastDemand} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1F2937" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#00E5FF', fontWeight: 'bold' }} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#00E5FF', fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #1F2937', backgroundColor: '#0B0E14', color: '#E0E7FF', boxShadow: '0 10px 30px rgba(0, 229, 255, 0.1)' }} itemStyle={{ color: '#00E5FF' }} />
                <Bar dataKey="value" fill="#00E5FF" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm">
          <h3 className="serif text-2xl mb-8">Whole Bean vs Ground Ratio</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={beanRatio}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2937" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#00E5FF', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#00E5FF', fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #1F2937', backgroundColor: '#0B0E14', color: '#E0E7FF', boxShadow: '0 10px 30px rgba(0, 229, 255, 0.1)' }} itemStyle={{ color: '#00E5FF' }} />
                <Bar dataKey="value" fill="#00FF9D" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm">
          <h3 className="serif text-2xl mb-8">Sales Rep Performance</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesRepPerformance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2937" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#00E5FF', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#00E5FF', fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #1F2937', backgroundColor: '#0B0E14', color: '#E0E7FF', boxShadow: '0 10px 30px rgba(0, 229, 255, 0.1)' }} itemStyle={{ color: '#00E5FF' }} />
                <Bar dataKey="value" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const ExceptionLog = ({ issues, reportIssue, addComment, user }: { issues: Issue[], reportIssue: (issue: Issue) => void, addComment: (id: string, comment: any) => void, user: UserProfile }) => {
  const [newIssue, setNewIssue] = useState({ description: '', priority: 'Medium' as any, assignedTo: '' });
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [newComment, setNewComment] = useState('');

  const handleReport = () => {
    if (!newIssue.description) return;
    const issue: Issue = {
      id: createEntityId('ISS'),
      orderId: 'N/A',
      reportedBy: user.name,
      assignedTo: newIssue.assignedTo || 'Unassigned',
      priority: newIssue.priority,
      role: user.role,
      description: newIssue.description,
      status: 'Open',
      timestamp: new Date().toISOString(),
      comments: []
    };
    reportIssue(issue);
    setNewIssue({ description: '', priority: 'Medium', assignedTo: '' });
  };

  const handleAddComment = () => {
    if (!newComment || !selectedIssue) return;
    const comment = {
      user: user.name,
      text: newComment,
      timestamp: new Date().toISOString()
    };
    addComment(selectedIssue.id, comment);
    setNewComment('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      <div className="lg:col-span-2 space-y-8">
        <header>
          <h2 className="serif text-4xl font-light">Exception Log</h2>
          <p className="text-sm text-[#A5B4FC]/60 mt-2">Track and resolve operational issues across the pipeline.</p>
        </header>

        <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm space-y-6">
          <div className="space-y-4">
            <textarea 
              placeholder="Describe the issue or exception..." 
              value={newIssue.description}
              onChange={(e) => setNewIssue({...newIssue, description: e.target.value})}
              className="w-full px-6 py-4 bg-[#0B0E14] rounded-2xl border border-[#00E5FF]/10 focus:outline-none focus:border-[#00E5FF] transition-all text-sm h-32"
            />
            <div className="flex gap-4">
              <select 
                value={newIssue.priority}
                onChange={e => setNewIssue({...newIssue, priority: e.target.value as any})}
                className="flex-1 px-4 py-3 bg-[#0B0E14] rounded-xl border border-[#00E5FF]/10 text-xs font-bold uppercase tracking-widest"
              >
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
              </select>
              <input 
                type="text" 
                placeholder="Assign to..." 
                value={newIssue.assignedTo}
                onChange={e => setNewIssue({...newIssue, assignedTo: e.target.value})}
                className="flex-1 px-4 py-3 bg-[#0B0E14] rounded-xl border border-[#00E5FF]/10 text-xs"
              />
              <button 
                onClick={handleReport}
                className="px-8 py-3 bg-[#FF0055] text-[#E0E7FF] rounded-xl font-bold shadow-lg shadow-[#FF0055]/20 hover:bg-[#FF0055]/80 transition-all"
              >
                Report Issue
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {issues.map(issue => (
              <div 
                key={issue.id} 
                onClick={() => setSelectedIssue(issue)}
                className={cn(
                  "p-6 rounded-[32px] border transition-all cursor-pointer",
                  selectedIssue?.id === issue.id ? "bg-[#FF0055] text-[#E0E7FF] border-[#00E5FF]" : "bg-[#151A22] border-[#00E5FF]/10 hover:border-[#00E5FF]/30"
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest",
                      issue.priority === 'High' ? "bg-red-100 text-red-600" : issue.priority === 'Medium' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                    )}>
                      {issue.priority}
                    </span>
                    <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{issue.id}</span>
                  </div>
                  <span className="text-[10px] opacity-40">{new Date(issue.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-sm font-medium leading-relaxed mb-4">{issue.description}</p>
                <div className="flex items-center justify-between border-t border-current/10 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-current/10 flex items-center justify-center text-[10px] font-bold">
                      {issue.reportedBy.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold opacity-60">{issue.reportedBy}</p>
                      <p className="text-[8px] opacity-40 uppercase tracking-widest">Assigned to: {issue.assignedTo}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold opacity-60">
                    <MessageSquare size={12} /> {issue.comments.length}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#151A22] rounded-[48px] border border-[#00E5FF]/10 flex flex-col h-[calc(100vh-12rem)] sticky top-8 shadow-sm">
        {selectedIssue ? (
          <>
            <div className="p-8 border-b border-[#00E5FF]/10">
              <h3 className="serif text-2xl mb-2">Resolution Workflow</h3>
              <p className="text-xs text-[#A5B4FC]/40 line-clamp-2">{selectedIssue.description}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {selectedIssue.comments.map((c, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#00E5FF]">{c.user}</span>
                    <span className="text-[8px] text-[#A5B4FC]/40">{new Date(c.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="p-4 bg-[#0B0E14] rounded-2xl rounded-tl-none text-xs leading-relaxed">
                    {c.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 bg-[#0B0E14]/50 border-t border-[#00E5FF]/10">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Add a comment..." 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 px-4 py-3 bg-[#151A22] rounded-xl border border-[#00E5FF]/10 focus:outline-none focus:border-[#00E5FF] text-xs"
                />
                <button 
                  onClick={handleAddComment}
                  className="p-3 bg-[#FF0055] text-[#E0E7FF] rounded-xl hover:bg-[#FF0055]/80 transition-all"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
            <div className="p-6 bg-[#0B0E14] rounded-full text-[#00E5FF]/20">
              <MessageSquare size={48} />
            </div>
            <p className="text-sm text-[#A5B4FC]/40 italic">Select an issue to join the resolution workflow.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const PersonalAnalytics = ({ user, orders, payments, trips }: { user: UserProfile, orders: Order[], payments: PaymentRecord[], trips: DeliveryTrip[] }) => {
  const { formatPrice } = React.useContext(CurrencyContext);
  
  const userOrders = useMemo(() => orders.filter(o => o.customerEmail === user.email || o.salesRepId === user.id), [orders, user]);
  const myTotalSpent = userOrders.filter(o => o.customerEmail === user.email).reduce((sum, o) => sum + o.total, 0);
  const myTotalSales = userOrders.filter(o => o.salesRepId === user.id).reduce((sum, o) => sum + o.total, 0);

  const myDeliveries = useMemo(() => trips.filter(t => t.driverId === user.id), [trips, user]);

  return (
    <div className="space-y-8 animate-fade-in pb-24">
       <header>
          <h2 className="serif text-4xl font-light">My Analytics</h2>
          <p className="text-sm text-[#A5B4FC]/60 mt-2">Personalized performance and insights.</p>
       </header>
       
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-[#151A22] p-8 rounded-[32px] border border-[#00E5FF]/10 shadow-sm">
            <p className="text-[10px] uppercase font-bold tracking-widest text-[#00E5FF]/40">My Total Sales</p>
            <p className="text-4xl font-light text-[#00E5FF] mt-2">{formatPrice(myTotalSales)}</p>
          </div>
          <div className="bg-[#151A22] p-8 rounded-[32px] border border-[#00E5FF]/10 shadow-sm">
            <p className="text-[10px] uppercase font-bold tracking-widest text-[#00E5FF]/40">Orders Processed</p>
            <p className="text-4xl font-light text-[#00E5FF] mt-2">{userOrders.filter(o => o.salesRepId === user.id).length || 0}</p>
          </div>
          <div className="bg-[#151A22] p-8 rounded-[32px] border border-[#00E5FF]/10 shadow-sm">
            <p className="text-[10px] uppercase font-bold tracking-widest text-[#00E5FF]/40">Est. Commission</p>
            <p className="text-4xl font-light text-emerald-600 mt-2">{formatPrice(myTotalSales * 0.05)}</p>
          </div>
       </div>
       
       <div className="bg-[#151A22] p-10 rounded-[48px] border border-[#00E5FF]/10 shadow-sm mt-8">
           <h3 className="serif text-2xl mb-6">Recent Activity</h3>
           {userOrders.length > 0 ? (
               <div className="space-y-4">
                 {userOrders.slice(0, 8).map(o => (
                   <div key={o.id} className="flex justify-between items-center p-6 bg-[#0B0E14] hover:bg-[#0B0E14]/70 transition-colors rounded-[24px]">
                     <div>
                       <p className="font-bold text-sm">Order {o.id}</p>
                       <p className="text-xs text-[#00E5FF]/60 mt-1">{new Date(o.timestamp).toLocaleDateString()} • {o.items.length} items</p>
                     </div>
                     <div className="text-right">
                       <span className="font-bold text-lg text-[#00E5FF]">{formatPrice(o.total)}</span>
                       <p className="text-[10px] font-bold uppercase tracking-widest text-[#00E5FF]/60 mt-1">{o.status}</p>
                     </div>
                   </div>
                 ))}
               </div>
           ) : (
               <div className="text-center py-12">
                 <p className="text-sm text-[#A5B4FC]/50">No recent activity found.</p>
               </div>
           )}
       </div>
    </div>
  );
};

const OrderTracking = ({ orders, issues, drivers, trips }: { orders: Order[], issues: Issue[], drivers: Driver[], trips: DeliveryTrip[] }) => {
  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h2 className="serif text-4xl font-light">My Orders</h2>
        <p className="text-sm text-[#A5B4FC]/60 mt-2">Track your coffee's journey from bean to cup.</p>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {orders.map(order => {
          const orderIssues = issues.filter(i => i.orderId === order.id && i.status === 'Open');
          const hasIssue = orderIssues.length > 0;
          const driver = drivers.find(d => d.id === order.driverId);
          const trip = trips.find(t => t.id === order.tripId);

          return (
            <div key={order.id} className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm space-y-8">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Order ID</p>
                  <p className="text-xl font-bold">#{order.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Status</p>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      order.status === 'Delivered' ? "bg-emerald-500" : 
                      order.status === 'Cancelled' ? "bg-red-500" : "bg-amber-500 animate-pulse"
                    )} />
                    <p className="text-xl font-bold">{order.status}</p>
                  </div>
                </div>
              </div>

              <OrderLifecycleTimeline status={order.status} hasIssue={hasIssue} />

              {order.status === 'Out for Delivery' && driver && (
                <div className="p-6 bg-[#0B0E14] rounded-[32px] border border-[#00E5FF]/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#FF0055] text-[#E0E7FF] flex items-center justify-center font-bold">
                        {driver.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Your Driver</p>
                        <p className="text-sm font-bold">{driver.name}</p>
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star size={10} fill="currentColor" />
                          <span className="text-[10px] font-bold">{driver.rating}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Estimated Arrival</p>
                      <p className="text-sm font-bold text-[#00E5FF]">{trip?.estimatedTime ? `${trip.estimatedTime} mins` : "Not available"}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-4 bg-[#151A22] rounded-2xl border border-[#00E5FF]/5">
                      <p className="text-[9px] uppercase tracking-widest text-[#A5B4FC]/40 mb-1">Driver location</p>
                      <p className="font-mono">{driver.currentLocation.lat.toFixed(5)}, {driver.currentLocation.lng.toFixed(5)}</p>
                    </div>
                    <div className="p-4 bg-[#151A22] rounded-2xl border border-[#00E5FF]/5">
                      <p className="text-[9px] uppercase tracking-widest text-[#A5B4FC]/40 mb-1">Recorded route points</p>
                      <p className="font-bold">{trip?.route?.length || 0}</p>
                    </div>
                  </div>
                </div>
              )}

              {hasIssue && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                  <AlertCircle size={18} />
                  <p className="text-xs font-bold">There is an open issue with this order. Our team is working on it.</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-[#00E5FF]/5">
                <div className="space-y-4">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Items</p>
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="font-bold">ETB {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Delivery Details</p>
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="text-[#00E5FF]/40 mt-1" />
                    <p className="text-sm text-[#A5B4FC]/60">{order.address}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const OrderLifecycleTimeline = ({ status, hasIssue }: { status: OrderStatus, hasIssue?: boolean }) => {
  const steps = [
    { label: 'Pending', icon: Clock },
    { label: 'Processing', icon: Activity },
    { label: 'Roasting', icon: CoffeeIcon },
    { label: 'Grinding', icon: RotateCcw },
    { label: 'Packaging', icon: Package },
    { label: 'Ready for Dispatch', icon: CheckCircle2 },
    { label: 'Out for Delivery', icon: Truck },
    { label: 'Delivered', icon: ShieldCheck }
  ];

  const currentStepIndex = steps.findIndex(s => s.label === status);

  return (
    <div className="relative pt-8 pb-4">
      <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#0B0E14] -translate-y-1/2" />
      <div 
        className={cn(
          "absolute top-1/2 left-0 h-1 transition-all duration-1000 -translate-y-1/2",
          hasIssue ? "bg-red-500" : "bg-[#FF0055]"
        )}
        style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
      />
      <div className="relative flex justify-between">
        {steps.map((step, i) => {
          const isCompleted = i < currentStepIndex;
          const isCurrent = i === currentStepIndex;
          
          let bgColor = "bg-[#0B0E14]";
          let textColor = "text-[#A5B4FC]/10";
          let iconColor = "text-[#A5B4FC]/10";

          if (isCompleted) {
            bgColor = "bg-emerald-500";
            textColor = "text-emerald-500";
            iconColor = "text-[#E0E7FF]";
          } else if (isCurrent) {
            bgColor = hasIssue ? "bg-red-500" : "bg-amber-500";
            textColor = hasIssue ? "text-red-500" : "text-amber-500";
            iconColor = "text-[#E0E7FF]";
          }

          return (
            <div key={i} className="flex flex-col items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all duration-500 border-4 border-[#00E5FF]/30",
                bgColor,
                isCurrent && "scale-110 shadow-lg"
              )}>
                <step.icon size={16} className={iconColor} />
              </div>
              <span className={cn(
                "text-[8px] font-bold uppercase tracking-widest text-center max-w-[60px]",
                isCurrent || isCompleted ? textColor : "text-[#A5B4FC]/20"
              )}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Profile = ({ user, coffees, orders, onUpdateUser }: { user: UserProfile, coffees: Coffee[], orders: Order[], onUpdateUser: (u: UserProfile) => void }) => {
  const [salesParams, setSalesParams] = useState({
    avgPrice: 0,         // User-entered scenario price in ETB
    marketingPush: 6,    // 1 to 10
    seasonality: 5,      // 1 to 10
    premiumAudience: 5,  // 1 to 10
    walkInTraffic: 6     // 1 to 10
  });

  useEffect(() => {
    if (salesParams.avgPrice > 0 || !coffees.length) return;
    const averageCatalogPrice = coffees.reduce((sum, coffee) => sum + Number(coffee.price || 0), 0) / coffees.length;
    setSalesParams(previous => ({ ...previous, avgPrice: Math.round(averageCatalogPrice) }));
  }, [coffees, salesParams.avgPrice]);

  const candidateCoffees = useMemo(() => coffees.map(coffee => {
    const soldLines = orders
      .filter(order => order.status !== 'Cancelled')
      .flatMap(order => order.items.map(item => ({ order, item })))
      .filter(({ item }) => item.id === coffee.id || item.name.trim().toLowerCase() === coffee.name.trim().toLowerCase());
    const actualVolume = soldLines.reduce((sum, entry) => sum + Number(entry.item.quantity || 0), 0);
    const actualRevenue = soldLines.reduce((sum, entry) => sum + Number(entry.item.price || 0) * Number(entry.item.quantity || 0), 0);
    return {
      id: coffee.id,
      name: coffee.name,
      description: coffee.description,
      roastLevel: coffee.roast || '',
      brewMethod: coffee.availableBrewMethods?.[0] || '',
      flavorProfile: coffee.flavorProfile || { sweetness: 0, acidity: 0, body: 0, floral: 0, nutty: 0 },
      catalogPrice: Number(coffee.price || 0),
      actualVolume,
      actualRevenue,
      actualAveragePrice: actualVolume > 0 ? actualRevenue / actualVolume : Number(coffee.price || 0)
    };
  }), [coffees, orders]);

  const analyzedCoffees = useMemo(() => {
    return candidateCoffees.map(coffee => {
      const scenarioPrice = salesParams.avgPrice > 0 ? salesParams.avgPrice : coffee.actualAveragePrice;
      const baselinePrice = Math.max(coffee.actualAveragePrice, 1);
      const priceRatio = scenarioPrice / baselinePrice;
      const priceMultiplier = priceRatio > 1
        ? Math.max(0, 1 - (priceRatio - 1) * 0.6)
        : 1 + (1 - priceRatio) * 0.35;
      const marketingMultiplier = 1 + (salesParams.marketingPush - 5) * 0.05;
      const seasonalityMultiplier = 1 + (salesParams.seasonality - 5) * 0.05;
      const audienceMultiplier = 1 + (salesParams.premiumAudience - 5) * 0.025;
      const trafficMultiplier = 1 + (salesParams.walkInTraffic - 5) * 0.025;
      const projectedVolume = Math.max(0, Math.round(coffee.actualVolume * priceMultiplier * marketingMultiplier * seasonalityMultiplier * audienceMultiplier * trafficMultiplier));
      const projectedRevenue = projectedVolume * scenarioPrice;
      return {
        ...coffee,
        projectedVolume,
        projectedRevenue,
        scenarioPrice,
        rankScore: projectedRevenue
      };
    }).sort((a, b) => b.rankScore - a.rankScore);
  }, [candidateCoffees, salesParams]);

  const aggregateStats = useMemo(() => {
    const baselineVolume = analyzedCoffees.reduce((sum, coffee) => sum + coffee.actualVolume, 0);
    const baselineRevenue = analyzedCoffees.reduce((sum, coffee) => sum + coffee.actualRevenue, 0);
    const totalVolume = analyzedCoffees.reduce((sum, coffee) => sum + coffee.projectedVolume, 0);
    const totalRevenue = analyzedCoffees.reduce((sum, coffee) => sum + coffee.projectedRevenue, 0);
    const topCoffee = analyzedCoffees[0]?.name || 'N/A';
    return { baselineVolume, baselineRevenue, totalVolume, totalRevenue, topCoffee };
  }, [analyzedCoffees]);

  const getLabelForPrice = (price: number) => {
    if (price < 900) return "Discount / High Vol";
    if (price < 1500) return "Standard Mid-Premium";
    return "Ultra-Premium Luxury";
  };

  const getLabelForMkt = (val: number) => {
    if (val < 4) return "Minimalist / Organic Only";
    if (val < 8) return "Active Digital Channels";
    return "Ultra-targeted Buzz Stage";
  };

  const getLabelForSeason = (val: number) => {
    if (val < 4) return "Harvest Off-season Rain";
    if (val < 8) return "Consistent Normal Demand";
    return "Peak Festival / Holiday Sales";
  };

  const getLabelForPremium = (val: number) => {
    if (val < 4) return "Commodity Blend Cohorts";
    if (val < 8) return "Specialty Enthusiasts";
    return "Elite Micro-Lot Purists";
  };

  const getLabelForRetail = (val: number) => {
    if (val < 4) return "Quiet Suburban Transit";
    if (val < 8) return "Active Downtown Walk-ins";
    return "Peak City-center Rush Hour";
  };


  const getTierAndProgress = () => {
    const pts = user.loyaltyPoints || 0;
    if (pts < 250) {
      return { tier: 'Bronze Sip', next: 250, percent: Math.round((pts / 250) * 100), nextTier: 'Silver Brew' };
    } else if (pts < 600) {
      return { tier: 'Silver Brew', next: 600, percent: Math.round(((pts - 250) / 350) * 100), nextTier: 'Gold Harvest' };
    } else if (pts < 1500) {
      return { tier: 'Gold Harvest', next: 1500, percent: Math.round(((pts - 600) / 900) * 100), nextTier: 'Platinum Roast' };
    } else {
      return { tier: 'Platinum Roast', next: 3000, percent: Math.min(100, Math.round(((pts - 1500) / 1500) * 100)), nextTier: 'Barista Legend' };
    }
  };

  const { tier, percent, nextTier, next } = getTierAndProgress();

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-fade-in text-[#E0E7FF]">
      {/* Profile Header */}
      <header className="flex flex-col sm:flex-row items-center gap-8 justify-between p-8 bg-gradient-to-r from-[#151A22] to-[#12161D] rounded-[48px] border border-[#00E5FF]/10 shadow-lg">
        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <div className="w-24 h-24 rounded-[32px] bg-gradient-to-tr from-[#FF0055] to-[#FF4500] text-[#E0E7FF] flex items-center justify-center text-4xl serif shadow-xl">
            {user.name ? user.name[0] : 'U'}
          </div>
          <div>
            <h2 className="serif text-3xl font-light">{user.name}</h2>
            <p className="text-sm text-[#A5B4FC]/60">{user.email}</p>
            <div className="mt-2 inline-flex items-center gap-2">
              <span className="px-3 py-1 bg-[#00E5FF]/10 text-[#00E5FF] rounded-full text-[10px] font-bold uppercase tracking-widest">
                {user.role}
              </span>
              <span className="px-3 py-1 bg-[#FF0055]/10 text-[#FF0055] rounded-full text-[10px] font-bold uppercase tracking-widest">
                {tier}
              </span>
            </div>
          </div>
        </div>
        <div className="text-center sm:text-right space-y-2 bg-[#0B0E14] p-6 rounded-3xl border border-[#00E5FF]/10 min-w-[200px]">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/60">Total Loyalty Balance</p>
          <div className="flex items-center justify-center sm:justify-end gap-1.5">
            <Star className="text-[#00E5FF] fill-[#00E5FF]" size={20} />
            <p className="text-3xl font-bold text-[#A5B4FC]">{user.loyaltyPoints || 0} pts</p>
          </div>
          <div className="w-full bg-[#151A22] h-2 rounded-full overflow-hidden mt-2">
            <div className="bg-[#00E5FF] h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-[10px] text-[#A5B4FC]/40 mt-1">
            {percent}% to <span className="text-[#00E5FF] font-semibold">{nextTier}</span> ({next - (user.loyaltyPoints || 0)} more)
          </p>
        </div>
      </header>

      {/* Sales Scenario Analyzer Block */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Sales scenario controls */}
        <div className="lg:col-span-3 bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-xl space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-[#0B0E14] rounded-xl text-[#00E5FF]">
                <Calculator size={20} />
              </div>
              <div>
                <h3 className="serif text-xl">Sales Scenario Analyzer</h3>
                <p className="text-[10px] text-[#A5B4FC]/40 uppercase tracking-wider">Scenario estimates use actual recorded product sales as the baseline</p>
              </div>
            </div>

            <div className="space-y-5 mt-6">
              {/* pricing */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Standard Price per Bag</span>
                  <span className="text-[#00E5FF] font-mono">ETB {salesParams.avgPrice} ({getLabelForPrice(salesParams.avgPrice)})</span>
                </div>
                <input
                  type="range"
                  min="600"
                  max="2400"
                  step="50"
                  value={salesParams.avgPrice}
                  onChange={(e) => setSalesParams(prev => ({ ...prev, avgPrice: parseInt(e.target.value) }))}
                  className="w-full accent-[#00E5FF] h-1.5 bg-[#0B0E14] rounded-lg cursor-pointer"
                />
              </div>

              {/* marketing option */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Marketing & Ad Spend Focus</span>
                  <span className="text-[#F43F5E] font-mono">{salesParams.marketingPush}/10 ({getLabelForMkt(salesParams.marketingPush)})</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={salesParams.marketingPush}
                  onChange={(e) => setSalesParams(prev => ({ ...prev, marketingPush: parseInt(e.target.value) }))}
                  className="w-full accent-[#F43F5E] h-1.5 bg-[#0B0E14] rounded-lg cursor-pointer"
                />
              </div>

              {/* seasonality option */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Seasonality & Festivity Index</span>
                  <span className="text-[#F59E0B] font-mono">{salesParams.seasonality}/10 ({getLabelForSeason(salesParams.seasonality)})</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={salesParams.seasonality}
                  onChange={(e) => setSalesParams(prev => ({ ...prev, seasonality: parseInt(e.target.value) }))}
                  className="w-full accent-[#F59E0B] h-1.5 bg-[#0B0E14] rounded-lg cursor-pointer"
                />
              </div>

              {/* Premium audience option */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Premium Specialty Audience Share</span>
                  <span className="text-[#EC4899] font-mono">{salesParams.premiumAudience}/10 ({getLabelForPremium(salesParams.premiumAudience)})</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={salesParams.premiumAudience}
                  onChange={(e) => setSalesParams(prev => ({ ...prev, premiumAudience: parseInt(e.target.value) }))}
                  className="w-full accent-[#EC4899] h-1.5 bg-[#0B0E14] rounded-lg cursor-pointer"
                />
              </div>

              {/* Walk-in retail traffic option */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span>In-store Retail Foot-traffic</span>
                  <span className="text-[#10B981] font-mono">{salesParams.walkInTraffic}/10 ({getLabelForRetail(salesParams.walkInTraffic)})</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={salesParams.walkInTraffic}
                  onChange={(e) => setSalesParams(prev => ({ ...prev, walkInTraffic: parseInt(e.target.value) }))}
                  className="w-full accent-[#10B981] h-1.5 bg-[#0B0E14] rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#0B0E14]/60 p-4 rounded-3xl border border-[#00E5FF]/5 mt-4 text-xs select-none">
            <span className="text-[#00E5FF] font-bold uppercase tracking-wider block mb-1">Predictive Intelligence:</span>
            Scenario calculations start from the sales quantities recorded in Supabase. Products with no sales history remain at zero until real transactions are recorded.
          </div>
        </div>

        {/* Aggregate Sales Forecast */}
        <div className="lg:col-span-2 bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-xl flex flex-col justify-between min-h-[300px]">
          <div>
            <h4 className="serif text-lg mb-4 text-center text-[#E0E7FF]/80">Scenario Projection</h4>
            
            <div className="space-y-4 bg-[#0B0E14]/50 p-6 rounded-3xl border border-[#00E5FF]/5">
              {/* combined volume */}
              <div className="flex items-center justify-between border-b border-[#00E5FF]/5 pb-3">
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-[#00E5FF]" />
                  <span className="text-xs text-[#A5B4FC]/60 font-light">Projected Quantity</span>
                </div>
                <span className="text-sm font-bold text-[#E0E7FF]">{aggregateStats.totalVolume} units</span>
              </div>

              {/* projected revenue */}
              <div className="flex items-center justify-between border-b border-[#00E5FF]/5 pb-3">
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-[#00E5FF]" />
                  <span className="text-xs text-[#A5B4FC]/60 font-light">Projected Revenue</span>
                </div>
                <span className="text-sm font-semibold text-emerald-400">ETB {aggregateStats.totalRevenue.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between border-b border-[#00E5FF]/5 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-[#FF0055]" />
                  <span className="text-xs text-[#A5B4FC]/60 font-light">Recorded Baseline Quantity</span>
                </div>
                <span className="text-sm font-bold text-[#A5B4FC]">{aggregateStats.baselineVolume} units</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-[#F59E0B]" />
                  <span className="text-xs text-[#A5B4FC]/60 font-light">Recorded Baseline Revenue</span>
                </div>
                <span className="text-sm font-mono text-[#A5B4FC]/80">ETB {aggregateStats.baselineRevenue.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#00E5FF]/5">
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#A5B4FC]/40 block mb-3 text-center">Top Performing Variety</span>
            <div className="bg-[#0B0E14] px-4 py-3 rounded-2xl flex items-center justify-center gap-2 text-center border border-[#00E5FF]/20 shadow-lg">
              <Star className="text-amber-400 fill-amber-400 animate-pulse" size={16} />
              <span className="serif text-sm font-light text-amber-200">{aggregateStats.topCoffee}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Brew Variety Sales Leaderboard results */}
      <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0B0E14] rounded-xl text-[#00E5FF]">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 className="serif text-2xl">Brew Variety Sales Leaderboard</h3>
              <p className="text-xs text-[#A5B4FC]/60">Rankings use actual recorded sales as the baseline and the selected scenario inputs.</p>
            </div>
          </div>
<span className="text-[10px] uppercase tracking-widest text-[#A5B4FC]/40">Supabase sales baseline</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analyzedCoffees.map((coffee, index) => {
            const isWinner = index === 0;
            const rankLabel = `#${index + 1} Sales Leader`;
            return (
              <div 
                key={coffee.id} 
                className={cn(
                  "p-6 rounded-[32px] bg-[#0B0E14] duration-300 relative overflow-hidden flex flex-col justify-between border",
                  isWinner ? "border-[#00E5FF] ring-2 ring-[#00E5FF]/20 shadow-[-10px_0_30px_rgba(0,229,255,0.15)]" : "border-[#00E5FF]/10 hover:border-[#00E5FF]/40"
                )}
              >
                <div className="absolute top-4 right-4 bg-[#0B0E14] text-[#00E5FF] text-[9px] font-mono border border-[#00E5FF]/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {rankLabel}
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-[#A5B4FC]/40 uppercase tracking-widest">{coffee.roastLevel} Roast</span>
                    <span className="text-[10px] text-[#00E5FF]/70 font-semibold">• {coffee.brewMethod}</span>
                  </div>
                  <h4 className="serif text-xl tracking-wide font-light mb-1">{coffee.name}</h4>
                  <p className="text-xs text-[#A5B4FC]/60 font-light mb-4 line-clamp-2">{coffee.description}</p>
                </div>
                
                <div className="pt-4 border-t border-[#00E5FF]/5 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#A5B4FC]/50">Recorded / Projected:</span>
                    <span className="font-bold text-emerald-400">{coffee.actualVolume} / {coffee.projectedVolume} units</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#A5B4FC]/50">Est. Revenue:</span>
                    <span className="font-semibold text-[#E0E7FF]">ETB {coffee.projectedRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#A5B4FC]/50">Scenario Unit Price:</span>
                    <span className="font-bold text-[#00E5FF]">ETB {coffee.scenarioPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {!analyzedCoffees.length && (
            <div className="md:col-span-2 lg:col-span-3 py-12 text-center text-sm text-[#A5B4FC]/30">Add real products and sales transactions to use the scenario analyzer.</div>
          )}
        </div>
      </div>

      <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-xl">
        <h3 className="serif text-xl mb-2">Loyalty Balance</h3>
        <p className="text-sm text-[#A5B4FC]/50">The balance shown above is loaded from the authenticated Supabase profile. Reward catalog entries are not displayed until a persistent rewards module is configured.</p>
      </div>
    </div>
  );
};

const RefundManagement = ({ payments, refunds, processRefund }: { payments: PaymentRecord[], refunds: RefundRecord[], processRefund: (r: RefundRecord) => void }) => {
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [reason, setReason] = useState('');

  const handleRefund = () => {
    if (!selectedPayment) return;
    const refund: RefundRecord = {
      id: createEntityId('REF'),
      paymentId: selectedPayment.id,
      orderId: selectedPayment.orderId,
      amount: refundAmount,
      reason,
      status: 'Approved',
      timestamp: new Date().toISOString()
    };
    processRefund(refund);
    setSelectedPayment(null);
    setRefundAmount(0);
    setReason('');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h2 className="serif text-4xl font-light">Refund Management</h2>
        <p className="text-sm text-[#A5B4FC]/60 mt-2">Process full or partial refunds for customer orders.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm">
            <h3 className="serif text-2xl mb-6">Recent Payments</h3>
            <div className="space-y-4">
              {payments.filter(p => p.status === 'Cleared' || p.status === 'Partially Refunded').map(p => (
                <div key={p.id} className="p-6 bg-[#0B0E14] rounded-[32px] flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-[#00E5FF]">Order #{p.orderId}</p>
                    <p className="text-sm font-medium">{p.customerName}</p>
                    <p className="text-[10px] opacity-40 uppercase tracking-widest">{p.method} • {new Date(p.timestamp).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="text-sm font-bold">ETB {p.amount.toFixed(2)}</p>
                      {p.refundedAmount && <p className="text-[10px] text-red-500 font-bold">Refunded: ETB {p.refundedAmount.toFixed(2)}</p>}
                    </div>
                    <button onClick={() => setSelectedPayment(p)} className="p-3 bg-[#FF0055] text-[#E0E7FF] rounded-2xl hover:bg-[#FF0055]/80 transition-all">
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {selectedPayment ? (
            <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm space-y-6">
              <h3 className="serif text-2xl">Process Refund</h3>
              <div className="p-4 bg-[#0B0E14] rounded-2xl space-y-2">
                <p className="text-xs font-bold text-[#00E5FF]">Selected Order: #{selectedPayment.orderId}</p>
                <p className="text-xs">Max Refundable: ETB {(selectedPayment.amount - (selectedPayment.refundedAmount || 0)).toFixed(2)}</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Refund Amount</label>
                  <input 
                    type="number" 
                    value={refundAmount} 
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    className="w-full p-4 bg-[#0B0E14] rounded-2xl border-none focus:ring-2 focus:ring-[#00E5FF]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Reason</label>
                  <textarea 
                    value={reason} 
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-4 bg-[#0B0E14] rounded-2xl border-none focus:ring-2 focus:ring-[#00E5FF] h-24"
                    placeholder="e.g., Wrong item delivered"
                  />
                </div>
                <button onClick={handleRefund} className="w-full py-4 bg-red-500 text-[#E0E7FF] rounded-2xl font-bold shadow-lg shadow-red-500/20">
                  Confirm Refund
                </button>
                <button onClick={() => setSelectedPayment(null)} className="w-full py-4 bg-[#0B0E14] text-[#00E5FF] rounded-2xl font-bold">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#FF0055] p-8 rounded-[48px] text-[#E0E7FF] space-y-6">
              <h3 className="serif text-2xl">Refund Policy</h3>
              <ul className="space-y-4 text-sm opacity-80">
                <li className="flex gap-3"><ShieldCheck size={18} /> Partial refunds allowed for missing items.</li>
                <li className="flex gap-3"><ShieldCheck size={18} /> Wallet payments are credited instantly.</li>
                <li className="flex gap-3"><ShieldCheck size={18} /> Bank transfers take 3-5 business days.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FinanceDashboard = ({ orders, payments, refunds, payouts, processPayout }: { orders: Order[], payments: PaymentRecord[], refunds: RefundRecord[], payouts: PayoutRecord[], processPayout: (id: string) => void }) => {
  const totalRevenue = orders.filter(o => o.status === 'Delivered').reduce((sum, o) => sum + o.total, 0);
  const totalRefunds = refunds.reduce((sum, r) => sum + r.amount, 0);
  const netCashFlow = totalRevenue - totalRefunds;
  const pendingPayouts = payouts.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.amount, 0);

  const dailyData = useMemo(() => {
    const data: { [key: string]: { revenue: number, refunds: number } } = {};
    orders.forEach(o => {
      const date = new Date(o.timestamp).toLocaleDateString();
      if (!data[date]) data[date] = { revenue: 0, refunds: 0 };
      if (o.status === 'Delivered') data[date].revenue += o.total;
    });
    refunds.forEach(r => {
      const date = new Date(r.timestamp).toLocaleDateString();
      if (!data[date]) data[date] = { revenue: 0, refunds: 0 };
      data[date].refunds += r.amount;
    });
    return Object.entries(data).map(([name, val]) => ({ name, revenue: val.revenue, refunds: val.refunds }));
  }, [orders, refunds]);

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h2 className="serif text-4xl font-light">Financial Control</h2>
        <p className="text-sm text-[#A5B4FC]/60 mt-2">Cash flow, revenue tracking, and automated payouts.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#151A22] p-8 rounded-[32px] border border-[#00E5FF]/10 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Total Revenue</p>
          <p className="text-3xl font-light text-[#00E5FF] mt-2">ETB {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-[#151A22] p-8 rounded-[32px] border border-[#00E5FF]/10 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Total Refunds</p>
          <p className="text-3xl font-light text-red-500 mt-2">ETB {totalRefunds.toLocaleString()}</p>
        </div>
        <div className="bg-[#151A22] p-8 rounded-[32px] border border-[#00E5FF]/10 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Net Cash Flow</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">ETB {netCashFlow.toLocaleString()}</p>
        </div>
        <div className="bg-[#151A22] p-8 rounded-[32px] border border-[#00E5FF]/10 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">Pending Payouts</p>
          <p className="text-3xl font-light text-amber-500 mt-2">ETB {pendingPayouts.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm">
          <h3 className="serif text-2xl mb-6">Revenue vs Refunds</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2937" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#00E5FF', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#00E5FF', fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #1F2937', backgroundColor: '#0B0E14', color: '#E0E7FF', boxShadow: '0 10px 30px rgba(0, 229, 255, 0.1)' }} itemStyle={{ color: '#00E5FF' }} />
                <Bar dataKey="revenue" fill="#00E5FF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="refunds" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm">
          <h3 className="serif text-2xl mb-6">Driver Payout Queue</h3>
          <div className="space-y-4">
            {payouts.filter(p => p.status === 'Pending').map(p => (
              <div key={p.id} className="p-6 bg-[#0B0E14] rounded-[32px] flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#151A22] rounded-2xl text-[#00E5FF]">
                    <Truck size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Driver ID: {p.driverId}</p>
                    <p className="text-[10px] opacity-40 uppercase tracking-widest">{p.method} • {new Date(p.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <p className="text-sm font-bold">ETB {p.amount.toFixed(2)}</p>
                  <button onClick={() => processPayout(p.id)} className="px-4 py-2 bg-[#FF0055] text-[#E0E7FF] rounded-xl text-[10px] font-bold uppercase tracking-widest">
                    Process
                  </button>
                </div>
              </div>
            ))}
            {payouts.filter(p => p.status === 'Pending').length === 0 && (
              <p className="text-center py-12 text-[#A5B4FC]/20 italic text-sm">No pending payouts.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DriverDashboard = ({ user, orders, trips, updateTripStatus, updateLocation }: { user: UserProfile, orders: Order[], trips: DeliveryTrip[], updateTripStatus: (id: string, s: any) => void, updateLocation: (l: GeoLocation) => void }) => {
  const activeTrip = trips.find(t => t.driverId === user.id && t.status !== 'Completed');
  const tripOrders = activeTrip ? orders.filter(o => activeTrip.orderIds.includes(o.id)) : [];
  const routeDistanceKm = useMemo(() => {
    const points = activeTrip?.route || [];
    if (points.length < 2) return null;
    const radians = (degrees: number) => degrees * Math.PI / 180;
    let distance = 0;
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const dLat = radians(current.lat - previous.lat);
      const dLng = radians(current.lng - previous.lng);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(previous.lat)) * Math.cos(radians(current.lat)) * Math.sin(dLng / 2) ** 2;
      distance += 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    return distance;
  }, [activeTrip]);
  
  const stats = [
    { label: 'Today\'s Earnings', value: `ETB ${user.driverProfile?.totalEarnings || 0}`, icon: DollarSign },
    { label: 'Rating', value: user.driverProfile?.rating ?? 'N/A', icon: Star },
    { label: 'Trips Completed', value: trips.filter(t => t.driverId === user.id && t.status === 'Completed').length, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="serif text-4xl font-light">Driver Dashboard</h2>
          <p className="text-sm text-[#A5B4FC]/60 mt-2">Manage your deliveries and earnings.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn(
            "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2",
            user.driverProfile?.status === 'Available' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
          )}>
            <div className={cn("w-2 h-2 rounded-full", user.driverProfile?.status === 'Available' ? "bg-emerald-500" : "bg-amber-500")} />
            {user.driverProfile?.status}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-[#151A22] p-6 rounded-[32px] border border-[#00E5FF]/10 flex items-center gap-4">
            <div className="p-3 bg-[#0B0E14] rounded-2xl text-[#00E5FF]">
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#00E5FF]/40">{stat.label}</p>
              <p className="text-xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {activeTrip ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="serif text-2xl">Active Trip: {activeTrip.id}</h3>
                <span className="px-3 py-1 bg-[#FF0055] text-[#E0E7FF] rounded-full text-[10px] font-bold uppercase tracking-widest">
                  {activeTrip.status}
                </span>
              </div>

              <div className="space-y-4">
                {tripOrders.map(order => (
                  <div key={order.id} className="p-6 bg-[#0B0E14] rounded-[32px] border border-[#00E5FF]/5 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-[#00E5FF]">Order #{order.id}</p>
                      <p className="text-sm font-medium">{order.customerName}</p>
                      <div className="flex items-center gap-2 mt-1 text-[#A5B4FC]/40">
                        <MapPin size={12} />
                        <span className="text-[10px]">{order.address}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold">ETB {order.total.toFixed(2)}</p>
                      <p className="text-[10px] opacity-40 uppercase tracking-widest">{order.paymentMethod}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 pt-4">
                {activeTrip.status === 'Assigned' && (
                  <button 
                    onClick={() => updateTripStatus(activeTrip.id, 'Picked Up')}
                    className="flex-1 py-4 bg-[#FF0055] text-[#E0E7FF] rounded-2xl font-bold shadow-lg shadow-[#FF0055]/20 hover:bg-[#FF0055]/80 transition-all"
                  >
                    Mark as Picked Up
                  </button>
                )}
                {activeTrip.status === 'Picked Up' && (
                  <button 
                    onClick={() => updateTripStatus(activeTrip.id, 'En Route')}
                    className="flex-1 py-4 bg-[#FF0055] text-[#E0E7FF] rounded-2xl font-bold shadow-lg shadow-[#FF0055]/20 hover:bg-[#FF0055]/80 transition-all"
                  >
                    Start Delivery
                  </button>
                )}
                {activeTrip.status === 'En Route' && (
                  <button 
                    onClick={() => updateTripStatus(activeTrip.id, 'Completed')}
                    className="flex-1 py-4 bg-emerald-500 text-[#E0E7FF] rounded-2xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                  >
                    Confirm Delivery
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm h-full">
              <h3 className="serif text-xl mb-6">Recorded Route</h3>
              <div className="relative min-h-64 bg-[#0B0E14] rounded-3xl overflow-hidden border border-[#00E5FF]/5 p-6">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#00E5FF 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div className="relative space-y-3">
                  {(activeTrip.route || []).map((point, index) => (
                    <div key={`${point.lat}-${point.lng}-${index}`} className="flex items-center justify-between p-3 bg-[#151A22]/90 rounded-xl border border-[#00E5FF]/5">
                      <span className="text-[9px] uppercase tracking-widest text-[#A5B4FC]/40">Point {index + 1}</span>
                      <span className="font-mono text-xs">{point.lat.toFixed(5)}, {point.lng.toFixed(5)}</span>
                    </div>
                  ))}
                  {!activeTrip.route?.length && <p className="text-center text-xs text-[#A5B4FC]/30 py-20">No route coordinates have been recorded.</p>}
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-[#A5B4FC]/40">Recorded Distance</span>
                  <span className="font-bold">{routeDistanceKm === null ? 'Not available' : `${routeDistanceKm.toFixed(2)} km`}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#A5B4FC]/40">Route Points</span>
                  <span className="font-bold">{activeTrip.route?.length || 0}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#A5B4FC]/40">Estimated Time</span>
                  <span className="font-bold">{activeTrip.estimatedTime ? `${activeTrip.estimatedTime} mins` : 'Not available'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#151A22] p-12 rounded-[48px] border border-[#00E5FF]/10 text-center space-y-6">
          <div className="w-20 h-20 bg-[#0B0E14] rounded-full flex items-center justify-center text-[#00E5FF]/20 mx-auto">
            <Truck size={40} />
          </div>
          <div className="max-w-xs mx-auto space-y-2">
            <h3 className="serif text-2xl">Waiting for Orders</h3>
            <p className="text-sm text-[#A5B4FC]/40 italic">You are currently available. New delivery requests will appear here.</p>
          </div>
        </div>
      )}
    </div>
  );
};

const LogisticsManagement = ({ drivers, trips, orders, zones }: { drivers: Driver[], trips: DeliveryTrip[], orders: Order[], zones: DeliveryZone[] }) => {
  const activeTrips = trips.filter(t => t.status !== 'Completed');
  const pendingDeliveries = orders.filter(o => o.type === 'Delivery' && o.status === 'Ready for Dispatch' && !o.driverId);
  const completedTripDurations = trips
    .filter(trip => trip.status === 'Completed' && trip.endTime)
    .map(trip => (new Date(trip.endTime as string).getTime() - new Date(trip.startTime).getTime()) / 60000)
    .filter(minutes => Number.isFinite(minutes) && minutes >= 0);
  const averageDeliveryMinutes = completedTripDurations.length
    ? completedTripDurations.reduce((sum, minutes) => sum + minutes, 0) / completedTripDurations.length
    : null;
  const activeDeliveryOrders = orders.filter(order => order.type === 'Delivery' && !['Delivered', 'Cancelled'].includes(order.status)).length;
  const fleetEfficiency = drivers.length
    ? (drivers.filter(driver => driver.status !== 'Offline').length / drivers.length) * 100
    : null;
  const driverBounds = useMemo(() => {
    if (!drivers.length) return null;
    const latitudes = drivers.map(driver => driver.currentLocation.lat);
    const longitudes = drivers.map(driver => driver.currentLocation.lng);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    return { minLat, minLng, latRange: Math.max(maxLat - minLat, 0.001), lngRange: Math.max(maxLng - minLng, 0.001) };
  }, [drivers]);

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h2 className="serif text-4xl font-light">Logistics Engine</h2>
        <p className="text-sm text-[#A5B4FC]/60 mt-2">Real-time fleet monitoring and delivery optimization.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-8">
          {/* Real-time fleet positions from persisted driver coordinates */}
          <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="serif text-2xl">Fleet Overview</h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  {drivers.filter(d => d.status === 'Available').length} Available
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-500">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  {drivers.filter(d => d.status === 'Busy').length} On Delivery
                </div>
              </div>
            </div>
            <div className="h-96 bg-[#0B0E14] rounded-[32px] relative overflow-hidden border border-[#00E5FF]/5">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#00E5FF 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
              {driverBounds && drivers.map(driver => {
                const left = 6 + ((driver.currentLocation.lng - driverBounds.minLng) / driverBounds.lngRange) * 88;
                const top = 94 - ((driver.currentLocation.lat - driverBounds.minLat) / driverBounds.latRange) * 88;
                return (
                  <motion.div
                    key={driver.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ left: `${left}%`, top: `${top}%` }}
                    className={cn(
                      "absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-full shadow-lg border-2 border-[#00E5FF]/30",
                      driver.status === 'Available' ? "bg-emerald-500" : driver.status === 'Busy' ? "bg-amber-500" : "bg-slate-500"
                    )}
                  >
                    <Truck size={16} className="text-[#E0E7FF]" />
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-[#151A22] px-2 py-1 rounded-lg shadow-md whitespace-nowrap border border-[#00E5FF]/10">
                      <p className="text-[8px] font-bold">{driver.name}</p>
                      <p className="text-[7px] font-mono opacity-60">{driver.currentLocation.lat.toFixed(4)}, {driver.currentLocation.lng.toFixed(4)}</p>
                    </div>
                  </motion.div>
                );
              })}
              {!drivers.length && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-[#A5B4FC]/30">No driver locations have been recorded.</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm">
              <h3 className="serif text-xl mb-6">Delivery Zones</h3>
              <div className="space-y-4">
                {zones.map(zone => (
                  <div key={zone.id} className="flex justify-between items-center p-4 bg-[#0B0E14] rounded-2xl">
                    <div>
                      <p className="text-sm font-bold">{zone.name}</p>
                      <p className="text-[10px] text-[#A5B4FC]/40 uppercase tracking-widest">Base: ETB {zone.basePrice}</p>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold",
                        zone.surgeMultiplier > 1 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                      )}>
                        {zone.surgeMultiplier}x Surge
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm">
              <h3 className="serif text-xl mb-6">Auto-Assignment Queue</h3>
              <div className="space-y-4">
                {pendingDeliveries.length > 0 ? pendingDeliveries.map(order => (
                  <div key={order.id} className="flex justify-between items-center p-4 bg-[#0B0E14] rounded-2xl border border-amber-200">
                    <div>
                      <p className="text-xs font-bold">Order #{order.id}</p>
                      <p className="text-[10px] text-[#A5B4FC]/40">{order.address}</p>
                    </div>
                    <div className="animate-pulse text-amber-500">
                      <Clock size={16} />
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-[#A5B4FC]/20">
                    <p className="text-xs italic">Queue is empty.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#151A22] p-8 rounded-[48px] border border-[#00E5FF]/10 shadow-sm">
            <h3 className="serif text-xl mb-6">Active Trips</h3>
            <div className="space-y-4">
              {activeTrips.map(trip => {
                const driver = drivers.find(d => d.id === trip.driverId);
                return (
                  <div key={trip.id} className="p-4 bg-[#0B0E14] rounded-2xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-bold text-[#00E5FF]">{trip.id}</p>
                        <p className="text-xs font-medium">{driver?.name}</p>
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">{trip.status}</span>
                    </div>
                    <div className="w-full bg-[#151A22] h-1 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: trip.status === 'Picked Up' ? '50%' : trip.status === 'En Route' ? '80%' : '20%' }}
                        className="h-full bg-[#FF0055]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[#FF0055] p-8 rounded-[48px] text-[#E0E7FF] space-y-6">
            <h3 className="serif text-xl">Operational Metrics</h3>
            <div className="space-y-4">
              <div className="p-4 bg-[#151A22]/10 rounded-2xl border border-white/10">
                <p className="text-[10px] uppercase tracking-widest font-bold opacity-60">Average completed trip</p>
                <p className="text-2xl font-light mt-1">{averageDeliveryMinutes === null ? 'No completed-trip data' : `${averageDeliveryMinutes.toFixed(1)} mins`}</p>
              </div>
              <div className="p-4 bg-[#151A22]/10 rounded-2xl border border-white/10">
                <p className="text-[10px] uppercase tracking-widest font-bold opacity-60">Active delivery orders</p>
                <p className="text-2xl font-light mt-1">{activeDeliveryOrders}</p>
              </div>
              <div className="p-4 bg-[#151A22]/10 rounded-2xl border border-white/10">
                <p className="text-[10px] uppercase tracking-widest font-bold opacity-60">Online fleet</p>
                <p className="text-2xl font-light mt-1">{fleetEfficiency === null ? 'No driver data' : `${fleetEfficiency.toFixed(1)}%`}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
