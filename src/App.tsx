import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Tv, 
  Film, 
  Clapperboard, 
  Search, 
  Calendar, 
  User, 
  Layers, 
  Loader2, 
  Play, 
  PlayCircle,
  AlertCircle, 
  X, 
  Download, 
  Copy, 
  RotateCcw, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  ExternalLink,
  ChevronDown,
  Info,
  Settings,
  Trash2,
  Edit,
  Plus,
  Sliders,
  Heart,
  Database,
  RefreshCw,
  FolderTree,
  FolderEdit
} from 'lucide-react';

// Stream interfaces
interface StreamItem {
  num?: number;
  name: string;
  stream_id?: number;
  series_id?: number;
  stream_icon?: string;
  cover?: string;
  rating?: string;
  category_id: string;
  container_extension?: string;
  plot?: string;
  genre?: string;
  releaseDate?: string;
  customUrl?: string; // added for overrides
}

interface FavoriteItem {
  stream: StreamItem;
  type: 'live' | 'vod' | 'series';
}

interface CategoryItem {
  category_id: string;
  category_name: string;
  parent_id: number;
}

interface SubscriptionInfo {
  user_info?: {
    username: string;
    status: string;
    exp_date: string | null;
    active_cons: string;
    max_connections: string;
    allowed_outputs: string[];
  };
  server_info?: {
    url: string;
    port: string;
    server_time: string;
    timezone: string;
  };
}

interface SeriesInfo {
  seasons: {
    air_date?: string;
    episode_count: number;
    id: number;
    name: string;
    overview: string;
    season_number: number;
  }[];
  info?: {
    cover?: string;
    plot?: string;
    genre?: string;
    director?: string;
    rating?: string;
  };
  episodes: Record<string, {
    id: string;
    episode_num: number;
    title: string;
    container_extension?: string;
    info?: {
      plot?: string;
      duration?: string;
      rating?: string;
    };
    customUrl?: string; // added for overrides
  }[]>;
}

interface MatchItem {
  id: string;
  team1: string;
  team2: string;
  team1Logo?: string;
  team2Logo?: string;
  time: string;
  date?: string;
  channelId: string;
  channelName: string;
  status?: 'live' | 'upcoming' | 'finished';
}

function formatTimeToArabic12h(time24: string): string {
  if (!time24) return '';
  const parts = time24.split(':');
  if (parts.length < 2) return time24;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  
  if (isNaN(hours)) return time24;
  
  const ampm = hours >= 12 ? 'مساءً' : 'صباحاً';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const hoursStr = hours < 10 ? `0${hours}` : `${hours}`;
  
  return `${hoursStr}:${minutes} ${ampm}`;
}

function arabic12hToTime24(arabicTime: string): string {
  if (!arabicTime) return '';
  const cleanStr = arabicTime.trim();
  // Match hours:minutes then optionally space then am/pm in Arabic
  const match = cleanStr.match(/^(\d{1,2}):(\d{2})\s*(مساءً|صباحاً)$/);
  if (!match) return '';
  
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3];
  
  if (ampm === 'مساءً' && hours < 12) {
    hours += 12;
  } else if (ampm === 'صباحاً' && hours === 12) {
    hours = 0;
  }
  
  const hoursStr = hours < 10 ? `0${hours}` : `${hours}`;
  return `${hoursStr}:${minutes}`;
}

function formatYYYYMMDDToArabic(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const dateObj = new Date(Number(year), month - 1, day);
  if (isNaN(dateObj.getTime())) return dateStr;
  
  return dateObj.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function parseMatchTimeTo24h(timeStr: string): { hours: number, minutes: number } | null {
  if (!timeStr) return null;
  let clean = timeStr.trim();
  
  // Normalize Arabic numerals to Western
  const arabicNums = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  for (let i = 0; i < 10; i++) {
    clean = clean.replace(new RegExp(arabicNums[i], 'g'), String(i));
  }
  
  // Check meridiem (Arabic or English)
  const isPM = clean.includes('مساء') || clean.toLowerCase().includes('pm');
  const isAM = clean.includes('صباح') || clean.toLowerCase().includes('am');
  
  // Extract hours and minutes
  const timeMatch = clean.match(/(\d{1,2})[\s:]+(\d{2})/);
  if (!timeMatch) return null;
  
  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  
  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }
  
  return { hours, minutes };
}

function getMatchDateTime(m: MatchItem): Date | null {
  const timeParsed = parseMatchTimeTo24h(m.time);
  if (!timeParsed) return null;
  
  let year: number;
  let month: number;
  let day: number;
  
  if (m.date) {
    // m.date is typically YYYY-MM-DD
    const dateParts = m.date.split('-');
    if (dateParts.length === 3) {
      year = parseInt(dateParts[0], 10);
      month = parseInt(dateParts[1], 10) - 1; // 0-indexed month
      day = parseInt(dateParts[2], 10);
    } else {
      const today = new Date();
      year = today.getFullYear();
      month = today.getMonth();
      day = today.getDate();
    }
  } else {
    const today = new Date();
    year = today.getFullYear();
    month = today.getMonth();
    day = today.getDate();
  }
  
  return new Date(year, month, day, timeParsed.hours, timeParsed.minutes, 0, 0);
}

function getDynamicMatchStatus(m: MatchItem, now: Date = new Date()): 'live' | 'upcoming' | 'finished' {
  if (m.status === 'live') return 'live';
  if (m.status === 'finished') return 'finished';
  
  if (m.status === 'upcoming') {
    const matchTimeObj = getMatchDateTime(m);
    if (matchTimeObj) {
      // Keep as live if now has reached match time and is within 3 hours (180 minutes) of it
      if (now >= matchTimeObj && (now.getTime() - matchTimeObj.getTime()) < 180 * 60 * 1000) {
        return 'live';
      }
    }
  }
  return 'upcoming';
}

