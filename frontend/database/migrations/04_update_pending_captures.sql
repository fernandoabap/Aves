-- Atualizar todas as capturas com status 'pending' para 'processed'
-- Isso corrige o problema do loading eterno nas imagens
UPDATE captures
SET status = 'processed'
WHERE status = 'pending';
