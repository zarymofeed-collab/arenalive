import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';

const resolvedFilename = typeof (globalThis as any).__filename !== 'undefined' 
  ? (globalThis as any).__filename 
  : (typeof import.meta !== 'undefined' && import.meta.url ? fileURLToPath(import.meta.url) : '');
const resolvedDirname = typeof (globalThis as any).__dirname !== 'undefined' 
  ? (globalThis as any).__dirname 
  : (resolvedFilename ? path.dirname(resolvedFilename) : '');

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Enable JSON body parser
app.use(express.json());

// Dynamic IPTV Config
let config = {
  host: "http://vo5px.top",
  username: "5252761676",
  password: "6582429481",
  useSupabase: false
};

// Mock Fallback Data when remote server is offline (e.g. 503 Service Unavailable)
const MOCK_INFO = {
  user_info: {
    username: "5252761676 (وضع تجريبي)",
    password: "demo",
    status: "Active (تجريبي)",
    exp_date: "1893456000",
    isDemo: true
  },
  server_info: {
    url: "http://vo5px.top",
    port: "80",
    server_protocol: "http"
  }
};

const MOCK_CATEGORIES = {
  live: [
    { category_id: "1", category_name: "قنوات القرآن الكريم مباشر" },
    { category_id: "2", category_name: "قنوات رياضية (بث تجريبي)" },
    { category_id: "3", category_name: "قنوات ترفيهية ومنوعة" },
    { category_id: "4", category_name: "قنوات إخبارية مباشر" }
  ],
  vod: [
    { category_id: "10", category_name: "أفلام عربية كلاسيكية" },
    { category_id: "11", category_name: "أفلام أجنبية ووثائقية" }
  ],
  series: [
    { category_id: "20", category_name: "مسلسلات تاريخية" },
    { category_id: "21", category_name: "مسلسلات أجنبية مترجمة" }
  ]
};

