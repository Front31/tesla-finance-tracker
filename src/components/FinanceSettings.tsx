import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FinanceConfig } from '@/types/finance';

interface FinanceSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: FinanceConfig;
  onSave: (config: FinanceConfig) => void;
}

export default function FinanceSettings({ open, onOpenChange, config, onSave }: FinanceSettingsProps) {
  const [form, setForm] = useState<FinanceConfig>(config);

  const update = (key: keyof FinanceConfig, value: string | number) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const financedAmount = form.purchasePrice - form.downPayment;
    onSave({ ...form, financedAmount });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border/50 sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Finanzierung anpassen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kaufpreis (EUR)</Label>
              <Input type="number" value={form.purchasePrice} onChange={e => update('purchasePrice', +e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Anzahlung (EUR)</Label>
              <Input type="number" value={form.downPayment} onChange={e => update('downPayment', +e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Startdatum</Label>
              <Input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Laufzeit (Monate)</Label>
              <Input type="number" value={form.durationMonths} onChange={e => update('durationMonths', +e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Monatliche Rate (EUR)</Label>
              <Input type="number" step="0.01" value={form.monthlyRate} onChange={e => update('monthlyRate', +e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Zinssatz (%)</Label>
              <Input type="number" step="0.01" value={form.interestRate} onChange={e => update('interestRate', +e.target.value)} />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Fahrzeugdaten</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modell</Label>
                <Input value={form.vehicleModel} onChange={e => update('vehicleModel', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Trim</Label>
                <Input value={form.vehicleTrim} onChange={e => update('vehicleTrim', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Baujahr</Label>
                <Input type="number" value={form.vehicleYear} onChange={e => update('vehicleYear', +e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>VIN</Label>
                <Input value={form.vin} onChange={e => update('vin', e.target.value)} placeholder="5YJ3E7..." />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" className="flex-1">Speichern</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
