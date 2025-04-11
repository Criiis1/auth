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
      
      // Mostrar mensaje de error amigable según el código
      switch(error.code) {
        case 'auth/email-already-in-use':
          regErrorMsg.textContent = 'Este correo electrónico ya está registrado';
          break;
        case 'auth/invalid-email':
          regErrorMsg.textContent = 'El formato del correo electrónico no es válido';
          break;
        case 'auth/weak-password':
          regErrorMsg.textContent = 'La contraseña es demasiado débil, usa al menos 6 caracteres';
          break;
        case 'auth/network-request-failed':
          regErrorMsg.textContent = 'Problema de conexión. Verifica tu internet e intenta de nuevo';
          break;
        case 'auth/too-many-requests':
          regErrorMsg.textContent = 'Demasiados intentos. Por favor, intenta más tarde';
          break;
        default:
          regErrorMsg.textContent = 'Error al crear la cuenta. Por favor intenta nuevamente';
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
      // Primero, intentar autenticar con Firebase Authentication
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Verificar si el usuario existe en Firestore
      const userRef = db.collection('users').doc(email);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        // Si el usuario se autenticó pero no existe en Firestore, crear el documento
        await userRef.set({
          name: user.displayName || '',
          email: email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          failedAttempts: 0,
          lockoutTime: null
        });
        console.log('Se creó el documento del usuario en Firestore');
      } else {
        // Reiniciar intentos fallidos si el inicio es exitoso
        await userRef.update({ 
          failedAttempts: 0,
          lockoutTime: null
        });
      }
      
      // Redirigir al dashboard
      window.location.href = 'index.html';

    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      
      // Mostrar mensaje de error amigable según el código
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        loginErrorMsg.textContent = 'Correo electrónico o contraseña incorrectos';
        
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
              loginErrorMsg.textContent = `Por seguridad, tu cuenta ha sido bloqueada temporalmente`;
              countdownDiv.style.display = 'block';
              
              // Iniciar cuenta regresiva
              startCountdown(LOCKOUT_TIME/1000, email);
            } else {
              const remaining = MAX_ATTEMPTS - failedAttempts;
              const intentosText = remaining === 1 ? 'intento' : 'intentos';
              loginErrorMsg.textContent = `Contraseña incorrecta. Te quedan ${remaining} ${intentosText}`;
            }
            
            await userRef.update(updateData);
          } else {
            // Si el usuario no existe en Firestore pero el error es de contraseña incorrecta
            // significa que el correo existe en Auth pero no en Firestore
            loginErrorMsg.textContent = 'Correo electrónico o contraseña incorrectos';
          }
        } catch (dbError) {
          console.error('Error al actualizar intentos fallidos:', dbError);
          loginErrorMsg.textContent = 'Error al verificar credenciales. Intenta nuevamente';
        }
      } else {
        // Mostrar mensajes amigables para otros errores comunes
        switch(error.code) {
          case 'auth/invalid-email':
            loginErrorMsg.textContent = 'El formato del correo electrónico no es válido';
            break;
          case 'auth/user-disabled':
            loginErrorMsg.textContent = 'Esta cuenta ha sido desactivada';
            break;
          case 'auth/network-request-failed':
            loginErrorMsg.textContent = 'Problema de conexión. Verifica tu internet';
            break;
          case 'auth/too-many-requests':
            loginErrorMsg.textContent = 'Demasiados intentos. Por favor, intenta más tarde';
            break;
          default:
            loginErrorMsg.textContent = 'Error al iniciar sesión. Por favor intenta nuevamente';
        }
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
        loginErrorMsg.textContent = 'Ya puedes intentar iniciar sesión nuevamente';
        
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



