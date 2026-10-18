/*
  prices.js
  ---------
  Builds the price list on prices.html from data/figures.json: every piece
  that has a price, grouped by type and sorted by name, with a quick search.
  Pieces with a photo link through to their details in the gallery.
*/

const PRICE_GROUPS = [
  { key: 'statue', title: 'Statues & sculptures' },
  { key: 'accessory', title: 'Hobby accessories' },
];

const priceListEl = document.getElementById('priceList');
const priceSearchEl = document.getElementById('priceSearch');
const priceCountEl = document.getElementById('priceCount');

function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Lower-case and strip accents, so "pokemon" finds "Pokémon". */
function fold(str = '') {
  return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function byName(a, b) {
  return a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' });
}

function groupOf(fig) {
  return PRICE_GROUPS.some((g) => g.key === fig.category) ? fig.category : 'statue';
}

function priceItemHtml(fig) {
  const thumb = fig.image
    ? `<a class="price-thumb" href="index.html#${esc(fig.slug)}" tabindex="-1" aria-hidden="true">
         <img src="${esc(fig.image)}" alt="" loading="lazy" />
       </a>`
    : `<div class="price-thumb placeholder" aria-hidden="true">
         <img src="assets/icons/favicon-32.png" alt="" />
         Photos coming soon
       </div>`;

  const links = [];
  if (fig.image) links.push(`<a href="index.html#${esc(fig.slug)}">See photos &amp; details →</a>`);
  if (fig.etsy_url) {
    links.push(`<a href="${esc(fig.etsy_url)}" target="_blank" rel="noopener">Order on Etsy →</a>`);
  }

  const search = fold([fig.name, fig.series, fig.description].join(' '));

  return `
    <li class="price-item" data-search="${esc(search)}">
      ${thumb}
      <div class="price-info">
        ${fig.series ? `<div class="series">${esc(fig.series)}</div>` : ''}
        <h3>${esc(fig.name)}</h3>
        ${fig.description ? `<p class="price-desc">${esc(fig.description)}</p>` : ''}
        ${links.length ? `<div class="price-links">${links.join('')}</div>` : ''}
      </div>
      <div class="price-amount">${esc(priceFormatter.format(fig.price))}<span>CAD</span></div>
    </li>`;
}

function renderPriceList(figures) {
  priceListEl.innerHTML =
    PRICE_GROUPS.map((group) => {
      const items = figures.filter((f) => groupOf(f) === group.key);
      if (!items.length) return '';
      return `
        <section class="price-group" aria-labelledby="group-${group.key}">
          <h2 id="group-${group.key}">${esc(group.title)}</h2>
          <ul class="price-items">${items.map(priceItemHtml).join('')}</ul>
        </section>`;
    }).join('') + '<p class="price-empty" id="priceEmpty" hidden>No pieces match that search.</p>';
}

function applySearch(total) {
  const words = fold(priceSearchEl.value).split(/\s+/).filter(Boolean);
  let shown = 0;

  priceListEl.querySelectorAll('.price-group').forEach((group) => {
    let groupShown = 0;
    group.querySelectorAll('.price-item').forEach((item) => {
      const match = words.every((w) => item.dataset.search.includes(w));
      item.hidden = !match;
      if (match) groupShown++;
    });
    group.hidden = groupShown === 0;
    shown += groupShown;
  });

  document.getElementById('priceEmpty').hidden = shown > 0;
  priceCountEl.textContent =
    shown === total ? `${total} pieces` : `Showing ${shown} of ${total} pieces`;
}

async function initPrices() {
  let figures;
  try {
    figures = await DataStore.getAll();
  } catch (err) {
    console.error('Could not load the price list:', err);
    priceListEl.innerHTML = `
      <p class="price-empty">
        Couldn't load the price list. Please try again later.
      </p>`;
    return;
  }

  const priced = figures.filter((f) => f.price !== null).sort(byName);
  if (!priced.length) {
    priceListEl.innerHTML = '<p class="price-empty">Prices are coming soon.</p>';
    return;
  }

  renderPriceList(priced);
  applySearch(priced.length);
  priceSearchEl.addEventListener('input', () => applySearch(priced.length));
}

initPrices();
