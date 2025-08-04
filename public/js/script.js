// js/script.js (CÓDIGO COMPLETO Y ACTUALIZADO)
document.addEventListener('DOMContentLoaded', () => {
    // 1. REFERENCIAS AL DOM
    const dailyMenuSection = document.getElementById('daily-menu-section');
    const urlParams = new URLSearchParams(window.location.search);
    const slug = window.location.pathname.split('/')[2];
    
    // Check if the URL is valid for a restaurant menu
    if (!slug) {
        document.querySelector('.max-w-4xl').innerHTML = `
            <div class="p-8 text-center text-gray-700">
                <h1 class="text-3xl font-bold mb-4">Error: URL de restaurante inválida.</h1>
                <p>Asegúrate de que la URL sea del tipo <strong>/r/nombre-del-restaurante</strong></p>
            </div>
        `;
        return;
    }

    const restaurantLogoContainer = document.getElementById('restaurant-logo-container');
    const nombreRestauranteElem = document.getElementById('nombre-restaurante');
    const mensajeBienvenidaElem = document.getElementById('mensaje-bienvenida');
    
    // Contenedores para el menú
    const menuDelDiaContent = document.getElementById('menu-del-dia-content');
    const especialesContent = document.getElementById('especiales-content');
    const platosALaCartaContent = document.getElementById('platos-a-la-carta-content');
    const bebidasContent = document.getElementById('bebidas-content');

    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalPriceDisplay = document.getElementById('cart-total-price');
    const customerFormContainer = document.getElementById('customer-form-container');
    const notasClienteTextarea = document.getElementById('notas-cliente');
    const checkoutBtn = document.getElementById('send-order-btn'); 

    // 2. ESTADO
    let cart = [];
    let restauranteInfo = {};

    // 3. FUNCIÓN AUXILIAR
    function formatCurrency(value) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
        }).format(value);
    }
        // Pega esta nueva función aquí
    function escapeAttr(str) {
        if (typeof str !== 'string') return '';
        // Reemplaza las comillas dobles para no romper el atributo HTML
        return str.replace(/"/g, '&quot;');
    }

    // 4. LÓGICA DEL CARRITO
    function addToCart(item) {
        const precio = parseFloat(item.precio);
        if (isNaN(precio)) { return; }
        const existingItem = cart.find(cartItem => cartItem.id === item.id);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({ ...item, quantity: 1, precio: precio });
        }
        renderCart();
    }
    
    function removeFromCart(itemId) {
        const itemIndex = cart.findIndex(cartItem => cartItem.id === itemId);
        if (itemIndex > -1) {
            if (cart[itemIndex].quantity > 1) {
                cart[itemIndex].quantity--;
            } else {
                cart.splice(itemIndex, 1);
            }
        }
        renderCart();
    }
    
    function renderCart() {
        if (!cartItemsContainer) return;
        cartItemsContainer.innerHTML = '';
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p>Tu carrito está vacío.</p>';
            cartTotalPriceDisplay.textContent = formatCurrency(0);
            return;
        }
        let total = 0;
        cart.forEach(item => {
            total += item.precio * item.quantity;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'cart-item';
            itemDiv.innerHTML = `<div class="cart-item-details"><span class="item-name">${item.quantity}x ${item.nombre}</span><span class="item-price">${formatCurrency(item.precio * item.quantity)}</span></div><button class="remove-btn" data-id="${item.id}">×</button>`;
            cartItemsContainer.appendChild(itemDiv);
        });
        cartTotalPriceDisplay.textContent = formatCurrency(total);
    }
    
    if(cartItemsContainer) {
        cartItemsContainer.addEventListener('click', (e) => {
            const removeButton = e.target.closest('.remove-btn');
            if (removeButton) removeFromCart(removeButton.dataset.id);
        });
    }

    // 5. RENDERIZADO DE MENÚS (CON CÓDIGO DEFENSIVO)
    function renderMenuDelDia(menu) {
    if (!menuDelDiaContent || !dailyMenuSection) return;

    if (!menu) {
        dailyMenuSection.style.display = 'none';
        return;
    }

    dailyMenuSection.style.display = 'block'; // Muestra la sección entera
    let opcionesHtml = '';
    menu.itemsPorCategoria.forEach((cat, index) => {
        opcionesHtml += `<div><strong>${cat.categoriaNombre}:</strong></div>`;
        let radioButtonsHtml = '';
        cat.platosEscogidos.forEach((plato) => { radioButtonsHtml += `<label class="radio-option-label"><input type="radio" name="menu-cat-${index}" value="${plato.nombre}"> ${plato.nombre}</label>`; });
        opcionesHtml += `<div class="radio-options-container">${radioButtonsHtml}</div>`;
    });
    // La clase 'menu-card-diario' es importante para que no se corte
    menuDelDiaContent.innerHTML = `<div class="menu-card menu-card-diario"><div><h3>${menu.nombreMenu}</h3><div class="description">${opcionesHtml}</div></div><div class="card-footer"><span class="price">${formatCurrency(menu.precioMenuGlobal)}</span><button class="add-btn add-menu-to-cart-btn" data-precio="${menu.precioMenuGlobal}" data-nombre-base="${menu.nombreMenu}">Añadir Menú</button></div></div>`;
}
    
    // EN TU ARCHIVO script.js
