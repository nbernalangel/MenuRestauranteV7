document.addEventListener('DOMContentLoaded', () => {
    const verifyForm = document.getElementById('verify-form');
    const messageContainer = document.getElementById('message-container');
    const verificationMessage = document.getElementById('verification-message');
    const submitButton = verifyForm.querySelector('button[type="submit"]');
    const codeInput = document.getElementById('verification-code');

    // Obtenemos el email de la URL para saber a quién estamos verificando
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');

    if (email) {
        verificationMessage.textContent = `Hemos enviado un código de 6 dígitos al correo: ${email}`;
    }

    verifyForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = 'Verificando...';
        
        // Leemos el valor directamente del campo de texto
        const verificationCode = codeInput.value;

        try {
            const response = await fetch('/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // ¡CORRECCIÓN CLAVE! Enviamos la propiedad como 'code' para que coincida con el backend
                body: JSON.stringify({ email: email, code: verificationCode }),
            });

            const result = await response.json();

            if (response.ok) {
                showMessage(result.message, 'success');
                // Si la verificación es exitosa, lo mandamos a la página de login
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
            } else {
                throw new Error(result.message || 'Error desconocido.');
            }

        } catch (error) {
            showMessage(error.message, 'danger');
            submitButton.disabled = false;
            submitButton.textContent = 'Verificar y Activar Cuenta';
        }
    });

    function showMessage(message, type) {
        messageContainer.textContent = message;
        messageContainer.style.display = 'block';
        if (type === 'success') {
            messageContainer.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
            messageContainer.style.color = '#155724';
        } else {
            messageContainer.style.backgroundColor = 'rgba(231, 76, 60, 0.1)';
            messageContainer.style.color = '#721c24';
        }
    }
});