import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HeroSection from '@/components/HeroSection';
import KPICards from '@/components/KPICards';
import PaymentDialog from '@/components/PaymentDialog';
import PaymentHistory from '@/components/PaymentHistory';
import FinanceSettings from '@/components/FinanceSettings';
import MonthlyRateOverview from '@/components/MonthlyRateOverview';
import FinancingOffers from '@/components/FinancingOffers';
import CalculationOverview from '@/components/CalculationOverview';
import { useFinanceData } from '@/hooks/useFinanceData';
import { Payment } from '@/types/finance';
import { getOpenRates } from '@/components/MonthlyRateOverview';

const Index = () => {
  const {
    config, setConfig,
    payments, addPayment, updatePayment, deletePayment,
    totalPaid, remainingDebt, progressPercent,
    vehicle, marketPrices, latestMarketPrice,
    loading, saveTeslaToken, syncTeslaVehicle, refreshMarketPrices,
    saveManualOdometer, saveManualMarketPrice,
    financingOffers, addFinancingOffer, updateFinancingOffer, deleteFinancingOffer,
    resetAllData,
  } = useFinanceData();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const openRatesCount = useMemo(() => getOpenRates(config, payments).length, [config, payments]);

  const { paidRatesCount, currentRateAmount } = useMemo(() => {
    const start = new Date(config.startDate);
    const startMonth = start.getMonth();
    const startYear = start.getFullYear();
    const now = new Date();
    const nowIdx = (now.getFullYear() - startYear) * 12 + (now.getMonth() - startMonth);

    // Compute reductions from Sondertilgungen
    const sondertilgungen = payments.filter(p => p.type === 'sondertilgung');
    const reductions = new Array(config.durationMonths).fill(0);
    for (const st of sondertilgungen) {
      const d = new Date(st.date);
      const stIdx = (d.getFullYear() - startYear) * 12 + (d.getMonth() - startMonth);
      const firstAffected = stIdx + 1;
      const remaining = config.durationMonths - firstAffected;
      if (remaining <= 0) continue;
      const perMonth = st.amount / remaining;
      for (let i = firstAffected; i < config.durationMonths; i++) reductions[i] += perMonth;
    }

    // Find next unpaid rate index for current rate amount
    let paid = 0;
    let nextRateAmount = config.monthlyRate;
    for (let i = 0; i < config.durationMonths; i++) {
      const month = (startMonth + i) % 12;
      const year = startYear + Math.floor((startMonth + i) / 12);
      const matching = payments.filter(p => {
        if (p.type !== 'rate') return false;
        const d = new Date(p.date);
        return d.getMonth() === month && d.getFullYear() === year;
      });
      const paidAmt = matching.reduce((s, p) => s + p.amount, 0);
      const expected = Math.max(0, Math.round((config.monthlyRate - reductions[i]) * 100) / 100);
      if (paidAmt >= expected * 0.5) {
        paid++;
      } else if (i >= nowIdx) {
        nextRateAmount = expected;
        break;
      }
    }
    return { paidRatesCount: paid, currentRateAmount: nextRateAmount };
  }, [config, payments]);

  const handleEdit = (payment: Payment) => {
    setEditPayment(payment);
    setPaymentDialogOpen(true);
  };

  const handleNewPayment = () => {
    setEditPayment(null);
    setPaymentDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Laden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 pb-12">
        <HeroSection
          totalPaid={totalPaid}
          totalPrice={config.purchasePrice}
          progressPercent={progressPercent}
          remainingDebt={remainingDebt}
          config={config}
          payments={payments}
        />

        {/* Action Buttons */}
        <motion.div
          className="flex flex-wrap gap-3 justify-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <Button onClick={handleNewPayment} className="gap-2">
            <Plus size={16} /> Neue Zahlung
          </Button>
          <Button variant="outline" onClick={() => setSettingsOpen(true)} className="gap-2">
            <Settings size={16} /> Einstellungen
          </Button>
        </motion.div>

        {/* KPI Grid */}
        <KPICards
          config={config}
          totalPaid={totalPaid}
          remainingDebt={remainingDebt}
          vehicle={vehicle}
          latestMarketPrice={latestMarketPrice}
          openRatesCount={openRatesCount}
          paidRatesCount={paidRatesCount}
          currentRateAmount={currentRateAmount}
        />

        {/* Tabbed Content */}
        <div className="mt-6">
          <Tabs defaultValue="raten" className="w-full">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="raten">Ratenübersicht</TabsTrigger>
              <TabsTrigger value="historie">Zahlungen</TabsTrigger>
              <TabsTrigger value="angebote">Finanzierung</TabsTrigger>
              <TabsTrigger value="berechnung">Berechnung</TabsTrigger>
            </TabsList>

            <TabsContent value="raten">
              <MonthlyRateOverview config={config} payments={payments} />
            </TabsContent>

            <TabsContent value="historie">
              <PaymentHistory
                payments={payments}
                onEdit={handleEdit}
                onDelete={deletePayment}
              />
            </TabsContent>

            <TabsContent value="angebote">
              <FinancingOffers
                offers={financingOffers}
                onSave={addFinancingOffer}
                onUpdate={updateFinancingOffer}
                onDelete={deleteFinancingOffer}
              />
            </TabsContent>

            <TabsContent value="berechnung">
              <CalculationOverview
                config={config}
                payments={payments}
                totalPaid={totalPaid}
                remainingDebt={remainingDebt}
                currentRateAmount={currentRateAmount}
                paidRatesCount={paidRatesCount}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Dialogs */}
        <PaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          onSave={addPayment}
          editPayment={editPayment}
          onUpdate={updatePayment}
          config={config}
          payments={payments}
        />
        <FinanceSettings
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          config={config}
          onSave={setConfig}
          vehicle={vehicle}
          onSaveTeslaToken={saveTeslaToken}
          onSyncTesla={syncTeslaVehicle}
          onRefreshMarketPrices={refreshMarketPrices}
          onReset={resetAllData}
          onSaveOdometer={saveManualOdometer}
          onSaveMarketPrice={saveManualMarketPrice}
          currentOdometer={vehicle?.odometerKm}
        />
      </div>
    </div>
  );
};

export default Index;
