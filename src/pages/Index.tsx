import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Settings, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportToCSV } from '@/lib/exportData';
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
import { getOpenRates, generateMonthlyRates, getOverpaymentsByPaymentId, matchesRate } from '@/lib/rateCalculation';

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
  const openRatesCount = useMemo(() => {
    const { rates } = generateMonthlyRates(config, payments);
    const now = new Date();
    return rates.filter(r => {
      const rateDate = new Date(r.year, r.month, 1);
      return rateDate <= now && !r.isPaid;
    }).length;
  }, [config, payments]);

  const { paidRatesCount, currentRateAmount } = useMemo(() => {
    const { rates } = generateMonthlyRates(config, payments);
    const now = new Date();
    const start = new Date(config.startDate);
    const startMonth = start.getMonth();
    const startYear = start.getFullYear();
    const nowIdx = (now.getFullYear() - startYear) * 12 + (now.getMonth() - startMonth);

    let paid = 0;
    let nextRateAmount = config.monthlyRate;
    for (let i = 0; i < rates.length; i++) {
      const r = rates[i];
      if (r.isPaid || r.paidAmount >= r.expectedAmount * 0.5) {
        paid++;
      } else if (i >= nowIdx) {
        nextRateAmount = r.expectedAmount;
        break;
      }
    }
    return { paidRatesCount: paid, currentRateAmount: nextRateAmount };
  }, [config, payments]);

  const overpaymentMap = useMemo(() => getOverpaymentsByPaymentId(config, payments), [config, payments]);

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
          <Button variant="outline" className="gap-2" onClick={() => exportToCSV({
            config, payments, totalPaid, remainingDebt, currentRateAmount, paidRatesCount,
            vehicle, latestMarketPrice, financingOffers,
          })}>
            <Download size={16} /> Export
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
                overpaymentMap={overpaymentMap}
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
