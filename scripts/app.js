/* -------- HTML HELPERS -------- */
const htmlEscapes = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => htmlEscapes[character]);
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function pathSegment(value) {
  return encodeURIComponent(String(value ?? '')).replace(/%2F/gi, '');
}

function gameRoute(game) {
  return `game/${encodeURIComponent(game.slug || '')}`;
}

function routeAttrs(game) {
  const route = escapeAttr(gameRoute(game));
  return `href="#${route}" data-route="${route}"`;
}

function dataRouteAttr(game) {
  return `data-route="${escapeAttr(gameRoute(game))}"`;
}

function ticketsLink(game) {
  const url = game.isPast ? (game.eventUrl || game.tickets) : game.tickets;
  if (!/^https:\/\//i.test(url || '')) return '';
  const label = game.isPast ? 'Original event listing' : (game.ticketLabel || 'Tickets');
  const note = !game.isPast && game.bookingNote ? `<p class="booking-note">${escapeHtml(game.bookingNote)}</p>` : '';
  return `<a class="ticket-btn" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>${note}`;
}

function detailsLink(game, label = 'Details') {
  return `<a ${routeAttrs(game)} class="ticket-btn">${escapeHtml(label)}</a>`;
}

function gameImage(game, key, className, attrs = '') {
  if (!game[key]) return '';
  const extraAttrs = attrs ? ` ${attrs}` : '';
  return `<img class="${escapeAttr(className)}" src="${escapeAttr(game[key])}" alt="${escapeAttr(game.name || '')}" loading="lazy" decoding="async"${extraAttrs}>`;
}

function eventMetaHTML(game) {
  const meta = [];

  if (game.theme) {
    meta.push(`<span><img src="logos/theme.png" alt="" width="24" height="24" loading="lazy" decoding="async"> ${escapeHtml(game.theme)}</span>`);
  }

  if (game.complexity) {
    meta.push(`<span><img src="logos/complexity.png" alt="" width="24" height="24" loading="lazy" decoding="async"> ${escapeHtml(game.complexity)}</span>`);
  }

  return meta.length ? `<p class="event-meta-icons">${meta.join(' ')}</p>` : '';
}

function paragraphsHTML(paragraphs) {
  return paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('');
}

function renderHomeIntro() {
  return paragraphsHTML(window.siteContent.homeIntro);
}

function renderAboutHTML() {
  const { about, conduct } = window.siteContent;

  return `
    <h1>${escapeHtml(about.heading)}</h1>
    ${paragraphsHTML([about.paragraphs[0]])}
    ${paragraphsHTML(about.paragraphs.slice(1))}
    <p>For information on megagames from other groups you can visit <a href="${escapeAttr(about.assemblyUrl)}">${escapeHtml(about.assemblyLabel)}</a></p>
    <h2>${escapeHtml(conduct.heading)}</h2>
    <p>${escapeHtml(conduct.intro)}</p>
    <p>${escapeHtml(conduct.leadIn)}</p>
    <ul>${conduct.rules.map(rule => `<li>${escapeHtml(rule)}</li>`).join('')}</ul>
    <p>${escapeHtml(conduct.note)}</p>
    <p>${escapeHtml(conduct.closing)}</p>
  `;
}

/* -------- MARKDOWN -------- */
function md(text) {
  if (!text) return '';
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .split(/\n\s*\n/)
    .map(p => `<p>${p.trim()}</p>`)
    .join('');
}

/* -------- NEON -------- */
function parseNeon(text) {
  const lines = text.split(/\r?\n/);
  const games = [];
  let current = null, key = null, buffer = [];

  function flush() {
    if (current && key) current[key] = buffer.join('\n').trim();
    buffer = [];
  }

  lines.forEach(line => {
    if (line.trim() === '-') {
      flush(); if (current) games.push(current);
      current = {}; key = null; return;
    }

    const m = line.match(/^([a-zA-Z0-9]+):\s*(.*)$/);
    if (m) {
      if (!current) throw new Error('Each event must start with a dash.');
      flush(); key = m[1];
      if (m[2] === '|') buffer = [];
      else { current[key] = m[2]; key = null; }
      return;
    }

    if (key) buffer.push(line);
  });

  flush(); if (current) games.push(current);
  return games;
}

/* -------- LOAD -------- */
const gamesBySource = new Map();

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function dateKey(value) {
  const match = String(value).match(/^(\d{1,2}) ([A-Za-z]+) (\d{4})$/);
  if (!match) throw new Error(`Invalid event date: ${value}`);
  const month = months.indexOf(match[2]);
  const day = Number(match[1]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month, day));
  if (month < 0 || date.getUTCMonth() !== month || date.getUTCDate() !== day) throw new Error(`Invalid event date: ${value}`);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function oxfordDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = type => parts.find(p => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function emptyUpcomingHTML() {
  return '<section class="empty-state"><h2>No upcoming events announced</h2><p>Our next adventure is still taking shape. Check <a href="https://www.tickettailor.com/events/oxfordhallofgames">Oxford Hall of Games on Ticket Tailor</a> for new announcements.</p><a href="#past" data-route="past">Explore our past games</a></section>';
}

function getGamesSource() {
  const parser = new URL(window.location);
  return parser.searchParams.get('source') || 'games.neon';
}

function normalizeGame(game) {
  if (!game.name || !/^[a-z0-9-]+$/.test(game.slug || '')) throw new Error('Each event needs a name and a unique lowercase slug.');
  return {
    ...game,
    dateKey: dateKey(game.date),
    photoList: game.photos
      ? game.photos
        .split(',')
        .map(p => p.trim())
        .filter(Boolean)
      : []
  };
}

async function loadGames() {
  const gamesSource = getGamesSource();

  if (!gamesBySource.has(gamesSource)) {
    const gamesPromise = fetch(gamesSource)
      .then(res => { if (!res.ok) throw new Error(`Events request failed (${res.status})`); return res.text(); })
      .then(text => {
        const games = parseNeon(text).map(normalizeGame);
        if (new Set(games.map(g => g.slug)).size !== games.length) throw new Error('Duplicate event slug');
        if (!games.length && text.trim()) throw new Error('Invalid event file');
        return games;
      })
      .catch(error => {
        gamesBySource.delete(gamesSource);
        throw error;
      });

    gamesBySource.set(gamesSource, gamesPromise);
  }

  const games = await gamesBySource.get(gamesSource);
  const today = oxfordDate();
  return games.map(g => ({ ...g, isPast: g.dateKey < today }));
}

/* -------- PHOTO AUTO NUMBER -------- */
function buildGalleryHTML(slug, photoList) {
  if (photoList.length === 0) return '';

  let html = '<h2>Photos</h2><div class="gallery">';
  photoList.forEach(name => {
    const src = `photos/${pathSegment(slug)}/${pathSegment(name)}`;
    html += `<img src="${escapeAttr(src)}" alt="" loading="lazy" decoding="async" width="320" height="240" data-lightbox-src="${escapeAttr(src)}">`;
  });

  html += '</div>';
  return html;
}

/* -------- LIGHTBOX -------- */
function openLightbox(src) {
  const lb = document.getElementById('lightbox');
  document.getElementById('lightbox-img').src = src;
  lb.style.display = 'flex';
}

function closeLightbox() {
  document.getElementById('lightbox').style.display = 'none';
}

/* -------- CAROUSEL -------- */
const carouselImages = [
  { src: 'images/black-swan.jpg', name: 'The Black Swan Crisis', slug: '2026-09-black-swan' },
  { src: 'images/heist.jpg', name: 'Heist!', slug: '2025-07-heist' },
  { src: 'images/raven-banner.jpg', name: 'The Raven Banner', slug: '2025-05-raven-banner' },
  { src: 'images/death-on-high-seas.jpg', name: 'Death on High Seas', slug: '2025-02-death-on-high-seas' },
  { src: 'images/new-eden.png', name: 'Den of Wolves: New Eden', slug: '2024-11-new-eden-soxs' },
  { src: 'images/crisis-mars.png', name: 'Crisis: Mars', slug: '2025-11-crisis-mars-soxs' }
];

let carouselIndex = 0;
let carouselPaused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function carouselHTML() {
  const slide = carouselImages[carouselIndex];
  return `
    <div class="carousel" aria-label="Artwork from our past games">
      <img id="carousel-img" src="${slide.src}" alt="${slide.name}" width="1172" height="373" fetchpriority="high">
      <a id="carousel-caption" class="carousel-caption" href="#game/${slide.slug}" data-route="game/${slide.slug}">${slide.name}</a>
      <button class="prev" type="button" data-carousel-step="-1" aria-label="Previous carousel image">&lsaquo;</button>
      <button class="next" type="button" data-carousel-step="1" aria-label="Next carousel image">&rsaquo;</button>
      <button class="pause" type="button" data-carousel-pause>${carouselPaused ? 'Play slideshow' : 'Pause slideshow'}</button>
    </div>`;
}

function carouselMove(dir) {
  carouselIndex = (carouselIndex + dir + carouselImages.length) % carouselImages.length;
  const slide = carouselImages[carouselIndex];
  const image = document.getElementById('carousel-img');
  image.src = slide.src;
  image.alt = slide.name;
  const caption = document.getElementById('carousel-caption');
  caption.textContent = slide.name;
  caption.href = `#game/${slide.slug}`;
  caption.dataset.route = `game/${slide.slug}`;
}

/* Auto-advance every 10 seconds */
setInterval(() => {
  if (!carouselPaused && !document.hidden && document.getElementById('carousel-img')) {
    carouselMove(1);
  }
}, 10000);

/* -------- ROUTER -------- */
function navigate(p) {
  const nextHash = `#${p}`;

  if (location.hash === nextHash) {
    render();
  } else {
    location.hash = p;
  }
}

window.addEventListener('hashchange', render);

document.addEventListener('click', event => {
  const pause = event.target.closest('[data-carousel-pause]');
  if (pause) {
    carouselPaused = !carouselPaused;
    pause.textContent = carouselPaused ? 'Play slideshow' : 'Pause slideshow';
    return;
  }
  const routeTarget = event.target.closest('[data-route]');
  if (routeTarget) {
    event.preventDefault();
    navigate(routeTarget.dataset.route);
    return;
  }

  const carouselTarget = event.target.closest('[data-carousel-step]');
  if (carouselTarget) {
    carouselMove(Number(carouselTarget.dataset.carouselStep));
    return;
  }

  const lightboxTarget = event.target.closest('[data-lightbox-src]');
  if (lightboxTarget) {
    openLightbox(lightboxTarget.dataset.lightboxSrc);
    return;
  }

  if (event.target.closest('[data-lightbox-close]')) {
    closeLightbox();
  }
});

/* -------- RENDER -------- */
let renderVersion = 0;
async function render() {
  const version = ++renderVersion;
  const app = document.getElementById('app');
  const hash = location.hash.replace('#', '') || 'home';
  document.querySelectorAll('nav a').forEach(a => {
    if (a.dataset.route === hash) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.title = 'Oxford Hall of Games';
  if (hash === 'about') { app.innerHTML = renderAboutHTML(); return; }
  let games;
  try { games = await loadGames(); }
  catch (error) {
    if (version !== renderVersion) return;
    console.error(error);
    app.innerHTML = '<h1>Games could not be loaded</h1><p>Please reload the page to try again, or <a href="https://www.tickettailor.com/events/oxfordhallofgames">visit our Ticket Tailor page</a>. You can also <a href="mailto:spa263-oxhog@yahoo.com">contact us</a>.</p>';
    return;
  }
  if (version !== renderVersion) return;

  const upcoming = games.filter(g => !g.isPast).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const past = games.filter(g => g.isPast).sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  if (hash.startsWith('game/')) {
    let slug;
    try { slug = decodeURIComponent(hash.slice(5)); } catch { slug = ''; }
    const g = games.find(x => x.slug === slug);

    if (!g) {
      app.innerHTML = '<h1>Game not found</h1>';
      return;
    }

    document.title = `${g.name} | Oxford Hall of Games`;
    app.innerHTML = `
      <h1>${escapeHtml(g.name)}</h1>
      ${gameImage(g, 'bannerImage', 'banner')}
      <p><strong>Date:</strong> ${escapeHtml(g.date)}</p>
      ${!g.isPast && g.time ? `<p><strong>Time:</strong> ${escapeHtml(g.time)} (UK time)</p>` : ''}
      ${!g.isPast ? `<p><strong>Venue:</strong> ${escapeHtml(g.venue)}</p>` : ''}
      ${g.isPast ? '<p class="event-status">This event has taken place.</p>' : ''}
      ${ticketsLink(g)}
      ${!g.isPast && /^https:\/\//i.test(g.eventUrl || '') ? `<p><a href="${escapeAttr(g.eventUrl)}">Event information</a></p>` : ''}
      ${!g.isPast && g.logisticsBefore ? `<div class="markdown logistics-before">${md(g.logisticsBefore)}</div>` : ''}
      <div class="markdown">${md(g.description)}</div>
      ${!g.isPast && g.logisticsAfter ? `<div class="markdown logistics-after">${md(g.logisticsAfter)}</div>` : ''}
      ${/^https:\/\//i.test(g.rules || '') ? `<p><a href="${escapeAttr(g.rules)}">Game rules (PDF)</a></p>` : ''}
      ${g.isPast ? `${buildGalleryHTML(g.slug, g.photoList)}` : ''}
    `;
    return;
  }

  if (hash === 'home') {
    const next = upcoming[0];

    let innerHTML = `
      <h1>Welcome to Oxford Hall of Games</h1>

      <div class="home-grid">

        <div>
          ${carouselHTML()}

          ${next ? `
            <div class="highlight">
              <h2 ${dataRouteAttr(next)}>Next Event: ${escapeHtml(next.name)}</h2>
              ${gameImage(next, 'bannerImage', 'list-img', dataRouteAttr(next))}
              <p>${escapeHtml(next.date)}</p><p>${escapeHtml(next.venue || '')}</p>
              ${eventMetaHTML(next)}
              <p>${escapeHtml(next.tagline || '')}</p>
              ${detailsLink(next)}
              ${ticketsLink(next)}
            </div>` : emptyUpcomingHTML()}`;

    innerHTML += upcoming.slice(1).map(g => `
      <div class="card">
        <div class="compact-event">
          <div class="compact-event-actions">
            ${detailsLink(g)}
            ${ticketsLink(g)}
          </div>
          <div class="compact-event-details" ${dataRouteAttr(g)}>
            <strong>${escapeHtml(g.name)}</strong> (${escapeHtml(g.date)}, ${escapeHtml(g.location || '')})
            <p>${escapeHtml(g.tagline || '')}</p>
          </div>
          <div ${dataRouteAttr(g)}>
            ${gameImage(g, 'listImage', 'compact-event-image')}
          </div>
        </div>
      </div>
    `).join('');

    innerHTML +=
        `</div>

        <div class="sidebar">
            <div class="home-intro">
                ${renderHomeIntro()}
            </div>
          <div class="cta-box">
            <h2>Keep in touch</h2>
            <p><a href="mailto:spa263-oxhog@yahoo.com">Email Oxford Hall of Games</a></p>
            <p><a href="https://www.tickettailor.com/events/oxfordhallofgames">Find us on Ticket Tailor</a></p>
            <p>Mailing list coming soon.</p>
          </div>
        </div>

      </div>
    `;
    app.innerHTML = innerHTML;
  }

  if (hash === 'upcoming') {
    app.innerHTML = `<h1>Upcoming Games</h1>${upcoming.length ? '' : emptyUpcomingHTML()}<div class="games-grid"></div>`;
    const grid = app.querySelector('.games-grid');

    grid.innerHTML = upcoming.map(g => `
        <div class="card">
          ${gameImage(g, 'listImage', 'list-img', dataRouteAttr(g))}
          <h2 ${dataRouteAttr(g)}>${escapeHtml(g.name)}</h2>
          <p>${escapeHtml(g.date)}</p>
          ${g.location ? `<p><strong>Location:</strong> ${escapeHtml(g.location)}</p>` : ''}
          ${eventMetaHTML(g)}
          <p>${escapeHtml(g.tagline || '')}</p>
          ${detailsLink(g)}
          ${ticketsLink(g)}
        </div>
      `).join('');
  }

  if (hash === 'past') {
    app.innerHTML = '<h1>Past Games</h1><div class="games-grid"></div>';
    const grid = app.querySelector('.games-grid');

    grid.innerHTML = past.map(g => `
        <div class="card">
          ${gameImage(g, 'listImage', 'list-img', dataRouteAttr(g))}
          <h2 ${dataRouteAttr(g)}>${escapeHtml(g.name)}</h2>
          <p>${escapeHtml(g.date)}</p>
          ${g.location ? `<p><strong>Location:</strong> ${escapeHtml(g.location)}</p>` : ''}
          <p>${escapeHtml(g.tagline || '')}</p>
          ${detailsLink(g, 'View')}
        </div>
      `).join('');
  }
  if (!['home', 'upcoming', 'past'].includes(hash)) app.innerHTML = '<h1>Page not found</h1><p><a href="#home" data-route="home">Return home</a></p>';
}

document.addEventListener('keydown', event => { if (event.key === 'Escape') closeLightbox(); });
render();
