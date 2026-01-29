
-- Crear tabla de configuración global
CREATE TABLE public.global_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Concurso de Fotos',
  subtitle TEXT NOT NULL DEFAULT 'Participa y vota por tus favoritas',
  end_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insertar configuración inicial
INSERT INTO public.global_settings (title, subtitle) VALUES ('Concurso de Fotos', 'Participa y vota por tus favoritas');

-- Crear tabla de categorías
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insertar categorías iniciales
INSERT INTO public.categories (name, icon, description, display_order) VALUES
  ('Romántica', '💕', 'Fotos llenas de amor y romance', 1),
  ('Divertida', '🎉', 'Fotos que te harán sonreír', 2),
  ('Original', '✨', 'Fotos creativas y únicas', 3);

-- Crear tabla de usuarios
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name_normalized TEXT NOT NULL,
  device_id TEXT NOT NULL UNIQUE,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear índice para búsquedas por device_id
CREATE INDEX idx_users_device_id ON public.users(device_id);

-- Crear tabla de opciones (fotos)
CREATE TABLE public.options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  download_url TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  user_device_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear índices para las opciones
CREATE INDEX idx_options_user_id ON public.options(user_id);
CREATE INDEX idx_options_user_device_id ON public.options(user_device_id);

-- Crear tabla de votos
CREATE TABLE public.votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  option_id UUID REFERENCES public.options(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  user_device_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraint para evitar votos duplicados por usuario y categoría
  UNIQUE(user_device_id, category_id)
);

-- Crear índices para los votos
CREATE INDEX idx_votes_option_category ON public.votes(option_id, category_id);
CREATE INDEX idx_votes_user_device_category ON public.votes(user_device_id, category_id);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para lectura pública
CREATE POLICY "Allow public read access" ON public.global_settings FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.options FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.votes FOR SELECT USING (true);

-- Políticas RLS para escritura pública (necesario para dispositivos sin autenticación)
CREATE POLICY "Allow public insert access" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON public.options FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON public.votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.votes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.votes FOR DELETE USING (true);
CREATE POLICY "Allow public delete access" ON public.options FOR DELETE USING (true);
CREATE POLICY "Allow public update access" ON public.global_settings FOR UPDATE USING (true);

-- Crear bucket de storage para las fotos del concurso
INSERT INTO storage.buckets (id, name, public) VALUES ('contest-photos', 'contest-photos', true);

-- Política de storage para permitir subida y descarga pública
CREATE POLICY "Allow public uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'contest-photos');
CREATE POLICY "Allow public access" ON storage.objects FOR SELECT USING (bucket_id = 'contest-photos');
CREATE POLICY "Allow public delete" ON storage.objects FOR DELETE USING (bucket_id = 'contest-photos');
