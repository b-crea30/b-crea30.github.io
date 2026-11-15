/* B.CREA · site vitrine (version GitHub Pages) */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const el = (tag, props = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === false || v == null) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach(c => c != null && e.append(c));
  return e;
};
const root = document.documentElement;
const calm = matchMedia('(prefers-reduced-motion: reduce)');
const CFG = window.BCREA_CONFIG || {};
const S = { site: {}, items: [], orderItem: null, lastView: null };

/* ---------- thème clair / sombre ---------- */
try { const t = localStorage.getItem('bcrea-theme'); if (t === 'dark' || t === 'light') root.dataset.theme = t; } catch (e) {}
const isDark = () => { const t = root.dataset.theme; return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
$('theme').addEventListener('click', () => { const n = isDark() ? 'light' : 'dark'; root.dataset.theme = n; try { localStorage.setItem('bcrea-theme', n); } catch (e) {} });

/* ---------- contenus (dossier content/) ---------- */
async function load(name) {
  try { const r = await fetch('content/' + name + '.json', { cache: 'no-cache' }); if (!r.ok) throw 0; return await r.json(); }
  catch (e) { return null; }
}

/* ---------- menu et pages ---------- */
const VIEWS = ['home', 'une', 'creations', 'boutique', 'pro', 'avis', 'devis', 'infos', 'legal', 'prive'];
const SUB = { faq: 'infos', mentions: 'legal', confidentialite: 'legal', cgv: 'legal', realisations: 'creations', occasions: 'creations', categories: 'creations', presentation: 'home', 'pro-form-anchor': 'pro' };
function setMenu(open) { $('nav').classList.toggle('open', open); $('menu-btn').setAttribute('aria-expanded', open); }
$('menu-btn').addEventListener('click', () => setMenu(!$('nav').classList.contains('open')));
document.addEventListener('click', e => { if (!e.target.closest('header')) setMenu(false); });
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  const v = VIEWS.includes(h) ? h : (SUB[h] || 'home');
  VIEWS.forEach(k => $('view-' + k).hidden = k !== v);
  const shown = $('view-' + v);
  if (S.lastView !== v) { shown.classList.remove('view-enter'); void shown.offsetWidth; shown.classList.add('view-enter'); S.lastView = v; }
  document.querySelectorAll('#nav a').forEach(a => {
    const t = a.getAttribute('href').slice(1);
    if (v === 'home' ? t === 'accueil' : t === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  setMenu(false);
  document.dispatchEvent(new CustomEvent('bcrea:view', { detail: v }));
  if (VIEWS.includes(h) || !h || h === 'accueil') { window.scrollTo(0, 0); return; }
  const t = document.getElementById(h); if (t) requestAnimationFrame(() => t.scrollIntoView());
}
addEventListener('hashchange', route);
document.addEventListener('click', e => { const a = e.target.closest('a[href^="#"]'); if (a && a.getAttribute('href') === location.hash) route(); });

/* ---------- annonce ---------- */
function renderSite() {
  const t = (S.site.annonce || '').trim();
  $('announce').hidden = !t; $('announce-text').textContent = t;
  const em = (S.site.email || 'b.crea30@gmail.com').trim(), ph = (S.site.telephone || '').trim();
  const rows = [['Email', em], ph && ['Téléphone', ph]].filter(Boolean).map(([k, v]) => {
    return el('div', { class: 'direct-row' }, el('span', {}, el('small', { text: k }), v),
      el('button', { type: 'button', class: 'link-btn', text: 'Copier', onclick: ev => copy(v, ev.currentTarget) }));
  });
  $('pro-contact').replaceChildren(...rows);
  $('devis-contact').hidden = false;
  $('devis-contact').replaceChildren(el('p', { class: 'label', text: 'Contact direct' }), ...rows.map(r => r.cloneNode(true)));
  $('devis-contact').querySelectorAll('.direct-row').forEach((r, i) => r.querySelector('button').addEventListener('click', ev => copy(i ? ph : em, ev.currentTarget)));
}
async function copy(t, btn) {
  try { await navigator.clipboard.writeText(t); if (btn) { const o = btn.textContent; btn.textContent = 'Copié'; setTimeout(() => btn.textContent = o, 1500); } }
  catch (e) { if (btn) btn.textContent = 'Sélectionnez le texte'; }
}

/* ---------- galerie ---------- */
let currentFilter = 'all';
function applyFilter() { document.querySelectorAll('#gallery figure').forEach(f => f.hidden = !(currentFilter === 'all' || f.dataset.cat === currentFilter)); }
document.querySelectorAll('.filters button').forEach(btn => btn.addEventListener('click', () => {
  currentFilter = btn.dataset.f;
  document.querySelectorAll('.filters button').forEach(b => b.setAttribute('aria-pressed', b === btn));
  applyFilter();
}));
function renderGallery(list) {
  $('gallery').replaceChildren(...(list || []).filter(g => g && g.image).map(g =>
    el('figure', { 'data-cat': g.categorie || 'objets' }, el('img', { src: g.image, alt: g.titre || 'Création B.CREA', loading: 'lazy' }), el('figcaption', { text: g.titre || '' }))));
  applyFilter(); renderCarousel();
}

/* ---------- carrousel ---------- */
function renderCarousel() {
  const figs = [...document.querySelectorAll('#gallery figure')].slice(0, 8);
  $('car-track').replaceChildren(...figs.map(f => {
    const im = f.querySelector('img'), cap = f.querySelector('figcaption');
    return el('figure', { class: 'slide' }, el('img', { src: im.getAttribute('src'), alt: im.alt || '', loading: 'lazy' }), el('figcaption', { text: cap ? cap.textContent : '' }));
  }));
}
function carStep(dir) {
  const t = $('car-track'), sl = t.querySelector('.slide'); if (!sl) return;
  const w = sl.getBoundingClientRect().width + 18;
  if (dir > 0 && t.scrollLeft + t.clientWidth >= t.scrollWidth - 4) t.scrollTo({ left: 0 }); else t.scrollBy({ left: dir * w });
}
$('car-prev').addEventListener('click', () => carStep(-1));
$('car-next').addEventListener('click', () => carStep(1));
$('car-track').addEventListener('keydown', e => { if (e.key === 'ArrowRight') { carStep(1); e.preventDefault(); } if (e.key === 'ArrowLeft') { carStep(-1); e.preventDefault(); } });
let carHold = false;
const car = $('car-track').closest('.carousel');
['pointerenter', 'focusin', 'touchstart'].forEach(ev => car.addEventListener(ev, () => carHold = true, { passive: true }));
['pointerleave', 'focusout'].forEach(ev => car.addEventListener(ev, () => carHold = false));
if (!calm.matches) setInterval(() => { if (!carHold && !document.hidden && !$('view-home').hidden) carStep(1); }, 4500);

/* ---------- tarifs ---------- */
const CAT_LISTS = [...document.querySelectorAll('#categories .cat ul')], CAT_KEYS = ['objets', 'fetes'];
function renderTarifs(list) {
  if (!Array.isArray(list) || !list.length) return;
  const cat = list.filter(c => c && c.nom);
  CAT_LISTS.forEach((ul, i) => {
    ul.classList.add('priced');
    ul.replaceChildren(...cat.filter(c => (c.rubrique || 'objets') === CAT_KEYS[i]).map(c =>
      el('li', {}, el('span', { class: 'cn', text: c.nom }), el('span', { class: 'dots', 'aria-hidden': 'true' }), el('span', { class: 'cp' + (c.prix ? '' : ' ask'), text: c.prix || 'Sur devis' }))));
  });
  const sel = $('f-support'), cur = sel.value;
  sel.replaceChildren(...[...cat.map(c => c.nom), 'Article de la boutique', 'Autre'].filter((v, i, a) => a.indexOf(v) === i).map(n => el('option', { text: n })));
  if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
}

/* ---------- à la une ---------- */
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const pDate = d => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
const isEvent = n => (n.type || '').toLowerCase().startsWith('ev');
const isPast = n => { if (!isEvent(n)) return false; const d = pDate(n.date); if (!d) return false; const t = new Date(); t.setHours(0, 0, 0, 0); return d < t; };
const longDate = d => { const x = pDate(d); return x ? x.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''; };
function newsCard(n) {
  const ev = isEvent(n), d = pDate(n.date), media = el('div', { class: 'news-media' });
  if (n.photo) { media.append(el('img', { src: n.photo, alt: '', loading: 'lazy' })); if (ev && d) media.append(el('span', { class: 'date-chip' }, el('b', { text: String(d.getDate()) }), el('span', { text: MONTHS[d.getMonth()] }))); }
  else if (ev && d) media.append(el('div', { class: 'big-date' }, el('b', { text: String(d.getDate()) }), el('span', { text: MONTHS[d.getMonth()] + ' ' + d.getFullYear() })));
  else media.append(el('span', { class: 'ph', text: 'B' }));
  return el('article', { class: 'news' }, media, el('div', { class: 'news-body' },
    el('span', { class: 'label', text: ev ? 'Événement' : 'Article du moment' }), el('h3', { text: n.titre || '' }),
    ev ? el('p', { class: 'news-meta', text: [longDate(n.date), n.lieu].filter(Boolean).join(' · ') }) : null,
    n.texte ? el('p', { class: 'news-text', text: n.texte }) : null));
}
function renderNews(all) {
  all = (Array.isArray(all) ? all : []).filter(n => n && n.titre && !isPast(n));
  const ev = all.filter(isEvent).sort((a, b) => (a.date || '').localeCompare(b.date || '')), ar = all.filter(n => !isEvent(n));
  const list = [...ev, ...ar];
  $('une-home').hidden = !list.length;
  $('news-home').replaceChildren(...list.slice(0, 3).map(newsCard));
  $('news-all').replaceChildren(...(list.length ? list.map(newsCard) : [el('div', { class: 'empty empty-wide' }, el('p', { class: 'empty-t', text: 'Rien à la une pour le moment.' }), el('p', { text: 'Les nouveautés et les prochains marchés apparaîtront ici.' }))]));
}

/* ---------- boutique ---------- */
function setOrderItem(item) { S.orderItem = item; $('f-item').hidden = !item; $('f-item-text').textContent = item ? 'Article : ' + item.nom + (item.prix ? ' · ' + item.prix : '') : ''; }
$('f-item-x').addEventListener('click', () => setOrderItem(null));
function orderItem(it, out) {
  $('devis-done').hidden = true; $('devis-form').hidden = false;
  setOrderItem(out ? null : { nom: it.nom || '', prix: it.prix || '' });
  $('f-support').value = 'Article de la boutique'; $('f-qte').value = '1';
  $('f-idee').value = out ? `Je suis intéressé(e) par « ${it.nom} » quand il sera de nouveau en stock.` : `Je souhaite commander « ${it.nom} » (article de la boutique).`;
  location.hash = 'devis'; setTimeout(() => $('f-nom').focus(), 60);
}
function shopCard(it) {
  const photos = (Array.isArray(it.photos) ? it.photos : []).filter(Boolean), n = Math.max(0, Math.floor(+it.stock || 0)), out = n === 0;
  const media = el('div', { class: 'item-media' });
  const main = photos.length ? el('img', { src: photos[0], alt: it.nom || '', loading: 'lazy' }) : el('span', { class: 'ph', text: 'B' });
  media.append(main, el('span', { class: 'stock' + (out ? '' : n <= 3 ? ' in low' : ' in'), text: out ? 'Rupture de stock' : n === 1 ? 'Plus qu’un exemplaire' : n <= 3 ? `Plus que ${n} en stock` : `${n} en stock` }));
  const mini = photos.length > 1 ? el('div', { class: 'mini' }, photos.map((src, i) => el('button', { type: 'button', 'aria-label': 'Photo ' + (i + 1), 'aria-pressed': i === 0 ? 'true' : 'false', onclick: e => { main.src = src; e.currentTarget.parentNode.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === e.currentTarget)); } }, el('img', { src, alt: '' })))) : null;
  return el('article', { class: 'item' + (out ? ' soldout' : '') }, media, mini,
    el('div', { class: 'item-head' }, el('h3', { text: it.nom || '' }), el('span', { class: 'price' + (it.prix ? '' : ' ask'), text: it.prix || 'Sur devis' })),
    it.description ? el('p', { class: 'item-text', text: it.description }) : null,
    el('button', { type: 'button', class: 'btn small-btn' + (out ? '' : ' solid'), text: out ? 'Être prévenu(e) du retour' : 'Commander', onclick: () => orderItem(it, out) }));
}
function renderShop(list) {
  const items = (Array.isArray(list) ? list : []).filter(i => i && i.nom).sort((a, b) => ((+b.stock > 0) - (+a.stock > 0)));
  $('shop-grid').replaceChildren(...(items.length ? items.map(shopCard) : [el('div', { class: 'empty empty-wide' }, el('p', { class: 'empty-t', text: 'La boutique ouvre bientôt.' }), el('p', { text: 'Les créations prêtes à offrir apparaîtront ici. En attendant, demandez un devis pour une pièce personnalisée.' }))]));
}

/* ---------- avis ---------- */
const starsEl = n => { const s = el('span', { class: 'stars', role: 'img', 'aria-label': (Math.round(n * 10) / 10) + ' sur 5' }); for (let i = 1; i <= 5; i++) s.append(el('span', { class: i <= Math.round(n) ? null : 'off', text: '★', 'aria-hidden': 'true' })); return s; };
function renderReviews(list) {
  const rs = (Array.isArray(list) ? list : []).filter(r => r && +r.note >= 1 && +r.note <= 5);
  const n = rs.length, avg = n ? rs.reduce((a, r) => a + +r.note, 0) / n : 0;
  $('rv-summary').replaceChildren(
    el('div', { class: 'avg-row' }, el('span', { class: 'avg', text: n ? avg.toFixed(1).replace('.', ',') : '–' }),
      el('div', { class: 'avg-meta' }, starsEl(avg), el('span', { class: 'hint', text: n ? (n === 1 ? '1 avis' : n + ' avis') : 'Aucun avis pour l’instant' }))));
  $('home-rating').textContent = n ? `Note moyenne ${avg.toFixed(1).replace('.', ',')} / 5 sur ${n} avis` : '';
  $('rv-list').replaceChildren(...(n ? rs.map(r => el('article', { class: 'review' },
    el('div', { class: 'rv-head' }, el('strong', { text: r.prenom || 'Client' }), starsEl(+r.note), r.date ? el('time', { text: r.date }) : null),
    el('p', { class: 'rv-text', text: r.texte || '' }),
    r.reponse ? el('div', { class: 'reply' }, el('span', { class: 'label', text: 'Réponse de B.CREA' }), el('p', { text: r.reponse })) : null))
    : [el('div', { class: 'empty' }, el('p', { class: 'empty-t', text: 'Aucun avis pour le moment.' }), el('p', { text: 'Le premier pourrait être le vôtre.' }))]));
}

/* ---------- formulaires (envoi par email avec Web3Forms) ---------- */
const KEY = (CFG.web3formsKey || '').trim();
const formReady = /^[0-9a-f-]{20,}$/i.test(KEY);
const val = id => $(id).value.trim();
const okMail = m => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m);
function recap(r) {
  return [r.article ? 'Article : ' + r.article : null, r.entreprise ? 'Entreprise : ' + r.entreprise : null,
    (r.entreprise ? 'Contact : ' : 'Prénom : ') + r.nom, 'Email : ' + r.email, r.telephone && 'Téléphone : ' + r.telephone,
    r.besoin ? 'Besoin : ' + r.besoin : 'Support : ' + r.support + (r.quantite ? ' (×' + r.quantite + ')' : ''),
    r.besoin && r.quantite ? 'Quantité : ' + r.quantite : null, r.budget ? 'Budget : ' + r.budget : null, r.siret ? 'SIRET : ' + r.siret : null,
    r.occasion && 'Occasion : ' + r.occasion, r.pour && 'Pour : ' + r.pour, r.reception && 'Réception : ' + r.reception, 'Idée : ' + r.idee].filter(Boolean).join('\n');
}
async function send(subject, r) {
  const body = { access_key: KEY, subject, from_name: 'Site B.CREA', name: r.nom, email: r.email, message: recap(r) };
  const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.success) throw new Error(j.message || 'Envoi refusé');
}
function burst(box) {
  if (calm.matches) return;
  const b = el('span', { class: 'burst', 'aria-hidden': 'true' });
  for (let i = 0; i < 16; i++) {
    const a = Math.PI * 2 * i / 16 + Math.random() * .3, d = 70 + Math.random() * 70, p = el('b', { text: i % 3 ? '✿' : '♥' });
    p.style.setProperty('--dx', Math.cos(a) * d + 'px'); p.style.setProperty('--dy', Math.sin(a) * d + 'px'); p.style.setProperty('--r', (Math.random() * 360 - 180) + 'deg'); p.style.fontSize = (12 + Math.random() * 10) + 'px'; b.append(p);
  }
  box.append(b); setTimeout(() => b.remove(), 1300);
}
function showFallback(r) { $('msg').textContent = 'Bonjour B.CREA,\n\n' + recap(r) + '\n\nMerci !'; $('f-fallback').hidden = false; $('f-fallback').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
$('copy').addEventListener('click', () => copy($('msg').textContent, $('copy')));

$('devis-form').addEventListener('submit', async e => {
  e.preventDefault();
  const st = $('f-status');
  if ($('f-bot').checked) return;
  const r = { nom: val('f-nom'), email: val('f-email'), telephone: val('f-tel'), support: $('f-support').value, occasion: val('f-occ'), quantite: val('f-qte'), idee: val('f-idee'), pour: val('f-date'), reception: $('f-deliv').value };
  if (S.orderItem) r.article = S.orderItem.nom + (S.orderItem.prix ? ' (' + S.orderItem.prix + ')' : '');
  if (!r.nom) { st.textContent = 'Indiquez votre prénom.'; $('f-nom').focus(); return; }
  if (!okMail(r.email)) { st.textContent = 'Indiquez une adresse email valide pour recevoir la réponse.'; $('f-email').focus(); return; }
  if (r.idee.length < 5) { st.textContent = 'Décrivez votre idée en quelques mots.'; $('f-idee').focus(); return; }
  if (!formReady) { st.textContent = ''; showFallback(r); return; }
  $('f-send').disabled = true; st.textContent = 'Envoi de la demande…';
  try {
    await send((r.article ? 'Commande boutique' : 'Demande de devis') + ' – ' + r.nom, r);
    $('done-recap').textContent = recap(r); setOrderItem(null);
    $('devis-form').hidden = true; $('devis-done').hidden = false; $('devis-done').focus(); burst($('devis-done')); window.scrollTo(0, 0);
    ['f-occ', 'f-idee', 'f-date'].forEach(i => $(i).value = ''); $('f-qte').value = '1'; st.textContent = '';
  } catch (err) { st.textContent = "La demande n'a pas pu partir. Réessayez, ou utilisez le message ci-dessous."; showFallback(r); }
  finally { $('f-send').disabled = false; }
});
$('devis-again').addEventListener('click', () => { $('devis-done').hidden = true; $('devis-form').hidden = false; $('f-idee').focus(); });

$('pro-go').addEventListener('click', e => { e.preventDefault(); $('pro-form-anchor').scrollIntoView({ behavior: 'smooth' }); setTimeout(() => $('p-company').focus(), 400); });
$('pro-form').addEventListener('submit', async e => {
  e.preventDefault();
  const st = $('p-status');
  if ($('p-bot').checked) return;
  const r = { entreprise: val('p-company'), nom: val('p-name'), email: val('p-email'), telephone: val('p-phone'), besoin: $('p-need').value, siret: val('p-siret'), quantite: val('p-qte'), budget: val('p-budget'), pour: val('p-date'), idee: val('p-idee') };
  if (!r.entreprise) { st.textContent = 'Indiquez le nom de votre entreprise ou structure.'; $('p-company').focus(); return; }
  if (!r.nom) { st.textContent = 'Indiquez votre nom.'; $('p-name').focus(); return; }
  if (!okMail(r.email)) { st.textContent = 'Indiquez une adresse email valide.'; $('p-email').focus(); return; }
  if (r.idee.length < 5) { st.textContent = 'Décrivez votre projet en quelques mots.'; $('p-idee').focus(); return; }
  if (!formReady) { st.textContent = "L'envoi direct n'est pas encore activé : écrivez à b.crea30@gmail.com en reprenant ces informations."; return; }
  $('p-send').disabled = true; st.textContent = 'Envoi de la demande…';
  try {
    await send('Demande professionnelle – ' + r.entreprise, r);
    $('pro-recap').textContent = recap(r);
    $('pro-form').hidden = true; $('pro-done').hidden = false; $('pro-done').focus(); burst($('pro-done')); $('pro-done').scrollIntoView({ block: 'center' });
    ['p-qte', 'p-budget', 'p-date', 'p-idee'].forEach(i => $(i).value = ''); st.textContent = '';
  } catch (err) { st.textContent = "La demande n'a pas pu partir. Réessayez dans un instant, ou écrivez à b.crea30@gmail.com."; }
  finally { $('p-send').disabled = false; }
});
$('pro-again').addEventListener('click', () => { $('pro-done').hidden = true; $('pro-form').hidden = false; $('p-idee').focus(); });

/* ---------- pétales ---------- */
(() => {
  const cv = $('petals'); if (!cv || !cv.getContext) return;
  const ctx = cv.getContext('2d'); let W = 0, H = 0, ps = [], raf = 0, col = '#C2577A';
  const size = () => { const r = cv.getBoundingClientRect(), dp = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = W * dp; cv.height = H * dp; ctx.setTransform(dp, 0, 0, dp, 0, 0); col = getComputedStyle(root).getPropertyValue('--thread').trim() || col; };
  const mk = y => ({ x: Math.random() * W, y: y ?? -20, s: 5 + Math.random() * 7, vy: .25 + Math.random() * .45, vx: -.2 + Math.random() * .4, a: Math.random() * 6.28, va: -.02 + Math.random() * .04, w: Math.random() * 6.28, o: .25 + Math.random() * .35 });
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    ps.forEach(p => {
      p.w += .02; p.x += p.vx + Math.sin(p.w) * .35; p.y += p.vy; p.a += p.va;
      if (p.y > H + 20 || p.x < -30 || p.x > W + 30) Object.assign(p, mk());
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.globalAlpha = p.o; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * .55, 0, 0, 6.283); ctx.fill(); ctx.restore();
    });
    raf = requestAnimationFrame(draw);
  };
  const run = () => { cancelAnimationFrame(raf); if (calm.matches || document.hidden || $('view-home').hidden || document.body.classList.contains('editing')) { ctx.clearRect(0, 0, W, H); return; } raf = requestAnimationFrame(draw); };
  size(); ps = Array.from({ length: W < 600 ? 9 : 16 }, () => mk(Math.random() * H));
  addEventListener('resize', () => { size(); ps.forEach(p => { if (p.x > W) p.x = Math.random() * W; }); });
  document.addEventListener('visibilitychange', run);
  new MutationObserver(run).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  addEventListener('hashchange', () => setTimeout(() => { size(); run(); }, 60));
  new MutationObserver(() => { col = getComputedStyle(root).getPropertyValue('--thread').trim() || col; }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  run();
})();

