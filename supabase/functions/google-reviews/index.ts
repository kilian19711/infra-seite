// google-reviews: fetches rating + reviews of the Google Business Profile via the official Places API (New)
// and caches them in public.google_reviews (read by the website). Runs daily via pg_cron.
// Google returns at most 5 reviews per place – an API limit. Display must keep Google + author attribution.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   GOOGLE_PLACES_API_KEY  required (Google Cloud → APIs → "Places API (New)", restrict the key to this API)
//   GOOGLE_PLACE_ID        optional; if missing, the place is looked up once by name/address
import { createClient } from 'npm:@supabase/supabase-js@2';

const QUERY = 'L-mobile infrastructure IT-Systemhaus, Gartenstraße 51, 71560 Sulzbach an der Murr';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Same callers as fetch-news: cron (vault secret) or a signed-in editor.
  const cron = req.headers.get('x-cron-secret');
  let allowed = false;
  if (cron) allowed = (await admin.rpc('check_cron_secret', { s: cron })).data === true;
  else {
    const jwt = req.headers.get('authorization')?.replace(/^Bearer /, '');
    if (jwt) allowed = !!(await admin.auth.getUser(jwt)).data.user;
  }
  if (!allowed) return json({ error: 'unauthorized' }, 401);

  const key = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!key) return json({ error: 'GOOGLE_PLACES_API_KEY fehlt' }, 200);
  const g = (url: string, init: RequestInit, mask: string) =>
    fetch(url, { ...init, headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': mask, ...(init.headers ?? {}) } });

  let placeId = Deno.env.get('GOOGLE_PLACE_ID');
  if (!placeId) {
    const r = await g('https://places.googleapis.com/v1/places:searchText', { method: 'POST', body: JSON.stringify({ textQuery: QUERY, languageCode: 'de' }) }, 'places.id,places.displayName');
    if (!r.ok) return json({ error: `Places search ${r.status}: ${(await r.text()).slice(0, 300)}` }, 502);
    placeId = (await r.json()).places?.[0]?.id;
    if (!placeId) return json({ error: 'Unternehmensprofil nicht gefunden – GOOGLE_PLACE_ID setzen' }, 404);
  }

  const r = await g(`https://places.googleapis.com/v1/places/${placeId}?languageCode=de`, { method: 'GET' }, 'rating,userRatingCount,googleMapsUri,reviews');
  if (!r.ok) return json({ error: `Places details ${r.status}: ${(await r.text()).slice(0, 300)}` }, 502);
  const p = await r.json();

  const reviews = (p.reviews ?? []).map((v: Record<string, any>) => ({
    rating: v.rating,
    text: v.text?.text ?? v.originalText?.text ?? '',
    time: v.publishTime,
    relative: v.relativePublishTimeDescription,
    author: v.authorAttribution?.displayName ?? 'Google-Nutzer',
    author_url: v.authorAttribution?.uri ?? '',
    author_photo: v.authorAttribution?.photoUri ?? '',
    url: v.googleMapsUri ?? '',
  })).filter((v: { text: string }) => v.text);

  const { error } = await admin.from('google_reviews').update({
    rating: p.rating ?? null, total: p.userRatingCount ?? 0, maps_url: p.googleMapsUri ?? '', reviews, fetched_at: new Date().toISOString(),
  }).eq('id', 1);
  if (error) return json({ error: error.message }, 500);
  return json({ placeId, rating: p.rating, total: p.userRatingCount, reviews: reviews.length });
});
