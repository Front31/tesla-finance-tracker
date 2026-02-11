import { motion } from 'framer-motion';
import teslaImage from '@/assets/tesla-model3.png';

interface HeroSectionProps {
  totalPaid: number;
  totalPrice: number;
  progressPercent: number;
  remainingDebt: number;
}

const formatEUR = (v: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

export default function HeroSection({ totalPaid, totalPrice, progressPercent, remainingDebt }: HeroSectionProps) {
  return (
    <div className="relative flex flex-col items-center gap-6 py-8 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-center"
      >
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Tesla Model 3
        </h1>
        <p className="text-muted-foreground mt-1 text-sm font-medium">Finanzierungs-Tracker</p>
      </motion.div>

      <motion.img
        src={teslaImage}
        alt="Tesla Model 3"
        className="w-full max-w-xl md:max-w-2xl object-contain drop-shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
      />

      {/* Progress Section */}
      <motion.div
        className="w-full max-w-lg glass-card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <div className="flex justify-between items-baseline mb-3">
          <span className="text-sm font-medium text-muted-foreground">Bereits abbezahlt</span>
          <span className="text-sm font-semibold text-foreground">{progressPercent.toFixed(1)}%</span>
        </div>
        <div className="relative h-3 rounded-full bg-secondary overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full progress-gradient"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1.5, delay: 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-3">
          <div>
            <span className="text-lg font-bold text-foreground">{formatEUR(totalPaid)}</span>
            <span className="text-muted-foreground text-sm ml-1">bezahlt</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-foreground">{formatEUR(totalPrice)}</span>
            <span className="text-muted-foreground text-sm ml-1">gesamt</span>
          </div>
        </div>
        <div className="mt-2 text-center">
          <span className="text-sm text-muted-foreground">Restschuld: </span>
          <span className="text-sm font-semibold text-foreground">{formatEUR(remainingDebt)}</span>
        </div>
      </motion.div>
    </div>
  );
}
