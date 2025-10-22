-- Verificar e criar tabelas se não existirem
create table if not exists public.captures (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  image_url text not null,
  thumbnail_url text,
  created_at timestamptz default now() not null,
  location point,
  confidence decimal(5,2),
  status varchar(50) default 'pending' not null check (status in ('pending', 'processed', 'failed')),
  metadata jsonb default '{}'::jsonb
);

create table if not exists public.bird_detections (
  id uuid default gen_random_uuid() primary key,
  capture_id uuid references public.captures on delete cascade not null,
  species_name varchar(255) not null,
  confidence decimal(5,2) not null,
  bounding_box jsonb,
  created_at timestamptz default now() not null,
  metadata jsonb default '{}'::jsonb
);

-- Habilitar RLS nas tabelas
alter table public.captures enable row level security;
alter table public.bird_detections enable row level security;

-- Corrigir políticas de segurança para a tabela captures
drop policy if exists "Usuários podem inserir suas próprias capturas" on public.captures;
drop policy if exists "Usuários podem ver suas próprias capturas" on public.captures;
drop policy if exists "Usuários podem atualizar suas próprias capturas" on public.captures;
drop policy if exists "Usuários podem deletar suas próprias capturas" on public.captures;
drop policy if exists "Permitir inserção para usuários autenticados" on public.captures;
drop policy if exists "Permitir visualização para usuários autenticados" on public.captures;
drop policy if exists "Permitir atualização para usuários autenticados" on public.captures;
drop policy if exists "Permitir deleção para usuários autenticados" on public.captures;

-- Política para permitir inserção
create policy "Permitir inserção para usuários autenticados"
  on public.captures
  for insert
  with check (auth.uid() = user_id);

-- Política para permitir visualização
create policy "Permitir visualização para usuários autenticados"
  on public.captures
  for select
  using (auth.uid() = user_id);

-- Política para permitir atualização
create policy "Permitir atualização para usuários autenticados"
  on public.captures
  for update
  using (auth.uid() = user_id);

-- Política para permitir deleção
create policy "Permitir deleção para usuários autenticados"
  on public.captures
  for delete
  using (auth.uid() = user_id);

-- Verificar e criar bucket se não existir
insert into storage.buckets (id, name, public)
select 'bird-images', 'bird-images', true
where not exists (
  select 1 from storage.buckets where id = 'bird-images'
);

-- Atualizar as políticas do bucket de storage
drop policy if exists "Imagens são publicamente visíveis" on storage.objects;
drop policy if exists "Usuários podem fazer upload de imagens" on storage.objects;
drop policy if exists "Usuários podem deletar suas próprias imagens" on storage.objects;

-- Política para permitir leitura pública das imagens
create policy "Imagens são publicamente visíveis"
  on storage.objects for select
  using ( bucket_id = 'bird-images' );

-- Política para permitir upload de imagens
create policy "Usuários podem fazer upload de imagens"
  on storage.objects for insert
  with check (
    auth.role() = 'authenticated' AND
    bucket_id = 'bird-images'
  );

-- Política para permitir deleção de imagens
create policy "Usuários podem deletar suas próprias imagens"
  on storage.objects for delete
  using (
    auth.role() = 'authenticated' AND
    bucket_id = 'bird-images'
  );