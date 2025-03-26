const firebaseConfig = {
  apiKey: "AIzaSyCDm5X0hjr3jJ4oSylQzbOMFDzCPCfskmU",
  authDomain: "authproject-9e9f7.firebaseapp.com",
  projectId: "authproject-9e9f7",
  storageBucket: "authproject-9e9f7.firebasestorage.app",
  messagingSenderId: "128126979764",
  appId: "1:128126979764:web:56dc0d7c12a87221ebd1e1",
  measurementId: "G-JCJZ4S6GCY"};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('error');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const userDoc = db.collection('users').doc(email);
        const userSnapshot = await userDoc.get();
        const userData = userSnapshot.data();

        // Verificar si está bloqueado
        if (userData?.lockedUntil && new Date() < userData.lockedUntil.toDate()) {
            throw new Error('Cuenta bloqueada. Intenta más tarde');
        }

        // Iniciar sesión
        await auth.signInWithEmailAndPassword(email, password);

        // Restablecer intentos fallidos
        await userDoc.set({ failedAttempts: 0 }, { merge: true });

        // Registrar intento exitoso en Firestore
        await userDoc.collection('loginAttempts').add({
            status: 'success',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        window.location.href = 'dashboard.html';
    } catch (error) {
        errorMsg.textContent = error.message;

        // Manejar intentos fallidos
        const userDoc = db.collection('users').doc(email);
        const userSnapshot = await userDoc.get();
        let failedAttempts = userSnapshot.exists ? userSnapshot.data().failedAttempts || 0 : 0;

        failedAttempts++;

        // Bloquear si hay 3 intentos fallidos
        if (failedAttempts >= 3) {
            await userDoc.set({
                failedAttempts: 3,
                lockedUntil: new Date(Date.now() + 1 * 60 * 1000) // Bloquear por 1 minuto
            }, { merge: true });
        } else {
            await userDoc.set({ failedAttempts }, { merge: true });
        }

        // Registrar intento fallido en Firestore
        await userDoc.collection('loginAttempts').add({
            status: 'failed',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
});
