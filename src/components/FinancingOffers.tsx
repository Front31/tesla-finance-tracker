import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FinancingOffer } from '@/types/finance';

interface FinancingOffersProps {
  offers: FinancingOffer[];
  onSave: (offer: Omit<FinancingOffer, 'id'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<FinancingOffer>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const formatEUR = (v: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v);

const emptyOffer = (): Omit<FinancingOffer, 'id'> => ({
  label: 'Neues Angebot',
  bankName: '',
  purchasePrice: 0,
  downPayment: 0,
  financedAmount: 0,
  durationMonths: 48,
  monthlyRate: 0,
  interestRate: 0,
  balloonPayment: 0,
  notes: '',
});

function OfferCard({
  offer,
  onSave,
  onDelete,
}: {
  offer: FinancingOffer | null;
  onSave: (data: Omit<FinancingOffer, 'id'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const [form, setForm] = useState<Omit<FinancingOffer, 'id'>>(
    offer ? { ...offer } : emptyOffer()
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (offer) setForm({ ...offer });
  }, [offer]);

  const update = (key: string, value: string | number) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    const financedAmount = form.purchasePrice - form.downPayment;
    await onSave({ ...form, financedAmount });
    setSaving(false);
  };

  const totalCost = form.monthlyRate * form.durationMonths + form.downPayment + form.balloonPayment;

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Input
          value={form.label}
          onChange={e => update('label', e.target.value)}
          className="font-semibold text-foreground border-none bg-transparent p-0 h-auto text-base focus-visible:ring-0"
          placeholder="Angebotsname"
        />
        <div className="flex gap-1">
          {offer && onDelete && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(offer.id)}>
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Bank / Anbieter</Label>
          <Input value={form.bankName} onChange={e => update('bankName', e.target.value)} placeholder="z.B. Tesla Finance" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Kaufpreis (EUR)</Label>
          <Input type="number" value={form.purchasePrice || ''} onChange={e => update('purchasePrice', +e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Anzahlung (EUR)</Label>
          <Input type="number" value={form.downPayment || ''} onChange={e => update('downPayment', +e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Laufzeit (Monate)</Label>
          <Input type="number" value={form.durationMonths || ''} onChange={e => update('durationMonths', +e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Monatliche Rate (EUR)</Label>
          <Input type="number" step="0.01" value={form.monthlyRate || ''} onChange={e => update('monthlyRate', +e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Zinssatz (%)</Label>
          <Input type="number" step="0.01" value={form.interestRate || ''} onChange={e => update('interestRate', +e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Schlussrate (EUR)</Label>
          <Input type="number" value={form.balloonPayment || ''} onChange={e => update('balloonPayment', +e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Gesamtkosten</Label>
          <div className="h-10 flex items-center text-sm font-semibold text-foreground">
            {formatEUR(totalCost)}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Notizen</Label>
        <Input value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="z.B. Sondertilgung möglich" />
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2" size="sm">
        <Save size={14} /> Speichern
      </Button>
    </div>
  );
}

export default function FinancingOffers({ offers, onSave, onUpdate, onDelete }: FinancingOffersProps) {
  const canAdd = offers.length < 2;

  const handleSaveExisting = (id: string) => async (data: Omit<FinancingOffer, 'id'>) => {
    await onUpdate(id, data);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Original-Finanzierungsangebote</h2>
          <p className="text-xs text-muted-foreground">Bis zu 2 Angebote zum Vergleich hinterlegen</p>
        </div>
        {canAdd && (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => onSave(emptyOffer())}>
            <Plus size={14} /> Angebot hinzufügen
          </Button>
        )}
      </div>

      {offers.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground text-sm mb-3">Noch keine Angebote hinterlegt</p>
          <Button variant="outline" onClick={() => onSave(emptyOffer())} className="gap-2">
            <Plus size={14} /> Erstes Angebot anlegen
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {offers.map(offer => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onSave={handleSaveExisting(offer.id)}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
