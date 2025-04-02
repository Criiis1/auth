// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCDm5X0hjr3jJ4oSylQzbOMFDzCPCfskmU",
  authDomain: "authproject-9e9f7.firebaseapp.com",
  projectId: "authproject-9e9f7",
  storageBucket: "authproject-9e9f7.firebasestorage.app",
  messagingSenderId: "128126979764",
  appId: "1:128126979764:web:56dc0d7c12a87221ebd1e1",
  measurementId: "G-JCJZ4S6GCY"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const MAX_ATTEMPTS = 3; // Límite de intentos permitidos
const LOCKOUT_TIME = 30000; // 30 segundos de bloqueo

// Verificar si el usuario está autenticado
auth.onAuthStateChanged((user) => {
  const currentPath = window.location.pathname;
  const isLoginPage = currentPath.includes('login.html');
  
  if (user) {
    // Usuario autenticado
    if (isLoginPage) {
      // Redirigir al dashboard si está en login
      window.location.href = 'index.html';
    }
  } else {
    // Usuario no autenticado
    if (!isLoginPage) {
      // Si no es la página de login, mostrar modal o redirigir
      if (document.getElementById('authModal')) {
        document.getElementById('authModal').classList.remove('hidden');
      } else {
        window.location.href = 'login.html';
      }
    }
  }
});

// Verificar si estamos en la página de login
if (document.getElementById('registerForm')) {
  // Registro de usuario
  const registerForm = document.getElementById('registerForm');
  const regErrorMsg = document.getElementById('regErrorMsg');
  const regSuccessMsg = document.getElementById('regSuccessMsg');

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Limpiar mensajes anteriores
    regErrorMsg.textContent = '';
    regSuccessMsg.textContent = '';
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
      // Validar que la contraseña tenga al menos 6 caracteres
      if (password.length < 6) {
        regErrorMsg.textContent = 'La contraseña debe tener al menos 6 caracteres';
        return;
      }

      // Crear usuario en Authentication
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      await userCredential.user.updateProfile({ displayName: name });

      // Guardar información adicional en Firestore
      await db.collection('users').doc(email).set({
        name: name,
        email: email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        failedAttempts: 0,
        lockoutTime: null
      });

      regSuccessMsg.textContent = 'Registro exitoso. Redirigiendo...';
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
    } catch (error) {
      console.error('Error en el registro:', error);
      
      // Mostrar mensaje de error específico
      switch(error.code) {
        case 'auth/email-already-in-use':
          regErrorMsg.textContent = 'Este correo ya está registrado';
          break;
        case 'auth/invalid-email':
          regErrorMsg.textContent = 'Correo electrónico inválido';
          break;
        default:
          regErrorMsg.textContent = error.message;
      }
    }
  });

  // Inicio de sesión con control de intentos fallidos
  const loginForm = document.getElementById('loginForm');
  const loginErrorMsg = document.getElementById('loginErrorMsg');
  const countdownDiv = document.getElementById('countdown');
  const timerSpan = document.getElementById('timer');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Limpiar mensajes anteriores
    loginErrorMsg.textContent = '';
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
      // Verificar si el usuario existe en Firestore
      const userRef = db.collection('users').doc(email);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        loginErrorMsg.textContent = 'Usuario no registrado';
        return;
      }

      const userData = userDoc.data();
      const failedAttempts = userData.failedAttempts || 0;
      const lockoutTime = userData.lockoutTime;

      // Verificar si la cuenta está bloqueada
      if (failedAttempts >= MAX_ATTEMPTS && lockoutTime) {
        const currentTime = new Date().getTime();
        const elapsedTime = currentTime - lockoutTime;
        
        if (elapsedTime < LOCKOUT_TIME) {
          // Cuenta bloqueada, mostrar tiempo restante
          const remainingSeconds = Math.ceil((LOCKOUT_TIME - elapsedTime) / 1000);
          loginErrorMsg.textContent = `Cuenta bloqueada. Intenta nuevamente en ${remainingSeconds} segundos`;
          countdownDiv.style.display = 'block';
          
          // Iniciar cuenta regresiva
          startCountdown(remainingSeconds, email);
          return;
        } else {
          // Restablecer los intentos después del tiempo de bloqueo
          await userRef.update({
            failedAttempts: 0,
            lockoutTime: null
          });
        }
      }

      // Intentar iniciar sesión
      await auth.signInWithEmailAndPassword(email, password);
      
      // Reiniciar intentos fallidos si el inicio es exitoso
      await userRef.update({ 
        failedAttempts: 0,
        lockoutTime: null
      });
      
      // Redirigir al dashboard
      window.location.href = 'index.html';

    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      
      // Aumentar los intentos fallidos solo para errores de autenticación
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        loginErrorMsg.textContent = 'Credenciales incorrectas';
        
        try {
          const userRef = db.collection('users').doc(email);
          const userDoc = await userRef.get();

          if (userDoc.exists) {
            const userData = userDoc.data();
            const failedAttempts = (userData.failedAttempts || 0) + 1;
            
            // Actualizar contador de intentos
            const updateData = { failedAttempts };
            
            // Si alcanzó el límite, establecer tiempo de bloqueo
            if (failedAttempts >= MAX_ATTEMPTS) {
              updateData.lockoutTime = new Date().getTime();
              loginErrorMsg.textContent = `Cuenta bloqueada por ${LOCKOUT_TIME/1000} segundos`;
              countdownDiv.style.display = 'block';
              
              // Iniciar cuenta regresiva
              startCountdown(LOCKOUT_TIME/1000, email);
            } else {
              const remaining = MAX_ATTEMPTS - failedAttempts;
              loginErrorMsg.textContent = `Credenciales incorrectas. Te quedan ${remaining} intentos`;
            }
            
            await userRef.update(updateData);
          }
        } catch (dbError) {
          console.error('Error al actualizar intentos fallidos:', dbError);
        }
      } else {
        loginErrorMsg.textContent = error.message;
      }
    }
  });

  // Función para mostrar cuenta regresiva
  function startCountdown(seconds, email) {
    let remainingTime = seconds;
    timerSpan.textContent = remainingTime;
    
    const countdownInterval = setInterval(() => {
      remainingTime--;
      timerSpan.textContent = remainingTime;
      
      if (remainingTime <= 0) {
        clearInterval(countdownInterval);
        countdownDiv.style.display = 'none';
        loginErrorMsg.textContent = 'Ya puedes intentar nuevamente';
        
        // Desbloquear cuenta en la base de datos
        const userRef = db.collection('users').doc(email);
        userRef.update({
          failedAttempts: 0,
          lockoutTime: null
        }).catch(err => console.error('Error al desbloquear cuenta:', err));
      }
    }, 1000);
  }
}

// Botón para ir a login desde el modal
if (document.getElementById('goToLogin')) {
  document.getElementById('goToLogin').addEventListener('click', () => {
    window.location.href = 'login.html';
  });
}
