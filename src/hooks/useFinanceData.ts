import { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FinanceConfig, Payment, TeslaVehicleState, MarketPriceEntry, FinancingOffer, DEFAULT_FINANCE_CONFIG } from '@/types/finance';

export function useFinanceData() {
  const [config, setConfigState] = useState<FinanceConfig>(DEFAULT_FINANCE_CONFIG);
  const [payments, setPaymentsState] = useState<Payment[]>([]);
  const [vehicle, setVehicle] = useState<TeslaVehicleState | null>(null);
  const [marketPrices, setMarketPrices] = useState<MarketPriceEntry[]>([]);
  const [financingOffers, setFinancingOffers] = useState<FinancingOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await Promise.all([loadConfig(), loadPayments(), loadVehicle(), loadMarketPrices(), loadFinancingOffers()]);
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
        balloonPayment: Number((data as any).balloon_payment ?? 0),
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
        id: p.id, date: p.date, amount: Number(p.amount),
        type: p.type as Payment['type'], note: p.note ?? undefined,
      })));
    }
  };

  const loadVehicle = async () => {
    const { data } = await supabase.from('tesla_vehicle_state').select('vin, model, trim, year, odometer_km, last_sync_at, tesla_access_token').limit(1).single();
    if (data) {
      setVehicle({
        vin: data.vin, model: data.model, trim: data.trim, year: data.year,
        odometerKm: Number(data.odometer_km), lastSyncAt: data.last_sync_at ?? '',
      });
    }
  };

  const loadMarketPrices = async () => {
    const { data } = await supabase.from('market_price_daily').select('*').order('date', { ascending: true }).limit(90);
    if (data) {
      setMarketPrices(data.map(d => ({
        date: d.date, avgPriceEUR: Number(d.avg_price_eur), minPriceEUR: Number(d.min_price_eur),
        maxPriceEUR: Number(d.max_price_eur), sampleSize: d.sample_size, fetchedAt: d.fetched_at,
      })));
    }
  };

  const loadFinancingOffers = async () => {
    const { data } = await supabase.from('financing_offers').select('*').order('created_at', { ascending: true }).limit(2);
    if (data) {
      setFinancingOffers(data.map(o => ({
        id: o.id, label: o.label, bankName: o.bank_name,
        purchasePrice: Number(o.purchase_price), downPayment: Number(o.down_payment),
        financedAmount: Number(o.financed_amount), durationMonths: o.duration_months,
        monthlyRate: Number(o.monthly_rate), interestRate: Number(o.interest_rate),
        balloonPayment: Number(o.balloon_payment), notes: o.notes ?? '',
      })));
    }
  };

  const setConfig = useCallback(async (c: FinanceConfig) => {
    setConfigState(c);
    const { data: existing } = await supabase.from('finance_config').select('id').limit(1).single();
    if (existing) {
      await supabase.from('finance_config').update({
        purchase_price: c.purchasePrice, down_payment: c.downPayment,
        financed_amount: c.financedAmount, start_date: c.startDate,
        duration_months: c.durationMonths, monthly_rate: c.monthlyRate,
        interest_rate: c.interestRate, balloon_payment: c.balloonPayment,
        vehicle_model: c.vehicleModel,
        vehicle_trim: c.vehicleTrim, vehicle_year: c.vehicleYear, vin: c.vin,
      } as any).eq('id', existing.id);
    }
  }, []);

  const addPayment = useCallback(async (payment: Omit<Payment, 'id'>) => {
    const { data } = await supabase.from('payments').insert({
      date: payment.date, amount: payment.amount, type: payment.type, note: payment.note ?? null,
    }).select().single();
    if (data) {
      setPaymentsState(prev => [{
        id: data.id, date: data.date, amount: Number(data.amount),
        type: data.type as Payment['type'], note: data.note ?? undefined,
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
    if (data?.success) await loadVehicle();
    return data;
  }, []);

  const refreshMarketPrices = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('fetch-market-prices');
    if (error) throw error;
    if (data?.success) await loadMarketPrices();
    return data;
  }, []);

  // Manual data entry
  const saveManualOdometer = useCallback(async (km: number) => {
    const { data: existing } = await supabase.from('tesla_vehicle_state').select('id').limit(1).single();
    if (existing) {
      await supabase.from('tesla_vehicle_state').update({ odometer_km: km, last_sync_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('tesla_vehicle_state').insert({ odometer_km: km, last_sync_at: new Date().toISOString() });
    }
    await loadVehicle();
  }, []);

  const saveManualMarketPrice = useCallback(async (data: { avgPrice: number; minPrice: number; maxPrice: number; sampleSize: number }) => {
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('market_price_daily').upsert({
      date: today, avg_price_eur: data.avgPrice, min_price_eur: data.minPrice,
      max_price_eur: data.maxPrice, sample_size: data.sampleSize, source: 'manual',
    }, { onConflict: 'date' });
    await loadMarketPrices();
  }, []);

  // Financing offers CRUD
  const addFinancingOffer = useCallback(async (offer: Omit<FinancingOffer, 'id'>) => {
    const { data } = await supabase.from('financing_offers').insert({
      label: offer.label, bank_name: offer.bankName, purchase_price: offer.purchasePrice,
      down_payment: offer.downPayment, financed_amount: offer.financedAmount,
      duration_months: offer.durationMonths, monthly_rate: offer.monthlyRate,
      interest_rate: offer.interestRate, balloon_payment: offer.balloonPayment, notes: offer.notes,
    }).select().single();
    if (data) await loadFinancingOffers();
  }, []);

  const updateFinancingOffer = useCallback(async (id: string, updates: Partial<FinancingOffer>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.label !== undefined) dbUpdates.label = updates.label;
    if (updates.bankName !== undefined) dbUpdates.bank_name = updates.bankName;
    if (updates.purchasePrice !== undefined) dbUpdates.purchase_price = updates.purchasePrice;
    if (updates.downPayment !== undefined) dbUpdates.down_payment = updates.downPayment;
    if (updates.financedAmount !== undefined) dbUpdates.financed_amount = updates.financedAmount;
    if (updates.durationMonths !== undefined) dbUpdates.duration_months = updates.durationMonths;
    if (updates.monthlyRate !== undefined) dbUpdates.monthly_rate = updates.monthlyRate;
    if (updates.interestRate !== undefined) dbUpdates.interest_rate = updates.interestRate;
    if (updates.balloonPayment !== undefined) dbUpdates.balloon_payment = updates.balloonPayment;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    await supabase.from('financing_offers').update(dbUpdates).eq('id', id);
    await loadFinancingOffers();
  }, []);

  const deleteFinancingOffer = useCallback(async (id: string) => {
    await supabase.from('financing_offers').delete().eq('id', id);
    await loadFinancingOffers();
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

  const resetAllData = useCallback(async () => {
    await supabase.from('payments').delete().neq('id', '');
    await supabase.from('financing_offers').delete().neq('id', '');
    await supabase.from('market_price_daily').delete().neq('id', '');
    await supabase.from('tesla_vehicle_state').delete().neq('id', '');
    await supabase.from('finance_config').delete().neq('id', '');
    setPaymentsState([]);
    setFinancingOffers([]);
    setMarketPrices([]);
    setVehicle(null);
    setConfigState(DEFAULT_FINANCE_CONFIG);
  }, []);

  return {
    config, setConfig,
    payments, addPayment, updatePayment, deletePayment,
    totalPaid, remainingDebt, progressPercent,
    vehicle, marketPrices, latestMarketPrice,
    loading, saveTeslaToken, syncTeslaVehicle, refreshMarketPrices,
    saveManualOdometer, saveManualMarketPrice,
    financingOffers, addFinancingOffer, updateFinancingOffer, deleteFinancingOffer,
    resetAllData,
  };
}
