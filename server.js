require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');

const { fetchHeadlines } = require('./providers/newsdata');

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_TTL = Number(process.env.CACHE_TTL_SECONDS || 300);

// Cache upstream responses so many visitors share one quota-consuming
// request instead of each triggering their own call to the provider.
const cache = new NodeCache({ stdTTL: CACHE_TTL, checkperiod: 60 });

// Regions map to a handful of representative country codes each.
// NewsData's free/basic plans cap requests at 5 country codes, so each
// region list is trimmed to 5. Edit these to fit the regions you care about.
const REGIONS = {
  world: [],
  americas: ['us', 'ca', 'mx', 'br', 'ar'],
  europe: ['gb', 'fr', 'de', 'ua', 'pl'],
  asia: ['cn', 'in', 'jp', 'kr', 'id'],
  middle_east: ['il', 'sa', 'tr', 'ir', 'eg'],
  africa: ['ng', 'za', 'ke', 'eg', 'et'],
  oceania: ['au', 'nz'],
};

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Protect the provider quota: limit how often any one client can hit our API.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get('/api/regions', (req, res) => {
  res.json({ regions: Object.keys(REGIONS) });
});

app.get('/api/headlines', async (req, res) => {
  const region = (req.query.region || 'world').toLowerCase();
  if (!(region in REGIONS)) {
    return res.status(400).json({ error: `Unknown region "${region}". Valid: ${Object.keys(REGIONS).join(', ')}` });
  }

  const cacheKey = `headlines:${region}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ region, cached: true, articles: cached });
  }

  try {
    const articles = await fetchHeadlines({ countries: REGIONS[region], category: 'politics' });
    cache.set(cacheKey, articles);
    res.json({ region, cached: false, articles });
  } catch (err) {
    console.error(err.message);
    res.status(502).json({ error: 'Failed to fetch headlines from provider.', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Worldwire server listening on http://localhost:${PORT}`);
});
