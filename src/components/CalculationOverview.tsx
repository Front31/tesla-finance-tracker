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

export default function CalculationOverview({ config, payments, totalPaid, remainingDebt, currentRateAmount, paidRatesCount }: CalculationOverviewProps) {
  const calc = useMemo(() => {
    const financedAmount = config.purchasePrice - config.downPayment;
    const totalRatePayments = payments.filter(p => p.type === 'rate').reduce((s, p) => s + p.amount, 0);
    const totalSondertilgungen = payments.filter(p => p.type === 'sondertilgung').reduce((s, p) => s + p.amount, 0);
    const totalFees = payments.filter(p => p.type === 'gebuehr').reduce((s, p) => s + p.amount, 0);
    const totalOther = payments.filter(p => p.type === 'sonstiges').reduce((s, p) => s + p.amount, 0);
    const remainingRates = config.durationMonths - paidRatesCount;
    const projectedRemainingCost = remainingRates * currentRateAmount + config.balloonPayment;
    const totalProjectedCost = totalPaid + projectedRemainingCost;
    const interestEstimate = totalProjectedCost - config.purchasePrice;

    return {
      financedAmount,
      totalRatePayments,
      totalSondertilgungen,
      totalFees,
      totalOther,
      remainingRates,
      projectedRemainingCost,
      totalProjectedCost,
      interestEstimate,
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
