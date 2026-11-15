-- =====================================================================
--  B.CREA · installation de l'espace privé dans Supabase
--  À coller en une fois dans Supabase : SQL Editor → New query → Run
-- =====================================================================

-- Adresse(s) email autorisées à modifier le site.
-- Pour en ajouter une : ajoutez-la dans la liste, par exemple
--   array['b.crea30@gmail.com', 'autre@exemple.fr']
create or replace function public.est_admin() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') = any (array['b.crea30@gmail.com'])
$$;

-- Double authentification : une fois activée sur un compte,
-- toute modification exige d'avoir saisi le code (niveau « aal2 »).
create or replace function public.double_auth_ok() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select (auth.jwt() ->> 'aal') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = auth.uid() and f.status = 'verified'
      )
$$;

-- ---------------------------------------------------------------------
--  Contenus du site (textes, boutique, À la une, galerie, tarifs, avis…)
-- ---------------------------------------------------------------------
create table if not exists public.contenu (
  cle    text primary key,
  valeur jsonb not null default '{}'::jsonb,
  maj    timestamptz not null default now()
);
alter table public.contenu enable row level security;

drop policy if exists "contenu lecture publique" on public.contenu;
create policy "contenu lecture publique" on public.contenu
  for select using (true);

drop policy if exists "contenu ajout admin" on public.contenu;
create policy "contenu ajout admin" on public.contenu
  for insert to authenticated with check (public.est_admin() and public.double_auth_ok());

drop policy if exists "contenu modif admin" on public.contenu;
create policy "contenu modif admin" on public.contenu
  for update to authenticated using (public.est_admin() and public.double_auth_ok())
  with check (public.est_admin() and public.double_auth_ok());

drop policy if exists "contenu suppression admin" on public.contenu;
create policy "contenu suppression admin" on public.contenu
  for delete to authenticated using (public.est_admin() and public.double_auth_ok());

-- ---------------------------------------------------------------------
--  Photos : dossier public « photos », envoi réservé à l'administratrice
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true;

drop policy if exists "photos lecture" on storage.objects;
create policy "photos lecture" on storage.objects
  for select using (bucket_id = 'photos');

drop policy if exists "photos ajout" on storage.objects;
create policy "photos ajout" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and public.est_admin() and public.double_auth_ok());

drop policy if exists "photos modif" on storage.objects;
create policy "photos modif" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and public.est_admin() and public.double_auth_ok());

drop policy if exists "photos suppression" on storage.objects;
create policy "photos suppression" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and public.est_admin() and public.double_auth_ok());
