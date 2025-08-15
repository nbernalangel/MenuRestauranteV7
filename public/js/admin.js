// admin.js (CÓDIGO COMPLETO Y FINAL CON CATEGORÍAS DE PIZZA)
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
    let config = {};
    let fileToUpload = null;

    // --- CONEXIÓN A SOCKET.IO ---
    const socket = io();
    socket.on('connect', () => {
        console.log('✅ Conectado al servidor de WebSockets!');
        socket.emit('join_admin_room', RESTAURANTE_ID);
    });
    
    // 2. REFERENCIAS AL DOM
    const adminRestauranteNombre = document.getElementById('admin-restaurante-nombre');
    const logoutBtn = document.getElementById('logout-btn');
    const pedidosContainer = document.getElementById('pedidos-container');
    const mensajeNoPedidos = document.getElementById('mensaje-no-pedidos');
    const editRestauranteForm = document.getElementById('edit-restaurante-form');
    const editRestauranteNombreInput = document.getElementById('edit-restaurante-nombre');
    const editRestauranteTelefonoInput = document.getElementById('edit-restaurante-telefono');
    const restauranteMensajeTextarea = document.getElementById('restaurante-mensaje');
    const restauranteDireccionInput = document.getElementById('restaurante-direccion');
    const restauranteDescripcionInput = document.getElementById('restaurante-descripcion');
    const logoPreview = document.getElementById('logo-preview');
    const logoUploadInput = document.getElementById('logo-upload-input');
    const aceptaDomiciliosCheckbox = document.getElementById('aceptaDomicilios');
    const aceptaServicioEnMesaCheckbox = document.getElementById('aceptaServicioEnMesa');
    const pagoEfectivoAdminCheckbox = document.getElementById('pago-efectivo-admin');
    const pagoTarjetaAdminCheckbox = document.getElementById('pago-tarjeta-admin');
    const pagoTransferenciaAdminCheckbox = document.getElementById('pago-transferencia-admin');

    // --- INICIO: NUEVAS REFERENCIAS PARA DOMICILIO ---
    const cobraDomicilioCheckbox = document.getElementById('cobraDomicilio');
    const costoDomicilioContainer = document.getElementById('costo-domicilio-container');
    const costoDomicilioInput = document.getElementById('costoDomicilio');
    // --- FIN: NUEVAS REFERENCIAS ---

    const downloadReportBtn = document.getElementById('download-report-btn');
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
    const platosTableBody = document.querySelector('#platos-table tbody');
    const platoSubmitBtn = document.getElementById('plato-submit-btn');
    const especialForm = document.getElementById('especial-form');
    const especialIdInput = document.getElementById('especial-id');
    const especialNombreInput = document.getElementById('especial-nombre');
    const especialDescripcionInput = document.getElementById('especial-descripcion');
    const especialPrecioInput = document.getElementById('especial-precio');
    const especialesTableBody = document.querySelector('#especiales-table tbody');
    const especialSubmitBtn = document.getElementById('especial-submit-btn');
    const bebidaForm = document.getElementById('bebida-form');
    const bebidaIdInput = document.getElementById('bebida-id');
    const bebidaNombreInput = document.getElementById('bebida-nombre');
    const bebidaDescripcionInput = document.getElementById('bebida-descripcion');
    const bebidaPrecioInput = document.getElementById('bebida-precio');
    const bebidasTableBody = document.querySelector('#bebidas-table tbody');
    const bebidaSubmitBtn = document.getElementById('bebida-submit-btn');
    const platoCategoriaInput = document.getElementById('plato-categoria');
    const bebidaCategoriaInput = document.getElementById('bebida-categoria');
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
    const pizzaForm = document.getElementById('pizza-form');
    const pizzaIdInput = document.getElementById('pizza-id');
    const pizzaNombreInput = document.getElementById('pizza-nombre');
    const pizzaDescripcionInput = document.getElementById('pizza-descripcion');
    const pizzaCategoriaSelect = document.getElementById('pizza-categoria');
    const pizzaIngredientesInput = document.getElementById('pizza-ingredientes');
    const variantesContainer = document.getElementById('variantes-container');
    const addVarianteBtn = document.getElementById('add-variante-btn');
    const permiteMitadesCheckbox = document.getElementById('permiteMitades');
    const pizzasTableBody = document.querySelector('#pizzas-table tbody');
    const pizzaSubmitBtn = document.getElementById('pizza-submit-btn');
    const titulosForm = document.getElementById('titulos-form');
    const tituloPlatosInput = document.getElementById('titulo-platos-input');
    const tituloBebidasInput = document.getElementById('titulo-bebidas-input');
    const tituloPizzasInput = document.getElementById('titulo-pizzas-input');
    const tituloEspecialesInput = document.getElementById('titulo-especiales-input');
    const tituloMenuDiaInput = document.getElementById('titulo-menu-dia-input');
    const tituloPlatosH2 = document.getElementById('titulo-platos');
    const tituloBebidasH2 = document.getElementById('titulo-bebidas');
    const tituloPizzasH2 = document.getElementById('titulo-pizzas');
    const tituloEspecialesH2 = document.getElementById('titulo-especiales');
    const tituloMenuDiaH2 = document.getElementById('titulo-menu-dia');

    const ESTADOS_PEDIDO = {
        'pendiente': 'Pendiente',
        'en preparación': 'En Preparación',
        'listo': 'Listo para Entregar',
        'entregado': 'Entregado',
        'cancelado': 'Cancelado'
    };
    
    function formatCurrency(value) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
        }).format(value);
    }

    function renderPedidoCard(pedido) {
        const card = document.createElement('div');
        card.className = 'pedido-card';
        card.dataset.pedidoId = pedido._id; 
        const esCompletado = ['entregado', 'cancelado'].includes(pedido.estado);
        if (esCompletado) { card.classList.add('completado'); }
        let opcionesSelect = '';
        for (const [valor, texto] of Object.entries(ESTADOS_PEDIDO)) {
            const isSelected = valor === pedido.estado ? 'selected' : '';
            opcionesSelect += `<option value="${valor}" ${isSelected}>${texto}</option>`;
        }
        const selectHtml = `<select class="estado-select" data-id="${pedido._id}">${opcionesSelect}</select>`;
        const estadoActualTexto = ESTADOS_PEDIDO[pedido.estado] || pedido.estado;
        const estadoCssClass = pedido.estado.replace(/\s+/g, '-');
        card.innerHTML = `
            <h3>Pedido #${pedido.numeroPedido}</h3>
            <p><strong>Cliente:</strong> ${pedido.cliente.nombre}</p>
            ${pedido.tipo === 'Domicilio' && pedido.cliente.telefono ? `<p><strong>Teléfono:</strong> ${pedido.cliente.telefono}</p>` : ''}
            <p><strong>Tipo:</strong> ${pedido.tipo}</p>
            <p><strong>Método de Pago:</strong> ${pedido.metodoDePago || 'No especificado'}</p>
            <p><strong>Estado:</strong> <span class="estado-badge estado-${estadoCssClass}">${estadoActualTexto}</span></p>
            <hr>
            <ul class="items-list">${pedido.items.map(item => `<li>${item.cantidad}x ${item.nombre}</li>`).join('')}</ul>
            <p><strong>Total: ${formatCurrency(pedido.total)}</strong></p>
            ${pedido.notas ? `<p style="margin-top: 0.5rem; font-style: italic;"><strong>Notas:</strong> ${pedido.notas}</p>` : ''}
            ${selectHtml} 
            <p style="text-align: right; font-size: 0.8em; color: #666; margin-top: 1rem; margin-bottom: 0;">Recibido: ${new Date(pedido.createdAt).toLocaleTimeString()}</p>
        `;
        return card;
    }

    async function cargarPedidosDeHoy() {
        const pedidos = await fetchData(`/api/pedidos/restaurante/${RESTAURANTE_ID}/hoy`);
        pedidosContainer.innerHTML = ''; 
        if (pedidos && pedidos.length > 0) {
            mensajeNoPedidos.style.display = 'none';
            pedidos.forEach(pedido => {
                const card = renderPedidoCard(pedido);
                pedidosContainer.appendChild(card);
            });
        } else {
            mensajeNoPedidos.style.display = 'block';
        }
    }

    socket.on('nuevo-pedido', (pedido) => {
        console.log('¡Nuevo pedido recibido!', pedido);
        mensajeNoPedidos.style.display = 'none';
        const card = renderPedidoCard(pedido);
        pedidosContainer.prepend(card);
        try { new Audio('/sounds/notificacion.mp3').play(); } catch(e) {}
    });

    socket.on('actualizacion-estado', (pedido) => {
        console.log('¡Actualización de estado recibida!', pedido);
        const cardExistente = document.querySelector(`.pedido-card[data-pedido-id="${pedido._id}"]`);
        if (cardExistente) {
            const nuevaCard = renderPedidoCard(pedido);
            cardExistente.replaceWith(nuevaCard);
        }
    });

    document.addEventListener('change', async (e) => {
        if (e.target.classList.contains('estado-select')) {
            const pedidoId = e.target.dataset.id;
            const nuevoEstado = e.target.value;
            await fetchData(`/api/pedidos/${pedidoId}/estado`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado })
            });
        }
    });
    
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
    
    if (downloadReportBtn && RESTAURANTE_ID) {
        downloadReportBtn.addEventListener('click', () => {
            const downloadUrl = `/api/pedidos/descargar/${RESTAURANTE_ID}`;
            const link = document.createElement('a');
            link.href = downloadUrl;
            document.body.appendChild(link);
            link.click();
            link.remove();
            alert('El reporte se está descargando. Por favor, revisa tus descargas.');
        });
    }

    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const targetId = button.dataset.target;
            document.querySelectorAll('.admin-module').forEach(section => {
                if (section.id !== 'seccion-pedidos-en-vivo') { 
                    section.style.display = 'none';
                }
            });
            document.getElementById(targetId).style.display = 'block';
        });
    });

    document.querySelector('.nav-btn[data-target="seccion-datos-restaurante"]').classList.add('active');
    document.getElementById('seccion-datos-restaurante').style.display = 'block';
    
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
                aceptaDomiciliosCheckbox.checked = restaurante.aceptaDomicilios;
                aceptaServicioEnMesaCheckbox.checked = restaurante.aceptaServicioEnMesa;
                currentRestauranteSlug = restaurante.slug;
                
                // --- INICIO: CARGAR DATOS DE DOMICILIO ---
                cobraDomicilioCheckbox.checked = restaurante.cobraDomicilio || false;
                costoDomicilioInput.value = restaurante.costoDomicilio || 0;
                // Mostrar u ocultar el campo de costo basado en el checkbox
                costoDomicilioContainer.style.display = cobraDomicilioCheckbox.checked ? 'block' : 'none';
                // --- FIN: CARGAR DATOS ---

                const metodosDePago = restaurante.metodosDePago || {};
                pagoEfectivoAdminCheckbox.checked = metodosDePago.efectivo || false;
                pagoTarjetaAdminCheckbox.checked = metodosDePago.tarjeta || false;
                pagoTransferenciaAdminCheckbox.checked = metodosDePago.transferencia || false;

                const titulos = restaurante.titulosPersonalizados || {};
                tituloPlatosInput.value = titulos.platos || '';
                tituloBebidasInput.value = titulos.bebidas || '';
                tituloPizzasInput.value = titulos.pizzas || '';
                tituloEspecialesInput.value = titulos.especiales || '';
                tituloMenuDiaInput.value = titulos.menuDia || '';
                
                tituloPlatosH2.textContent = titulos.platos || 'Gestionar Platos a la Carta';
                tituloBebidasH2.textContent = titulos.bebidas || 'Gestionar Bebidas y Otros';
                tituloPizzasH2.textContent = titulos.pizzas || 'Gestionar Pizzas';
                tituloEspecialesH2.textContent = titulos.especiales || 'Gestionar Especiales';
                tituloMenuDiaH2.textContent = titulos.menuDia || 'Gestionar Menús del Día';
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

    // --- INICIO: LÓGICA PARA MOSTRAR/OCULTAR CAMPO DE COSTO ---
    cobraDomicilioCheckbox.addEventListener('change', () => {
        costoDomicilioContainer.style.display = cobraDomicilioCheckbox.checked ? 'block' : 'none';
    });
    // --- FIN: LÓGICA ---

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
            logoUrl: logoUrl,
            aceptaDomicilios: aceptaDomiciliosCheckbox.checked,
            aceptaServicioEnMesa: aceptaServicioEnMesaCheckbox.checked,
            // --- INICIO: GUARDAR DATOS DE DOMICILIO ---
            cobraDomicilio: cobraDomicilioCheckbox.checked,
            costoDomicilio: parseFloat(costoDomicilioInput.value) || 0,
            // --- FIN: GUARDAR DATOS ---
            metodosDePago: {
                efectivo: pagoEfectivoAdminCheckbox.checked,
                tarjeta: pagoTarjetaAdminCheckbox.checked,
                transferencia: pagoTransferenciaAdminCheckbox.checked
            }
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
    
    titulosForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const titulos = {
            platos: tituloPlatosInput.value.trim() || undefined,
            bebidas: tituloBebidasInput.value.trim() || undefined,
            pizzas: tituloPizzasInput.value.trim() || undefined,
            especiales: tituloEspecialesInput.value.trim() || undefined,
            menuDia: tituloMenuDiaInput.value.trim() || undefined,
        };

        const dataToUpdate = { titulosPersonalizados: titulos };

        const updated = await fetchData(`/api/restaurantes/${RESTAURANTE_ID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToUpdate)
        });

        if (updated) {
            alert('Títulos personalizados actualizados con éxito.');
            loadRestauranteData();
        }
    });

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

    async function loadPlatos() {
        if (!platosTableBody) return;
        const platos = await fetchData(`/api/platos/restaurante/${RESTAURANTE_ID}`);
        platosTableBody.innerHTML = '';
        if(platos && Array.isArray(platos)) {
            platos.forEach(p => {
                const row = platosTableBody.insertRow();
                row.innerHTML = `
                    <td>${p.nombre}</td>
                    <td>${formatCurrency(p.precio)}</td>
                    <td>${p.categoria || ''}</td>
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

    if(platoForm) {
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
    }

    if(platosTableBody) {
        platosTableBody.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (e.target.classList.contains('edit-plato')) {
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
    }
    
    async function loadEspeciales() {
        if (!especialesTableBody) return;
        const especiales = await fetchData(`/api/especiales/restaurante/${RESTAURANTE_ID}`);
        especialesTableBody.innerHTML = '';
        if(especiales && Array.isArray(especiales)) {
            especiales.forEach(e => {
                const row = especialesTableBody.insertRow();
                row.innerHTML = `
                    <td>${e.nombre}</td>
                    <td>${formatCurrency(e.precio)}</td>
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

    if(especialForm) {
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
    }

    if(especialesTableBody) {
        especialesTableBody.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (e.target.classList.contains('edit-especial')) {
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
    }
    
    async function loadBebidas() {
        if (!bebidasTableBody) return;
        const bebidas = await fetchData(`/api/bebidas/restaurante/${RESTAURANTE_ID}`);
        bebidasTableBody.innerHTML = '';
        if(bebidas && Array.isArray(bebidas)) {
            bebidas.forEach(b => {
                const row = bebidasTableBody.insertRow();
                row.innerHTML = `
                    <td>${b.nombre}</td>
                    <td>${formatCurrency(b.precio)}</td>
                    <td>${b.categoria || ''}</td>
                    <td>
                        <label class="switch">
                            <input type="checkbox" class="toggle-disponibilidad" data-id="${b._id}" data-tipo="bebidas" ${b.disponible ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </td>
                    <td>
                        <button class="edit-bebida btn" data-id='${b._id}'>E</button>
                        <button class="delete-bebida btn btn-danger" data-id='${b._id}'>X</button>
                    </td>
                `;
            });
        }
    }

    if(bebidaForm) {
        bebidaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = { 
                nombre: bebidaNombreInput.value, 
                descripcion: bebidaDescripcionInput.value, 
                precio: parseFloat(bebidaPrecioInput.value), 
                categoria: bebidaCategoriaInput.value,
                restaurante: RESTAURANTE_ID 
            };
            const id = bebidaIdInput.value;
            const url = id ? `/api/bebidas/${id}` : '/api/bebidas';
            const method = id ? 'PUT' : 'POST';

            const result = await fetchData(url, { 
                method: method, 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(data) 
            });

            if (result) {
                alert(id ? 'Bebida actualizada con éxito.' : 'Bebida creada con éxito.');
                bebidaForm.reset(); 
                bebidaIdInput.value = '';
                loadBebidas();
            }
        });
    }

    if(bebidasTableBody) {
        bebidasTableBody.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (e.target.classList.contains('edit-bebida')) {
                const b = await fetchData(`/api/bebidas/${id}`);
                if (b) {
                    bebidaIdInput.value = b._id; 
                    bebidaNombreInput.value = b.nombre; 
                    bebidaDescripcionInput.value = b.descripcion || ''; 
                    bebidaPrecioInput.value = b.precio;
                    bebidaCategoriaInput.value = b.categoria || '';
                    window.scrollTo({ top: bebidaForm.offsetTop, behavior: 'smooth' });
                }
            } 
            else if (e.target.classList.contains('delete-bebida')) {
                if (confirm('¿Estás seguro de que quieres eliminar esta bebida?')) { 
                    const result = await fetchData(`/api/bebidas/${id}`, { method: 'DELETE' }); 
                    if (result === null) {
                        alert('Bebida eliminada con éxito.');
                        loadBebidas();
                    }
                }
            }
        });
    }

    function createVarianteInput(variante = {}) {
        if (!variantesContainer) return;
        const div = document.createElement('div');
        div.className = 'variante-item';
        const tamañoInput = document.createElement('input');
        tamañoInput.type = 'text';
        tamañoInput.className = 'variante-tamaño';
        tamañoInput.value = variante.tamaño || '';
        tamañoInput.placeholder = 'Nombre del tamaño (Ej: Mediana)';
        tamañoInput.required = true;
        const precioInput = document.createElement('input');
        precioInput.type = 'number';
        precioInput.className = 'variante-precio';
        precioInput.value = variante.precio || '';
        precioInput.placeholder = 'Precio';
        precioInput.step = '0.01';
        precioInput.required = true;
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'remove-variante-btn';
        removeButton.textContent = 'X';
        removeButton.onclick = () => div.remove();
        div.appendChild(tamañoInput);
        div.appendChild(precioInput);
        div.appendChild(removeButton);
        variantesContainer.appendChild(div);
    }

    if(addVarianteBtn) {
        addVarianteBtn.addEventListener('click', () => createVarianteInput());
    }

    async function loadPizzas() {
        if (!pizzasTableBody) return;
        const pizzas = await fetchData(`/api/pizzas/restaurante/${RESTAURANTE_ID}`);
        pizzasTableBody.innerHTML = '';
        if (pizzas && Array.isArray(pizzas)) {
            pizzas.forEach(p => {
                const row = pizzasTableBody.insertRow();
                const variantesStr = p.variantes.map(v => `${v.tamaño}: ${formatCurrency(v.precio)}`).join('<br>');
                row.innerHTML = `
                    <td>${p.nombre}</td>
                    <td>${p.categoria || 'Tradicional'}</td>
                    <td>${variantesStr}</td>
                    <td>${p.permiteMitades ? 'Sí' : 'No'}</td>
                    <td>
                        <label class="switch">
                            <input type="checkbox" class="toggle-disponibilidad" data-id="${p._id}" data-tipo="pizzas" ${p.disponible ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </td>
                    <td>
                        <button class="edit-pizza btn" data-id='${p._id}'>E</button>
                        <button class="delete-pizza btn btn-danger" data-id='${p._id}'>X</button>
                    </td>
                `;
            });
        }
    }

    if(pizzaForm) {
        pizzaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const variantes = [];
            variantesContainer.querySelectorAll('.variante-item').forEach(item => {
                const tamaño = item.querySelector('.variante-tamaño').value.trim();
                const precio = parseFloat(item.querySelector('.variante-precio').value);
                if (tamaño && !isNaN(precio)) {
                    variantes.push({ tamaño, precio });
                }
            });

            if (variantes.length === 0) {
                return alert('Debes añadir al menos un tamaño y precio para la pizza.');
            }

            const pizzaData = {
                nombre: pizzaNombreInput.value,
                descripcion: pizzaDescripcionInput.value,
                categoria: pizzaCategoriaSelect.value,
                variantes: variantes,
                permiteMitades: permiteMitadesCheckbox.checked,
                restaurante: RESTAURANTE_ID
            };

            const id = pizzaIdInput.value;
            const url = id ? `/api/pizzas/${id}` : '/api/pizzas';
            const method = id ? 'PUT' : 'POST';

            const result = await fetchData(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pizzaData)
            });

            if (result) {
                alert(id ? 'Pizza actualizada con éxito.' : 'Pizza creada con éxito.');
                pizzaForm.reset();
                pizzaIdInput.value = '';
                variantesContainer.innerHTML = '';
                createVarianteInput();
                pizzaSubmitBtn.textContent = 'Guardar Pizza';
                loadPizzas();
            }
        });
    }

    if(pizzasTableBody) {
        pizzasTableBody.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (e.target.classList.contains('edit-pizza')) {
                const pizza = await fetchData(`/api/pizzas/${id}`);
                if (pizza) {
                    pizzaIdInput.value = pizza._id;
                    pizzaNombreInput.value = pizza.nombre;
                    pizzaDescripcionInput.value = pizza.descripcion || '';
                    permiteMitadesCheckbox.checked = pizza.permiteMitades;
                    pizzaCategoriaSelect.value = pizza.categoria || 'Tradicional';
                    
                    variantesContainer.innerHTML = '';
                    pizza.variantes.forEach(v => createVarianteInput(v));

                    pizzaSubmitBtn.textContent = 'Actualizar Pizza';
                    window.scrollTo({ top: pizzaForm.offsetTop, behavior: 'smooth' });
                }
            } else if (e.target.classList.contains('delete-pizza')) {
                if (confirm('¿Estás seguro de que quieres eliminar esta pizza y todas sus variantes?')) {
                    const result = await fetchData(`/api/pizzas/${id}`, { method: 'DELETE' });
                    if (result === null) {
                        alert('Pizza eliminada con éxito.');
                        loadPizzas();
                    }
                }
            }
        });
    }

    document.addEventListener('change', async (e) => {
        if (e.target.classList.contains('toggle-disponibilidad')) {
            const { id, tipo } = e.target.dataset;
            if (!id || !tipo) return;
            await fetchData(`/api/${tipo}/${id}/toggle`, { method: 'PATCH' });
        }
    });

    function createOpcionInput(opcion = {}) {
        if (!opcionesContainer) return;
        const div = document.createElement('div'); div.classList.add('opcion-item'); div.style.display = 'flex'; div.style.alignItems = 'center'; div.style.marginBottom = '5px';
        const input = document.createElement('input'); input.type = 'text'; input.className = 'opcion-nombre'; input.value = opcion.nombre || ''; input.placeholder = 'Nombre de la opción'; input.required = true; input.style.flexGrow = '1';
        const button = document.createElement('button'); button.type = 'button'; button.className = 'remove-opcion-btn btn'; button.textContent = 'Quitar'; button.style.marginLeft = '10px';
        div.appendChild(input); div.appendChild(button);
        opcionesContainer.appendChild(div);
        button.addEventListener('click', () => { div.remove(); });
    }
    if(addOpcionBtn) addOpcionBtn.addEventListener('click', () => createOpcionInput());

    async function loadCategorias() {
        if (!categoriasTableBody) return;
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

    if(categoriaForm) {
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
    }

    if(categoriasTableBody) {
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
    }

    function updateMenuDiaForm(menuAEditar = null) {
        if (!menuItemsSelectionContainer) return;
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

    if(menuDiaForm) {
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
    }

    async function loadMenusDia() {
        if (!menusDiaTableBody) return;
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

    if(menusDiaTableBody) {
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
    }

    // CARGA INICIAL DE DATOS
    async function init() {
        config = await fetchData('/api/config');
        await loadRestauranteData();
        await loadPlatos();
        await loadEspeciales();
        await loadBebidas();
        await loadCategorias();
        await loadMenusDia();
        if (pizzaForm) {
            await loadPizzas();
            createVarianteInput();
        }
        if (categoriaForm) {
            createOpcionInput();
        }
        await cargarPedidosDeHoy();
    }

    init();
});