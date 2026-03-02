import { useMemo } from 'react';
import { motion } from 'framer-motion';
import teslaImage from '@/assets/tesla-model3.png';
import { FinanceConfig, Payment } from '@/types/finance';
import { generateMonthlyRates } from '@/lib/rateCalculation';

interface HeroSectionProps {
  totalPaid: number;
  totalPrice: number;
  progressPercent: number;
  remainingDebt: number;
  config: FinanceConfig;
  payments: Payment[];
}

const formatEUR = (v: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v);

interface PaymentSegment {
  label: string;
  amount: number;
  color: string;
  dashed?: boolean;
}


export default function HeroSection({ totalPaid, totalPrice, progressPercent, remainingDebt, config, payments }: HeroSectionProps) {
  const segments = useMemo(() => {
    const segs: PaymentSegment[] = [];

    // 1. Anzahlung
    if (config.downPayment > 0) {
      segs.push({ label: 'Anzahlung', amount: config.downPayment, color: 'hsl(var(--primary))' });
    }

    // Use shared rate calculation (includes overpayment handling)
    const { rates: allRates } = generateMonthlyRates(config, payments);
    const sondertilgungen = payments.filter(p => p.type === 'sondertilgung').sort((a, b) => a.date.localeCompare(b.date));

    const start = new Date(config.startDate);
    const startMonth = start.getMonth();
    const startYear = start.getFullYear();
    const monthIndexOf = (d: Date) => (d.getFullYear() - startYear) * 12 + (d.getMonth() - startMonth);

    // Map Sondertilgungen to their month index
    const sonderByMonth = new Map<number, number>();
    for (const st of sondertilgungen) {
      const idx = monthIndexOf(new Date(st.date));
      sonderByMonth.set(idx, (sonderByMonth.get(idx) || 0) + st.amount);
    }

    // Map overpayments to their month index
    const overpaymentByMonth = new Map<number, number>();
    for (let i = 0; i < allRates.length; i++) {
      if (allRates[i].overpayment > 0) {
        overpaymentByMonth.set(i, allRates[i].overpayment);
      }
    }

    const rateColors = [
      'hsl(var(--chart-1, 220 70% 50%))',
      'hsl(var(--chart-2, 160 60% 45%))',
      'hsl(var(--chart-3, 30 80% 55%))',
      'hsl(var(--chart-4, 280 65% 60%))',
    ];
    let colorIdx = 0;

    // Paid months
    const paidMonths = new Set<number>();
    for (let i = 0; i < allRates.length; i++) {
      if (allRates[i].isPaid || allRates[i].paidAmount > 0) {
        paidMonths.add(i);
      }
    }

    // Walk through months, grouping consecutive same-rate months
    let currentRate = -1;
    let currentCount = 0;

    const flushRateTier = () => {
      if (currentCount > 0 && currentRate > 0) {
        segs.push({
          label: `${currentCount}× ${formatEUR(currentRate)}`,
          amount: currentRate * currentCount,
          color: rateColors[colorIdx % rateColors.length],
        });
        colorIdx++;
      }
      currentCount = 0;
    };

    for (let i = 0; i < config.durationMonths; i++) {
      // Insert Sondertilgung at its chronological position
      if (sonderByMonth.has(i)) {
        if (currentCount > 0) flushRateTier();
        segs.push({
          label: 'Sondertilgung',
          amount: sonderByMonth.get(i)!,
          color: 'hsl(var(--accent))',
        });
      }

      // Only include this month if it was actually paid
      if (!paidMonths.has(i)) continue;

      // Use expected amount from shared calculation (includes overpayment reductions)
      const rounded = Math.round(allRates[i].expectedAmount);
      if (rounded !== currentRate && currentCount > 0) {
        flushRateTier();
      }
      currentRate = rounded;
      currentCount++;

      // Insert overpayment as Sondertilgung segment after the rate
      if (overpaymentByMonth.has(i)) {
        flushRateTier();
        segs.push({
          label: 'Überzahlung → Sondertilgung',
          amount: overpaymentByMonth.get(i)!,
          color: 'hsl(var(--primary))',
        });
      }
    }
    flushRateTier();

    // Schlussrate (always shown, dashed red)
    if (config.balloonPayment > 0) {
      segs.push({
        label: 'Schlussrate',
        amount: config.balloonPayment,
        color: 'hsl(0 72% 51%)',
        dashed: true,
      });
    }

    // Gebühren & Sonstiges
    const otherPayments = payments.filter(p => p.type === 'gebuehr' || p.type === 'sonstiges');
    const otherSum = otherPayments.reduce((s, p) => s + p.amount, 0);
    if (otherSum > 0) {
      segs.push({ label: 'Sonstiges', amount: otherSum, color: 'hsl(var(--muted-foreground))' });
    }

    return segs;
  }, [config, payments]);

  // Use totalPrice as base for proportional widths
  const barBase = totalPrice;

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
        <div className="relative h-3 rounded-full bg-secondary overflow-hidden">
          {/* Regular segments from left */}
          <div className="absolute inset-0 flex">
            {segments.filter(s => !s.dashed).map((seg, i) => {
              const widthPercent = barBase > 0 ? (seg.amount / barBase) * 100 : 0;
              return (
                <motion.div
                  key={seg.label}
                  className="h-full"
                  style={{ backgroundColor: seg.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPercent}%` }}
                  transition={{ duration: 1.2, delay: 0.8 + i * 0.1, ease: 'easeOut' }}
                />
              );
            })}
          </div>
          {/* Schlussrate anchored to right end */}
          {segments.filter(s => s.dashed).map(seg => {
            const widthPercent = barBase > 0 ? (seg.amount / barBase) * 100 : 0;
            return (
              <motion.div
                key={seg.label}
                className="absolute right-0 top-0 h-full"
                style={{
                  backgroundImage: `repeating-linear-gradient(90deg, hsl(0 72% 51%) 0px, hsl(0 72% 51%) 4px, transparent 4px, transparent 8px)`,
                  opacity: 0.6,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${widthPercent}%` }}
                transition={{ duration: 1.2, delay: 1.2, ease: 'easeOut' }}
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
                {seg.dashed ? (
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0 border-2 border-dashed"
                    style={{ borderColor: 'hsl(0 72% 51%)' }}
                  />
                ) : (
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                )}
                <span className="text-xs text-muted-foreground">
                  {seg.label}: {formatEUR(seg.amount)}
                </span>
              </div>
            ))}
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