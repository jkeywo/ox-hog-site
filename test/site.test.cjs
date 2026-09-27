const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadApp(fetch = async () => ({ ok: true, text: async () => fs.readFileSync('games.neon', 'utf8') })) {
  const grid = { innerHTML: '' };
  const app = { innerHTML: '', querySelector: () => grid };
  const context = vm.createContext({
    URL, Intl, Date, console: { error() {} }, fetch, setInterval() {},
    location: { hash: '#home' },
    window: { location: 'https://example.com/', addEventListener() {}, matchMedia: () => ({ matches: true }) },
    document: { title: '', hidden: false, querySelectorAll: () => [], addEventListener() {}, getElementById: () => app }
  });
  vm.runInContext(fs.readFileSync('scripts/site-content.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('scripts/app.js', 'utf8'), context);
  return { context, app, grid, run: code => vm.runInContext(code, context) };
}

test('eleven complete records, unique slugs, valid local artwork and source links', () => {
  const { context, run } = loadApp();
  context.text = fs.readFileSync('games.neon', 'utf8');
  const games = run('parseNeon(text).map(normalizeGame)');
  assert.equal(games.length, 11);
  assert.equal(new Set(games.map(g => g.slug)).size, 11);
  assert.deepEqual(Array.from(games, g => g.dateKey).sort(), ['2024-04-12','2024-06-14','2024-08-02','2024-10-18','2024-11-02','2025-02-14','2025-05-09','2025-07-04','2025-11-01','2026-09-26','2026-11-07']);
  for (const game of games) {
    assert.match(game.eventUrl || game.tickets, /^https:\/\//);
    assert.ok(game.description.length > 100);
    assert.ok(game.venue && game.time);
    for (const key of ['listImage','bannerImage']) assert.ok(fs.existsSync(game[key]));
  }
  const heist = games.find(g => g.slug === '2025-07-heist');
  assert.equal(heist.name, 'Heist!');
  assert.doesNotMatch(heist.description, /Crisis: Mars|lack of ticket sales/);
});

test('SOXS booking links distinguish convention admission from reserving a game', async () => {
  const { context, app, grid, run } = loadApp();
  context.text = fs.readFileSync('games.neon', 'utf8');
  const games = run('parseNeon(text).map(normalizeGame)');
  const upcoming = games.filter(g => g.dateKey >= '2026-09-27');
  assert.equal(upcoming.length, 1);
  assert.equal(upcoming[0].slug, '2026-11-black-swan-soxs');
  assert.match(upcoming[0].tickets, /eventbrite.com\/e\/soxs-con-2026/);
  context.game = upcoming[0];
  const link = run('ticketsLink(game)');
  assert.match(link, />SOXS Con tickets</);
  assert.match(link, /Bookaby/);
  assert.match(link, /does not reserve your game place/);
  context.game.isPast = true;
  assert.match(run('ticketsLink(game)'), /href="https:\/\/www.soxsgamingday.org.uk\/megagame-the-black-swan-crisis\//);
  assert.doesNotMatch(run('ticketsLink(game)'), /Bookaby|eventbrite/);
  context.game = games.find(g => g.slug === '2024-06-new-eden');
  context.game.isPast = true;
  assert.match(run('ticketsLink(game)'), /meetup.com\/oxfordonboard\/events\/300449594/);
});

test('Oxford date boundaries are independent of the visitor timezone, including DST', () => {
  const { run } = loadApp();
  assert.equal(run("oxfordDate(new Date('2026-09-26T22:59:59Z'))"), '2026-09-26');
  assert.equal(run("oxfordDate(new Date('2026-09-26T23:00:00Z'))"), '2026-09-27');
  assert.equal(run("oxfordDate(new Date('2026-01-02T23:30:00Z'))"), '2026-01-02');
  assert.equal(run("oxfordDate(new Date('2026-03-29T23:00:00Z'))"), '2026-03-30');
  assert.equal(run("dateKey('26 September 2026') < oxfordDate(new Date('2026-09-26T12:00:00Z'))"), false);
  assert.throws(() => run("dateKey('31 February 2026')"), /Invalid event date/);
});

test('attendance sections surround the description and disappear when the event becomes past', async () => {
  const events = '-\nname: Game\nslug: game\ndate: 1 May 2099\ntime: 7 PM\nvenue: Test venue\nlogisticsBefore: |\n  Arrival <script>\ndescription: |\n  Game premise.\nlogisticsAfter: |\n  Parking details.';
  const { app, context, run } = loadApp(async () => ({ ok: true, text: async () => events }));
  context.location.hash = '#game/game';
  await run('render()');
  assert.ok(app.innerHTML.indexOf('Arrival') < app.innerHTML.indexOf('Game premise.'));
  assert.ok(app.innerHTML.indexOf('Game premise.') < app.innerHTML.indexOf('Parking details.'));
  assert.match(app.innerHTML, /Arrival &lt;script&gt;/);
  assert.match(app.innerHTML, /Test venue/);
  run("oxfordDate = () => '2099-05-02'");
  await run('render()');
  assert.match(app.innerHTML, /Game premise\./);
  assert.doesNotMatch(app.innerHTML, /Arrival|Parking details|Test venue|7 PM|logistics-/);
});

test('archive descriptions exclude attendance instructions without losing them from event data', async () => {
  const { app, context, run } = loadApp();
  context.text = fs.readFileSync('games.neon', 'utf8');
  const games = run('parseNeon(text).map(normalizeGame)');
  for (const game of games) {
    assert.doesNotMatch(game.description, /Turn up|Parking is|Standard tickets|rules will be explained|Age 18|Costumes are|Rules were explained|charged £3|read the rulebook before arriving/);
    assert.ok(game.logisticsBefore || game.logisticsAfter);
  }
  const heist = games.find(g => g.slug === '2025-07-heist');
  assert.match(heist.logisticsBefore, /Turn up from 6:45 for a 7:00 start/);
  context.location.hash = '#game/2025-07-heist';
  await run('render()');
  assert.match(app.innerHTML, /asymmetric crime caper/);
  assert.doesNotMatch(app.innerHTML, /Turn up|Crisis: Mars|lack of ticket sales/);
});

test('untrusted event strings are escaped and unsafe ticket links are rejected', () => {
  const { run } = loadApp();
  assert.equal(run("md('<img src=x onerror=alert(1)> **Safe**')"), '<p>&lt;img src=x onerror=alert(1)&gt; <strong>Safe</strong></p>');
  assert.equal(run("ticketsLink({tickets:'javascript:alert(1)'})"), '');
  assert.equal(run("md('First paragraph.\\n  \\n  Second paragraph.')"), '<p>First paragraph.</p><p>Second paragraph.</p>');
  assert.match(run("ticketsLink({tickets:'https://example.com/',isPast:true})"), /Original event listing/);
});

test('home shows a useful empty state for an empty event file', async () => {
  const { app, run } = loadApp(async () => ({ ok: true, text: async () => '' }));
  await run('render()');
  assert.match(app.innerHTML, /No upcoming events announced/);
  assert.match(app.innerHTML, /Mailing list coming soon/);
  assert.doesNotMatch(app.innerHTML, /discord|filesusr/);
});

test('future events sort earliest first, past events latest first, with appropriate ticket actions', async () => {
  const events = '-\nname: Later\nslug: later\ndate: 2 May 2099\ntickets: https://example.com/later\n-\nname: Earlier\nslug: earlier\ndate: 1 May 2099\ntickets: https://example.com/earlier\n-\nname: Old\nslug: old\ndate: 1 May 2000\n-\nname: Recent\nslug: recent\ndate: 1 May 2001';
  const { app, grid, context, run } = loadApp(async () => ({ ok: true, text: async () => events }));
  await run('render()');
  assert.match(app.innerHTML, /Next Event: Earlier/);
  assert.doesNotMatch(app.innerHTML, /No upcoming events announced/);
  context.location.hash = '#upcoming';
  await run('render()');
  assert.ok(grid.innerHTML.indexOf('Earlier') < grid.innerHTML.indexOf('Later'));
  assert.match(grid.innerHTML, />Tickets</);
  context.location.hash = '#past';
  await run('render()');
  assert.ok(grid.innerHTML.indexOf('Recent') < grid.innerHTML.indexOf('Old'));
  assert.doesNotMatch(grid.innerHTML, />Tickets</);
});

test('failed HTTP fetch displays recovery links and About still works', async () => {
  let calls = 0;
  const { app, context, run } = loadApp(async () => { calls++; return { ok: false, status: 404 }; });
  await run('render()');
  assert.match(app.innerHTML, /Games could not be loaded/);
  assert.match(app.innerHTML, /tickettailor/);
  const before = calls;
  context.location.hash = '#about';
  await run('render()');
  assert.match(app.innerHTML, /Code of Conduct/);
  assert.equal(calls, before);
});

test('malformed dates, duplicate slugs and HTML responses fail visibly', async () => {
  for (const content of ['<!doctype html>Not found', '-\nname: Invalid\nslug: invalid\ndate: 99 May 2025', '-\nname: One\nslug: same\ndate: 1 May 2025\n-\nname: Two\nslug: same\ndate: 2 May 2025']) {
    const { app, run } = loadApp(async () => ({ ok: true, text: async () => content }));
    await run('render()');
    assert.match(app.innerHTML, /Games could not be loaded/);
  }
});

test('unknown and malformed game routes have a useful result', async () => {
  const { app, context, run } = loadApp();
  for (const hash of ['#game/missing', '#game/%E0%A4%A']) {
    context.location.hash = hash;
    await run('render()');
    assert.match(app.innerHTML, /Game not found/);
  }
  context.location.hash = '#missing';
  await run('render()');
  assert.match(app.innerHTML, /Page not found/);
});