/* ---------- étiquette qui se balance ---------- */
(() => {
  const tag = document.querySelector('.hero .tag'); if (!tag) return;
  let ang = 0, target = 0, raf = 0;
  const step = () => { ang += (target - ang) * 0.035; tag.style.rotate = ang.toFixed(2) + 'deg'; if (Math.abs(target - ang) < 0.03) { raf = 0; return; } raf = requestAnimationFrame(step); };
  const go = () => { if (calm.matches || $('view-home').hidden || document.body.classList.contains('editing')) return; target = 16 * Math.sin(scrollY / 110); if (!raf) raf = requestAnimationFrame(step); };
  addEventListener('scroll', go, { passive: true });
  tag.addEventListener('pointerenter', () => { target += ang > 0 ? -8 : 8; if (!raf) raf = requestAnimationFrame(step); setTimeout(go, 700); });
})();

/* ---------- textes modifiables ---------- */
const EDIT_ROOTS = '#view-infos,#view-legal article,#view-legal .page-intro,#view-home,#view-creations,#view-une .page-intro,#view-boutique .page-intro,#view-pro,#view-avis .head,#view-devis .where,#view-devis #etapes,footer';
const EDIT_SKIP = '#rv-list,#rv-summary,#gallery,#car-track,#news-home,#news-all,#shop-grid,form,.filters,#categories ul,#home-rating,#announce,.done,#pro-contact,#devis-contact,.carousel,.foot-links,#view-prive';
const EDIT_TAGS = 'h1,h2,h3,p,li,a.btn,.chip,.facts b,.facts span,.place b,.tag b,.pro-points b,.pro-points span,span.foot-copy';
const TX = {};
const toMarkup = n => { const c = n.cloneNode(true); c.querySelectorAll('em,i').forEach(e => e.replaceWith('*' + e.textContent + '*')); c.querySelectorAll('br').forEach(b => b.replaceWith(' ')); return c.textContent.replace(/\s+/g, ' ').trim(); };
const fromMarkup = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/\*([^*]+)\*/g, '<em>$1</em>');
const hashStr = t => { let h = 5381; for (const ch of t) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h.toString(36); };
function initTexts() {
  const seen = {};
  document.querySelectorAll(EDIT_ROOTS).forEach(rootEl => {
    const vid = (rootEl.closest('[id^="view-"]') || { id: 'footer' }).id;
    rootEl.querySelectorAll(EDIT_TAGS).forEach(n => {
      if (n.dataset.k || n.closest(EDIT_SKIP)) return;
      if ([...n.children].some(c => !['EM', 'I', 'BR'].includes(c.tagName))) return;
      const mk = toMarkup(n); if (!mk) return;
      const base = vid + '.' + hashStr(mk); seen[base] = (seen[base] || 0) + 1;
      const k = base + (seen[base] > 1 ? '-' + seen[base] : ''); n.dataset.k = k; TX[k] = { el: n, def: mk };
    });
  });
}
const curText = k => { const v = D.textes && D.textes[k]; return typeof v === 'string' && v.trim() ? v : TX[k].def; };
function applyTexts(skip) { Object.entries(TX).forEach(([k, { el: n }]) => { if (skip && skip(k, n)) return; n.innerHTML = fromMarkup(curText(k)); }); }

