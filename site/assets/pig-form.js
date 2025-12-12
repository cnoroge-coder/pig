// Logic for Add Pig form
(function(){
  function qs(id){ return document.getElementById(id); }
  const form = qs('pigForm'); if(!form) return;
  const msg = qs('formMsg');
  const { AnimalsModule, Constants } = window.Modules;

  function fillSelect(id, values, placeholder){
    const sel = qs(id); if(!sel) return;
    sel.innerHTML = '';
    if(placeholder) sel.append(new Option(placeholder,'')); 
    values.forEach(v=> sel.append(new Option(v,v)));
  }

  fillSelect('breed', Constants.breeds, '-- Optional --');
  fillSelect('group', Constants.groups, '-- Optional --');
  fillSelect('obtainedMethod', Constants.obtainMethods, '-- Select --');

  // Parent tags
  function refreshParents(){
    const motherSel = qs('motherTag');
    const fatherSel = qs('fatherTag');
    motherSel.innerHTML = '<option value="">-- Optional --</option>';
    fatherSel.innerHTML = '<option value="">-- Optional --</option>';
    AnimalsModule.sows.forEach(s=> motherSel.append(new Option(s.tagNo, s.tagNo)));
    AnimalsModule.boars.forEach(b=> fatherSel.append(new Option(b.tagNo, b.tagNo)));
  }
  refreshParents();

  function setMessage(text,type){
    if(!msg) return;
    msg.textContent = text;
    msg.className = 'form-msg ' + (type||'');
  }

  function collect(){
    return {
      breed: qs('breed').value.trim(),
      tagNo: qs('tagNo').value.trim(),
      name: qs('name').value.trim(),
      litterNo: qs('litterNo').value.trim(),
      weight: qs('weight').value.trim(),
      gender: qs('gender').value.trim(),
      dob: qs('dob').value,
      entryDate: qs('entryDate').value,
      group: qs('group').value.trim(),
      obtainedMethod: qs('obtainedMethod').value.trim(),
      motherTag: qs('motherTag').value.trim(),
      fatherTag: qs('fatherTag').value.trim(),
      notes: qs('notes').value.trim()
      ,
      // include the selected File object (if any) so we can upload it before saving
      photo: (qs('photo') && qs('photo').files && qs('photo').files[0]) ? qs('photo').files[0] : null
    };
  }

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const data = collect();
    // Basic validation
    if(!data.tagNo){ setMessage('Tag number is required','error'); return; }
    if(!data.gender){ setMessage('Gender is required','error'); return; }
    if(!data.obtainedMethod){ setMessage('Obtained method is required','error'); return; }
    if(data.weight && Number(data.weight) < 0){ setMessage('Weight cannot be negative','error'); return; }

    // If a photo is provided, upload it first (direct browser -> Supabase Storage). No server code required.
    (async function(){
      const saveBtn = qs('saveBtn');
      if(saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }
      try{
        if(data.photo){
          if(!(window && window.sb && window.sb.storage)){
            console.warn('Supabase client or storage not available on window.sb — skipping upload.');
            setMessage('Storage client not available — image not uploaded','warning');
          } else {
            try{
              const bucket = 'pigs'; // bucket configured for images
              const name = data.photo.name || (data.tagNo || 'pig');
              const extMatch = name.match(/\.([a-zA-Z0-9]+)$/);
              const ext = extMatch? '.'+extMatch[1] : '';
              const filename = `${encodeURIComponent(data.tagNo || ('pig-'+Date.now()))}-${Date.now()}${ext}`;
              const path = filename; // store object key relative to bucket
              console.info('Uploading image to storage:', bucket, path);

              const { data: uploadData, error: uploadError } = await window.sb.storage.from(bucket).upload(path, data.photo, { upsert: false });
              console.info('uploadData:', uploadData, 'uploadError:', uploadError);
              if(uploadError){
                console.warn('Image upload failed', uploadError);
                setMessage('Image upload failed — pig saved without image','warning');
                // continue without image
              } else if(!uploadData || (!uploadData.path && !uploadData.Key && !uploadData.name)){
                // Some supabase runtimes return different shapes — but we expect at least a path/name
                console.warn('Upload returned unexpected shape; uploadData:', uploadData);
                setMessage('Image uploaded but returned unexpected result — pig saved without image','warning');
              } else {
                // Determine the stored path (prefer uploadData.path, fallback to filename)
                const storedPath = uploadData.path || uploadData.Key || uploadData.name || path;
                try{
                  // getPublicUrl returns an object like { data: { publicUrl } }
                  const pub = window.sb.storage.from(bucket).getPublicUrl(storedPath);
                  console.info('getPublicUrl response:', pub);
                  const publicUrl = pub && pub.data && (pub.data.publicUrl || pub.data.publicURL) ? (pub.data.publicUrl || pub.data.publicURL) : (pub && pub.publicUrl) || null;
                  if(publicUrl){
                    data.imageUrl = publicUrl;
                    console.info('Image uploaded, public url:', publicUrl);
                  } else {
                    console.warn('getPublicUrl returned no url; bucket may be private or require settings.');
                    setMessage('Image uploaded but bucket is not public; URL not available','warning');
                  }
                }catch(e){ console.warn('getPublicUrl failed', e); setMessage('Failed to get public image URL','warning'); }
              }
            }catch(e){ console.warn('Photo upload error', e); setMessage('Photo upload failed','warning'); }
          }
        } else {
          // no file selected — make this visible in the UI console for debugging
          console.info('No photo provided with the form submission.');
        }

        // proceed to add pig even if upload failed or there was no photo
        const res = AnimalsModule.addPig(data);
        if(!res.ok){ setMessage(res.error || 'Failed to add pig','error'); return; }

        setMessage('Pig saved successfully','success');
        form.reset();
        refreshParents(); // new parents available
      }catch(e){
        console.warn('Error saving pig', e);
        setMessage('Failed to save pig','error');
      }finally{
        if(saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
      }
    })();
  });

  form.addEventListener('reset', ()=>{
    setTimeout(()=> setMessage('', ''), 50);
  });
})();
