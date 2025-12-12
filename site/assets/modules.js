// Modular structure for Pig Farm static prototype
// Each module attaches to window.Modules for simple access from non-module scripts.

(function(){
  // Shared constants for form dropdowns
  const Constants = {
    breeds: ['Large White','Landrace','Duroc','Hampshire','Yorkshire','Pietrain','Crossbred'],
    groups: ['Grower','Finisher','Breeder','Replacement','Quarantine'],
    obtainMethods: ['Bred On Farm','Purchased','Transferred','Gift','Other']
  };

  // Load persisted animals (if any) from localStorage
  function loadPersisted(){
    try{ return JSON.parse(localStorage.getItem('pf_animals')||'{}'); }catch(e){ return {}; }
  }
  const persisted = loadPersisted();

  // Small helper to insert into Supabase if a client (window.sb) is available.
  async function trySupabaseInsert(table, row){
    if(!window || !window.sb) return null;
    try{
      // supabase-js v1/v2 return shape: { data, error } or {data, error}
      const res = await window.sb.from(table).insert([row]).select();
      // v2: res.error, res.data
      if(res.error){ console.warn('Supabase insert error', table, res.error); return { error: res.error }; }
      if(res.data) return Array.isArray(res.data)? res.data[0] : res.data;
      // fallback: some UMDs return array directly
      return res[0] || null;
    }catch(e){
      console.warn('Supabase insert failed', e);
      return { error: e };
    }
  }

  function mapEventRow(ev){
    return {
      animal_tag: ev.tag || ev.animalTag || ev.animal_tag || null,
      type: ev.type || null,
      date: ev.date || null,
      semen: ev.semen || null,
      technician: ev.technician || null,
      return_date: ev.returnDate || ev.return_date || null,
      notes: ev.notes || null,
      metadata: ev.metadata || null
    };
  }

  function mapAnimalRow(a){
    return {
      tag_no: a.tagNo || a.tag || a.id || null,
      name: a.name || null,
      image_url: a.imageUrl || a.image || a.image_url || null,
      type: a.type || (a.tagNo && String(a.tagNo).toLowerCase().startsWith('sow')? 'sow' : null),
      dob: a.dob || null,
      gender: a.gender || null,
      breed: a.breed || null,
      group: a.group || a.herd || null,
      weight: a.weight || null,
      weight_history: a.weightHistory || a.weight_history || null,
      litter_no: a.litterNo || a.litter_no || null,
      stage: a.stage || null,
      status: a.status || null,
      entry_date: a.entryDate || a.entry_date || null,
      obtained_method: a.obtainedMethod || a.obtained_method || null,
      source: a.source || null,
      notes: a.notes || null
    };
  }

  function mapBreedingRow(r){
    return {
      sow_tag: r.sowTag || r.sow_tag || r.sow || r.tag || null,
      sow_name: r.sowName || r.sow_name || null,
      date_served: r.dateServed || r.date_served || r.date || null,
      boar_used: r.boarUsed || r.boar_used || null,
      expected_farrowing: r.expectedFarrowing || r.expected_farrowing || null,
      actual_farrowing: r.actualFarrowing || r.actual_farrowing || null,
      number_born: r.numberBorn || r.number_born || null,
      alive: r.alive || null,
      dead: r.dead || null,
      remarks: r.remarks || r.notes || null
    };
  }

  async function getAnimalIdByTag(tag){
    if(!window || !window.sb || !tag) return null;
    try{
      const res = await window.sb.from('animals').select('id').eq('tag_no', tag).limit(1).maybeSingle();
      // v2 returns { data, error }
      if(res && res.error) return null;
      if(res && res.data) return res.data.id;
      // fallback arrays
      if(Array.isArray(res) && res.length) return res[0].id;
      return null;
    }catch(e){ return null; }
  }

  // --- Supabase -> localStorage sync on load --------------------------------------------------
  // Convert DB row shapes to client shapes used by the static UI.
  function dbAnimalToClient(row){
    return {
      tagNo: row.tag_no || row.tagNo || null,
      name: row.name || null,
      imageUrl: row.image_url || row.imageUrl || row.image || null,
      type: row.type || null,
      dob: row.dob || null,
      gender: row.gender || null,
      breed: row.breed || null,
      group: row.group || null,
      weight: row.weight || null,
      weightHistory: row.weight_history || row.weightHistory || null,
      litterNo: row.litter_no || row.litterNo || null,
      stage: row.stage || null,
      status: row.status || null,
      entryDate: row.entry_date || row.entryDate || null,
      obtainedMethod: row.obtained_method || row.obtainedMethod || null,
      source: row.source || null,
      notes: row.notes || null,
      _remote_id: row.id || null,
      _synced: true
    };
  }

  function dbEventToClient(row){
    return {
      tag: row.animal_tag || row.tag || null,
      type: row.type || null,
      date: row.date || null,
      semen: row.semen || null,
      technician: row.technician || null,
      returnDate: row.return_date || row.returnDate || null,
      notes: row.notes || null,
      metadata: row.metadata || null,
      _remote_id: row.id || null,
      _synced: true
    };
  }

  function dbBreedingToClient(row){
    return {
      sowTag: row.sow_tag || row.sowTag || null,
      sowName: row.sow_name || row.sowName || null,
      dateServed: row.date_served || row.dateServed || row.date || null,
      boarUsed: row.boar_used || row.boarUsed || null,
      expectedFarrowing: row.expected_farrowing || row.expectedFarrowing || null,
      actualFarrowing: row.actual_farrowing || row.actualFarrowing || null,
      numberBorn: row.number_born || row.numberBorn || null,
      alive: row.alive || null,
      dead: row.dead || null,
      remarks: row.remarks || row.notes || null,
      _remote_id: row.id || null,
      _synced: true
    };
  }

  async function syncFromSupabase(){
    if(!window || !window.sb) { console.info('No Supabase client available for sync.'); return; }
    try{
      console.info('Starting Supabase -> local sync');
      // detect whether localStorage had data before sync so we can decide to reload once
      const hadLocal = {
        animals: (function(){ try{ const r = localStorage.getItem('pf_animals'); if(!r) return false; const p = JSON.parse(r); return (p.sows&&p.sows.length)||(p.boars&&p.boars.length); }catch(e){return false;} })(),
        events: (function(){ try{ const r = localStorage.getItem('pf_events'); if(!r) return false; const p = JSON.parse(r); return (p && p.length); }catch(e){return false;} })(),
        breeding: (function(){ try{ const r = localStorage.getItem('pf_breeding'); if(!r) return false; const p = JSON.parse(r); return (p && p.length); }catch(e){return false;} })(),
        litters: (function(){ try{ const r = localStorage.getItem('pf_litters'); if(!r) return false; const p = JSON.parse(r); return (p && p.length); }catch(e){return false;} })()
      };

      // --- Animals ---
      let animalsRes = await window.sb.from('animals').select('*');
      if(animalsRes && animalsRes.error){ console.warn('Failed to fetch animals for sync', animalsRes.error); } else {
        const data = animalsRes.data || animalsRes || [];
        const sows = [], boars = [];
        for(const r of data){
          const a = dbAnimalToClient(r);
          if(a.type && String(a.type).toLowerCase().startsWith('s')) sows.push(a); else boars.push(a);
        }
        // merge with local user-only animals that haven't been synced yet
        try{
          const raw = localStorage.getItem('pf_animals');
          const parsed = raw? JSON.parse(raw) : {};
          const localSows = parsed.sows||[];
          const localBoars = parsed.boars||[];
          const sowTags = new Set(sows.map(s=>s.tagNo));
          const boarTags = new Set(boars.map(b=>b.tagNo));
          for(const ls of localSows){ if(!sowTags.has(ls.tagNo)){ sows.push(ls); } }
          for(const lb of localBoars){ if(!boarTags.has(lb.tagNo)){ boars.push(lb); } }
        }catch(e){}
        Modules.AnimalsModule.sows = sows;
        Modules.AnimalsModule.boars = boars;
        try{ localStorage.setItem('pf_animals', JSON.stringify({ sows, boars })); }catch(e){}
      }

      // --- Events ---
      let eventsRes = await window.sb.from('events').select('*');
      if(eventsRes && eventsRes.error){ console.warn('Failed to fetch events for sync', eventsRes.error); } else {
        const data = eventsRes.data || eventsRes || [];
        const events = data.map(dbEventToClient);
        // merge local events that are not present remotely (by remote id or key)
        try{
          const raw = localStorage.getItem('pf_events');
          const local = raw? JSON.parse(raw) : [];
          const remoteKeys = new Set(events.map(e=> (e._remote_id? 'id:'+e._remote_id : (e.tag+'|'+e.date+'|'+(e.type||'')) ) ));
          for(const le of local){
            const key = le._remote_id? 'id:'+le._remote_id : ( (le.tag||le.animalTag||le.animal_tag||'') + '|' + (le.date||'') + '|' + (le.type||'') );
            if(!remoteKeys.has(key)) events.push(le);
          }
        }catch(e){}
        Modules.EventsModule.events = events;
        try{ localStorage.setItem('pf_events', JSON.stringify(events)); }catch(e){}
      }

      // --- Breeding ---
      let breedRes = await window.sb.from('breeding').select('*');
      if(breedRes && breedRes.error){ console.warn('Failed to fetch breeding for sync', breedRes.error); } else {
        const data = breedRes.data || breedRes || [];
        const breedingRecords = data.map(dbBreedingToClient);
        try{
          const raw = localStorage.getItem('pf_breeding');
          const local = raw? JSON.parse(raw) : [];
          const remoteKeys = new Set(breedingRecords.map(b=> b._remote_id? 'id:'+b._remote_id : (b.sowTag+'|'+b.dateServed)) );
          for(const lb of local){ const key = lb._remote_id? 'id:'+lb._remote_id : (lb.sowTag+'|'+lb.dateServed); if(!remoteKeys.has(key)) breedingRecords.push(lb); }
        }catch(e){}
        Modules.BreedingModule && (Modules.BreedingModule.records = breedingRecords);
        Modules.AnimalsModule && (Modules.AnimalsModule.breedingRecords = breedingRecords);
        try{ localStorage.setItem('pf_breeding', JSON.stringify(breedingRecords)); }catch(e){}
      }

      // --- Litters (optional) ---
      try{
        let litRes = await window.sb.from('litters').select('*');
        if(!(litRes && litRes.error)){
          const data = litRes.data || litRes || [];
          const litters = data.map(l=> ({ id: l.id, farrow_date: l.farrow_date, piglets: l.piglets || [] , notes: l.notes||'' , _remote_id: l.id, _synced:true }));
          try{ const raw = localStorage.getItem('pf_litters'); const local = raw? JSON.parse(raw):[]; const remoteIds = new Set(litters.map(x=>x.id)); for(const ll of local){ if(!remoteIds.has(ll.id)) litters.push(ll); } }catch(e){}
          Modules.AnimalsModule.litters = litters;
          try{ localStorage.setItem('pf_litters', JSON.stringify(litters)); }catch(e){}
        }
      }catch(e){}

      console.info('Supabase -> local sync finished');
      // notify UI that data has been updated
      try{ window.dispatchEvent(new Event('pf:data:updated')); }catch(e){}

      // If there was no local data and we just populated localStorage from remote, reload once so pages initialized earlier pick it up.
      try{
        const nowLocal = {
          animals: (Modules.AnimalsModule.sows && Modules.AnimalsModule.sows.length) || (Modules.AnimalsModule.boars && Modules.AnimalsModule.boars.length),
          events: (Modules.EventsModule.events && Modules.EventsModule.events.length),
          breeding: (Modules.AnimalsModule.breedingRecords && Modules.AnimalsModule.breedingRecords.length),
          litters: (Modules.AnimalsModule.litters && Modules.AnimalsModule.litters.length)
        };
        const becamePopulated = (!hadLocal.animals && nowLocal.animals) || (!hadLocal.events && nowLocal.events) || (!hadLocal.breeding && nowLocal.breeding) || (!hadLocal.litters && nowLocal.litters);
        if(becamePopulated){
          // reload once after a short delay so the rest of the page can finish loading
          console.info('Data populated from Supabase; reloading to reflect remote data.');
          setTimeout(()=>{ try{ window.location.reload(); }catch(e){} }, 200);
        }
      }catch(e){}
    }catch(e){ console.warn('Sync from Supabase failed', e); }
  }

  // react when supabase client becomes available; supabase-client.js dispatches this event
  if(typeof window !== 'undefined'){
    window.addEventListener('supabase:ready', function(){
      // defer to next tick to avoid blocking load
      setTimeout(()=>{ syncFromSupabase().catch(e=>console.warn('syncFromSupabase error', e)); }, 50);
    });
    // if the client was already created earlier, run sync now
    if(window.sb) { setTimeout(()=>{ syncFromSupabase().catch(e=>console.warn('syncFromSupabase error', e)); }, 50); }
  }

  const AnimalsModule = {
    // litters will hold litters and associated piglet records
    // NOTE: dummy/sample litters were removed and stored in the repo root file named "dummy data".
    // Initialize from persisted storage if available, otherwise an empty array.
    litters: (function(){
      try{ const raw = localStorage.getItem('pf_litters'); if(raw) return JSON.parse(raw); }catch(e){}
      return [];
    })(),
    // Breeding and piglet monitoring datasets
    // breeding records: include sowTag when possible to allow matching by tag
    // Breeding records: prefer persisted data in localStorage; default to empty array.
    // (Sample breeding records moved to 'dummy data' file.)
    breedingRecords: (function(){
      try{ const raw = localStorage.getItem('pf_breeding'); if(raw) return JSON.parse(raw); }catch(e){}
      return [];
    })(),
    // Short-term piglet groupings for quick views. No embedded sample data — use persisted
    piglets4m: [],
    piglets3w: [],
    getBreedingFor(identifier){
      // identifier can be tagNo or name
      return (this.breedingRecords||[]).filter(r=> r.sowTag===identifier || r.sowName===identifier);
    },
    addBreedingRecord(rec){
      this.breedingRecords.push(rec);
      try{ localStorage.setItem('pf_breeding', JSON.stringify(this.breedingRecords)); }catch(e){}
      // Attempt to persist to Supabase (async, fire-and-forget). Keeps optimistic local update.
      (async ()=>{
        const row = mapBreedingRow(rec);
        const res = await trySupabaseInsert('breeding', row);
        if(res && res.error){
          // mark the record so UI may show it unsynced
          rec._syncError = true;
        }else if(res && res.id){
          rec._remote_id = res.id;
          rec._synced = true;
        }
      })();
    },
    // seed sows (keep id/tag prefixes to differentiate seed data from user-added)
    // Sows list: remove embedded seed data. Use persisted sows if present, otherwise empty.
    sows: (function(){
      try{ const raw = localStorage.getItem('pf_animals'); if(raw){ const parsed = JSON.parse(raw); return (parsed.sows||[]); } }catch(e){}
      return [].concat(persisted.sows||[]);
    })(),
    // seed boars
    // Boars list: load persisted boars if present.
    boars: (function(){
      try{ const raw = localStorage.getItem('pf_animals'); if(raw){ const parsed = JSON.parse(raw); return (parsed.boars||[]); } }catch(e){}
      return [].concat(persisted.boars||[]);
    })(),
    getSow(id){ return this.sows.find(s => s.id === id || s.tagNo === id); },
    getByTag(tag){ return this.sows.find(s=>s.tagNo===tag) || this.boars.find(b=>b.tagNo===tag) || this.litters.flatMap(l=>l.piglets||[]).find(p=>p.tagNo===tag); },
    listAllTags(){ return [...this.sows.map(s=>s.tagNo), ...this.boars.map(b=>b.tagNo), ...this.litters.flatMap(l=> (l.piglets||[]).map(p=>p.tagNo))]; },
    get piglets(){ return this.litters.reduce((sum,l)=> sum + (l.piglets? l.piglets.length:0), 0); },
    addPig(pig){
      // pig: {tagNo, name, breed, gender, litterNo, weight, dob, entryDate, group, obtainedMethod, motherTag, fatherTag, notes}
      if(!pig || !pig.tagNo) return { ok:false, error:'Tag number required' };
      if(this.listAllTags().includes(pig.tagNo)) return { ok:false, error:'Tag already exists' };
      if(!pig.gender) return { ok:false, error:'Gender required' };
      if(!pig.obtainedMethod) return { ok:false, error:'Obtained method required' };
      const base = {
        id: pig.tagNo,
        tagNo: pig.tagNo,
        name: pig.name||pig.tagNo,
        imageUrl: pig.imageUrl || pig.image || pig.image_url || null,
        breed: pig.breed||'Unknown',
        dob: pig.dob||'',
        notes: pig.notes||''
      };
      if(pig.gender.toLowerCase().startsWith('f')){
        const sow = Object.assign(base, {
          expectedFarrow: pig.dob? window.Modules?.BreedingModule?.predictFarrow(pig.dob) : '',
          weightHistory: pig.weight? [Number(pig.weight)] : [],
          status: 'Growing',
          group: pig.group||'',
          obtainedMethod: pig.obtainedMethod||''
        });
        this.sows.push(sow);
      }else{
        const boar = Object.assign(base, {
          uses: 0,
          fertility: 0.7,
          group: pig.group||'',
          obtainedMethod: pig.obtainedMethod||''
        });
        this.boars.push(boar);
      }
      // Persist minimal new animals list
      try{
        localStorage.setItem('pf_animals', JSON.stringify({
          sows: this.sows.filter(x=>!x.id.startsWith('sow') && !x.id.startsWith('boar')), // only user-added
          boars: this.boars.filter(x=>!x.id.startsWith('sow') && !x.id.startsWith('boar'))
        }));
      }catch(e){ /* ignore quota errors */ }

      // Attempt to persist new animal to Supabase asynchronously
      (async ()=>{
        try{
          const row = mapAnimalRow(pig.gender && pig.gender.toLowerCase().startsWith('f')? Object.assign({}, pig, { type: 'sow'}) : Object.assign({}, pig, { type: 'boar'}));
          const res = await trySupabaseInsert('animals', row);
          if(res && res.error){
            // nothing more to do; mark unsynced
            const list = pig.gender && pig.gender.toLowerCase().startsWith('f')? this.sows : this.boars;
            const created = list.find(x=>x.tagNo===pig.tagNo);
            if(created) created._syncError = true;
          }else if(res && res.id){
            const list = pig.gender && pig.gender.toLowerCase().startsWith('f')? this.sows : this.boars;
            const created = list.find(x=>x.tagNo===pig.tagNo);
            if(created){ created._remote_id = res.id; created._synced = true; }
          }
        }catch(e){ console.warn('Animal supabase insert failed', e); }
      })();

      return { ok:true };
    }
  };

  const BreedingModule = {
    // Dummy timeline calculations
    predictFarrow(servedDate){
      const d = new Date(servedDate); d.setDate(d.getDate()+115); return d.toISOString().slice(0,10);
    },
    predictWean(farrowDate){
      const d = new Date(farrowDate); d.setDate(d.getDate()+25); return d.toISOString().slice(0,10);
    }
  };

  const FeedModule = {
    // Inventory: prefer persisted store (pf_feed) or initialize empty. Sample data moved to 'dummy data'.
    inventory: (function(){ try{ const raw = localStorage.getItem('pf_feed'); if(raw) return JSON.parse(raw); }catch(e){} return []; })(),
    fcrSamples: [ { group: 'Litter A', fcr: 2.3 }, { group: 'Litter B', fcr: 2.5 } ]
  };

  const FinanceModule = {
    month: '2025-11', revenue: 4850, costs: 2930,
    get profit(){ return this.revenue - this.costs; },
    // expense/revenue categories: use persisted pf_finance or empty
    categories: (function(){ try{ const raw = localStorage.getItem('pf_finance'); if(raw) return JSON.parse(raw).categories||[]; }catch(e){} return []; })()
  };

  const HealthModule = {
    // health schedules and outbreaks should come from persisted store or Supabase
    schedules: (function(){ try{ const raw = localStorage.getItem('pf_health'); if(raw) return JSON.parse(raw).schedules||[]; }catch(e){} return []; })(),
    outbreaks: (function(){ try{ const raw = localStorage.getItem('pf_health'); if(raw) return JSON.parse(raw).outbreaks||[]; }catch(e){} return []; })()
  };

  const InventoryModule = {
    stock: (function(){ try{ const raw = localStorage.getItem('pf_inventory'); if(raw) return JSON.parse(raw); }catch(e){} return []; })()
  };

  const ReportsModule = {
    types: [
      { code: 'MONTHLY_FEED', name: 'Monthly feed usage' },
      { code: 'PROFIT_LOSS', name: 'Profit/Loss report' },
      { code: 'BREEDING_PERF', name: 'Breeding performance' }
    ],
    generateMock(code){ return { code, generatedAt: new Date().toISOString(), size: '0KB', note: 'Mock report (no data export).' }; }
  };

  const NotificationsModule = {
    // alerts moved to persisted store (pf_notifications) or empty by default
    alerts: (function(){ try{ const raw = localStorage.getItem('pf_notifications'); if(raw) return JSON.parse(raw); }catch(e){} return []; })(),
    getDue(){ return this.alerts; }
  };

  const EventsModule = {
    // load persisted events (optional)
    // events: load persisted pf_events or empty. Demo/sample events moved to 'dummy data'.
    events: (function(){ try{ const raw = localStorage.getItem('pf_events'); if(raw) return JSON.parse(raw); }catch(e){} return []; })(),
    getFor(tag){ return this.events.filter(e=>e.tag===tag).sort((a,b)=> new Date(b.date)-new Date(a.date)); },
    addEvent(ev){
      this.events.push(ev);
      try{ localStorage.setItem('pf_events', JSON.stringify(this.events)); }catch(e){}
      // Attempt to persist event to Supabase (async)
      (async ()=>{
        const row = mapEventRow(ev);
        // ensure we have an animal_tag value (DB requires NOT NULL)
        row.animal_tag = row.animal_tag || ev.tag || ev.animalTag || ev.tagNo || ev.tag_no || null;
        if(!row.animal_tag){
          // nothing to insert remotely for events without an animal tag — mark unsynced and exit
          console.warn('Skipping Supabase insert for event: missing animal_tag', ev);
          ev._syncError = true;
          return;
        }
        // try to resolve the animal id by tag for foreign-key relationship
        try{
          const aid = await getAnimalIdByTag(row.animal_tag);
          if(aid) row.animal_id = aid;
        }catch(e){}
        const res = await trySupabaseInsert('events', row);
        if(res && res.error){ ev._syncError = true; }
        else if(res && res.id){ ev._remote_id = res.id; ev._synced = true; }
      })();
    }
  };

  window.Modules = { AnimalsModule, BreedingModule, FeedModule, FinanceModule, HealthModule, InventoryModule, ReportsModule, NotificationsModule, EventsModule, Constants };

  // When data is updated (from Supabase sync), try to call common page renderers so UI reflects new data
  if(typeof window !== 'undefined'){
    window.addEventListener('pf:data:updated', function onPfData(){
      const renderFns = ['renderEvents','renderSows','renderBoars','renderLitters','renderLitter','renderPregnancies','renderPregnancies','render'];
      let attempts = 0;
      function tryRender(){
        attempts++;
        let called = false;
        for(const name of renderFns){
          try{
            const fn = window[name];
            if(typeof fn === 'function'){
              try{ fn(); called = true; }catch(e){ console.warn('Render function',name,'failed',e); }
            }
          }catch(e){}
        }
        if(!called && attempts < 6){ // retry a few times if render functions not yet defined
          setTimeout(tryRender, 150);
        }
      }
      tryRender();
    });
  }
})();
