import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Gauge, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ManualDataEntryProps {
  onSaveOdometer: (km: number) => Promise<void>;
  onSaveMarketPrice: (data: { avgPrice: number; minPrice: number; maxPrice: number; sampleSize: number }) => Promise<void>;
  currentOdometer?: number;
}

export default function ManualDataEntry({ onSaveOdometer, onSaveMarketPrice, currentOdometer }: ManualDataEntryProps) {
  const [km, setKm] = useState(currentOdometer?.toString() || '');
  const [avgPrice, setAvgPrice] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sampleSize, setSampleSize] = useState('');
  const [savingKm, setSavingKm] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);

  const handleSaveKm = async () => {
    if (!km) return;
    setSavingKm(true);
    try {
      await onSaveOdometer(+km);
      toast.success(`Kilometerstand auf ${(+km).toLocaleString('de-DE')} km gesetzt`);
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setSavingKm(false);
    }
  };

  const handleSavePrice = async () => {
    if (!avgPrice) return;
    setSavingPrice(true);
    try {
      await onSaveMarketPrice({
        avgPrice: +avgPrice,
        minPrice: +minPrice || +avgPrice,
        maxPrice: +maxPrice || +avgPrice,
        sampleSize: +sampleSize || 0,
      });
      toast.success('Marktpreis gespeichert');
      setAvgPrice('');
      setMinPrice('');
      setMaxPrice('');
      setSampleSize('');
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setSavingPrice(false);
    }
  };

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Manual Odometer */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gauge size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Kilometerstand manuell eintragen</h3>
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            value={km}
            onChange={e => setKm(e.target.value)}
            placeholder="z.B. 15000"
            className="flex-1"
          />
          <Button onClick={handleSaveKm} disabled={savingKm || !km} size="sm" className="gap-2">
            <Save size={14} /> Speichern
          </Button>
        </div>
      </div>

      {/* Manual Market Price */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Marktpreis manuell eintragen</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Ø Preis (EUR) *</Label>
            <Input type="number" value={avgPrice} onChange={e => setAvgPrice(e.target.value)} placeholder="z.B. 35000" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Min. Preis (EUR)</Label>
            <Input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="z.B. 30000" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max. Preis (EUR)</Label>
            <Input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="z.B. 40000" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Anzahl Vergleichsfahrzeuge</Label>
            <Input type="number" value={sampleSize} onChange={e => setSampleSize(e.target.value)} placeholder="z.B. 50" />
          </div>
        </div>
        <Button onClick={handleSavePrice} disabled={savingPrice || !avgPrice} size="sm" className="w-full gap-2">
          <Save size={14} /> Marktpreis speichern
        </Button>
      </div>
    </motion.div>
  );
}
