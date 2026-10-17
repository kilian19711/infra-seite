-- Applied as migration "fetch_news_cron" (kept here for reference / re-creation).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Random secret generated inside the DB; nobody needs to copy it anywhere.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'fetch_news_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'fetch_news_cron_secret');
  end if;
end $$;

create or replace function public.check_cron_secret(s text) returns boolean
language sql security definer set search_path = '' as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'fetch_news_cron_secret' and decrypted_secret = s);
$$;
revoke all on function public.check_cron_secret(text) from public, anon, authenticated;
grant execute on function public.check_cron_secret(text) to service_role;

-- Every morning 06:00 UTC (= 07:00 Winterzeit / 08:00 Sommerzeit).
select cron.unschedule('fetch-news-morning') where exists (select 1 from cron.job where jobname = 'fetch-news-morning');
select cron.schedule('fetch-news-morning', '0 6 * * *', $$
  select net.http_post(
    url := 'https://rwqqipmhoqlrmxsfgyzk.supabase.co/functions/v1/fetch-news',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'fetch_news_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$$);
