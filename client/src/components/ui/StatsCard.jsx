import React from 'react';
import Card from './Card';

export const StatsCard = ({ title, value, icon: Icon, trend, trendValue }) => {
  return (
    <Card hover className="p-6 relative">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-ink/70 mb-1">{title}</p>
          <h4 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">{value}</h4>
          
          {trendValue && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sun/40 border-2 border-ink text-xs font-bold text-ink shadow-neo-sm">
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        
        <div className="w-12 h-12 rounded-[12px] bg-violet text-white border-2 border-ink shadow-neo-sm flex items-center justify-center flex-shrink-0">
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
};

export default StatsCard;
