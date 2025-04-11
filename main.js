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

const MAX_ATTEMPTS = 3;
const LOCKOUT_TIME = 30000;  // Bloqueo por 30 segundos

// Verificar si el usuario está autenticado
auth.onAuthStateChanged((user) => {
  const isLoginPage = window.location.pathname.includes('login.html');
  if (user) {
    if (isLoginPage) {
      window.location.href = 'index.html';
    }
  } else if (!isLoginPage) {
    window.location.href = 'login.html';
  }
});

// Registro de usuario
if (document.getElementById('registerForm')) {
  const registerForm = document.getElementById('registerForm');
  const regErrorMsg = document.getElementById('regErrorMsg');
  const regSuccessMsg = document.getElementById('regSuccessMsg');

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    regErrorMsg.textContent = '';
    regSuccessMsg.textContent = '';
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    if (password.length < 6) {
      regErrorMsg.textContent = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      await userCredential.user.updateProfile({ displayName: name });

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
      handleError(error, regErrorMsg);
    }
  });

  // Función para manejar errores comunes
  function handleError(error, errorMsgElement) {
    console.error('Error:', error);
    let message = 'Error desconocido. Intenta nuevamente.';
    switch (error.code) {
      case 'auth/email-already-in-use':
        message = 'Este correo electrónico ya está registrado.';
        break;
      case 'auth/invalid-email':
        message = 'El formato del correo electrónico no es válido.';
        break;
      case 'auth/weak-password':
        message = 'La contraseña es demasiado débil.';
        break;
      case 'auth/network-request-failed':
        message = 'Problema de conexión. Verifica tu internet.';
        break;
      case 'auth/too-many-requests':
        message = 'Demasiados intentos. Por favor, intenta más tarde.';
        break;
      default:
        message = 'Error al crear la cuenta. Por favor intenta nuevamente.';
    }
    errorMsgElement.textContent = message;
  }

  // Inicio de sesión con control de intentos fallidos
  const loginForm = document.getElementById('loginForm');
  const loginErrorMsg = document.getElementById('loginErrorMsg');
  const countdownDiv = document.getElementById('countdown');
  const timerSpan = document.getElementById('timer');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginErrorMsg.textContent = '';
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      const userRef = db.collection('users').doc(email);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        await userRef.set({
          name: user.displayName || '',
          email: email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          failedAttempts: 0,
          lockoutTime: null
        });
      } else {
        await userRef.update({ failedAttempts: 0, lockoutTime: null });
      }
      
      window.location.href = 'index.html';
    } catch (error) {
      handleError(error, loginErrorMsg);
      await handleFailedLogin(email);
    }
  });

  async function handleFailedLogin(email) {
    const userRef = db.collection('users').doc(email);
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      const failedAttempts = (userDoc.data().failedAttempts || 0) + 1;
      await userRef.update({ failedAttempts });

      if (failedAttempts >= MAX_ATTEMPTS) {
        const lockoutTime = Date.now() + LOCKOUT_TIME;
        await userRef.update({ lockoutTime });
        showLockout();
      }
    }
  }

  function showLockout() {
    countdownDiv.style.display = 'block';
    let timeLeft = LOCKOUT_TIME / 1000;
    timerSpan.textContent = timeLeft;

    const interval = setInterval(() => {
      timeLeft--;
      timerSpan.textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(interval);
        countdownDiv.style.display = 'none';
      }
    }, 1000);
  }
}
