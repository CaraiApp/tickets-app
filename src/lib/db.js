import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Crear cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Función para ejecutar una consulta SQL directa (Ejemplo: SELECT)
export async function query(sql) {
  try {
    const { data, error } = await supabase.rpc('run_sql', { query: sql });

    if (error) {
      console.error('Error al ejecutar la consulta:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error en la función query:', error);
    throw error;
  }
}
