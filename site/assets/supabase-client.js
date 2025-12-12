// Lightweight Supabase browser bootstrap (UMD).
// If `window.__SUPABASE_URL` and `window.__SUPABASE_ANON_KEY` are present
// this will dynamically load the supabase-js UMD bundle and create
// `window.supabase` and `window.sb` for the rest of the app to use.
(function initSupabaseClient(){
  try{
    if(window.sb || window.supabase) return;
    const url = window.__SUPABASE_URL; const key = window.__SUPABASE_ANON_KEY;
    if(!url || !key) { console.info('Supabase keys not configured (supa-config.js)'); return; }
    // UMD bundle (minified). This exposes a `supabase` global which has createClient.
    const src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/umd/supabase.min.js';
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = ()=>{
      try{
        if(typeof supabase === 'undefined' || !supabase.createClient) { console.warn('Supabase UMD not available after load'); return; }
        window.sb = window.supabase = supabase.createClient(url, key);
        console.info('Supabase client initialized (window.sb / window.supabase)');
      }catch(e){ console.warn('Error creating Supabase client', e); }
    };
    s.onerror = (e)=> console.warn('Failed to load Supabase UMD bundle', e);
    document.head.appendChild(s);
  }catch(e){ console.warn('initSupabaseClient error', e); }
})();

// Call this from your form submit handler (adapt names as needed)
async function uploadAnimalAndSave() {
  try {
    const fileInput = document.getElementById('photo'); // your form uses id="photo"
    const file = fileInput && fileInput.files && fileInput.files[0];
    if (!file) {
      console.warn('No file selected — saving pig without image.');
      // Optionally proceed to insert without image_url or abort
      // return;
    }

    // if you use window.sb in this project, use that
    const client = window.sb || window.supabase;
    if (!client || !client.storage) {
      alert('Storage client not available (window.sb missing).');
      return;
    }

    let publicUrl = null;

    if (file) {
      const bucket = 'pigs';
      // build deterministic unique filename/path (avoid unsafe chars)
      const filename = `${Date.now()}_${encodeURIComponent(file.name.replace(/\s+/g, '_'))}`;
      // upload
      const { data: uploadData, error: uploadError } = await client
        .storage
        .from(bucket)
        .upload(filename, file, { upsert: false });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert('Image upload failed — pig will be saved without image.');
      } else {
        console.info('uploadData:', uploadData);
        // Prefer getPublicUrl over building your own URL:
        const { data: urlData, error: urlError } = await client
          .storage
          .from(bucket)
          .getPublicUrl(filename);

        if (urlError) {
          console.warn('getPublicUrl error:', urlError);
          // bucket may be private — handle accordingly
          alert('Uploaded but could not obtain public URL (bucket may be private).');
        } else {
          // supabase-js versions may return publicUrl or publicURL
          publicUrl = urlData?.publicUrl ?? urlData?.publicURL ?? null;
          console.info('publicUrl:', publicUrl);
        }
      }
    }

    // Insert into DB. Use snake_case column name image_url.
    const payload = {
      name: document.getElementById('name')?.value || null,
      age: parseInt(document.getElementById('age')?.value || '0', 10) || null
    };
    if (publicUrl) payload.image_url = publicUrl;

    const { data, error } = await client
      .from('animals')
      .insert([payload]);

    if (error) {
      console.error('DB insert failed:', error);
      alert('Failed to save animal.');
      return;
    }

    alert('Animal saved successfully!');
    // optionally reset form etc.
  } catch (e) {
    console.error('Unexpected error in uploadAnimalAndSave:', e);
    alert('Unexpected error — check console.');
  }
}