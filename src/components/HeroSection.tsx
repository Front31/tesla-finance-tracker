import { useMemo } from 'react';
import { motion } from 'framer-motion';
import teslaImage from '@/assets/tesla-model3.png';
import { FinanceConfig, Payment } from '@/types/finance';

interface HeroSectionProps {
  totalPaid: number;
  totalPrice: number;
  progressPercent: number;
  remainingDebt: number;
  config: FinanceConfig;
  payments: Payment[];
}

const formatEUR = (v: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

interface PaymentSegment {
  label: string;
  amount: number;
  color: string;
}

export default function HeroSection({ totalPaid, totalPrice, progressPercent, remainingDebt, config, payments }: HeroSectionProps) {
  const segments = useMemo(() => {
    const segs: PaymentSegment[] = [];

    // 1. Anzahlung
    if (config.downPayment > 0) {
      segs.push({ label: 'Anzahlung', amount: config.downPayment, color: 'hsl(var(--primary))' });
    }

    // 2. Sondertilgungen
    const sondertilgungen = payments.filter(p => p.type === 'sondertilgung');
    const sonderSum = sondertilgungen.reduce((s, p) => s + p.amount, 0);
    if (sonderSum > 0) {
      segs.push({ label: 'Sondertilgungen', amount: sonderSum, color: 'hsl(var(--accent))' });
    }

    // 3. Raten — group by effective rate amount
    const ratePayments = payments.filter(p => p.type === 'rate');
    const rateGroups = new Map<number, number>();
    for (const p of ratePayments) {
      // Round to nearest euro for grouping
      const key = Math.round(p.amount);
      rateGroups.set(key, (rateGroups.get(key) ?? 0) + p.amount);
    }

    // Sort groups descending by amount per rate
    const sortedGroups = [...rateGroups.entries()].sort((a, b) => b[0] - a[0]);
    const rateColors = [
      'hsl(var(--chart-1, 220 70% 50%))',
      'hsl(var(--chart-2, 160 60% 45%))',
      'hsl(var(--chart-3, 30 80% 55%))',
      'hsl(var(--chart-4, 280 65% 60%))',
    ];

    sortedGroups.forEach(([rateAmount, total], i) => {
      segs.push({
        label: `Raten à ${formatEUR(rateAmount)}`,
        amount: total,
        color: rateColors[i % rateColors.length],
      });
    });

    // 4. Gebühren & Sonstiges
    const otherPayments = payments.filter(p => p.type === 'gebuehr' || p.type === 'sonstiges');
    const otherSum = otherPayments.reduce((s, p) => s + p.amount, 0);
    if (otherSum > 0) {
      segs.push({ label: 'Sonstiges', amount: otherSum, color: 'hsl(var(--muted-foreground))' });
    }

    return segs;
  }, [config, payments]);

  const paidTotal = segments.reduce((s, seg) => s + seg.amount, 0);

  return (
    <div className="relative flex flex-col items-center gap-6 py-8 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-center"
      >
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Tesla Model 3
        </h1>
        <p className="text-muted-foreground mt-1 text-sm font-medium">Finanzierungs-Tracker</p>
      </motion.div>

      <motion.img
        src={teslaImage}
        alt="Tesla Model 3"
        className="w-full max-w-xl md:max-w-2xl object-contain drop-shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
      />

      {/* Progress Section */}
      <motion.div
        className="w-full max-w-lg glass-card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <div className="flex justify-between items-baseline mb-3">
          <span className="text-sm font-medium text-muted-foreground">Bereits abbezahlt</span>
          <span className="text-sm font-semibold text-foreground">{progressPercent.toFixed(1)}%</span>
        </div>

        {/* Segmented progress bar */}
        <div className="relative h-3 rounded-full bg-secondary overflow-hidden flex">
          {segments.map((seg, i) => {
            const widthPercent = totalPrice > 0 ? (seg.amount / totalPrice) * 100 : 0;
            return (
              <motion.div
                key={seg.label}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ backgroundColor: seg.color }}
                initial={{ width: 0 }}
                animate={{ width: `${widthPercent}%` }}
                transition={{ duration: 1.2, delay: 0.8 + i * 0.1, ease: 'easeOut' }}
              />
            );
          })}
        </div>

        <div className="flex justify-between mt-3">
          <div>
            <span className="text-lg font-bold text-foreground">{formatEUR(totalPaid)}</span>
            <span className="text-muted-foreground text-sm ml-1">bezahlt</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-foreground">{formatEUR(totalPrice)}</span>
            <span className="text-muted-foreground text-sm ml-1">gesamt</span>
          </div>
        </div>

        {/* Segment legend */}
        {segments.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
            {segments.map(seg => (
              <div key={seg.label} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-xs text-muted-foreground">
                  {seg.label}: {formatEUR(seg.amount)}
                </span>
              </div>
            ))}
            {config.balloonPayment > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0 border-2 border-foreground/30 bg-transparent" />
                <span className="text-xs text-muted-foreground">
                  Schlussrate: {formatEUR(config.balloonPayment)}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="mt-2 text-center">
          <span className="text-sm text-muted-foreground">Restschuld: </span>
          <span className="text-sm font-semibold text-foreground">{formatEUR(remainingDebt)}</span>
        </div>
      </motion.div>
    </div>
  );
}