const MOCK_STREAMS: Record<string, any[]> = {
  live: [
    { stream_id: "1001", name: "قناة القرآن الكريم بث مباشر من مكة المكرمة HD", category_id: "1", stream_icon: "https://images.unsplash.com/photo-1609599006353-e629bcabf171?w=400", container_extension: "m3u8", customUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" },
    { stream_id: "1002", name: "قناة السنة النبوية بث مباشر من المدينة المنورة HD", category_id: "1", stream_icon: "https://images.unsplash.com/photo-1597935258735-e254c1839512?w=400", container_extension: "m3u8", customUrl: "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8" },
    { stream_id: "1003", name: "بي إن سبورت 1 Premium - بث تجريبي مباشر", category_id: "2", stream_icon: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400", container_extension: "m3u8", customUrl: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" },
    { stream_id: "1004", name: "بي إن سبورت الإخبارية Bein Sports", category_id: "2", stream_icon: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400", container_extension: "m3u8", customUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" },
    { stream_id: "1005", name: "إم بي سي 1 (MBC 1 HD)", category_id: "3", stream_icon: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=400", container_extension: "m3u8", customUrl: "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8" },
    { stream_id: "1006", name: "إم بي سي أكشن (MBC Action HD)", category_id: "3", stream_icon: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400", container_extension: "m3u8", customUrl: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" },
    { stream_id: "1007", name: "قناة الجزيرة الإخبارية HD مباشر", category_id: "4", stream_icon: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=400", container_extension: "m3u8", customUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" },
    { stream_id: "1008", name: "قناة العربية الحدث HD مباشر", category_id: "4", stream_icon: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400", container_extension: "m3u8", customUrl: "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8" }
  ],
  vod: [
    { stream_id: "2001", name: "فيلم الرسالة النسخة المرممة التاريخية HD", category_id: "10", stream_icon: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400", rating: "9.2", container_extension: "mp4", customUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
    { stream_id: "2002", name: "فيلم أسد الصحراء - المجاهد عمر المختار كامل", category_id: "10", stream_icon: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400", rating: "8.9", container_extension: "mp4", customUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
    { stream_id: "2003", name: "رحلة عبر الثقوب السوداء والفضاء العميق (Interstellar)", category_id: "11", stream_icon: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400", rating: "8.7", container_extension: "mp4", customUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" },
    { stream_id: "2004", name: "فيلم الخيال العلمي وبداية العوالم (Inception) مترجم", category_id: "11", stream_icon: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400", rating: "8.8", container_extension: "mp4", customUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" }
  ],
  series: [
    { series_id: "3001", name: "مسلسل قيامة أرطغرل - الموسم الأول كاملاً", category_id: "20", cover: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400", rating: "9.4" },
    { series_id: "3002", name: "مسلسل عمر بن الخطاب التاريخي العظيم", category_id: "20", cover: "https://images.unsplash.com/photo-1505673542670-a14e28b139ee?w=400", rating: "9.5" },
    { series_id: "3003", name: "مسلسل الإثارة والجريمة بريكنج باد (Breaking Bad)", category_id: "21", cover: "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=400", rating: "9.5" }
  ]
};

const MOCK_SERIES_INFO: Record<string, any> = {
  "3001": {
    info: { name: "مسلسل قيامة أرطغرل - الموسم الأول كاملاً", cover: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400", rating: "9.4", plot: "تاريخ وحياة الغازي أرطغرل والد عثمان مؤسس الدولة العثمانية والصراعات الملحمية." },
    episodes: {
      "1": [
        { id: "10001", title: "الحلقة 1 - الصيد الممنوع والصدمة الأولى", episode_num: "1", container_extension: "mp4", customUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
        { id: "10002", title: "الحلقة 2 - المؤامرة الكبرى في القبيلة", episode_num: "2", container_extension: "mp4", customUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
        { id: "10003", title: "الحلقة 3 - إنقاذ السجناء والهروب المثير", episode_num: "3", container_extension: "mp4", customUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" }
      ]
    }
  },
  "3002": {
    info: { name: "مسلسل عمر بن الخطاب التاريخي العظيم", cover: "https://images.unsplash.com/photo-1505673542670-a14e28b139ee?w=400", rating: "9.5", plot: "سيرة أمير المؤمنين عمر بن الخطاب رضي الله عنه وفترة خلافته العادلة المليئة بالفتوحات والعدل والرحمة." },
    episodes: {
      "1": [
        { id: "20001", title: "الحلقة 1 - فجر الإسلام وتأسيس مكة", episode_num: "1", container_extension: "mp4", customUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
        { id: "20002", title: "الحلقة 2 - إسلام الفاروق عمر وتغيير التاريخ", episode_num: "2", container_extension: "mp4", customUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" }
      ]
    }
  },
  "3003": {
    info: { name: "مسلسل الإثارة والجريمة بريكنج باد (Breaking Bad)", cover: "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=400", rating: "9.5", plot: "مدرس كيمياء في المدرسة الثانوية يتم تشخيصه بسرطان الرئة فيتحول لعالم الجريمة وإنتاج المواد المحظورة لتأمين مستقبل عائلته المالي." },
    episodes: {
      "1": [
        { id: "30001", title: "الحلقة 1 - الطيار المثير (Pilot)", episode_num: "1", container_extension: "mp4", customUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
        { id: "30002", title: "الحلقة 2 - القطة في الحقيبة والغموض", episode_num: "2", container_extension: "mp4", customUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" }
      ]
    }
  }
};

// Overrides map: streamId/seriesId -> custom metadata
interface OverrideItem {
  id: string; // matches stream_id or series_id
  name?: string;
  icon?: string;
  streamUrl?: string; // custom playback url
}
let overrides: Record<string, OverrideItem> = {};

interface CategoryOverrideItem {
  id: string;
  type: string;
  name: string;
}
let categoryOverrides: Record<string, CategoryOverrideItem> = {};

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
let matches: MatchItem[] = [];

const CONFIG_PATH = path.join(process.cwd(), 'config.json');
const OVERRIDES_PATH = path.join(process.cwd(), 'overrides.json');
const MATCHES_PATH = path.join(process.cwd(), 'matches.json');
const CATEGORY_OVERRIDES_PATH = path.join(process.cwd(), 'category_overrides.json');

// Initialize Supabase Client dynamically
let supabaseClient: any = null;
function getSupabaseClient() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL || '';
    const key = process.env.SUPABASE_KEY || '';
    if (url && key) {
      try {
        supabaseClient = createClient(url, key);
        console.log('Successfully initialized Supabase client!');
      } catch (err) {
        console.error('Failed to initialize Supabase client:', err);
      }
    }
  }
  return supabaseClient;
}

// Sync configuration on startup
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } else {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    }
  } catch (err) {
    console.error('Error loading config file:', err);
  }
}

function loadCategoryOverrides() {
  try {
    if (fs.existsSync(CATEGORY_OVERRIDES_PATH)) {
      categoryOverrides = JSON.parse(fs.readFileSync(CATEGORY_OVERRIDES_PATH, 'utf-8'));
    } else {
      fs.writeFileSync(CATEGORY_OVERRIDES_PATH, JSON.stringify(categoryOverrides, null, 2));
    }
  } catch (err) {
    console.error('Error loading category overrides file:', err);
  }
}

async function loadOverrides() {
  // 1. Load local file first as fallback
  try {
    if (fs.existsSync(OVERRIDES_PATH)) {
      overrides = JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf-8'));
    } else {
      fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides, null, 2));
    }
  } catch (err) {
    console.error('Error loading overrides file:', err);
  }

  // 2. Try to sync with Supabase if configured
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      console.log('Fetching overrides from Supabase...');
      const { data, error } = await supabase.from('overrides').select('*');
      if (error) {
        console.warn('Supabase fetch error for overrides (missing table or invalid schema):', error.message);
      } else if (data && Array.isArray(data)) {
        console.log(`Fetched ${data.length} overrides from Supabase!`);
        data.forEach((row: any) => {
          overrides[String(row.id)] = {
            id: String(row.id),
            name: row.name || undefined,
            icon: row.icon || undefined,
            streamUrl: row.streamUrl || undefined
          };
        });
        // Save merged back to local storage for speed/robustness
        fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides, null, 2));
      }
    } catch (err: any) {
      console.error('Error syncing overrides with Supabase:', err.message);
    }
  }
}

async function saveOverrideToSupabase(item: OverrideItem) {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    console.log(`Saving override ${item.id} to Supabase...`);
    const { error } = await supabase.from('overrides').upsert({
      id: item.id,
      name: item.name || null,
      icon: item.icon || null,
      streamUrl: item.streamUrl || null
    });
    if (error) {
      console.error(`Error saving override ${item.id} to Supabase:`, error.message);
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.warn('⚠️ Supabase Table "overrides" does not exist. Please create it in your Supabase SQL Editor with:\n' +
          'CREATE TABLE overrides (\n' +
          '  id TEXT PRIMARY KEY,\n' +
          '  name TEXT,\n' +
          '  icon TEXT,\n' +
          '  streamUrl TEXT\n' +
          ');\n' +
          'ALTER TABLE overrides ENABLE ROW LEVEL SECURITY;\n' +
          'CREATE POLICY "Allow public read" ON overrides FOR SELECT USING (true);\n' +
          'CREATE POLICY "Allow public all" ON overrides FOR ALL USING (true);');
      }
    } else {
      console.log(`Successfully saved override ${item.id} to Supabase!`);
    }
  } catch (err: any) {
    console.error('Failed to upsert override to Supabase:', err.message);
  }
}

async function deleteOverrideFromSupabase(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    console.log(`Deleting override ${id} from Supabase...`);
    const { error } = await supabase.from('overrides').delete().eq('id', id);
    if (error) {
      console.error(`Error deleting override ${id} from Supabase:`, error.message);
    } else {
      console.log(`Successfully deleted override ${id} from Supabase!`);
    }
  } catch (err: any) {
    console.error('Failed to delete override from Supabase:', err.message);
  }
}

