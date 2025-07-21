// admin.js
document.addEventListener('DOMContentLoaded', () => {
    // 1. AUTENTICACIÓN
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData || !userData.restauranteId) {
        alert('No tienes permiso. Por favor, inicia sesión.');
        window.location.href = '/login.html';
        return;
    }
    const RESTAURANTE_ID = userData.restauranteId;
    let allMenuCategories = [];

    // 2. REFERENCIAS AL DOM
    // Dashboard General
    const adminRestauranteNombre = document.getElementById('admin-restaurante-nombre');
    const logoutBtn = document.getElementById('logout-btn');

    // Sección de Datos de mi Restaurante
    const editRestauranteForm = document.getElementById('edit-restaurante-form');
    const editRestauranteNombreInput = document.getElementById('edit-restaurante-nombre');
    const editRestauranteTelefonoInput = document.getElementById('edit-restaurante-telefono');
    const restauranteQrBtn = document.getElementById('restaurante-qr-btn'); // Nuevo: Botón para generar QR del restaurante
    const restauranteMensajeTextarea = document.getElementById('restaurante-mensaje');
    
    // Contenedor del QR (similar a super_admin)
    const qrcodeContainer = document.getElementById('qrcode-container');
    const qrcodeDiv = document.getElementById('qrcode');
    const qrLink = document.getElementById('qr-link');
    const downloadQrBtn = document.getElementById('download-qr-btn');

    // Sección de Platos
    const platoForm = document.getElementById('plato-form');
    const platoIdInput = document.getElementById('plato-id');
    const platoNombreInput = document.getElementById('plato-nombre');
    const platoDescripcionInput = document.getElementById('plato-descripcion');
    const platoPrecioInput = document.getElementById('plato-precio');
    const platoCategoriaInput = document.getElementById('plato-categoria');
    const platosTableBody = document.querySelector('#platos-table tbody');
    const platoSubmitBtn = document.getElementById('plato-submit-btn'); // Nuevo: botón de submit de plato

    // Sección de Especiales
    const especialForm = document.getElementById('especial-form');
    const especialIdInput = document.getElementById('especial-id');
    const especialNombreInput = document.getElementById('especial-nombre');
    const especialDescripcionInput = document.getElementById('especial-descripcion');
    const especialPrecioInput = document.getElementById('especial-precio');
    const especialesTableBody = document.querySelector('#especiales-table tbody');
    const especialSubmitBtn = document.getElementById('especial-submit-btn'); // Nuevo: botón de submit de especial

    // Sección de Categorías
    const categoriaForm = document.getElementById('categoria-form');
    const categoriaIdInput = document.getElementById('categoria-id');
    const categoriaNombreInput = document.getElementById('categoria-nombre');
    const opcionesContainer = document.getElementById('opciones-container');
    const addOpcionBtn = document.getElementById('add-opcion-btn');
    const categoriasTableBody = document.querySelector('#categorias-table tbody');
    const categoriaSubmitBtn = document.getElementById('categoria-submit-btn'); // Nuevo: botón de submit de categoría
    
    // Sección de Menús del Día
    const menuDiaForm = document.getElementById('menu-dia-form');
    const menuDiaIdInput = document.getElementById('menu-dia-id');
    const menuFechaInput = document.getElementById('menu-fecha');
    const menuNombreInput = document = document.getElementById('menu-nombre');
    const menuPrecioInput = document.getElementById('menu-precio');
    const menuItemsSelectionContainer = document.getElementById('menu-items-selection-container');
    const menusDiaTableBody = document.querySelector('#menus-dia-table tbody');
    const menuDiaSubmitBtn = document.getElementById('menu-dia-submit-btn'); // Nuevo: botón de submit de menú del día
    
    // 3. LÓGICA PRINCIPAL
    // Función de Utilidad para hacer Peticiones Fetch
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

    // Inicializa el nombre del restaurante en el dashboard
    if (userData.nombreRestaurante) {
        adminRestauranteNombre.textContent = `Gestionando: ${userData.nombreRestaurante}`;
    }

    // Lógica para cerrar sesión
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('userData');
        window.location.href = '/login.html';
    });

    // --- GESTIÓN DE DATOS DEL RESTAURANTE ---
    let currentRestauranteSlug = null; // Para generar QR

    async function loadRestauranteData() {
        try {
            const restaurante = await fetchData(`/api/restaurantes/${RESTAURANTE_ID}`);
            if (restaurante) {
                editRestauranteNombreInput.value = restaurante.nombre;
                editRestauranteTelefonoInput.value = restaurante.telefono;
                restauranteMensajeTextarea.value = restaurante.mensajeBienvenida || '';
                adminRestauranteNombre.textContent = `Gestionando: ${restaurante.nombre}`;
                currentRestauranteSlug = restaurante.slug; // Guarda el slug para el QR
            }
        } catch (error) {
            console.error("Error al cargar datos del restaurante:", error);
            alert(`No se pudieron cargar los datos del restaurante: ${error.message}`);
        }
    }

    // Maneja la actualización de datos del restaurante
    editRestauranteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = { nombre: editRestauranteNombreInput.value, telefono: editRestauranteTelefonoInput.value, mensajeBienvenida: restauranteMensajeTextarea.value };
        
        try {
            const updated = await fetchData(`/api/restaurantes/${RESTAURANTE_ID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (updated) {
                alert('Datos del restaurante actualizados con éxito.');
                adminRestauranteNombre.textContent = `Gestionando: ${updated.nombre}`;
                currentRestauranteSlug = updated.slug; // Actualiza el slug si cambia
            }
        } catch(e) {
            console.error("Error al actualizar datos del restaurante:", e);
            alert(`Error al actualizar datos del restaurante: ${e.message}`);
        }
    });

    // --- LÓGICA PARA GENERAR QR DEL RESTAURANTE ---
    restauranteQrBtn.addEventListener('click', () => {
        if (!currentRestauranteSlug) {
            alert('No se pudo generar el QR. Asegúrate de que el restaurante tiene un slug.');
            return;
        }
        const url = `${window.location.origin}/r/${currentRestauranteSlug}`;

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
        qrLink.textContent = `Enlace para: ${userData.nombreRestaurante || 'tu restaurante'}`;
        downloadQrBtn.dataset.filename = `qr-${currentRestauranteSlug}.png`;
        qrcodeContainer.style.display = 'block';
        qrcodeContainer.scrollIntoView({ behavior: 'smooth' });
    });

    // Descarga el QR del restaurante
    downloadQrBtn.addEventListener('click', () => {
        const canvas = qrcodeDiv.querySelector('canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = downloadQrBtn.dataset.filename || 'codigo-qr-restaurante.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
    });

    // --- GESTIÓN DE PLATOS ---
    async function loadPlatos() {
        const platos = await fetchData(`/api/platos/restaurante/${RESTAURANTE_ID}`);
        platosTableBody.innerHTML = '';
        if(platos && Array.isArray(platos)) {
            platos.forEach(p => {
                const row = platosTableBody.insertRow();
                row.innerHTML = `
                    <td>${p.nombre}</td>
                    <td>$${p.precio ? p.precio.toFixed(2) : '0.00'}</td>
                    <td>${p.categoria || 'Sin categoría'}</td>
                    <td>
                        <label class="switch">
                            <input type="checkbox" class="toggle-disponibilidad" data-id="${p._id}" data-tipo="platos" ${p.disponible ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </td>
                    <td>
                        <button class="edit-plato btn" data-id='${p._id}'>E</button>
                        <button class="delete-plato btn btn-danger" data-id='${p._id}'>X</button>
                    </td>
                `;
            });
        }
    }

    platoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = { 
            nombre: platoNombreInput.value, 
            descripcion: platoDescripcionInput.value, 
            precio: parseFloat(platoPrecioInput.value), 
            categoria: platoCategoriaInput.value, 
            restaurante: RESTAURANTE_ID 
        };
        const id = platoIdInput.value;
        const url = id ? `/api/platos/${id}` : '/api/platos';
        const method = id ? 'PUT' : 'POST';

        const result = await fetchData(url, { 
            method: method, 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(data) 
        });

        if (result) {
            alert(id ? 'Plato actualizado con éxito.' : 'Plato creado con éxito.');
            platoForm.reset(); 
            platoIdInput.value = ''; // Limpia el ID para el próximo plato
            platoSubmitBtn.textContent = 'Guardar Plato'; // Restaura el texto del botón
            loadPlatos(); // Recarga la lista de platos
        }
    });

    platosTableBody.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        // Lógica de toggle (activar/desactivar disponible)
        if (e.target.classList.contains('toggle-disponibilidad')) { 
            const result = await fetchData(`/api/platos/${id}/toggle`, { method: 'PATCH' });
            if (result) {
                // Opcional: mostrar un mensaje o simplemente la UI se actualiza con el checkbox
                // alert(`Plato ${result.disponible ? 'disponible' : 'agotado'} ahora.`);
            }
        }
        // Lógica de edición de plato
        else if (e.target.classList.contains('edit-plato')) {
            const p = await fetchData(`/api/platos/${id}`);
            if (p) {
                platoIdInput.value = p._id; 
                platoNombreInput.value = p.nombre; 
                platoDescripcionInput.value = p.descripcion || ''; 
                platoPrecioInput.value = p.precio; 
                platoCategoriaInput.value = p.categoria || '';
                platoSubmitBtn.textContent = 'Actualizar Plato'; // Cambia texto del botón
                window.scrollTo({ top: platoForm.offsetTop, behavior: 'smooth' }); // Sube a la form
            }
        } 
        // Lógica de eliminación de plato
        else if (e.target.classList.contains('delete-plato')) {
            if (confirm('¿Estás seguro de que quieres eliminar este plato?')) { 
                const result = await fetchData(`/api/platos/${id}`, { method: 'DELETE' }); 
                if (result === null) { // 204 No Content
                    alert('Plato eliminado con éxito.');
                    loadPlatos(); // Recarga la lista
                }
            }
        }
    });
    
    // --- GESTIÓN DE ESPECIALES ---
    async function loadEspeciales() {
        const especiales = await fetchData(`/api/especiales/restaurante/${RESTAURANTE_ID}`);
        especialesTableBody.innerHTML = '';
        if(especiales && Array.isArray(especiales)) {
            especiales.forEach(e => {
                const row = especialesTableBody.insertRow();
                row.innerHTML = `
                    <td>${e.nombre}</td>
                    <td>$${e.precio ? e.precio.toFixed(2) : '0.00'}</td>
                    <td>${e.descripcion || ''}</td>
                    <td>
                        <label class="switch">
                            <input type="checkbox" class="toggle-disponibilidad" data-id="${e._id}" data-tipo="especiales" ${e.disponible ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </td>
                    <td>
                        <button class="edit-especial btn" data-id='${e._id}'>E</button>
                        <button class="delete-especial btn btn-danger" data-id='${e._id}'>X</button>
                    </td>
                `;
            });
        }
    }

    especialForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = { 
            nombre: especialNombreInput.value, 
            descripcion: especialDescripcionInput.value, 
            precio: parseFloat(especialPrecioInput.value), 
            restaurante: RESTAURANTE_ID 
        };
        const id = especialIdInput.value;
        const url = id ? `/api/especiales/${id}` : '/api/especiales';
        const method = id ? 'PUT' : 'POST';

        const result = await fetchData(url, { 
            method: method, 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(data) 
        });

        if (result) {
            alert(id ? 'Especial actualizado con éxito.' : 'Especial creado con éxito.');
            especialForm.reset(); 
            especialIdInput.value = ''; // Limpia el ID para el próximo especial
            especialSubmitBtn.textContent = 'Guardar Especial'; // Restaura el texto del botón
            loadEspeciales(); // Recarga la lista de especiales
        }
    });

    especialesTableBody.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        // Lógica de toggle (activar/desactivar disponible)
        if (e.target.classList.contains('toggle-disponibilidad')) { 
            const result = await fetchData(`/api/especiales/${id}/toggle`, { method: 'PATCH' });
            if (result) {
                // alert(`Especial ${result.disponible ? 'disponible' : 'agotado'} ahora.`);
            }
        }
        // Lógica de edición de especial
        else if (e.target.classList.contains('edit-especial')) {
            const esp = await fetchData(`/api/especiales/${id}`);
            if (esp) {
                especialIdInput.value = esp._id; 
                especialNombreInput.value = esp.nombre; 
                especialDescripcionInput.value = esp.descripcion || ''; 
                especialPrecioInput.value = esp.precio;
                especialSubmitBtn.textContent = 'Actualizar Especial'; // Cambia texto del botón
                window.scrollTo({ top: especialForm.offsetTop, behavior: 'smooth' }); // Sube a la form
            }
        } 
        // Lógica de eliminación de especial
        else if (e.target.classList.contains('delete-especial')) {
            if (confirm('¿Estás seguro de que quieres eliminar este especial?')) { 
                const result = await fetchData(`/api/especiales/${id}`, { method: 'DELETE' }); 
                if (result === null) { // 204 No Content
                    alert('Especial eliminado con éxito.');
                    loadEspeciales(); // Recarga la lista
                }
            }
        }
    });

    // --- GESTIÓN DE CATEGORÍAS DE MENÚ ---
    function createOpcionInput(opcion = {}) {
        const div = document.createElement('div'); div.classList.add('opcion-item'); div.style.display = 'flex'; div.style.alignItems = 'center'; div.style.marginBottom = '5px';
        const input = document.createElement('input'); input.type = 'text'; input.className = 'opcion-nombre'; input.value = opcion.nombre || ''; input.placeholder = 'Nombre de la opción'; input.required = true; input.style.flexGrow = '1';
        const button = document.createElement('button'); button.type = 'button'; button.className = 'remove-opcion-btn btn'; button.textContent = 'Quitar'; button.style.marginLeft = '10px';
        div.appendChild(input); div.appendChild(button);
        opcionesContainer.appendChild(div);
        button.addEventListener('click', () => { div.remove(); });
    }
    addOpcionBtn.addEventListener('click', () => createOpcionInput());

    async function loadCategorias() {
        const categorias = await fetchData(`/api/menu-categorias/restaurante/${RESTAURANTE_ID}`);
        allMenuCategories = categorias || [];
        categoriasTableBody.innerHTML = '';
        if (allMenuCategories.length > 0) {
            allMenuCategories.forEach(cat => {
                const row = categoriasTableBody.insertRow();
                row.innerHTML = `
                    <td>${cat.nombre}</td>
                    <td>${cat.opciones.map(o => o.nombre).join(', ')}</td>
                    <td>
                        <button class="edit-categoria btn" data-id='${cat._id}'>E</button>
                        <button class="delete-categoria btn btn-danger" data-id='${cat._id}'>X</button>
                    </td>
                `;
            });
        }
        updateMenuDiaForm(); // Actualiza el formulario de menú del día con las categorías cargadas
    }

    categoriaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const opciones = Array.from(opcionesContainer.querySelectorAll('.opcion-nombre')).map(input => ({ nombre: input.value })).filter(opcion => opcion.nombre);
        if (opciones.length === 0) return alert('Añade al menos una opción para la categoría.');
        const categoriaData = { nombre: categoriaNombreInput.value, opciones, restaurante: RESTAURANTE_ID };
        const id = categoriaIdInput.value;
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/menu-categorias/${id}` : '/api/menu-categorias';
        
        const result = await fetchData(url, { 
            method, 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(categoriaData) 
        });

        if (result) {
            alert(id ? 'Categoría actualizada con éxito.' : 'Categoría creada con éxito.');
            categoriaForm.reset(); 
            categoriaIdInput.value = ''; 
            opcionesContainer.innerHTML = ''; 
            createOpcionInput(); // Asegura al menos un input de opción
            categoriaSubmitBtn.textContent = 'Guardar Categoría'; // Restaura texto del botón
            loadCategorias(); // Recarga la lista de categorías
        }
    });

    categoriasTableBody.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        // Edición de categoría
        if (e.target.classList.contains('edit-categoria')) {
            const categoria = await fetchData(`/api/menu-categorias/${id}`);
            if (categoria) {
                categoriaIdInput.value = categoria._id; 
                categoriaNombreInput.value = categoria.nombre;
                opcionesContainer.innerHTML = '';
                if (categoria.opciones.length > 0) {
                    categoria.opciones.forEach(opcion => createOpcionInput(opcion));
                } else { 
                    createOpcionInput(); // Si no hay opciones, añade una vacía
                }
                categoriaSubmitBtn.textContent = 'Actualizar Categoría'; // Cambia texto del botón
                window.scrollTo({ top: categoriaForm.offsetTop, behavior: 'smooth' }); // Sube a la form
            }
        } 
        // Eliminación de categoría
        else if (e.target.classList.contains('delete-categoria')) {
            if (confirm('¿Estás seguro de que quieres eliminar esta categoría?')) { 
                const result = await fetchData(`/api/menu-categorias/${id}`, { method: 'DELETE' }); 
                if (result === null) { // 204 No Content
                    alert('Categoría eliminada con éxito.');
                    loadCategorias(); // Recarga la lista
                }
            }
        }
    });

    // --- GESTIÓN DE MENÚS DEL DÍA ---
    function updateMenuDiaForm(menuAEditar = null) {
        menuItemsSelectionContainer.innerHTML = '';
        if (allMenuCategories.length > 0) {
            allMenuCategories.forEach(categoria => {
                const categoryDiv = document.createElement('div');
                categoryDiv.classList.add('menu-item-category');
                const checkboxesHtml = categoria.opciones.map(opcion => {
                    let isChecked = false;
                    if(menuAEditar) {
                        const catEnMenu = menuAEditar.itemsPorCategoria.find(item => item.categoriaNombre === categoria.nombre);
                        if(catEnMenu) { isChecked = catEnMenu.platosEscogidos.some(plato => plato.nombre === opcion.nombre); }
                    }
                    const opcionDataString = JSON.stringify({ nombre: opcion.nombre, descripcion: opcion.descripcion || '' });
                    return `<label><input type="checkbox" class="menu-item-checkbox" data-opcion='${opcionDataString}' ${isChecked ? 'checked' : ''}> ${opcion.nombre}</label>`;
                }).join('');
                categoryDiv.innerHTML = `<h4>${categoria.nombre}</h4><div class="checkbox-group" data-categoria-nombre="${categoria.nombre}">${checkboxesHtml}</div>`;
                menuItemsSelectionContainer.appendChild(categoryDiv);
            });
        } else { menuItemsSelectionContainer.innerHTML = '<p>Primero debes crear categorías para armar el menú del día.</p>'; }
    }

    menuDiaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const menuData = { 
            fecha: menuFechaInput.value, 
            nombreMenu: menuNombreInput.value, 
            precioMenuGlobal: parseFloat(menuPrecioInput.value) || 0, 
            itemsPorCategoria: [], 
            restaurante: RESTAURANTE_ID 
        };
        menuItemsSelectionContainer.querySelectorAll('.checkbox-group').forEach(group => {
            const categoriaNombre = group.dataset.categoriaNombre;
            const platosEscogidos = [];
            group.querySelectorAll('.menu-item-checkbox:checked').forEach(checkbox => { platosEscogidos.push(JSON.parse(checkbox.dataset.opcion)); });
            if (platosEscogidos.length > 0) { menuData.itemsPorCategoria.push({ categoriaNombre, platosEscogidos }); }
        });
        if (menuData.itemsPorCategoria.length === 0) { return alert('Debes seleccionar al menos un ítem para el menú del día.'); }

        const id = menuDiaIdInput.value;
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/menus-dia/${id}` : '/api/menus-dia';

        const result = await fetchData(url, { 
            method, 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(menuData) 
        });

        if (result) {
            alert(id ? 'Menú del Día actualizado con éxito.' : 'Menú del Día creado con éxito.');
            menuDiaForm.reset(); 
            menuDiaIdInput.value = '';
            menuDiaSubmitBtn.textContent = 'Guardar Menú del Día'; // Restaura texto del botón
            updateMenuDiaForm(); // Limpia y actualiza los checkboxes
            loadMenusDia(); // Recarga la lista de menús
        }
    });

    async function loadMenusDia() {
        const menus = await fetchData(`/api/menus-dia/restaurante/${RESTAURANTE_ID}`);
        menusDiaTableBody.innerHTML = '';
        if (menus && Array.isArray(menus)) {
            // Ordenar por fecha, los más recientes primero
            menus.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            menus.forEach(menu => {
                const row = menusDiaTableBody.insertRow();
                const platos = menu.itemsPorCategoria.map(cat => `<strong>${cat.categoriaNombre}:</strong> ${cat.platosEscogidos.map(p => p.nombre).join(', ')}`).join('<br>');
                row.innerHTML = `
                    <td>${new Date(menu.fecha).toLocaleDateString('es-CO', { timeZone: 'UTC' })}</td>
                    <td>${menu.nombreMenu}</td>
                    <td>${platos}</td>
                    <td>
                        <button class="edit-menu btn" data-id='${menu._id}'>E</button>
                        <button class="delete-menu btn btn-danger" data-id='${menu._id}'>X</button>
                    </td>
                `;
            });
        }
    }

    menusDiaTableBody.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        // Edición de menú del día
        if (e.target.classList.contains('edit-menu')) {
            const menu = await fetchData(`/api/menus-dia/${id}`);
            if (menu) {
                menuDiaIdInput.value = menu._id;
                menuFechaInput.value = new Date(menu.fecha).toISOString().split('T')[0]; // Formato para input type="date"
                menuNombreInput.value = menu.nombreMenu;
                menuPrecioInput.value = menu.precioMenuGlobal;
                updateMenuDiaForm(menu); // Rellena los checkboxes
                menuDiaSubmitBtn.textContent = 'Actualizar Menú del Día'; // Cambia texto del botón
                window.scrollTo({ top: menuDiaForm.offsetTop, behavior: 'smooth' }); // Sube a la form
            }
        } 
        // Eliminación de menú del día
        else if (e.target.classList.contains('delete-menu')) {
            if (confirm('¿Estás seguro de que quieres eliminar este menú del día?')) { 
                const result = await fetchData(`/api/menus-dia/${id}`, { method: 'DELETE' }); 
                if (result === null) { // 204 No Content
                    alert('Menú del Día eliminado con éxito.');
                    loadMenusDia(); // Recarga la lista
                }
            }
        }
    });

    // 4. CARGA INICIAL DE DATOS AL CARGAR LA PÁGINA
    loadRestauranteData(); // Carga los datos del restaurante actual para el admin
    loadPlatos(); // Carga todos los platos del restaurante
    loadEspeciales(); // Carga todos los especiales del restaurante
    loadCategorias(); // Carga todas las categorías de menú
    loadMenusDia(); // Carga todos los menús del día
    createOpcionInput(); // Asegura un campo de opción inicial para categorías
});