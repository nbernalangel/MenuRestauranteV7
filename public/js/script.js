// script.js (Versión Definitiva y Corregida con Costo de Domicilio visible)
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

    const pizzasTradicionalesSection = document.getElementById('pizzas-tradicionales-section');
    const pizzasTradicionalesContent = document.getElementById('pizzas-tradicionales-content');
    const pizzasGourmetSection = document.getElementById('pizzas-gourmet-section');
    const pizzasGourmetContent = document.getElementById('pizzas-gourmet-content');

    const tituloPlatos = document.getElementById('titulo-platos');
    const tituloEspeciales = document.getElementById('titulo-especiales');
    const tituloBebidas = document.getElementById('titulo-bebidas');
    const tituloMenuDia = document.getElementById('titulo-menu-dia');

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
    
    function renderizarMetodosDePago(metodos) {
        const container = document.getElementById('dynamic-payment-options');
        if (!container) return;

        container.innerHTML = '';
        let primerMetodoDisponible = null;
        
        const opciones = {
            efectivo: { valor: 'Efectivo', texto: 'Efectivo' },
            tarjeta: { valor: 'Tarjeta', texto: 'Tarjeta (Datáfono)' },
            transferencia: { valor: 'Transferencia', texto: 'Transferencia' }
        };

        for (const key in opciones) {
            if (metodos && metodos[key] === true) {
                if (!primerMetodoDisponible) {
                    primerMetodoDisponible = key;
                }
                const isChecked = key === primerMetodoDisponible ? 'checked' : '';
                
                container.innerHTML += `
                    <div class="payment-option">
                        <input type="radio" id="pago-${key}" name="metodo-pago" value="${opciones[key].valor}" ${isChecked} required>
                        <label for="pago-${key}">${opciones[key].texto}</label>
                    </div>
                `;
            }
        }

        if (container.innerHTML === '') {
            container.innerHTML = '<p class="text-red-500 text-sm">No hay métodos de pago configurados.</p>';
            if (checkoutBtn) {
                checkoutBtn.disabled = true;
                checkoutBtn.style.backgroundColor = 'grey';
            }
        }
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
        
        let totalProductos = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p>Tu carrito está vacío.</p>';
        } else {
            cart.forEach(item => {
                totalProductos += item.precio * item.quantity;
                const itemDiv = document.createElement('div');
                itemDiv.className = 'cart-item';
                itemDiv.innerHTML = `<div class="cart-item-details"><span class="item-name">${item.quantity}x ${item.nombre}</span><span class="item-price">${formatCurrency(item.precio * item.quantity)}</span></div><button class="remove-btn" data-id="${item.id}">×</button>`;
                cartItemsContainer.appendChild(itemDiv);
            });
        }

        const tipoPedido = urlParams.get('tipo');
        let costoDomicilio = 0;
        let totalFinal = totalProductos;

        if (tipoPedido === 'domicilio' && restauranteInfo.cobraDomicilio && restauranteInfo.costoDomicilio > 0) {
            costoDomicilio = restauranteInfo.costoDomicilio;
            totalFinal += costoDomicilio;
            
            if (cart.length === 0) {
                cartItemsContainer.innerHTML = '';
            }

            const domicilioDiv = document.createElement('div');
            domicilioDiv.className = 'cart-item';
            domicilioDiv.style.borderBottom = 'none';
            domicilioDiv.innerHTML = `<div class="cart-item-details" style="font-weight: bold; margin-top: 5px;"><span class="item-name">Costo Domicilio</span><span class="item-price">${formatCurrency(costoDomicilio)}</span></div>`;
            cartItemsContainer.appendChild(domicilioDiv);
        }

        cartTotalPriceDisplay.textContent = formatCurrency(totalFinal);
    }
    
    // 5. RENDERIZADO DE MENÚS
    function renderMenuDelDia(menu) {
        if (!menuDelDiaContent || !dailyMenuSection) return;
        if (!menu) {
            dailyMenuSection.style.display = 'none';
            return;
        }
        dailyMenuSection.style.display = 'block';
        const menuCard = document.createElement('div');
        menuCard.className = 'menu-card menu-card-diario';
        const menuContentWrapper = document.createElement('div');
        const menuTitle = document.createElement('h3');
        menuTitle.textContent = menu.nombreMenu;
        menuContentWrapper.appendChild(menuTitle);
        const descriptionDiv = document.createElement('div');
        descriptionDiv.className = 'description';
        menu.itemsPorCategoria.forEach((cat, index) => {
            const categoriaTitle = document.createElement('strong');
            categoriaTitle.className = 'block text-lg font-bold text-ting-blue mt-4 mb-2';
            categoriaTitle.textContent = `${cat.categoriaNombre}:`;
            descriptionDiv.appendChild(categoriaTitle);
            const radioOptionsContainer = document.createElement('div');
            radioOptionsContainer.className = 'flex flex-wrap gap-x-6 gap-y-2';
            cat.platosEscogidos.forEach((plato) => {
                const label = document.createElement('label');
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

    // 6. LÓGICA DE FORMULARIO
    function renderCustomerForm() {
        if (!customerFormContainer) return;
        const tipoPedido = urlParams.get('tipo');
        let formHtml = '';

        if (tipoPedido === 'mesa') {
            formHtml = `
                <label for="nombre-cliente">Tu Nombre:</label><input type="text" id="nombre-cliente" required>
                <label for="numero-mesa">Número de Mesa:</label><input type="number" id="numero-mesa" required>
            `;
        } else if (tipoPedido === 'recoger') {
            formHtml = `
                <label for="nombre-cliente">Tu Nombre:</label><input type="text" id="nombre-cliente" required>
                <label for="telefono-cliente">Tu Teléfono (WhatsApp):</label><input type="tel" id="telefono-cliente" required>
            `;
        } else { // 'domicilio' es el por defecto
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
            if (cart.length === 0) { 
                // Aún con carrito vacío, verificamos si hay un costo de domicilio para validar el formulario
                const tipoPedidoCheck = urlParams.get('tipo');
                if (!(tipoPedidoCheck === 'domicilio' && restauranteInfo.cobraDomicilio && restauranteInfo.costoDomicilio > 0)) {
                    return alert('Tu carrito está vacío.');
                }
            }

            const tipoPedido = urlParams.get('tipo');
            const nombreCliente = document.getElementById('nombre-cliente')?.value.trim();
            if (!nombreCliente) { return alert('Por favor, ingresa tu nombre.'); }
            
            const notas = notasClienteTextarea.value.trim() || '';
            
            const totalProductos = cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0);
            let costoDomicilio = 0;
            if (tipoPedido === 'domicilio' && restauranteInfo.cobraDomicilio && restauranteInfo.costoDomicilio > 0) {
                costoDomicilio = restauranteInfo.costoDomicilio;
            }
            const totalFinal = totalProductos + costoDomicilio;
            
            const metodoPagoSeleccionado = document.querySelector('input[name="metodo-pago"]:checked');
            if (!metodoPagoSeleccionado) {
                return alert('Por favor, selecciona un método de pago.');
            }
            const metodoDePagoValue = metodoPagoSeleccionado.value;

            let pedidoParaGuardar = { 
                restaurante: restauranteInfo._id, 
                items: cart.map(item => ({ nombre: item.nombre, cantidad: item.quantity, precio: item.precio })), 
                total: totalFinal,
                cliente: { nombre: nombreCliente }, 
                notas,
                metodoDePago: metodoDePagoValue
            };
            
            let message = `*¡Nuevo Pedido para ${restauranteInfo.nombre}!* \n\n`;

            if (tipoPedido === 'mesa') {
                const numeroMesa = document.getElementById('numero-mesa')?.value.trim();
                if (!numeroMesa) { return alert('Por favor, ingresa tu número de mesa.'); }
                pedidoParaGuardar.tipo = 'Mesa';
                pedidoParaGuardar.cliente.numeroMesa = numeroMesa;
                message += `*Pedido para la MESA #${numeroMesa}*\n*Cliente:* ${nombreCliente}\n`;
            } else if (tipoPedido === 'recoger') {
                const telefono = document.getElementById('telefono-cliente')?.value.trim();
                if (!telefono) { return alert('Por favor, ingresa tu teléfono.'); }
                pedidoParaGuardar.tipo = 'Recoger';
                pedidoParaGuardar.cliente.telefono = telefono;
                message += `*PEDIDO PARA RECOGER*\n*Cliente:* ${nombreCliente}\n*Teléfono:* ${telefono}\n`;
            } else { // Domicilio
                const telefono = document.getElementById('telefono-cliente')?.value.trim();
                const direccion = document.getElementById('direccion-cliente')?.value.trim();
                if (!telefono || !direccion) { return alert('Los campos "Teléfono" y "Dirección" son obligatorios.'); }
                pedidoParaGuardar.tipo = 'Domicilio';
                pedidoParaGuardar.cliente.telefono = telefono;
                pedidoParaGuardar.cliente.direccion = direccion;
                message += `*Pedido a DOMICILIO*\n*Cliente:* ${nombreCliente}\n*Teléfono:* ${telefono}\n*Dirección:* ${direccion}\n`;
            }
            
            message += `\n*--- Detalle del Pedido ---*\n`;
            if (cart.length > 0) {
                cart.forEach(item => { message += `${item.quantity}x ${item.nombre} - ${formatCurrency(item.precio * item.quantity)}\n`; });
            }
            
            if (costoDomicilio > 0) {
                 message += `Costo Domicilio - ${formatCurrency(costoDomicilio)}\n`;
            }

            message += `\n*Total: ${formatCurrency(totalFinal)}*`;
            if (notas) message += `\n\n*Notas:* ${notas}`;
            
            const textoMetodoPago = document.querySelector(`label[for="${metodoPagoSeleccionado.id}"]`).textContent;
            message += `\n\n*Método de Pago:* ${textoMetodoPago}`;
            
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
            
            const titulos = restauranteInfo.titulosPersonalizados || {};
            if (tituloPlatos) tituloPlatos.textContent = titulos.platos || 'A la Carta';
            if (tituloEspeciales) tituloEspeciales.textContent = titulos.especiales || 'Nuestros Especiales';
            if (tituloBebidas) tituloBebidas.textContent = titulos.bebidas || 'Bebidas y Otros';
            if (tituloMenuDia) tituloMenuDia.textContent = titulos.menuDia || 'Menú del Día';
            
            renderizarMetodosDePago(restauranteInfo.metodosDePago);
            renderCustomerForm();
            renderCart(); 
            
            renderMenuDelDia(data.menuDelDia);
            renderPlatos(data.platosEspeciales, especialesContent, especialesSection);
            renderPlatos(data.platosALaCarta, platosALaCartaContent, platosCartaSection);
            renderPlatos(data.bebidas, bebidasContent, bebidasSection);
            
            const pizzasTradicionales = allPizzas.filter(p => p.categoria === 'Tradicional');
            const pizzasGourmet = allPizzas.filter(p => p.categoria === 'Gourmet');

            renderPizzas(pizzasTradicionales, pizzasTradicionalesContent, pizzasTradicionalesSection);
            renderPizzas(pizzasGourmet, pizzasGourmetContent, pizzasGourmetSection);

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
            if (pizzaModalTipoContainer.querySelector('input[value="completa"]')) {
                pizzaModalTipoContainer.querySelector('input[value="completa"]').checked = true;
            }
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
        if (pizzaModal) pizzaModal.style.display = 'none';
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

    if (cartItemsContainer) {
        cartItemsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-btn')) {
                const itemId = e.target.dataset.id;
                removeFromCart(itemId);
            }
        });
    }

    if(closePizzaModalBtn) closePizzaModalBtn.addEventListener('click', closePizzaModal);
    if(pizzaModal) pizzaModal.addEventListener('click', (e) => {
        if (e.target === pizzaModal) closePizzaModal();
    });
    if(pizzaModalContent) pizzaModalContent.addEventListener('change', updatePizzaModalState);

    if(addPizzaToCartBtn) addPizzaToCartBtn.addEventListener('click', () => {
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
});