/* ---------- démarrage ---------- */
const KEYS = ['site', 'galerie', 'tarifs', 'actus', 'boutique', 'avis'];
const SB = (CFG.supabaseUrl || '').trim().replace(/\/+$/, ''), SBK = (CFG.supabaseAnonKey || '').trim();
const sbReady = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SB) && SBK.length > 30;
const D = {}, DEF = {};
const CAT_DEFAULT = CAT_LISTS.flatMap((ul, i) => [...ul.querySelectorAll('li')].map(li => ({ nom: li.textContent.trim(), rubrique: CAT_KEYS[i], prix: '' })));
async function loadRemote() {
  if (!sbReady) return {};
  try {
    const r = await fetch(SB + '/rest/v1/contenu?select=cle,valeur', { headers: { apikey: SBK }, cache: 'no-store' });
    if (!r.ok) throw 0; const rows = await r.json();
    return Object.fromEntries((rows || []).map(x => [x.cle, x.valeur]));
  } catch (e) { return {}; }
}
function renderAll() {
  S.site = D.site || {}; renderSite();
  renderGallery(D.galerie); renderTarifs(D.tarifs && D.tarifs.length ? D.tarifs : CAT_DEFAULT); renderNews(D.actus); renderShop(D.boutique); renderReviews(D.avis);
  applyTexts(window.BCREA && window.BCREA.skipText);
}
initTexts();
route();
window.BCREA = { $, el, D, DEF, CAT_DEFAULT, TX, renderAll, applyTexts, fromMarkup, curText, route, sb: { url: SB, key: SBK, ready: sbReady }, skipText: null };
Promise.all([loadRemote(), ...KEYS.map(load)]).then(([remote, ...locals]) => {
  KEYS.forEach((k, i) => { DEF[k] = locals[i]; D[k] = remote[k] !== undefined ? remote[k] : locals[i]; });
  D.textes = remote.textes && typeof remote.textes === 'object' ? remote.textes : {};
  renderAll();
  window.BCREA.loaded = true;
  document.dispatchEvent(new CustomEvent('bcrea:ready'));
});
})();
