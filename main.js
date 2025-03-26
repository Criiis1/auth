const firebaseConfig = {
    apiKey: "AIzaSyCDM5X0hjr3jJ4oSylQzbOMFDzCPCfskmU",
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

const MAX_ATTEMPTS = 5; // Límite de intentos permitidos

// Registro de usuario
const registerForm = document.getElementById('registerForm');
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await userCredential.user.updateProfile({ displayName: name });

        await db.collection('users').doc(email).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            failedAttempts: 0 // Inicializa los intentos fallidos
        });

        alert('Registro exitoso');
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Error en el registro:', error);
        alert(error.message);
    }
});

// Inicio de sesión con control de intentos fallidos
const loginForm = document.getElementById('loginForm');
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        // Verificar si el usuario existe en Firestore
        const userRef = db.collection('users').doc(email);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            alert('Usuario no registrado');
            return;
        }

        const { failedAttempts } = userDoc.data();

        // Bloquear si se supera el número de intentos
        if (failedAttempts >= MAX_ATTEMPTS) {
            alert('Cuenta bloqueada por demasiados intentos fallidos. Inténtalo más tarde.');
            return;
        }

        // Intentar iniciar sesión
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        alert('Inicio de sesión exitoso');

        // Reiniciar intentos fallidos si el inicio es exitoso
        await userRef.update({ failedAttempts: 0 });
        window.location.href = 'dashboard.html';

    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        alert('Credenciales incorrectas');

        // Aumentar los intentos fallidos solo si el usuario existe
        const userRef = db.collection('users').doc(email);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            const { failedAttempts } = userDoc.data() || { failedAttempts: 0 };
            await userRef.update({
                failedAttempts: failedAttempts + 1
            });

            if (failedAttempts + 1 >= MAX_ATTEMPTS) {
                alert('Cuenta bloqueada. Inténtalo más tarde.');
            }
        }
    }
});
