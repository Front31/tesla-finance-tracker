import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Payment, PAYMENT_TYPE_LABELS } from '@/types/finance';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payment: Omit<Payment, 'id'>) => void;
  editPayment?: Payment | null;
  onUpdate?: (id: string, updates: Partial<Payment>) => void;
}

export default function PaymentDialog({ open, onOpenChange, onSave, editPayment, onUpdate }: PaymentDialogProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<Payment['type']>('rate');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (editPayment) {
      setDate(editPayment.date);
      setAmount(editPayment.amount.toString());
      setType(editPayment.type);
      setNote(editPayment.note || '');
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setAmount('');
      setType('rate');
      setNote('');
    }
  }, [editPayment, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    if (editPayment && onUpdate) {
      onUpdate(editPayment.id, { date, amount: parsedAmount, type, note: note || undefined });
    } else {
      onSave({ date, amount: parsedAmount, type, note: note || undefined });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border/50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {editPayment ? 'Zahlung bearbeiten' : 'Neue Zahlung'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Datum</Label>
            <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Betrag (EUR)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="450.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Typ</Label>
            <Select value={type} onValueChange={(v) => setType(v as Payment['type'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Notiz (optional)</Label>
            <Textarea
              id="note"
              placeholder="Optionale Notiz..."
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" className="flex-1">
              {editPayment ? 'Speichern' : 'Eintragen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
