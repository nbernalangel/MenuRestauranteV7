document.addEventListener('DOMContentLoaded', async () => {
    // 1. REFERENCIAS AL DOM
    const nombreRestauranteElem = document.getElementById('nombre-restaurante');
    const menuDelDiaContent = document.getElementById('menu-del-dia-content');
    const especialesContent = document.getElementById('especiales-content');
    const platosALaCartaContent = document.getElementById('platos-a-la-carta-content');
    const checkoutBtn = document.getElementById('checkout-btn');
    const nombreClienteInput = document.getElementById('nombre-cliente');
    const telefonoClienteInput = document.getElementById('telefono-cliente');
    const direccionClienteInput = document.getElementById('direccion-cliente');
    const notasClienteInput = document.getElementById('notas-cliente');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalPriceDisplay = document.getElementById('cart-total-price');

    // 2. ESTADO
    let cart = [];
    let restauranteInfo = {};

    // 3. LÓGICA DEL CARRITO
    function addToCart(item) {
        const precio = parseFloat(item.precio);
        if (isNaN(precio)) {
            console.error("Error: Se intentó añadir un ítem sin precio válido.", item);
            return;
        }
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
        cartItemsContainer.innerHTML = '';
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p>Tu carrito está vacío.</p>';
            cartTotalPriceDisplay.textContent = '0.00';
            return;
        }
        let total = 0;
        cart.forEach(item => {
            total += item.precio * item.quantity;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'cart-item';
            itemDiv.innerHTML = `
                <div class="cart-item-details">
                    <span class="item-name">${item.quantity}x ${item.nombre}</span>
                    <span class="item-price">$${(item.precio * item.quantity).toFixed(2)}</span>
                </div>
                <button class="remove-btn" data-id="${item.id}">×</button>
            `;
            cartItemsContainer.appendChild(itemDiv);
        });
        cartTotalPriceDisplay.textContent = total.toFixed(2);
    }
    
    cartItemsContainer.addEventListener('click', (e) => {
        const removeButton = e.target.closest('.remove-btn');
        if (removeButton) {
            removeFromCart(removeButton.dataset.id);
        }
    });

    // 4. RENDERIZADO DE MENÚS (Con el nuevo diseño de tarjetas)
    function renderMenuDelDia(menu) {
        if (!menu) {
            menuDelDiaContent.parentElement.style.display = 'none';
            return;
        }
        menuDelDiaContent.parentElement.style.display = 'block';

        let opcionesHtml = '';
        menu.itemsPorCategoria.forEach((cat, index) => {
            opcionesHtml += `<div><strong>${cat.categoriaNombre}:</strong></div>`;
            const opciones = cat.platosEscogidos;
            if (opciones.length > 1) {
                opciones.forEach((plato, i) => {
                    opcionesHtml += `<label style="font-weight:normal; display:inline-block; margin-right:15px;"><input type="radio" name="menu-cat-${index}" value="${plato.nombre}" ${i === 0 ? 'checked' : ''}> ${plato.nombre}</label>`;
                });
            } else if (opciones.length === 1) {
                opcionesHtml += `<span data-opcion-unica="true" data-nombre="${opciones[0].nombre}">${opciones[0].nombre}</span>`;
            }
        });

        menuDelDiaContent.innerHTML = `
            <div class="menu-card">
                <div>
                    <h3>${menu.nombreMenu}</h3>
                    <div class="description">${opcionesHtml}</div>
                </div>
                <div class="card-footer">
                    <span class="price">$${menu.precioMenuGlobal.toFixed(2)}</span>
                    <button class="add-btn add-menu-to-cart-btn" data-precio="${menu.precioMenuGlobal}" data-nombre-base="${menu.nombreMenu}">Añadir Menú</button>
                </div>
            </div>`;
    }
    
    function renderPlatos(platos, container, tipoPlato) {
        if (!platos || platos.length === 0) {
            container.parentElement.style.display = 'none';
            return;
        }
        container.parentElement.style.display = 'block';
        container.innerHTML = '';
        platos.forEach(plato => {
            const platoDiv = document.createElement('div');
            platoDiv.className = 'menu-card';
            platoDiv.innerHTML = `
                <div>
                    <h3>${plato.nombre}</h3>
                    <p class="description">${plato.descripcion || ''}</p>
                </div>
                <div class="card-footer">
                    <span class="price">$${plato.precio.toFixed(2)}</span>
                    <button class="add-btn add-plato-to-cart-btn" data-id="${plato._id}" data-nombre="${plato.nombre}" data-precio="${plato.precio}">Añadir</button>
                </div>
            `;
            container.appendChild(platoDiv);
        });
    }

    // 5. LÓGICA DE EVENTOS DE AÑADIR AL CARRITO
    document.querySelector('.public-menu-grid').addEventListener('click', (e) => {
        if (e.target.classList.contains('add-plato-to-cart-btn')) {
            const { id, nombre, precio } = e.target.dataset;
            addToCart({ id, nombre, precio: parseFloat(precio) });
        } else if (e.target.classList.contains('add-menu-to-cart-btn')) {
            const nombreBase = e.target.dataset.nombreBase;
            const precio = parseFloat(e.target.dataset.precio);
            
            let selecciones = [];
            const radioGroups = menuDelDiaContent.querySelectorAll('input[type="radio"]');
            radioGroups.forEach(radio => {
                if (radio.checked) {
                    selecciones.push(radio.value);
                }
            });
            
            menuDelDiaContent.querySelectorAll('[data-opcion-unica]').forEach(opcion => {
                selecciones.push(opcion.dataset.nombre);
            });
            
            const nombreCompleto = `${nombreBase} (${selecciones.join(', ')})`;
            addToCart({ id: `menu-${Date.now()}`, nombre: nombreCompleto, precio: precio });
        }
    });

   // 6. LÓGICA DE WHATSAPP
checkoutBtn.addEventListener('click', async () => { // <-- Se añade 'async'
    if (cart.length === 0) { return alert('Tu carrito está vacío.'); }
    const nombreCliente = nombreClienteInput.value.trim();
    if (!nombreCliente) { return alert('Por favor, ingresa tu nombre.'); }
    
    const telefono = telefonoClienteInput.value.trim();
    const direccion = direccionClienteInput.value.trim();
    const notas = notasClienteInput.value.trim();

    // --- INICIO DE LA CORRECCIÓN ---

    // 1. Preparamos el objeto del pedido para guardarlo
    const pedidoParaGuardar = {
        restaurante: restauranteInfo._id, // Usamos el ID guardado en restauranteInfo
        items: cart.map(item => ({
            nombre: item.nombre,
            cantidad: item.quantity,
            precio: item.precio
        })),
        total: cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0),
        cliente: {
            nombre: nombreCliente,
            telefono: telefono,
            direccion: direccion
        }
    };

    try {
        // 2. Enviamos el pedido al backend para registrarlo
        const registroResponse = await fetch('/api/pedidos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pedidoParaGuardar)
        });

        if (registroResponse.ok) {
            console.log('✅ Pedido registrado para estadísticas.');
        } else {
            console.error('No se pudo registrar el pedido para estadísticas.');
        }
    } catch (error) {
        console.error('Error de red al registrar el pedido:', error);
    }

    // --- FIN DE LA CORRECCIÓN ---


    // 3. La lógica de WhatsApp continúa igual que antes
    let message = `*¡Nuevo Pedido para ${restauranteInfo.nombre}!* \n\n`;
    message += `*Cliente:* ${nombreCliente}\n`;
    if (telefono) message += `*Teléfono:* ${telefono}\n`;
    if (direccion) message += `*Dirección:* ${direccion}\n`;
    
    message += `\n*--- Detalle del Pedido ---*\n`;
    cart.forEach(item => {
        message += `${item.quantity}x ${item.nombre} - $${(item.precio * item.quantity).toFixed(2)}\n`;
    });
    message += `\n*Total: $${cartTotalPriceDisplay.textContent}*`;
    if (notas) message += `\n\n*Notas:* ${notas}`;
    
    const whatsappNumber = restauranteInfo.telefono;
    if (!whatsappNumber) { return alert('Este restaurante no tiene un número de WhatsApp configurado.'); }
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
});

    // 7. CARGA INICIAL (CORREGIDO PARA USAR EL SLUG ORIGINAL)
    async function loadPage() {
        const pathParts = window.location.pathname.split('/');
        const slug = pathParts.pop() || pathParts.pop(); 

        if (!slug || window.location.pathname.indexOf('/r/') === -1) {
            document.body.innerHTML = `<div class="container"><h1>Error: URL de restaurante inválida.</h1><p>Asegúrate de que la URL sea del tipo /r/nombre-del-restaurante</p></div>`;
            return;
        }
        try {
            const data = await fetch(`/api/public/menu/${slug}`).then(res => res.json());
            if (!data.restaurante) throw new Error('Restaurante no encontrado');

            restauranteInfo = data.restaurante;
            document.title = restauranteInfo.nombre;
            nombreRestauranteElem.textContent = restauranteInfo.nombre;

            renderMenuDelDia(data.menuDelDia);
            renderPlatos(data.platosEspeciales, especialesContent, 'especiales');
            renderPlatos(data.platosALaCarta, platosALaCartaContent, 'platos a la carta');

        } catch (error) {
            console.error('Error al cargar el menú:', error);
            document.body.innerHTML = `<div class="container"><h1>Error al cargar el menú</h1><p>${error.message}</p></div>`;
        }
    }

    loadPage();
});