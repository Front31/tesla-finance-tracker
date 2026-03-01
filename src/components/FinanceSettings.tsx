import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FinanceConfig, TeslaVehicleState } from '@/types/finance';
import { Loader2, CheckCircle, XCircle, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface FinanceSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: FinanceConfig;
  onSave: (config: FinanceConfig) => void;
  vehicle?: TeslaVehicleState | null;
  onSaveTeslaToken?: (token: string) => Promise<void>;
  onSyncTesla?: () => Promise<any>;
  onRefreshMarketPrices?: () => Promise<any>;
  onReset?: () => Promise<void>;
}

export default function FinanceSettings({
  open, onOpenChange, config, onSave,
  vehicle, onSaveTeslaToken, onSyncTesla, onRefreshMarketPrices, onReset,
}: FinanceSettingsProps) {
  const [form, setForm] = useState<FinanceConfig>(config);
  const [teslaToken, setTeslaToken] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetChecked, setResetChecked] = useState(false);
  const [resetting, setResetting] = useState(false);
  useEffect(() => {
    if (open) setForm(config);
  }, [open, config]);

  const update = (key: keyof FinanceConfig, value: string | number) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const financedAmount = form.purchasePrice - form.downPayment;
    onSave({ ...form, financedAmount });
    onOpenChange(false);
  };

  const handleSaveToken = async () => {
    if (!teslaToken.trim() || !onSaveTeslaToken) return;
    try {
      await onSaveTeslaToken(teslaToken.trim());
      toast.success('Tesla Token gespeichert');
      setTeslaToken('');
    } catch {
      toast.error('Fehler beim Speichern des Tokens');
    }
  };

  const handleSync = async () => {
    if (!onSyncTesla) return;
    setSyncing(true);
    try {
      const result = await onSyncTesla();
      if (result?.success) {
        toast.success(`Tesla Sync erfolgreich: ${result.data.odometerKm} km`);
      } else {
        toast.error(result?.error || 'Tesla Sync fehlgeschlagen');
      }
    } catch {
      toast.error('Tesla Sync fehlgeschlagen');
    } finally {
      setSyncing(false);
    }
  };

  const handleRefreshPrices = async () => {
    if (!onRefreshMarketPrices) return;
    setRefreshing(true);
    try {
      const result = await onRefreshMarketPrices();
      if (result?.success) {
        toast.success(`Marktpreis aktualisiert: Ø ${result.data.avg.toLocaleString('de-DE')} €`);
      } else {
        toast.error(result?.error || 'Marktpreis-Update fehlgeschlagen');
      }
    } catch {
      toast.error('Marktpreis-Update fehlgeschlagen');
    } finally {
      setRefreshing(false);
    }
  };

  const isConnected = !!vehicle?.lastSyncAt;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border/50 sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Einstellungen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Finance Config */}
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
            <div className="space-y-2 col-span-2">
              <Label>Schlussrate (EUR)</Label>
              <Input type="number" step="0.01" value={form.balloonPayment} onChange={e => update('balloonPayment', +e.target.value)} placeholder="0" />
            </div>
          </div>

          {/* Vehicle Data */}
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

          {/* Tesla API Section */}
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Tesla API Verbindung</h3>
            <div className="flex items-center gap-2 mb-3">
              {isConnected ? (
                <>
                  <CheckCircle size={16} className="text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Verbunden – Letzter Sync: {vehicle?.lastSyncAt ? new Date(vehicle.lastSyncAt).toLocaleString('de-DE') : '–'}
                  </span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Nicht verbunden</span>
                </>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={teslaToken}
                  onChange={e => setTeslaToken(e.target.value)}
                  placeholder="Tesla Access Token"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={handleSaveToken} disabled={!teslaToken.trim()}>
                  Speichern
                </Button>
              </div>
              <Button type="button" variant="outline" onClick={handleSync} disabled={syncing} className="w-full gap-2">
                {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Fahrzeugdaten synchronisieren
              </Button>
            </div>
          </div>

          {/* Market Price Refresh */}
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Marktpreis</h3>
            <Button type="button" variant="outline" onClick={handleRefreshPrices} disabled={refreshing} className="w-full gap-2">
              {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Marktpreis aktualisieren
            </Button>
          </div>

          {/* Reset */}
          {onReset && (
            <div className="border-t border-destructive/30 pt-4">
              <h3 className="text-sm font-semibold text-destructive mb-3">Gefahrenzone</h3>
              <Button
                type="button"
                variant="destructive"
                className="w-full gap-2"
                onClick={() => { setResetChecked(false); setResetConfirmOpen(true); }}
              >
                <Trash2 size={16} /> Alle Daten zurücksetzen
              </Button>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" className="flex-1">Speichern</Button>
          </div>
        </form>
      </DialogContent>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alle Daten zurücksetzen?</AlertDialogTitle>
            <AlertDialogDescription>
              Alle Zahlungen, Einstellungen und Fahrzeugdaten werden unwiderruflich gelöscht.
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 py-2">
            <Checkbox
              id="reset-confirm"
              checked={resetChecked}
              onCheckedChange={(v) => setResetChecked(v === true)}
            />
            <Label htmlFor="reset-confirm" className="text-sm cursor-pointer">
              Ja, ich möchte alle Daten unwiderruflich löschen
            </Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={!resetChecked || resetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                if (!onReset) return;
                setResetting(true);
                try {
                  await onReset();
                  toast.success('Alle Daten wurden zurückgesetzt');
                  setResetConfirmOpen(false);
                  onOpenChange(false);
                } catch {
                  toast.error('Fehler beim Zurücksetzen');
                } finally {
                  setResetting(false);
                }
              }}
            >
              {resetting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
