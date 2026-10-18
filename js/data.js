/*
  data.js
  --------
  Data layer for Otaku Shelf, backed by a plain JSON file in this repo.

  All figures live in data/figures.json as { "figures": [ ... ] }. The
  client edits that file (and uploads photos to assets/statues/web/)
  through the Sveltia CMS admin at /admin/, which commits the changes
  straight to GitHub. GitHub Pages then republishes the site, so there's
  no database, no server, and nothing to pay for.
*/

const FIGURES_URL = 'data/figures.json';
const REFERENCE_ITEMS_URL = 'data/reference-items.json';

const DataStore = {
  /** Reference objects (fridge, banana, ...) used for size comparisons. Never throws. */
  async getReferenceItems() {
    try {
      const res = await fetch(REFERENCE_ITEMS_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      return Compare.normalizeItems(Array.isArray(data) ? data : data.items);
    } catch (err) {
      // The gallery works fine without comparisons, so just skip them.
      console.warn('Could not load reference items:', err);
      return [];
    }
  },

  /**
   * Load all pieces, newest first. Each gets a stable-per-load `id`, a
   * URL-friendly `slug` (used for links like index.html#bunny-akali), and a
   * numeric `price` (or null when it isn't for sale / not priced yet).
   */
  async getAll() {
    // no-cache: always revalidate, so new CMS edits show up once Pages redeploys.
    const res = await fetch(FIGURES_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Failed to load ${FIGURES_URL}: ${res.status}`);

    const data = await res.json();
    const list = Array.isArray(data) ? data : data.figures || [];
    const used = new Set();

    return list
      .filter((fig) => fig && fig.name)
      .map((fig, i) => ({
        ...fig,
        id: String(i),
        slug: uniqueSlug(slugify(fig.name) || `piece-${i + 1}`, used),
        price: toPrice(fig.price),
        etsy_url: /^https:\/\//i.test(String(fig.etsy_url || '').trim()) ? fig.etsy_url.trim() : '',
      }))
      .sort((a, b) => String(b.dateAdded || '').localeCompare(String(a.dateAdded || '')));
  },
};

/** "Misty & Shiny Gyarados" -> "misty-shiny-gyarados" */
function slugify(str = '') {
  return String(str)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function uniqueSlug(slug, used) {
  let candidate = slug;
  for (let n = 2; used.has(candidate); n++) candidate = `${slug}-${n}`;
  used.add(candidate);
  return candidate;
}

function toPrice(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const priceFormatter = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });

/** 299.95 -> "$299.95 CAD"; '' when there's no price. */
function formatPrice(price) {
  return typeof price === 'number' ? `${priceFormatter.format(price)} CAD` : '';
}