async function loadMatches() {
  // 1. Load local file first as fallback
  try {
    if (fs.existsSync(MATCHES_PATH)) {
      matches = JSON.parse(fs.readFileSync(MATCHES_PATH, 'utf-8'));
    } else {
      matches = [];
      fs.writeFileSync(MATCHES_PATH, JSON.stringify(matches, null, 2));
    }
  } catch (err) {
    console.error('Error loading matches file:', err);
  }

  // 2. Try to sync with Supabase if configured
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      console.log('Fetching matches from Supabase...');
      const { data, error } = await supabase.from('matches').select('*');
      if (error) {
        console.warn('Supabase fetch error for matches (missing table or invalid schema):', error.message);
      } else if (data && Array.isArray(data)) {
        console.log(`Fetched ${data.length} matches from Supabase!`);
        matches = data.map((row: any) => ({
          id: row.id,
          team1: row.team1,
          team2: row.team2,
          team1Logo: row.team1Logo || undefined,
          team2Logo: row.team2Logo || undefined,
          time: row.time,
          date: row.date || undefined,
          channelId: row.channelId,
          channelName: row.channelName,
          status: row.status || undefined
        }));
        // Save merged back to local storage
        fs.writeFileSync(MATCHES_PATH, JSON.stringify(matches, null, 2));
      }
    } catch (err: any) {
      console.error('Error syncing matches with Supabase:', err.message);
    }
  }
}

