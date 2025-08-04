// js/seleccionar-pedido.js

document.addEventListener('DOMContentLoaded', () => {
    const urlParts = window.location.pathname.split('/');
    // Asegurarse de que el slug es el penúltimo elemento si la URL termina en /
    const restauranteSlug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];

    const domicilioBtn = document.getElementById('domicilio-btn');
    const mesaBtn = document.getElementById('mesa-btn');

    // Referencias a los nuevos elementos del header
    const logoContainer = document.getElementById('welcome-logo');
    const titleElement = document.getElementById('welcome-title');

    // Función para cargar los datos del restaurante
    async function loadRestaurantInfo() {
        if (!restauranteSlug) {
            titleElement.textContent = 'Restaurante no encontrado';
            return;
        }

        try {
            // Reutilizamos la API del menú para obtener los datos del restaurante
            const response = await fetch(`/api/public/menu/${restauranteSlug}`);
            if (!response.ok) throw new Error('No se pudo cargar la información.');

            const data = await response.json();
            const restaurante = data.restaurante;

            if (restaurante) {
                // Actualizamos el título de la página
                document.title = `Bienvenido a ${restaurante.nombre}`;

                // Mostramos el nombre en el título principal
                titleElement.textContent = `Bienvenido a ${restaurante.nombre}`;

                // Si hay un logo, lo mostramos
                if (restaurante.logoUrl && logoContainer) {
                    logoContainer.innerHTML = `<img src="${restaurante.logoUrl}" alt="Logo de ${restaurante.nombre}" style="max-width: 180px; margin: 0 auto; border-radius: 8px;">`;
                }
            }

        } catch (error) {
            console.error("Error al cargar datos del restaurante:", error);
            titleElement.textContent = 'Error al cargar';
        }
    }

    // Construye los enlaces de los botones (lógica que ya tenías)
    if (domicilioBtn) {
        domicilioBtn.href = `/r/${restauranteSlug}/menu?tipo=domicilio`;
    }
    if (mesaBtn) {
        mesaBtn.href = `/r/${restauranteSlug}/menu?tipo=mesa`;
    }

    // Llama a la nueva función para cargar la información
    loadRestaurantInfo();
});