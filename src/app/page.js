// app/page.jsx
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">Ticket Lucrapp</h1>
          </div>
          
          <nav>
            <ul className="flex space-x-6">
              <li>
                <Link href="/#features" className="text-gray-600 hover:text-blue-600">
                  Características
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-600 hover:text-blue-600">
                  Precios
                </Link>
              </li>
              <li>
                <Link 
                  href="/login" 
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                >
                  Iniciar sesión
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      
      {/* Hero section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 py-20">
        <div className="container mx-auto px-4 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Sistema de Gestión de Tickets para tu Negocio
          </h1>
          <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto">
            Gestiona tus solicitudes de soporte con facilidad, aumenta la productividad y mejora la satisfacción de tus clientes.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link 
              href="/register" 
              className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-md font-semibold text-lg"
            >
              Empezar gratis
            </Link>
            <Link 
              href="/pricing" 
              className="bg-transparent hover:bg-blue-700 border-2 border-white text-white px-8 py-3 rounded-md font-semibold text-lg"
            >
              Ver planes
            </Link>
          </div>
        </div>
      </section>
      
      {/* Features section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Características principales</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-500 text-4xl mb-4">🎫</div>
              <h3 className="text-xl font-semibold mb-2">Gestión de tickets</h3>
              <p className="text-gray-600">
                Organiza las solicitudes de soporte en un sistema centralizado, asigna responsables y establece prioridades.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-500 text-4xl mb-4">👥</div>
              <h3 className="text-xl font-semibold mb-2">Usuarios y roles</h3>
              <p className="text-gray-600">
                Define diferentes niveles de acceso para tus colaboradores y gestiona los permisos de forma eficiente.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-500 text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Informes y estadísticas</h3>
              <p className="text-gray-600">
                Analiza el rendimiento de tu equipo de soporte y toma decisiones basadas en datos.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-500 text-4xl mb-4">🔔</div>
              <h3 className="text-xl font-semibold mb-2">Notificaciones</h3>
              <p className="text-gray-600">
                Mantén a tu equipo informado con alertas automáticas sobre nuevos tickets y actualizaciones importantes.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-500 text-4xl mb-4">📱</div>
              <h3 className="text-xl font-semibold mb-2">Diseño responsive</h3>
              <p className="text-gray-600">
                Accede al sistema desde cualquier dispositivo, ya sea escritorio, tablet o móvil.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-500 text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-2">Rápido y eficiente</h3>
              <p className="text-gray-600">
                Interfaz optimizada para ofrecer la mejor experiencia de usuario y maximizar la productividad.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA section */}
      <section className="bg-gray-100 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">¿Listo para empezar?</h2>
          <p className="text-xl mb-10 max-w-2xl mx-auto text-gray-600">
            Prueba nuestro sistema de gestión de tickets completamente gratis durante 14 días, sin necesidad de tarjeta de crédito.
          </p>
          <Link 
            href="/register" 
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-md font-semibold text-lg"
          >
            Registrarse gratis
          </Link>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-gray-800 text-white py-10 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Ticket Lucrapp</h3>
              <p className="text-gray-400">
                Sistema de gestión de tickets diseñado para empresas de todos los tamaños.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Producto</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/#features" className="text-gray-400 hover:text-white">
                    Características
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-gray-400 hover:text-white">
                    Precios
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white">
                    Guías
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Soporte</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white">
                    Centro de ayuda
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white">
                    Contacto
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white">
                    Términos de servicio
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white">
                    Política de privacidad
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} Ticket Lucrapp. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}