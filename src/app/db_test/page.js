// Para Next.js con el directorio pages:
import { useState, useEffect } from 'react';

export default function DbTest() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await fetch('/api/db-test-internal');
        const data = await response.json();
        setResult(data);
      } catch (err) {
        setError(err.message);
      }
    };
    
    testConnection();
  }, []);
  
  return (
    <div>
      <h1>Prueba de conexión a la base de datos</h1>
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      {result && (
        <div>
          <p>Estado: {result.success ? 'Exitoso' : 'Fallido'}</p>
          <p>Mensaje: {result.message}</p>
          <pre>{JSON.stringify(result.data || result.error, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}