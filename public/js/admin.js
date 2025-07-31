// admin.js
document.addEventListener('DOMContentLoaded', async () => {
    // 1. AUTENTICACIÓN Y CONFIGURACIÓN
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData || !userData.restauranteId) {
        alert('No tienes permiso. Por favor, inicia sesión.');
        window.location.href = '/login.html';
        return;
    }
    const RESTAURANTE_ID = userData.restauranteId;
    let allMenuCategories = [];
    let config = {}; // Para guardar la config de Cloudinary
    let fileToUpload = null; // Para guardar el archivo de logo seleccionado

    // 2. REFERENCIAS AL DOM
    const adminRestauranteNombre = document.getElementById('admin-restaurante-nombre');
    const logoutBtn = document.getElementById('logout-btn');
    const editRestauranteForm = document.getElementById('edit-restaurante-form');
    const editRestauranteNombreInput = document.getElementById('edit-restaurante-nombre');
    const editRestauranteTelefonoInput = document.getElementById('edit-restaurante-telefono');
    const restauranteMensajeTextarea = document.getElementById('restaurante-mensaje');
    const restauranteDireccionInput = document.getElementById('restaurante-direccion');
    const restauranteDescripcionInput = document.getElementById('restaurante-descripcion');

    
    // Referencias para el logo
    const logoPreview = document.getElementById('logo-preview');
    const logoUploadInput = document.getElementById('logo-upload-input');

    const restauranteQrBtn = document.getElementById('restaurante-qr-btn');
    const qrcodeContainer = document.getElementById('qrcode-container');
    const qrcodeDiv = document.getElementById('qrcode');
    const qrLink = document.getElementById('qr-link');
    const downloadQrBtn = document.getElementById('download-qr-btn');
    const platoForm = document.getElementById('plato-form');
    const platoIdInput = document.getElementById('plato-id');
    const platoNombreInput = document.getElementById('plato-nombre');
    const platoDescripcionInput = document.getElementById('plato-descripcion');
    const platoPrecioInput = document.getElementById('plato-precio');
    const platoCategoriaInput = document.getElementById('plato-categoria');
    const platosTableBody = document.querySelector('#platos-table tbody');
    const platoSubmitBtn = document.getElementById('plato-submit-btn');
    const especialForm = document.getElementById('especial-form');
    const especialIdInput = document.getElementById('especial-id');
    const especialNombreInput = document.getElementById('especial-nombre');
    const especialDescripcionInput = document.getElementById('especial-descripcion');
    const especialPrecioInput = document.getElementById('especial-precio');
    const especialesTableBody = document.querySelector('#especiales-table tbody');
    const especialSubmitBtn = document.getElementById('especial-submit-btn');
    const categoriaForm = document.getElementById('categoria-form');
    const categoriaIdInput = document.getElementById('categoria-id');
    const categoriaNombreInput = document.getElementById('categoria-nombre');
    const opcionesContainer = document.getElementById('opciones-container');
    const addOpcionBtn = document.getElementById('add-opcion-btn');
    const categoriasTableBody = document.querySelector('#categorias-table tbody');
    const categoriaSubmitBtn = document.getElementById('categoria-submit-btn');
    const menuDiaForm = document.getElementById('menu-dia-form');
    const menuDiaIdInput = document.getElementById('menu-dia-id');
    const menuFechaInput = document.getElementById('menu-fecha');
    const menuNombreInput = document.getElementById('menu-nombre');
    const menuPrecioInput = document.getElementById('menu-precio');
    const menuItemsSelectionContainer = document.getElementById('menu-items-selection-container');
    const menusDiaTableBody = document.querySelector('#menus-dia-table tbody');
    const menuDiaSubmitBtn = document.getElementById('menu-dia-submit-btn');
    
    // 3. LÓGICA PRINCIPAL
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

    if (userData.nombreRestaurante) {
        adminRestauranteNombre.textContent = `Gestionando: ${userData.nombreRestaurante}`;
    }

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('userData');
        window.location.href = '/login.html';
    });

    // --- GESTIÓN DE DATOS DEL RESTAURANTE ---
    let currentRestauranteSlug = null;

    async function loadRestauranteData() {
        try {
            const restaurante = await fetchData(`/api/restaurantes/${RESTAURANTE_ID}`);
            if (restaurante) {
                editRestauranteNombreInput.value = restaurante.nombre;
                editRestauranteTelefonoInput.value = restaurante.telefono || '';
                restauranteMensajeTextarea.value = restaurante.mensajeBienvenida || '';
                restauranteDireccionInput.value = restaurante.direccion || '';
                restauranteDescripcionInput.value = restaurante.descripcion || '';  
                logoPreview.src = restaurante.logoUrl || 'https://placehold.co/150x80/e9ecef/6c757d?text=Sin+Logo';
                adminRestauranteNombre.textContent = `Gestionando: ${restaurante.nombre}`;
                currentRestauranteSlug = restaurante.slug;
            }
        } catch (error) {
            console.error("Error al cargar datos del restaurante:", error);
        }
    }

    logoUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileToUpload = file;
            const reader = new FileReader();
            reader.onload = (event) => { logoPreview.src = event.target.result; };
            reader.readAsDataURL(file);
        }
    });

    editRestauranteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        let currentData = await fetchData(`/api/restaurantes/${RESTAURANTE_ID}`);
        let logoUrl = currentData.logoUrl || '';

        if (fileToUpload) {
            try {
                const signData = await fetchData('/api/sign-upload', { method: 'POST' });
                const formData = new FormData();
                formData.append('file', fileToUpload);
                formData.append('api_key', config.cloudinaryApiKey);
                formData.append('timestamp', signData.timestamp);
                formData.append('signature', signData.signature);
                formData.append('folder', 'logos_restaurantes');

                const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudinaryCloudName}/image/upload`, {
                    method: 'POST',
                    body: formData,
                }).then(res => res.json());

                if (cloudinaryResponse.secure_url) {
                    logoUrl = cloudinaryResponse.secure_url;
                    fileToUpload = null;
                } else { throw new Error('La subida a Cloudinary falló.'); }
            } catch (uploadError) {
                console.error('Error al subir el logo:', uploadError);
                return alert('Hubo un error al subir el logo. Inténtalo de nuevo.');
            }
        }
        
        const dataToUpdate = { 
            nombre: editRestauranteNombreInput.value, 
            telefono: editRestauranteTelefonoInput.value,
            direccion: restauranteDireccionInput.value,
            descripcion: restauranteDescripcionInput.value,
            mensajeBienvenida: restauranteMensajeTextarea.value,
            logoUrl: logoUrl
        };
        
        const updated = await fetchData(`/api/restaurantes/${RESTAURANTE_ID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToUpdate)
        });

        if (updated) {
            alert('Datos del restaurante actualizados con éxito.');
            loadRestauranteData();
        }
    });

    // --- LÓGICA PARA GENERAR QR DEL RESTAURANTE ---
    restauranteQrBtn.addEventListener('click', () => {
        if (!currentRestauranteSlug) {
            alert('No se pudo generar el QR. Asegúrate de que el restaurante tiene un slug.');
            return;
        }
        const url = `${window.location.origin}/r/${currentRestauranteSlug}`;
        qrcodeDiv.innerHTML = '';
        new QRCode(qrcodeDiv, { text: url, width: 256, height: 256, colorDark : "#002b4d", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H });
        qrLink.href = url;
        qrLink.textContent = `Enlace para: ${userData.nombreRestaurante || 'tu restaurante'}`;
        downloadQrBtn.dataset.filename = `qr-${currentRestauranteSlug}.png`;
        qrcodeContainer.style.display = 'block';
        qrcodeContainer.scrollIntoView({ behavior: 'smooth' });
    });

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
            platoIdInput.value = '';
            platoSubmitBtn.textContent = 'Guardar Plato';
            loadPlatos();
        }
    });

    platosTableBody.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (e.target.classList.contains('toggle-disponibilidad')) { 
            await fetchData(`/api/platos/${id}/toggle`, { method: 'PATCH' });
        }
        else if (e.target.classList.contains('edit-plato')) {
            const p = await fetchData(`/api/platos/${id}`);
            if (p) {
                platoIdInput.value = p._id; 
                platoNombreInput.value = p.nombre; 
                platoDescripcionInput.value = p.descripcion || ''; 
                platoPrecioInput.value = p.precio; 
                platoCategoriaInput.value = p.categoria || '';
                platoSubmitBtn.textContent = 'Actualizar Plato';
                window.scrollTo({ top: platoForm.offsetTop, behavior: 'smooth' });
            }
        } 
        else if (e.target.classList.contains('delete-plato')) {
            if (confirm('¿Estás seguro de que quieres eliminar este plato?')) { 
                const result = await fetchData(`/api/platos/${id}`, { method: 'DELETE' }); 
                if (result === null) {
                    alert('Plato eliminado con éxito.');
                    loadPlatos();
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
            especialIdInput.value = '';
            especialSubmitBtn.textContent = 'Guardar Especial';
            loadEspeciales();
        }
    });

    especialesTableBody.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (e.target.classList.contains('toggle-disponibilidad')) { 
            await fetchData(`/api/especiales/${id}/toggle`, { method: 'PATCH' });
        }
        else if (e.target.classList.contains('edit-especial')) {
            const esp = await fetchData(`/api/especiales/${id}`);
            if (esp) {
                especialIdInput.value = esp._id; 
                especialNombreInput.value = esp.nombre; 
                especialDescripcionInput.value = esp.descripcion || ''; 
                especialPrecioInput.value = esp.precio;
                especialSubmitBtn.textContent = 'Actualizar Especial';
                window.scrollTo({ top: especialForm.offsetTop, behavior: 'smooth' });
            }
        } 
        else if (e.target.classList.contains('delete-especial')) {
            if (confirm('¿Estás seguro de que quieres eliminar este especial?')) { 
                const result = await fetchData(`/api/especiales/${id}`, { method: 'DELETE' }); 
                if (result === null) {
                    alert('Especial eliminado con éxito.');
                    loadEspeciales();
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
        updateMenuDiaForm();
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
            createOpcionInput();
            categoriaSubmitBtn.textContent = 'Guardar Categoría';
            loadCategorias();
        }
    });

    categoriasTableBody.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (e.target.classList.contains('edit-categoria')) {
            const categoria = await fetchData(`/api/menu-categorias/${id}`);
            if (categoria) {
                categoriaIdInput.value = categoria._id; 
                categoriaNombreInput.value = categoria.nombre;
                opcionesContainer.innerHTML = '';
                if (categoria.opciones.length > 0) {
                    categoria.opciones.forEach(opcion => createOpcionInput(opcion));
                } else { 
                    createOpcionInput();
                }
                categoriaSubmitBtn.textContent = 'Actualizar Categoría';
                window.scrollTo({ top: categoriaForm.offsetTop, behavior: 'smooth' });
            }
        } 
        else if (e.target.classList.contains('delete-categoria')) {
            if (confirm('¿Estás seguro de que quieres eliminar esta categoría?')) { 
                const result = await fetchData(`/api/menu-categorias/${id}`, { method: 'DELETE' }); 
                if (result === null) {
                    alert('Categoría eliminada con éxito.');
                    loadCategorias();
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
            menuDiaSubmitBtn.textContent = 'Guardar Menú del Día';
            updateMenuDiaForm();
            loadMenusDia();
        }
    });

    async function loadMenusDia() {
        const menus = await fetchData(`/api/menus-dia/restaurante/${RESTAURANTE_ID}`);
        menusDiaTableBody.innerHTML = '';
        if (menus && Array.isArray(menus)) {
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
        if (e.target.classList.contains('edit-menu')) {
            const menu = await fetchData(`/api/menus-dia/${id}`);
            if (menu) {
                menuDiaIdInput.value = menu._id;
                menuFechaInput.value = new Date(menu.fecha).toISOString().split('T')[0];
                menuNombreInput.value = menu.nombreMenu;
                menuPrecioInput.value = menu.precioMenuGlobal;
                updateMenuDiaForm(menu);
                menuDiaSubmitBtn.textContent = 'Actualizar Menú del Día';
                window.scrollTo({ top: menuDiaForm.offsetTop, behavior: 'smooth' });
            }
        } 
        else if (e.target.classList.contains('delete-menu')) {
            if (confirm('¿Estás seguro de que quieres eliminar este menú del día?')) { 
                const result = await fetchData(`/api/menus-dia/${id}`, { method: 'DELETE' }); 
                if (result === null) {
                    alert('Menú del Día eliminado con éxito.');
                    loadMenusDia();
                }
            }
        }
    });

    // 4. CARGA INICIAL DE DATOS AL CARGAR LA PÁGINA
    config = await fetchData('/api/config');
    loadRestauranteData();
    loadPlatos();
    loadEspeciales();
    loadCategorias();
    loadMenusDia();
    createOpcionInput();
});