function renderPlatos(platos, container) {
    if (!container) return;
    if (!platos || platos.length === 0) { container.parentElement.style.display = 'none'; return; }

    container.parentElement.style.display = 'block';
    container.innerHTML = '';
    platos.forEach(plato => {
        const platoDiv = document.createElement('div');
        platoDiv.className = 'menu-card';
        // Envolvemos el contenido para un mejor control del layout
        platoDiv.innerHTML = `
            <div class="content-wrapper">
                <h3>${plato.nombre}</h3>
                <p class="description">${plato.descripcion || ''}</p>
            </div>
            <div class="card-footer">
                <span class="price">${formatCurrency(plato.precio)}</span>
                <button class="add-btn add-plato-to-cart-btn" data-id="${plato._id}" data-nombre="${escapeAttr(plato.nombre)}" data-precio="${plato.precio}">Añadir</button>
            </div>`;
        container.appendChild(platoDiv);
    });
}

    // 6. LÓGICA DE EVENTOS
    document.addEventListener('click', (e) => {
        const addPlatoBtn = e.target.closest('.add-plato-to-cart-btn');
        if (addPlatoBtn) {
            const { id, nombre, precio } = addPlatoBtn.dataset;
            addToCart({ id, nombre, precio: parseFloat(precio) });
        }

        const addMenuBtn = e.target.closest('.add-menu-to-cart-btn');
        if (addMenuBtn) {
            const nombreBase = addMenuBtn.dataset.nombreBase;
            const precio = parseFloat(addMenuBtn.dataset.precio);
            let selecciones = [];
            const categorias = menuDelDiaContent.querySelectorAll('input[type="radio"]');
            const gruposDeCategorias = new Set([...categorias].map(radio => radio.name));
            for (const groupName of gruposDeCategorias) {
                const checkedRadio = menuDelDiaContent.querySelector(`input[name="${groupName}"]:checked`);
                if (!checkedRadio) {
                    const categoriaLabel = menuDelDiaContent.querySelector(`input[name="${groupName}"]`).closest('.description').querySelector('strong').textContent;
                    return alert(`Por favor, selecciona una opción para "${categoriaLabel.replace(':', '')}".`);
                }
                selecciones.push(checkedRadio.value);
            }
            const nombreCompleto = `${nombreBase} (${selecciones.join(', ')})`;
            addToCart({ id: `menu-${Date.now()}`, nombre: nombreCompleto, precio: precio });
        }
    });

    // 7. LÓGICA DE WHATSAPP
