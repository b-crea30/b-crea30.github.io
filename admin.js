/* B.CREA · espace privé (connexion Supabase, double authentification, modification du site) */
(() => {
'use strict';
const B = window.BCREA; if (!B) return;
const { $, el, D } = B;
const SB = B.sb.url, K = B.sb.key;
const ADMIN = { sess: null, tab: 'textes', factorId: null, edits: {}, editMode: false, confirm: null, step: 'login' };

/* ---------- session ---------- */
const jwt = t => { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch (e) { return {}; } };
function setSess(j) {
  ADMIN.sess = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000, user: j.user || (ADMIN.sess && ADMIN.sess.user) };
  try { sessionStorage.setItem('bcrea-sess', JSON.stringify(ADMIN.sess)); } catch (e) {}
}
function clearSess() { ADMIN.sess = null; try { sessionStorage.removeItem('bcrea-sess'); } catch (e) {} }
try { const raw = sessionStorage.getItem('bcrea-sess'); if (raw) ADMIN.sess = JSON.parse(raw); } catch (e) {}
const aal = () => ADMIN.sess ? jwt(ADMIN.sess.access_token).aal : null;

async function raw(path, opt = {}) {
  const h = { apikey: K, ...(opt.headers || {}) };
  let body = opt.body;
  if (body && !(body instanceof Blob)) { h['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
  if (opt.auth !== false && ADMIN.sess) h.Authorization = 'Bearer ' + ADMIN.sess.access_token;
  const r = await fetch(SB + path, { method: opt.method || 'GET', headers: h, body });
  const txt = await r.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) {}
  if (!r.ok) { const err = new Error((j && (j.msg || j.message || j.error_description || j.error)) || ('Erreur ' + r.status)); err.status = r.status; err.data = j; throw err; }
  return j;
}
async function refresh() {
  const j = await raw('/auth/v1/token?grant_type=refresh_token', { method: 'POST', auth: false, body: { refresh_token: ADMIN.sess.refresh_token } });
  setSess(j);
}
async function api(path, opt = {}) {
  if (ADMIN.sess && Date.now() > ADMIN.sess.expires_at - 60000) { try { await refresh(); } catch (e) { clearSess(); showLogin('login', 'Votre session a expiré : reconnectez-vous.'); throw e; } }
  return raw(path, opt);
}
async function loadUser() { const u = await api('/auth/v1/user'); ADMIN.sess.user = u; setSess({ ...ADMIN.sess, expires_in: Math.round((ADMIN.sess.expires_at - Date.now()) / 1000) }); return u; }
const verifiedTotp = () => ((ADMIN.sess && ADMIN.sess.user && ADMIN.sess.user.factors) || []).filter(f => f.factor_type === 'totp' && f.status === 'verified');

/* ---------- connexion ---------- */
const st = t => { $('lg-st').textContent = t || ''; };
function showLogin(step, msg) {
  ADMIN.step = step;
  $('adm-actions').hidden = true; $('adm-content').hidden = true; $('adm-login').hidden = false;
  $('lg-email-f').hidden = $('lg-pass-f').hidden = !(step === 'login');
  $('lg-code-f').hidden = step !== 'code';
  $('lg-new-f').hidden = step !== 'newpass';
  $('lg-forgot').hidden = step !== 'login';
  $('lg-title').textContent = step === 'code' ? 'Double authentification' : step === 'newpass' ? 'Nouveau mot de passe' : 'Connexion';
  $('lg-send').textContent = step === 'code' ? 'Valider le code' : step === 'newpass' ? 'Enregistrer le mot de passe' : 'Se connecter';
  st(msg || (step === 'code' ? 'Entrez le code à 6 chiffres affiché dans votre application d’authentification.' : ''));
  setTimeout(() => { const f = step === 'code' ? $('lg-code') : step === 'newpass' ? $('lg-new') : $('lg-email'); if (f) f.focus(); }, 50);
}
async function afterPassword() {
  await loadUser();
  const f = verifiedTotp();
  if (f.length && aal() !== 'aal2') { ADMIN.factorId = f[0].id; showLogin('code'); return; }
  openPanel();
}
async function enter() {
  if (!B.sb.ready) { $('adm-login').hidden = false; $('lg-off').hidden = false; $('lg-form').hidden = true; return; }
  if (ADMIN.sess) {
    try { await loadUser(); } catch (e) { clearSess(); showLogin('login'); return; }
    const f = verifiedTotp();
    if (f.length && aal() !== 'aal2') { ADMIN.factorId = f[0].id; showLogin('code'); return; }
    openPanel(); return;
  }
  showLogin('login');
}
$('lg-form').addEventListener('submit', async e => {
  e.preventDefault(); const btn = $('lg-send'); btn.disabled = true;
  try {
    if (ADMIN.step === 'login') {
      const email = $('lg-email').value.trim(), pw = $('lg-pass').value;
      if (!email || !pw) { st('Renseignez votre email et votre mot de passe.'); return; }
      st('Connexion…');
      try { setSess(await raw('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email, password: pw } })); }
      catch (err) { await new Promise(r => setTimeout(r, 500)); st(err.status === 400 || err.status === 401 ? 'Email ou mot de passe incorrect.' : 'Connexion impossible pour le moment. Réessayez.'); return; }
      $('lg-pass').value = '';
      await afterPassword();
    } else if (ADMIN.step === 'code') {
      const code = $('lg-code').value.replace(/\s/g, '');
      if (!/^\d{6}$/.test(code)) { st('Le code contient 6 chiffres.'); return; }
      st('Vérification…');
      try { const ch = await api('/auth/v1/factors/' + ADMIN.factorId + '/challenge', { method: 'POST', body: {} }); setSess(await api('/auth/v1/factors/' + ADMIN.factorId + '/verify', { method: 'POST', body: { challenge_id: ch.id, code } })); }
      catch (err) { st('Code incorrect ou expiré. Réessayez avec le code affiché maintenant.'); return; }
      $('lg-code').value = ''; await loadUser(); openPanel();
    } else if (ADMIN.step === 'newpass') {
      const pw = $('lg-new').value;
      if (pw.length < 8) { st('Le mot de passe doit faire au moins 8 caractères.'); return; }
      st('Enregistrement…');
      try { await api('/auth/v1/user', { method: 'PUT', body: { password: pw } }); } catch (err) { st('Le mot de passe n’a pas pu être changé. Recommencez depuis « Mot de passe oublié ».'); return; }
      $('lg-new').value = ''; await afterPassword();
    }
  } catch (err) { st('Une erreur est survenue. Réessayez.'); }
  finally { btn.disabled = false; }
});
$('lg-forgot').addEventListener('click', async () => {
  const email = $('lg-email').value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { st('Entrez d’abord votre adresse email, puis cliquez à nouveau sur « Mot de passe oublié ».'); $('lg-email').focus(); return; }
  try { await raw('/auth/v1/recover?redirect_to=' + encodeURIComponent(location.origin + location.pathname), { method: 'POST', auth: false, body: { email } }); } catch (e) {}
  st('Si ce compte existe, un email vient de vous être envoyé avec un lien pour choisir un nouveau mot de passe.');
});
function logout() {
  if (ADMIN.editMode) setEditMode(false);
  if (ADMIN.sess) raw('/auth/v1/logout', { method: 'POST' }).catch(() => {});
  clearSess(); location.hash = 'accueil';
}
$('adm-logout').addEventListener('click', logout);

/* lien « mot de passe oublié » reçu par email : #access_token=…&type=recovery */
(() => {
  const h = location.hash.slice(1); if (!h.includes('access_token=')) return;
  const p = new URLSearchParams(h);
  if (p.get('access_token')) {
    setSess({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: +p.get('expires_in') || 3600 });
    history.replaceState(null, '', location.pathname + '#prive');
    ADMIN.recovery = p.get('type') === 'recovery';
    B.route();
  }
})();

/* ---------- panneau ---------- */
const TABS = [['textes', 'Textes du site'], ['site', 'Annonce & contact'], ['actus', 'À la une'], ['boutique', 'Boutique'], ['tarifs', 'Tarifs'], ['galerie', 'Galerie'], ['avis', 'Avis'], ['securite', 'Sécurité']];
try { const t = localStorage.getItem('bcrea-adm-tab'); if (TABS.some(x => x[0] === t)) ADMIN.tab = t; } catch (e) {}
function openPanel() {
  if (!B.loaded) { $('adm-login').hidden = true; document.addEventListener('bcrea:ready', openPanel, { once: true }); return; }
  if (ADMIN.recovery) { ADMIN.recovery = false; showLogin('newpass', 'Choisissez votre nouveau mot de passe (8 caractères minimum).'); return; }
  $('adm-login').hidden = true; $('adm-content').hidden = false; $('adm-actions').hidden = false;
  renderPanel();
}
function renderPanel() {
  $('adm-tabs').replaceChildren(...TABS.map(([k, l]) => el('button', { type: 'button', role: 'tab', class: 'tab', 'aria-selected': ADMIN.tab === k ? 'true' : 'false', text: l, onclick: () => { ADMIN.tab = k; try { localStorage.setItem('bcrea-adm-tab', k); } catch (e) {} ADMIN.confirm = null; renderPanel(); } })));
  const box = $('adm-panels'); box.replaceChildren();
  ({ textes: pTextes, site: pSite, actus: pActus, boutique: pBoutique, tarifs: pTarifs, galerie: pGalerie, avis: pAvis, securite: pSecurite }[ADMIN.tab])(box);
}
const panel = (title, ...kids) => el('div', { class: 'panel' }, el('h3', { text: title }), ...kids);
const hint = t => el('p', { class: 'hint', text: t });
const status = () => el('p', { class: 'hint', 'aria-live': 'polite' });
const field = (label, input) => { const id = input.id || ('f' + Math.random().toString(36).slice(2, 8)); input.id = id; return el('div', { class: 'field' }, el('label', { for: id, text: label }), input); };
const inp = (v, attrs = {}) => { const i = el('input', attrs); i.value = v ?? ''; return i; };
const area = (v, rows = 4, attrs = {}) => { const t = el('textarea', { rows: String(rows), ...attrs }); t.value = v ?? ''; return t; };
const sel = (v, opts) => { const s = el('select', {}, opts.map(([k, l]) => el('option', { value: k, text: l }))); s.value = v ?? opts[0][0]; return s; };

/* ---------- enregistrement ---------- */
async function save(key, value, stEl, okMsg) {
  if (stEl) stEl.textContent = 'Enregistrement…';
  try {
    await api('/rest/v1/contenu', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: { cle: key, valeur: value, maj: new Date().toISOString() } });
    D[key] = value; B.renderAll();
    if (stEl) stEl.textContent = okMsg || 'Enregistré : le site est à jour.';
    return true;
  } catch (err) {
    if (stEl) stEl.textContent = err.status === 401 || err.status === 403 ? 'Modification refusée : reconnectez-vous (et validez le code de double authentification s’il est activé).' : 'L’enregistrement a échoué. Vérifiez votre connexion et réessayez.';
    return false;
  }
}
const PUB = () => SB + '/storage/v1/object/public/photos/';
async function shrink(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const sc = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(r, 'image/jpeg', .86));
  } finally { URL.revokeObjectURL(url); }
}
async function upload(file, folder) {
  const blob = await shrink(file);
  const path = folder + '/' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7) + '.jpg';
  await api('/storage/v1/object/photos/' + path, { method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: blob });
  return PUB() + path;
}
async function dropPhoto(url) { if (typeof url === 'string' && url.startsWith(PUB())) { try { await api('/storage/v1/object/photos/' + url.slice(PUB().length), { method: 'DELETE' }); } catch (e) {} } }

/* ---------- textes (modification directe sur le site) ---------- */
const CE = (() => { const d = document.createElement('div'); try { d.contentEditable = 'plaintext-only'; } catch (e) {} return d.contentEditable === 'plaintext-only' ? 'plaintext-only' : 'true'; })();
function updEditBar() {
  const n = Object.keys(ADMIN.edits).length;
  $('edit-count').textContent = n ? (n === 1 ? '1 modification à enregistrer' : n + ' modifications à enregistrer') : 'Cliquez sur un texte pour le modifier.';
  $('edit-save').disabled = !n; $('edit-quit').textContent = ADMIN.quitArm ? 'Quitter sans enregistrer ?' : 'Quitter';
}
function setEditMode(on) {
  ADMIN.editMode = on; ADMIN.quitArm = false; document.body.classList.toggle('editing', on); $('edit-bar').hidden = !on;
  B.skipText = on ? ((k, n) => document.activeElement === n || k in ADMIN.edits) : null;
  Object.values(B.TX).forEach(({ el: n }) => { if (on) { n.setAttribute('contenteditable', CE); n.spellcheck = true; } else { n.removeAttribute('contenteditable'); n.classList.remove('changed'); } });
  if (!on) { ADMIN.edits = {}; B.applyTexts(); }
  updEditBar();
}
document.addEventListener('focusin', e => {
  if (!ADMIN.editMode) return; const n = e.target.closest && e.target.closest('[data-k]'); if (!n) return;
  const k = n.dataset.k, want = k in ADMIN.edits ? (ADMIN.edits[k] || '') : B.curText(k);
  if (n.textContent !== want) { n.textContent = want; setTimeout(() => { if (document.activeElement !== n) return; const r = document.createRange(); r.selectNodeContents(n); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }, 0); }
});
document.addEventListener('focusout', e => {
  if (!ADMIN.editMode) return; const n = e.target.closest && e.target.closest('[data-k]'); if (!n) return;
  const k = n.dataset.k, v = n.textContent.replace(/\s+/g, ' ').trim();
  if (v === B.curText(k)) delete ADMIN.edits[k]; else ADMIN.edits[k] = v;
  n.classList.toggle('changed', k in ADMIN.edits); n.innerHTML = B.fromMarkup(v || B.TX[k].def); ADMIN.quitArm = false; updEditBar();
});
document.addEventListener('keydown', e => { if (ADMIN.editMode && e.key === 'Enter' && e.target.closest && e.target.closest('[data-k]')) { e.preventDefault(); e.target.blur(); } });
document.addEventListener('click', e => { if (ADMIN.editMode && e.target.closest && e.target.closest('[data-k]') && e.target.closest('a')) e.preventDefault(); }, true);
$('edit-save').addEventListener('click', async () => {
  if (document.activeElement && document.activeElement.closest && document.activeElement.closest('[data-k]')) document.activeElement.blur();
  const texts = { ...(D.textes || {}) };
  Object.entries(ADMIN.edits).forEach(([k, v]) => { if (!v || v === B.TX[k].def) delete texts[k]; else texts[k] = v; });
  $('edit-save').disabled = true;
  const ok = await save('textes', texts, $('edit-count'), 'Textes enregistrés et publiés.');
  if (ok) { ADMIN.edits = {}; document.querySelectorAll('[data-k].changed').forEach(n => n.classList.remove('changed')); B.applyTexts(B.skipText); } else $('edit-save').disabled = false;
});
$('edit-quit').addEventListener('click', () => { if (Object.keys(ADMIN.edits).length && !ADMIN.quitArm) { ADMIN.quitArm = true; updEditBar(); return; } setEditMode(false); location.hash = 'prive'; });
function pTextes(box) {
  const s1 = status();
  box.append(el('div', { class: 'adm-cols' },
    panel('Modifier les textes du site',
      el('p', { text: 'Cliquez sur le bouton : vous naviguez sur le site et cliquez directement sur un titre, un paragraphe ou un bouton pour le réécrire, puis vous enregistrez.' }),
      hint('Astuce : mettez un mot entre *astérisques* pour l’écrire en italique rose. Videz un texte pour retrouver sa version d’origine.'),
      el('div', { class: 'tools' }, el('button', { type: 'button', class: 'btn solid small-btn', text: 'Modifier les textes du site', onclick: () => { setEditMode(true); location.hash = 'accueil'; } }))),
    panel('Revenir aux textes d’origine',
      hint('Annule toutes les modifications de textes faites depuis l’espace privé.'),
      el('div', { class: 'tools' }, ...confirmBtn('reset-textes', 'Rétablir tous les textes d’origine', () => save('textes', {}, s1, 'Textes d’origine rétablis.'))), s1)));
}
function confirmBtn(key, label, action) {
  if (ADMIN.confirm === key) return [
    el('button', { type: 'button', class: 'link-btn danger', text: 'Confirmer', onclick: async () => { ADMIN.confirm = null; await action(); renderPanel(); } }),
    el('button', { type: 'button', class: 'link-btn muted', text: 'Annuler', onclick: () => { ADMIN.confirm = null; renderPanel(); } })];
  return [el('button', { type: 'button', class: 'link-btn danger', text: label, onclick: () => { ADMIN.confirm = key; renderPanel(); } })];
}

/* ---------- annonce & contact ---------- */
function pSite(box) {
  const s = { annonce: '', email: '', telephone: '', ...(D.site || {}) };
  const a = area(s.annonce, 2, { maxlength: '160' }), em = inp(s.email, { type: 'email', maxlength: '120' }), ph = inp(s.telephone, { maxlength: '30' }), stt = status();
  box.append(el('div', { class: 'adm-cols' },
    panel('Annonce en haut du site', hint('Par exemple : « Commandes de Noël ouvertes jusqu’au 10 décembre ». Laissez vide pour ne rien afficher.'), field('Annonce', a)),
    panel('Coordonnées affichées', field('Email', em), field('Téléphone (facultatif)', ph)),
    el('div', { class: 'tools' }, el('button', { type: 'button', class: 'btn solid small-btn', text: 'Enregistrer', onclick: () => save('site', { ...s, annonce: a.value.trim(), email: em.value.trim(), telephone: ph.value.trim() }, stt) }), stt)));
}

/* ---------- listes génériques (À la une, boutique, galerie, avis) ---------- */
function listEditor(box, cfg) {
  const items = (Array.isArray(D[cfg.key]) ? D[cfg.key] : []).map(x => ({ ...x }));
  const stt = status();
  const commit = (list, msg) => save(cfg.key, list, stt, msg).then(ok => { if (ok) renderPanel(); });
  const rows = items.map((it, i) => {
    const thumb = cfg.thumb(it);
    return el('div', { class: 'ed-row' }, thumb ? el('img', { src: thumb, alt: '' }) : el('span', { class: 'ph', text: 'B' }),
      el('div', { style: 'min-width:0' }, el('b', { text: cfg.title(it) || 'Sans titre' }), el('small', { text: cfg.meta(it) })),
      el('div', { class: 'tools' },
        cfg.extra ? cfg.extra(it, i, items, commit) : null,
        el('button', { type: 'button', class: 'link-btn', text: 'Modifier', onclick: () => { ADMIN.editing = { key: cfg.key, i }; renderPanel(); } }),
        i > 0 ? el('button', { type: 'button', class: 'link-btn muted', text: '↑ Monter', onclick: () => { const l = [...items];[l[i - 1], l[i]] = [l[i], l[i - 1]]; commit(l, 'Ordre mis à jour.'); } }) : null,
        ...confirmBtn(cfg.key + ':' + i, 'Supprimer', async () => { const l = items.filter((_, j) => j !== i); if (await save(cfg.key, l, stt, 'Supprimé.')) for (const u of cfg.photos(it)) await dropPhoto(u); })));
  });
  const editing = ADMIN.editing && ADMIN.editing.key === cfg.key ? ADMIN.editing.i : null;
  const cur = editing != null && items[editing] ? items[editing] : cfg.blank();
  const form = cfg.form(cur);
  const photos = cfg.maxPhotos ? photoPicker(cfg.photos(cur), cfg.maxPhotos) : null;
  const fst = status();
  const submit = el('button', { type: 'button', class: 'btn solid small-btn', text: editing != null ? 'Enregistrer' : cfg.addLabel, onclick: async () => {
    const data = form.read(); const err = cfg.check(data) || (cfg.requirePhoto && photos && !photos.count() ? cfg.requirePhoto : ''); if (err) { fst.textContent = err; return; }
    submit.disabled = true;
    try {
      let urls = [];
      if (photos) { urls = await photos.finish(cfg.folder, fst); cfg.setPhotos(data, urls); }
      const l = [...items]; if (editing != null) l[editing] = data; else l.unshift(data);
      if (await save(cfg.key, l, fst, editing != null ? 'Modifications enregistrées.' : 'Ajouté au site.')) {
        if (photos) for (const u of photos.removed()) await dropPhoto(u);
        ADMIN.editing = null; renderPanel();
      }
    } catch (e) { fst.textContent = 'L’envoi de la photo a échoué. Essayez avec un JPG ou un PNG.'; }
    finally { submit.disabled = false; }
  } });
  box.append(el('div', { class: 'adm-cols' },
    panel(cfg.label, hint(cfg.help), el('div', { class: 'ed-list' }, ...(rows.length ? rows : [hint(cfg.empty)])), stt),
    panel(editing != null ? 'Modifier' : cfg.addTitle, ...form.nodes, photos ? photos.node : null,
      el('div', { class: 'tools' }, submit, editing != null ? el('button', { type: 'button', class: 'btn small-btn', text: 'Annuler', onclick: () => { ADMIN.editing = null; renderPanel(); } }) : null), fst)));
}
function photoPicker(initial, max) {
  let keep = [...initial], files = [];
  const list = el('div', { class: 'ed-photos' }), inputEl = el('input', { type: 'file', class: 'sr', accept: 'image/jpeg,image/png,image/webp', multiple: max > 1 ? true : null });
  const id = 'pp' + Math.random().toString(36).slice(2, 7); inputEl.id = id;
  const draw = () => list.replaceChildren(
    ...keep.map((u, i) => el('span', {}, el('img', { src: u, alt: '' }), el('button', { type: 'button', 'aria-label': 'Retirer la photo', text: '×', onclick: () => { keep.splice(i, 1); draw(); } }))),
    ...files.map((f, i) => el('span', {}, el('img', { src: f.preview, alt: '' }), el('button', { type: 'button', 'aria-label': 'Retirer la photo', text: '×', onclick: () => { URL.revokeObjectURL(f.preview); files.splice(i, 1); draw(); } }))));
  inputEl.addEventListener('change', () => {
    for (const f of inputEl.files) { if (!/^image\/(jpeg|png|webp)$/.test(f.type)) continue; if (max === 1) { keep = []; files = []; } if (keep.length + files.length >= max) break; f.preview = URL.createObjectURL(f); files.push(f); }
    inputEl.value = ''; draw();
  });
  draw();
  return {
    node: el('div', { class: 'field' }, el('span', { class: 'flabel', text: max > 1 ? 'Photos (' + max + ' maximum)' : 'Photo' }), el('label', { class: 'drop', for: id, text: max > 1 ? 'Ajouter des photos' : 'Choisir une photo' }), inputEl, list),
    async finish(folder, stEl) { const out = [...keep]; for (const [i, f] of files.entries()) { stEl.textContent = 'Envoi de la photo ' + (i + 1) + ' sur ' + files.length + '…'; out.push(await upload(f, folder)); } return out; },
    removed() { return initial.filter(u => !keep.includes(u)); },
    count() { return keep.length + files.length; }
  };
}
function formOf(defs) {
  const nodes = [], getters = {};
  defs.forEach(d => {
    let input;
    if (d.type === 'select') input = sel(d.value, d.opts);
    else if (d.type === 'area') input = area(d.value, d.rows || 4, { maxlength: d.max || '1200' });
    else input = inp(d.value, { type: d.type || 'text', maxlength: d.max || null, min: d.min ?? null, placeholder: d.ph || null, inputmode: d.mode || null });
    nodes.push(field(d.label, input)); getters[d.name] = () => input.value.trim();
  });
  return { nodes, read: () => Object.fromEntries(Object.entries(getters).map(([k, g]) => [k, g()])) };
}
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const fd = d => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? (+m[3]) + ' ' + MOIS[+m[2] - 1] + ' ' + m[1] : ''; };

