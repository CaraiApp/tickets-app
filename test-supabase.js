require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('Probando conexión a Supabase...');
    const { data, error } = await supabase.from('empleados').select('count');
    
    if (error) {
      console.error('Error de conexión:', error);
      return;
    }
    
    console.log('Conexión exitosa!');
    console.log('Datos recibidos:', data);
  } catch (err) {
    console.error('Error inesperado:', err);
  }
}

testConnection();