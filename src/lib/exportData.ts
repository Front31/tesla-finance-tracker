import { FinanceConfig, Payment, TeslaVehicleState, MarketPriceEntry, FinancingOffer, PAYMENT_TYPE_LABELS } from '@/types/finance';

const fmt = (v: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v);

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

const fmtDateTime = (d: string) =>
  d ? new Date(d).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

interface ExportData {
  config: FinanceConfig;
  payments: Payment[];
  totalPaid: number;
  remainingDebt: number;
  currentRateAmount: number;
  paidRatesCount: number;
  vehicle: TeslaVehicleState | null;
  latestMarketPrice: MarketPriceEntry | null;
  financingOffers: FinancingOffer[];
}

function buildCSV(data: ExportData): string {
  const lines: string[] = [];
  const sep = ';';
  const add = (...cols: string[]) => lines.push(cols.join(sep));
  const blank = () => lines.push('');

  // === FINANZIERUNGSÜBERSICHT ===
  add('FINANZIERUNGSÜBERSICHT');
  blank();
  add('Eigenschaft', 'Wert');
  add('Kaufpreis', fmt(data.config.purchasePrice));
  add('Anzahlung', fmt(data.config.downPayment));
  add('Finanzierter Betrag', fmt(data.config.financedAmount));
  add('Startdatum', fmtDate(data.config.startDate));
  add('Laufzeit (Monate)', String(data.config.durationMonths));
  add('Monatliche Basis-Rate', fmt(data.config.monthlyRate));
  add('Aktuelle Rate (nach Sondertilgungen)', fmt(data.currentRateAmount));
  add('Zinssatz', `${data.config.interestRate}%`);
  if (data.config.balloonPayment > 0) {
    add('Schlussrate', fmt(data.config.balloonPayment));
  }
  blank();

  // === STATUS ===
  add('AKTUELLER STATUS');
  blank();
  add('Eigenschaft', 'Wert');
  add('Bezahlte Raten', `${data.paidRatesCount} von ${data.config.durationMonths}`);
  add('Verbleibende Raten', String(data.config.durationMonths - data.paidRatesCount));
  add('Summe aller Zahlungen (inkl. Anzahlung)', fmt(data.totalPaid));
  add('Restschuld', fmt(data.remainingDebt));
  blank();

  // === FAHRZEUG ===
  add('FAHRZEUGDATEN');
  blank();
  add('Eigenschaft', 'Wert');
  add('Modell', data.config.vehicleModel || '–');
  add('Trim', data.config.vehicleTrim || '–');
  add('Baujahr', String(data.config.vehicleYear || '–'));
  add('VIN', data.config.vin || '–');
  if (data.vehicle) {
    add('Kilometerstand', `${data.vehicle.odometerKm.toLocaleString('de-DE')} km`);
    add('Letzter Sync', data.vehicle.lastSyncAt ? fmtDateTime(data.vehicle.lastSyncAt) : '–');
  }
  blank();

  // === MARKTPREIS ===
  if (data.latestMarketPrice) {
    add('MARKTPREIS (AKTUELL)');
    blank();
    add('Eigenschaft', 'Wert');
    add('Ø Preis', fmt(data.latestMarketPrice.avgPriceEUR));
    add('Min. Preis', fmt(data.latestMarketPrice.minPriceEUR));
    add('Max. Preis', fmt(data.latestMarketPrice.maxPriceEUR));
    add('Anzahl Vergleiche', String(data.latestMarketPrice.sampleSize));
    add('Datum', fmtDate(data.latestMarketPrice.date));
    blank();
  }

  // === SONDERTILGUNGEN & AUSWIRKUNGEN ===
  const sondertilgungen = data.payments.filter(p => p.type === 'sondertilgung').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (sondertilgungen.length > 0) {
    add('SONDERTILGUNGEN & AUSWIRKUNGEN');
    blank();

    const start = new Date(data.config.startDate);
    const startMonth = start.getMonth();
    const startYear = start.getFullYear();
    let cumulativeReduction = 0;

    add('Datum', 'Betrag', 'Verbleibende Monate', 'Reduktion/Monat', 'Rate vorher', 'Rate nachher');
    for (const st of sondertilgungen) {
      const pDate = new Date(st.date);
      const stIdx = (pDate.getFullYear() - startYear) * 12 + (pDate.getMonth() - startMonth);
      const remaining = data.config.durationMonths - (stIdx + 1);
      if (remaining <= 0) continue;
      const rateBefore = Math.max(0, Math.round((data.config.monthlyRate - cumulativeReduction) * 100) / 100);
      const reduction = st.amount / remaining;
      cumulativeReduction += reduction;
      const rateAfter = Math.max(0, Math.round((data.config.monthlyRate - cumulativeReduction) * 100) / 100);
      add(fmtDate(st.date), fmt(st.amount), String(remaining), fmt(reduction), fmt(rateBefore), fmt(rateAfter));
    }
    blank();
  }

  // === ALLE ZAHLUNGEN ===
  add('ZAHLUNGSHISTORIE');
  blank();
  add('Datum', 'Typ', 'Betrag', 'Notiz');
  const sorted = [...data.payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  for (const p of sorted) {
    add(fmtDate(p.date), PAYMENT_TYPE_LABELS[p.type] || p.type, fmt(p.amount), (p.note || '').replace(/;/g, ','));
  }
  blank();

  // === AUFSCHLÜSSELUNG NACH TYP ===
  add('ZAHLUNGEN NACH TYP');
  blank();
  add('Typ', 'Anzahl', 'Summe');
  const types: Payment['type'][] = ['rate', 'sondertilgung', 'gebuehr', 'sonstiges'];
  for (const t of types) {
    const ofType = data.payments.filter(p => p.type === t);
    if (ofType.length > 0) {
      add(PAYMENT_TYPE_LABELS[t], String(ofType.length), fmt(ofType.reduce((s, p) => s + p.amount, 0)));
    }
  }
  add('Anzahlung', '1', fmt(data.config.downPayment));
  add('Gesamt', '', fmt(data.totalPaid));
  blank();

  // === FINANZIERUNGSANGEBOTE ===
  if (data.financingOffers.length > 0) {
    add('FINANZIERUNGSANGEBOTE (REFERENZ)');
    blank();
    add('Label', 'Bank', 'Kaufpreis', 'Anzahlung', 'Finanziert', 'Laufzeit', 'Rate', 'Zins', 'Schlussrate', 'Notizen');
    for (const o of data.financingOffers) {
      add(
        o.label, o.bankName, fmt(o.purchasePrice), fmt(o.downPayment),
        fmt(o.financedAmount), `${o.durationMonths} Mon.`, fmt(o.monthlyRate),
        `${o.interestRate}%`, fmt(o.balloonPayment), (o.notes || '').replace(/;/g, ',')
      );
    }
    blank();
  }

  // === PROJEKTIONSDATEN ===
  const remainingRates = data.config.durationMonths - data.paidRatesCount;
  const projectedRemaining = remainingRates * data.currentRateAmount + data.config.balloonPayment;
  const projectedTotal = data.totalPaid + projectedRemaining;

  add('PROJEKTION');
  blank();
  add('Eigenschaft', 'Wert');
  add('Noch zu zahlen (Raten + Schlussrate)', fmt(projectedRemaining));
  add('Gesamtkosten (projiziert)', fmt(projectedTotal));
  add('Geschätzte Zinskosten', fmt(Math.max(0, projectedTotal - data.config.purchasePrice)));

  return lines.join('\n');
}

export function exportToCSV(data: ExportData) {
  const csv = buildCSV(data);
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().split('T')[0];
  a.download = `finanzierung-export-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
