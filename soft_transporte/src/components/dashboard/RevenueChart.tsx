'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface RevenueChartProps {
  data: {
    month: string
    ingresos: number
    gastos: number
  }[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <Card className="bg-card/40 backdrop-blur-xl border-border/40 shadow-xl col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-foreground/90">Ingresos vs Gastos</CardTitle>
        <CardDescription>Tendencia financiera de los últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#deff9a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#deff9a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="month" 
                stroke="#52525b" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#52525b" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `$${value}`}
              />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', borderRadius: '8px' }}
                itemStyle={{ color: '#e4e4e7' }}
              />
              <Area 
                type="monotone" 
                dataKey="ingresos" 
                stroke="#deff9a" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorIngresos)" 
              />
              <Area 
                type="monotone" 
                dataKey="gastos" 
                stroke="#ef4444" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorGastos)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
