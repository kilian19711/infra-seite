-- L-mobile Website · Redaktionssystem
-- Tables: authors (profile per editor), posts (news commentary), suggestions (morning source check + AI drafts)
-- Access: public reads published posts + author names; only signed-in editors write. Sign-ups stay disabled –
-- editors are invited in the Supabase dashboard (Authentication → Users → Invite).

create table if not exists public.authors (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  role text default '',
  bio text default '',
  avatar_url text default '',
  updated_at timestamptz default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  title text not null check (length(title) between 5 and 200),
  summary text default '' check (length(summary) <= 300),
  body_md text default '',
  cover_url text default '',
  tags text[] default '{}',
  services text[] default '{}',
  source text default '',
  source_url text default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  author_id uuid references public.authors on delete set null,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists posts_published_idx on public.posts (status, published_at desc);
create index if not exists posts_author_idx on public.posts (author_id);

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  url text unique,
  title text not null,
  teaser text default '',
  published_at timestamptz,
  relevance int default 0 check (relevance between 0 and 10),
  reason text default '',
  draft_title text default '',
  draft_summary text default '',
  draft_body_md text default '',
  tags text[] default '{}',
  services text[] default '{}',
  status text not null default 'new' check (status in ('new', 'used', 'dismissed')),
  created_at timestamptz default now()
);
create index if not exists suggestions_new_idx on public.suggestions (status, relevance desc, created_at desc);

alter table public.authors enable row level security;
alter table public.posts enable row level security;
alter table public.suggestions enable row level security;

-- Public website
drop policy if exists "public reads authors" on public.authors;
create policy "public reads authors" on public.authors for select using (true);
drop policy if exists "public reads published posts" on public.posts;
create policy "public reads published posts" on public.posts for select to anon using (status = 'published');

-- Editors (any signed-in user; sign-ups disabled, users are invited)
drop policy if exists "editors manage own profile" on public.authors;
create policy "editors insert own profile" on public.authors for insert to authenticated with check (id = (select auth.uid()));
create policy "editors update own profile" on public.authors for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists "editors read all posts" on public.posts;
create policy "editors read all posts" on public.posts for select to authenticated using (true);
drop policy if exists "editors write posts" on public.posts;
create policy "editors write posts" on public.posts for insert to authenticated with check (true);
drop policy if exists "editors update posts" on public.posts;
create policy "editors update posts" on public.posts for update to authenticated using (true) with check (true);
drop policy if exists "editors delete posts" on public.posts;
create policy "editors delete posts" on public.posts for delete to authenticated using (true);
drop policy if exists "editors read suggestions" on public.suggestions;
create policy "editors read suggestions" on public.suggestions for select to authenticated using (true);
drop policy if exists "editors update suggestions" on public.suggestions;
create policy "editors update suggestions" on public.suggestions for update to authenticated using (true) with check (true);
-- suggestions are inserted only by the fetch-news edge function (service role bypasses RLS)

-- Media bucket: public read, editors upload (max 5 MB images)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "editors upload media" on storage.objects;
create policy "editors upload media" on storage.objects for insert to authenticated with check (bucket_id = 'media');
drop policy if exists "editors update media" on storage.objects;
create policy "editors update media" on storage.objects for update to authenticated using (bucket_id = 'media');
drop policy if exists "editors delete media" on storage.objects;
create policy "editors delete media" on storage.objects for delete to authenticated using (bucket_id = 'media');
