// menu.js
document.addEventListener('DOMContentLoaded', () => {
    // --- VARIABLES GLOBALES ---
    let carrito = [];
    let restauranteData = {};
    
    // --- OBTENER ELEMENTOS DEL DOM ---
    const menuContent = document.getElementById('menu-content');
    const restauranteNombre = document.getElementById('restaurante-nombre');
    const pageTitle = document.getElementById('page-title');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');

    // === 1. PEDIR LOS DATOS DEL MENÚ AL BACKEND ===
    const urlParts = window.location.pathname.split('/');
    const slug = urlParts[2];

    fetch(`/api/public/menu/${slug}`)
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                (menuContent || document.body).innerHTML = `<p class="text-red-500 text-center">${data.message}</p>`;
                return;
            }
            restauranteData = data.restaurante;
            restauranteNombre.textContent = restauranteData.nombre;
            pageTitle.textContent = `Menú de ${restauranteData.nombre}`;
            
            // --- INICIO: SECCIÓN AÑADIDA 1 ---
            // Llamamos a la nueva función para mostrar los métodos de pago
            renderizarMetodosDePago(restauranteData.metodosDePago);
            // --- FIN: SECCIÓN AÑADIDA 1 ---

            renderMenu(data);
        })
        .catch(error => {
            console.error('Error al cargar el menú:', error);
            (menuContent || document.body).innerHTML = `<p class="text-red-500 text-center">No se pudo cargar el menú. Inténtalo de nuevo.</p>`;
        });

    // === 2. FUNCIONES PARA DIBUJAR EL MENÚ Y MANEJAR EL CARRITO ===
    
    // --- INICIO: SECCIÓN AÑADIDA 2 (Función nueva) ---
    function renderizarMetodosDePago(metodos) {
        const container = document.getElementById('dynamic-payment-options');
        if (!container) return;

        container.innerHTML = '';
        let primerMetodoDisponible = null;
        const opciones = {
            efectivo: 'Efectivo',
            tarjeta: 'Tarjeta (Datáfono)',
            transferencia: 'Transferencia'
        };

        // Iteramos sobre las opciones para mantener un orden consistente
        for (const key in opciones) {
            // Verificamos si el restaurante tiene ese método activado (metodos[key] === true)
            if (metodos && metodos[key]) {
                if (!primerMetodoDisponible) {
                    primerMetodoDisponible = key; // Guardamos el primero para marcarlo como 'checked'
                }
                const isChecked = key === primerMetodoDisponible ? 'checked' : '';
                container.innerHTML += `
                    <div class="payment-option">
                        <input type="radio" id="pago-${key}" name="metodo-pago" value="${opciones[key]}" class="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500" ${isChecked} required>
                        <label for="pago-${key}" class="ml-2 block text-sm text-gray-900">${opciones[key]}</label>
                    </div>
                `;
            }
        }

        if (container.innerHTML === '') {
            container.innerHTML = '<p class="text-red-500 text-sm">No hay métodos de pago configurados.</p>';
            const sendOrderBtn = document.getElementById('send-order-btn');
            if (sendOrderBtn) {
                sendOrderBtn.disabled = true;
                sendOrderBtn.style.backgroundColor = 'grey';
                sendOrderBtn.textContent = 'Pago no disponible';
            }
        }
    }
    // --- FIN: SECCIÓN AÑADIDA 2 ---

    // Dibuja el menú completo con el diseño original de columnas
    function renderMenu(data) {
        if (!menuContent) return;
        menuContent.innerHTML = ''; 
        
        const titulos = data.restaurante.titulosPersonalizados || {};
        document.getElementById('titulo-platos').textContent = titulos.platos || 'A la Carta';
        document.getElementById('titulo-especiales').textContent = titulos.especiales || 'Nuestros Especiales';
        
        const tituloPizzasEl = document.getElementById('titulo-pizzas');
        if(tituloPizzasEl) tituloPizzasEl.textContent = titulos.pizzas || 'Nuestras Pizzas';
        
        document.getElementById('titulo-bebidas').textContent = titulos.bebidas || 'Bebidas y Otros';
        document.getElementById('titulo-menu-dia').textContent = titulos.menuDia || 'Menú del Día';

        if (data.menuDelDia && data.menuDelDia.itemsPorCategoria && data.menuDelDia.itemsPorCategoria.length > 0) {
            const precioMenuDia = data.menuDelDia.precioGlobal 
                ? `$${data.menuDelDia.precioGlobal.toLocaleString('es-CO')}` 
                : '';

            let menuDiaHtml = `
                <div class="menu-section" id="menu-del-dia-form">
                    <h3 class="text-2xl font-bold text-ting-blue">${titulos.menuDia || 'Menú del Día'}</h3>
                    <div class="p-4 border rounded-lg mt-4">
            `;
            
            data.menuDelDia.itemsPorCategoria.forEach(categoria => {
                menuDiaHtml += `<h4 class="font-bold text-lg mt-4 text-gray-700 uppercase tracking-wider">${categoria.categoriaNombre}:</h4>`;
                menuDiaHtml += `<div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-2">`; 
                categoria.platosEscogidos.forEach(plato => {
                    const uniqueId = `${categoria.categoriaNombre}-${plato.nombre}`.replace(/\s+/g, '-');
                    menuDiaHtml += `
                        <div class="flex items-center">
                            <input type="radio" id="${uniqueId}" name="categoria-${categoria.categoriaNombre}" value="${plato.nombre}" required class="h-4 w-4 text-ting-green border-gray-300 focus:ring-ting-green">
                            <label for="${uniqueId}" class="ml-3 block text-md font-medium text-gray-700">${plato.nombre}</label>
                        </div>
                    `;
                });
                menuDiaHtml += `</div>`;
            });

            menuDiaHtml += `
                <div class="flex justify-between items-center mt-6">
                    <p class="text-2xl font-bold text-ting-blue">${precioMenuDia}</p>
                    <button id="add-menu-dia-btn" class="bg-ting-green text-white font-bold py-2 px-6 rounded-lg">
                        Añadir Menú
                    </button>
                </div>
            </div>
            </div>`;
            menuContent.innerHTML += menuDiaHtml;

            document.getElementById('add-menu-dia-btn').addEventListener('click', () => {
                const form = document.getElementById('menu-del-dia-form');
                const selections = [];
                let allCategoriesSelected = true;
                
                data.menuDelDia.itemsPorCategoria.forEach(categoria => {
                    const selectedOption = form.querySelector(`input[name="categoria-${categoria.categoriaNombre}"]:checked`);
                    if (selectedOption) {
                        selections.push(selectedOption.value);
                    } else {
                        allCategoriesSelected = false;
                    }
                });

                if (!allCategoriesSelected) {
                    alert('Por favor, selecciona una opción de cada categoría para continuar.');
                    return;
                }

                const itemMenuDia = {
                    id: data.menuDelDia._id,
                    nombre: `Menú del Día (${selections.join(', ')})`,
                    precio: data.menuDelDia.precioGlobal || 0
                };
                addToCart(itemMenuDia);
            });
        }
        
        if (data.platosALaCarta && data.platosALaCarta.length > 0) {
            let platosHtml = '<div class="menu-section"><h3>A la Carta</h3>';
            data.platosALaCarta.forEach(plato => {
                platosHtml += createMenuItemHtml(plato);
            });
            menuContent.innerHTML += platosHtml + '</div>';
        }

        if (data.platosEspeciales && data.platosEspeciales.length > 0) {
            let especialesHtml = '<div class="menu-section"><h3>Nuestros Especiales</h3>';
            data.platosEspeciales.forEach(especial => {
                especialesHtml += createMenuItemHtml(especial);
            });
            menuContent.innerHTML += especialesHtml + '</div>';
        }

        document.querySelectorAll('.add-to-cart-btn-individual').forEach(button => {
            button.addEventListener('click', (e) => {
                const item = {
                    id: e.currentTarget.dataset.id,
                    nombre: e.currentTarget.dataset.nombre,
                    precio: parseFloat(e.currentTarget.dataset.precio)
                };
                addToCart(item);
            });
        });
    }

    function createMenuItemHtml(item) {
        return `
            <div class="menu-item">
                <div class="item-info">
                    <p class="item-title">${item.nombre}</p>
                    <p class="item-description">${item.descripcion || ''}</p>
                </div>
                <div class="flex items-center">
                    <p class="item-price">$${item.precio.toLocaleString('es-CO')}</p>
                    <button class="add-to-cart-btn-individual ml-4 text-ting-green text-2xl" 
                            data-id="${item._id}" 
                            data-nombre="${item.nombre}" 
                            data-precio="${item.precio}">
                        <i class="fas fa-plus-circle"></i>
                    </button>
                </div>
            </div>
        `;
    }

    function addToCart(item) {
        const itemExistente = carrito.find(cartItem => cartItem.id === item.id);
        if (itemExistente) {
            itemExistente.cantidad++; 
        } else {
            carrito.push({ ...item, cantidad: 1 });
        }
        updateCartView(); 
    }

    function updateCartView() {
        cartItemsContainer.innerHTML = '';
        if (carrito.length === 0) {
            cartItemsContainer.innerHTML = '<p class="text-sm text-gray-400">Tu carrito está vacío</p>';
            if(cartTotalElement) cartTotalElement.textContent = 'Total: $0';
            return;
        }

        let total = 0;
        carrito.forEach(item => {
            cartItemsContainer.innerHTML += `<p>${item.cantidad}x ${item.nombre} - $${(item.precio * item.cantidad).toLocaleString('es-CO')}</p>`;
            total += item.precio * item.cantidad;
        });

        if(cartTotalElement) cartTotalElement.textContent = `Total: $${total.toLocaleString('es-CO')}`;
    }

    // === LÓGICA DEL FORMULARIO Y ENVÍO FINAL ===
    const urlParams = new URLSearchParams(window.location.search);
    const tipoPedido = urlParams.get('tipo');
    const campoMesa = document.getElementById('campo-mesa');
    const camposDomicilio = document.getElementById('campos-domicilio');
    const enviarPedidoBtn = document.getElementById('send-order-btn');

    if (tipoPedido === 'mesa') {
        if (camposDomicilio) camposDomicilio.classList.add('hidden');
        if (campoMesa) campoMesa.classList.remove('hidden');
    }

    if (enviarPedidoBtn) {
        enviarPedidoBtn.addEventListener('click', () => {
            if (carrito.length === 0) {
                alert("Tu carrito está vacío. ¡Añade algunos productos!");
                return;
            }

            // --- INICIO: SECCIÓN AÑADIDA 3 ---
            const metodoPagoSeleccionado = document.querySelector('input[name="metodo-pago"]:checked');
            if (!metodoPagoSeleccionado) {
                alert('Por favor, elige un método de pago.');
                return;
            }
            const metodoPagoTexto = metodoPagoSeleccionado.value;
            // --- FIN: SECCIÓN AÑADIDA 3 ---

            const itemsDelCarrito = carrito.map(item => `${item.cantidad}x ${item.nombre}`).join('\n');
            const totalDelCarrito = document.getElementById('cart-total-price').textContent; 
            const nombreCliente = document.getElementById('nombre-cliente').value;
            let mensajeFinal = "";

            if (tipoPedido === 'mesa') {
                const numeroMesa = document.getElementById('numero-mesa').value;
                if (!nombreCliente || !numeroMesa) {
                    alert('Por favor, ingresa tu nombre y número de mesa.');
                    return;
                }
                // --- Línea modificada ---
                mensajeFinal = `Hola, soy *${nombreCliente}* y quiero un pedido para la *MESA #${numeroMesa}*:\n\n${itemsDelCarrito}\n\n*Total:* ${totalDelCarrito}\n*Método de Pago:* ${metodoPagoTexto}`;
            } else { 
                const direccion = document.getElementById('direccion-cliente').value;
                const telefono = document.getElementById('telefono-cliente').value;
                if (!nombreCliente || !direccion || !telefono) {
                    alert('Por favor, ingresa tu nombre, dirección y teléfono.');
                    return;
                }
                // --- Línea modificada ---
                mensajeFinal = `Hola, soy *${nombreCliente}* y quiero un pedido a *DOMICILIO*:\n\n${itemsDelCarrito}\n\n*Dirección:* ${direccion}\n*Teléfono:* ${telefono}\n\n*Total:* ${totalDelCarrito}\n*Método de Pago:* ${metodoPagoTexto}`;
            }

            const numeroWhatsappDelRestaurante = restauranteData.telefono || '573001234567';
            const urlWhatsapp = `https://api.whatsapp.com/send?phone=${numeroWhatsappDelRestaurante.replace(/\s/g, '')}&text=${encodeURIComponent(mensajeFinal)}`;
            
            window.open(urlWhatsapp, '_blank');
        });
    }
});