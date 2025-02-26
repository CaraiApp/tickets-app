// src/app/api/test-db/route.js
import { getConnection } from '../../../lib/db';

export async function GET(request) {
  try {
    console.log('Intentando conectar con:');
    console.log('Host:', process.env.DB_HOST);
    console.log('Puerto:', process.env.DB_PORT);
    console.log('Usuario:', process.env.DB_USER);
    console.log('Base de datos:', process.env.DB_NAME);

    const connection = await getConnection();
    
    const [rows] = await connection.execute('SELECT 1 as test');
    
    await connection.end();

    return new Response(JSON.stringify({ 
      message: 'Conexión a la base de datos exitosa',
      result: rows[0].test 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error de conexión completo:', error);
    return new Response(JSON.stringify({ 
      message: 'Error al conectar a la base de datos',
      error: error.message,
      errorStack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}