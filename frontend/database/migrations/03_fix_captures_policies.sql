-- Corrigir políticas de segurança para a tabela captures
drop policy if exists "Usuários podem inserir suas próprias capturas" on captures;
drop policy if exists "Usuários podem ver suas próprias capturas" on captures;
drop policy if exists "Usuários podem atualizar suas próprias capturas" on captures;
drop policy if exists "Usuários podem deletar suas próprias capturas" on captures;

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