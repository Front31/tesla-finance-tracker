import { motion } from 'framer-motion';
import { Car, Calendar, CreditCard, TrendingUp, Gauge, Clock } from 'lucide-react';
import { FinanceConfig, TeslaVehicleState, MarketPriceEntry, Payment } from '@/types/finance';

interface KPICardsProps {
  config: FinanceConfig;
  totalPaid: number;
  remainingDebt: number;
  vehicle: TeslaVehicleState | null;
  latestMarketPrice: MarketPriceEntry | null;
  openRatesCount: number;
  paidRatesCount: number;
  currentRateAmount: number;
}

const formatEUR = (v: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

const formatNum = (v: number) =>
  new Intl.NumberFormat('de-DE').format(v);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

interface KPIItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  delay?: number;
}

function KPIItem({ icon, label, value, sub, delay = 0 }: KPIItemProps) {
  return (
    <motion.div
      className="glass-card p-4 flex flex-col gap-2 pointer-events-none select-none"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <div className="flex items-center gap-2">
        <div className="text-muted-foreground">{icon}</div>
        <span className="kpi-label">{label}</span>
      </div>
      <span className="kpi-value">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </motion.div>
  );
}

export default function KPICards({ config, totalPaid, remainingDebt, vehicle, latestMarketPrice, openRatesCount, paidRatesCount, currentRateAmount }: KPICardsProps) {
  const kpis: KPIItemProps[] = [
    {
      icon: <CreditCard size={16} />,
      label: 'Kaufpreis',
      value: formatEUR(config.purchasePrice),
      sub: `Anzahlung: ${formatEUR(config.downPayment)}`,
    },
    {
      icon: <CreditCard size={16} />,
      label: 'Aktuelle Rate',
      value: formatEUR(currentRateAmount),
    },
    {
      icon: <Calendar size={16} />,
      label: 'Bezahlte Raten',
      value: `${paidRatesCount} von ${config.durationMonths}`,
    },
    {
      icon: <Calendar size={16} />,
      label: 'Laufzeit',
      value: `${config.durationMonths} Monate`,
      sub: `Start: ${formatDate(config.startDate)}`,
    },
    {
      icon: <Gauge size={16} />,
      label: 'Kilometerstand',
      value: vehicle ? `${formatNum(vehicle.odometerKm)} km` : '—',
      sub: vehicle?.lastSyncAt ? `Sync: ${formatDateTime(vehicle.lastSyncAt)}` : undefined,
    },
    {
      icon: <Car size={16} />,
      label: 'Fahrzeug',
      value: config.vehicleModel || vehicle?.model || '—',
      sub: `${config.vehicleTrim || vehicle?.trim || ''} · ${config.vehicleYear || vehicle?.year || ''}`,
    },
    {
      icon: <TrendingUp size={16} />,
      label: 'Ø Marktpreis (DE)',
      value: latestMarketPrice ? formatEUR(latestMarketPrice.avgPriceEUR) : '—',
      sub: latestMarketPrice
        ? `${formatEUR(latestMarketPrice.minPriceEUR)} – ${formatEUR(latestMarketPrice.maxPriceEUR)}`
        : undefined,
    },
    {
      icon: <Clock size={16} />,
      label: 'Offene Raten',
      value: `${openRatesCount}`,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {kpis.map((kpi, i) => (
        <KPIItem key={kpi.label} {...kpi} delay={0.6 + i * 0.05} />
      ))}
    </div>
  );
}
