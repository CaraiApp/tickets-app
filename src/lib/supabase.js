import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Cliente para componentes del lado del cliente (autenticado)
export const createClient = () => {
  return createClientComponentClient();
};

// Cliente simple (para compatibilidad con código existente)
const supabase = createClientComponentClient();

// Cliente con permisos de servicio para operaciones administrativas
// IMPORTANTE: Solo usar en el servidor, nunca en el cliente
// Úsalo solo en API routes o Server Components
let supabaseAdmin;

if (typeof window === 'undefined') {
  supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Función helper para obtener la organización del usuario actual
export async function getUserOrganization() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) return null;
  
  const { data } = await supabase
    .from('user_profiles')
    .select('organization_id, organizations(*)')
    .eq('id', session.user.id)
    .single();
    
  return data?.organizations || null;
}

// Función helper para verificar si el usuario es admin
export async function isUserAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) return false;
  
  const { data } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
    
  return data?.role === 'admin' || data?.role === 'super_admin';
}

// Función helper para obtener el perfil completo del usuario
export async function getUserProfile() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) return null;
  
  const { data } = await supabase
    .from('user_profiles')
    .select('*, organizations(*)')
    .eq('id', session.user.id)
    .single();
    
  if (!data) return null;
  
  return {
    id: session.user.id,
    email: session.user.email,
    firstName: data.first_name,
    lastName: data.last_name,
    role: data.role,
    organization: data.organizations
  };
}

export { supabase, supabaseAdmin };
export default supabase;