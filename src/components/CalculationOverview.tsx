import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FinanceConfig, Payment } from '@/types/finance';

interface CalculationOverviewProps {
  config: FinanceConfig;
  payments: Payment[];
  totalPaid: number;
  remainingDebt: number;
  currentRateAmount: number;
  paidRatesCount: number;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v);

const fmtPct = (v: number) =>
  new Intl.NumberFormat('de-DE', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v / 100);

interface RowProps {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  indent?: boolean;
}

function Row({ label, value, bold, muted, indent }: RowProps) {
  return (
    <div className={`flex justify-between items-center py-1.5 ${indent ? 'pl-4' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold text-foreground' : muted ? 'text-muted-foreground' : 'text-foreground'}`}>
        {label}
      </span>
      <span className={`text-sm tabular-nums ${bold ? 'font-semibold text-foreground' : muted ? 'text-muted-foreground' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

interface SondertilgungEffect {
  date: string;
  amount: number;
  rateBefore: number;
  rateAfter: number;
  remainingMonths: number;
  reductionPerMonth: number;
}

export default function CalculationOverview({ config, payments, totalPaid, remainingDebt, currentRateAmount, paidRatesCount }: CalculationOverviewProps) {
  const { calc, sondertilgungEffects } = useMemo(() => {
    const financedAmount = config.purchasePrice - config.downPayment;
    const totalRatePayments = payments.filter(p => p.type === 'rate').reduce((s, p) => s + p.amount, 0);
    const totalSondertilgungen = payments.filter(p => p.type === 'sondertilgung').reduce((s, p) => s + p.amount, 0);
    const totalFees = payments.filter(p => p.type === 'gebuehr').reduce((s, p) => s + p.amount, 0);
    const totalOther = payments.filter(p => p.type === 'sonstiges').reduce((s, p) => s + p.amount, 0);
    const remainingRates = config.durationMonths - paidRatesCount;
    const projectedRemainingCost = remainingRates * currentRateAmount + config.balloonPayment;
    const totalProjectedCost = totalPaid + projectedRemainingCost;
    const interestEstimate = totalProjectedCost - config.purchasePrice;

    // Compute Sondertilgung effects
    const start = new Date(config.startDate);
    const startMonth = start.getMonth();
    const startYear = start.getFullYear();
    const sondertilgungen = payments
      .filter(p => p.type === 'sondertilgung')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const effects: SondertilgungEffect[] = [];
    let cumulativeReduction = 0;

    for (const st of sondertilgungen) {
      const pDate = new Date(st.date);
      const stMonthIdx = (pDate.getFullYear() - startYear) * 12 + (pDate.getMonth() - startMonth);
      const remainingCount = config.durationMonths - (stMonthIdx + 1);
      if (remainingCount <= 0) continue;

      const rateBefore = Math.max(0, Math.round((config.monthlyRate - cumulativeReduction) * 100) / 100);
      const reductionPerMonth = st.amount / remainingCount;
      cumulativeReduction += reductionPerMonth;
      const rateAfter = Math.max(0, Math.round((config.monthlyRate - cumulativeReduction) * 100) / 100);

      effects.push({
        date: st.date,
        amount: st.amount,
        rateBefore,
        rateAfter,
        remainingMonths: remainingCount,
        reductionPerMonth,
      });
    }

    return {
      calc: { financedAmount, totalRatePayments, totalSondertilgungen, totalFees, totalOther, remainingRates, projectedRemainingCost, totalProjectedCost, interestEstimate },
      sondertilgungEffects: effects,
    };
  }, [config, payments, totalPaid, currentRateAmount, paidRatesCount]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Berechnungsübersicht</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* Purchase breakdown */}
        <Row label="Kaufpreis" value={fmt(config.purchasePrice)} bold />
        <Row label="Anzahlung" value={`– ${fmt(config.downPayment)}`} indent />
        <Row label="Finanzierter Betrag" value={fmt(calc.financedAmount)} bold />

        <Separator className="my-3" />

        {/* Financing terms */}
        <Row label="Monatliche Basis-Rate" value={fmt(config.monthlyRate)} />
        <Row label="Aktuelle Rate (nach Sondertilgungen)" value={fmt(currentRateAmount)} bold />
        <Row label="Zinssatz" value={fmtPct(config.interestRate)} />
        <Row label="Laufzeit" value={`${config.durationMonths} Monate`} />
        {config.balloonPayment > 0 && (
          <Row label="Schlussrate" value={fmt(config.balloonPayment)} />
        )}

        <Separator className="my-3" />

        {/* Sondertilgung effects */}
        {sondertilgungEffects.length > 0 && (
          <>
            <Row label="Auswirkungen der Sondertilgungen" value="" bold />
            {sondertilgungEffects.map((effect, i) => (
              <div key={i} className="pl-4 py-2 border-l-2 border-primary/30 ml-1 mb-2 space-y-0.5">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">
                    Sondertilgung am {fmtDate(effect.date)}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {fmt(effect.amount)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div className="flex justify-between">
                    <span>Verbleibende Raten zum Zeitpunkt</span>
                    <span className="tabular-nums">{effect.remainingMonths} Monate</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reduktion pro Monat</span>
                    <span className="tabular-nums">– {fmt(effect.reductionPerMonth)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rate vorher → nachher</span>
                    <span className="tabular-nums">{fmt(effect.rateBefore)} → {fmt(effect.rateAfter)}</span>
                  </div>
                </div>
              </div>
            ))}
            <Separator className="my-3" />
          </>
        )}

        {/* Payment status */}
        <Row label="Bezahlte Raten" value={`${paidRatesCount} von ${config.durationMonths}`} bold />
        <Row label="Verbleibende Raten" value={`${calc.remainingRates}`} />

        <Separator className="my-3" />

        {/* Payment breakdown */}
        <Row label="Geleistete Zahlungen" value="" bold />
        <Row label="Ratenzahlungen" value={fmt(calc.totalRatePayments)} indent />
        {calc.totalSondertilgungen > 0 && (
          <Row label="Sondertilgungen" value={fmt(calc.totalSondertilgungen)} indent />
        )}
        {calc.totalFees > 0 && (
          <Row label="Gebühren" value={fmt(calc.totalFees)} indent muted />
        )}
        {calc.totalOther > 0 && (
          <Row label="Sonstiges" value={fmt(calc.totalOther)} indent muted />
        )}
        <Row label="Summe inkl. Anzahlung" value={fmt(totalPaid)} bold />

        <Separator className="my-3" />

        {/* Remaining */}
        <Row label="Restschuld" value={fmt(remainingDebt)} bold />
        <Row label="Noch zu zahlen (Raten + Schlussrate)" value={fmt(calc.projectedRemainingCost)} muted />

        <Separator className="my-3" />

        {/* Projected totals */}
        <Row label="Gesamtkosten (projiziert)" value={fmt(calc.totalProjectedCost)} bold />
        <Row label="Geschätzte Zinskosten" value={fmt(Math.max(0, calc.interestEstimate))} muted />
      </CardContent>
    </Card>
  );
}
