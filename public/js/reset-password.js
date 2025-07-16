// public/js/reset-password.js
document.addEventListener('DOMContentLoaded', () => {
    const resetPasswordForm = document.getElementById('reset-password-form');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const messageContainer = document.getElementById('message-container');
    const submitButton = resetPasswordForm.querySelector('button[type="submit"]');

    // Obtener el token de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showMessage('Error: No se encontró un token de restablecimiento válido.', 'danger');
        submitButton.disabled = true; // Deshabilita el botón si no hay token
        return; // Detiene la ejecución si no hay token
    }

    resetPasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Evita que la página se recargue

        submitButton.disabled = true;
        submitButton.textContent = 'Restableciendo...';
        showMessage('', 'hide'); // Oculta mensajes anteriores

        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (password.length < 6) {
            showMessage('La contraseña debe tener al menos 6 caracteres.', 'danger');
            submitButton.disabled = false;
            submitButton.textContent = 'Restablecer Contraseña';
            return;
        }

        if (password !== confirmPassword) {
            showMessage('Las contraseñas no coinciden.', 'danger');
            submitButton.disabled = false;
            submitButton.textContent = 'Restablecer Contraseña';
            return;
        }

        try {
            const response = await fetch(`/api/reset-password/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            const result = await response.json();

            if (response.ok) {
                showMessage(result.message, 'success');
                // Redirigir al login después de un restablecimiento exitoso
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 3000);
            } else {
                throw new Error(result.message || 'Ocurrió un error desconocido al restablecer la contraseña.');
            }

        } catch (error) {
            console.error('Error al restablecer contraseña:', error);
            showMessage(`Error: ${error.message}`, 'danger');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Restablecer Contraseña';
        }
    });

    // Función para mostrar mensajes al usuario (reutilizada de otros scripts)
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