function isLogoUrl(logoStr?: string): boolean {
  if (!logoStr) return false;
  const trimmed = logoStr.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/');
}

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'live' | 'vod' | 'series' | 'favorites'>('live');
  const [showAllMatches, setShowAllMatches] = useState<boolean>(false);

  // Start.io Special Ad overlay states
  const [showInterstitialAd, setShowInterstitialAd] = useState<boolean>(false);
  const [interstitialTargetTab, setInterstitialTargetTab] = useState<'live' | 'vod' | 'series' | 'favorites' | null>(null);
  const [interstitialCountdown, setInterstitialCountdown] = useState<number>(3);

  const [showPrePlayAd, setShowPrePlayAd] = useState<boolean>(false);
  const [prePlayTargetStream, setPrePlayTargetStream] = useState<{
    name: string;
    id: string | number;
    type: 'live' | 'vod' | 'series';
    containerExt?: string;
    customUrl?: string;
  } | null>(null);
  const [prePlayCountdown, setPrePlayCountdown] = useState<number>(3);

  // Favorites State
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    try {
      const saved = localStorage.getItem('iptv_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('iptv_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (stream: StreamItem, type: 'live' | 'vod' | 'series', e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const streamId = stream.stream_id || stream.series_id;
    if (!streamId) return;

    setFavorites(prev => {
      const strId = String(streamId);
      const exists = prev.some(f => String(f.stream.stream_id || f.stream.series_id || '') === strId && f.type === type);
      if (exists) {
        return prev.filter(f => !(String(f.stream.stream_id || f.stream.series_id || '') === strId && f.type === type));
      } else {
        return [...prev, { stream, type }];
      }
    });
  };

  const isFavorite = (streamId: string | number | undefined, type: 'live' | 'vod' | 'series') => {
    if (!streamId) return false;
    const strId = String(streamId);
    return favorites.some(f => {
      const fId = String(f.stream.stream_id || f.stream.series_id || '');
      return fId === strId && f.type === type;
    });
  };

  // Real-time tick to update match statuses automatically when match time is reached
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000); // Check every 15 seconds for extreme precision
    return () => clearInterval(timer);
  }, []);
  
  // Data State
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [searchVal, setSearchVal] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const displayedCategories = useMemo(() => {
    if (activeTab === 'favorites') {
      return [
        { category_id: 'live', category_name: 'قنوات مباشرة', parent_id: 0 },
        { category_id: 'vod', category_name: 'أفلام', parent_id: 0 },
        { category_id: 'series', category_name: 'مسلسلات', parent_id: 0 }
      ];
    }
    return categories;
  }, [activeTab, categories]);

  const filteredFavorites = useMemo(() => {
    return favorites.filter(f => {
      const matchesSearch = f.stream.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      
      if (selectedCategory === 'all') return true;
      return f.type === selectedCategory;
    });
  }, [favorites, searchQuery, selectedCategory]);

  const displayedStreams = useMemo(() => {
    if (activeTab === 'favorites') {
      return filteredFavorites.map(f => ({
        ...f.stream,
        _favoriteType: f.type
      }));
    }
    return streams;
  }, [activeTab, streams, filteredFavorites]);
  
  // Pagination State
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const LIMIT = 24;

  // Loading & Error States
  const [isLoadingInfo, setIsLoadingInfo] = useState<boolean>(true);
  const [isLoadingCats, setIsLoadingCats] = useState<boolean>(true);
  const [isLoadingStreams, setIsLoadingStreams] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Series Detail Modal State
  const [selectedSeries, setSelectedSeries] = useState<StreamItem | null>(null);
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [isLoadingSeries, setIsLoadingSeries] = useState<boolean>(false);

  // Active Playback Launcher State (MyPlayer Launcher)
  const [activePlay, setActivePlay] = useState<{
    name: string;
    url: string;
    type: 'live' | 'vod' | 'series';
  } | null>(null);
  
  // Launcher internals
  const [launcherStatus, setLauncherStatus] = useState<'idle' | 'launching' | 'failed'>('idle');
  const [autoPlayEnabled, setAutoPlayEnabled] = useState<boolean>(() => {
    return localStorage.getItem('autoPlayEnabled') === 'true'; // Default to false (disabled)
  });
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedVideoLink, setCopiedVideoLink] = useState<boolean>(false);
  const [isDownloadingMp4, setIsDownloadingMp4] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Constants
  const APK_URL = "https://www.mediafire.com/file/e54348sqtudpdmi/%D9%85%D8%B4%D8%BA%D9%84+%D9%81%D8%AF%D9%8A%D9%88%D9%87.apk/file";
  // Fallback Mediafire URL from user code
  const SAFE_APK_URL = "https://www.mediafire.com/file/e54348sqtudpdmi/%D9%85%D8%B4%D8%BA%D9%84+%D9%81%D8%AF%D9%8A%D9%88%D9%87.apk/file";

  // ADMIN STATE
  const [isAdminPage, setIsAdminPage] = useState<boolean>(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('isAdminAuthenticated') === 'true';
  });
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);
  const [showServerSettings, setShowServerSettings] = useState<boolean>(false);
  const [serverConfig, setServerConfig] = useState({
    host: 'http://vo5px.top',
    username: '5252761676',
    password: '6582429481',
    useSupabase: false
  });
  const [adminHost, setAdminHost] = useState('');
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminUseSupabase, setAdminUseSupabase] = useState<boolean>(false);
  const [adminOverrides, setAdminOverrides] = useState<any[]>([]);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isDemoBannerDismissed, setIsDemoBannerDismissed] = useState<boolean>(false);

  // Supabase sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ totalCategories: number; totalStreams: number } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSqlInstruction, setSyncSqlInstruction] = useState<string | null>(null);

  // Overrides Form State
  const [overrideId, setOverrideId] = useState('');
  const [overrideName, setOverrideName] = useState('');
  const [overrideIcon, setOverrideIcon] = useState('');
  const [overrideStreamUrl, setOverrideStreamUrl] = useState('');
  const [isSavingOverride, setIsSavingOverride] = useState(false);

  // Override Search Helper State
  const [overrideSearchText, setOverrideSearchText] = useState('');
  const [overrideSearchResults, setOverrideSearchResults] = useState<any[]>([]);
  const [overrideSearchTab, setOverrideSearchTab] = useState<string>('live');
  const [isSearchingOverrides, setIsSearchingOverrides] = useState(false);

  // Category Overrides State
  const [adminCategoryOverrides, setAdminCategoryOverrides] = useState<any[]>([]);
  const [editingCategory, setEditingCategory] = useState<{ id: string; type: string; name: string; originalName?: string } | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Matches State
  const [matches, setMatches] = useState<MatchItem[]>([]);
  
  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      const statusA = getDynamicMatchStatus(a, currentTime);
      const statusB = getDynamicMatchStatus(b, currentTime);

      const getPriority = (status: 'live' | 'upcoming' | 'finished') => {
        if (status === 'live') return 1;
        if (status === 'upcoming') return 2;
        return 3;
      };

      const priorityDiff = getPriority(statusA) - getPriority(statusB);
      if (priorityDiff !== 0) return priorityDiff;

      const timeA = getMatchDateTime(a)?.getTime() || 0;
      const timeB = getMatchDateTime(b)?.getTime() || 0;
      return timeA - timeB;
    });
  }, [matches, currentTime]);
  const fetchMatches = () => {
    fetch('/api/iptv/matches')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMatches(data);
        } else {
          setMatches([]);
        }
      })
      .catch(err => {
        console.error('Error fetching matches:', err);
        setMatches([]);
      });
  };
  const [matchTeam1, setMatchTeam1] = useState('');
  const [matchTeam2, setMatchTeam2] = useState('');
  const [matchTeam1Logo, setMatchTeam1Logo] = useState('');
  const [matchTeam2Logo, setMatchTeam2Logo] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [matchDate, setMatchDate] = useState('');

  const [matchChannelId, setMatchChannelId] = useState('');
  const [matchChannelName, setMatchChannelName] = useState('');
  const [matchStatus, setMatchStatus] = useState<'live' | 'upcoming' | 'finished'>('live');
  const [isSavingMatch, setIsSavingMatch] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchEditId, setMatchEditId] = useState<string | null>(null);
  const [matchToDelete, setMatchToDelete] = useState<string | null>(null);
  const [overrideToDelete, setOverrideToDelete] = useState<string | null>(null);

  // Match Channel Search Helper States
  const [matchChannelSearchQuery, setMatchChannelSearchQuery] = useState('');
  const [matchChannelSearchResults, setMatchChannelSearchResults] = useState<any[]>([]);
  const [isSearchingMatchChannels, setIsSearchingMatchChannels] = useState(false);
  const [showMatchChannelDropdown, setShowMatchChannelDropdown] = useState(false);
  const [matchSelectedCategory, setMatchSelectedCategory] = useState<string>('all');

  // Admin Live Channels Browser State
  const [adminLiveCategories, setAdminLiveCategories] = useState<any[]>([]);
  const [selectedAdminLiveCategory, setSelectedAdminLiveCategory] = useState<string>('all');
  const [adminLiveChannels, setAdminLiveChannels] = useState<any[]>([]);
  const [adminLiveSearch, setAdminLiveSearch] = useState<string>('');
  const [adminLivePage, setAdminLivePage] = useState<number>(1);
  const [adminLiveTotalPages, setAdminLiveTotalPages] = useState<number>(1);
  const [adminLiveTotalItems, setAdminLiveTotalItems] = useState<number>(0);
  const [isAdminLoadingChannels, setIsAdminLoadingChannels] = useState<boolean>(false);
  const [isAdminLoadingCats, setIsAdminLoadingCats] = useState<boolean>(false);
  const [allLiveChannels, setAllLiveChannels] = useState<any[]>([]);
  const [isLoadingAllLiveChannels, setIsLoadingAllLiveChannels] = useState<boolean>(false);

  // Auto-scroll to override-editor-form when a channel/VOD is selected for editing
  useEffect(() => {
    if (overrideId) {
      const timer = setTimeout(() => {
        const element = document.getElementById('override-editor-form');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [overrideId]);

  // Fetch all live channels when admin page is loaded or when matchSelectedCategory changes
  useEffect(() => {
    if (!isAdminPage) return;
    setIsLoadingAllLiveChannels(true);
    const categoryQuery = matchSelectedCategory && matchSelectedCategory !== 'all' 
      ? `&category_id=${matchSelectedCategory}` 
      : '';
    fetch(`/api/iptv/streams?type=live&page=1&limit=5000${categoryQuery}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error && Array.isArray(data.items)) {
          // Sort channels alphabetically
          const sorted = [...data.items].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
          setAllLiveChannels(sorted);
        }
        setIsLoadingAllLiveChannels(false);
      })
      .catch(err => {
        console.error('Failed to fetch all live channels for dropdown selection:', err);
        setIsLoadingAllLiveChannels(false);
      });
  }, [isAdminPage, matchSelectedCategory]);

  // Admin Live Categories Fetch
  useEffect(() => {
    if (!isAdminPage) return;
    setIsAdminLoadingCats(true);
    fetch('/api/iptv/categories?type=live')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const sorted = [...data].sort((a, b) => a.category_name.localeCompare(b.category_name, 'ar'));
          setAdminLiveCategories(sorted);
        }
        setIsAdminLoadingCats(false);
      })
      .catch(err => {
        console.error('Failed to fetch admin live categories:', err);
        setIsAdminLoadingCats(false);
      });
  }, [isAdminPage]);

  // Admin Live Streams Fetch (with search & category filtering)
  useEffect(() => {
    if (!isAdminPage) return;
    setIsAdminLoadingChannels(true);
    const controller = new AbortController();
    const url = `/api/iptv/streams?type=live&category_id=${selectedAdminLiveCategory}&search=${encodeURIComponent(adminLiveSearch)}&page=${adminLivePage}&limit=12`;
    
    fetch(url, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setAdminLiveChannels(data.items || []);
          setAdminLiveTotalPages(data.totalPages || 1);
          setAdminLiveTotalItems(data.total || 0);
        } else {
          setAdminLiveChannels([]);
          setAdminLiveTotalPages(1);
          setAdminLiveTotalItems(0);
        }
        setIsAdminLoadingChannels(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch admin live channels:', err);
          setIsAdminLoadingChannels(false);
        }
      });

    return () => controller.abort();
  }, [isAdminPage, selectedAdminLiveCategory, adminLiveSearch, adminLivePage]);

  // Detect /admin in path or query or hash
  useEffect(() => {
    const checkAdmin = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const search = window.location.search;
      if (
        path.toLowerCase().includes('/admin') || 
        hash.toLowerCase().includes('admin') || 
        search.toLowerCase().includes('admin')
      ) {
        setIsAdminPage(true);
      } else {
        setIsAdminPage(false);
      }
    };
    
    checkAdmin();
    window.addEventListener('popstate', checkAdmin);
    window.addEventListener('hashchange', checkAdmin);
    return () => {
      window.removeEventListener('popstate', checkAdmin);
      window.removeEventListener('hashchange', checkAdmin);
    };
  }, []);

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === 'MOFEEDZARY7890#') {
      sessionStorage.setItem('isAdminAuthenticated', 'true');
      setIsAdminAuthenticated(true);
      setAdminPasswordError(null);
      setAdminPasswordInput('');
    } else {
      setAdminPasswordError('كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى.');
    }
  };

  // Fetch subscription info on mount & load dynamic server config
  useEffect(() => {
    fetch('/api/iptv/info')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setSubscription(data);
        }
        setIsLoadingInfo(false);
      })
      .catch(err => {
        console.error('Failed to fetch subscription:', err);
        setIsLoadingInfo(false);
      });

    // Load active config and overrides
    fetch('/api/admin/config')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setServerConfig(data.config);
          setAdminHost(data.config.host);
          setAdminUser(data.config.username);
          setAdminPass(data.config.password);
          setAdminUseSupabase(!!data.config.useSupabase);
          setAdminOverrides(data.overrides || []);
        }
      })
      .catch(err => console.error('Error fetching admin config:', err));

    // Load category overrides
    fetch('/api/admin/category-overrides')
      .then(res => res.json())
      .then(data => {
        if (!data.error && data.categoryOverrides) {
          setAdminCategoryOverrides(data.categoryOverrides);
        }
      })
      .catch(err => console.error('Error fetching category overrides:', err));

    // Fetch matches
    fetchMatches();
  }, []);;

  // Fetch categories when activeTab changes
  useEffect(() => {
    if (activeTab === 'favorites') {
      setIsLoadingCats(false);
      setSelectedCategory('all');
      setPage(1);
      setSearchVal('');
      setSearchQuery('');
      return;
    }

    setIsLoadingCats(true);
    setSelectedCategory('all');
    setPage(1);
    setSearchVal('');
    setSearchQuery('');

    fetch(`/api/iptv/categories?type=${activeTab}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.error) {
          setError(data.message || 'خطأ في جلب الفئات');
          setCategories([]);
        } else if (Array.isArray(data)) {
          // Sort categories by name
          const sorted = [...data].sort((a, b) => a.category_name.localeCompare(b.category_name, 'ar'));
          setCategories(sorted);
        } else {
          setCategories([]);
        }
        setIsLoadingCats(false);
      })
      .catch(err => {
        console.error('Failed to fetch categories:', err);
        setError('خطأ في الاتصال بالخادم أثناء جلب الفئات.');
        setCategories([]);
        setIsLoadingCats(false);
      });
  }, [activeTab]);

  // Fetch streams when activeTab, category, search, or page changes
  useEffect(() => {
    if (activeTab === 'favorites') {
      setIsLoadingStreams(false);
      setError(null);
      return;
    }

    setIsLoadingStreams(true);
    setError(null);

    const controller = new AbortController();
    const url = `/api/iptv/streams?type=${activeTab}&category_id=${selectedCategory}&search=${encodeURIComponent(searchQuery)}&page=${page}&limit=${LIMIT}`;

    fetch(url, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.message || 'خطأ في جلب البيانات');
          setStreams([]);
        } else {
          setStreams(data.items || []);
          setTotalPages(data.totalPages || 1);
          setTotalItems(data.total || 0);
        }
        setIsLoadingStreams(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch streams:', err);
          setError('فشل الاتصال بالخادم. يرجى إعادة المحاولة.');
          setStreams([]);
          setIsLoadingStreams(false);
        }
      });

    return () => controller.abort();
  }, [activeTab, selectedCategory, searchQuery, page]);

  // Fetch Series detailed info
  const handleOpenSeries = (item: StreamItem) => {
    setSelectedSeries(item);
    setIsLoadingSeries(true);
    setSeriesInfo(null);
    setSelectedSeason(1);

    fetch(`/api/iptv/series-info/${item.series_id}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setSeriesInfo(data);
          // Auto select first available season
          if (data.seasons && data.seasons.length > 0) {
            setSelectedSeason(data.seasons[0].season_number);
          } else if (data.episodes && Object.keys(data.episodes).length > 0) {
            const firstSeasonKey = Object.keys(data.episodes)[0];
            setSelectedSeason(parseInt(firstSeasonKey, 10) || 1);
          }
        } else {
          console.error('Failed to fetch series details:', data.message);
        }
        setIsLoadingSeries(false);
      })
      .catch(err => {
        console.error('Failed to fetch series details:', err);
        setIsLoadingSeries(false);
      });
  };

  // ==================== START.IO AD OPERATIONS ====================

  // Interstitial page transition countdown effect
  useEffect(() => {
    if (!showInterstitialAd) return;
    
    if (interstitialCountdown <= 0) {
      setShowInterstitialAd(false);
      if (interstitialTargetTab) {
        setActiveTab(interstitialTargetTab);
        setSelectedCategory('all');
        setPage(1);
      }
      return;
    }

    const timer = setTimeout(() => {
      setInterstitialCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [showInterstitialAd, interstitialCountdown, interstitialTargetTab]);

  // Pre-Play countdown effect before stream starts
  useEffect(() => {
    if (!showPrePlayAd) return;

    if (prePlayCountdown <= 0) {
      setShowPrePlayAd(false);
      if (prePlayTargetStream) {
        const { name, id, type, containerExt, customUrl } = prePlayTargetStream;
        let streamUrl = customUrl;
        if (!streamUrl) {
          const ext = containerExt || (type === 'live' ? 'ts' : type === 'vod' ? 'mp4' : 'mkv');
          const host = serverConfig.host;
          const user = serverConfig.username;
          const pass = serverConfig.password;

          if (type === 'live') {
            streamUrl = `${host}/live/${user}/${pass}/${id}.${ext}`;
          } else if (type === 'vod') {
            streamUrl = `${host}/movie/${user}/${pass}/${id}.${ext}`;
          } else {
            streamUrl = `${host}/series/${user}/${pass}/${id}.${ext}`;
          }
        }
        setActivePlay({ name, url: streamUrl, type });
        setLauncherStatus(autoPlayEnabled ? 'launching' : 'idle');
      }
      return;
    }

    const timer = setTimeout(() => {
      setPrePlayCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [showPrePlayAd, prePlayCountdown, prePlayTargetStream, autoPlayEnabled, serverConfig]);

  // Instant tab switcher (No ads, no delay)
  const handleTabChangeWithAd = (newTab: 'live' | 'vod' | 'series' | 'favorites') => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
    setSelectedCategory('all');
    setPage(1);
  };

  // Build direct stream URL for playback or download
  const getDirectStreamUrl = (
    id: string | number, 
    type: 'live' | 'vod' | 'series', 
    containerExt?: string,
    customUrl?: string
  ) => {
    let streamUrl = customUrl;
    if (!streamUrl) {
      const ext = containerExt || (type === 'live' ? 'ts' : type === 'vod' ? 'mp4' : 'mkv');
      const host = serverConfig.host;
      const user = serverConfig.username;
      const pass = serverConfig.password;

      if (type === 'live') {
        streamUrl = `${host}/live/${user}/${pass}/${id}.${ext}`;
      } else if (type === 'vod') {
        streamUrl = `${host}/movie/${user}/${pass}/${id}.${ext}`;
      } else {
        streamUrl = `${host}/series/${user}/${pass}/${id}.${ext}`;
      }
    }

    if (type === 'vod' || type === 'series') {
      const targetExt = type === 'series' ? '.mkv' : '.mp4';
      const lastDot = streamUrl.lastIndexOf('.');
      if (lastDot !== -1 && lastDot > streamUrl.lastIndexOf('/')) {
        const ext = streamUrl.substring(lastDot).toLowerCase();
        if (ext !== targetExt) {
          streamUrl = streamUrl.substring(0, lastDot) + targetExt;
        }
      } else {
        streamUrl = streamUrl + targetExt;
      }
    }
    return streamUrl;
  };

  // Build stream URL & Launch MyPlayer directly (No ads, no delay)
  const handlePlayStream = (
    name: string, 
    id: string | number, 
    type: 'live' | 'vod' | 'series', 
    containerExt?: string,
    customUrl?: string
  ) => {
    const streamUrl = getDirectStreamUrl(id, type, containerExt, customUrl);
    setActivePlay({ name, url: streamUrl, type });
    setLauncherStatus(autoPlayEnabled ? 'launching' : 'idle');
  };

  // ADMIN SUBMIT HANDLERS
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setConfigMessage(null);

    fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: adminHost,
        username: adminUser,
        password: adminPass,
        useSupabase: adminUseSupabase
      })
    })
      .then(res => res.json())
      .then(data => {
        setIsSavingConfig(false);
        if (data.error) {
          setConfigMessage({ type: 'error', text: data.message || 'فشل حفظ الإعدادات' });
        } else {
          setServerConfig(data.config);
          setShowServerSettings(false);
          setConfigMessage({ type: 'success', text: 'تم حفظ إعدادات السيرفر بنجاح وجاري تحديث قائمة القنوات والاشتراك!' });
          
          // Re-fetch IPTV subscription info
          fetch('/api/iptv/info')
            .then(res => res.json())
            .then(infoData => {
              if (!infoData.error) setSubscription(infoData);
            });

          // Reset categories and streams
          setPage(1);
          setSearchVal('');
          setSearchQuery('');
          
          setTimeout(() => setConfigMessage(null), 4000);
        }
      })
      .catch(err => {
        setIsSavingConfig(false);
        setConfigMessage({ type: 'error', text: 'حدث خطأ في الاتصال بالخادم.' });
      });
  };

  const handleSyncSupabase = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    setSyncSqlInstruction(null);
    try {
      const res = await fetch('/api/admin/supabase-sync', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        setSyncError(data.message || 'حدث خطأ أثناء مزامنة البيانات مع Supabase.');
        if (data.sql) {
          setSyncSqlInstruction(data.sql);
        }
      } else {
        setSyncResult({
          totalCategories: data.totalCategories,
          totalStreams: data.totalStreams
        });
      }
    } catch (err: any) {
      setSyncError('فشل الاتصال بالخادم لمزامنة البيانات.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideId.trim()) return;
    setIsSavingOverride(true);

    fetch('/api/admin/overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: overrideId.trim(),
        name: overrideName.trim() || undefined,
        icon: overrideIcon.trim() || undefined,
        streamUrl: overrideStreamUrl.trim() || undefined
      })
    })
      .then(res => res.json())
      .then(data => {
        setIsSavingOverride(false);
        if (!data.error) {
          setAdminOverrides(data.overrides || []);
          // Reset fields
          setOverrideId('');
          setOverrideName('');
          setOverrideIcon('');
          setOverrideStreamUrl('');
          // Refresh stream lists
          setPage(1);
        }
      })
      .catch(err => {
        setIsSavingOverride(false);
        console.error('Error saving override:', err);
      });
  };

  const handleDeleteOverride = (id: string) => {
    fetch(`/api/admin/overrides/${id}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setAdminOverrides(data.overrides || []);
          setPage(1);
          setOverrideToDelete(null);
        }
      })
      .catch(err => console.error('Error deleting override:', err));
  };

  const handleSaveCategoryOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name.trim()) return;

    fetch('/api/admin/category-overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingCategory.id,
        type: editingCategory.type,
        name: editingCategory.name.trim()
      })
    })
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setAdminCategoryOverrides(data.categoryOverrides || []);
          setEditingCategory(null);
          setConfigMessage({ type: 'success', text: 'تم تعديل اسم القسم بنجاح وسيبدأ العمل به فوراً.' });
          setTimeout(() => setConfigMessage(null), 4000);
          
          // Refresh active category lists if the modified category matches the view
          fetch(`/api/iptv/categories?type=${editingCategory.type}`)
            .then(res => res.json())
            .then(data => {
              if (Array.isArray(data)) {
                const sorted = [...data].sort((a, b) => a.category_name.localeCompare(b.category_name, 'ar'));
                setCategories(sorted);
              }
            })
            .catch(err => console.error('Error refreshing categories:', err));

          if (editingCategory.type === 'live') {
            fetch('/api/iptv/categories?type=live')
              .then(res => res.json())
              .then(data => {
                if (Array.isArray(data)) {
                  const sorted = [...data].sort((a, b) => a.category_name.localeCompare(b.category_name, 'ar'));
                  setAdminLiveCategories(sorted);
                }
              })
              .catch(err => console.error('Error refreshing admin live categories:', err));
          }
        } else {
          setConfigMessage({ type: 'error', text: data.message || 'فشل تعديل اسم القسم' });
          setTimeout(() => setConfigMessage(null), 4000);
        }
      })
      .catch(err => {
        console.error('Error saving category override:', err);
        setConfigMessage({ type: 'error', text: 'حدث خطأ أثناء الاتصال بالخادم لتعديل اسم القسم.' });
        setTimeout(() => setConfigMessage(null), 4000);
      });
  };

  const handleDeleteCategoryOverride = (id: string, type: string) => {
    fetch(`/api/admin/category-overrides/${type}/${id}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setAdminCategoryOverrides(data.categoryOverrides || []);
          setCategoryToDelete(null);
          setConfigMessage({ type: 'success', text: 'تم استعادة الاسم الافتراضي للقسم بنجاح.' });
          setTimeout(() => setConfigMessage(null), 4000);
          fetch(`/api/iptv/categories?type=${type}`)
            .then(res => res.json())
            .then(data => {
              if (Array.isArray(data)) {
                const sorted = [...data].sort((a, b) => a.category_name.localeCompare(b.category_name, 'ar'));
                setCategories(sorted);
              }
            })
            .catch(err => console.error('Error refreshing categories:', err));

          if (type === 'live') {
            fetch('/api/iptv/categories?type=live')
              .then(res => res.json())
              .then(data => {
                if (Array.isArray(data)) {
                  const sorted = [...data].sort((a, b) => a.category_name.localeCompare(b.category_name, 'ar'));
                  setAdminLiveCategories(sorted);
                }
              })
              .catch(err => console.error('Error refreshing admin live categories:', err));
          }
        } else {
          setConfigMessage({ type: 'error', text: data.message || 'فشل حذف تعديل القسم' });
          setTimeout(() => setConfigMessage(null), 4000);
        }
      })
      .catch(err => {
        console.error('Error deleting category override:', err);
        setConfigMessage({ type: 'error', text: 'حدث خطأ أثناء الاتصال بالخادم لحذف تعديل القسم.' });
        setTimeout(() => setConfigMessage(null), 4000);
      });
  };

  const handleEditOverride = (ov: any) => {
    setOverrideId(ov.id);
    setOverrideName(ov.name || '');
    setOverrideIcon(ov.icon || '');
    setOverrideStreamUrl(ov.streamUrl || '');
    
    // Smooth scroll to editor form
    const container = document.getElementById('override-editor-form');
    if (container) {
      container.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSaveMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchTeam1.trim() || !matchTeam2.trim() || !matchTime.trim() || !matchChannelId) {
      setMatchError('جميع الحقول الأساسية مطلوبة (الفريقين، الوقت، والقناة)');
      return;
    }
    setIsSavingMatch(true);
    setMatchError(null);

    fetch('/api/admin/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: matchEditId || undefined,
        team1: matchTeam1.trim(),
        team2: matchTeam2.trim(),
        team1Logo: matchTeam1Logo.trim() || undefined,
        team2Logo: matchTeam2Logo.trim() || undefined,
        time: matchTime.trim(),
        date: matchDate.trim() || undefined,
        channelId: matchChannelId,
        channelName: matchChannelName,
        status: matchStatus
      })
    })
      .then(res => res.json())
      .then(data => {
        setIsSavingMatch(false);
        if (data.error) {
           setMatchError(data.message || 'فشل حفظ المباراة');
         } else {
           fetchMatches();
           // Reset form fields
          setMatchTeam1('');
          setMatchTeam2('');
          setMatchTeam1Logo('');
          setMatchTeam2Logo('');
          setMatchTime('');
          setMatchDate('');
          setMatchChannelId('');
          setMatchChannelName('');
          setMatchStatus('live');
          setMatchEditId(null);
          setMatchChannelSearchQuery('');
          setMatchChannelSearchResults([]);
          setShowMatchChannelDropdown(false);
          setMatchSelectedCategory('all');
        }
      })
      .catch(err => {
        setIsSavingMatch(false);
        setMatchError('حدث خطأ أثناء حفظ المباراة');
        console.error(err);
      });
  };

  const handleDeleteMatch = (id: string) => {
    fetch(`/api/admin/matches/${id}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          fetchMatches();
          setMatchToDelete(null);
        }
      })
      .catch(err => console.error('Error deleting match:', err));
  };

  const handleEditMatch = (m: MatchItem) => {
    setMatchEditId(m.id);
    setMatchTeam1(m.team1);
    setMatchTeam2(m.team2);
    setMatchTeam1Logo(m.team1Logo || '');
    setMatchTeam2Logo(m.team2Logo || '');
    setMatchTime(m.time);
    setMatchDate(m.date || '');
    setMatchChannelId(m.channelId);
    setMatchChannelName(m.channelName);
    setMatchStatus(m.status || 'live');
    
    const formEl = document.getElementById('match-editor-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleMatchChannelSearch = (query: string) => {
    setMatchChannelSearchQuery(query);
    if (!query.trim()) {
      setMatchChannelSearchResults([]);
      return;
    }
    setIsSearchingMatchChannels(true);
    setShowMatchChannelDropdown(true);

    fetch(`/api/iptv/streams?type=live&search=${encodeURIComponent(query)}&page=1&limit=30`)
      .then(res => res.json())
      .then(data => {
        setIsSearchingMatchChannels(false);
        if (!data.error) {
          setMatchChannelSearchResults(data.items || []);
        } else {
          setMatchChannelSearchResults([]);
        }
      })
      .catch(err => {
        setIsSearchingMatchChannels(false);
        console.error('Error fetching match channels:', err);
      });
  };

  const handleAdminCategoryChange = (catId: string) => {
    setSelectedAdminLiveCategory(catId);
    setAdminLivePage(1);
  };

  const handleAdminSearchChange = (val: string) => {
    setAdminLiveSearch(val);
    setAdminLivePage(1);
  };

  const handleSearchStreamsForOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideSearchText.trim()) return;
    setIsSearchingOverrides(true);

    if (overrideSearchTab.endsWith('_cats')) {
      const catType = overrideSearchTab.replace('_cats', '');
      fetch(`/api/iptv/categories?type=${catType}`)
        .then(res => res.json())
        .then(data => {
          setIsSearchingOverrides(false);
          if (Array.isArray(data)) {
            const query = overrideSearchText.toLowerCase().trim();
            const results = data.filter((c: any) => 
              String(c.category_name || '').toLowerCase().includes(query)
            );
            setOverrideSearchResults(results.map((c: any) => ({
              category_id: c.category_id,
              name: c.category_name,
              parent_id: c.parent_id,
              isCategory: true,
              catType: catType
            })));
          } else {
            setOverrideSearchResults([]);
          }
        })
        .catch(err => {
          setIsSearchingOverrides(false);
          setOverrideSearchResults([]);
          console.error('Error searching categories:', err);
        });
    } else {
      fetch(`/api/iptv/streams?type=${overrideSearchTab}&search=${encodeURIComponent(overrideSearchText)}&page=1&limit=30`)
        .then(res => res.json())
        .then(data => {
          setIsSearchingOverrides(false);
          if (!data.error) {
            setOverrideSearchResults(data.items || []);
          } else {
            setOverrideSearchResults([]);
          }
        })
        .catch(err => {
          setIsSearchingOverrides(false);
          setOverrideSearchResults([]);
          console.error('Error searching streams for override:', err);
        });
    }
  };

  // Launch deep link internally when activePlay changes (only if autoPlayEnabled is true)
  useEffect(() => {
    if (!activePlay) return;

    if (!autoPlayEnabled) {
      setLauncherStatus('idle');
      return;
    }

    setLauncherStatus('launching');

    // Deep link protocol construction
    const params = [];
    params.push(`name=${encodeURIComponent(activePlay.name)}`);
    params.push(`hd=${encodeURIComponent(activePlay.url)}`);
    const deepLink = `myplayer://play?${params.join('&')}`;

    console.log("Triggering deep link:", deepLink);

    // Track if app launch was successful (visbility check)
    let isAppLaunched = false;
    const handleBlur = () => {
      isAppLaunched = true;
    };
    window.addEventListener('blur', handleBlur);

    // Attempt to launch using iframe
    let iframe = iframeRef.current;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      iframeRef.current = iframe;
    }
    
    try {
      iframe.src = deepLink;
    } catch (e) {
      console.error("Iframe trigger error:", e);
    }

    // Set fallback timeout (2 seconds)
    const timeout = setTimeout(() => {
      if (!isAppLaunched && !document.hidden) {
        setLauncherStatus('failed');
      }
    }, 2000);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('blur', handleBlur);
    };
  }, [activePlay, autoPlayEnabled]);

  // Handle manual/forced launch
  const handleLaunchManual = () => {
    if (!activePlay) return;
    const params = [];
    params.push(`name=${encodeURIComponent(activePlay.name)}`);
    params.push(`hd=${encodeURIComponent(activePlay.url)}`);
    const deepLink = `myplayer://play?${params.join('&')}`;

    if (launcherStatus === 'failed') {
      // In failed state, redirect to Mediafire APK download
      window.open(SAFE_APK_URL, '_blank');
    } else {
      window.location.href = deepLink;
    }
  };

  // Handle retry
  const handleRetryLaunch = () => {
    setLauncherStatus('launching');
    if (!activePlay) return;
    const params = [];
    params.push(`name=${encodeURIComponent(activePlay.name)}`);
    params.push(`hd=${encodeURIComponent(activePlay.url)}`);
    const deepLink = `myplayer://play?${params.join('&')}`;
    
    if (iframeRef.current) {
      iframeRef.current.src = deepLink;
    }

    setTimeout(() => {
      if (!document.hidden) {
        setLauncherStatus('failed');
      }
    }, 2000);
  };

  // Copy Mediafire download link to clipboard
  const handleCopyDownloadLink = () => {
    navigator.clipboard.writeText(SAFE_APK_URL)
      .then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      })
      .catch(err => {
        console.error('Failed to copy download link:', err);
      });
  };

  // Helper to generate the direct IPTV link (.mp4 for movies and .mkv for series episodes)
  const getMp4DownloadUrl = () => {
    if (!activePlay) return '';
    let targetUrl = activePlay.url;
    
    // Convert extension to mp4 for movies or mkv for series episodes
    if (activePlay.type === 'vod' || activePlay.type === 'series') {
      const targetExt = activePlay.type === 'series' ? '.mkv' : '.mp4';
      const lastDot = activePlay.url.lastIndexOf('.');
      if (lastDot !== -1 && lastDot > activePlay.url.lastIndexOf('/')) {
        const ext = activePlay.url.substring(lastDot).toLowerCase();
        if (ext !== targetExt) {
          targetUrl = activePlay.url.substring(0, lastDot) + targetExt;
        }
      } else {
        targetUrl = activePlay.url + targetExt;
      }
    }
    return targetUrl;
  };

  // Copy direct MP4 link to clipboard so the user can download it with third-party apps (e.g. VLC, ADM, IDM)
  const handleCopyVideoUrl = () => {
    const videoUrl = getMp4DownloadUrl();
    if (!videoUrl) return;
    navigator.clipboard.writeText(videoUrl)
      .then(() => {
        setCopiedVideoLink(true);
        setTimeout(() => setCopiedVideoLink(false), 3000);
      })
      .catch(err => {
        console.error('Failed to copy video link:', err);
      });
  };

  // Format UNIX timestamp to Arabic date string
  const formatArabicDate = (unixTimestamp: string | null) => {
    if (!unixTimestamp) return 'غير محدد';
    const num = parseInt(unixTimestamp, 10);
    if (isNaN(num) || num <= 0) return 'غير محدود';
    // Expired or active check
    const date = new Date(num * 1000);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Quick reset helper for filters
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchVal);
    setPage(1);
  };

  return (
    <div className="relative min-h-screen pb-16 bg-[#030614] overflow-x-hidden">
      {/* Visual background neon decor */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[400px] height-[400px] rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[500px] height-[500px] rounded-full bg-fuchsia-500/5 blur-[150px]" />
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(0,229,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

        {isAdminPage ? (
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            {!isAdminAuthenticated ? (
            // ====== ADMIN LOGIN SCREEN ======
            <div className="flex flex-col items-center justify-center min-h-[70vh] py-12 px-4 animate-fade-in text-right" dir="rtl">
              <div className="w-full max-w-md p-8 rounded-3xl border border-white/10 bg-[#0b1120]/70 backdrop-blur-md shadow-2xl space-y-6 relative overflow-hidden">
                {/* Ambient glow decoration inside card */}
                <div className="absolute top-0 left-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl" />
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-fuchsia-500/10 rounded-full blur-2xl" />

                <div className="flex flex-col items-center text-center space-y-3 relative z-10">
                  <div className="p-4 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-2xl shadow-lg shadow-cyan-500/20">
                    <Settings className="w-8 h-8 text-white animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">تسجيل دخول الإدارة</h2>
                    <p className="text-xs text-gray-400 mt-1">يرجى إدخال كلمة مرور المدير للوصول للوحة التحكم</p>
                  </div>
                </div>

                <form onSubmit={handleAdminLoginSubmit} className="space-y-4 relative z-10">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">كلمة المرور *</label>
                    <input
                      type="password"
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      placeholder="••••••••••••••"
                      required
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none transition-colors text-center font-mono"
                      dir="ltr"
                    />
                  </div>

                  {adminPasswordError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-400 text-center animate-shake">
                      {adminPasswordError}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-xs transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>دخول لوحة التحكم</span>
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        window.location.hash = '';
                        if (window.location.pathname.includes('/admin')) {
                          window.history.pushState({}, '', '/');
                        }
                        setIsAdminPage(false);
                      }}
                      className="w-full py-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs transition-all duration-300 cursor-pointer text-center"
                    >
                      الرجوع لواجهة البث العامة
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            // ====== ADMIN CONTROL PANEL ======
            <div className="space-y-8 pb-12 animate-fade-in text-right" dir="rtl">
              {/* Admin Header Section with glass effect */}
              <header className="p-6 rounded-3xl border border-white/10 bg-[#0b1120]/60 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-gradient-to-tr from-fuchsia-500 via-indigo-500 to-cyan-500 rounded-2xl shadow-lg shadow-fuchsia-500/20">
                    <Settings className="w-8 h-8 text-white animate-[spin_8s_linear_infinite]" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-indigo-300">
                      لوحة تحكم المدير المتقدمة
                    </h1>
                    <p className="text-xs text-gray-400 mt-1 font-medium">
                      تعديل إعدادات الاتصال بسيرفر IPTV وتغيير أسماء وشعارات أو روابط تشغيل القنوات والمسلسلات
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={() => {
                      sessionStorage.removeItem('isAdminAuthenticated');
                      setIsAdminAuthenticated(false);
                    }}
                    className="px-5 py-3 rounded-2xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-extrabold text-xs transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <span>تسجيل الخروج</span>
                  </button>

                  <button 
                    onClick={() => {
                      window.location.hash = '';
                      // Fallback change path
                      if (window.location.pathname.includes('/admin')) {
                        window.history.pushState({}, '', '/');
                      }
                      setIsAdminPage(false);
                    }}
                    className="px-6 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-extrabold text-xs transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <span>عرض واجهة البث العامة</span>
                    <ExternalLink className="w-4 h-4 text-cyan-400" />
                  </button>
                </div>
              </header>

            {/* Admin Workspace Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Right/Left: Server Connection & Overrides Creator Form */}
              <div className="lg:col-span-5 space-y-8">
                
                {/* Server settings card */}
                 <div className="p-6 rounded-3xl border border-white/10 bg-[#0b1120]/70 backdrop-blur-md shadow-xl transition-all duration-300">
                   <div className="flex items-center justify-between mb-4">
                     <h2 className="text-sm font-black text-white flex items-center gap-2">
                       <Sliders className="w-4 h-4 text-cyan-400" />
                       <span>إعدادات الاتصال بسيرفر IPTV</span>
                     </h2>
                     
                     {!showServerSettings && (
                       <button
                         type="button"
                         onClick={() => setShowServerSettings(true)}
                         className="px-3 py-1.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-extrabold text-xs transition-all duration-300 flex items-center gap-1.5 cursor-pointer shadow-sm"
                       >
                         <Edit className="w-3.5 h-3.5" />
                         <span>تعديل</span>
                       </button>
                     )}
                   </div>
                   
                   {!showServerSettings ? (
                     <div className="space-y-3.5">
                       <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2.5">
                         <div className="flex items-center justify-between text-xs">
                           <span className="text-gray-400">رابط السيرفر:</span>
                           <span className="font-mono text-cyan-400 font-semibold text-left select-all" dir="ltr">
                             {serverConfig.host || 'غير محدد'}
                           </span>
                         </div>
                         <div className="flex items-center justify-between text-xs border-t border-white/5 pt-2.5">
                           <span className="text-gray-400">اسم المستخدم:</span>
                           <span className="font-mono text-gray-200 font-semibold text-left select-all" dir="ltr">
                             {serverConfig.username || 'غير محدد'}
                           </span>
                         </div>
                         <div className="flex items-center justify-between text-xs border-t border-white/5 pt-2.5">
                           <span className="text-gray-400">كلمة المرور:</span>
                           <span className="font-mono text-gray-400 font-semibold text-left" dir="ltr">
                             ••••••••
                           </span>
                         </div>
                         <div className="flex items-center justify-between text-xs border-t border-white/5 pt-2.5">
                           <span className="text-gray-400">مصدر جلب البيانات الحالي:</span>
                           <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                             serverConfig.useSupabase 
                               ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                               : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                           }`}>
                             {serverConfig.useSupabase ? 'قاعدة بيانات Supabase' : 'سيرفر IPTV المباشر'}
                           </span>
                         </div>
                       </div>

                       {configMessage && (
                         <div className={`p-3.5 rounded-xl text-xs font-bold border ${
                           configMessage.type === 'success' 
                             ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                             : 'bg-red-500/10 border-red-500/20 text-red-400'
                         }`}>
                           {configMessage.text}
                         </div>
                       )}
                     </div>
                   ) : (
                     <form onSubmit={handleSaveConfig} className="space-y-4">
                       <div>
                         <label className="block text-xs font-semibold text-gray-400 mb-1.5">رابط السيرفر (Host URL)</label>
                         <input
                           type="url"
                           value={adminHost}
                           onChange={(e) => setAdminHost(e.target.value)}
                           placeholder="http://vo5px.top"
                           required
                           className="w-full px-4 py-3 bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none transition-colors text-left"
                           dir="ltr"
                         />
                       </div>
                       
                       <div className="grid grid-cols-2 gap-3">
                         <div>
                           <label className="block text-xs font-semibold text-gray-400 mb-1.5">اسم المستخدم</label>
                           <input
                             type="text"
                             value={adminUser}
                             onChange={(e) => setAdminUser(e.target.value)}
                             placeholder="Username"
                             required
                             className="w-full px-4 py-3 bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none transition-colors text-left"
                             dir="ltr"
                           />
                         </div>
                         <div>
                           <label className="block text-xs font-semibold text-gray-400 mb-1.5">كلمة المرور</label>
                           <input
                             type="text"
                             value={adminPass}
                             onChange={(e) => setAdminPass(e.target.value)}
                             placeholder="Password"
                             required
                             className="w-full px-4 py-3 bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none transition-colors text-left"
                             dir="ltr"
                           />
                         </div>
                       </div>

                       <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-white/5">
                         <div className="flex flex-col text-right ml-4">
                           <span className="text-xs font-bold text-white">تفعيل قاعدة بيانات Supabase كمصدر</span>
                           <span className="text-[10px] text-gray-400 leading-normal mt-0.5">عند التعطيل، سيتم جلب كافة البيانات والمواد مباشرة من سيرفر IPTV الخاص بك.</span>
                         </div>
                         <button
                           type="button"
                           onClick={() => setAdminUseSupabase(!adminUseSupabase)}
                           className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                             adminUseSupabase ? 'bg-emerald-500' : 'bg-gray-700'
                           }`}
                         >
                           <span
                             className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                               adminUseSupabase ? '-translate-x-5' : 'translate-x-0'
                             }`}
                           />
                         </button>
                       </div>
 
                       {configMessage && (
                         <div className={`p-3.5 rounded-xl text-xs font-bold border ${
                           configMessage.type === 'success' 
                             ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                             : 'bg-red-500/10 border-red-500/20 text-red-400'
                         }`}>
                           {configMessage.text}
                         </div>
                       )}
 
                       <div className="flex gap-2.5 pt-1.5">
                         <button
                           type="button"
                           onClick={() => setShowServerSettings(false)}
                           className="flex-1 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 font-extrabold text-xs transition-all duration-300 flex items-center justify-center cursor-pointer shadow-sm"
                         >
                           إلغاء
                         </button>
                         <button
                           type="submit"
                           disabled={isSavingConfig}
                           className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-xs transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                         >
                           {isSavingConfig ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : null}
                           <span>حفظ الإعدادات وتحديث الاتصال</span>
                         </button>
                       </div>
                     </form>
                   )}
                 </div>

                  {/* Supabase Database Connection & Sync Manager */}
                  <div className="p-6 rounded-3xl border border-white/10 bg-[#0b1120]/70 backdrop-blur-md shadow-xl transition-all duration-300">
                    <h2 className="text-sm font-black text-white mb-2 flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-400" />
                      <span>مزامنة قاعدة البيانات السحابية (Supabase)</span>
                    </h2>
                    <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
                      يقوم النظام بجلب القنوات والأفلام والمسلسلات والمباريات كاملة من سيرفر IPTV وتخزينها تلقائياً وبشكل دائم في قاعدة بيانات Supabase السحابية، ليعرض الموقع كافة البيانات منها بسرعة فائقة وبدون أي تأخير.
                    </p>

                    <div className="space-y-4">
                      {/* Connection status badge */}
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/5">
                        <span className="text-xs text-gray-400">حالة الاتصال بـ Supabase:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="text-xs font-bold text-emerald-400">نشط (متصل)</span>
                        </div>
                      </div>

                      {/* Sync Results */}
                      {syncResult && (
                        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                          <div className="text-xs font-black text-emerald-400 flex items-center gap-1">
                            <span>✓</span>
                            <span>اكتملت المزامنة بنجاح!</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                            <div className="bg-black/30 p-2 rounded-xl border border-emerald-500/10">
                              <span className="text-gray-400 block mb-0.5">الفئات المستوردة:</span>
                              <span className="font-mono font-bold text-white text-xs">{syncResult.totalCategories} فئة</span>
                            </div>
                            <div className="bg-black/30 p-2 rounded-xl border border-emerald-500/10">
                              <span className="text-gray-400 block mb-0.5">المواد والقنوات:</span>
                              <span className="font-mono font-bold text-white text-xs">{syncResult.totalStreams} مادة</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sync Error with SQL Help */}
                      {syncError && (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-3">
                          <div className="text-xs font-black text-red-400 flex items-center gap-1">
                            <span>⚠️</span>
                            <span>خطأ أثناء المزامنة:</span>
                          </div>
                          <p className="text-[11px] text-red-300 leading-normal">{syncError}</p>
                          
                          {syncSqlInstruction && (
                            <div className="space-y-1.5 pt-1.5 border-t border-red-500/10">
                              <span className="text-[10px] text-gray-400 block font-bold">يرجى تشغيل هذا الأمر في محرّر SQL الخاص بـ Supabase:</span>
                              <pre className="p-2.5 rounded-xl bg-black/60 text-cyan-400 text-[10px] font-mono overflow-x-auto max-h-32 text-left" dir="ltr">
                                {`CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT,
  parent_id INTEGER,
  type TEXT
);

CREATE TABLE IF NOT EXISTS streams (
  stream_id TEXT PRIMARY KEY,
  category_id TEXT,
  name TEXT,
  stream_icon TEXT,
  container_extension TEXT,
  type TEXT,
  rating TEXT,
  added TEXT,
  custom_url TEXT
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow write" ON categories FOR ALL USING (true);

ALTER TABLE streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read" ON streams FOR SELECT USING (true);
CREATE POLICY "Allow write" ON streams FOR ALL USING (true);`}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleSyncSupabase}
                        disabled={isSyncing}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-extrabold text-xs transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>جاري جلب وحفظ البيانات كاملة من السيرفر السحابي...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 text-white" />
                            <span>بدء المزامنة الكاملة وحفظ البيانات في Supabase</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                 {/* Override items customization card */}
                 {overrideId && (
                   <div id="override-editor-form" className="p-6 rounded-3xl border border-white/10 bg-[#0b1120]/70 backdrop-blur-md shadow-xl animate-fade-in">
                     <h2 className="text-sm font-black text-white mb-2 flex items-center gap-2">
                       <Plus className="w-4 h-4 text-fuchsia-400" />
                       <span>تخصيص وتعديل قنوات وبث السيرفر</span>
                     </h2>
                     <p className="text-[10px] text-gray-400 mb-4 leading-relaxed">
                       ادخل معرف القناة (Stream ID) لتعديل الاسم، شعار القناة، أو وضع رابط بث خارجي بديل لتشغيلها بشكل مباشر.
                     </p>

                     <form onSubmit={handleSaveOverride} className="space-y-4">
                       <div className="grid grid-cols-3 gap-3">
                         <div className="col-span-1">
                           <label className="block text-xs font-semibold text-gray-400 mb-1.5">معرف المادة *</label>
                           <input
                             type="text"
                             value={overrideId}
                             onChange={(e) => setOverrideId(e.target.value)}
                             placeholder=""
                             required
                             className="w-full px-4 py-3 bg-black/40 border border-white/10 focus:border-fuchsia-500 rounded-xl text-xs text-white focus:outline-none transition-colors text-left"
                             dir="ltr"
                           />
                         </div>
                         <div className="col-span-2">
                           <label className="block text-xs font-semibold text-gray-400 mb-1.5">الاسم البديل المخصص</label>
                           <input
                             type="text"
                             value={overrideName}
                             onChange={(e) => setOverrideName(e.target.value)}
                             placeholder=""
                             className="w-full px-4 py-3 bg-black/40 border border-white/10 focus:border-fuchsia-500 rounded-xl text-xs text-white focus:outline-none transition-colors"
                           />
                         </div>
                       </div>

                       <div>
                         <label className="block text-xs font-semibold text-gray-400 mb-1.5">رابط الشعار المخصص (Logo URL)</label>
                         <input
                           type="url"
                           value={overrideIcon}
                           onChange={(e) => setOverrideIcon(e.target.value)}
                           placeholder="https://example.com/logo.png"
                           className="w-full px-4 py-3 bg-black/40 border border-white/10 focus:border-fuchsia-500 rounded-xl text-xs text-white focus:outline-none transition-colors text-left"
                           dir="ltr"
                         />
                       </div>

                       <div>
                         <label className="block text-xs font-semibold text-gray-400 mb-1.5">رابط البث البديل (Stream Link / M3U8)</label>
                         <input
                           type="url"
                           value={overrideStreamUrl}
                           onChange={(e) => setOverrideStreamUrl(e.target.value)}
                           placeholder="https://example.com/stream.m3u8"
                           className="w-full px-4 py-3 bg-black/40 border border-white/10 focus:border-fuchsia-500 rounded-xl text-xs text-white focus:outline-none transition-colors text-left"
                           dir="ltr"
                         />
                       </div>

                       <div className="flex gap-2">
                         <button
                           type="submit"
                           disabled={isSavingOverride || !overrideId}
                           className="flex-grow py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-600 hover:from-fuchsia-400 hover:to-indigo-500 text-white font-extrabold text-xs transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                         >
                           {isSavingOverride ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                           <span>حفظ التعديل والمزامنة</span>
                         </button>
                         
                         {overrideId && (
                           <button
                             type="button"
                             onClick={() => {
                               setOverrideId('');
                               setOverrideName('');
                               setOverrideIcon('');
                               setOverrideStreamUrl('');
                             }}
                             className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-bold text-xs transition-all duration-300 cursor-pointer"
                           >
                             إلغاء
                           </button>
                         )}
                       </div>
                     </form>
                   </div>
                 )}

                {/* Match Creator Form */}
                <div id="match-editor-form" className="p-6 rounded-3xl border border-white/10 bg-[#0b1120]/70 backdrop-blur-md shadow-xl mt-6">
                  <h2 className="text-sm font-black text-white mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <span>{matchEditId ? 'تعديل مباراة قائمة' : 'إضافة مباراة جديدة'}</span>
                  </h2>
                  <p className="text-[10px] text-gray-400 mb-4 leading-relaxed">
                    قم بإضافة مباراة جديدة، حدد أسماء الفرق والشعارات، واقرنها بقناة البث المباشر لتبث مباشرة في الصفحة الرئيسية.
                  </p>

                  <form onSubmit={handleSaveMatch} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1.5">الفريق الأول (صاحب الأرض) *</label>
                        <input
                          type="text"
                          value={matchTeam1}
                          onChange={(e) => setMatchTeam1(e.target.value)}
                          placeholder=""
                          required
                          className="w-full px-4 py-3 bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl text-xs text-white focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1.5">الفريق الثاني (الضيف) *</label>
                        <input
                          type="text"
                          value={matchTeam2}
                          onChange={(e) => setMatchTeam2(e.target.value)}
                          placeholder=""
                          required
                          className="w-full px-4 py-3 bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl text-xs text-white focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1.5">شعار الفريق الأول (رابط أو إيموجي)</label>
                        <input
                          type="text"
                          value={matchTeam1Logo}
                          onChange={(e) => setMatchTeam1Logo(e.target.value)}
                          placeholder=""
                          className="w-full px-4 py-3 bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl text-xs text-white focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1.5">شعار الفريق الثاني (رابط أو إيموجي)</label>
                        <input
                          type="text"
                          value={matchTeam2Logo}
                          onChange={(e) => setMatchTeam2Logo(e.target.value)}
                          placeholder=""
                          className="w-full px-4 py-3 bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl text-xs text-white focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-400">وقت المباراة *</label>
                        <input
                          type="time"
                          value={arabic12hToTime24(matchTime)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMatchTime(formatTimeToArabic12h(val));
                          }}
                          required
                          style={{ colorScheme: 'dark' }}
                          className="w-full px-4 py-3 bg-[#0b1120] border border-white/10 focus:border-cyan-500 rounded-xl text-xs text-white focus:outline-none transition-colors cursor-pointer text-left"
                          dir="ltr"
                        />
                        {matchTime && (
                          <div className="text-[10px] text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 inline-block">
                            الوقت المختار: {matchTime}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-400">تاريخ المباراة (اختياري)</label>
                        <input
                          type="date"
                          value={matchDate}
                          onChange={(e) => setMatchDate(e.target.value)}
                          style={{ colorScheme: 'dark' }}
                          className="w-full px-4 py-3 bg-[#0b1120] border border-white/10 focus:border-cyan-500 rounded-xl text-xs text-white focus:outline-none transition-colors cursor-pointer text-left"
                          dir="ltr"
                        />
                        {matchDate && (
                          <div className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                            التاريخ المختار: {formatYYYYMMDDToArabic(matchDate)}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-400">حالة المباراة</label>
                        <select
                          value={matchStatus}
                          onChange={(e: any) => setMatchStatus(e.target.value)}
                          className="w-full px-4 py-3 bg-[#0b1120] border border-white/10 focus:border-cyan-500 rounded-xl text-xs text-white focus:outline-none transition-colors cursor-pointer"
                        >
                          <option value="live">مباشر الآن 🔴</option>
                          <option value="upcoming">قادمة 🗓️</option>
                          <option value="finished">منتهية 🏁</option>
                        </select>
                      </div>
                    </div>

                    {/* Channel Selector for Match */}
                    <div className="border border-white/5 bg-black/25 p-4 rounded-2xl space-y-4">
                      <h3 className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                        <Tv className="w-3.5 h-3.5 text-cyan-400" />
                        <span>ربط بقناة البث المباشر *</span>
                      </h3>

                      {/* Dropdown Menu (القائمة المنسدلة المباشرة مع تصفية الفئة) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Category Filter for dropdown */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-1.5">تصفية القنوات حسب الفئة:</label>
                          <select
                            value={matchSelectedCategory}
                            onChange={(e) => {
                              setMatchSelectedCategory(e.target.value);
                            }}
                            className="w-full px-4 py-3 bg-[#0b1120] border border-white/10 focus:border-cyan-500 rounded-xl text-xs text-white focus:outline-none transition-colors cursor-pointer"
                          >
                            <option value="all">كل الفئات والقنوات 📺</option>
                            {adminLiveCategories.map(cat => (
                              <option key={cat.category_id} value={cat.category_id}>{cat.category_name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Channel Selection dropdown */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-1.5">اختر القناة من القائمة المنسدلة:</label>
                          {isLoadingAllLiveChannels ? (
                            <div className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs text-gray-400 flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                              <span>جاري تحميل القنوات من السيرفر...</span>
                            </div>
                          ) : (
                            <select
                              value={matchChannelId}
                              onChange={(e) => {
                                const selectedId = e.target.value;
                                const chObj = allLiveChannels.find(c => String(c.stream_id || '') === String(selectedId));
                                if (chObj) {
                                  setMatchChannelId(String(chObj.stream_id));
                                  setMatchChannelName(chObj.name);
                                } else {
                                  setMatchChannelId('');
                                  setMatchChannelName('');
                                }
                              }}
                              className="w-full px-4 py-3 bg-[#0b1120] border border-white/10 focus:border-cyan-500 rounded-xl text-xs text-white focus:outline-none transition-colors cursor-pointer"
                            >
                              <option value="">
                                {matchSelectedCategory === 'all' 
                                  ? `-- اختر قناة من القائمة المنسدلة (${allLiveChannels.length} قناة) --`
                                  : `-- اختر قناة من الفئة المحددة (${allLiveChannels.filter(c => String(c.category_id) === String(matchSelectedCategory)).length} قناة) --`
                                }
                              </option>
                              {allLiveChannels
                                .filter(c => matchSelectedCategory === 'all' || String(c.category_id) === String(matchSelectedCategory))
                                .map((ch) => (
                                  <option key={ch.stream_id} value={ch.stream_id}>
                                    {ch.name} (ID: {ch.stream_id})
                                  </option>
                                ))
                              }
                            </select>
                          )}
                        </div>
                      </div>
                    </div>

                    {matchError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-400">
                        {matchError}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isSavingMatch || !matchChannelId}
                        className="flex-grow py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-xs transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isSavingMatch ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        <span>{matchEditId ? 'تعديل وحفظ المباراة' : 'إضافة ونشر المباراة'}</span>
                      </button>

                      {(matchEditId || matchTeam1 || matchTeam2 || matchChannelId) && (
                        <button
                          type="button"
                          onClick={() => {
                            setMatchEditId(null);
                            setMatchTeam1('');
                            setMatchTeam2('');
                            setMatchTeam1Logo('');
                            setMatchTeam2Logo('');
                            setMatchTime('');
                            setMatchDate('');
                            setMatchChannelId('');
                            setMatchChannelName('');
                            setMatchStatus('live');
                            setMatchError(null);
                            setMatchChannelSearchQuery('');
                            setMatchChannelSearchResults([]);
                            setShowMatchChannelDropdown(false);
                            setMatchSelectedCategory('all');
                          }}
                          className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-bold text-xs transition-all duration-300 cursor-pointer"
                        >
                          إلغاء
                        </button>
                      )}
                    </div>
                  </form>
                </div>

              </div>

              {/* Right Column: Streams Lookup Search & Overrides List */}
              <div className="lg:col-span-7 space-y-8">

                {/* Direct Live Channels Browser & Importer */}
                <div className="p-6 rounded-3xl border border-white/10 bg-[#0b1120]/70 backdrop-blur-md shadow-xl" dir="rtl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-sm font-black text-white flex items-center gap-2">
                        <Tv className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <span>مستورد القنوات المباشرة السريع</span>
                      </h2>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                        تصفح جميع القنوات الحية على السيرفر وقم بربطها كقنوات بث للمباريات أو تخصيصها بنقرة واحدة.
                      </p>
                    </div>
                    
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 font-bold self-start sm:self-center">
                      إجمالي القنوات: {adminLiveTotalItems}
                    </span>
                  </div>

                  {/* Filters Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {/* Category Filter */}
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1 font-bold">المجموعة / الفئة:</label>
                      <select
                        value={selectedAdminLiveCategory}
                        onChange={(e) => handleAdminCategoryChange(e.target.value)}
                        className="w-full px-3 py-2.5 bg-black/40 border border-white/10 focus:border-emerald-500 rounded-xl text-xs text-white focus:outline-none transition-colors cursor-pointer"
                      >
                        <option value="all">كل المجموعات والقنوات 📺</option>
                        {adminLiveCategories.map(cat => (
                          <option key={cat.category_id} value={cat.category_id}>{cat.category_name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Search Field */}
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1 font-bold">ابحث باسم القناة:</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={adminLiveSearch}
                          onChange={(e) => handleAdminSearchChange(e.target.value)}
                          placeholder="اكتب اسم القناة للبحث السريع..."
                          className="w-full px-3 py-2.5 bg-black/40 border border-white/10 focus:border-emerald-500 rounded-xl text-xs text-white focus:outline-none transition-colors pl-8 text-right"
                          dir="rtl"
                        />
                        <Search className="w-4 h-4 text-gray-500 absolute left-2.5 top-3" />
                      </div>
                    </div>
                  </div>

                  {/* Channels Grid / Loading State */}
                  {isAdminLoadingChannels ? (
                    <div className="py-16 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                      <span className="font-bold">جاري تحميل القنوات من السيرفر المباشر...</span>
                    </div>
                  ) : adminLiveChannels.length === 0 ? (
                    <div className="py-12 text-center border border-dashed border-white/10 rounded-2xl bg-black/20">
                      <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 font-bold">لم يتم العثور على أي قنوات.</p>
                      <p className="text-[10px] text-gray-600 mt-1">تأكد من إعدادات اتصال السيرفر أو جرب كلمة بحث أخرى.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {adminLiveChannels.map((ch) => {
                        const idStr = String(ch.stream_id || '');
                        const iconStr = ch.stream_icon || '';
                        return (
                          <div key={idStr} className="p-3 rounded-xl border border-white/5 bg-black/25 flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2.5 truncate">
                              {iconStr ? (
                                <img src={iconStr} alt="" className="w-8 h-8 rounded object-cover border border-white/10" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-[10px]">📺</div>
                              )}
                              <div className="truncate text-right">
                                <p className="font-bold text-gray-200 truncate">{ch.name}</p>
                                <p className="text-[10px] text-gray-500">ID: {idStr}</p>
                              </div>
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  setOverrideId(idStr);
                                  setOverrideName(ch.name);
                                  setOverrideIcon(iconStr);
                                  setOverrideStreamUrl(ch.customUrl || getDirectStreamUrl(ch.stream_id || '', 'live', ch.container_extension));
                                  const element = document.getElementById('override-editor-form');
                                  if (element) {
                                    element.scrollIntoView({ behavior: 'smooth' });
                                  }
                                }}
                                className="py-1.5 px-2.5 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 font-black rounded-lg text-[9px] transition-all cursor-pointer flex items-center justify-center gap-1 border border-fuchsia-500/15"
                              >
                                <Edit className="w-3 h-3" />
                                <span>تعديل القناة</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {adminLiveTotalPages > 1 && !isAdminLoadingChannels && (
                    <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-white/5">
                      <button
                        type="button"
                        disabled={adminLivePage <= 1}
                        onClick={() => setAdminLivePage(prev => Math.max(1, prev - 1))}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold text-[10px] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span>السابق</span>
                      </button>

                      <span className="text-[10px] text-gray-500 font-bold">
                        صفحة {adminLivePage} من {adminLiveTotalPages}
                      </span>

                      <button
                        type="button"
                        disabled={adminLivePage >= adminLiveTotalPages}
                        onClick={() => setAdminLivePage(prev => Math.min(adminLiveTotalPages, prev + 1))}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold text-[10px] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                      >
                        <span>التالي</span>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Live stream search assistant */}
                <div className="p-6 rounded-3xl border border-white/10 bg-[#0b1120]/70 backdrop-blur-md shadow-xl">
                  <h2 className="text-sm font-black text-white mb-2 flex items-center gap-2">
                    <Search className="w-4 h-4 text-cyan-400" />
                    <span>مساعد البحث وتحديد معرفات القنوات والاقسام</span>
                  </h2>
                  <p className="text-[10px] text-gray-400 mb-4">
                    ابحث عن أي قناة أو فيلم أو مسلسل أو قسم على السيرفر لتعديل بياناتها بضغطة زر واحدة دون الحاجة لمعرفة الـ ID مسبقاً.
                  </p>

                  <form onSubmit={handleSearchStreamsForOverride} className="flex gap-2 mb-4">
                    <select
                      value={overrideSearchTab}
                      onChange={(e: any) => setOverrideSearchTab(e.target.value)}
                      className="px-3.5 py-2.5 bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl text-xs text-white focus:outline-none transition-colors cursor-pointer"
                    >
                      <option value="live">قنوات بث مباشر</option>
                      <option value="vod">أفلام سينما</option>
                      <option value="series">مسلسلات</option>
                      <option value="live_cats">أقسام البث المباشر</option>
                      <option value="vod_cats">أقسام الأفلام</option>
                      <option value="series_cats">أقسام المسلسلات</option>
                    </select>

                    <div className="flex-grow relative">
                      <input
                        type="text"
                        value={overrideSearchText}
                        onChange={(e) => setOverrideSearchText(e.target.value)}
                        placeholder="اكتب اسم القناة أو الفيلم أو القسم للبحث..."
                        required
                        className="w-full px-4 py-2.5 bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl text-xs text-white focus:outline-none transition-colors"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSearchingOverrides}
                      className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50"
                    >
                      {isSearchingOverrides ? 'جاري البحث...' : 'ابحث الآن'}
                    </button>
                  </form>

                  {overrideSearchResults.length > 0 && (
                    <div className="max-h-[220px] overflow-y-auto space-y-2 border border-white/5 bg-black/35 p-2 rounded-xl">
                      {overrideSearchResults.map((item, index) => {
                        const isCat = !!item.isCategory;
                        const idStr = String(isCat ? item.category_id : (item.stream_id || item.series_id || ''));
                        const iconStr = isCat ? '' : (item.stream_icon || item.cover || '');
                        const uniqueKey = isCat ? `cat_${item.catType}_${idStr}_${index}` : `stream_${idStr}_${index}`;
                        
                        return (
                          <div key={uniqueKey} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-xs">
                            <div className="flex items-center gap-2.5 truncate">
                              {isCat ? (
                                <div className="w-7 h-7 bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/20 rounded flex items-center justify-center text-[10px] flex-shrink-0 font-bold">📂</div>
                              ) : iconStr ? (
                                <img src={iconStr} alt="" className="w-7 h-7 rounded object-cover border border-white/10 flex-shrink-0" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-7 h-7 bg-white/10 rounded flex items-center justify-center text-[10px] flex-shrink-0">📺</div>
                              )}
                              <div className="truncate text-right">
                                <p className="font-bold text-gray-200 truncate">{item.name}</p>
                                <p className="text-[10px] text-gray-500">
                                  {isCat ? `قسم: ${item.catType === 'live' ? 'بث مباشر' : item.catType === 'vod' ? 'أفلام' : 'مسلسلات'}` : 'المعرف الأساسي'}: {idStr}
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-2 flex-wrap justify-end">
                              {isCat ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCategory({
                                      id: idStr,
                                      type: item.catType,
                                      name: item.name,
                                      originalName: item.name
                                    });
                                    setTimeout(() => {
                                      const element = document.getElementById('category-editor-form');
                                      if (element) {
                                        element.scrollIntoView({ behavior: 'smooth' });
                                      }
                                    }, 100);
                                  }}
                                  className="px-3.5 py-1.5 bg-fuchsia-500/15 hover:bg-fuchsia-500/25 text-fuchsia-400 font-extrabold rounded-lg text-[10px] transition-all cursor-pointer"
                                >
                                  تعديل اسم هذا القسم
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOverrideId(idStr);
                                      setOverrideName(item.name);
                                      setOverrideIcon(iconStr);
                                      setOverrideStreamUrl(item.customUrl || getDirectStreamUrl(item.stream_id || item.series_id || '', overrideSearchTab, item.container_extension));
                                      const element = document.getElementById('override-editor-form');
                                      if (element) {
                                        element.scrollIntoView({ behavior: 'smooth' });
                                      }
                                    }}
                                    className="px-3.5 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 font-extrabold rounded-lg text-[10px] transition-all cursor-pointer"
                                  >
                                    تعديل هذه المادة
                                  </button>

                                  {overrideSearchTab === 'live' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMatchChannelId(idStr);
                                        setMatchChannelName(item.name);
                                        const element = document.getElementById('match-editor-form');
                                        if (element) {
                                          element.scrollIntoView({ behavior: 'smooth' });
                                        }
                                      }}
                                      className="px-3.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-extrabold rounded-lg text-[10px] transition-all cursor-pointer"
                                    >
                                      ربط كقناة بث للمباراة
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Overriden list table */}
                <div className="p-6 rounded-3xl border border-white/10 bg-[#0b1120]/70 backdrop-blur-md shadow-xl">
                  <h2 className="text-sm font-black text-white mb-3">
                    قائمة المواد والقنوات المعدلة حالياً ({adminOverrides.length})
                  </h2>

                  {adminOverrides.length === 0 ? (
                    <div className="py-12 text-center">
                      <AlertCircle className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 font-bold">لا توجد قنوات أو مواد معدلة مخصصة حالياً.</p>
                      <p className="text-[10px] text-gray-600 mt-1">تعديلاتك ستظهر في هذه القائمة بعد إضافتها.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {adminOverrides.map((ov) => (
                        <div key={ov.id} className="p-3.5 rounded-2xl border border-white/5 bg-black/25 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5 truncate">
                            {ov.icon ? (
                              <img src={ov.icon} alt="" className="w-11 h-11 rounded-xl object-cover border border-white/10 flex-shrink-0" />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs flex-shrink-0">📺</div>
                            )}
                            <div className="truncate text-right">
                              <h4 className="text-xs font-bold text-white truncate">{ov.name || 'الاسم الافتراضي'}</h4>
                              <p className="text-[10px] text-gray-500 mt-0.5">معرف المادة: {ov.id}</p>
                              {ov.streamUrl && (
                                <p className="text-[9px] text-fuchsia-400 truncate mt-0.5" title={ov.streamUrl}>🔗 رابط بث مخصص: {ov.streamUrl}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 flex-shrink-0">
                            {overrideToDelete === ov.id ? (
                              <div className="flex items-center gap-1.5 bg-red-950/40 p-1 px-2 rounded-xl border border-red-500/30">
                                <span className="text-[10px] text-red-400 font-bold">حذف؟</span>
                                <button
                                  onClick={() => handleDeleteOverride(ov.id)}
                                  className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  نعم
                                </button>
                                <button
                                  onClick={() => setOverrideToDelete(null)}
                                  className="px-2 py-1 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditOverride(ov)}
                                  className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-cyan-400 rounded-xl transition-all duration-300 cursor-pointer"
                                  title="تعديل التخصيص"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setOverrideToDelete(ov.id)}
                                  className="p-2.5 bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-xl transition-all duration-300 cursor-pointer"
                                  title="حذف التعديل"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Matches Schedule List */}
                <div className="p-6 rounded-3xl border border-white/10 bg-[#0b1120]/70 backdrop-blur-md shadow-xl mt-6 text-right" dir="rtl">
                  <h2 className="text-sm font-black text-white mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <span>جدول المباريات الحالية ({matches.length})</span>
                  </h2>

                  {matches.length === 0 ? (
                    <div className="py-12 text-center">
                      <AlertCircle className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 font-bold">لا توجد مباريات مضافة حالياً.</p>
                      <p className="text-[10px] text-gray-600 mt-1">المباريات المضافة ستظهر في الصفحة الرئيسية للبث.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {matches.map((m) => {
                        const dynamicStatus = getDynamicMatchStatus(m, currentTime);
                        return (
                          <div key={m.id} className="p-4 rounded-2xl border border-white/5 bg-black/25 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                              {m.team1Logo ? (
                                isLogoUrl(m.team1Logo) ? (
                                  <img src={m.team1Logo} className="w-8 h-8 rounded-full object-cover border border-white/10" alt="" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sm">{m.team1Logo}</div>
                                )
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs">⚽</div>
                              )}
                              <span className="font-extrabold text-xs text-white">{m.team1}</span>
                            </div>
                            <span className="text-gray-500 text-xs font-bold">ضد</span>
                            <div className="flex items-center gap-2">
                              {m.team2Logo ? (
                                isLogoUrl(m.team2Logo) ? (
                                  <img src={m.team2Logo} className="w-8 h-8 rounded-full object-cover border border-white/10" alt="" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sm">{m.team2Logo}</div>
                                )
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs">⚽</div>
                              )}
                              <span className="font-extrabold text-xs text-white">{m.team2}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 justify-between md:justify-end">
                            <div className="text-right">
                              <p className="text-[11px] font-bold text-gray-300">{m.time} {m.date ? `(${m.date})` : ''}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`w-2 h-2 rounded-full ${m.status === 'live' ? 'bg-red-500 animate-pulse' : m.status === 'upcoming' ? 'bg-amber-500' : 'bg-gray-500'}`} />
                                <span className="text-[10px] text-gray-400 font-bold">
                                  {m.status === 'live' ? 'مباشر الآن 🔴' : m.status === 'upcoming' ? 'قادمة 🗓️' : 'منتهية 🏁'} - {m.channelName}
                                </span>
                              </div>
                            </div>

                             <div className="flex gap-2">
                               {matchToDelete === m.id ? (
                                 <div className="flex items-center gap-1.5 bg-red-950/40 p-1 px-2 rounded-xl border border-red-500/30">
                                   <span className="text-[10px] text-red-400 font-bold">حذف؟</span>
                                   <button
                                     onClick={() => handleDeleteMatch(m.id)}
                                     className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                   >
                                     نعم
                                   </button>
                                   <button
                                     onClick={() => setMatchToDelete(null)}
                                     className="px-2 py-1 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                   >
                                     إلغاء
                                   </button>
                                 </div>
                               ) : (
                                 <>
                                   <button
                                     onClick={() => handleEditMatch(m)}
                                     className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-cyan-400 rounded-xl transition-all duration-300 cursor-pointer"
                                     title="تعديل المباراة"
                                   >
                                     <Edit className="w-4 h-4" />
                                   </button>
                                   <button
                                     onClick={() => setMatchToDelete(m.id)}
                                     className="p-2.5 bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-xl transition-all duration-300 cursor-pointer"
                                     title="حذف المباراة"
                                   >
                                     <Trash2 className="w-4 h-4" />
                                   </button>
                                 </>
                               )}
                             </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>
          )}
          </div>
        ) : (
          // ====== PUBLIC STREAM PORTAL ======
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            {/* Header section with glass effect */}
            <header className="mb-6 p-4 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0b1120]/60 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex-shrink-0 w-11 h-11 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden border border-white/20 shadow-lg shadow-cyan-500/15">
                  <img
                    src="/src/assets/images/stadium_tv_logo_1782769049552.jpg"
                    alt="استاد TV"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl md:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-indigo-300 flex items-center gap-2">
                    <span>🏟️</span>
                    <span>استاد TV</span>
                    <span>📺</span>
                  </h1>
                </div>
              </div>

              {/* Subscription stats */}
              {!isLoadingInfo && subscription ? (
                <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-4 text-[10px] sm:text-xs w-full md:w-auto">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg sm:rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 font-semibold shadow-[0_0_15px_rgba(16,185,129,0.05)] justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>الحالة: {subscription.user_info?.status === 'Active' ? 'نشط' : subscription.user_info?.status || 'نشط'}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg sm:rounded-xl border border-white/5 bg-white/5 text-gray-300 justify-center">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
                    <span>ينتهي في: {formatArabicDate(subscription.user_info?.exp_date || null)}</span>
                  </div>
                </div>
              ) : isLoadingInfo ? (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>جاري تحميل بيانات الاشتراك...</span>
                </div>
              ) : null}
            </header>

            {/* Ads removed */}

            {/* Demo Mode Alert Banner */}
            {subscription?.user_info?.isDemo && !isDemoBannerDismissed && (
              <div className="relative mb-6 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-semibold shadow-[0_0_20px_rgba(245,158,11,0.05)] animate-fade-in text-right pl-10" dir="rtl">
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsDemoBannerDismissed(true)}
                  className="absolute top-3 right-3 text-amber-400/60 hover:text-amber-300 transition-colors p-1 rounded-lg hover:bg-amber-500/10 cursor-pointer"
                  title="إخفاء التنبيه"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 animate-pulse">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm mb-0.5">الوضع التجريبي المحسن نشط حالياً (Offline Fallback)</h3>
                    <p className="text-gray-300 text-[11px] leading-relaxed">
                      سيرفر IPTV الحالي لا يستجيب (خطأ 503). قمنا بتفعيل البث التجريبي بمواد ترفيهية وقنوات حية جاهزة للعمل فوراً. يمكنك الانتقال للوحة التحكم لتحديث بيانات السيرفر الخاص بك.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    window.location.hash = 'admin';
                    setIsAdminPage(true);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl transition-all self-start sm:self-center cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Settings className="w-4 h-4" />
                  <span>لوحة تحكم السيرفر</span>
                </button>
              </div>
            )}

            {/* Matches Section at the top of the main page */}
            {matches.length > 0 && (
              <div className="mb-6 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0b1120]/60 backdrop-blur-xl shadow-2xl text-right animate-fade-in" dir="rtl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 sm:p-2 bg-red-500/10 rounded-xl">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                      </span>
                    </div>
                    <h2 className="text-sm sm:text-base md:text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
                      مباريات اليوم والـبـث الـمـبـاشـر
                    </h2>
                  </div>
                  <span className="self-start sm:self-auto text-[10px] sm:text-xs text-cyan-400 font-extrabold bg-cyan-500/10 px-2.5 py-0.5 sm:py-1 rounded-full border border-cyan-500/20">
                    انقر للتشغيل الفوري 📺
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {(showAllMatches ? sortedMatches : sortedMatches.slice(0, 1)).map((m) => {
                    const dynamicStatus = getDynamicMatchStatus(m, currentTime);
                    const isLive = dynamicStatus === 'live';
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          const override = adminOverrides.find(o => String(o.id) === String(m.channelId));
                          const customUrl = override?.streamUrl || undefined;
                          handlePlayStream(
                            `${m.team1} 🆚 ${m.team2} (${m.channelName})`,
                            m.channelId,
                            'live',
                            undefined,
                            customUrl
                          );
                        }}
                        className={`group relative p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${
                          isLive 
                            ? 'bg-gradient-to-br from-red-500/10 via-black/40 to-black/60 border-red-500/30 hover:border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.05)] hover:shadow-[0_0_25px_rgba(239,68,68,0.15)]'
                            : dynamicStatus === 'upcoming'
                            ? 'bg-black/30 hover:bg-black/50 border-white/5 hover:border-cyan-500/30'
                            : 'bg-black/20 border-white/5 opacity-60 hover:opacity-80'
                        }`}
                      >
                        {/* Glow effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        {/* Top Info row */}
                        <div className="flex justify-between items-center mb-3">
                          <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-black flex items-center gap-1 shadow-sm ${
                            isLive 
                              ? 'bg-red-500 text-white animate-pulse'
                              : dynamicStatus === 'upcoming'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                              : 'bg-white/5 text-gray-400'
                          }`}>
                            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                            <span>{isLive ? 'مباشر الآن 🔴' : dynamicStatus === 'upcoming' ? 'مباراة قادمة 🗓️' : 'منتهية 🏁'}</span>
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold bg-white/5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg">
                            {m.time} {m.date ? `| ${m.date}` : ''}
                          </span>
                        </div>

                        {/* Teams row */}
                        <div className="flex items-center justify-between gap-1.5 my-2.5">
                          {/* Team 1 */}
                          <div className="flex-1 flex flex-col items-center text-center gap-1.5 min-w-0">
                            {m.team1Logo ? (
                              isLogoUrl(m.team1Logo) ? (
                                <img
                                  src={m.team1Logo}
                                  alt={m.team1}
                                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-white/10 group-hover:scale-105 transition-transform duration-300 shadow-md"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-lg sm:text-xl group-hover:scale-105 transition-transform duration-300 shadow-md">{m.team1Logo}</div>
                              )
                            ) : (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-base sm:text-lg group-hover:scale-105 transition-transform duration-300">⚽</div>
                            )}
                            <span className="font-extrabold text-[11px] sm:text-xs text-white truncate w-full group-hover:text-cyan-300 transition-colors">{m.team1}</span>
                          </div>

                          {/* Versus badge */}
                          <div className="flex-shrink-0 flex flex-col items-center">
                            <span className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 border border-white/10 font-black text-[9px] sm:text-[10px] text-cyan-400 shadow-md">
                              VS
                            </span>
                          </div>

                          {/* Team 2 */}
                          <div className="flex-1 flex flex-col items-center text-center gap-1.5 min-w-0">
                            {m.team2Logo ? (
                              isLogoUrl(m.team2Logo) ? (
                                <img
                                  src={m.team2Logo}
                                  alt={m.team2}
                                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-white/10 group-hover:scale-105 transition-transform duration-300 shadow-md"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-lg sm:text-xl group-hover:scale-105 transition-transform duration-300 shadow-md">{m.team2Logo}</div>
                              )
                            ) : (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-base sm:text-lg group-hover:scale-105 transition-transform duration-300">⚽</div>
                            )}
                            <span className="font-extrabold text-[11px] sm:text-xs text-white truncate w-full group-hover:text-cyan-300 transition-colors">{m.team2}</span>
                          </div>
                        </div>

                        {/* Bottom channel bar */}
                        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-end text-[10px] sm:text-[11px] font-bold text-gray-400">
                          <div className="hidden items-center gap-1 text-cyan-400 font-extrabold">
                            <Tv className="w-3.5 h-3.5" />
                            <span>{m.channelName}</span>
                          </div>
                          <span className="text-[9px] sm:text-[10px] text-gray-500 group-hover:text-white transition-colors flex items-center gap-1">
                            <span>شاهد البث</span>
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {sortedMatches.length > 1 && (
                  <div className="mt-5 pt-2 flex justify-center border-t border-white/5">
                    <button
                      onClick={() => setShowAllMatches(!showAllMatches)}
                      className="px-6 py-2.5 bg-gradient-to-r from-cyan-600/20 to-indigo-600/20 hover:from-cyan-600/30 hover:to-indigo-600/30 text-xs sm:text-sm font-black text-cyan-400 hover:text-white border border-cyan-500/30 hover:border-cyan-400 rounded-xl transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-950/25"
                    >
                      {showAllMatches ? (
                        <>
                          <span>عرض أقل 👆</span>
                        </>
                      ) : (
                        <>
                          <span>عرض كل المباريات ({sortedMatches.length}) 👇</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Ads removed */}
              </div>
            )}

            {/* Tab Controls & Controls bar */}
            <div className="mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
              
              {/* Custom styled tabs */}
              <div className="flex p-1 bg-[#0b1120]/80 border border-white/5 rounded-xl sm:rounded-2xl md:max-w-xl w-full shadow-lg">
                <button
                  onClick={() => handleTabChangeWithAd('live')}
                  className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:py-3 sm:px-4 rounded-lg sm:rounded-xl text-[11px] sm:text-sm font-bold transition-all duration-300 ${
                    activeTab === 'live'
                      ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="truncate">
                    <span className="hidden [@media(min-width:380px)]:inline">قنوات </span>مباشرة
                  </span>
                </button>
                <button
                  onClick={() => handleTabChangeWithAd('vod')}
                  className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:py-3 sm:px-4 rounded-lg sm:rounded-xl text-[11px] sm:text-sm font-bold transition-all duration-300 ${
                    activeTab === 'vod'
                      ? 'bg-gradient-to-r from-fuchsia-500 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>أفلام</span>
                </button>
                <button
                  onClick={() => handleTabChangeWithAd('series')}
                  className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:py-3 sm:px-4 rounded-lg sm:rounded-xl text-[11px] sm:text-sm font-bold transition-all duration-300 ${
                    activeTab === 'series'
                      ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Clapperboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>مسلسلات</span>
                </button>
                <button
                  onClick={() => handleTabChangeWithAd('favorites')}
                  className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:py-3 sm:px-4 rounded-lg sm:rounded-xl text-[11px] sm:text-sm font-bold transition-all duration-300 ${
                    activeTab === 'favorites'
                      ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                  <span>المفضلة</span>
                </button>
              </div>

              {/* Categories select and Search form combined */}
              <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 flex-grow lg:max-w-2xl">
                {/* Category Dropdown */}
                <div className="relative min-w-[200px]">
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <Layers className="w-4 h-4 text-cyan-400" />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={handleCategoryChange}
                    disabled={isLoadingCats}
                    className="w-full pr-10 pl-4 py-3 bg-[#0b1120] border border-white/10 rounded-2xl text-sm font-semibold text-white focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer appearance-none"
                  >
                    <option value="all">{activeTab === 'favorites' ? 'كل أنواع المفضلة' : 'كل الأقسام'}</option>
                    {displayedCategories.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>

                {/* Search Input */}
                <div className="relative flex-grow flex shadow-md rounded-2xl overflow-hidden border border-white/10 focus-within:border-cyan-500/50 transition-colors">
                  <input
                    type="text"
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    placeholder={
                      activeTab === 'favorites' ? 'ابحث في المفضلة...' :
                      activeTab === 'live' ? 'ابحث عن اسم القناة...' :
                      activeTab === 'vod' ? 'ابحث عن فيلم...' : 'ابحث عن مسلسل...'
                    }
                    className="w-full pr-11 pl-4 py-3 bg-[#0b1120] text-sm font-medium text-white placeholder-gray-500 focus:outline-none"
                  />
                  <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none">
                    <Search className="w-4.5 h-4.5 text-gray-400" />
                  </div>
                  <button
                    type="submit"
                    className="px-6 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs transition-all duration-300"
                  >
                    بحث
                  </button>
                </div>
              </form>
            </div>

            {/* Ads removed */}

            {/* Content list & grids */}
            {isLoadingStreams ? (
              <div className="py-24 flex flex-col items-center justify-center gap-4">
                <div className="relative flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                  <Sparkles className="absolute w-6 h-6 text-fuchsia-500 animate-pulse" />
                </div>
                <p className="text-gray-400 text-sm font-semibold animate-pulse">
                  جاري تحميل قائمة {
                    activeTab === 'live' ? 'القنوات...' :
                    activeTab === 'vod' ? 'الأفلام...' : 'المسلسلات...'
                  }
                </p>
              </div>
            ) : error ? (
              <div className="my-12 p-8 rounded-2xl border border-red-500/20 bg-red-500/5 text-center flex flex-col items-center gap-3">
                <AlertCircle className="w-12 h-12 text-red-400" />
                <h3 className="text-lg font-bold text-white">حدث خطأ أثناء تحميل البيانات</h3>
                <p className="text-gray-400 text-sm max-w-md">{error}</p>
                <button 
                  onClick={() => {
                    setPage(1);
                    setSearchQuery('');
                    setSearchVal('');
                  }}
                  className="mt-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all"
                >
                  إعادة التحميل والمحاولة مجدداً
                </button>
              </div>
            ) : (activeTab === 'favorites' ? filteredFavorites.length === 0 : streams.length === 0) ? (
              <div className="my-16 py-16 text-center rounded-3xl border border-white/5 bg-[#0b1120]/30 backdrop-blur-md">
                {activeTab === 'favorites' ? (
                  <>
                    <Heart className="w-14 h-14 mx-auto text-rose-500/50 mb-4 animate-pulse" />
                    <p className="text-gray-400 font-bold mb-2">
                      {searchQuery ? 'لا توجد نتائج مطابقة لبحثك في المفضلة' : 'قائمة المفضلة فارغة حالياً'}
                    </p>
                    <p className="text-gray-500 text-xs max-w-sm mx-auto">
                      {searchQuery 
                        ? 'تأكد من كتابة الكلمة بشكل صحيح، أو اختر تصنيفاً آخر للتصفح.' 
                        : 'يمكنك إضافة قنواتك وأفلامك ومسلسلاتك المفضلة بالنقر على أيقونة القلب على أي بطاقة لتصل إليها بسرعة هنا.'}
                    </p>
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchVal('');
                          setSearchQuery('');
                          setSelectedCategory('all');
                        }}
                        className="mt-6 px-6 py-2.5 bg-gradient-to-r from-rose-600 to-indigo-600 text-xs font-bold rounded-xl transition-all shadow-md shadow-rose-500/10"
                      >
                        عرض كل المفضلة
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-14 h-14 mx-auto text-gray-500 mb-4" />
                    <p className="text-gray-400 font-bold mb-2">لا توجد نتائج مطابقة لبحثك</p>
                    <p className="text-gray-500 text-xs max-w-sm mx-auto">
                      تأكد من كتابة الكلمة بشكل صحيح، أو اختر قسماً آخراً من القائمة المنسدلة للتصفح.
                    </p>
                    <button
                      onClick={() => {
                        setSearchVal('');
                        setSearchQuery('');
                        setSelectedCategory('all');
                        setPage(1);
                      }}
                      className="mt-6 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 text-xs font-bold rounded-xl transition-all shadow-md"
                    >
                      عرض الكل
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Stream Cards Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-2 sm:gap-3 md:gap-4">
                  {displayedStreams.map((stream) => {
                    const streamId = stream.stream_id || stream.series_id || '';
                    const imageSrc = stream.stream_icon || stream.cover || '';
                    const displayRating = stream.rating ? parseFloat(stream.rating) : null;
                    const streamType = activeTab === 'favorites' ? (stream as any)._favoriteType : activeTab;

                    return (
                      <div
                        key={`${activeTab}-${streamId}`}
                        onClick={() => {
                          if (streamType === 'series') {
                            handleOpenSeries(stream);
                          } else {
                            handlePlayStream(stream.name, streamId, streamType, stream.container_extension, stream.customUrl);
                          }
                        }}
                        className="group relative flex flex-col h-full bg-[#0b1120]/70 border border-white/10 hover:border-cyan-500/50 rounded-lg sm:rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-[0_8px_24px_rgba(6,182,212,0.12)] hover:-translate-y-0.5"
                      >
                        {/* Media container */}
                        <div className="relative aspect-[3/4] bg-[#070b14] overflow-hidden">
                          {/* Favorite Toggle Button */}
                          <button
                            onClick={(e) => toggleFavorite(stream, streamType, e)}
                            className="absolute top-1.5 left-1.5 z-10 p-1 rounded-lg bg-black/60 hover:bg-black/95 border border-white/10 backdrop-blur-md text-rose-500 hover:scale-105 active:scale-95 transition-all shadow-md"
                            title="إضافة للمفضلة"
                          >
                            <Heart 
                              className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-all duration-300 ${
                                isFavorite(streamId, streamType) 
                                  ? 'fill-rose-500 text-rose-500 scale-110' 
                                  : 'text-white/80 hover:text-rose-400'
                              }`} 
                            />
                          </button>

                          {imageSrc ? (
                            <img
                              src={imageSrc}
                              alt={stream.name}
                              loading="lazy"
                              onError={(e) => {
                                // Hide broken image and trigger fallback state
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                              className={`transition-all duration-500 ${
                                streamType === 'live'
                                  ? 'w-12 h-12 sm:w-16 sm:h-16 absolute inset-0 m-auto object-contain rounded-xl bg-white/5 p-1.5 border border-white/5 group-hover:scale-110 shadow-[0_4px_12px_rgba(0,0,0,0.4)]'
                                  : 'w-full h-full object-cover group-hover:scale-105'
                              }`}
                              referrerPolicy="no-referrer"
                            />
                          ) : null}

                          {/* Fallback layout for empty/failed images */}
                          <div 
                            className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-gradient-to-b from-[#111827] to-[#070b14]"
                            style={{ display: imageSrc ? 'none' : 'flex' }}
                          >
                            {streamType === 'live' ? (
                              <Tv className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-500/40 mb-1 group-hover:scale-110 transition-transform" />
                            ) : streamType === 'vod' ? (
                              <Film className="w-6 h-6 sm:w-8 sm:h-8 text-fuchsia-500/40 mb-1 group-hover:scale-110 transition-transform" />
                            ) : (
                              <Clapperboard className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-500/40 mb-1 group-hover:scale-110 transition-transform" />
                            )}
                            <span className="text-[9px] sm:text-[10px] text-gray-500 font-semibold line-clamp-2 px-0.5">
                              {stream.name}
                            </span>
                          </div>

                          {/* Overlay play button on hover */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-black translate-x-0.5" />
                            </div>
                          </div>

                          {/* Category ID/badge on top right */}
                          {displayRating && (
                            <div className="absolute top-1 right-1 px-1 py-0.5 rounded bg-black/75 backdrop-blur-md text-[7px] sm:text-[9px] font-black text-amber-400 flex items-center gap-0.5 shadow-md">
                              ⭐ {displayRating.toFixed(1)}
                            </div>
                          )}

                          {/* Type badge on bottom right */}
                          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-[#030614]/80 backdrop-blur-md border border-white/10 text-[7px] sm:text-[8px] font-bold text-gray-300">
                            {streamType === 'live' ? 'مباشر' : streamType === 'vod' ? 'فيلم' : 'مسلسل'}
                          </div>
                        </div>

                        {/* Meta container */}
                        <div className="p-1.5 sm:p-2 flex flex-col justify-between flex-grow">
                          <h3 className="text-[10px] sm:text-[11px] font-bold text-gray-200 group-hover:text-cyan-400 transition-colors line-clamp-2 leading-tight">
                            {stream.name}
                          </h3>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination controls */}
                {activeTab !== 'favorites' && totalPages > 1 && (
                  <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#0b1120]/50 border border-white/5">
                    <span className="text-xs text-gray-400">
                      عرض النتائج <strong className="text-white">{((page - 1) * LIMIT) + 1} - {Math.min(page * LIMIT, totalItems)}</strong> من أصل <strong className="text-cyan-400">{totalItems}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(p - 1, 1))}
                        disabled={page === 1}
                        className="p-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-xl transition-all cursor-pointer"
                        title="الصفحة السابقة"
                      >
                        <ChevronRight className="w-5 h-5 text-white" />
                      </button>
                      
                      <div className="flex items-center gap-1 px-4 text-xs font-bold text-gray-300">
                        <span>صفحة {page} من {totalPages}</span>
                      </div>

                      <button
                        onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                        disabled={page === totalPages}
                        className="p-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-xl transition-all cursor-pointer"
                        title="الصفحة التالية"
                      >
                        <ChevronLeft className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Ads removed */}
          </div>
        )}

      {/* SERIES SEASONS & EPISODES MODAL */}
      {selectedSeries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-[#0b1120] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
            
            {/* Close button */}
            <button 
              onClick={() => setSelectedSeries(null)}
              className="absolute top-4 left-4 z-10 p-2.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Series Left Column (Meta & Cover) */}
            <div className="md:w-1/3 bg-[#070b14] p-6 flex flex-col gap-4 border-b md:border-b-0 md:border-l border-white/5 overflow-y-auto">
              <div className="aspect-[3/4] w-full rounded-2xl overflow-hidden shadow-lg border border-white/5 bg-black">
                {selectedSeries.stream_icon || selectedSeries.cover ? (
                  <img 
                    src={selectedSeries.stream_icon || selectedSeries.cover} 
                    alt={selectedSeries.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-[#0f172a]">
                    <Clapperboard className="w-16 h-16 text-indigo-500/40 mb-3" />
                    <span className="text-sm font-semibold text-gray-400">{selectedSeries.name}</span>
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-lg font-black text-white leading-relaxed">{selectedSeries.name}</h2>
                {seriesInfo?.info?.rating && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-black">
                    ⭐ {seriesInfo.info.rating} / 10
                  </div>
                )}
                
                {seriesInfo?.info?.plot && (
                  <div className="mt-4">
                    <h4 className="text-xs font-bold text-gray-300 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-indigo-400" />
                      <span>قصة المسلسل:</span>
                    </h4>
                    <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{seriesInfo.info.plot}</p>
                  </div>
                )}

                {seriesInfo?.info?.genre && (
                  <p className="text-xs text-gray-500 mt-3 font-semibold">التصنيف: {seriesInfo.info.genre}</p>
                )}
              </div>
            </div>

            {/* Series Right Column (Seasons and Episodes) */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col bg-[#0b1120]">
              {isLoadingSeries ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                  <p className="text-xs text-gray-400">جاري تحميل حلقات المسلسل...</p>
                </div>
              ) : seriesInfo ? (
                <>
                  {/* Season selector */}
                  <div className="mb-6">
                    <h3 className="text-xs font-black text-gray-400 mb-3 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>اختر الموسم:</span>
                    </h3>
                    
                    {seriesInfo.seasons && seriesInfo.seasons.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {seriesInfo.seasons.map((season) => (
                          <button
                            key={season.id || season.season_number}
                            onClick={() => setSelectedSeason(season.season_number)}
                            className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all duration-300 ${
                              selectedSeason === season.season_number
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                                : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {season.name || `الموسم ${season.season_number}`}
                          </button>
                        ))}
                      </div>
                    ) : (
                      // Fallback if seasons list empty but episodes exist
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(seriesInfo.episodes || {}).map((seasonNum) => (
                          <button
                            key={seasonNum}
                            onClick={() => setSelectedSeason(parseInt(seasonNum, 10))}
                            className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all duration-300 ${
                              selectedSeason === parseInt(seasonNum, 10)
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                                : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            الموسم {seasonNum}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Episodes list */}
                  <div className="flex-grow">
                    <h3 className="text-xs font-black text-gray-400 mb-3">الحلقات المتاحة:</h3>
                    
                    {seriesInfo.episodes && seriesInfo.episodes[String(selectedSeason)] ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {seriesInfo.episodes[String(selectedSeason)].map((ep) => (
                          <div
                            key={ep.id}
                            onClick={() => handlePlayStream(
                              `${selectedSeries.name} - الموسم ${selectedSeason} - الحلقة ${ep.episode_num}`,
                              ep.id,
                              'series',
                              ep.container_extension,
                              (ep as any).customUrl
                            )}
                            className="group/item flex items-center justify-between p-3 rounded-xl border border-white/5 hover:border-cyan-500/40 bg-white/5 hover:bg-cyan-500/5 cursor-pointer transition-all duration-300"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold text-xs flex items-center justify-center group-hover/item:bg-cyan-500/20 group-hover/item:text-cyan-300 transition-colors">
                                {ep.episode_num}
                              </div>
                              <span className="text-xs font-bold text-gray-300 group-hover/item:text-white transition-colors line-clamp-1">
                                {ep.title || `الحلقة ${ep.episode_num}`}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {/* Direct Download Button */}
                              <a
                                href={getDirectStreamUrl(
                                  ep.id,
                                  'series',
                                  ep.container_extension,
                                  (ep as any).customUrl
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="w-7 h-7 rounded-full bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white flex items-center justify-center transition-all duration-300 shadow-sm"
                                title="تحميل الحلقة"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>

                              <div className="w-7 h-7 rounded-full bg-white/5 text-gray-400 group-hover/item:bg-cyan-500 group-hover/item:text-black flex items-center justify-center transition-all">
                                <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 py-6 text-center">لا توجد حلقات مضافة لهذا الموسم حتى الآن.</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <AlertCircle className="w-10 h-10 text-gray-500 mb-2" />
                  <p className="text-xs text-gray-400">فشل تحميل تفاصيل المسلسل. حاول مجدداً.</p>
                </div>
              )}

              {/* Ads removed */}
            </div>

          </div>
        </div>
      )}

      {/* DETAILED DYNAMIC EXTERNAL PLAYER LAUNCHER VIEW (MyPlayer Launcher Overlays) */}
      {activePlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#030614] overflow-y-auto py-8 sm:py-12">
          {/* Neon background grids */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 opacity-25 bg-[linear-gradient(rgba(0,229,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.05)_1px,transparent_1px)] bg-[size:30px_30px]" />
            <div className="absolute -top-[150px] -right-[120px] w-[320px] h-[320px] rounded-full bg-cyan-500/10 filter blur-[90px]" />
            <div className="absolute -bottom-[150px] -left-[120px] w-[320px] h-[320px] rounded-full bg-fuchsia-500/10 filter blur-[90px]" />
          </div>

          <div className="relative z-10 w-full max-w-[420px] p-2 sm:p-[18px] my-auto">
            {/* Player Card */}
            <div className="relative w-full min-h-[480px] sm:min-h-[520px] rounded-[28px] sm:rounded-[34px] px-5 sm:px-[22px] py-7 sm:py-[30px] overflow-hidden bg-[#0b1120]/78 border border-cyan-500/18 backdrop-blur-[22px] shadow-[0_0_60px_rgba(0,0,0,0.75),inset_0_0_30px_rgba(0,229,255,0.03)] flex flex-col justify-center">
              
              {/* Card gradient glow decoration */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-cyan-500/4 via-transparent to-fuchsia-500/4" />

              {/* Close launcher icon */}
              <button 
                onClick={() => setActivePlay(null)}
                className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 z-10 p-2 sm:p-2.5 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                title="إغلاق والرجوع للتصفح"
              >
                <X className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              </button>

              {/* Central play trigger / Visual rings */}
              <div className="relative flex items-center justify-center mb-6 sm:mb-[34px] mt-2">
                {/* Rotating play ring */}
                <div className="absolute w-[110px] h-[110px] sm:w-[130px] sm:h-[130px] rounded-full border border-cyan-500/18 animate-[spin_8s_linear_infinite]" />
                <div className="absolute w-[124px] h-[124px] sm:w-[146px] sm:h-[146px] rounded-full border border-fuchsia-500/15 animate-[spin_12s_linear_infinite_reverse]" />
                
                {/* Play circle */}
                <button
                  onClick={handleLaunchManual}
                  className="relative w-[80px] h-[80px] sm:w-[95px] sm:h-[95px] rounded-full bg-gradient-to-br from-[#00E5FF] via-[#7C3AED] to-[#D946EF] flex items-center justify-center cursor-pointer transition-all duration-300 shadow-[0_0_45px_rgba(124,58,237,0.75)] hover:scale-105 active:scale-95"
                >
                  {launcherStatus === 'launching' ? (
                    <Play className="w-[28px] h-[28px] sm:w-[36px] sm:h-[36px] fill-white text-white translate-x-0.5 animate-pulse" />
                  ) : launcherStatus === 'idle' ? (
                    <Play className="w-[28px] h-[28px] sm:w-[36px] sm:h-[36px] fill-white text-white translate-x-0.5" />
                  ) : (
                    <Download className="w-[28px] h-[28px] sm:w-[36px] sm:h-[36px] text-white" />
                  )}
                </button>
              </div>

              {/* Details & Status message */}
              <h2 className={`text-center text-base sm:text-lg font-black mb-1.5 sm:mb-2 transition-colors duration-300 ${
                launcherStatus === 'launching' || launcherStatus === 'idle' ? 'text-white' : 'text-red-400'
              }`}>
                {launcherStatus === 'launching' 
                  ? 'جاري تشغيل البث...' 
                  : launcherStatus === 'idle' 
                    ? 'البث جاهز للتشغيل' 
                    : 'المشغل غير مثبت'}
              </h2>

              <p className="text-center text-xs sm:text-sm text-gray-300 leading-[1.8] sm:leading-[1.9] px-1 sm:px-2 mb-3.5 sm:mb-4 mt-1">
                {launcherStatus === 'launching' ? (
                  <>يرجى الانتظار، سيتم تشغيل الفيديو تلقائياً عبر تطبيق <span className="text-[#00E5FF] font-bold">MyPlayer</span></>
                ) : launcherStatus === 'idle' ? (
                  <>اضغط على زر <span className="text-cyan-400 font-bold">تشغيل الآن</span> بالأسفل لفتح القناة في تطبيق MyPlayer.</>
                ) : (
                  <>يجب تثبيت تطبيق <strong className="text-white">MyPlayer</strong> أولاً لتشغيل البث البيني.</>
                )}
              </p>

              {/* Stream name and compact download button row */}
              <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 mb-3 sm:mb-4 rounded-xl sm:rounded-2xl bg-white/4 border border-white/5" dir="rtl">
                <div className="flex flex-col text-right truncate min-w-0 flex-1">
                  <span className="text-[9px] sm:text-[10px] text-gray-500 font-bold mb-0.5">الاسم:</span>
                  <span className="text-xs font-black text-gray-200 truncate" title={activePlay.name}>
                    {activePlay.name}
                  </span>
                </div>
                
                {(activePlay.type === 'vod' || activePlay.type === 'series') && (
                  <a
                    href={getMp4DownloadUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 h-[30px] sm:h-[34px] px-3 sm:px-3.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-[9px] sm:text-[11px] font-black flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(16,185,129,0.25)] transition-all duration-300 active:scale-95 cursor-pointer"
                    style={{ textDecoration: 'none' }}
                  >
                    <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span>تحميل مباشر</span>
                  </a>
                )}
              </div>

              {/* Auto-Play Toggle Settings Option */}
              <div className="flex items-center justify-between px-3.5 sm:px-4 py-2 sm:py-2.5 mb-4 sm:mb-5 rounded-xl sm:rounded-2xl bg-white/4 border border-white/5" dir="rtl">
                <span className="text-xs font-semibold text-gray-300">التشغيل التلقائي للمشغل</span>
                <button
                  dir="ltr"
                  onClick={() => {
                    const nextVal = !autoPlayEnabled;
                    setAutoPlayEnabled(nextVal);
                    localStorage.setItem('autoPlayEnabled', String(nextVal));
                  }}
                  className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    autoPlayEnabled ? 'bg-[#00E5FF]' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      autoPlayEnabled ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5 sm:gap-3">
                
                {/* Primary Button */}
                <button
                  onClick={handleLaunchManual}
                  className="w-full h-[48px] sm:h-[54px] rounded-xl sm:rounded-2xl border-none bg-gradient-to-r from-[#00E5FF] to-[#7C3AED] hover:from-[#05cbdf] hover:to-[#6a30ca] text-white text-xs font-black flex items-center justify-center gap-2 sm:gap-2.5 shadow-[0_10px_30px_rgba(124,58,237,0.45)] transition-all duration-300 active:scale-95 cursor-pointer"
                >
                  <span>{launcherStatus === 'launching' || launcherStatus === 'idle' ? 'تشغيل الآن يدوياً' : 'تحميل التطبيق (APK)'}</span>
                  <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* Secondary: Copy Mediafire APK Link (only shown in failed state) */}
                {launcherStatus === 'failed' && (
                  <button
                    onClick={handleCopyDownloadLink}
                    className="w-full h-[44px] sm:h-[48px] rounded-xl sm:rounded-2xl border border-[#00E5FF]/40 bg-white/4 text-[#00E5FF] text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> : <Copy className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
                    <span>{copiedLink ? '✓ تم نسخ الرابط بنجاح!' : 'نسخ رابط تحميل ميديا فاير'}</span>
                  </button>
                )}

                {/* Secondary: Retry Button (only shown in failed state) */}
                {launcherStatus === 'failed' && (
                  <button
                    onClick={handleRetryLaunch}
                    className="w-full h-[44px] sm:h-[48px] rounded-xl sm:rounded-2xl border border-white/10 bg-white/4 text-gray-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 animate-spin-slow" />
                    <span>إعادة المحاولة والفتح</span>
                  </button>
                )}

                {/* Return button */}
                <button
                  onClick={() => setActivePlay(null)}
                  className="w-full h-[44px] sm:h-[48px] rounded-xl sm:rounded-2xl border border-white/5 bg-white/2 hover:bg-white/5 text-gray-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>الرجوع لتصفح القائمة</span>
                </button>

              </div>

              {/* Ads removed */}

              {/* Hint text bottom */}
              <div className="mt-5 text-center text-[11px] text-gray-500 leading-relaxed px-4">
                {(activePlay.type === 'vod' || activePlay.type === 'series') ? (
                  'ملاحظة: زر "تحميل أو تشغيل مباشر" يفتح الفيديو في متصفحك مباشرة لتقوم بحفظه أو مشاهدته بدون قيود. يمكنك نسخ رابط هذا الزر واستخدامه في برامج التحميل الخارجية مثل ADM أو IDM.'
                ) : launcherStatus === 'launching' ? (
                  'اختر الجودة من داخل تطبيق MyPlayer بعد فتحه تلقائياً.'
                ) : (
                  'إذا واجهت مشكلة في التثبيت، انسخ الرابط وافتحه في المتصفح الخارجي، ثم اضغط إعادة المحاولة بعد التثبيت.'
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* All ad overlays removed */}

    </div>
  );
}
