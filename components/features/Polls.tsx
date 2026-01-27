import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const POLL_DATA = [
  { name: 'Scambio Coppie', votes: 150 },
  { name: 'Threesome', votes: 120 },
  { name: 'Solo Voyeur', votes: 80 },
  { name: 'BDSM Soft', votes: 95 },
  { name: 'Cena Elegante', votes: 60 },
];

const COLORS = ['#7f1d1d', '#991b1b', '#b91c1c', '#dc2626', '#ef4444'];

const Polls: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
       <div className="mb-10 text-center">
        <h2 className="text-3xl font-serif text-white mb-2">Desire Pulse</h2>
        <p className="text-neutral-500 text-sm uppercase tracking-widest">Cosa desidera la community questa settimana?</p>
      </div>

      <div className="bg-neutral-900 p-8 border border-neutral-800 shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-velvet-900 via-crimson-900 to-velvet-900"></div>
        
        <h3 className="text-lg font-serif text-neutral-300 mb-8 text-center">Qual è la tua fantasia principale per il weekend?</h3>
        
        <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={POLL_DATA} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={120} 
                        tick={{fill: '#a3a3a3', fontSize: 12, fontFamily: 'serif'}} 
                        tickLine={false} 
                        axisLine={false}
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#000', borderColor: '#333', color: '#fff', fontFamily: 'serif' }}
                        itemStyle={{ color: '#dc2626' }}
                        cursor={{fill: 'rgba(255,255,255,0.03)'}}
                    />
                    <Bar dataKey="votes" radius={[0, 2, 2, 0]} barSize={30}>
                        {POLL_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
        
        <div className="mt-8 flex justify-between items-center border-t border-neutral-800 pt-4">
            <span className="text-xs text-neutral-600 uppercase">Totale voti: 505</span>
            <button className="text-xs text-crimson-500 hover:text-crimson-400 uppercase tracking-widest border-b border-crimson-900 pb-1">Vedi Archivio</button>
        </div>
      </div>
    </div>
  );
};

export default Polls;