// Verificar si estamos en la página del dashboard
if (document.getElementById('logout')) {
  const userNameElement = document.getElementById('userName');
  const logoutButton = document.getElementById('logout');
  const authModal = document.getElementById('authModal');
  const inactivityNotice = document.getElementById('inactivityNotice');
  const inactivityTimer = document.getElementById('inactivityTimer');
  
  // Mostrar nombre del usuario autenticado
  auth.onAuthStateChanged((user) => {
    if (user) {
      userNameElement.textContent = `Hola, ${user.displayName || user.email}`;
      authModal.classList.add('hidden');
    } else {
      authModal.classList.remove('hidden');
    }
  });
  
  // Cerrar sesión
  logoutButton.addEventListener('click', async () => {
    try {
      await auth.signOut();
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  });
  
  // Control de navegación entre secciones
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.content-section');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Verificar si el usuario está autenticado
      const user = auth.currentUser;
      if (!user) {
        authModal.classList.remove('hidden');
        return;
      }
      
      // Cambiar sección activa
      const targetSection = link.getAttribute('data-section');
      
      // Ocultar todas las secciones
      sections.forEach(section => {
        section.classList.add('hidden');
      });
      
      // Mostrar la sección seleccionada
      document.getElementById(targetSection).classList.remove('hidden');
      
      // Actualizar link activo
      navLinks.forEach(navLink => {
        navLink.classList.remove('active');
      });
      link.classList.add('active');
      
      // Resetear el temporizador de inactividad
      resetInactivityTimer();
    });
  });
  
  // Gestión de inactividad y cierre de sesión automático
  let inactivityTimeout;
  let countdownInterval;
  const INACTIVITY_TIMEOUT = 30000; // 30 segundos
  
  function resetInactivityTimer() {
    // Limpiar temporizadores existentes
    clearTimeout(inactivityTimeout);
    clearInterval(countdownInterval);
    inactivityNotice.style.display = 'none';
    
    // Establecer nuevo temporizador
    inactivityTimeout = setTimeout(showInactivityWarning, INACTIVITY_TIMEOUT);
  }
  
  function showInactivityWarning() {
    // Mostrar aviso de inactividad
    let secondsLeft = 30;
    inactivityTimer.textContent = secondsLeft;
    inactivityNotice.style.display = 'block';
    
    // Iniciar cuenta regresiva
    countdownInterval = setInterval(() => {
      secondsLeft--;
      inactivityTimer.textContent = secondsLeft;
      
      if (secondsLeft <= 0) {
        clearInterval(countdownInterval);
        // Cerrar sesión por inactividad
        auth.signOut().then(() => {
          window.location.href = 'login.html';
        });
      }
    }, 1000);
  }
  
  // Resetear temporizador con eventos de usuario
  const events = ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'];
  events.forEach(event => {
    document.addEventListener(event, resetInactivityTimer);
  });
  
  // Iniciar temporizador al cargar la página
  resetInactivityTimer();
}
