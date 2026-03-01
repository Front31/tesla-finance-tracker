import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FinanceConfig, Payment } from '@/types/finance';

interface MonthlyRateOverviewProps {
  config: FinanceConfig;
  payments: Payment[];
}

interface MonthlyRate {
  key: string;
  label: string;
  month: number;
  year: number;
  expectedAmount: number;
  paidAmount: number;
  isPaid: boolean;
  isPartial: boolean;
  isFuture: boolean;
  matchingPayments: Payment[];
}

function generateMonthlyRates(config: FinanceConfig, payments: Payment[]): MonthlyRate[] {
  const start = new Date(config.startDate);
  const startMonth = start.getMonth();
  const startYear = start.getFullYear();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Collect all Sondertilgungen and compute per-month rate reductions
  const sondertilgungen = payments.filter(p => p.type === 'sondertilgung');

  // For each month index, calculate the effective expected rate
  // A Sondertilgung made in month index X reduces months X+1 .. end
  const monthIndexOf = (m: number, y: number) => (y - startYear) * 12 + (m - startMonth);

  // Build cumulative reduction per month
  const reductions = new Array(config.durationMonths).fill(0);

  for (const st of sondertilgungen) {
    const pDate = new Date(st.date);
    const stMonthIdx = monthIndexOf(pDate.getMonth(), pDate.getFullYear());
    // Remaining months AFTER the Sondertilgung month
    const firstAffected = stMonthIdx + 1;
    const remainingCount = config.durationMonths - firstAffected;
    if (remainingCount <= 0) continue;
    const perMonth = st.amount / remainingCount;
    for (let i = firstAffected; i < config.durationMonths; i++) {
      reductions[i] += perMonth;
    }
  }

  const rates: MonthlyRate[] = [];

  for (let i = 0; i < config.durationMonths; i++) {
    const month = (startMonth + i) % 12;
    const year = startYear + Math.floor((startMonth + i) / 12);
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    const label = `Rate ${String(month + 1).padStart(2, '0')}/${String(year).slice(-2)}`;

    const isFuture = year > currentYear || (year === currentYear && month > currentMonth);

    const expectedAmount = Math.max(0, Math.round((config.monthlyRate - reductions[i]) * 100) / 100);

    // Find matching payments for this month (type 'rate')
    const matchingPayments = payments.filter(p => {
      if (p.type !== 'rate') return false;
      const pDate = new Date(p.date);
      return pDate.getMonth() === month && pDate.getFullYear() === year;
    });

    const paidAmount = matchingPayments.reduce((sum, p) => sum + p.amount, 0);
    const isPaid = paidAmount >= expectedAmount;
    const isPartial = paidAmount > 0 && paidAmount < expectedAmount;

    rates.push({
      key,
      label,
      month,
      year,
      expectedAmount,
      paidAmount,
      isPaid,
      isPartial,
      isFuture,
      matchingPayments,
    });
  }

  return rates;
}

export function getOpenRates(config: FinanceConfig, payments: Payment[]): MonthlyRate[] {
  const rates = generateMonthlyRates(config, payments);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return rates.filter(r => {
    const isPastOrCurrent = r.year < currentYear || (r.year === currentYear && r.month <= currentMonth);
    return isPastOrCurrent && !r.isPaid;
  });
}

const formatEUR = (v: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v);

export default function MonthlyRateOverview({ config, payments }: MonthlyRateOverviewProps) {
  const rates = useMemo(() => {
    const all = generateMonthlyRates(config, payments);
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    // Next month
    const nextMonth = (currentMonth + 1) % 12;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

    // Show past, current, and next month — newest first
    const filtered = all.filter(r => {
      const isPastOrCurrent = r.year < currentYear || (r.year === currentYear && r.month <= currentMonth);
      const isNextMonth = r.year === nextYear && r.month === nextMonth;
      return isPastOrCurrent || isNextMonth;
    });

    // Add Schlussrate as last entry if configured
    if (config.balloonPayment > 0) {
      const lastRate = all[all.length - 1];
      if (lastRate) {
        const schlussMonth = (lastRate.month + 1) % 12;
        const schlussYear = lastRate.month === 11 ? lastRate.year + 1 : lastRate.year;
        const schlussKey = `${schlussYear}-${String(schlussMonth + 1).padStart(2, '0')}-schluss`;
        const schlussLabel = `Schlussrate ${String(schlussMonth + 1).padStart(2, '0')}/${String(schlussYear).slice(-2)}`;
        const schlussIsFuture = schlussYear > currentYear || (schlussYear === currentYear && schlussMonth > currentMonth);

        const schlussPayments = payments.filter(p => {
          if (p.type !== 'sonstiges' && p.type !== 'rate') return false;
          const pDate = new Date(p.date);
          return pDate.getMonth() === schlussMonth && pDate.getFullYear() === schlussYear && p.note?.toLowerCase().includes('schluss');
        });
        const schlussPaid = schlussPayments.reduce((sum, p) => sum + p.amount, 0);

        filtered.push({
          key: schlussKey,
          label: schlussLabel,
          month: schlussMonth,
          year: schlussYear,
          expectedAmount: config.balloonPayment,
          paidAmount: schlussPaid,
          isPaid: schlussPaid >= config.balloonPayment,
          isPartial: schlussPaid > 0 && schlussPaid < config.balloonPayment,
          isFuture: schlussIsFuture,
          matchingPayments: schlussPayments,
        });
      }
    }

    return filtered.reverse();
  }, [config, payments]);

  if (rates.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Noch keine Raten fällig.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Monatliche Raten</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rates.map((rate, i) => {
          const percent = Math.min(100, (rate.paidAmount / rate.expectedAmount) * 100);
          return (
            <motion.div
              key={rate.key}
              className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card/50"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              {/* Status icon */}
              <div className="shrink-0">
                {rate.isPaid ? (
                  <Check size={18} className="text-green-500" />
                ) : rate.isPartial ? (
                  <AlertCircle size={18} className="text-yellow-500" />
                ) : (
                  <Clock size={18} className="text-muted-foreground" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{rate.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatEUR(rate.paidAmount)} / {formatEUR(rate.expectedAmount)}
                    </span>
                    <Badge
                      variant={rate.isPaid ? 'default' : rate.isPartial ? 'secondary' : rate.isFuture ? 'outline' : 'destructive'}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {rate.isPaid ? 'Bezahlt' : rate.isPartial ? 'Teilweise' : rate.isFuture ? 'Ausstehend' : 'Offen'}
                    </Badge>
                  </div>
                </div>
                <Progress value={percent} className="h-1.5" />
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
