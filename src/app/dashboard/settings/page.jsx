'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SettingsPage() {
  const [organization, setOrganization] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const router = useRouter();

  // Formulario
  const [formData, setFormData] = useState({
    organizationName: '',
    firstName: '',
    lastName: '',
    email: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/login');
          return;
        }
        
        // Obtener perfil y organización
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*, organizations(*)')
          .eq('id', session.user.id)
          .single();
          
        if (profile) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            role: profile.role,
            firstName: profile.first_name || '',
            lastName: profile.last_name || ''
          });
          
          setOrganization(profile.organizations);
          
          // Inicializar formulario
          setFormData({
            organizationName: profile.organizations?.name || '',
            firstName: profile.first_name || '',
            lastName: profile.last_name || '',
            email: session.user.email
          });
        }
      } catch (error) {
        console.error('Error fetching settings data:', error);
        setMessage({
          type: 'error',
          text: 'Error al cargar los datos. Por favor intenta de nuevo.'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [router]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      // Actualizar organización
      if (organization && user.role === 'admin') {
        await supabase
          .from('organizations')
          .update({ name: formData.organizationName })
          .eq('id', organization.id);
      }
      
      // Actualizar perfil de usuario
      await supabase
        .from('user_profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName
        })
        .eq('id', user.id);
      
      setMessage({
        type: 'success',
        text: 'Configuración actualizada correctamente'
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      setMessage({
        type: 'error',
        text: 'Error al actualizar la configuración'
      });
    } finally {
      setUpdateLoading(false);
    }
  };
  
  const handleCancelSubscription = async () => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar tu suscripción? Perderás acceso a las funciones premium.')) {
      return;
    }
    
    setUpdateLoading(true);
    
    try {
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: organization.id
        })
      });
      
      if (!response.ok) {
        throw new Error('Error al cancelar la suscripción');
      }
      
      // Actualizar datos locales
      setOrganization((prev) => ({
        ...prev,
        subscription_status: 'canceled',
        subscription_plan: 'free'
      }));
      
      setMessage({
        type: 'success',
        text: 'Suscripción cancelada correctamente'
      });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      setMessage({
        type: 'error',
        text: 'Error al cancelar la suscripción'
      });
    } finally {
      setUpdateLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard" className="text-blue-500 hover:text-blue-700">
          &larr; Volver al Dashboard
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h1 className="text-2xl font-bold mb-6">Configuración de la cuenta</h1>
        
        {message.text && (
          <div className={`p-4 mb-6 rounded-md ${
            message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message.text}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Información de la organización</h2>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="organizationName">
                Nombre de la organización
              </label>
              <input
                id="organizationName"
                name="organizationName"
                type="text"
                value={formData.organizationName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
                disabled={user?.role !== 'admin'}
              />
              {user?.role !== 'admin' && (
                <p className="text-sm text-gray-500 mt-1">
                  Solo los administradores pueden cambiar el nombre de la organización
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-gray-700 mb-1">Plan actual</p>
                <p className="font-medium capitalize">{organization?.subscription_plan || 'Free'}</p>
              </div>
              
              <div>
                <p className="text-gray-700 mb-1">Estado</p>
                <p className={`font-medium ${
                  organization?.subscription_status === 'active' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {organization?.subscription_status === 'active' ? 'Activo' : 'Inactivo'}
                </p>
              </div>
            </div>
            
            {user?.role === 'admin' && organization?.subscription_plan !== 'free' && organization?.subscription_status === 'active' && (
              <button
                type="button"
                onClick={handleCancelSubscription}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
                disabled={updateLoading}
              >
                Cancelar suscripción
              </button>
            )}
          </div>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Información personal</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="firstName">
                  Nombre
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="lastName">
                  Apellido
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                disabled
              />
              <p className="text-sm text-gray-500 mt-1">
                El email no puede ser modificado
              </p>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md"
              disabled={updateLoading}
            >
              {updateLoading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
