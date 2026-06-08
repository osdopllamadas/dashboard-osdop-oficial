import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Creamos la instancia del cliente para usar en todo el frontend.
// Nota: La Anon Key es pública y segura de exponer si tienes RLS configurado en la base de datos.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
