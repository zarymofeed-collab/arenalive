/**
 * Start.io Web Ads Central Configuration
 * Site ID: 205224883
 */

export interface AdSlotConfig {
  id: string;
  size: '320x50' | '300x250' | '468x60' | '728x90' | 'fluid';
  type: 'banner' | 'interstitial' | 'preplay' | 'mrec';
  description: string;
}

export const START_IO_CONFIG = {
  // Publisher Information
  siteId: '205224883',
  
  // Official Start.io Web SDK Script Source
  sdkUrl: 'https://sdk.startapp.com/web/startapp.js',
  
  // Policy & Performance Optimizations
  maxVisibleAds: 2,           // Do not display more than 2 ads on screen simultaneously
  lazyLoadRootMargin: '100px', // Lazy load ads when they are 100px close to the viewport
  accidentalClickSafetyMargin: 'my-6 p-4 sm:my-8', // CSS classes to prevent accidental clicks
  
  // Pre-play / Interstitial Timings
  interstitialDuration: 4000, // Duration in ms to display interstitial ads
  prePlayAdDuration: 3000,     // Duration in ms to display pre-play ad before stream starts
  
  // Ad Slots Configuration
  slots: {
    homeTopBanner: {
      id: 'st_home_top_banner',
      size: '728x90',
      type: 'banner',
      description: 'Banner at the top of the homepage'
    } as AdSlotConfig,
    
    homeBottomBanner: {
      id: 'st_home_bottom_banner',
      size: '728x90',
      type: 'banner',
      description: 'Banner at the bottom of the homepage'
    } as AdSlotConfig,
    
    channelSectionAd: {
      id: 'st_channel_section_ad',
      size: '300x250',
      type: 'mrec',
      description: 'Banner displayed between channel cards or channel sections'
    } as AdSlotConfig,
    
    playerBottomBanner: {
      id: 'st_player_bottom_banner',
      size: '320x50',
      type: 'banner',
      description: 'Banner within the channel player page, directly below the player'
    } as AdSlotConfig,
    
    vodBanner: {
      id: 'st_vod_banner',
      size: '300x250',
      type: 'mrec',
      description: 'Banner inside movie/VOD lists'
    } as AdSlotConfig,
    
    seriesBanner: {
      id: 'st_series_banner',
      size: '300x250',
      type: 'mrec',
      description: 'Banner inside TV Series list'
    } as AdSlotConfig,
    
    matchesBanner: {
      id: 'st_matches_banner',
      size: '320x50',
      type: 'banner',
      description: 'Banner inside soccer matches schedule page'
    } as AdSlotConfig,
    
    detailsFooterBanner: {
      id: 'st_details_footer_banner',
      size: '300x250',
      type: 'mrec',
      description: 'Ad displayed at the bottom/footer of the series/movies details page'
    } as AdSlotConfig,
    
    interstitial: {
      id: 'st_interstitial_nav',
      size: 'fluid',
      type: 'interstitial',
      description: 'Full-screen interstitial ad displayed between page transitions'
    } as AdSlotConfig,
    
    preplay: {
      id: 'st_preplay_stream',
      size: 'fluid',
      type: 'preplay',
      description: 'Overlay ad shown before a stream runs'
    } as AdSlotConfig,
  }
};
