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


// Referencias a Firestore y Storage
const db = firebase.firestore();
const storage = firebase.storage();

// Formulario de productos
const productForm = document.getElementById('productForm');

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('productName').value;
  const description = document.getElementById('productDescription').value;
  const price = parseFloat(document.getElementById('productPrice').value);
  const imageFile = document.getElementById('productImage').files[0];

  if (!imageFile) {
    alert('Selecciona una imagen');
    return;
  }

  try {
    // Subir imagen a Storage
    const storageRef = storage.ref(`productos/${imageFile.name}`);
    await storageRef.put(imageFile);
    const imageUrl = await storageRef.getDownloadURL();

    // Guardar datos en Firestore
    await db.collection('productos').add({
      nombre: name,
      descripcion: description,
      precio: price,
      imagenURL: imageUrl,
      fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert('Producto guardado exitosamente 🎉');
    productForm.reset();
    loadProducts(); // Recargar lista de productos
  } catch (error) {
    console.error('Error al guardar producto:', error);
    alert('Error al guardar producto');
  }
});

// Función para cargar productos
async function loadProducts() {
  const productsList = document.getElementById('productsList');
  productsList.innerHTML = '';

  const snapshot = await db.collection('productos').orderBy('fechaCreacion', 'desc').get();
  snapshot.forEach(doc => {
    const product = doc.data();
    productsList.innerHTML += `
      <div style="border:1px solid #ccc; margin:10px; padding:10px;">
        <img src="${product.imagenURL}" alt="${product.nombre}" width="100">
        <h3>${product.nombre}</h3>
        <p>${product.descripcion}</p>
        <p><strong>Precio:</strong> $${product.precio}</p>
        <button onclick="deleteProduct('${doc.id}')">Eliminar</button>
      </div>
    `;
  });
}

// Función para eliminar producto
async function deleteProduct(id) {
  if (confirm('¿Seguro que quieres eliminar este producto?')) {
    await db.collection('productos').doc(id).delete();
    alert('Producto eliminado');
    loadProducts();
  }
}

// Cargar productos automáticamente al abrir
window.onload = loadProducts;

// Asegúrate que Firebase esté inicializado (firebase.js cargado)

// Referencias
const db = firebase.firestore();
const storage = firebase.storage();

// Formulario
const pdfForm = document.getElementById('pdfForm');

pdfForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('pdfName').value;
  const description = document.getElementById('pdfDescription').value;
  const pdfFile = document.getElementById('pdfFile').files[0];

  if (!pdfFile) {
    alert('Por favor selecciona un PDF.');
    return;
  }

  try {
    // Subir PDF a Storage
    const storageRef = storage.ref(`pdfs/${pdfFile.name}`);
    await storageRef.put(pdfFile);
    const pdfURL = await storageRef.getDownloadURL();

    // Guardar información en Firestore
    await db.collection('pdfs').add({
      nombre: name,
      descripcion: description,
      pdfURL: pdfURL,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert('PDF guardado exitosamente.');
    pdfForm.reset();
    cargarPDFs(); // Para refrescar la lista automáticamente
  } catch (error) {
    console.error('Error subiendo PDF:', error);
    alert('Error al subir el PDF.');
  }
});


async function cargarPDFs() {
  const pdfList = document.getElementById('pdfList');
  pdfList.innerHTML = '';

  const snapshot = await db.collection('pdfs').orderBy('timestamp', 'desc').get();
  snapshot.forEach(doc => {
    const data = doc.data();
    pdfList.innerHTML += `
      <div>
        <h3>${data.nombre}</h3>
        <p>${data.descripcion}</p>
        <a href="${data.pdfURL}" target="_blank">Ver PDF</a>
      </div>
      <hr>
    `;
  });
}

// Cargar PDFs al iniciar la página
window.addEventListener('DOMContentLoaded', cargarPDFs);
