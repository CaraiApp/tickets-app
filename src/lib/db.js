import mysql from 'mysql2/promise';

// Configuración de la conexión
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '35831'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectTimeout: 10000, // 10 segundos
  ssl: {
    // Si tu base de datos requiere SSL
    rejectUnauthorized: false
  }
};

// Función para obtener una conexión
export async function getConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    return connection;
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error);
    throw error;
  }
}

// Función para ejecutar una consulta
export async function query(sql, params) {
  const connection = await getConnection();
  try {
    const [results] = await connection.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Error al ejecutar la consulta:', error);
    throw error;
  } finally {
    await connection.end();
  }
}