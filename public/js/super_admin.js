// super_admin.js
document.addEventListener('DOMContentLoaded', () => {
    // --- Referencias al DOM (Elementos de la página) ---
    // Sección de Restaurantes
    const restauranteForm = document.getElementById('restaurante-form');
    const restauranteNombreInput = document.getElementById('restaurante-nombre');
    const restauranteSlugInput = document.getElementById('restaurante-slug');
    const restauranteTelefonoInput = document.getElementById('restaurante-telefono');
    const restauranteSubmitBtn = document.getElementById('restaurante-submit-btn'); // Nuevo: botón de enviar
    const restaurantesTableBody = document.querySelector('#restaurantes-table tbody');

    // Sección de Usuarios
    const usuarioForm = document.getElementById('usuario-form');
    const usuarioEmailInput = document.getElementById('usuario-email');
    const usuarioPasswordInput = document.getElementById('usuario-password');
    const usuarioRolSelect = document.getElementById('usuario-rol');
    const usuarioRestauranteSelect = document.getElementById('usuario-restaurante');
    const asignarRestauranteContainer = document.getElementById('asignar-restaurante-container');
    const usuarioSubmitBtn = document.getElementById('usuario-submit-btn'); // Nuevo: botón de enviar
    const usuariosTableBody = document.querySelector('#usuarios-table tbody');
    
    // Sección de QR Code
    const qrcodeContainer = document.getElementById('qrcode-container');
    const qrcodeDiv = document.getElementById('qrcode');
    const qrLink = document.getElementById('qr-link');
    const downloadQrBtn = document.getElementById('download-qr-btn');

    // --- Variables de Estado (para edición) ---
    let currentRestauranteId = null; // Guardará el ID del restaurante que estamos editando
    let currentUsuarioId = null; // Guardará el ID del usuario que estamos editando

    // --- Función de Utilidad para hacer Peticiones Fetch ---
    // Centralizamos la lógica de fetch para reusarla y manejar errores de forma consistente.
    async function fetchData(url, options = {}) {
        try {
            const response = await fetch(url, options);
            if (response.status === 204) { // No Content para DELETE
                return null;
            }
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Error de red o respuesta no JSON' }));
                throw new Error(errorData.message || 'Error desconocido del servidor.');
            }
            return response.json();
        } catch (error) {
            console.error('Error en fetchData:', error);
            alert(`Error: ${error.message}`);
            return null; // Devuelve null en caso de error para que la lógica posterior lo maneje
        }
    }

    // --- LÓGICA PARA GESTIÓN DE RESTAURANTES ---

    // Carga y muestra los restaurantes en la tabla
    async function loadRestaurantes() {
        const restaurantes = await fetchData('/api/restaurantes');
        restaurantesTableBody.innerHTML = ''; // Limpia la tabla actual
        usuarioRestauranteSelect.innerHTML = '<option value="">Seleccione un restaurante</option>'; // Limpia y añade opción por defecto

        if (restaurantes && Array.isArray(restaurantes)) { // Verifica que sea un array
            restaurantes.forEach(r => {
                const row = restaurantesTableBody.insertRow();
                row.innerHTML = `
                    <td>${r.nombre}</td>
                    <td>${r.slug}</td>
                    <td>${r.telefono || ''}</td>
                    <td>
                        <button class="btn qr-btn" data-slug="${r.slug}" data-nombre="${r.nombre}">Generar QR</button>
                        <button class="btn edit-restaurante-btn" data-id="${r._id}">Editar</button>
                        <button class="btn delete-restaurante-btn" data-id="${r._id}">Eliminar</button>
                    </td>
                `;
                // También actualiza el select para asignar usuarios a restaurantes
                const option = document.createElement('option');
                option.value = r._id;
                option.textContent = r.nombre;
                usuarioRestauranteSelect.appendChild(option);
            });
        }
    }
    
    // Maneja clics en los botones de la tabla de restaurantes
    restaurantesTableBody.addEventListener('click', async (e) => {
        // Generar QR
        if (e.target.classList.contains('qr-btn')) {
            const slug = e.target.dataset.slug;
            const nombre = e.target.dataset.nombre;
            const url = `${window.location.origin}/r/${slug}`;

            qrcodeDiv.innerHTML = ''; // Limpia el QR anterior
            
            new QRCode(qrcodeDiv, {
                text: url,
                width: 256,
                height: 256,
                colorDark : "#002b4d",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });

            qrLink.href = url;
            qrLink.textContent = `Enlace para: ${nombre}`;
            downloadQrBtn.dataset.filename = `qr-${slug}.png`;
            qrcodeContainer.style.display = 'block';
            qrcodeContainer.scrollIntoView({ behavior: 'smooth' });
        } 
        // Editar Restaurante
        else if (e.target.classList.contains('edit-restaurante-btn')) {
            const restauranteId = e.target.dataset.id;
            const restaurante = await fetchData(`/api/restaurantes/${restauranteId}`);
            if (restaurante) {
                restauranteNombreInput.value = restaurante.nombre;
                restauranteSlugInput.value = restaurante.slug;
                restauranteTelefonoInput.value = restaurante.telefono || '';
                currentRestauranteId = restauranteId; // Establece el ID para el modo edición
                restauranteSubmitBtn.textContent = 'Actualizar Restaurante'; // Cambia texto del botón
                window.scrollTo({ top: restauranteForm.offsetTop, behavior: 'smooth' }); // Sube a la form
            }
        } 
        // Eliminar Restaurante
        else if (e.target.classList.contains('delete-restaurante-btn')) {
            const restauranteId = e.target.dataset.id;
            if (confirm('¿Estás seguro de que quieres eliminar este restaurante?')) {
                const result = await fetchData(`/api/restaurantes/${restauranteId}`, {
                    method: 'DELETE'
                });
                if (result === null) { // 204 No Content devuelve null de fetchData
                    alert('Restaurante eliminado con éxito.');
                    loadRestaurantes(); // Recarga la tabla
                    loadUsers(); // Podría afectar usuarios, recargar también
                }
            }
        }
    });

    // Descarga el QR
    downloadQrBtn.addEventListener('click', () => {
        const canvas = qrcodeDiv.querySelector('canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = downloadQrBtn.dataset.filename || 'codigo-qr.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
    });

    // Maneja el envío del formulario de restaurante (Crear/Actualizar)
    restauranteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            nombre: restauranteNombreInput.value,
            slug: restauranteSlugInput.value,
            telefono: restauranteTelefonoInput.value
        };

        let url = '/api/restaurantes';
        let method = 'POST';

        if (currentRestauranteId) { // Si hay un ID, estamos en modo edición (PUT)
            url = `/api/restaurantes/${currentRestauranteId}`;
            method = 'PUT';
        }

        const result = await fetchData(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (result) {
            alert(currentRestauranteId ? 'Restaurante actualizado con éxito.' : 'Restaurante creado con éxito.');
            restauranteForm.reset(); // Limpia el formulario
            currentRestauranteId = null; // Resetea el ID a null
            restauranteSubmitBtn.textContent = 'Crear Restaurante'; // Restaura el texto del botón
            loadRestaurantes(); // Recarga la tabla
            loadUsers(); // Recarga usuarios para actualizar el select de restaurante
        }
    });

    // --- LÓGICA PARA GESTIÓN DE USUARIOS ---

    // Muestra/Oculta el selector de restaurante basado en el rol del usuario
    usuarioRolSelect.addEventListener('change', () => {
        asignarRestauranteContainer.style.display = usuarioRolSelect.value === 'admin_restaurante' ? 'block' : 'none';
        // Resetea el ID de usuario si cambia el rol para evitar edición accidental
        currentUsuarioId = null;
        usuarioForm.reset();
        usuarioSubmitBtn.textContent = 'Crear Usuario';
    });
    
    // Carga y muestra los usuarios en la tabla
    async function loadUsers() {
        const users = await fetchData('/api/usuarios');
        usuariosTableBody.innerHTML = '';
        if(users && Array.isArray(users)) {
            users.forEach(user => {
                const row = usuariosTableBody.insertRow();
                row.innerHTML = `
                    <td>${user.email}</td>
                    <td>${user.rol}</td>
                    <td>${user.restaurante ? user.restaurante.nombre : 'N/A'}</td>
                    <td>
                        <button class="btn edit-usuario-btn" data-id="${user._id}">Editar</button>
                        <button class="btn delete-usuario-btn" data-id="${user._id}">Eliminar</button>
                    </td>
                `;
            });
        }
    }

    // Maneja clics en los botones de la tabla de usuarios
    usuariosTableBody.addEventListener('click', async (e) => {
        // Editar Usuario
        if (e.target.classList.contains('edit-usuario-btn')) {
            const userId = e.target.dataset.id;
            const user = await fetchData(`/api/usuarios/${userId}`); // Necesitamos esta ruta en el backend (GET /api/usuarios/:id)
            if (user) {
                usuarioEmailInput.value = user.email;
                // NOTA: No se carga la contraseña por seguridad. Se pedirá una nueva al actualizar.
                usuarioPasswordInput.value = ''; // La contraseña no se edita directamente
                usuarioRolSelect.value = user.rol;
                asignarRestauranteContainer.style.display = user.rol === 'admin_restaurante' ? 'block' : 'none';
                if (user.restaurante) {
                    usuarioRestauranteSelect.value = user.restaurante._id;
                } else {
                    usuarioRestauranteSelect.value = '';
                }
                currentUsuarioId = userId; // Establece el ID para el modo edición
                usuarioSubmitBtn.textContent = 'Actualizar Usuario'; // Cambia texto del botón
                window.scrollTo({ top: usuarioForm.offsetTop, behavior: 'smooth' }); // Sube a la form
            }
        } 
        // Eliminar Usuario
        else if (e.target.classList.contains('delete-usuario-btn')) {
            const userId = e.target.dataset.id;
            if (confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
                const result = await fetchData(`/api/usuarios/${userId}`, {
                    method: 'DELETE'
                });
                if (result === null) { // 204 No Content devuelve null de fetchData
                    alert('Usuario eliminado con éxito.');
                    loadUsers(); // Recarga la tabla
                }
            }
        }
    });

    // Maneja el envío del formulario de usuario (Crear/Actualizar)
    usuarioForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            email: usuarioEmailInput.value,
            password: usuarioPasswordInput.value, // La contraseña solo se usa si es nueva o se actualiza
            rol: usuarioRolSelect.value,
            restaurante: usuarioRolSelect.value === 'admin_restaurante' ? usuarioRestauranteSelect.value : null
        };

        // Si estamos actualizando, la contraseña solo se envía si se ha escrito algo nuevo
        if (currentUsuarioId && !data.password) {
             // Si estamos editando y el campo de contraseña está vacío, no la enviamos
             delete data.password; 
        } else if (!currentUsuarioId && !data.password) {
            // Si es un usuario nuevo y no hay contraseña, alertamos
            alert('Por favor, introduce una contraseña para el nuevo usuario.');
            return;
        }

        let url = '/api/usuarios';
        let method = 'POST';

        if (currentUsuarioId) { // Si hay un ID, estamos en modo edición (PUT)
            url = `/api/usuarios/${currentUsuarioId}`;
            method = 'PUT';
        }

        const result = await fetchData(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (result) {
            alert(currentUsuarioId ? 'Usuario actualizado con éxito.' : 'Usuario creado con éxito.');
            usuarioForm.reset(); // Limpia el formulario
            currentUsuarioId = null; // Resetea el ID a null
            usuarioSubmitBtn.textContent = 'Crear Usuario'; // Restaura el texto del botón
            loadUsers(); // Recarga la tabla
        }
    });


    // --- Carga Inicial de Datos al cargar la página ---
    loadRestaurantes();
    loadUsers(); // Carga también los usuarios inicialmente

    // Aseguramos que el contenedor de restaurante se muestre/oculte correctamente al inicio
    if (usuarioRolSelect.value === 'admin_restaurante') {
        asignarRestauranteContainer.style.display = 'block';
    } else {
        asignarRestauranteContainer.style.display = 'none';
    }
});