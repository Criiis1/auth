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

const registerForm = document.getElementById('registerForm');

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value; // Captura el nombre
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // Crear usuario en Firebase Authentication
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);

        // Actualizar el perfil con el displayName
        await userCredential.user.updateProfile({
            displayName: name
        });

        // Guardar datos adicionales en Firestore (opcional)
        await db.collection('users').doc(email).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('Registro exitoso');
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Error en el registro:', error);
        alert(error.message);
    }
});
