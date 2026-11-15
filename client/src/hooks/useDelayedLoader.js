import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to ensure loading states remain visible for a minimum smooth duration.
 * Prevents micro-interaction flashes when database queries return in 1-2 milliseconds.
 *
 * @param {boolean} isLoading - The actual raw loading state
 * @param {number} minDuration - Minimum duration in ms (default: 750ms)
 * @returns {boolean} showLoader - Smooth delayed loading state for UI rendering
 */
export function useDelayedLoader(isLoading, minDuration = 750) {
  const [showLoader, setShowLoader] = useState(isLoading);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (isLoading) {
      startTimeRef.current = Date.now();
      setShowLoader(true);
    } else {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, minDuration - elapsed);

      const timer = setTimeout(() => {
        setShowLoader(false);
      }, remaining);

      return () => clearTimeout(timer);
    }
  }, [isLoading, minDuration]);

  return showLoader;
}

export default useDelayedLoader;
