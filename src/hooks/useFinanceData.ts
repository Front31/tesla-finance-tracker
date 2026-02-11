import { useState, useCallback, useMemo } from 'react';
import { FinanceConfig, Payment, TeslaVehicleState, MarketPriceEntry, DEFAULT_FINANCE_CONFIG } from '@/types/finance';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Generate mock market price data for the last 30 days
function generateMockMarketPrices(): MarketPriceEntry[] {
  const entries: MarketPriceEntry[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const base = 34000 + Math.sin(i / 5) * 1500 + Math.random() * 800;
    entries.push({
      date: date.toISOString().split('T')[0],
      avgPriceEUR: Math.round(base),
      minPriceEUR: Math.round(base - 3000 - Math.random() * 1000),
      maxPriceEUR: Math.round(base + 3000 + Math.random() * 1000),
      sampleSize: Math.round(40 + Math.random() * 80),
      fetchedAt: date.toISOString(),
    });
  }
  return entries;
}

const MOCK_VEHICLE: TeslaVehicleState = {
  vin: '5YJ3E7EA1PF000000',
  model: 'Model 3',
  trim: 'Long Range',
  year: 2024,
  odometerKm: 18450,
  lastSyncAt: new Date(Date.now() - 3600000 * 6).toISOString(),
};

export function useFinanceData() {
  const [config, setConfigState] = useState<FinanceConfig>(() =>
    loadFromStorage('tesla_finance_config', DEFAULT_FINANCE_CONFIG)
  );
  const [payments, setPaymentsState] = useState<Payment[]>(() =>
    loadFromStorage('tesla_payments', [])
  );
  const [vehicle] = useState<TeslaVehicleState>(MOCK_VEHICLE);
  const [marketPrices] = useState<MarketPriceEntry[]>(() => generateMockMarketPrices());

  const setConfig = useCallback((c: FinanceConfig) => {
    setConfigState(c);
    saveToStorage('tesla_finance_config', c);
  }, []);

  const setPayments = useCallback((p: Payment[]) => {
    setPaymentsState(p);
    saveToStorage('tesla_payments', p);
  }, []);

  const addPayment = useCallback((payment: Omit<Payment, 'id'>) => {
    const newPayment = { ...payment, id: crypto.randomUUID() };
    setPayments([...payments, newPayment]);
  }, [payments, setPayments]);

  const updatePayment = useCallback((id: string, updates: Partial<Payment>) => {
    setPayments(payments.map(p => p.id === id ? { ...p, ...updates } : p));
  }, [payments, setPayments]);

  const deletePayment = useCallback((id: string) => {
    setPayments(payments.filter(p => p.id !== id));
  }, [payments, setPayments]);

  const totalPaid = useMemo(() =>
    payments.reduce((sum, p) => sum + p.amount, 0) + config.downPayment,
    [payments, config.downPayment]
  );

  const remainingDebt = useMemo(() =>
    Math.max(0, config.financedAmount - totalPaid + config.downPayment),
    [config.financedAmount, totalPaid, config.downPayment]
  );

  const progressPercent = useMemo(() =>
    Math.min(100, (totalPaid / (config.financedAmount + config.downPayment)) * 100),
    [totalPaid, config.financedAmount, config.downPayment]
  );

  const latestMarketPrice = marketPrices[marketPrices.length - 1] ?? null;

  return {
    config,
    setConfig,
    payments,
    addPayment,
    updatePayment,
    deletePayment,
    totalPaid,
    remainingDebt,
    progressPercent,
    vehicle,
    marketPrices,
    latestMarketPrice,
  };
}