if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async () => {
        if (cart.length === 0) { return alert('Tu carrito está vacío.'); }

        // --- LÓGICA CORREGIDA AQUÍ ---
        const tipoPedido = urlParams.get('tipo'); // Lee el parámetro ?tipo= de la URL
        const nombreCliente = document.getElementById('nombre-cliente')?.value.trim();

        if (!nombreCliente) { return alert('Por favor, ingresa tu nombre.'); }
        
        const notas = notasClienteTextarea.value.trim() || '';
        const totalPedido = cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0);
        
        let pedidoParaGuardar = { restaurante: restauranteInfo._id, items: cart.map(item => ({ nombre: item.nombre, cantidad: item.quantity, precio: item.precio })), total: totalPedido, cliente: { nombre: nombreCliente }, notas };
        let message = `*¡Nuevo Pedido para ${restauranteInfo.nombre}!* \n\n`;

        if (tipoPedido === 'mesa') {
            const numeroMesa = document.getElementById('numero-mesa')?.value.trim();
            if (!numeroMesa) { return alert('Por favor, ingresa tu número de mesa.'); }
            
            pedidoParaGuardar.tipo = 'Mesa';
            pedidoParaGuardar.cliente.numeroMesa = numeroMesa;
            message += `*Pedido para la MESA #${numeroMesa}*\n*Cliente:* ${nombreCliente}\n`;

        } else { // Asumir que es para domicilio
            const telefono = document.getElementById('telefono-cliente')?.value.trim();
            const direccion = document.getElementById('direccion-cliente')?.value.trim();
            if (!telefono || !direccion) { return alert('Los campos "Teléfono" y "Dirección" son obligatorios.'); }

            pedidoParaGuardar.tipo = 'Domicilio';
            pedidoParaGuardar.cliente.telefono = telefono;
            pedidoParaGuardar.cliente.direccion = direccion;
            message += `*Pedido a DOMICILIO*\n*Cliente:* ${nombreCliente}\n*Teléfono:* ${telefono}\n*Dirección:* ${direccion}\n`;
        }
        
        message += `\n*--- Detalle del Pedido ---*\n`;
        cart.forEach(item => { message += `${item.quantity}x ${item.nombre} - ${formatCurrency(item.precio * item.quantity)}\n`; });
        message += `\n*Total: ${formatCurrency(totalPedido)}*`;
        if (notas) message += `\n\n*Notas:* ${notas}`;

        // Guardar el pedido en la base de datos (esto ya estaba bien)
        try { 
            await fetch('/api/pedidos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedidoParaGuardar) }); 
        } catch (error) { 
            console.error('Error de red al registrar el pedido:', error); 
        }

        // Abrir WhatsApp
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${restauranteInfo.telefono.replace(/[\s\-()]/g, '')}&text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    });
}

    // 8. RENDERIZAR FORMULARIO DINÁMICO
function renderCustomerForm() {
    if (!customerFormContainer) return;

    // --- LÓGICA CORREGIDA AQUÍ ---
    const tipoPedido = urlParams.get('tipo'); // Lee el parámetro ?tipo= de la URL

    let formHtml = '';

    if (tipoPedido === 'mesa') {
        // Formulario para pedir EN LA MESA
        formHtml = `
            <label for="nombre-cliente">Tu Nombre:</label>
            <input type="text" id="nombre-cliente" required>
            <label for="numero-mesa">Número de Mesa:</label>
            <input type="number" id="numero-mesa" required>
        `;
    } else {
        // Formulario para pedir A DOMICILIO (opción por defecto)
        formHtml = `
            <label for="nombre-cliente">Tu Nombre:</label>
            <input type="text" id="nombre-cliente" required>
            <label for="telefono-cliente">Tu Teléfono (WhatsApp):</label>
            <input type="tel" id="telefono-cliente" required>
            <label for="direccion-cliente">Tu Dirección:</label>
            <input type="text" id="direccion-cliente" required>
        `;
    }
    customerFormContainer.innerHTML = formHtml;
}
    
    // 9. CARGA INICIAL
    async function loadPage() {
        const slug = window.location.pathname.split('/')[2];
        if (!slug) { return; }
        try {
            const data = await fetch(`/api/public/menu/${slug}`).then(res => res.json());
            if (!data.restaurante) throw new Error('Restaurante no encontrado');

            restauranteInfo = data.restaurante;
            document.title = restauranteInfo.nombre;

            if (restaurantLogoContainer) { restaurantLogoContainer.innerHTML = restauranteInfo.logoUrl ? `<img src="${restauranteInfo.logoUrl}" alt="Logo de ${restauranteInfo.nombre}" class="restaurant-logo">` : ''; }
            if (nombreRestauranteElem) nombreRestauranteElem.textContent = restauranteInfo.nombre;
            if (mensajeBienvenidaElem) mensajeBienvenidaElem.textContent = restauranteInfo.mensajeBienvenida || '';

            renderMenuDelDia(data.menuDelDia);
            renderPlatos(data.platosEspeciales, especialesContent);
            renderPlatos(data.platosALaCarta, platosALaCartaContent);
            
            // Renderizar las bebidas si existen
            if (data.bebidas && data.bebidas.length > 0) {
                renderPlatos(data.bebidas, bebidasContent); // Usa la misma función para renderizar bebidas
            } else {
                bebidasContent.parentElement.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Error al cargar el menú:', error);
            document.body.innerHTML = `<div class="container"><h1>Error al cargar el menú</h1><p>${error.message}</p></div>`;
        }
    }
    loadPage();
    renderCustomerForm();
});