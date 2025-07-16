document.addEventListener('DOMContentLoaded', () => {
    // --- Referencias al DOM (Elementos de la página) ---
    const restauranteForm = document.getElementById('restaurante-form');
    const restauranteNombreInput = document.getElementById('restaurante-nombre');
    const restauranteSlugInput = document.getElementById('restaurante-slug');
    const restauranteTelefonoInput = document.getElementById('restaurante-telefono');
    const restauranteSubmitBtn = restauranteForm.querySelector('button[type="submit"]'); 

    const usuarioForm = document.getElementById('usuario-form');
    const usuarioEmailInput = document.getElementById('usuario-email');
    const usuarioPasswordInput = document.getElementById('usuario-password');
    const usuarioRolSelect = document.getElementById('usuario-rol');
    const usuarioRestauranteSelect = document.getElementById('usuario-restaurante');
    const asignarRestauranteContainer = document.getElementById('asignar-restaurante-container');
    const usuarioSubmitBtn = usuarioForm.querySelector('button[type="submit"]');
    
    const restaurantesTableBody = document.querySelector('#restaurantes-table tbody');
    const usuariosTableBody = document.querySelector('#usuarios-table tbody');
    
    const qrcodeContainer = document.getElementById('qrcode-container');
    const qrcodeDiv = document.getElementById('qrcode');
    const qrLink = document.getElementById('qr-link');
    const downloadQrBtn = document.getElementById('download-qr-btn');

    let currentRestauranteId = null;
    let currentUsuarioId = null;

    async function fetchData(url, options = {}) {
        try {
            const response = await fetch(url, options);
            if (response.status === 204) { return null; }
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Error de red o respuesta no JSON' }));
                throw new Error(errorData.message || 'Error desconocido del servidor.');
            }
            return response.json();
        } catch (error) {
            console.error('Error en fetchData:', error);
            alert(`Error: ${error.message}`);
            return null;
        }
    }

    // --- LÓGICA PARA GESTIÓN DE RESTAURANTES ---
    async function loadRestaurantes() {
        const restaurantes = await fetchData('/api/restaurantes');
        restaurantesTableBody.innerHTML = '';
        usuarioRestauranteSelect.innerHTML = '<option value="">Seleccione un restaurante</option>';
        if (restaurantes && Array.isArray(restaurantes)) {
            restaurantes.forEach(r => {
                const row = restaurantesTableBody.insertRow();
                row.innerHTML = `
                    <td>${r.nombre}</td>
                    <td>${r.slug}</td>
                    <td>${r.telefono || ''}</td>
                    <td>
                        <button class="btn qr-btn" data-slug="${r.slug}" data-nombre="${r.nombre}">Generar QR</button>
                        <button class="btn edit-restaurante-btn" data-id="${r._id}">Editar</button>
                        <button class="btn delete-restaurante-btn btn-danger" data-id="${r._id}">Eliminar</button>
                        <button class="btn download-report-btn" data-id="${r._id}">Reporte</button>
                    </td>
                `;
                const option = document.createElement('option');
                option.value = r._id;
                option.textContent = r.nombre;
                usuarioRestauranteSelect.appendChild(option);
            });
        }
    }
    
    restaurantesTableBody.addEventListener('click', async (e) => {
        const target = e.target;
        // Generar QR
        if (target.classList.contains('qr-btn')) {
            const slug = target.dataset.slug;
            const nombre = target.dataset.nombre;
            const url = `${window.location.origin}/r/${slug}`;
            qrcodeDiv.innerHTML = '';
            new QRCode(qrcodeDiv, { text: url, width: 256, height: 256, colorDark: "#002b4d", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });
            qrLink.href = url;
            qrLink.textContent = `Enlace para: ${nombre}`;
            downloadQrBtn.dataset.filename = `qr-${slug}.png`;
            qrcodeContainer.style.display = 'block';
            qrcodeContainer.scrollIntoView({ behavior: 'smooth' });
        }
        // Descargar Reporte Excel
        else if (target.classList.contains('download-report-btn')) {
            const restauranteId = target.dataset.id;
            window.location.href = `/api/pedidos/descargar/${restauranteId}`;
        }
        // Editar Restaurante
        else if (target.classList.contains('edit-restaurante-btn')) {
            const restauranteId = target.dataset.id;
            const restaurante = await fetchData(`/api/restaurantes/${restauranteId}`);
            if (restaurante) {
                restauranteNombreInput.value = restaurante.nombre;
                restauranteSlugInput.value = restaurante.slug;
                restauranteTelefonoInput.value = restaurante.telefono || '';
                currentRestauranteId = restauranteId;
                restauranteSubmitBtn.textContent = 'Actualizar Restaurante';
                window.scrollTo({ top: restauranteForm.offsetTop, behavior: 'smooth' });
            }
        } 
        // Eliminar Restaurante
        else if (target.classList.contains('delete-restaurante-btn')) {
            const restauranteId = target.dataset.id;
            if (confirm('¿Estás seguro de que quieres eliminar este restaurante?')) {
                const result = await fetchData(`/api/restaurantes/${restauranteId}`, { method: 'DELETE' });
                if (result === null) {
                    alert('Restaurante eliminado con éxito.');
                    loadRestaurantes();
                    loadUsers();
                }
            }
        }
    });

    downloadQrBtn.addEventListener('click', () => {
        const canvas = qrcodeDiv.querySelector('canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = downloadQrBtn.dataset.filename || 'codigo-qr.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
    });

    restauranteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            nombre: restauranteNombreInput.value,
            slug: restauranteSlugInput.value,
            telefono: restauranteTelefonoInput.value
        };
        let url = '/api/restaurantes';
        let method = 'POST';
        if (currentRestauranteId) {
            url = `/api/restaurantes/${currentRestauranteId}`;
            method = 'PUT';
        }
        const result = await fetchData(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (result) {
            alert(currentRestauranteId ? 'Restaurante actualizado.' : 'Restaurante creado.');
            restauranteForm.reset();
            currentRestauranteId = null;
            restauranteSubmitBtn.textContent = 'Crear Restaurante';
            loadRestaurantes();
        }
    });

    // --- LÓGICA PARA GESTIÓN DE USUARIOS ---
    usuarioRolSelect.addEventListener('change', () => {
        asignarRestauranteContainer.style.display = usuarioRolSelect.value === 'admin_restaurante' ? 'block' : 'none';
        currentUsuarioId = null;
        usuarioForm.reset();
        usuarioSubmitBtn.textContent = 'Crear Usuario';
    });
    
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
                        <button class="btn delete-usuario-btn btn-danger" data-id="${user._id}">Eliminar</button>
                    </td>
                `;
            });
        }
    }

    usuariosTableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-usuario-btn')) {
            const userId = e.target.dataset.id;
            const user = await fetchData(`/api/usuarios/${userId}`);
            if (user) {
                usuarioEmailInput.value = user.email;
                usuarioPasswordInput.placeholder = 'Dejar en blanco para no cambiar';
                usuarioRolSelect.value = user.rol;
                asignarRestauranteContainer.style.display = user.rol === 'admin_restaurante' ? 'block' : 'none';
                usuarioRestauranteSelect.value = user.restaurante ? user.restaurante._id : '';
                currentUsuarioId = userId;
                usuarioSubmitBtn.textContent = 'Actualizar Usuario';
                window.scrollTo({ top: usuarioForm.offsetTop, behavior: 'smooth' });
            }
        } 
        else if (e.target.classList.contains('delete-usuario-btn')) {
            const userId = e.target.dataset.id;
            if (confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
                const result = await fetchData(`/api/usuarios/${userId}`, { method: 'DELETE' });
                if (result === null) {
                    alert('Usuario eliminado con éxito.');
                    loadUsers();
                }
            }
        }
    });

    usuarioForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            email: usuarioEmailInput.value,
            password: usuarioPasswordInput.value,
            rol: usuarioRolSelect.value,
            restaurante: usuarioRolSelect.value === 'admin_restaurante' ? usuarioRestauranteSelect.value : null
        };
        if (currentUsuarioId && !data.password) {
             delete data.password; 
        } else if (!currentUsuarioId && !data.password) {
            alert('Por favor, introduce una contraseña para el nuevo usuario.');
            return;
        }
        let url = '/api/usuarios';
        let method = 'POST';
        if (currentUsuarioId) {
            url = `/api/usuarios/${currentUsuarioId}`;
            method = 'PUT';
        }
        const result = await fetchData(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (result) {
            alert(currentUsuarioId ? 'Usuario actualizado.' : 'Usuario creado.');
            usuarioForm.reset();
            currentUsuarioId = null;
            usuarioSubmitBtn.textContent = 'Crear Usuario';
            usuarioPasswordInput.placeholder = 'Contraseña para el nuevo usuario';
            loadUsers();
        }
    });

    // --- Carga Inicial ---
    loadRestaurantes();
    loadUsers();
    asignarRestauranteContainer.style.display = 'block';
});