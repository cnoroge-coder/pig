Create a Supabase Storage bucket for pig images

Overview
- The frontend uploads images directly from the browser to Supabase Storage.
- The `pig-form.js` script defaults to bucket name `pigs` in this repo. You can change the bucket string in `site/assets/pig-form.js` if you prefer another name.

Options to create a bucket

A) Dashboard (recommended, easiest)
1. Open your Supabase project dashboard.
2. Click "Storage" in the left menu.
3. Click "Create a new bucket".
  - Name: pigs (or your chosen name)
  - Public: ON (if you want getPublicUrl() to return usable public URLs)
4. Click Create.
5. Verify you can see the bucket and its settings. If public, uploaded files will be accessible via getPublicUrl().

B) CLI / script using the service_role key
- Creating buckets via API requires an admin/service_role key. Use this only locally and never commit the service_role key.

Usage (Node, provided script):

1. Install Node.js (v18+ recommended for built-in fetch) if you don't have it.
2. From the repo root run:

  SUPABASE_URL="https://<your-project>.supabase.co" \
  SUPABASE_SERVICE_ROLE="<your_service_role_key>" \
  node scripts/create_supabase_bucket.js pigs true

- Arguments: <bucketName> [public]
  - public true  -> creates the bucket as public
  - public false -> creates the bucket as private

C) curl (quick)

Replace <SUPABASE_URL> and <SERVICE_ROLE> with your values:

curl -X POST "<SUPABASE_URL>/storage/v1/bucket" \
  -H "Authorization: Bearer <SERVICE_ROLE>" \
  -H "apikey: <SERVICE_ROLE>" \
  -H "Content-Type: application/json" \
  -d '{"name":"public","public":true}'

After creation
  - If you created the bucket as `public` (or made it public):
  - The frontend's call to `getPublicUrl(path)` will return a usable public URL.
- If you created it as private:
  - Consider storing `image_path` (the object path) instead of `image_url`, and obtain signed URLs for display using `createSignedUrl(path, expiry)` or a server-side endpoint using the service_role key.

Updating frontend
- If you picked a different bucket name, update the variable in `site/assets/pig-form.js`:

  const bucket = '<your-bucket-name>';

Security notes
- Never commit the service_role key to the repository.
- For public buckets, uploaded images are accessible by anyone with the URL.
- For private usage, prefer signed URLs.

Important: credentials exposed in chat or logs
- If you accidentally pasted your service_role key, S3 access key, or secret into any chat or public place (including this project files or issue trackers), you should rotate/revoke them immediately.
- To rotate keys in Supabase: open Project Settings → API, and rotate the service_role key. If you created S3-compatible keys for object storage, revoke them in your storage provider's console.
- After rotating, update any environment variables or client configs that used the old key.
