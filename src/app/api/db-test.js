// pages/api/db-test.js
import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  try {
    // Crear conexión
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    // Realizar una consulta simple
    const [rows] = await connection.execute('SELECT 1 as test');
    
    // Cerrar conexión
    await connection.end();
    
    // Responder con éxito
    res.status(200).json({ 
      success: true, 
      message: 'Conexión a la base de datos exitosa',
      data: rows 
    });
  } catch (error) {
    // Responder con error
    res.status(500).json({ 
      success: false, 
      message: 'Error de conexión a la base de datos', 
      error: error.message 
    });
  }
}