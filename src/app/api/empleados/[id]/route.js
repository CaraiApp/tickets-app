import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// POST /api/empleados - Crear un empleado nuevo
export async function POST(request) {
  try {
    const data = await request.json();
    const { nombre, apellidos, dni, telefono, firma } = data;
    
    console.log("Datos recibidos:", data); // Para debugging
    
    // Validaciones básicas
    if (!nombre || !apellidos || !dni) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }
    
    // Insertar empleado
    const { data: newEmpleado, error } = await supabase
      .from('empleados')
      .insert([
        { nombre, apellidos, dni, telefono, firma_url: firma }
      ])
      .select();
    
    if (error) {
      console.error("Error de Supabase:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    console.log("Empleado creado:", newEmpleado);
    
    return NextResponse.json({ 
      id: newEmpleado?.[0]?.id,
      ...data,
      success: true
    });
  } catch (error) {
    console.error('Error al crear empleado:', error);
    return NextResponse.json(
      { error: 'Error al crear el empleado: ' + error.message },
      { status: 500 }
    );
  }
}

// PUT /api/empleados/[id] - Actualizar un empleado
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();
    const { nombre, apellidos, dni, telefono, firma } = data;
    
    // Validaciones básicas
    if (!nombre || !apellidos || !dni) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }
    
    // Actualizar empleado en la base de datos
    const { data: updatedEmpleado, error } = await supabase
      .from('empleados')
      .update({ nombre, apellidos, dni, telefono, firma_url: firma })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error("Error de Supabase:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    if (!updatedEmpleado || updatedEmpleado.length === 0) {
      return NextResponse.json(
        { error: 'Empleado no encontrado o no se realizaron cambios' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      id,
      nombre,
      apellidos,
      dni,
      telefono
    });
  } catch (error) {
    console.error('Error al actualizar empleado:', error);
    return NextResponse.json(
      { error: `Error al actualizar el empleado: ${error.message}` },
      { status: 500 }
    );
  }
}

// DELETE /api/empleados/[id] - Eliminar un empleado
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    // Primero, eliminar todos los artículos de los tickets del empleado
    const { error: itemsError } = await supabase
      .from('items_ticket')
      .delete()
      .in('ticket_id', 
        supabase
          .from('tickets')
          .select('id')
          .eq('empleado_id', id)
      );
    
    if (itemsError) {
      console.error("Error al eliminar items de tickets:", itemsError);
      return NextResponse.json(
        { error: itemsError.message },
        { status: 500 }
      );
    }
    
    // Luego, eliminar los tickets del empleado
    const { error: ticketsError } = await supabase
      .from('tickets')
      .delete()
      .eq('empleado_id', id);
    
    if (ticketsError) {
      console.error("Error al eliminar tickets:", ticketsError);
      return NextResponse.json(
        { error: ticketsError.message },
        { status: 500 }
      );
    }
    
    // Finalmente, eliminar al empleado
    const { error: empleadoError, count } = await supabase
      .from('empleados')
      .delete()
      .eq('id', id)
      .select('count');
    
    if (empleadoError) {
      console.error("Error al eliminar empleado:", empleadoError);
      return NextResponse.json(
        { error: empleadoError.message },
        { status: 500 }
      );
    }
    
    if (count === 0) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar empleado:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el empleado: ' + error.message },
      { status: 500 }
    );
  }
}

// GET /api/empleados/[id] - Obtener un empleado específico
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    // Obtener datos del empleado
    const { data: empleado, error: empleadoError } = await supabase
      .from('empleados')
      .select('*')
      .eq('id', id)
      .single();
    
    if (empleadoError) {
      console.error("Error al obtener empleado:", empleadoError);
      return NextResponse.json(
        { error: empleadoError.message },
        { status: 500 }
      );
    }
    
    if (!empleado) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }
    
    // Obtener tickets del empleado
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .eq('empleado_id', id)
      .order('fecha', { ascending: false });
    
    if (ticketsError) {
      console.error("Error al obtener tickets:", ticketsError);
      return NextResponse.json(
        { error: ticketsError.message },
        { status: 500 }
      );
    }
    
    // Obtener items de los tickets
    for (const ticket of tickets) {
      const { data: items, error: itemsError } = await supabase
        .from('items_ticket')
        .select('*')
        .eq('ticket_id', ticket.id);
      
      if (itemsError) {
        console.error("Error al obtener items de ticket:", itemsError);
        continue;
      }
      
      ticket.items = items || [];
    }
    
    // Obtener estadísticas (total tickets y total gastado)
    const { data: estadisticasData, error: estadisticasError } = await supabase
      .from('tickets')
      .select('id, total')
      .eq('empleado_id', id);
    
    if (estadisticasError) {
      console.error("Error al obtener estadísticas:", estadisticasError);
      return NextResponse.json(
        { error: estadisticasError.message },
        { status: 500 }
      );
    }
    
    const estadisticas = {
      total_tickets: estadisticasData.length,
      total_gastado: estadisticasData.reduce((sum, ticket) => sum + (ticket.total || 0), 0)
    };
    
    // Obtener productos más consumidos (esto es más complejo en Supabase)
    // Aquí usamos un enfoque diferente ya que Supabase no soporta JOINs complejos como MySQL
    const { data: todosItems, error: itemsConsumidosError } = await supabase
      .from('items_ticket')
      .select('descripcion, precio, ticket_id')
      .in('ticket_id', 
        supabase
          .from('tickets')
          .select('id')
          .eq('empleado_id', id)
      );
    
    if (itemsConsumidosError) {
      console.error("Error al obtener productos consumidos:", itemsConsumidosError);
      return NextResponse.json(
        { error: itemsConsumidosError.message },
        { status: 500 }
      );
    }
    
    // Procesamos los productos más consumidos manualmente
    const productosMap = {};
    todosItems.forEach(item => {
      if (!productosMap[item.descripcion]) {
        productosMap[item.descripcion] = {
          nombre: item.descripcion,
          cantidad: 0,
          total: 0
        };
      }
      
      productosMap[item.descripcion].cantidad += 1;
      productosMap[item.descripcion].total += item.precio || 0;
    });
    
    const productosMasConsumidos = Object.values(productosMap)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
    
    return NextResponse.json({
      empleado,
      tickets,
      estadisticas: {
        totalGastado: estadisticas.total_gastado || 0,
        numeroTickets: estadisticas.total_tickets || 0,
        productosMasConsumidos
      }
    });
  } catch (error) {
    console.error('Error al obtener datos del empleado:', error);
    return NextResponse.json(
      { error: 'Error al obtener los datos del empleado: ' + error.message },
      { status: 500 }
    );
  }
}