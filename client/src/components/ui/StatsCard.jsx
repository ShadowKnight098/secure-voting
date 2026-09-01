import React from 'react';
import Card from './Card';

export const StatsCard = ({ title, value, icon: Icon, trend, trendValue, color = 'indigo' }) => {
  const colorMap = {
    indigo: 'from-indigo-500/20 to-indigo-500/0 text-indigo-400 border-l-indigo-500',
    emerald: 'from-emerald-500/20 to-emerald-500/0 text-emerald-400 border-l-emerald-500',
    blue: 'from-blue-500/20 to-blue-500/0 text-blue-400 border-l-blue-500',
    violet: 'from-violet-500/20 to-violet-500/0 text-violet-400 border-l-violet-500',
  };

  const bgGradient = colorMap[color];

  return (
    <Card hover className={`border-l-4 p-6 relative overflow-hidden group ${bgGradient}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${bgGradient} rounded-full blur-3xl -mr-10 -mt-10 opacity-50 group-hover:opacity-100 transition-opacity`} />
      
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
          <h4 className="text-3xl font-bold text-white tracking-tight">{value}</h4>
          
          {trend && (
            <div className="mt-2 flex items-center text-sm">
              <span className={`font-medium ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                {trend === 'up' ? '↑' : '↓'} {trendValue}
              </span>
              <span className="text-slate-500 ml-2">vs last month</span>
            </div>
          )}
        </div>
        
        <div className={`p-3 rounded-xl bg-slate-800 border border-slate-700/50 shadow-inner`}>
          <Icon className={`w-6 h-6`} />
        </div>
      </div>
    </Card>
  );
};

export default StatsCard;
