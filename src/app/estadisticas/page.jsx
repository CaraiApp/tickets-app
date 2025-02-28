'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

export default function Estadisticas() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [datosAnuales, setDatosAnuales] = useState([]);
  const [datosMensuales, setDatosMensuales] = useState([]);
  const [empleadosData, setEmpleadosData] = useState([]);
  const [filtroTiempo, setFiltroTiempo] = useState('mensual');
  const [añoSeleccionado, setAñoSeleccionado] = useState(new Date().getFullYear());
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1);
  const [resumen, setResumen] = useState({
    totalGastado: 0,
    ticketsMasAltos: [],
    gastoPromedio: 0
  });

  // Colores para gráficos
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];
  
  // Nombres de los meses
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Obtener datos del usuario actual
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          window.location.href = '/login';
          return;
        }
        
        // Obtener organización del usuario
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', session.user.id)
          .single();
          
        if (profileError) throw new Error(`Error al obtener perfil: ${profileError.message}`);
        
        const organizationId = profile.organization_id;
        
        // Obtener todos los tickets de la organización
        const { data: tickets, error: ticketsError } = await supabase
          .from('tickets')
          .select('id, total, fecha, empleado_id')
          .eq('organization_id', organizationId);
          
        if (ticketsError) throw new Error(`Error al obtener tickets: ${ticketsError.message}`);
        
        // Obtener todos los empleados de la organización
        const { data: empleados, error: empleadosError } = await supabase
          .from('empleados')
          .select('id, nombre, apellidos')
          .eq('organization_id', organizationId);
          
        if (empleadosError) throw new Error(`Error al obtener empleados: ${empleadosError.message}`);
        
        // Procesar datos para estadísticas
        procesarDatos(tickets, empleados);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message || 'Error al cargar los datos de estadísticas');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [añoSeleccionado, mesSeleccionado]);
  
  const procesarDatos = (tickets, empleados) => {
    if (!tickets || !tickets.length) {
      setDatosAnuales([]);
      setDatosMensuales([]);
      setEmpleadosData([]);
      return;
    }
    
    // Mapear IDs de empleados a nombres
    const empleadosMap = {};
    empleados.forEach(emp => {
      empleadosMap[emp.id] = `${emp.nombre} ${emp.apellidos}`;
    });
    
    // Procesar tickets y limpiar valores de total
    const ticketsProcessed = tickets.map(ticket => {
      let total = 0;
      if (ticket.total !== null && ticket.total !== undefined) {
        if (typeof ticket.total === 'string') {
          // Limpiar el string de símbolos de moneda o comas
          const cleanTotal = ticket.total.replace(/[^0-9.,]/g, '').replace(',', '.');
          total = parseFloat(cleanTotal) || 0;
        } else {
          total = parseFloat(ticket.total) || 0;
        }
      }
      
      // Asegurarse de que la fecha sea un objeto Date
      let fecha = ticket.fecha;
      if (typeof fecha === 'string') {
        fecha = new Date(fecha);
      }
      
      return {
        ...ticket,
        total: total,
        fecha: fecha,
        empleadoNombre: empleadosMap[ticket.empleado_id] || 'Desconocido'
      };
    });
    
    // Ordenar tickets por fecha
    ticketsProcessed.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    
    // Calcular gastos por año
    const gastosPorAño = {};
    
    ticketsProcessed.forEach(ticket => {
      const fecha = new Date(ticket.fecha);
      const año = fecha.getFullYear();
      
      if (!gastosPorAño[año]) {
        gastosPorAño[año] = 0;
      }
      
      gastosPorAño[año] += ticket.total;
    });
    
    // Formatear datos anuales para gráficos
    const datosAnualesArray = Object.keys(gastosPorAño).map(año => ({
      name: año,
      total: parseFloat(gastosPorAño[año].toFixed(2))
    }));
    
    setDatosAnuales(datosAnualesArray);
    
    // Calcular gastos por mes para el año seleccionado
    const gastosPorMes = Array(12).fill(0);
    const ticketsPorMes = Array(12).fill(0);
    
    ticketsProcessed.forEach(ticket => {
      const fecha = new Date(ticket.fecha);
      const año = fecha.getFullYear();
      const mes = fecha.getMonth(); // 0-indexed
      
      if (año === añoSeleccionado) {
        gastosPorMes[mes] += ticket.total;
        ticketsPorMes[mes]++;
      }
    });
    
    // Formatear datos mensuales para gráficos
    const datosMensualesArray = meses.map((nombreMes, index) => ({
      name: nombreMes,
      total: parseFloat(gastosPorMes[index].toFixed(2)),
      tickets: ticketsPorMes[index]
    }));
    
    setDatosMensuales(datosMensualesArray);
    
    // Calcular datos por empleado
    const gastosPorEmpleado = {};
    const ticketsPorEmpleado = {};
    
    ticketsProcessed.forEach(ticket => {
      const empleadoId = ticket.empleado_id;
      const empleadoNombre = empleadosMap[empleadoId] || 'Desconocido';
      
      if (!gastosPorEmpleado[empleadoNombre]) {
        gastosPorEmpleado[empleadoNombre] = 0;
        ticketsPorEmpleado[empleadoNombre] = 0;
      }
      
      gastosPorEmpleado[empleadoNombre] += ticket.total;
      ticketsPorEmpleado[empleadoNombre]++;
    });
    
    // Formatear datos de empleados para gráficos
    const empleadosDataArray = Object.keys(gastosPorEmpleado).map(nombre => ({
      name: nombre,
      total: parseFloat(gastosPorEmpleado[nombre].toFixed(2)),
      tickets: ticketsPorEmpleado[nombre]
    }));
    
    setEmpleadosData(empleadosDataArray);
    
    // Calcular datos de resumen
    const totalGastado = ticketsProcessed.reduce((sum, ticket) => sum + ticket.total, 0);
    const gastoPromedio = totalGastado / ticketsProcessed.length;
    
    // Encontrar los 5 tickets con montos más altos
    const ticketsMasAltos = [...ticketsProcessed]
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map(ticket => ({
        id: ticket.id,
        total: ticket.total,
        fecha: new Date(ticket.fecha).toLocaleDateString(),
        empleado: ticket.empleadoNombre
      }));
    
    setResumen({
      totalGastado: parseFloat(totalGastado.toFixed(2)),
      ticketsMasAltos,
      gastoPromedio: parseFloat(gastoPromedio.toFixed(2))
    });
  };
  
  const formatoEuro = (value) => {
    return `${value.toLocaleString('es-ES')}€`;
  };
  
  // Generar lista de años disponibles
  const añosDisponibles = Array.from(
    { length: new Date().getFullYear() - 2020 + 1 }, 
    (_, i) => 2020 + i
  );
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 max-w-md w-full">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
        <Link 
          href="/estadisticas" 
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
        >
          Reintentar
        </Link>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Encabezado */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <Link 
            href="/dashboard" 
            className="text-blue-500 hover:text-blue-700 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al Dashboard
          </Link>
          
          <div className="flex space-x-2">
            <select 
              value={añoSeleccionado}
              onChange={(e) => setAñoSeleccionado(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              {añosDisponibles.map((año) => (
                <option key={año} value={año}>{año}</option>
              ))}
            </select>
            
            <select 
              value={filtroTiempo}
              onChange={(e) => setFiltroTiempo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="mensual">Vista Mensual</option>
              <option value="anual">Vista Anual</option>
              <option value="empleados">Por Empleado</option>
            </select>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-800">Estadísticas de Gastos</h1>
        <p className="text-gray-600 mt-2">
          Visualiza y analiza los gastos de tu organización a lo largo del tiempo
        </p>
      </div>
      
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Gastado ({añoSeleccionado})</h3>
          <p className="text-3xl font-bold text-blue-600">{resumen.totalGastado.toLocaleString('es-ES')}€</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Gasto Promedio por Ticket</h3>
          <p className="text-3xl font-bold text-green-600">{resumen.gastoPromedio.toLocaleString('es-ES')}€</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Tickets ({añoSeleccionado})</h3>
          <p className="text-3xl font-bold text-purple-600">
            {datosMensuales.reduce((sum, month) => sum + month.tickets, 0)}
          </p>
        </div>
      </div>
      
      {/* Gráficos principales */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6">
          {filtroTiempo === 'anual' ? 'Gastos Anuales' : 
           filtroTiempo === 'mensual' ? `Gastos Mensuales (${añoSeleccionado})` :
           'Gastos por Empleado'}
        </h2>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {filtroTiempo === 'anual' && (
              <BarChart
                data={datosAnuales}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={formatoEuro} />
                <Tooltip formatter={(value) => [`${value.toLocaleString('es-ES')}€`, 'Total']} />
                <Legend />
                <Bar dataKey="total" name="Total Anual" fill="#8884d8" />
              </BarChart>
            )}
            
            {filtroTiempo === 'mensual' && (
              <AreaChart
                data={datosMensuales}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={formatoEuro} />
                <Tooltip formatter={(value, name) => [
                  name === 'total' ? `${value.toLocaleString('es-ES')}€` : value,
                  name === 'total' ? 'Total Gastado' : 'Número de Tickets'
                ]} />
                <Legend />
                <Area type="monotone" dataKey="total" name="Total Gastado" stroke="#8884d8" fillOpacity={1} fill="url(#colorTotal)" />
                <Area type="monotone" dataKey="tickets" name="Número de Tickets" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
              </AreaChart>
            )}
            
            {filtroTiempo === 'empleados' && (
              <BarChart
                data={empleadosData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={formatoEuro} />
                <YAxis type="category" dataKey="name" width={150} />
                <Tooltip formatter={(value) => [`${value.toLocaleString('es-ES')}€`, 'Total']} />
                <Legend />
                <Bar dataKey="total" name="Total Gastado" fill="#8884d8" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Gráficos secundarios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Distribución de Gastos por Mes</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={datosMensuales.filter(item => item.total > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {datosMensuales.filter(item => item.total > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value.toLocaleString('es-ES')}€`, 'Total']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Tickets Más Costosos</h2>
          {resumen.ticketsMasAltos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ticket ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empleado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {resumen.ticketsMasAltos.map((ticket) => (
                    <tr key={ticket.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{ticket.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {ticket.fecha}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {ticket.empleado}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                        {ticket.total.toLocaleString('es-ES')}€
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              No hay datos de tickets disponibles
            </div>
          )}
        </div>
      </div>
      
      {/* Gráfico de comparación mensual */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Comparativa Mensual: Gastos vs Número de Tickets</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={datosMensuales}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" tickFormatter={formatoEuro} />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip formatter={(value, name) => [
                name === 'total' ? `${value.toLocaleString('es-ES')}€` : value,
                name === 'total' ? 'Total Gastado' : 'Número de Tickets'
              ]} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="total" name="Total Gastado" stroke="#8884d8" activeDot={{ r: 8 }} />
              <Line yAxisId="right" type="monotone" dataKey="tickets" name="Número de Tickets" stroke="#82ca9d" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}