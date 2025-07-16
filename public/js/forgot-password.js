// public/js/forgot-password.js
document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const emailInput = document.getElementById('email');
    const messageContainer = document.getElementById('message-container');
    const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');

    forgotPasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Evita que la página se recargue

        submitButton.disabled = true;
        submitButton.textContent = 'Enviando...';
        showMessage('', 'hide'); // Oculta mensajes anteriores

        const email = emailInput.value;

        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const result = await response.json();

            if (response.ok) {
                // El backend siempre responde 200 OK para no revelar si el email existe
                showMessage(result.message, 'success');
                // Opcional: Redirigir o limpiar el formulario después de un tiempo
                forgotPasswordForm.reset();
            } else {
                // Si el servidor responde con un error (ej. 4xx, 5xx)
                throw new Error(result.message || 'Ocurrió un error desconocido en el servidor.');
            }

        } catch (error) {
            console.error('Error al solicitar restablecimiento:', error);
            showMessage(`Error: ${error.message}`, 'danger');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Enviar Enlace de Restablecimiento';
        }
    });

    // Función para mostrar mensajes al usuario
    function showMessage(message, type) {
        messageContainer.textContent = message;
        if (type === 'hide') {
            messageContainer.style.display = 'none';
        } else {
            messageContainer.style.display = 'block';
            if (type === 'success') {
                messageContainer.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
                messageContainer.style.color = '#155724';
            } else { // 'danger'
                messageContainer.style.backgroundColor = 'rgba(231, 76, 60, 0.1)';
                messageContainer.style.color = '#721c24';
            }
        }
    }
});
