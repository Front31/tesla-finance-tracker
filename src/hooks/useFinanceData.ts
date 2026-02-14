import { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FinanceConfig, Payment, TeslaVehicleState, MarketPriceEntry, DEFAULT_FINANCE_CONFIG } from '@/types/finance';

export function useFinanceData() {
  const [config, setConfigState] = useState<FinanceConfig>(DEFAULT_FINANCE_CONFIG);
  const [payments, setPaymentsState] = useState<Payment[]>([]);
  const [vehicle, setVehicle] = useState<TeslaVehicleState | null>(null);
  const [marketPrices, setMarketPrices] = useState<MarketPriceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all data on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await Promise.all([loadConfig(), loadPayments(), loadVehicle(), loadMarketPrices()]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const loadConfig = async () => {
    const { data } = await supabase.from('finance_config').select('*').limit(1).single();
    if (data) {
      setConfigState({
        purchasePrice: Number(data.purchase_price),
        downPayment: Number(data.down_payment),
        financedAmount: Number(data.financed_amount),
        startDate: data.start_date,
        durationMonths: data.duration_months,
        monthlyRate: Number(data.monthly_rate),
        interestRate: Number(data.interest_rate),
        vehicleModel: data.vehicle_model,
        vehicleTrim: data.vehicle_trim,
        vehicleYear: data.vehicle_year,
        vin: data.vin,
      });
    }
  };

  const loadPayments = async () => {
    const { data } = await supabase.from('payments').select('*').order('date', { ascending: false });
    if (data) {
      setPaymentsState(data.map(p => ({
        id: p.id,
        date: p.date,
        amount: Number(p.amount),
        type: p.type as Payment['type'],
        note: p.note ?? undefined,
      })));
    }
  };

  const loadVehicle = async () => {
    const { data } = await supabase.from('tesla_vehicle_state').select('vin, model, trim, year, odometer_km, last_sync_at, tesla_access_token').limit(1).single();
    if (data) {
      setVehicle({
        vin: data.vin,
        model: data.model,
        trim: data.trim,
        year: data.year,
        odometerKm: Number(data.odometer_km),
        lastSyncAt: data.last_sync_at ?? '',
      });
    }
  };

  const loadMarketPrices = async () => {
    const { data } = await supabase
      .from('market_price_daily')
      .select('*')
      .order('date', { ascending: true })
      .limit(90);
    if (data) {
      setMarketPrices(data.map(d => ({
        date: d.date,
        avgPriceEUR: Number(d.avg_price_eur),
        minPriceEUR: Number(d.min_price_eur),
        maxPriceEUR: Number(d.max_price_eur),
        sampleSize: d.sample_size,
        fetchedAt: d.fetched_at,
      })));
    }
  };

  const setConfig = useCallback(async (c: FinanceConfig) => {
    setConfigState(c);
    // Upsert config - get existing ID first
    const { data: existing } = await supabase.from('finance_config').select('id').limit(1).single();
    if (existing) {
      await supabase.from('finance_config').update({
        purchase_price: c.purchasePrice,
        down_payment: c.downPayment,
        financed_amount: c.financedAmount,
        start_date: c.startDate,
        duration_months: c.durationMonths,
        monthly_rate: c.monthlyRate,
        interest_rate: c.interestRate,
        vehicle_model: c.vehicleModel,
        vehicle_trim: c.vehicleTrim,
        vehicle_year: c.vehicleYear,
        vin: c.vin,
      }).eq('id', existing.id);
    }
  }, []);

  const addPayment = useCallback(async (payment: Omit<Payment, 'id'>) => {
    const { data } = await supabase.from('payments').insert({
      date: payment.date,
      amount: payment.amount,
      type: payment.type,
      note: payment.note ?? null,
    }).select().single();
    if (data) {
      setPaymentsState(prev => [{
        id: data.id,
        date: data.date,
        amount: Number(data.amount),
        type: data.type as Payment['type'],
        note: data.note ?? undefined,
      }, ...prev]);
    }
  }, []);

  const updatePayment = useCallback(async (id: string, updates: Partial<Payment>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.note !== undefined) dbUpdates.note = updates.note;
    await supabase.from('payments').update(dbUpdates).eq('id', id);
    setPaymentsState(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const deletePayment = useCallback(async (id: string) => {
    await supabase.from('payments').delete().eq('id', id);
    setPaymentsState(prev => prev.filter(p => p.id !== id));
  }, []);

  const saveTeslaToken = useCallback(async (token: string) => {
    const { data: existing } = await supabase.from('tesla_vehicle_state').select('id').limit(1).single();
    if (existing) {
      await supabase.from('tesla_vehicle_state').update({ tesla_access_token: token }).eq('id', existing.id);
    }
  }, []);

  const syncTeslaVehicle = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('sync-tesla-vehicle');
    if (error) throw error;
    if (data?.success) {
      await loadVehicle();
    }
    return data;
  }, []);

  const refreshMarketPrices = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('fetch-market-prices');
    if (error) throw error;
    if (data?.success) {
      await loadMarketPrices();
    }
    return data;
  }, []);

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
    loading,
    saveTeslaToken,
    syncTeslaVehicle,
    refreshMarketPrices,
  };
}
