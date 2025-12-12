// Pig Farm Static Prototype - JS (Dummy Data + Renderers)
// Build dashboard metrics from module data
function buildMetrics(){
  const { AnimalsModule, FeedModule } = window.Modules;
  const expecting = AnimalsModule.sows.filter(s=>s.status==='Expecting').length;
  const nursing = AnimalsModule.sows.filter(s=>s.status==='Nursing').length;
  const totalPigs = (AnimalsModule.sows.length + AnimalsModule.boars.length + (AnimalsModule.piglets||0));
  // compute piglet gender counts from litters piglets
  let malePiglets = 0, femalePiglets = 0;
  (AnimalsModule.litters||[]).forEach(L=> (L.piglets||[]).forEach(p=>{ if((p.gender||'').toLowerCase().startsWith('m')) malePiglets++; else if((p.gender||'').toLowerCase().startsWith('f')) femalePiglets++; }));
  return [
    { label: 'Total pigs', value: totalPigs },
    { label: 'Total piglets', value: AnimalsModule.piglets || 0 },
    { label: 'Male piglets', value: malePiglets },
    { label: 'Female piglets', value: femalePiglets },
    { label: 'Expecting sows', value: expecting },
    { label: 'Litters nursing', value: nursing },
    { label: 'Feed used (month kg)', value: FeedModule.inventory.reduce((a,b)=>a+ (b.percent||0),0) }
  ];
}

function select(q){ return document.querySelector(q); }
function el(tag, cls){ const e=document.createElement(tag); if(cls) e.className=cls; return e; }

function renderTiles(container, items){
  container.innerHTML = '';
  items.forEach(m => {
    const card = el('div','card pad tile');
    const label = el('div','label'); label.textContent = m.label;
    const value = el('div','value'); value.textContent = m.value;
    card.append(label,value);
    container.append(card);
  });
}

function renderAlerts(container, items){
  container.innerHTML = '';
  items.forEach(a => {
    const it = el('div','item');
    const dot = el('span','dot');
    dot.style.background = a.type==='ok'?'#22c55e':a.type==='warn'?'#f59e0b':'#ef4444';
    dot.style.width= '10px'; dot.style.height='10px'; dot.style.borderRadius='999px';
    const text = el('div'); text.textContent = a.text;
    it.append(dot,text);
    container.append(it);
  });
}

function wireActiveNav(){
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a').forEach(a=>{
    if(a.getAttribute('href')===path || (path==='index.html' && a.getAttribute('href')==='./')) a.classList.add('active');
  });
}

function setupMenuToggle(){
  const btn = document.getElementById('menuBtn');
  const header = document.querySelector('.header');
  if(!btn || !header) return;
  // Build nav dynamically so we can inject theme toggle and keep menu consistent
  function buildNav(){
    const links = [
      { href:'./', label:'Dashboard' },
      { href:'pigs.html', label:'Pigs' },
      { href:'sows.html', label:'Sows' },
      { href:'boars.html', label:'Boars' },
      { href:'litters.html', label:'Litters' },
      { href:'feed.html', label:'Feed' },
      { href:'events.html', label:'Events' },
      { href:'health.html', label:'Health' },
      { href:'reports.html', label:'Reports' },
      { href:'add-pig.html', label:'Add Pig' }
    ];
    const nav = document.querySelector('.nav-links'); if(!nav) return;
    nav.innerHTML = '';
    links.forEach(l=>{ const a=document.createElement('a'); a.href=l.href; a.textContent = l.label; nav.appendChild(a); });
    // inject theme toggle into nav as last item
    const themeWrap = document.createElement('div'); themeWrap.style.marginLeft='8px'; const tbtn = document.createElement('button'); tbtn.id='themeToggle'; tbtn.className='btn'; tbtn.textContent = document.documentElement.classList.contains('light-theme')? 'Light' : 'Dark'; themeWrap.appendChild(tbtn); nav.appendChild(themeWrap);
  }
  buildNav();
  btn.addEventListener('click', (e)=>{
    e.stopPropagation();
    header.classList.toggle('open');
  });
  document.addEventListener('click', (e)=>{
    if(header.classList.contains('open') && !header.contains(e.target)) header.classList.remove('open');
  });
}

function setupBackButtons(){
  document.querySelectorAll('.back-btn').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      if(window.history.length>1) window.history.back(); else window.location.href = './';
    });
  });
}

