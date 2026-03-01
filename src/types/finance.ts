export interface FinanceConfig {
  purchasePrice: number;
  downPayment: number;
  financedAmount: number;
  startDate: string;
  durationMonths: number;
  monthlyRate: number;
  interestRate: number;
  balloonPayment: number;
  vehicleModel: string;
  vehicleTrim: string;
  vehicleYear: number;
  vin: string;
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  type: 'rate' | 'sondertilgung' | 'gebuehr' | 'sonstiges';
  note?: string;
}

export interface TeslaVehicleState {
  vin: string;
  model: string;
  trim: string;
  year: number;
  odometerKm: number;
  lastSyncAt: string;
}

export interface MarketPriceEntry {
  date: string;
  avgPriceEUR: number;
  minPriceEUR: number;
  maxPriceEUR: number;
  sampleSize: number;
  fetchedAt: string;
}

export interface FinancingOffer {
  id: string;
  label: string;
  bankName: string;
  purchasePrice: number;
  downPayment: number;
  financedAmount: number;
  durationMonths: number;
  monthlyRate: number;
  interestRate: number;
  balloonPayment: number;
  notes: string;
}

export const PAYMENT_TYPE_LABELS: Record<Payment['type'], string> = {
  rate: 'Rate',
  sondertilgung: 'Sondertilgung',
  gebuehr: 'Gebühr',
  sonstiges: 'Sonstiges',
};

export const DEFAULT_FINANCE_CONFIG: FinanceConfig = {
  purchasePrice: 42990,
  downPayment: 10000,
  financedAmount: 32990,
  startDate: '2024-06-01',
  durationMonths: 48,
  monthlyRate: 450,
  interestRate: 3.99,
  balloonPayment: 0,
  vehicleModel: 'Model 3',
  vehicleTrim: 'Long Range',
  vehicleYear: 2024,
  vin: '',
};

export const EMPTY_FINANCE_CONFIG: FinanceConfig = {
  purchasePrice: 0,
  downPayment: 0,
  financedAmount: 0,
  startDate: '',
  durationMonths: 0,
  monthlyRate: 0,
  interestRate: 0,
  balloonPayment: 0,
  vehicleModel: '',
  vehicleTrim: '',
  vehicleYear: 0,
  vin: '',
};
