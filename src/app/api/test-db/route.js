import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Consulta simple para probar conexión
    const result = await query('SELECT 1 as test');
    
    return NextResponse.json({ 
      message: 'Conexión exitosa',
      result: result[0].test 
    });
  } catch (error) {
    console.error('Error en la conexión:', error);
    return NextResponse.json(
      { 
        message: 'Error en la conexión', 
        error: error.message,
        fullError: error
      }, 
      { status: 500 }
    );
  }
}