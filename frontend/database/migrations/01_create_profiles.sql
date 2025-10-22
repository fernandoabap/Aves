-- Criar tabela de perfis
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  name varchar(255) not null,
  email varchar(255) not null unique,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  role varchar(50) default 'user' not null check (role in ('user', 'admin')),
  avatar_url text,
  organization varchar(255)
);

-- Habilitar o RLS (Row Level Security)
alter table public.profiles enable row level security;

-- Criar políticas de segurança
-- Permite qualquer pessoa ler os perfis
create policy "Perfis são visíveis para todos"
  on public.profiles
  for select
  using (true);

-- Permite usuários autenticados atualizarem seus próprios perfis
create policy "Usuários podem atualizar seus próprios perfis"
  on public.profiles
  for update
  using (auth.uid() = id);

-- Permite inserção apenas durante o registro
create policy "Perfis podem ser inseridos apenas durante o registro"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- Função para criar perfil automaticamente após o registro
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

-- Trigger para criar perfil após registro
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Função para atualizar o timestamp de updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger para atualizar o timestamp automaticamente
create trigger handle_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();