async function saveMatchToSupabase(match: MatchItem) {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    console.log(`Saving match ${match.id} to Supabase...`);
    const { error } = await supabase.from('matches').upsert({
      id: match.id,
      team1: match.team1,
      team2: match.team2,
      team1Logo: match.team1Logo || null,
      team2Logo: match.team2Logo || null,
      time: match.time,
      date: match.date || null,
      channelId: match.channelId,
      channelName: match.channelName,
      status: match.status || null
    });
    if (error) {
      console.error(`Error saving match ${match.id} to Supabase:`, error.message);
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.warn('⚠️ Supabase Table "matches" does not exist. Please create it in your Supabase SQL Editor with:\n' +
          'CREATE TABLE matches (\n' +
          '  id TEXT PRIMARY KEY,\n' +
          '  team1 TEXT,\n' +
          '  team2 TEXT,\n' +
          '  "team1Logo" TEXT,\n' +
          '  "team2Logo" TEXT,\n' +
          '  time TEXT,\n' +
          '  date TEXT,\n' +
          '  "channelId" TEXT,\n' +
          '  "channelName" TEXT,\n' +
          '  status TEXT\n' +
          ');\n' +
          'ALTER TABLE matches ENABLE ROW LEVEL SECURITY;\n' +
          'CREATE POLICY "Allow public read" ON matches FOR SELECT USING (true);\n' +
          'CREATE POLICY "Allow public all" ON matches FOR ALL USING (true);');
      }
    } else {
      console.log(`Successfully saved match ${match.id} to Supabase!`);
    }
  } catch (err: any) {
    console.error('Failed to upsert match to Supabase:', err.message);
  }
}

async function deleteMatchFromSupabase(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    console.log(`Deleting match ${id} from Supabase...`);
    const { error } = await supabase.from('matches').delete().eq('id', id);
    if (error) {
      console.error(`Error deleting match ${id} from Supabase:`, error.message);
    } else {
      console.log(`Successfully deleted match ${id} from Supabase!`);
    }
  } catch (err: any) {
    console.error('Failed to delete match from Supabase:', err.message);
  }
}

loadConfig();
loadCategoryOverrides();
// We make these load functions asynchronous, but launch them in the background
loadOverrides();
loadMatches();

function getBaseUrl() {
  return `${config.host}/player_api.php?username=${config.username}&password=${config.password}`;
}

// Cache store
interface CacheEntry {
  data: any;
  timestamp: number;
}
const cacheStore: Record<string, CacheEntry> = {};
const CACHE_TTL_SHORT = 2 * 60 * 1000; // 2 minutes for user info
const CACHE_TTL_MEDIUM = 15 * 60 * 1000; // 15 minutes for streams
const CACHE_TTL_LONG = 60 * 60 * 1000; // 1 hour for categories

async function getCachedData(key: string, ttl: number, fetchFn: () => Promise<any>): Promise<any> {
  const cached = cacheStore[key];
  const now = Date.now();
  if (cached && (now - cached.timestamp) < ttl) {
    return cached.data;
  }
  try {
    const freshData = await fetchFn();
    cacheStore[key] = { data: freshData, timestamp: now };
    return freshData;
  } catch (err) {
    console.error(`Error fetching fresh data for ${key}:`, err);
    if (cached) {
      console.log(`Returning stale cache for ${key}`);
      return cached.data;
    }
    throw err;
  }
}

// Global fetch timeout helper with automatic retries and media player User-Agent emulation
async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = 12000, retries = 2) {
  const headers = {
    'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
    'Accept': '*/*',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
    'Connection': 'keep-alive',
    ...options.headers
  };

  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (attempt > 0) {
        // Wait before retry with backoff
        await new Promise(resolve => setTimeout(resolve, attempt * 1500));
        console.log(`Retrying fetch to IPTV server (attempt ${attempt + 1}/${retries + 1})...`);
      }

      const response = await fetch(url, { 
        ...options, 
        headers,
        signal: controller.signal 
      });

      clearTimeout(id);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      // Check if response is empty or non-JSON
      if (!text || text.trim() === '') {
        throw new Error('Received empty response from IPTV server');
      }

      try {
        return JSON.parse(text);
      } catch (e) {
        console.warn(`IPTV server returned invalid JSON. Content preview: ${text.slice(0, 150)}`);
        throw new Error('IPTV server returned non-JSON text. The server might be experiencing temporary issues or maintenance.');
      }
    } catch (error: any) {
      clearTimeout(id);
      lastError = error;
      console.error(`Attempt ${attempt + 1} failed for ${url}: ${error.message}`);
      
      // If it's a permanent auth error, break early
      if (error.message.includes('status: 401') || error.message.includes('status: 403')) {
        break;
      }
    }
  }

  throw lastError || new Error('Fetch failed after maximum retries');
}

// Admin API Connection settings CRUD
app.get('/api/admin/config', (req, res) => {
  res.json({
    config,
    overrides: Object.values(overrides)
  });
});

