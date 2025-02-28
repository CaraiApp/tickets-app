// scripts/prepare-db.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Inicializar el cliente de Supabase con el rol de servicio
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTables() {
  console.log('Creando tablas para multi-tenancy...');

  try {
    // 1. Crear tabla de organizaciones
    const { error: orgError } = await supabase.rpc('run_sql_query', {
      query: `
        CREATE TABLE IF NOT EXISTS organizations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          subscription_plan TEXT NOT NULL DEFAULT 'free',
          subscription_status TEXT NOT NULL DEFAULT 'active',
          stripe_customer_id TEXT,
          stripe_subscription_id TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (orgError) {
      throw new Error(`Error al crear tabla de organizaciones: ${orgError.message}`);
    }

    // 2. Crear tabla de perfiles de usuario
    const { error: profileError } = await supabase.rpc('run_sql_query', {
      query: `
        CREATE TABLE IF NOT EXISTS user_profiles (
          id UUID PRIMARY KEY REFERENCES auth.users,
          organization_id UUID REFERENCES organizations,
          role TEXT NOT NULL DEFAULT 'user',
          first_name TEXT,
          last_name TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (profileError) {
      throw new Error(`Error al crear tabla de perfiles de usuario: ${profileError.message}`);
    }

    // 3. Modificar tabla de tickets para agregar organization_id
    const { error: ticketsError } = await supabase.rpc('run_sql_query', {
      query: `
        -- Solo agregar la columna si no existe
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'tickets' AND column_name = 'organization_id'
          ) THEN
            ALTER TABLE tickets ADD COLUMN organization_id UUID REFERENCES organizations;
          END IF;
        END $$;
      `
    });

    if (ticketsError) {
      throw new Error(`Error al modificar tabla de tickets: ${ticketsError.message}`);
    }

    // 4. Modificar tabla de empleados para agregar organization_id
    const { error: empleadosError } = await supabase.rpc('run_sql_query', {
      query: `
        -- Solo agregar la columna si no existe
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'empleados' AND column_name = 'organization_id'
          ) THEN
            ALTER TABLE empleados ADD COLUMN organization_id UUID REFERENCES organizations;
          END IF;
        END $$;
      `
    });

    if (empleadosError) {
      throw new Error(`Error al modificar tabla de empleados: ${empleadosError.message}`);
    }

    // 5. Configurar RLS para tickets
    const { error: rls1Error } = await supabase.rpc('run_sql_query', {
      query: `
        -- Habilitar RLS
        ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
        
        -- Eliminar políticas existentes si las hay
        DROP POLICY IF EXISTS "Usuarios ven tickets de su organización" ON tickets;
        DROP POLICY IF EXISTS "Usuarios crean tickets en su organización" ON tickets;
        DROP POLICY IF EXISTS "Usuarios actualizan tickets de su organización" ON tickets;
        
        -- Crear nuevas políticas
        CREATE POLICY "Usuarios ven tickets de su organización" 
          ON tickets FOR SELECT 
          USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
        
        CREATE POLICY "Usuarios crean tickets en su organización" 
          ON tickets FOR INSERT 
          WITH CHECK (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
        
        CREATE POLICY "Usuarios actualizan tickets de su organización" 
          ON tickets FOR UPDATE 
          USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
      `
    });

    if (rls1Error) {
      throw new Error(`Error al configurar RLS para tickets: ${rls1Error.message}`);
    }

    // 6. Configurar RLS para empleados
    const { error: rls2Error } = await supabase.rpc('run_sql_query', {
      query: `
        -- Habilitar RLS
        ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
        
        -- Eliminar políticas existentes si las hay
        DROP POLICY IF EXISTS "Usuarios ven empleados de su organización" ON empleados;
        DROP POLICY IF EXISTS "Usuarios crean empleados en su organización" ON empleados;
        DROP POLICY IF EXISTS "Usuarios actualizan empleados de su organización" ON empleados;
        
        -- Crear nuevas políticas
        CREATE POLICY "Usuarios ven empleados de su organización" 
          ON empleados FOR SELECT 
          USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
        
        CREATE POLICY "Usuarios crean empleados en su organización" 
          ON empleados FOR INSERT 
          WITH CHECK (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
        
        CREATE POLICY "Usuarios actualizan empleados de su organización" 
          ON empleados FOR UPDATE 
          USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
      `
    });

    if (rls2Error) {
      throw new Error(`Error al configurar RLS para empleados: ${rls2Error.message}`);
    }

    // 7. Crear función para auto-asignar organization_id
    const { error: triggerError } = await supabase.rpc('run_sql_query', {
      query: `
        -- Función para asignar automáticamente organization_id
        CREATE OR REPLACE FUNCTION set_organization_id() 
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.organization_id := (SELECT organization_id FROM user_profiles WHERE id = auth.uid());
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        -- Trigger para tickets
        DROP TRIGGER IF EXISTS set_tickets_organization_id ON tickets;
        CREATE TRIGGER set_tickets_organization_id
        BEFORE INSERT ON tickets
        FOR EACH ROW
        EXECUTE FUNCTION set_organization_id();

        -- Trigger para empleados
        DROP TRIGGER IF EXISTS set_empleados_organization_id ON empleados;
        CREATE TRIGGER set_empleados_organization_id
        BEFORE INSERT ON empleados
        FOR EACH ROW
        EXECUTE FUNCTION set_organization_id();
      `
    });

    if (triggerError) {
      throw new Error(`Error al crear triggers: ${triggerError.message}`);
    }

    console.log('Base de datos configurada correctamente para multi-tenancy.');
  } catch (error) {
    console.error('Error al configurar la base de datos:', error);
    process.exit(1);
  }
}

createTables()
  .then(() => {
    console.log('Script completado con éxito.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error en el script:', error);
    process.exit(1);
  });