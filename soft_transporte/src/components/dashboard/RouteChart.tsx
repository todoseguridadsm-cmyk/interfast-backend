'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface RouteChartProps {
  data: {
    route: string
    rentabilidad: number
  }[]
}

export function RouteChart({ data }: RouteChartProps) {
  return (
    <Card className="bg-card/40 backdrop-blur-xl border-border/40 shadow-xl col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-foreground/90">Rentabilidad por Ruta</CardTitle>
        <CardDescription>Márgenes de ganancia comparativos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 40, bottom: 0 }}>
              <XAxis 
                type="number"
                stroke="#52525b" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `$${value}`}
              />
              <YAxis 
                dataKey="route" 
                type="category"
                stroke="#a1a1aa" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#27272a" />
              <Tooltip 
                cursor={{ fill: '#27272a', opacity: 0.4 }}
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', borderRadius: '8px' }}
              />
              <Bar dataKey="rentabilidad" radius={[0, 4, 4, 0]} barSize={32}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.rentabilidad > 0 ? '#deff9a' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