function pActus(box) {
  listEditor(box, {
    key: 'actus', label: 'À la une', addTitle: 'Ajouter', addLabel: 'Publier', folder: 'actus', maxPhotos: 1,
    help: 'Articles du moment et événements (marchés, salons…). Les événements passés disparaissent du site automatiquement.',
    empty: 'Rien à la une pour le moment.',
    title: it => it.titre, meta: it => (it.type === 'evenement' ? 'Événement · ' + (fd(it.date) || 'sans date') : 'Article du moment'),
    thumb: it => it.photo, photos: it => it.photo ? [it.photo] : [], setPhotos: (d, u) => { d.photo = u[0] || ''; },
    blank: () => ({ type: 'evenement', titre: '', date: '', lieu: '', texte: '', photo: '' }),
    form: it => formOf([
      { name: 'type', label: 'Type', type: 'select', value: it.type, opts: [['evenement', 'Événement (marché, salon…)'], ['article', 'Article du moment']] },
      { name: 'titre', label: 'Titre *', value: it.titre, max: '80' },
      { name: 'date', label: 'Date (pour un événement)', type: 'date', value: it.date },
      { name: 'lieu', label: 'Lieu et horaires', value: it.lieu, max: '100' },
      { name: 'texte', label: 'Description', type: 'area', value: it.texte }]),
    check: d => !d.titre ? 'Indiquez un titre.' : d.type === 'evenement' && !d.date ? 'Indiquez la date de l’événement.' : ''
  });
}
function pBoutique(box) {
  listEditor(box, {
    key: 'boutique', label: 'Boutique', addTitle: 'Ajouter un article', addLabel: 'Ajouter à la boutique', folder: 'boutique', maxPhotos: 4,
    help: 'Créations prêtes à offrir. À 0, l’article s’affiche « Rupture de stock ». Sans prix, « Sur devis » s’affiche.',
    empty: 'La boutique est vide pour le moment.',
    title: it => it.nom, meta: it => ((+it.stock || 0) === 0 ? 'Rupture de stock' : (+it.stock) + ' en stock') + (it.prix ? ' · ' + it.prix : ' · sur devis'),
    thumb: it => (it.photos || [])[0], photos: it => it.photos || [], setPhotos: (d, u) => { d.photos = u; },
    blank: () => ({ nom: '', prix: '', stock: 1, description: '', photos: [] }),
    form: it => { const f = formOf([
      { name: 'nom', label: 'Nom de l’article *', value: it.nom, max: '80' },
      { name: 'prix', label: 'Prix (vide = sur devis)', value: it.prix, max: '20', ph: 'Ex. : 12 €' },
      { name: 'stock', label: 'Stock *', type: 'number', value: it.stock ?? 1, min: '0', mode: 'numeric' },
      { name: 'description', label: 'Description', type: 'area', value: it.description }]);
      const r = f.read; f.read = () => { const d = r(); d.stock = Math.max(0, Math.floor(+d.stock || 0)); return d; }; return f; },
    check: d => !d.nom ? 'Indiquez le nom de l’article.' : '',
    extra: (it, i, items, commit) => { const n = Math.max(0, Math.floor(+it.stock || 0)); const set = v => { const l = items.map(x => ({ ...x })); l[i].stock = v; commit(l, 'Stock mis à jour.'); };
      return el('span', { class: 'stepper' }, el('button', { type: 'button', 'aria-label': 'Retirer un du stock', text: '−', disabled: n === 0 ? true : null, onclick: () => set(n - 1) }), el('output', { text: String(n) }), el('button', { type: 'button', 'aria-label': 'Ajouter un au stock', text: '+', onclick: () => set(n + 1) })); }
  });
}
function pGalerie(box) {
  const CATS = [['mariage', 'Mariage'], ['fetes', 'Fêtes & famille'], ['objets', 'Objets perso'], ['coffrets', 'Paniers & coffrets'], ['octobre', 'Octobre rose']];
  listEditor(box, {
    key: 'galerie', label: 'Réalisations', addTitle: 'Ajouter une photo', addLabel: 'Ajouter à la galerie', folder: 'galerie', maxPhotos: 1,
    help: 'Les 8 premières photos défilent aussi dans le carrousel de l’accueil. Utilisez « Monter » pour changer l’ordre.',
    empty: 'Aucune photo pour le moment.',
    title: it => it.titre, meta: it => (CATS.find(c => c[0] === it.categorie) || ['', 'Objets perso'])[1],
    thumb: it => it.image, photos: it => it.image ? [it.image] : [], setPhotos: (d, u) => { d.image = u[0] || ''; },
    blank: () => ({ image: '', titre: '', categorie: 'objets' }),
    form: it => formOf([{ name: 'titre', label: 'Légende', value: it.titre, max: '60' }, { name: 'categorie', label: 'Catégorie', type: 'select', value: it.categorie, opts: CATS }]),
    check: () => '', requirePhoto: 'Choisissez une photo.'
  });
}
function pAvis(box) {
  listEditor(box, {
    key: 'avis', label: 'Avis clients', addTitle: 'Ajouter un avis reçu', addLabel: 'Publier l’avis', folder: '', maxPhotos: 0,
    help: 'N’ajoutez que de vrais avis reçus (Facebook, email, message…), avec l’accord de la personne. Vous pouvez y ajouter votre réponse.',
    empty: 'Aucun avis pour le moment.',
    title: it => (it.prenom || 'Client') + ' · ' + '★'.repeat(+it.note || 0), meta: it => it.date || '',
    thumb: () => null, photos: () => [], setPhotos: () => {},
    blank: () => ({ prenom: '', note: '5', date: '', texte: '', reponse: '' }),
    form: it => { const f = formOf([
      { name: 'prenom', label: 'Prénom *', value: it.prenom, max: '40' },
      { name: 'note', label: 'Note', type: 'select', value: String(it.note || 5), opts: [['5', '★★★★★ (5)'], ['4', '★★★★ (4)'], ['3', '★★★ (3)'], ['2', '★★ (2)'], ['1', '★ (1)']] },
      { name: 'date', label: 'Date', value: it.date, max: '30', ph: 'Ex. : novembre 2026' },
      { name: 'texte', label: 'Avis *', type: 'area', value: it.texte },
      { name: 'reponse', label: 'Votre réponse (facultatif)', type: 'area', value: it.reponse, rows: 3 }]);
      const r = f.read; f.read = () => { const d = r(); d.note = +d.note; return d; }; return f; },
    check: d => !d.prenom ? 'Indiquez le prénom.' : d.texte.length < 3 ? 'Recopiez l’avis.' : ''
  });
}

