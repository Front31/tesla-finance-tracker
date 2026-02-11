import { motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { MarketPriceEntry } from '@/types/finance';

interface MarketPriceChartProps {
  data: MarketPriceEntry[];
}

const formatEUR = (v: number) => `${(v / 1000).toFixed(1)}k €`;
const formatDate = (d: string) => {
  const date = new Date(d);
  return `${date.getDate()}.${date.getMonth() + 1}.`;
};

export default function MarketPriceChart({ data }: MarketPriceChartProps) {
  return (
    <motion.div
      className="glass-card p-5 md:p-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <h2 className="text-lg font-semibold text-foreground mb-1">Marktpreis-Verlauf (30 Tage)</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Durchschnittspreis vergleichbarer Tesla Model 3 in Deutschland
      </p>
      <div className="h-56 md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(0, 0%, 15%)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="hsl(0, 0%, 15%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 90%)" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11, fill: 'hsl(0, 0%, 45%)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatEUR}
              tick={{ fontSize: 11, fill: 'hsl(0, 0%, 45%)' }}
              axisLine={false}
              tickLine={false}
              domain={['dataMin - 1000', 'dataMax + 1000']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(0, 0%, 100%)',
                border: '1px solid hsl(0, 0%, 90%)',
                borderRadius: '12px',
                fontSize: '12px',
                boxShadow: '0 4px 24px -4px rgba(0,0,0,0.08)',
              }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  avgPriceEUR: 'Ø Preis',
                  minPriceEUR: 'Min',
                  maxPriceEUR: 'Max',
                };
                return [new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value), labels[name] || name];
              }}
              labelFormatter={formatDate}
            />
            <Area
              type="monotone"
              dataKey="maxPriceEUR"
              stroke="none"
              fill="hsl(0, 0%, 85%)"
              fillOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="minPriceEUR"
              stroke="none"
              fill="hsl(0, 0%, 100%)"
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="avgPriceEUR"
              stroke="hsl(0, 0%, 15%)"
              strokeWidth={2}
              fill="url(#priceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
