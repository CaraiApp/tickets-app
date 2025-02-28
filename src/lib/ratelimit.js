import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Crea una instancia de Redis (necesitarás configurar Upstash Redis)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL || '',
  token: process.env.UPSTASH_REDIS_TOKEN || '',
});

// Crear un limitador de 10 solicitudes por 10 segundos
export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});