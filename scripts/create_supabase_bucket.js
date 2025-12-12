// Create a Supabase Storage bucket using the service_role key
// Usage:
//   SUPABASE_URL="https://xyz.supabase.co" SUPABASE_SERVICE_ROLE="<service_role>" node scripts/create_supabase_bucket.js public true
// Arguments: <bucketName> [public]

const bucket = process.argv[2] || 'public';
const publicArg = process.argv[3];
const isPublic = publicArg === 'true' || publicArg === '1' || publicArg === 'public';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE;

if(!supabaseUrl || !serviceRole){
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE environment variables.');
  process.exit(1);
}

(async function(){
  try{
    const url = `${supabaseUrl.replace(/\/+$/,'')}/storage/v1/bucket`;
    const body = { name: bucket, public: !!isPublic };
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRole,
        'Authorization': `Bearer ${serviceRole}`
      },
      body: JSON.stringify(body)
    });
    const data = await res.text();
    console.log('Status:', res.status);
    try{ console.log('Response:', JSON.parse(data)); }catch(e){ console.log('Response text:', data); }
    if(res.status >= 200 && res.status < 300){
      console.log(`Bucket '${bucket}' created (public=${isPublic}).`);
    } else {
      console.error('Failed to create bucket.');
    }
  }catch(e){
    console.error('Error creating bucket:', e);
    process.exit(1);
  }
})();
