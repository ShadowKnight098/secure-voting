import React from 'react';

export const VotingLoader = ({ 
  message = 'Loading...', 
  submessage = 'Securing voter ledger...', 
  fullScreen = true,
  variant = 'slot', // 'slot' (ballot slot loader matching user design) or 'gif' (box-to-tick gif)
  className = ''
}) => {
  const loaderContent = (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      {variant === 'gif' ? (
        /* GIF Animation Variant */
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-[16px] bg-surface border-2 border-ink shadow-neo p-2 mb-4 overflow-hidden flex items-center justify-center">
          <img 
            src="/voting-animation.gif" 
            alt="Voting in progress" 
            className="w-full h-full object-contain"
          />
        </div>
      ) : (
        /* Smooth Ballot Slot Loader (Matching User's Uploaded Design) */
        <div className="relative flex flex-col items-center justify-center py-4 mb-2">
          {/* Top Slot Bar */}
          <div className="relative z-20 w-24 sm:w-28 h-2 sm:h-2.5 bg-ink rounded-full shadow-sm" />

          {/* Center Chamber with Passing Ballot Paper */}
          <div className="relative z-10 w-24 sm:w-28 h-16 sm:h-20 flex items-center justify-center overflow-hidden">
            {/* Sliding Ballot Paper */}
            <div className="animate-paper-slot w-14 sm:w-16 h-14 sm:h-16 bg-white border-2 border-ink rounded-[8px] shadow-sm flex flex-col justify-between p-1.5 transform">
              {/* Paper Header Stripe */}
              <div className="w-full h-1.5 bg-pink rounded-full" />
              {/* Paper Lines */}
              <div className="space-y-1 my-auto">
                <div className="w-4/5 h-1 bg-ink/20 rounded-full" />
                <div className="w-3/5 h-1 bg-ink/20 rounded-full" />
              </div>
              {/* Checkmark Stamp */}
              <div className="flex items-center justify-end">
                <div className="w-3.5 h-3.5 rounded-[3px] bg-mint border border-ink flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-ink stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Slot Bar */}
          <div className="relative z-20 w-24 sm:w-28 h-2 sm:h-2.5 bg-ink rounded-full shadow-sm" />

          {/* Floor Shadow Pulse */}
          <div className="animate-slot-shadow w-12 sm:w-16 h-1.5 bg-ink/35 rounded-full mt-2" />
        </div>
      )}

      {/* Status Typography */}
      {message && (
        <div className="mt-3 space-y-1">
          <p className="font-extrabold text-sm sm:text-base text-ink tracking-tight animate-pulse">
            {message}
          </p>
          {submessage && (
            <p className="text-[11px] sm:text-xs font-bold text-ink/65">
              {submessage}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (!fullScreen) {
    return loaderContent;
  }

  return (
    <div className="min-h-screen bg-lavender flex flex-col items-center justify-center p-4 text-ink animate-fade-in">
      <div className="p-6 sm:p-8 bg-surface rounded-[18px] border-2 border-ink shadow-neo-xl max-w-xs sm:max-w-sm w-full mx-auto flex flex-col items-center">
        {loaderContent}
      </div>
    </div>
  );
};

export default VotingLoader;
