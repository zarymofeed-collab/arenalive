import React, { useEffect, useRef, useState } from 'react';
import { START_IO_CONFIG, AdSlotConfig } from '../config/startIoConfig';
import { useStartIo } from '../hooks/useStartIo';

interface StartIoAdsProps {
  slot: keyof typeof START_IO_CONFIG.slots;
  customSpacing?: string;
}

export const StartIoAds: React.FC<StartIoAdsProps> = ({ slot, customSpacing }) => {
  const { registerVisibleAd, unregisterVisibleAd, isAdDisplayAllowed } = useStartIo();
  const slotConfig: AdSlotConfig = START_IO_CONFIG.slots[slot];
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [inViewport, setInViewport] = useState(false);
  const [isAdVisible, setIsAdVisible] = useState(false);

  // Generous margin and spacing config to avoid accidental clicks (Start.io and UX friendly)
  const spacingClass = customSpacing || START_IO_CONFIG.accidentalClickSafetyMargin;

  // Set up Lazy Loading with Intersection Observer
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInViewport(true);
        } else {
          setInViewport(false);
        }
      },
      {
        rootMargin: START_IO_CONFIG.lazyLoadRootMargin,
        threshold: 0.1
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Handle active-ads count limit and visibility state
  useEffect(() => {
    if (inViewport) {
      if (!isAdVisible) {
        if (isAdDisplayAllowed()) {
          setIsAdVisible(true);
          registerVisibleAd();
        } else {
          console.log(`[Start.io Ads] Ad slot '${slot}' suspended to keep max ${START_IO_CONFIG.maxVisibleAds} ads per screen.`);
        }
      }
    } else {
      if (isAdVisible) {
        setIsAdVisible(false);
        unregisterVisibleAd();
      }
    }

    return () => {
      if (isAdVisible) {
        unregisterVisibleAd();
      }
    };
  }, [inViewport, isAdVisible]);

  // If we aren't displaying this ad yet because of lazy loading, show an elegant spacer matching the height
  if (!isAdVisible) {
    return (
      <div 
        ref={containerRef} 
        className="w-full bg-[#070b14]/10 border border-transparent"
        style={{ minHeight: slotConfig.size === '300x250' ? '250px' : '50px' }}
      />
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full flex items-center justify-center transition-all duration-300 ${spacingClass}`}
      dir="rtl"
    >
      {/* This is the dynamic container expected by Start.io Web SDK */}
      <div 
        className="startapp-ad mx-auto flex items-center justify-center transition-all"
        data-publisher-id={START_IO_CONFIG.siteId}
        data-ad-tag={slotConfig.id}
        data-ad-size={slotConfig.size}
        data-ad-type={slotConfig.type}
        style={{ 
          minWidth: slotConfig.size === '300x250' ? '300px' : slotConfig.size === '320x50' ? '320px' : '100%',
          minHeight: slotConfig.size === '300x250' ? '250px' : '50px'
        }}
      />
    </div>
  );
};
export default StartIoAds;
