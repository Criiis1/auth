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

// Función para mostrar errores
const showError = (message) => {
    document.getElementById('errorMsg').textContent = message;
};

// ✅ Registro de usuario
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        try {
            // Crear usuario en Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Guardar información en Firestore
            await db.collection('users').doc(user.uid).set({
                name: name,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

            alert('Usuario registrado con éxito');
            window.location.href = 'dashboard.html';
        } catch (error) {
            showError(error.message);
        }
    });
}

// ✅ Inicio de sesión
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            await auth.signInWithEmailAndPassword(email, password);
            window.location.href = 'dashboard.html';
        } catch (error) {
            showError(error.message);
        }
    });
}

// ✅ Cerrar sesión
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await auth.signOut();
        window.location.href = 'index.html';
    });
}

// ✅ Redirección automática si el usuario está autenticado
auth.onAuthStateChanged((user) => {
    if (user && window.location.pathname === '/index.html') {
        window.location.href = 'dashboard.html';
    } else if (!user && window.location.pathname === '/dashboard.html') {
        window.location.href = 'index.html';
    }
});
