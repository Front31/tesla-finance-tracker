import { FinanceConfig, Payment } from '@/types/finance';

export interface MonthlyRate {
  key: string;
  label: string;
  month: number;
  year: number;
  expectedAmount: number;
  paidAmount: number;
  isPaid: boolean;
  isPartial: boolean;
  isFuture: boolean;
  overpayment: number;
  matchingPayments: Payment[];
}

export interface OverpaymentEffect {
  rateLabel: string;
  date: string;
  overpaymentAmount: number;
  rateBefore: number;
  rateAfter: number;
  remainingMonths: number;
  reductionPerMonth: number;
}

/**
 * Check if a payment matches a specific rate by note label or date fallback.
 */
export function matchesRate(payment: Payment, month: number, year: number, label: string): boolean {
  if (payment.type !== 'rate') return false;
  if (payment.note && payment.note.includes(label)) return true;
  const pDate = new Date(payment.date);
  if (pDate.getMonth() === month && pDate.getFullYear() === year) {
    if (!payment.note || !payment.note.includes('Rate ')) return true;
  }
  return false;
}

/**
 * Generate monthly rates with overpayment detection.
 * Overpayments are treated as implicit Sondertilgungen and reduce subsequent rates.
 */
export function generateMonthlyRates(config: FinanceConfig, payments: Payment[]): { rates: MonthlyRate[]; overpaymentEffects: OverpaymentEffect[] } {
  const start = new Date(config.startDate);
  const startMonth = start.getMonth();
  const startYear = start.getFullYear();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Compute reductions from explicit Sondertilgungen
  const sondertilgungen = payments.filter(p => p.type === 'sondertilgung');
  const monthIndexOf = (m: number, y: number) => (y - startYear) * 12 + (m - startMonth);

  const explicitReductions = new Array(config.durationMonths).fill(0);
  for (const st of sondertilgungen) {
    const pDate = new Date(st.date);
    const stMonthIdx = monthIndexOf(pDate.getMonth(), pDate.getFullYear());
    const firstAffected = stMonthIdx + 1;
    const remainingCount = config.durationMonths - firstAffected;
    if (remainingCount <= 0) continue;
    const perMonth = st.amount / remainingCount;
    for (let i = firstAffected; i < config.durationMonths; i++) {
      explicitReductions[i] += perMonth;
    }
  }

  const rates: MonthlyRate[] = [];
  const overpaymentEffects: OverpaymentEffect[] = [];
  let cumulativeOverpaymentReduction = 0;

  for (let i = 0; i < config.durationMonths; i++) {
    const month = (startMonth + i) % 12;
    const year = startYear + Math.floor((startMonth + i) / 12);
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    const label = `Rate ${String(month + 1).padStart(2, '0')}/${String(year).slice(-2)}`;
    const isFuture = year > currentYear || (year === currentYear && month > currentMonth);

    const expectedAmount = Math.max(0, Math.round((config.monthlyRate - explicitReductions[i] - cumulativeOverpaymentReduction) * 100) / 100);

    const matchingPayments = payments.filter(p => matchesRate(p, month, year, label));
    const paidAmount = matchingPayments.reduce((sum, p) => sum + p.amount, 0);

    let overpayment = 0;
    if (paidAmount > expectedAmount && expectedAmount > 0) {
      overpayment = Math.round((paidAmount - expectedAmount) * 100) / 100;
      const remainingMonths = config.durationMonths - (i + 1);
      if (remainingMonths > 0) {
        const reductionPerMonth = overpayment / remainingMonths;
        const rateBefore = expectedAmount;
        cumulativeOverpaymentReduction += reductionPerMonth;
        const rateAfter = Math.max(0, Math.round((config.monthlyRate - explicitReductions[i + 1 < config.durationMonths ? i + 1 : i] - cumulativeOverpaymentReduction) * 100) / 100);

        overpaymentEffects.push({
          rateLabel: label,
          date: matchingPayments[0]?.date || '',
          overpaymentAmount: overpayment,
          rateBefore,
          rateAfter,
          remainingMonths,
          reductionPerMonth,
        });
      }
    }

    const isPaid = paidAmount >= expectedAmount && expectedAmount > 0;
    const isPartial = paidAmount > 0 && paidAmount < expectedAmount;

    rates.push({ key, label, month, year, expectedAmount, paidAmount, isPaid, isPartial, isFuture, overpayment, matchingPayments });
  }

  return { rates, overpaymentEffects };
}

/**
 * Get open (unpaid) rates including next month.
 */
export function getOpenRates(config: FinanceConfig, payments: Payment[]): MonthlyRate[] {
  const { rates } = generateMonthlyRates(config, payments);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const nextMonth = (currentMonth + 1) % 12;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

  return rates.filter(r => {
    const isPastOrCurrent = r.year < currentYear || (r.year === currentYear && r.month <= currentMonth);
    const isNextMonth = r.year === nextYear && r.month === nextMonth;
    return (isPastOrCurrent || isNextMonth) && !r.isPaid;
  });
}

/**
 * Get a map of payment IDs that have overpayment portions.
 */
export function getOverpaymentsByPaymentId(config: FinanceConfig, payments: Payment[]): Map<string, number> {
  const { rates } = generateMonthlyRates(config, payments);
  const map = new Map<string, number>();

  for (const rate of rates) {
    if (rate.overpayment > 0 && rate.matchingPayments.length > 0) {
      // Attribute overpayment to the last matching payment
      const lastPayment = rate.matchingPayments[rate.matchingPayments.length - 1];
      map.set(lastPayment.id, (map.get(lastPayment.id) || 0) + rate.overpayment);
    }
  }

  return map;
}
