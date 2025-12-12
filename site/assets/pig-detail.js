// Render pig details and events on pig.html (reads ?tag=)
(function(){
  function qs(id){ return document.getElementById(id); }
  function param(name){ const p = new URLSearchParams(location.search); return p.get(name); }
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  // Lightbox helper: create single DOM node once and provide open/close
  function ensureLightboxExists(){
    if(document.getElementById('pfLightbox')) return;
    const lb = document.createElement('div'); lb.id = 'pfLightbox'; lb.className = 'lightbox'; lb.style.display = 'none';
    lb.innerHTML = `
      <div class="lightbox-inner" role="dialog" aria-modal="true">
        <button class="lightbox-close" aria-label="Close">✕</button>
        <img id="pfLightboxImg" src="" alt="preview" />
      </div>`;
    document.body.appendChild(lb);
    // handlers
    lb.addEventListener('click', (ev)=>{
      if(ev.target === lb || ev.target.classList.contains('lightbox-close')) closeLightbox();
    });
    document.addEventListener('keydown', function escHandler(ev){ if(ev.key==='Escape'){ closeLightbox(); } });
    // touch swipe to close
    const img = lb.querySelector('#pfLightboxImg'); let startY=0; img.addEventListener('touchstart', (e)=> startY = e.touches[0]?.clientY || 0 ); img.addEventListener('touchend', (e)=>{ const endY = e.changedTouches[0]?.clientY || 0; if(Math.abs(endY-startY) > 80) closeLightbox(); });
  }

  function openLightbox(src){
    try{
      ensureLightboxExists();
      const lb = document.getElementById('pfLightbox'); const img = document.getElementById('pfLightboxImg');
      if(!lb || !img) return;
      img.src = src;
      // inline fallback sizing
      img.style.maxWidth = '90vw'; img.style.maxHeight = '90vh'; img.style.width='auto'; img.style.height='auto';
      lb.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }catch(e){ console.error('openLightbox', e); }
  }

  function closeLightbox(){ const lb=document.getElementById('pfLightbox'); if(!lb) return; lb.style.display='none'; const img=document.getElementById('pfLightboxImg'); if(img) img.src=''; document.body.style.overflow=''; }

  // delegated click handler for any element with data-lightbox
  document.addEventListener('click', function(ev){
    try{
      const t = ev.target.closest && ev.target.closest('[data-lightbox]');
      if(!t) return;
      ev.preventDefault();
      const src = t.dataset && (t.dataset.src || (t.querySelector && (t.querySelector('img')||{}).src));
      if(src) openLightbox(src);
    }catch(e){ /* ignore */ }
  });

  ready(()=>{
    const tag = param('tag');
    if(!tag) return qs('detailContent').textContent = 'No pig selected';
  const { AnimalsModule, EventsModule } = window.Modules;
    const pig = AnimalsModule.getByTag(tag) || AnimalsModule.getSow(tag) || AnimalsModule.boars.find(b=>b.tagNo===tag);
    if(!pig) return qs('detailContent').textContent = 'Pig not found';

  // determine if this is a boar to avoid showing pregnancies UI for boars
  const isBoar = (AnimalsModule.boars || []).some(b=> b.tagNo === pig.tagNo);
  // hide pregnancy tab/button for boars in the header and the alternate pane add button
  const pregTabBtn = qs('tabPreg'); if(isBoar && pregTabBtn) pregTabBtn.style.display = 'none';
  const addPregBtn = qs('addPregBtn'); if(isBoar && addPregBtn) addPregBtn.style.display = 'none';

    qs('title').textContent = `${pig.tagNo} — ${pig.name||''}`;

    function humanAge(dob){ if(!dob) return ''; const d=new Date(dob); const now=new Date(); let yrs = now.getFullYear()-d.getFullYear(); let months = now.getMonth()-d.getMonth(); let days = now.getDate()-d.getDate(); if(days<0){ months--; days+=30; } if(months<0){ yrs--; months+=12; } return `${yrs} years, ${months} months, ${days} days`; }

    const detailContent = qs('detailContent');
    detailContent.innerHTML = `
      <div style="display:grid;grid-template-columns:120px 1fr 1fr;gap:18px;align-items:start">
        <div style="display:flex;flex-direction:column;align-items:flex-start">
          <img id="pigMainImg" data-lightbox data-src="${pig.imageUrl || pig.image || pig.image_url || '/pics/Pig.jpeg'}" src="${pig.imageUrl || pig.image || pig.image_url || '/pics/Pig.jpeg'}" alt="pig" style="width:120px;height:120px;border-radius:8px;object-fit:cover;cursor:pointer" />
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-start">
          <div class="small">Tag No:</div><div style="font-weight:700">${pig.tagNo}</div>
          <div class="small">Name:</div><div>${pig.name||''}</div>
          <div class="small">D.O.B:</div><div>${pig.dob||''}</div>
          <div class="small">Age:</div><div>${humanAge(pig.dob)||''}</div>
          <div class="small">Gender:</div><div>${pig.gender|| (AnimalsModule.sows.includes(pig)?'Female':'Male') }</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-start">
          <div class="small">Litter No:</div><div>${pig.litterNo||''}</div>
          <div class="small">Weight:</div><div>${(pig.weight || (pig.weightHistory && pig.weightHistory.slice(-1)[0]))||''}</div>
          <div class="small">Stage:</div><div>${pig.stage||''}</div>
          <div class="small">Status:</div><div style="color:var(--brand-600);font-weight:700">${pig.status||''}</div>
          <div class="small">Breed:</div><div>${pig.breed||''}</div>
          <div class="small">Group:</div><div>${pig.group||''}</div>
        </div>
      </div>
      <div style="height:14px"></div>
      <div class="small">Joined On:</div><div>${pig.entryDate||''}</div>
      <div class="small">Source:</div><div>${pig.obtainedMethod||pig.source||''}</div>
      <div style="height:8px"></div>
      <div class="small">Notes:</div><div>${pig.notes||''}</div>
    `;

    // ensure a lightbox DOM exists; click handling will be delegated below
    ensureLightboxExists();

    // Details, Events and Pregnancies are rendered into their dedicated panes
      // We render Details, Events and Pregnancies into separate panes defined in the HTML
      // detailsPane -> shows `#detailsCard` (already populated above)
      // eventsPane -> contains `#eventsList` and add button `#addEventBtn`
      // pregPane -> contains `#pregList` and add button `#addPregBtn` (hidden for boars)

    // Render inline events and pregnancies
    function renderEventsInline(targetId='eventsList', allowEmptyMessage=true){
      const eventsRoot = qs(targetId); if(!eventsRoot) return; eventsRoot.innerHTML='';
      const all = EventsModule.getFor(pig.tagNo) || [];
      const today = new Date(); today.setHours(0,0,0,0);
      const upcoming = all.filter(e=> new Date(e.date).setHours(0,0,0,0) >= today).sort((a,b)=> new Date(a.date)-new Date(b.date));
      if(upcoming.length===0){ if(allowEmptyMessage) eventsRoot.innerHTML='<div class="small">No upcoming events for this pig</div>'; return; }
      upcoming.forEach(e=> eventsRoot.append(buildEventCard(e)));
    }

    // Events top button will toggle the Events pane (we also provide a 'View all' link inside the pane)
    const allBtn = qs('showAllEventsBtn');
      // wire top tab buttons to toggle panes
      const detailsTab = qs('tabDetails');
      const upcomingTab = qs('tabUpcoming');
      const eventsTab = qs('showAllEventsBtn');
      const pregTab = qs('tabPreg');
      function showPane(name){
        const detailsPane = qs('detailsPane');
        const upcomingPane = qs('upcomingPane');
        const eventsPane = qs('eventsPane');
        const pregPane = qs('pregPane');
        if(detailsPane) detailsPane.style.display = (name==='details')?'block':'none';
        if(upcomingPane) upcomingPane.style.display = (name==='upcoming')?'block':'none';
        if(eventsPane) eventsPane.style.display = (name==='events')?'block':'none';
        if(pregPane) pregPane.style.display = (name==='preg')?'block':'none';
        // active styles
        if(detailsTab) detailsTab.classList.toggle('active', name==='details');
        if(upcomingTab) upcomingTab.classList.toggle('active', name==='upcoming');
        if(eventsTab) eventsTab.classList.toggle('active', name==='events');
        if(pregTab) pregTab.classList.toggle('active', name==='preg');
        // render content for panes when shown
        if(name==='events'){
          renderEventsInline('eventsList');
          // inject a view-all link if not present
          try{
            const header = eventsPane && eventsPane.querySelector('h3') && eventsPane.querySelector('h3').parentNode;
            if(header && !header.querySelector('#viewAllEventsLink')){
              const a = document.createElement('a'); a.id='viewAllEventsLink'; a.className='small'; a.style.marginLeft='12px'; a.href = 'events.html?tag='+encodeURIComponent(pig.tagNo); a.textContent = 'View all';
              header.appendChild(a);
            }
          }catch(e){}
        }
        if(name==='preg'){
          renderPregsInline();
          try{
            const header = pregPane && pregPane.querySelector('h3') && pregPane.querySelector('h3').parentNode;
            if(header && !header.querySelector('#viewAllPregLink')){
              const a = document.createElement('a'); a.id='viewAllPregLink'; a.className='small'; a.style.marginLeft='12px'; a.href = 'pregnancies.html?tag='+encodeURIComponent(pig.tagNo); a.textContent = 'View all';
              header.appendChild(a);
            }
          }catch(e){}
        }
        if(name==='upcoming'){
          renderEventsInline('upcomingEventsList', false);
          renderPregsInlineForUpcoming();
          // populate the preview blocks in the Upcoming pane
          try{
            populateUpcomingDetailsPreview();
            populateUpcomingPregnancyCard();
          }catch(e){/* ignore */}
        }
      }
  if(detailsTab) detailsTab.addEventListener('click', ()=> showPane('details'));
  if(upcomingTab) upcomingTab.addEventListener('click', ()=> showPane('upcoming'));
  if(eventsTab) eventsTab.addEventListener('click', ()=> showPane('events'));
      // Pregnancies top button navigates to the full pregnancies history page (keeps pregPane for upcoming only)
      if(pregTab){
        pregTab.addEventListener('click', ()=>{ const tag = pig.tagNo; location.href = 'pregnancies.html?tag='+encodeURIComponent(tag); });
      }

  // default to upcoming composite pane
  showPane('upcoming');

    function renderPregsInline(){
      if(isBoar) return; // no pregnancies for boars
      const root = qs('pregList'); if(!root) return; root.innerHTML='';
      const all = (window.Modules.AnimalsModule.getBreedingFor(pig.tagNo) || []).concat(window.Modules.AnimalsModule.getBreedingFor(pig.name||'') || []);
      // dedupe
      const map = {}; all.forEach(r=> map[JSON.stringify(r)] = r);
      const rows = Object.values(map).sort((a,b)=> new Date(a.expectedFarrowing||0)- new Date(b.expectedFarrowing||0));
      const today = new Date(); today.setHours(0,0,0,0);
      // show only the nearest upcoming pregnancy (expectedFarrowing >= today)
      const upcoming = rows.filter(p=> p.expectedFarrowing && new Date(p.expectedFarrowing).setHours(0,0,0,0) >= today).sort((a,b)=> new Date(a.expectedFarrowing)-new Date(b.expectedFarrowing))[0];
      if(!upcoming){ root.innerHTML='<div class="small">No upcoming pregnancy for this sow</div>'; return; }
      const r = upcoming;
      const it = document.createElement('div'); it.className='card pad';
      it.innerHTML = `
        <div class="preg-title">Upcoming Pregnancy</div>
        <div style="height:8px"></div>
        <div class="small">Date Served:</div><div>${r.dateServed||''}</div>
        <div class="small">Boar Used:</div><div>${r.boarUsed||''}</div>
        <div class="small">Expected Farrowing:</div><div>${r.expectedFarrowing||''}</div>
        <div class="small">Actual Farrowing:</div><div>${r.actualFarrowing||''}</div>
        <div class="small">Number Born:</div><div>${r.numberBorn||''}</div>
        <div class="small">Alive:</div><div>${r.alive||''}</div>
        <div class="small">Dead:</div><div>${r.dead||''}</div>
        <div style="height:6px"></div>
        <div class="small">Remarks:</div><div>${r.remarks||''}</div>
      `;
      root.append(it);
    }

    // render a compact pregnancy block used in the Upcoming pane
    function renderPregsInlineForUpcoming(){
      if(isBoar) return; const root = qs('upcomingPregList'); if(!root) return; root.innerHTML='';
      const all = (window.Modules.AnimalsModule.getBreedingFor(pig.tagNo) || []).concat(window.Modules.AnimalsModule.getBreedingFor(pig.name||'') || []);
      const map = {}; all.forEach(r=> map[JSON.stringify(r)] = r);
      const rows = Object.values(map).sort((a,b)=> new Date(a.expectedFarrowing||0)- new Date(b.expectedFarrowing||0));
      const today = new Date(); today.setHours(0,0,0,0);
      const upcoming = rows.filter(p=> p.expectedFarrowing && new Date(p.expectedFarrowing).setHours(0,0,0,0) >= today).sort((a,b)=> new Date(a.expectedFarrowing)-new Date(b.expectedFarrowing))[0];
      if(!upcoming){ root.innerHTML='<div class="small">No upcoming pregnancy for this sow</div>'; return; }
      const r = upcoming; const it = document.createElement('div'); it.className='card pad';
      it.innerHTML = `<div class="preg-title">Expected: ${r.expectedFarrowing||''}</div><div class="small">Served: ${r.dateServed||''} • Boar: ${r.boarUsed||''}</div>`;
      root.append(it);
    }

    // populate the details preview in the Upcoming pane with live pig data
    function populateUpcomingDetailsPreview(){
      const el = qs('detailContentPreview'); if(!el) return;
      const g = pig.gender || (AnimalsModule.sows.includes(pig)?'Female':'Male');
      el.innerHTML = `
      <div style="display:grid;grid-template-columns:120px 1fr 1fr;gap:18px;align-items:start">
        <div style="display:flex;flex-direction:column;align-items:flex-start">
          <img class="preview-img" data-lightbox data-src="${pig.imageUrl || pig.image || pig.image_url || '/pics/Pig.jpeg'}" src="${pig.imageUrl || pig.image || pig.image_url || '/pics/Pig.jpeg'}" alt="pig" style="width:120px;height:120px;border-radius:8px;object-fit:cover;cursor:pointer" />
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-start">
          <div class="small">Tag No:</div><div style="font-weight:700">${pig.tagNo||''}</div>
          <div class="small">Name:</div><div>${pig.name||''}</div>
          <div class="small">D.O.B:</div><div>${pig.dob||''}</div>
          <div class="small">Age:</div><div>${humanAge(pig.dob)||''}</div>
          <div class="small">Gender:</div><div>${g}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-start">
          <div class="small">Litter No:</div><div>${pig.litterNo||''}</div>
          <div class="small">Weight:</div><div>${pig.weight||''}</div>
          <div class="small">Stage:</div><div>${pig.stage||''}</div>
          <div class="small">Status:</div><div style="color:var(--brand-600);font-weight:700">${pig.status||''}</div>
          <div class="small">Breed:</div><div>${pig.breed||''}</div>
          <div class="small">Group:</div><div>${pig.group||''}</div>
        </div>
      </div>
      <div style="height:14px"></div>
      <div class="small">Joined On:</div><div>${pig.entryDate||''}</div>
      <div class="small">Source:</div><div>${pig.obtainedMethod||pig.source||''}</div>
      <div style="height:8px"></div>
      <div class="small">Notes:</div><div>${pig.notes||''}</div>
      `;

  // preview image click will be handled by delegated listener (data-lightbox)
    }

    // populate the compact pregnancy card in the Upcoming pane
    function populateUpcomingPregnancyCard(){
      const el = qs('upcomingPregnancyCard'); if(!el) return;
      const all = (window.Modules.AnimalsModule.getBreedingFor(pig.tagNo) || []).concat(window.Modules.AnimalsModule.getBreedingFor(pig.name||'') || []);
      const map = {}; all.forEach(r=> map[JSON.stringify(r)] = r);
      const rows = Object.values(map).sort((a,b)=> new Date(a.expectedFarrowing||0)- new Date(b.expectedFarrowing||0));
      const today = new Date(); today.setHours(0,0,0,0);
      const upcoming = rows.filter(p=> p.expectedFarrowing && new Date(p.expectedFarrowing).setHours(0,0,0,0) >= today).sort((a,b)=> new Date(a.expectedFarrowing)-new Date(b.expectedFarrowing))[0];
      if(!upcoming){ el.innerHTML = '<div class="small">No upcoming pregnancy for this sow</div>'; return; }
      el.innerHTML = `
        <div class="preg-title">Upcoming Pregnancy</div>
        <div style="height:6px"></div>
        <div class="small">Expected Farrowing:</div><div>${upcoming.expectedFarrowing||''}</div>
        <div class="small">Date Served:</div><div>${upcoming.dateServed||''}</div>
        <div class="small">Boar Used:</div><div>${upcoming.boarUsed||''}</div>
        <div style="height:6px"></div>
        <div class="small">Notes:</div><div>${upcoming.remarks||''}</div>
      `;
    }

    // Inline add form helpers for events and pregnancies will use the pane elements
    let eventFormShown = false;

    // initial inline render
    renderEventsInline(); renderPregsInline();


  // Keep top tab buttons available; Events/Pregnancies remain in the header


    // (original renderEvents left in file but we now use renderEventsInline)

    function buildEventCard(e){
      const it = document.createElement('div'); it.className='card pad';
      it.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="event-title">${e.type}</div>
          <div class="small">${e.date}</div>
        </div>
        <div style="height:8px"></div>
        <div class="small">Tag No:</div><div>${pig.tagNo} ${pig.group? '('+pig.group+')':''}</div>
        ${e.semen? `<div class="small">Semen:</div><div>${e.semen}</div>` : ''}
        ${e.technician? `<div class="small">Technician:</div><div>${e.technician}</div>` : ''}
        ${e.returnDate? `<div class="small">Return Date:</div><div>${e.returnDate}</div>` : ''}
        ${e.notes? `<div style="height:8px"></div><div class="small">Notes:</div><div>${e.notes}</div>` : ''}
      `;
      return it;
    }

    // Add event form (inline)
  const eventsPane = qs('eventsPane');
  const addBtn = qs('addEventBtn');
    let formShown = false;
    function toggleAddForm(){
      if(formShown){ // remove form
        const f = qs('eventFormWrap'); if(f) f.remove(); formShown=false; addBtn.textContent='＋ Add event';
      }else{
        const wrap = document.createElement('div'); wrap.id='eventFormWrap'; wrap.className='card pad';
        wrap.innerHTML = `
          <div style="display:grid;gap:8px">
            <input id="e_type" class="input" placeholder="Event type (e.g. Inseminated/Mated)" />
            <input id="e_date" type="date" class="input" />
            <input id="e_semen" class="input" placeholder="Semen code (optional)" />
            <input id="e_technician" class="input" placeholder="Technician (optional)" />
            <input id="e_returnDate" type="date" class="input" placeholder="Return date (optional)" />
            <textarea id="e_notes" class="input" rows="3" placeholder="Notes"></textarea>
            <div style="display:flex;gap:8px;justify-content:flex-end">
              <button id="e_cancel" class="btn">Cancel</button>
              <button id="e_save" class="btn primary">Save event</button>
            </div>
          </div>
        `;
  eventsPane.insertBefore(wrap, qs('eventsList'));
        qs('e_cancel').addEventListener('click', (ev)=>{ ev.preventDefault(); toggleAddForm(); });
        qs('e_save').addEventListener('click', (ev)=>{
          ev.preventDefault();
          const newEv = {
            tag: pig.tagNo,
            type: qs('e_type').value.trim() || 'Event',
            date: qs('e_date').value || new Date().toISOString().slice(0,10),
            semen: qs('e_semen').value.trim(),
            technician: qs('e_technician').value.trim(),
            returnDate: qs('e_returnDate').value || '',
            notes: qs('e_notes').value.trim()
          };
          EventsModule.addEvent(newEv);
          toggleAddForm();
          renderEventsInline();
        });
        formShown=true; addBtn.textContent='− Cancel';
      }
    }
    addBtn && addBtn.addEventListener('click', ()=> toggleAddForm());

    // Pregnancies add form (in pregPane)
    const pregPaneEl = qs('pregPane');
    const addPregPaneBtn = qs('addPregBtn');
    let pregFormShown = false;
    function toggleAddPregForm(){
      if(isBoar) return;
      const pregRoot = qs('pregList');
      if(!pregRoot) return;
      if(pregFormShown){ const f = qs('pregFormWrap'); if(f) f.remove(); pregFormShown=false; if(addPregPaneBtn) addPregPaneBtn.textContent='＋ Add pregnancy'; return; }
      const wrap = document.createElement('div'); wrap.id='pregFormWrap'; wrap.className='card pad';
      wrap.innerHTML = `
        <div style="display:grid;gap:8px">
          <input id="ip_dateServed" class="input" type="date" />
          <input id="ip_boarUsed" class="input" placeholder="Boar tag/code" />
          <input id="ip_expected" class="input" type="date" placeholder="Expected farrowing" />
          <input id="ip_actual" class="input" type="date" placeholder="Actual farrowing" />
          <input id="ip_numberBorn" class="input" type="number" placeholder="Number born" />
          <input id="ip_alive" class="input" type="number" placeholder="Alive" />
          <input id="ip_dead" class="input" type="number" placeholder="Dead" />
          <textarea id="ip_remarks" class="input" rows="3" placeholder="Remarks"></textarea>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button id="ip_cancel" class="btn">Cancel</button>
            <button id="ip_save" class="btn primary">Save</button>
          </div>
        </div>
      `;
      pregPaneEl.insertBefore(wrap, pregRoot);
      qs('ip_cancel').addEventListener('click', ()=>{ wrap.remove(); pregFormShown=false; if(addPregPaneBtn) addPregPaneBtn.textContent='＋ Add pregnancy'; });
      qs('ip_save').addEventListener('click', ()=>{
        const rec = { sowTag: pig.tagNo, sowName: pig.name||'', dateServed: qs('ip_dateServed').value, boarUsed: qs('ip_boarUsed').value, expectedFarrowing: qs('ip_expected').value, actualFarrowing: qs('ip_actual').value, numberBorn: qs('ip_numberBorn').value, alive: qs('ip_alive').value, dead: qs('ip_dead').value, remarks: qs('ip_remarks').value };
        window.Modules.AnimalsModule.addBreedingRecord(rec);
        wrap.remove(); pregFormShown=false; renderPregsInline();
      });
      pregFormShown=true; if(addPregPaneBtn) addPregPaneBtn.textContent='− Cancel';
    }
    if(addPregPaneBtn) addPregPaneBtn.addEventListener('click', ()=> toggleAddPregForm());

    wireActiveNav();
  });
})();

// --- Additional wiring: edit details button ---
(function(){
  function qs(id){ return document.getElementById(id); }
  document.addEventListener('DOMContentLoaded', ()=>{
    const editBtn = qs('editBtn'); if(!editBtn) return;
    editBtn.addEventListener('click', (ev)=>{
      ev.preventDefault(); // toggle an inline edit form
      const tag = new URLSearchParams(location.search).get('tag');
      if(!tag) return;
      const { AnimalsModule } = window.Modules;
      const pig = AnimalsModule.getByTag(tag) || AnimalsModule.getSow(tag) || AnimalsModule.boars.find(b=>b.tagNo===tag);
      if(!pig) return;
      const container = qs('detailContent');
      // if there's already an edit form, ignore
      if(qs('ed_form_wrap')) return;
      // build edit form
      const form = document.createElement('div'); form.id='ed_form_wrap'; form.className='card pad';
      form.innerHTML = `
        <div style="display:grid;gap:8px">
          <input id="ed_name" class="input" placeholder="Name" value="${(pig.name||'').replace(/"/g,'&quot;')}" />
          <input id="ed_dob" type="date" class="input" value="${pig.dob||''}" />
          <input id="ed_breed" class="input" placeholder="Breed" value="${(pig.breed||'').replace(/"/g,'&quot;')}" />
          <input id="ed_group" class="input" placeholder="Group" value="${(pig.group||'').replace(/"/g,'&quot;')}" />
          <textarea id="ed_notes" class="input" rows="3" placeholder="Notes">${(pig.notes||'').replace(/</g,'&lt;')}</textarea>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button id="ed_cancel" class="btn">Cancel</button>
            <button id="ed_save" class="btn primary">Save</button>
          </div>
        </div>
      `;
      // insert form above current details
      container.parentNode.insertBefore(form, container);
      // hide underlying content while editing
      container.style.display='none';
      qs('ed_cancel').addEventListener('click', ()=>{ form.remove(); container.style.display='block'; });
      qs('ed_save').addEventListener('click', ()=>{
        // apply edits to pig object
        pig.name = qs('ed_name').value.trim();
        pig.dob = qs('ed_dob').value || '';
        pig.breed = qs('ed_breed').value.trim();
        pig.group = qs('ed_group').value.trim();
        pig.notes = qs('ed_notes').value.trim();
        // persist to localStorage in pf_animals similar to addPig pattern
        try{
          const raw = localStorage.getItem('pf_animals');
          const persisted = raw? JSON.parse(raw) : {};
          persisted.sows = persisted.sows || [];
          persisted.boars = persisted.boars || [];
          // update or add to persisted arrays
          if((AnimalsModule.sows||[]).some(s=>s.tagNo===pig.tagNo)){
            const idx = persisted.sows.findIndex(x=> x.tagNo===pig.tagNo);
            if(idx>=0) persisted.sows[idx] = Object.assign(persisted.sows[idx], pig); else persisted.sows.push(pig);
          }else if((AnimalsModule.boars||[]).some(b=>b.tagNo===pig.tagNo)){
            const idx = persisted.boars.findIndex(x=> x.tagNo===pig.tagNo);
            if(idx>=0) persisted.boars[idx] = Object.assign(persisted.boars[idx], pig); else persisted.boars.push(pig);
          }
          localStorage.setItem('pf_animals', JSON.stringify(persisted));
        }catch(e){ /* ignore */ }
        // refresh page content
        form.remove(); container.style.display='block'; location.reload();
      });
    });
  });
})();