app.post('/api/admin/config', (req, res) => {
  const { host, username, password, useSupabase } = req.body;
  if (!host || !username || !password) {
    return res.status(400).json({ error: true, message: 'All connection params are required' });
  }

  config = { 
    host, 
    username, 
    password, 
    useSupabase: typeof useSupabase === 'boolean' ? useSupabase : false 
  };
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    // Clear all cache on credential changes
    for (const key in cacheStore) {
      delete cacheStore[key];
    }
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// Admin API Overrides CRUD
app.post('/api/admin/overrides', (req, res) => {
  const { id, name, icon, streamUrl } = req.body;
  if (!id) {
    return res.status(400).json({ error: true, message: 'Item ID is required for overriding' });
  }

  const overrideItem: OverrideItem = {
    id: String(id),
    name: name || undefined,
    icon: icon || undefined,
    streamUrl: streamUrl || undefined
  };

  overrides[String(id)] = overrideItem;

  try {
    fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides, null, 2));
    
    // Sync with Supabase asynchronously
    saveOverrideToSupabase(overrideItem);

    // Invalidate cached streams lists and detailed views to reflect changes immediately
    for (const key in cacheStore) {
      if (key.startsWith('streams-') || key.startsWith('series-info-')) {
        delete cacheStore[key];
      }
    }
    res.json({ success: true, overrides: Object.values(overrides) });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

app.delete('/api/admin/overrides/:id', (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: true, message: 'Item ID is required' });
  }

  delete overrides[String(id)];

  try {
    fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides, null, 2));

    // Sync with Supabase asynchronously
    deleteOverrideFromSupabase(String(id));

    for (const key in cacheStore) {
      if (key.startsWith('streams-') || key.startsWith('series-info-')) {
        delete cacheStore[key];
      }
    }
    res.json({ success: true, overrides: Object.values(overrides) });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// Admin API Category Overrides CRUD
app.get('/api/admin/category-overrides', (req, res) => {
  res.json({ error: false, categoryOverrides: Object.values(categoryOverrides) });
});

app.post('/api/admin/category-overrides', (req, res) => {
  const { id, type, name } = req.body;
  if (!id || !type || !name) {
    return res.status(400).json({ error: true, message: 'ID, type, and name are required for overriding a category' });
  }

  const key = `${type}_${id}`;
  categoryOverrides[key] = {
    id: String(id),
    type: String(type),
    name: String(name)
  };

  try {
    fs.writeFileSync(CATEGORY_OVERRIDES_PATH, JSON.stringify(categoryOverrides, null, 2));
    
    // Invalidate cached categories list to reflect changes immediately
    delete cacheStore[`categories-${type}`];
    
    res.json({ error: false, categoryOverrides: Object.values(categoryOverrides) });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

app.delete('/api/admin/category-overrides/:type/:id', (req, res) => {
  const { type, id } = req.params;
  if (!type || !id) {
    return res.status(400).json({ error: true, message: 'Type and ID are required' });
  }

  const key = `${type}_${id}`;
  delete categoryOverrides[key];

  try {
    fs.writeFileSync(CATEGORY_OVERRIDES_PATH, JSON.stringify(categoryOverrides, null, 2));

    // Invalidate cached categories list
    delete cacheStore[`categories-${type}`];

    res.json({ error: false, categoryOverrides: Object.values(categoryOverrides) });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// Admin & Public API Matches CRUD
app.get('/api/iptv/matches', (req, res) => {
  res.json(matches);
});

app.post('/api/admin/matches', (req, res) => {
  const { id, team1, team2, team1Logo, team2Logo, time, date, channelId, channelName, status } = req.body;
  if (!team1 || !team2 || !time || !channelId || !channelName) {
    return res.status(400).json({ error: true, message: 'بيانات المباراة الأساسية مطلوبة (الفريقين، الوقت، والقناة)' });
  }

  const matchId = id || `match_${Date.now()}`;
  const existingIndex = matches.findIndex(m => m.id === matchId);

  const matchData: MatchItem = {
    id: matchId,
    team1,
    team2,
    team1Logo: team1Logo || undefined,
    team2Logo: team2Logo || undefined,
    time,
    date: date || new Date().toISOString().split('T')[0],
    channelId: String(channelId),
    channelName,
    status: status || 'live'
  };

  if (existingIndex > -1) {
    matches[existingIndex] = matchData;
  } else {
    matches.push(matchData);
  }

  try {
    fs.writeFileSync(MATCHES_PATH, JSON.stringify(matches, null, 2));

    // Sync with Supabase asynchronously
    saveMatchToSupabase(matchData);

    res.json({ success: true, matches });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

app.delete('/api/admin/matches/:id', (req, res) => {
  const { id } = req.params;
  matches = matches.filter(m => m.id !== id);
  try {
    fs.writeFileSync(MATCHES_PATH, JSON.stringify(matches, null, 2));

    // Sync with Supabase asynchronously
    deleteMatchFromSupabase(String(id));

    res.json({ success: true, matches });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});


// --- SUPABASE BULK SYNC ENGINE ---

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function syncIPTVToSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase integration is not fully configured. Please ensure SUPABASE_URL and SUPABASE_KEY are correct.');
  }

  console.log('🔄 Starting full IPTV to Supabase synchronization...');

  // 1. Sync Categories
  const categoryTypes = ['live', 'vod', 'series'];
  const allCategoriesToInsert: any[] = [];

  for (const type of categoryTypes) {
    const action = type === 'live' ? 'get_live_categories' 
                 : type === 'vod' ? 'get_vod_categories' 
                 : 'get_series_categories';
    try {
      console.log(`Fetching ${type} categories from IPTV...`);
      const cats = await fetchWithTimeout(`${getBaseUrl()}&action=${action}`, {}, 15000);
      if (Array.isArray(cats)) {
        cats.forEach((c: any) => {
          allCategoriesToInsert.push({
            id: String(c.category_id),
            name: c.category_name,
            parent_id: c.parent_id ? Number(c.parent_id) : 0,
            type: type
          });
        });
      }
    } catch (err: any) {
      console.error(`Failed to fetch ${type} categories from IPTV:`, err.message);
    }
  }

  if (allCategoriesToInsert.length > 0) {
    console.log(`Upserting ${allCategoriesToInsert.length} categories to Supabase...`);
    const chunks = chunkArray(allCategoriesToInsert, 100);
    for (const chunk of chunks) {
      const { error } = await supabase.from('categories').upsert(chunk);
      if (error) {
        console.error('Error upserting categories chunk:', error.message);
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          throw new Error('Table "categories" does not exist in your Supabase database. Please create it first.');
        }
        throw error;
      }
    }
    console.log('✅ Categories synchronization complete.');
  }

  // 2. Sync Streams & Series
  const streamTypes = ['live', 'vod', 'series'];
  let totalStreamsSynced = 0;

  for (const type of streamTypes) {
    const action = type === 'live' ? 'get_live_streams' 
                 : type === 'vod' ? 'get_vod_streams' 
                 : 'get_series';
    try {
      console.log(`Fetching ${type} streams from IPTV...`);
      const streams = await fetchWithTimeout(`${getBaseUrl()}&action=${action}`, {}, 25000);
      if (Array.isArray(streams)) {
        console.log(`Fetched ${streams.length} ${type} items. Preparing for Supabase...`);
        const streamsToInsert = streams.map((s: any) => {
          const id = String(s.stream_id || s.series_id || '');
          const icon = s.stream_icon || s.cover || '';
          return {
            stream_id: id,
            category_id: String(s.category_id || ''),
            name: s.name || '',
            stream_icon: icon,
            container_extension: s.container_extension || '',
            type: type,
            rating: s.rating ? String(s.rating) : '',
            added: s.added ? String(s.added) : '',
            custom_url: s.customUrl || null
          };
        }).filter(s => s.stream_id); // ensure valid ID

        console.log(`Upserting ${streamsToInsert.length} ${type} items to Supabase in chunks...`);
        const chunks = chunkArray(streamsToInsert, 200);
        let count = 0;
        for (const chunk of chunks) {
          const { error } = await supabase.from('streams').upsert(chunk);
          if (error) {
            console.error(`Error upserting ${type} streams chunk:`, error.message);
            if (error.message.includes('relation') && error.message.includes('does not exist')) {
              throw new Error('Table "streams" does not exist in your Supabase database. Please create it first.');
            }
            throw error;
          }
          count += chunk.length;
        }
        totalStreamsSynced += count;
        console.log(`✅ Synced ${count} of ${streamsToInsert.length} ${type} items.`);
      }
    } catch (err: any) {
      console.error(`Failed to sync ${type} streams:`, err.message);
    }
  }

  console.log(`🎉 Synchronization completed! Total streams synced: ${totalStreamsSynced}`);
  return { success: true, totalCategories: allCategoriesToInsert.length, totalStreams: totalStreamsSynced };
}


// --- API ROUTES ---

// Sync trigger route
app.post('/api/admin/supabase-sync', async (req, res) => {
  try {
    const result = await syncIPTVToSupabase();
    // Clear local caches to force newly synced data to take effect
    for (const key in cacheStore) {
      delete cacheStore[key];
    }
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Supabase synchronization endpoint failed:', err.message);
    res.status(500).json({ 
      error: true, 
      message: err.message,
      sql: true
    });
  }
});


// 1. Get user and server info
app.get('/api/iptv/info', async (req, res) => {
  try {
    const data = await getCachedData('user-info', CACHE_TTL_SHORT, async () => {
      return await fetchWithTimeout(getBaseUrl());
    });
    res.json(data);
  } catch (err: any) {
    console.warn('IPTV info request failed. Using mock fallback data.', err.message);
    res.json(MOCK_INFO);
  }
});

function applyCategoryOverrides(categoriesList: any[], type: string): any[] {
  if (!Array.isArray(categoriesList)) return categoriesList;
  return categoriesList.map(cat => {
    const catId = String(cat.category_id);
    const key = `${type}_${catId}`;
    const override = categoryOverrides[key];
    if (override) {
      return {
        ...cat,
        category_name: override.name
      };
    }
    return cat;
  });
}

// 2. Get categories
app.get('/api/iptv/categories', async (req, res) => {
  const { type } = req.query; // 'live' | 'vod' | 'series'
  if (!type || !['live', 'vod', 'series'].includes(type as string)) {
    return res.status(400).json({ error: true, message: 'Invalid category type' });
  }

  // 1. Try to fetch from Supabase if configured and enabled
  const supabase = getSupabaseClient();
  if (supabase && config.useSupabase) {
    try {
      console.log(`Fetching categories for type "${type}" from Supabase...`);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('type', type);
      
      if (!error && data && data.length > 0) {
        console.log(`Successfully loaded ${data.length} categories from Supabase!`);
        // Map back to expected structure: category_id, category_name, parent_id
        const mapped = data.map((c: any) => ({
          category_id: c.id,
          category_name: c.name,
          parent_id: c.parent_id
        }));
        return res.json(applyCategoryOverrides(mapped, type as string));
      } else if (error) {
        console.warn('Supabase categories fetch error, falling back to IPTV API/cache:', error.message);
      } else {
        console.log('No categories in Supabase, falling back to IPTV API/cache...');
      }
    } catch (err: any) {
      console.warn('Failed to query categories from Supabase, falling back to IPTV API/cache:', err.message);
    }
  }

  // 2. Fallback to IPTV Server
  const action = type === 'live' ? 'get_live_categories' 
               : type === 'vod' ? 'get_vod_categories' 
               : 'get_series_categories';

  try {
    const data = await getCachedData(`categories-${type}`, CACHE_TTL_LONG, async () => {
      return await fetchWithTimeout(`${getBaseUrl()}&action=${action}`);
    });
    res.json(applyCategoryOverrides(data, type as string));
  } catch (err: any) {
    console.warn(`IPTV categories request failed for type ${type}. Using mock fallback data.`, err.message);
    const mockCats = MOCK_CATEGORIES[type as 'live' | 'vod' | 'series'] || [];
    res.json(applyCategoryOverrides(mockCats, type as string));
  }
});

// Helper to inject custom overrides into individual stream objects
function applyOverridesToItem(item: any): any {
  if (!item) return item;
  const idStr = String(item.stream_id || item.series_id || '');
  const override = overrides[idStr];
  if (override) {
    return {
      ...item,
      name: override.name || item.name,
      // Handle either stream_icon or cover based on type
      stream_icon: override.icon || item.stream_icon,
      cover: override.icon || item.cover,
      customUrl: override.streamUrl || undefined
    };
  }
  return item;
}

// 3. Get streams (cached lists with server-side pagination, searching, and filtering)
app.get('/api/iptv/streams', async (req, res) => {
  const { type, category_id, search, page = '1', limit = '30' } = req.query;
  if (!type || !['live', 'vod', 'series'].includes(type as string)) {
    return res.status(400).json({ error: true, message: 'Invalid stream type' });
  }

  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 30;

  // 1. Try to load from Supabase if configured and enabled
  const supabase = getSupabaseClient();
  if (supabase && config.useSupabase) {
    try {
      console.log(`Querying ${type} streams from Supabase...`);
      let query = supabase
        .from('streams')
        .select('*', { count: 'exact' })
        .eq('type', type);

      if (category_id && category_id !== 'all' && category_id !== '') {
        query = query.eq('category_id', String(category_id));
      }

      if (search && (search as string).trim() !== '') {
        query = query.ilike('name', `%${(search as string).trim()}%`);
      }

      // Paginate in the cloud!
      const start = (pageNum - 1) * limitNum;
      const end = start + limitNum - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;

      if (!error && data && data.length > 0) {
        console.log(`Loaded ${data.length} streams of type ${type} from Supabase! Total count: ${count}`);
        
        // Map back to expected structure, applying overrides
        const mappedItems = data.map((s: any) => {
          const item = {
            num: s.num || '',
            name: s.name,
            stream_id: type !== 'series' ? s.stream_id : undefined,
            series_id: type === 'series' ? s.stream_id : undefined,
            stream_icon: type !== 'series' ? s.stream_icon : undefined,
            cover: type === 'series' ? s.stream_icon : undefined,
            container_extension: s.container_extension || '',
            category_id: s.category_id,
            rating: s.rating,
            added: s.added,
            customUrl: s.custom_url || undefined
          };
          return applyOverridesToItem(item);
        });

        return res.json({
          items: mappedItems,
          total: count || mappedItems.length,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil((count || mappedItems.length) / limitNum)
        });
      } else if (error) {
        console.warn('Supabase streams query error, falling back to IPTV API/cache:', error.message);
      } else {
        console.log('No streams in Supabase, falling back to IPTV API/cache...');
      }
    } catch (err: any) {
      console.warn('Failed to query streams from Supabase, falling back to IPTV API/cache:', err.message);
    }
  }

  // 2. Fallback to IPTV Server
  const action = type === 'live' ? 'get_live_streams' 
               : type === 'vod' ? 'get_vod_streams' 
               : 'get_series';

  try {
    // Fetch all streams for this type (cached to ensure high speed)
    let allStreams: any[] = [];
    try {
      allStreams = await getCachedData(`streams-${type}`, CACHE_TTL_MEDIUM, async () => {
        return await fetchWithTimeout(`${getBaseUrl()}&action=${action}`, {}, 15000);
      });
    } catch (fetchErr: any) {
      console.warn(`IPTV streams request failed for type ${type}. Using mock fallback data.`, fetchErr.message);
      allStreams = MOCK_STREAMS[type as 'live' | 'vod' | 'series'] || [];
    }

    if (!Array.isArray(allStreams)) {
      allStreams = MOCK_STREAMS[type as 'live' | 'vod' | 'series'] || [];
    }

    // Apply Overrides FIRST
    let overridenStreams = allStreams.map(applyOverridesToItem);

    // Filter by category if category_id is provided and not empty/all
    let filtered = overridenStreams;
    if (category_id && category_id !== 'all' && category_id !== '') {
      const catStr = String(category_id);
      filtered = filtered.filter(item => String(item.category_id) === catStr);
    }

    // Filter by search query if provided (case insensitive)
    if (search && (search as string).trim() !== '') {
      const q = (search as string).toLowerCase().trim();
      filtered = filtered.filter(item => {
        const name = String(item.name || '').toLowerCase();
        return name.includes(q);
      });
    }

    // Paginate
    const total = filtered.length;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const items = filtered.slice(startIndex, endIndex);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages
    });
  } catch (err: any) {
    console.error('Unhandled streams logic error:', err);
    res.json({
      items: [],
      total: 0,
      page: pageNum,
      limit: limitNum,
      totalPages: 0
    });
  }
});

// 4. Get series detailed info (seasons and episodes)
app.get('/api/iptv/series-info/:series_id', async (req, res) => {
  const { series_id } = req.params;
  if (!series_id) {
    return res.status(400).json({ error: true, message: 'Series ID is required' });
  }

  try {
    let data: any;
    try {
      data = await getCachedData(`series-info-${series_id}`, CACHE_TTL_MEDIUM, async () => {
        return await fetchWithTimeout(`${getBaseUrl()}&action=get_series_info&series_id=${series_id}`);
      });
    } catch (fetchErr: any) {
      console.warn(`IPTV series info request failed for series ID ${series_id}. Using mock fallback data.`, fetchErr.message);
      data = MOCK_SERIES_INFO[series_id] || { info: { name: "مسلسل تجريبي", plot: "لم يتم العثور على المسلسل المختار." }, episodes: {} };
    }

    // Apply potential overrides to series metadata inside detailed info
    if (data && !data.error) {
      const idStr = String(series_id);
      const override = overrides[idStr];
      if (override) {
        if (data.info) {
          data.info.name = override.name || data.info.name;
          data.info.cover = override.icon || data.info.cover;
        }
      }

      // Also apply episode-level custom playback urls if overrides have customUrl
      if (data.episodes) {
        for (const seasonNum in data.episodes) {
          data.episodes[seasonNum] = data.episodes[seasonNum].map((ep: any) => {
            const epOverride = overrides[String(ep.id)];
            if (epOverride) {
              return {
                ...ep,
                title: epOverride.name || ep.title,
                customUrl: epOverride.streamUrl || undefined
              };
            }
            return ep;
          });
        }
      }
    }

    res.json(data);
  } catch (err: any) {
    console.error('Unhandled series info logic error:', err);
    res.json(MOCK_SERIES_INFO[series_id] || { info: { name: "مسلسل تجريبي", plot: "لم يتم العثور على المسلسل المختار." }, episodes: {} });
  }
});

// Configure Vite middleware in Development, serve built dist folder in Production
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Running in DEVELOPMENT mode with Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Running in PRODUCTION mode...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error('Failed to launch server:', err);
  process.exit(1);
});
