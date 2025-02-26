import mysql from 'mysql2/promise';
import url from 'url';
import net from 'net';

// Parsea la URL de Fixie si está disponible
const fixieUrl = process.env.FIXIE_URL;
const fixieConfig = fixieUrl ? url.parse(fixieUrl) : null;

// Función para probar la conexión del proxy
const testProxyConnection = (hostname, port) => {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    
    socket.setTimeout(5000);
    
    socket.on('connect', () => {
      socket.destroy();
      console.log(`Conexión exitosa al proxy: ${hostname}:${port}`);
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      console.error(`Timeout conectando al proxy: ${hostname}:${port}`);
      reject(new Error('Proxy connection timeout'));
    });
    
    socket.on('error', (error) => {
      console.error(`Error conectando al proxy: ${hostname}:${port}`, error);
      reject(error);
    });
    
    socket.connect(port, hostname);
  });
};

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

// Si Fixie está configurado, añade las opciones de proxy
if (fixieConfig && fixieConfig.auth) {
  const [proxyUser, proxyPass] = fixieConfig.auth.split(':');
  
  dbConfig.socketPath = fixieConfig.hostname;
  
  // Añade configuración de proxy si es necesario
  dbConfig.agent = {
    protocol: 'http:',
    host: fixieConfig.hostname,
    port: fixieConfig.port,
    auth: {
      username: proxyUser,
      password: proxyPass
    }
  };
}

// Función para obtener una conexión
export async function getConnection() {
  try {
    // Prueba la conexión del proxy si está configurado
    if (fixieConfig) {
      try {
        await testProxyConnection(fixieConfig.hostname, parseInt(fixieConfig.port || '80'));
      } catch (proxyError) {
        console.error('Error con la conexión del proxy:', proxyError);
        // Puedes decidir si quieres continuar o lanzar un error
      }
    }

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