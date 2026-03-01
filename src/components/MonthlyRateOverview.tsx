import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, AlertCircle, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FinanceConfig, Payment } from '@/types/finance';
import { generateMonthlyRates } from '@/lib/rateCalculation';

interface MonthlyRateOverviewProps {
  config: FinanceConfig;
  payments: Payment[];
}

const formatEUR = (v: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v);

export default function MonthlyRateOverview({ config, payments }: MonthlyRateOverviewProps) {
  const rates = useMemo(() => {
    const { rates: all } = generateMonthlyRates(config, payments);
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const futureLimit = new Date(currentYear, currentMonth + 5, 1);

    const filtered = all.filter(r => {
      const rateDate = new Date(r.year, r.month, 1);
      return rateDate <= futureLimit;
    });

    // Add Schlussrate if configured
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
          overpayment: 0,
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
                    {rate.overpayment > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/50 text-primary gap-0.5">
                        <ArrowDownRight size={10} />
                        {formatEUR(rate.overpayment)} Sondertilgung
                      </Badge>
                    )}
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
