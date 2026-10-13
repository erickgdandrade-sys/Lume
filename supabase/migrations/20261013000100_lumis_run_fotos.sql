-- Fotos do ranking (opcionais, com autorização da pessoa). Leitura pública,
-- gravação só pela função de servidor. Apague tudo depois do evento.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lumis-fotos', 'lumis-fotos', true, 102400, array['image/jpeg'])
on conflict (id) do nothing;