/* ---------- tarifs ---------- */
function pTarifs(box) {
  let list = ((Array.isArray(D.tarifs) && D.tarifs.length) ? D.tarifs : B.CAT_DEFAULT).map(x => ({ ...x }));
  const ed = el('div', { class: 'cat-ed' }), stt = status();
  const draw = () => ed.replaceChildren(el('div', { class: 'cat-row line head' }, el('span', { text: 'Création' }), el('span', { text: 'Rubrique' }), el('span', { text: 'Prix' }), el('span')),
    ...list.map((c, i) => {
      const n = inp(c.nom, { 'aria-label': 'Nom', maxlength: '60' }); n.addEventListener('input', () => c.nom = n.value);
      const k = sel(c.rubrique || 'objets', [['objets', 'Objets du quotidien'], ['fetes', 'Fêtes & événements']]); k.addEventListener('change', () => c.rubrique = k.value);
      const p = inp(c.prix, { 'aria-label': 'Prix', maxlength: '24', placeholder: 'Sur devis' }); p.addEventListener('input', () => c.prix = p.value);
      return el('div', { class: 'cat-row' }, n, k, p, el('button', { type: 'button', class: 'icon-x', 'aria-label': 'Supprimer la ligne', text: '×', onclick: () => { list.splice(i, 1); draw(); } }));
    }));
  draw();
  box.append(el('div', { class: 'adm-cols' }, panel('Tarifs et options',
    hint('Cette liste apparaît sur la page Créations et dans le choix « Support » du formulaire de devis. Sans prix, « Sur devis » s’affiche.'), ed,
    el('div', { class: 'tools' },
      el('button', { type: 'button', class: 'btn small-btn', text: 'Ajouter une ligne', onclick: () => { list.push({ nom: '', rubrique: 'objets', prix: '' }); draw(); const ins = ed.querySelectorAll('.cat-row:last-child input'); if (ins[0]) ins[0].focus(); } }),
      el('button', { type: 'button', class: 'btn solid small-btn', text: 'Enregistrer les tarifs', onclick: () => save('tarifs', list.map(c => ({ nom: (c.nom || '').trim(), rubrique: c.rubrique === 'fetes' ? 'fetes' : 'objets', prix: (c.prix || '').trim() })).filter(c => c.nom), stt, 'Tarifs publiés sur le site.') })), stt)));
}

