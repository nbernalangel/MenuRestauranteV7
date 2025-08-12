// script.js (CÓDIGO COMPLETO Y FINAL CON MODAL DE PIZZAS Y TÍTULOS CORREGIDOS)
document.addEventListener('DOMContentLoaded', () => {
    // 1. REFERENCIAS AL DOM
    const urlParams = new URLSearchParams(window.location.search);
    const slug = window.location.pathname.split('/')[2];
    
    if (!slug) {
        document.body.innerHTML = '<div style="text-align: center; padding: 2rem;"><h1>URL de restaurante inválida.</h1></div>';
        return;
    }

    const restaurantLogoContainer = document.getElementById('restaurant-logo-container');
    const nombreRestauranteElem = document.getElementById('nombre-restaurante');
    const mensajeBienvenidaElem = document.getElementById('mensaje-bienvenida');
    
    const dailyMenuSection = document.getElementById('daily-menu-section');
    const menuDelDiaContent = document.getElementById('menu-del-dia-content');
    const especialesSection = document.getElementById('especiales-section');
    const especialesContent = document.getElementById('especiales-content');
    const platosCartaSection = document.getElementById('carta-section');
    const platosALaCartaContent = document.getElementById('platos-a-la-carta-content');
    const bebidasSection = document.getElementById('bebidas-section');
    const bebidasContent = document.getElementById('bebidas-content');
    const pizzasSection = document.getElementById('pizzas-section');
    const pizzasContent = document.getElementById('pizzas-content');

    // --- NUEVAS REFERENCIAS PARA LOS TÍTULOS DE LAS SECCIONES ---
    const tituloPlatos = document.getElementById('titulo-platos');
    const tituloEspeciales = document.getElementById('titulo-especiales');
    const tituloPizzas = document.getElementById('titulo-pizzas');
    const tituloBebidas = document.getElementById('titulo-bebidas');
    const tituloMenuDia = document.getElementById('titulo-menu-dia');
    // -------------------------------------------------------------

    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalPriceDisplay = document.getElementById('cart-total-price');
    const customerFormContainer = document.getElementById('customer-form-container');
    const notasClienteTextarea = document.getElementById('notas-cliente');
    const checkoutBtn = document.getElementById('send-order-btn'); 

    const pizzaModal = document.getElementById('pizza-modal');
    const pizzaModalContent = document.getElementById('pizza-modal-content');
    const pizzaModalTitle = document.getElementById('pizza-modal-title');
    const closePizzaModalBtn = document.getElementById('close-pizza-modal-btn');
    const pizzaModalVariantes = document.getElementById('pizza-modal-variantes');
    const pizzaModalTipoContainer = document.getElementById('pizza-modal-tipo-container');
    const pizzaModalMitadesContainer = document.getElementById('pizza-modal-mitades-container');
    const pizzaModalMitadSelect = document.getElementById('pizza-modal-mitad-select');
    const pizzaModalPrice = document.getElementById('pizza-modal-price');
    const addPizzaToCartBtn = document.getElementById('add-pizza-to-cart-btn');

    // 2. ESTADO
    let cart = [];
    let restauranteInfo = {};
    let allPizzas = []; 
    let currentPizza = {};

    // 3. FUNCIONES AUXILIARES
    function formatCurrency(value) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
        }).format(value);
    }
    function escapeAttr(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/"/g, '&quot;');
    }

    // 4. LÓGICA DEL CARRITO
    function addToCart(item) {
        const precio = parseFloat(item.precio);
        if (isNaN(precio)) { return; }
        const existingItem = cart.find(cartItem => cartItem.nombre === item.nombre);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({ ...item, id: item.id || `item-${Date.now()}`, quantity: 1, precio: precio });
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
    
    // 5. RENDERIZADO DE MENÚS (FUNCIÓN MODIFICADA)
function renderMenuDelDia(menu) {
    if (!menuDelDiaContent || !dailyMenuSection) return;
    if (!menu) {
        dailyMenuSection.style.display = 'none';
        return;
    }
    dailyMenuSection.style.display = 'block';

    const menuCard = document.createElement('div');
    // Aplicamos clases de Tailwind directamente al contenedor
    menuCard.className = 'menu-card menu-card-diario';

    const menuContentWrapper = document.createElement('div');

    const menuTitle = document.createElement('h3');
    menuTitle.textContent = menu.nombreMenu;
    menuContentWrapper.appendChild(menuTitle);

    const descriptionDiv = document.createElement('div');
    descriptionDiv.className = 'description';

    menu.itemsPorCategoria.forEach((cat, index) => {
        // Título de la categoría
        const categoriaTitle = document.createElement('strong');
        // Aquí usamos las clases de Tailwind para el estilo
        categoriaTitle.className = 'block text-lg font-bold text-ting-blue mt-4 mb-2';
        categoriaTitle.textContent = `${cat.categoriaNombre}:`;
        descriptionDiv.appendChild(categoriaTitle);

        // Opciones en un contenedor
        const radioOptionsContainer = document.createElement('div');
        // Usamos flexbox para que las opciones se organicen en dos columnas si hay espacio
        radioOptionsContainer.className = 'flex flex-wrap gap-x-6 gap-y-2';

        cat.platosEscogidos.forEach((plato) => {
            const label = document.createElement('label');
            // Clases de Tailwind para las opciones
            label.className = 'flex items-center text-sm font-normal text-gray-800';
            label.innerHTML = `<input type="radio" name="menu-cat-${index}" value="${plato.nombre}" class="mr-2"> ${plato.nombre}`;
            radioOptionsContainer.appendChild(label);
        });

        descriptionDiv.appendChild(radioOptionsContainer);
    });

    menuContentWrapper.appendChild(descriptionDiv);
    menuCard.appendChild(menuContentWrapper);

    const cardFooter = document.createElement('div');
    cardFooter.className = 'card-footer';
    cardFooter.innerHTML = `<span class="price">${formatCurrency(menu.precioMenuGlobal)}</span><button class="add-btn add-menu-to-cart-btn" data-precio="${menu.precioMenuGlobal}" data-nombre-base="${menu.nombreMenu}">Añadir Menú</button>`;
    menuCard.appendChild(cardFooter);

    menuDelDiaContent.innerHTML = '';
    menuDelDiaContent.appendChild(menuCard);
    }
    
    function renderPlatos(platos, container, section) {
        if (!container || !section) return;
        if (!platos || platos.length === 0) {
            section.style.display = 'none';
            return;
        }
        section.style.display = 'block';
        container.innerHTML = '';
        platos.forEach(plato => {
            const platoDiv = document.createElement('div');
            platoDiv.className = 'menu-card';
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

    function renderPizzas(pizzas, container, section) {
        if (!container || !section) return;

        if (!pizzas || pizzas.length === 0) {
            section.style.display = 'none';
            return;
        }
        section.style.display = 'block';
        container.innerHTML = '';

        pizzas.forEach(pizza => {
            const minPrice = pizza.variantes.length > 0 ? Math.min(...pizza.variantes.map(v => v.precio)) : 0;

            const pizzaDiv = document.createElement('div');
            pizzaDiv.className = 'menu-card';
            pizzaDiv.innerHTML = `
                <div class="content-wrapper">
                    <h3>${pizza.nombre}</h3>
                    <p class="description">${pizza.descripcion || ''}</p>
                </div>
                <div class="card-footer">
                    <span class="price">Desde ${formatCurrency(minPrice)}</span>
                    <button class="add-btn open-pizza-modal-btn" data-pizza-id="${pizza._id}">Elegir</button>
                </div>`;
             container.appendChild(pizzaDiv);
        });
    }

    // 6. LÓGICA DE WHATSAPP Y FORMULARIO
    function renderCustomerForm() {
        if (!customerFormContainer) return;
        const tipoPedido = urlParams.get('tipo');
        let formHtml = '';
        if (tipoPedido === 'mesa') {
            formHtml = `
                <label for="nombre-cliente">Tu Nombre:</label><input type="text" id="nombre-cliente" required>
                <label for="numero-mesa">Número de Mesa:</label><input type="number" id="numero-mesa" required>
            `;
        } else {
            formHtml = `
                <label for="nombre-cliente">Tu Nombre:</label><input type="text" id="nombre-cliente" required>
                <label for="telefono-cliente">Tu Teléfono (WhatsApp):</label><input type="tel" id="telefono-cliente" required>
                <label for="direccion-cliente">Tu Dirección:</label><input type="text" id="direccion-cliente" required>
            `;
        }
        customerFormContainer.innerHTML = formHtml;
    }
    
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', async () => {
            if (cart.length === 0) { return alert('Tu carrito está vacío.'); }

            const tipoPedido = urlParams.get('tipo');
            const nombreCliente = document.getElementById('nombre-cliente')?.value.trim();
            if (!nombreCliente) { return alert('Por favor, ingresa tu nombre.'); }
            
            const notas = notasClienteTextarea.value.trim() || '';
            const totalPedido = cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0);
            
            let pedidoParaGuardar = { 
                restaurante: restauranteInfo._id, 
                items: cart.map(item => ({ nombre: item.nombre, cantidad: item.quantity, precio: item.precio })), 
                total: totalPedido, 
                cliente: { nombre: nombreCliente }, 
                notas 
            };
            
            let message = `*¡Nuevo Pedido para ${restauranteInfo.nombre}!* \n\n`;

            if (tipoPedido === 'mesa') {
                const numeroMesa = document.getElementById('numero-mesa')?.value.trim();
                if (!numeroMesa) { return alert('Por favor, ingresa tu número de mesa.'); }
                pedidoParaGuardar.tipo = 'Mesa';
                pedidoParaGuardar.cliente.numeroMesa = numeroMesa;
                message += `*Pedido para la MESA #${numeroMesa}*\n*Cliente:* ${nombreCliente}\n`;
            } else {
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
            
            const whatsappUrl = `https://api.whatsapp.com/send?phone=${restauranteInfo.telefono.replace(/[\s\-()]/g, '')}&text=${encodeURIComponent(message)}`;

            window.open(whatsappUrl, '_blank');
            
            try { 
                await fetch('/api/pedidos', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(pedidoParaGuardar) 
                }); 
            } catch (error) { 
                console.error('Error de red al registrar el pedido (el cliente ya fue redirigido a WhatsApp):', error); 
            }
        });
    }

    // 7. CARGA INICIAL
    async function loadPage() {
        try {
            const data = await fetch(`/api/public/menu/${slug}`).then(res => res.json());
            if (!data.restaurante) throw new Error('Restaurante no encontrado');
            restauranteInfo = data.restaurante;
            document.title = restauranteInfo.nombre;
            if (restaurantLogoContainer) { restaurantLogoContainer.innerHTML = restauranteInfo.logoUrl ? `<img src="${restauranteInfo.logoUrl}" alt="Logo de ${restauranteInfo.nombre}" class="restaurant-logo">` : ''; }
            if (nombreRestauranteElem) nombreRestauranteElem.textContent = restauranteInfo.nombre;
            if (mensajeBienvenidaElem) mensajeBienvenidaElem.textContent = restauranteInfo.mensajeBienvenida || '';
            allPizzas = data.pizzas || []; 
            
            // --- CÓDIGO CORREGIDO PARA APLICAR TÍTULOS PERSONALIZADOS ---
            const titulos = restauranteInfo.titulosPersonalizados || {};
            if (tituloPlatos) tituloPlatos.textContent = titulos.platos || 'A la Carta';
            if (tituloEspeciales) tituloEspeciales.textContent = titulos.especiales || 'Nuestros Especiales';
            if (tituloPizzas) tituloPizzas.textContent = titulos.pizzas || 'Nuestras Pizzas';
            if (tituloBebidas) tituloBebidas.textContent = titulos.bebidas || 'Bebidas y Otros';
            if (tituloMenuDia) tituloMenuDia.textContent = titulos.menuDia || 'Menú del Día';
            // -------------------------------------------------------------
            
            renderMenuDelDia(data.menuDelDia);
            renderPlatos(data.platosEspeciales, especialesContent, especialesSection);
            renderPlatos(data.platosALaCarta, platosALaCartaContent, platosCartaSection);
            renderPlatos(data.bebidas, bebidasContent, bebidasSection);
            renderPizzas(data.pizzas, pizzasContent, pizzasSection);
        } catch (error) {
            console.error('Error al cargar el menú:', error);
            document.body.innerHTML = `<div class="container" style="text-align:center; padding: 2rem;"><h1>Error al cargar el menú</h1><p>${error.message}</p></div>`;
        }
    }
    
    // 8. LÓGICA DEL MODAL DE PIZZAS
    function updatePizzaModalState() {
        const selectedVarianteRadio = pizzaModalVariantes.querySelector('input[name="pizza_variante"]:checked');
        if (!selectedVarianteRadio) return;
        const varianteIndex = parseInt(selectedVarianteRadio.value);
        const variante = currentPizza.variantes[varianteIndex];
        if (currentPizza.permiteMitades && variante.tamaño.toLowerCase() !== 'porción') {
            pizzaModalTipoContainer.style.display = 'block';
        } else {
            pizzaModalTipoContainer.style.display = 'none';
            pizzaModalMitadesContainer.style.display = 'none';
            pizzaModalTipoContainer.querySelector('input[value="completa"]').checked = true;
        }
        const selectedTipoRadio = pizzaModalTipoContainer.querySelector('input[name="pizza_tipo"]:checked');
        let finalPrice = variante.precio;
        if (selectedTipoRadio && selectedTipoRadio.value === 'mitades') {
            pizzaModalMitadesContainer.style.display = 'block';
            const otraMitadId = pizzaModalMitadSelect.value;
            if (otraMitadId) {
                const otraPizza = allPizzas.find(p => p._id === otraMitadId);
                const otraVariante = otraPizza.variantes.find(v => v.tamaño === variante.tamaño);
                if (otraVariante) {
                    finalPrice = Math.max(variante.precio, otraVariante.precio);
                }
            }
        } else {
            pizzaModalMitadesContainer.style.display = 'none';
        }
        pizzaModalPrice.textContent = formatCurrency(finalPrice);
    }

    function openPizzaModal(pizzaId) {
        currentPizza = allPizzas.find(p => p._id === pizzaId);
        if (!currentPizza) return;
        pizzaModalTitle.textContent = `Configura tu ${currentPizza.nombre}`;
        pizzaModalVariantes.innerHTML = '';
        currentPizza.variantes.forEach((variante, index) => {
            const label = document.createElement('label');
            label.innerHTML = `<input type="radio" name="pizza_variante" value="${index}" class="mr-2"><span>${variante.tamaño} - ${formatCurrency(variante.precio)}</span>`;
            pizzaModalVariantes.appendChild(label);
        });
        const otrasPizzas = allPizzas.filter(p => p._id !== currentPizza._id && p.permiteMitades);
        pizzaModalMitadSelect.innerHTML = '<option value="">Selecciona la otra mitad...</option>';
        otrasPizzas.forEach(p => {
            const option = document.createElement('option');
            option.value = p._id;
            option.textContent = p.nombre;
            pizzaModalMitadSelect.appendChild(option);
        });
        pizzaModal.style.display = 'flex';
        updatePizzaModalState();
    }

    function closePizzaModal() {
        pizzaModal.style.display = 'none';
    }

    // 9. EVENT LISTENERS GLOBALES
    document.addEventListener('click', (e) => {
        const addPlatoBtn = e.target.closest('.add-plato-to-cart-btn');
        if (addPlatoBtn) {
            const { id, nombre, precio } = addPlatoBtn.dataset;
            addToCart({ id, nombre, precio: parseFloat(precio) });
            return;
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
            return;
        }
        const openBtn = e.target.closest('.open-pizza-modal-btn');
        if (openBtn) {
            openPizzaModal(openBtn.dataset.pizzaId);
            return;
        }
    });

    closePizzaModalBtn.addEventListener('click', closePizzaModal);
    pizzaModal.addEventListener('click', (e) => {
        if (e.target === pizzaModal) closePizzaModal();
    });
    pizzaModalContent.addEventListener('change', updatePizzaModalState);

    addPizzaToCartBtn.addEventListener('click', () => {
        const selectedVarianteRadio = pizzaModalVariantes.querySelector('input[name="pizza_variante"]:checked');
        if (!selectedVarianteRadio) return alert('Por favor, selecciona un tamaño.');
        const varianteIndex = parseInt(selectedVarianteRadio.value);
        const variante = currentPizza.variantes[varianteIndex];
        let finalPrice = variante.precio;
        let nombreCompleto = `${currentPizza.nombre} (${variante.tamaño})`;
        const selectedTipoRadio = pizzaModalTipoContainer.querySelector('input[name="pizza_tipo"]:checked');
        if (selectedTipoRadio && selectedTipoRadio.value === 'mitades' && currentPizza.permiteMitades) {
            const otraMitadId = pizzaModalMitadSelect.value;
            if (!otraMitadId) return alert('Por favor, selecciona la otra mitad de la pizza.');
            const otraPizza = allPizzas.find(p => p._id === otraMitadId);
            const otraVariante = otraPizza.variantes.find(v => v.tamaño === variante.tamaño);
            if (otraVariante) {
                finalPrice = Math.max(variante.precio, otraVariante.precio);
                nombreCompleto = `Pizza ${variante.tamaño} (Mitad ${currentPizza.nombre}, Mitad ${otraPizza.nombre})`;
            } else {
                return alert(`La pizza "${otraPizza.nombre}" no está disponible en tamaño "${variante.tamaño}".`);
            }
        }
        addToCart({
            id: `pizza-${Date.now()}`,
            nombre: nombreCompleto,
            precio: finalPrice
        });
        closePizzaModal();
    });

    // INICIO DE EJECUCIÓN
    loadPage();
    renderCustomerForm();
});