function setupThemeToggle(){
  const root = document.documentElement;
  const saved = localStorage.getItem('pf_theme');
  if(saved==='light') root.classList.add('light-theme');
  // theme toggle button may be created dynamically inside buildNav
  const btn = document.getElementById('themeToggle');
  if(!btn) return;
  btn.addEventListener('click', ()=>{
    const isLight = root.classList.toggle('light-theme');
    localStorage.setItem('pf_theme', isLight? 'light':'dark');
    btn.textContent = isLight? 'Light' : 'Dark';
  });
  btn.textContent = root.classList.contains('light-theme')? 'Light' : 'Dark';
}

/* Export UI and helper functions
   - Adds an Export button to the header that opens a modal allowing the user to choose dataset, date range, columns and format (CSV/XLSX placeholder).
   - Exports are generated client-side from window.Modules data for demo (CSV). */
function setupExportUI(){
  // create button in nav
  const nav = document.querySelector('.nav-links'); if(!nav) return;
  const wrap = document.createElement('div'); wrap.style.marginLeft='8px';
  const btn = document.createElement('button'); btn.id='exportBtn'; btn.className='btn'; btn.textContent='Export';
  wrap.appendChild(btn); nav.appendChild(wrap);

  // modal creation
  function makeModal(){
    // find existing modal in page or create one
    let m = document.getElementById('pfExportModal');
    if(!m){
      m = document.createElement('div'); m.id='pfExportModal'; m.className='card'; m.style.position='fixed'; m.style.left='50%'; m.style.top='50%'; m.style.transform='translate(-50%,-50%)'; m.style.zIndex='99999'; m.style.minWidth='360px'; m.style.padding='18px'; m.style.display='none';
      m.innerHTML = `
      <h3 style="margin:0 0 8px 0">Export data</h3>
      <div style="display:grid;gap:8px">
        <label>Dataset
          <select id="exportDataset" class="input">
            <option value="animals">Animals</option>
            <option value="events">Events</option>
            <option value="breeding">Breeding</option>
            <option value="litters">Litters</option>
          </select>
        </label>
        <label>Start date<input id="exportStart" type="date" class="input"/></label>
        <label>End date<input id="exportEnd" type="date" class="input"/></label>
        <label>Format<select id="exportFormat" class="input"><option value="csv">CSV</option><option value="xlsx">XLSX (not implemented)</option></select></label>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px">
          <button id="exportPreviewBtn" class="btn">Preview</button>
          <button id="exportDownloadBtn" class="btn primary">Download</button>
          <button id="exportCloseBtn" class="btn">Close</button>
        </div>
        <div id="exportPreviewArea" style="margin-top:8px;max-height:220px;overflow:auto;font-size:13px;background:#0f0f12;border:1px solid var(--border);padding:8px;border-radius:8px"></div>
      </div>
    `;
      document.body.appendChild(m);
    }
    // wire buttons (override onclick to avoid duplicate listeners)
    const closeBtn = m.querySelector('#exportCloseBtn'); if(closeBtn) closeBtn.onclick = ()=> m.style.display='none';
    const previewBtn = m.querySelector('#exportPreviewBtn'); if(previewBtn) previewBtn.onclick = ()=> previewExport();
    const downloadBtn = m.querySelector('#exportDownloadBtn'); if(downloadBtn) downloadBtn.onclick = ()=> downloadExport();
  }

  function openModal(){ makeModal(); const m=document.getElementById('pfExportModal'); m.style.display='block'; }
  btn.addEventListener('click', openModal);
  // expose a global helper so pages (e.g., reports.html) can open the modal
  window.openExportModal = openModal;

  // helper: collect rows from window.Modules based on dataset and date range
  function getExportRows(dataset, startDate, endDate){
    // Prefer runtime Modules, but if it's not present (e.g. early page load or different bundle order)
    // fall back to reading localStorage keys produced by the app (pf_animals, pf_events, pf_breeding, pf_litters).
    let AnimalsModule = (window.Modules && window.Modules.AnimalsModule) || null;
    let EventsModule = (window.Modules && window.Modules.EventsModule) || null;
    const rows = [];
    if(!AnimalsModule){
      try{
        const raw = localStorage.getItem('pf_animals');
        if(raw){
          const parsed = JSON.parse(raw);
          // parsed might be an array of animals or an object with sows/boars
          if(Array.isArray(parsed)) AnimalsModule = { sows: parsed, boars: [], litters: [], breeding: [] };
          else AnimalsModule = parsed;
        }
      }catch(e){ console.warn('Failed to parse pf_animals from localStorage', e); }
    }
    if(!EventsModule){
      try{
        const raw = localStorage.getItem('pf_events');
        if(raw){
          const parsed = JSON.parse(raw);
          EventsModule = { events: Array.isArray(parsed) ? parsed : (parsed && parsed.events) || [] };
        }
      }catch(e){ console.warn('Failed to parse pf_events from localStorage', e); }
    }
    const start = startDate? new Date(startDate) : null; const end = endDate? new Date(endDate) : null;
    function inRange(d){ if(!d) return true; const dt = new Date(d); if(start && dt < start) return false; if(end && dt > end) return false; return true; }
    if(dataset==='animals'){
      const sows = (AnimalsModule && (AnimalsModule.sows||[])) || [];
      const boars = (AnimalsModule && (AnimalsModule.boars||[])) || [];
      const all = sows.concat(boars);
      all.forEach(a=>{ if(inRange(a.entryDate || a.created_at || a.dob)) rows.push(a); });
    }else if(dataset==='events'){
      (EventsModule && (EventsModule.events||[])).forEach(e=>{ if(inRange(e.date || e.created_at || e.eventDate)) rows.push(e); });
    }else if(dataset==='breeding'){
      ((AnimalsModule && (AnimalsModule.breeding||[]))||[]).forEach(b=>{ if(inRange(b.dateServed || b.expectedFarrowing || b.date)) rows.push(b); });
    }else if(dataset==='litters'){
      ((AnimalsModule && (AnimalsModule.litters||[]))||[]).forEach(l=>{ if(inRange(l.farrowing_date || l.date)) rows.push(l); });
    }
    return rows;
  }

  // Try to pull rows from Supabase if the client exists (returns null if supabase not available)
  async function fetchRowsFromSupabase(dataset, startDate, endDate){
    if(!window.supabase){
      // if supabase keys are present we may be waiting for the UMD bootstrap to finish — wait briefly
      if(window.__SUPABASE_URL){
        const waitUntil = Date.now() + 1500;
        while(!window.supabase && Date.now() < waitUntil) await new Promise(r=>setTimeout(r,200));
      }
    }
    if(!window.supabase) return null;
    // map dataset to table name (assumes these tables exist in Supabase)
    const tableMap = { animals: 'animals', events: 'events', breeding: 'breeding', litters: 'litters' };
    const table = tableMap[dataset] || dataset;
    try{
      const { data, error } = await window.supabase.from(table).select('*');
      if(error) throw error;
      const rows = data || [];
      // filter in JS by common date fields (to avoid complex SQL OR queries here)
      const start = startDate? new Date(startDate) : null; const end = endDate? new Date(endDate) : null;
      function rowInRange(r){
        const candidates = ['entryDate','created_at','dob','date','eventDate','dateServed','expectedFarrowing','farrowing_date'];
        for(const k of candidates){ if(r[k]){ const dt = new Date(r[k]); if(start && dt < start) return false; if(end && dt > end) return false; return true; } }
        return true; // no date fields -> include
      }
      return rows.filter(rowInRange);
    }catch(err){ console.warn('Supabase export query failed', err); throw err; }
  }

  // preview: show first 20 rows as JSON table
  async function previewExport(){
    const ds = document.getElementById('exportDataset').value;
    const s = document.getElementById('exportStart').value;
    const e = document.getElementById('exportEnd').value;
    const area = document.getElementById('exportPreviewArea');
    try{
      let rows = null;
      if(window.supabase){
        try{ rows = await fetchRowsFromSupabase(ds,s,e); }
        catch(err){ console.warn('Supabase preview failed, falling back to local', err); rows = null; }
      }
      if(!rows) rows = getExportRows(ds,s,e);
      if(!rows || rows.length===0){ area.textContent = 'No rows matched that selection.'; return; }
      area.innerHTML = '<pre style="white-space:pre-wrap;">'+ JSON.stringify(rows.slice(0,20), null, 2) +'</pre>';
    }catch(err){ area.textContent = 'Preview failed: '+ (err && err.message ? err.message : String(err)); }
  }

  // generate CSV from array of objects and selected columns (use union of keys)
  function generateCSV(rows){
    if(!rows || rows.length===0) return '';
    const keys = Array.from(rows.reduce((set,r)=>{ Object.keys(r||{}).forEach(k=>set.add(k)); return set; }, new Set()));
    const esc = v => '"'+ String(v===null||v===undefined?'':v).replace(/"/g,'""') +'"';
    const lines = [keys.map(esc).join(',')];
    rows.forEach(r=> lines.push(keys.map(k=> esc(r[k])).join(',')));
    return lines.join('\n');
  }

  async function downloadExport(){
    const ds = document.getElementById('exportDataset').value;
    const s = document.getElementById('exportStart').value;
    const e = document.getElementById('exportEnd').value;
    const fmt = document.getElementById('exportFormat').value;
    let rows = null;
    if(window.supabase){
      try{ rows = await fetchRowsFromSupabase(ds,s,e); }
      catch(err){ console.warn('Supabase download failed, falling back to local', err); rows = null; }
    }
    if(!rows) rows = getExportRows(ds,s,e);
    if(!rows || rows.length===0){ alert('No rows found for that selection'); return; }
    if(fmt==='csv'){
      const csv = generateCSV(rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `pigfarm_export_${ds}_${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    }else{
      alert('Only CSV download is supported in this prototype (XLSX not implemented).');
    }
  }

  // expose helpers so other pages (reports fallback) can call them
  window.getExportRows = getExportRows;
  window.fetchRowsFromSupabase = fetchRowsFromSupabase;
  // Export only sows (tries Modules -> Supabase -> local fallback). Exposed for pages to call.
  async function getSowRows(startDate, endDate){
    // 1) prefer in-memory Modules
    const start = startDate? new Date(startDate) : null; const end = endDate? new Date(endDate) : null;
    function inRange(d){ if(!d) return true; const dt=new Date(d); if(start && dt<start) return false; if(end && dt> end) return false; return true; }
    let rows = [];
    const AnimalsModule = (window.Modules && window.Modules.AnimalsModule) || null;
    if(AnimalsModule && Array.isArray(AnimalsModule.sows) && AnimalsModule.sows.length>0){
      rows = AnimalsModule.sows.filter(s=> inRange(s.entryDate || s.created_at || s.dob));
      return rows;
    }
    // 2) try Supabase
    if(typeof fetchRowsFromSupabase === 'function'){
      try{
        const all = await fetchRowsFromSupabase('animals', startDate, endDate) || [];
        // heuristics: prefer rows where type/role/is_sow indicate sow, or female sex
        rows = all.filter(r=>{
          if(r.type && String(r.type).toLowerCase().includes('sow')) return true;
          if(r.role && String(r.role).toLowerCase().includes('sow')) return true;
          if(r.is_sow || r.isSow) return true;
          if(r.sex && String(r.sex).toLowerCase().startsWith('f')) return true;
          return false;
        });
        if(rows.length>0) return rows;
      }catch(e){ console.warn('fetchRowsFromSupabase for sows failed', e); }
    }
    // 3) fallback to local rows and filter heuristics
    const allLocal = getExportRows('animals', startDate, endDate) || [];
    rows = allLocal.filter(r=>{
      if(r.type && String(r.type).toLowerCase().includes('sow')) return true;
      if(r.role && String(r.role).toLowerCase().includes('sow')) return true;
      if(r.is_sow || r.isSow) return true;
      if(r.sex && String(r.sex).toLowerCase().startsWith('f')) return true;
      return false;
    });
    return rows;
  }
  async function exportSows(){
    const s = document.getElementById('exportStart')?.value; const e = document.getElementById('exportEnd')?.value;
    try{
      const rows = await getSowRows(s,e);
      if(!rows || rows.length===0){ alert('No sow rows found for that selection'); return; }
      const csv = generateCSV(rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `pigfarm_export_sows_${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    }catch(err){ alert('Sow export failed: '+ (err && err.message? err.message : String(err))); }
  }
  window.exportSows = exportSows;

}

window.addEventListener('DOMContentLoaded', () => {
  wireActiveNav();
  setupMenuToggle();
  setupBackButtons();
  setupThemeToggle();
  const tiles = select('#tiles'); if(tiles) renderTiles(tiles, buildMetrics());
  const alerts = select('#alerts'); if(alerts) renderAlerts(alerts, window.Modules.NotificationsModule.getDue());
  // initialize export UI
  setupExportUI();
});
