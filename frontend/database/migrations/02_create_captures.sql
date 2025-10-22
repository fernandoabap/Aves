-- Criar tabela de capturas
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

-- Criar tabela de detecções de aves
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

-- Políticas de segurança para capturas
create policy "Usuários podem ver suas próprias capturas"
  on public.captures
  for select
  using (auth.uid() = user_id);

create policy "Usuários podem inserir suas próprias capturas"
  on public.captures
  for insert
  with check (auth.uid() = user_id);

create policy "Usuários podem atualizar suas próprias capturas"
  on public.captures
  for update
  using (auth.uid() = user_id);

create policy "Usuários podem deletar suas próprias capturas"
  on public.captures
  for delete
  using (auth.uid() = user_id);

-- Políticas de segurança para detecções
create policy "Usuários podem ver detecções de suas capturas"
  on public.bird_detections
  for select
  using (
    exists (
      select 1 from public.captures
      where captures.id = bird_detections.capture_id
      and captures.user_id = auth.uid()
    )
  );

-- Criar função para obter estatísticas de detecção
create or replace function public.get_user_detection_stats(user_id uuid)
returns table (
  total_captures bigint,
  total_species bigint,
  avg_confidence numeric,
  last_capture_date timestamptz
)
language sql
security definer
set search_path = public
as $$
  select 
    count(distinct c.id) as total_captures,
    count(distinct bd.species_name) as total_species,
    avg(bd.confidence) as avg_confidence,
    max(c.created_at) as last_capture_date
  from captures c
  left join bird_detections bd on c.id = bd.capture_id
  where c.user_id = $1;
$$;