/* ---------- sécurité ---------- */
function pSecurite(box) {
  const stt = status(), f = verifiedTotp();
  const mfa = panel('Double authentification',
    el('p', { text: f.length ? 'Activée : un code à 6 chiffres vous est demandé à chaque connexion.' : 'Désactivée. Activez-la pour qu’un code à 6 chiffres, affiché sur votre téléphone, soit demandé en plus du mot de passe.' }),
    hint('Il vous faut une application d’authentification sur votre téléphone : Google Authenticator, Microsoft Authenticator ou l’application Mots de passe de l’iPhone.'));
  const zone = el('div', { class: 'stack' });
  if (!f.length) zone.append(el('div', { class: 'tools' }, el('button', { type: 'button', class: 'btn solid small-btn', text: 'Activer la double authentification', onclick: () => enroll(zone, stt) })));
  else zone.append(el('div', { class: 'tools' }, ...confirmBtn('mfa-off', 'Désactiver la double authentification', async () => { try { await api('/auth/v1/factors/' + f[0].id, { method: 'DELETE' }); await loadUser(); stt.textContent = 'Double authentification désactivée.'; } catch (e) { stt.textContent = 'Impossible de la désactiver maintenant : reconnectez-vous puis réessayez.'; } })));
  mfa.append(zone, stt);
  const p1 = inp('', { type: 'password', autocomplete: 'new-password' }), p2 = inp('', { type: 'password', autocomplete: 'new-password' }), pst = status();
  const pw = panel('Changer de mot de passe', field('Nouveau mot de passe (8 caractères minimum)', p1), field('Confirmer', p2),
    el('div', { class: 'tools' }, el('button', { type: 'button', class: 'btn solid small-btn', text: 'Changer le mot de passe', onclick: async () => {
      if (p1.value.length < 8) { pst.textContent = 'Au moins 8 caractères.'; return; } if (p1.value !== p2.value) { pst.textContent = 'Les deux mots de passe sont différents.'; return; }
      pst.textContent = 'Enregistrement…'; try { await api('/auth/v1/user', { method: 'PUT', body: { password: p1.value } }); p1.value = p2.value = ''; pst.textContent = 'Mot de passe changé.'; } catch (e) { pst.textContent = 'Le changement a échoué : reconnectez-vous puis réessayez.'; } } })), pst);
  const who = panel('Compte', el('p', { text: 'Connectée en tant que ' + ((ADMIN.sess && ADMIN.sess.user && ADMIN.sess.user.email) || '…') }));
  box.append(el('div', { class: 'adm-cols' }, mfa, pw, who));
}
async function enroll(zone, stt) {
  stt.textContent = 'Préparation…';
  try {
    for (const old of ((ADMIN.sess.user.factors) || []).filter(x => x.status !== 'verified')) { try { await api('/auth/v1/factors/' + old.id, { method: 'DELETE' }); } catch (e) {} }
    const r = await api('/auth/v1/factors', { method: 'POST', body: { factor_type: 'totp', friendly_name: 'B.CREA ' + new Date().toISOString().slice(0, 10) } });
    const code = inp('', { inputmode: 'numeric', maxlength: '6', autocomplete: 'one-time-code' });
    zone.replaceChildren(
      el('p', { text: '1. Dans votre application d’authentification, ajoutez un compte en scannant ce QR code :' }),
      el('img', { src: r.totp.qr_code, alt: 'QR code de double authentification', style: 'width:200px;height:200px;background:#fff;border-radius:12px;padding:8px' }),
      hint('Ou saisissez cette clé à la main : ' + r.totp.secret),
      field('2. Entrez le code à 6 chiffres affiché par l’application', code),
      el('div', { class: 'tools' }, el('button', { type: 'button', class: 'btn solid small-btn', text: 'Valider', onclick: async () => {
        const c = code.value.replace(/\s/g, ''); if (!/^\d{6}$/.test(c)) { stt.textContent = 'Le code contient 6 chiffres.'; return; }
        try { const ch = await api('/auth/v1/factors/' + r.id + '/challenge', { method: 'POST', body: {} }); setSess(await api('/auth/v1/factors/' + r.id + '/verify', { method: 'POST', body: { challenge_id: ch.id, code: c } })); await loadUser(); stt.textContent = 'Double authentification activée.'; renderPanel(); }
        catch (e) { stt.textContent = 'Code incorrect. Réessayez avec le code affiché maintenant.'; } } })));
    stt.textContent = '';
  } catch (e) { stt.textContent = 'Activation impossible pour le moment. Réessayez.'; }
}

/* ---------- entrée dans l'espace privé ---------- */
document.addEventListener('bcrea:view', e => { if (e.detail === 'prive') enter(); });
if (location.hash === '#prive') enter();
})();
