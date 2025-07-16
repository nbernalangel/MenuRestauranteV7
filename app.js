// app.js (Versión Final para Producción con Resend y Atlas)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs'); 
const { Resend } = require('resend');
const ExcelJS = require('exceljs'); // Importamos ExcelJS
const crypto = require('crypto'); // Importamos crypto para generar tokens
require('dotenv').config(); 

const app = express();
const port = process.env.PORT || 3000;

// --- Middlewares ---
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- Conexión a MongoDB ---
const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/menu-restaurante-db';
mongoose.connect(dbUri, { serverSelectionTimeoutMS: 30000 })
    .then(() => console.log('✅ Conectado a MongoDB Atlas'))
    .catch(err => console.error('❌ Error de conexión a MongoDB:', err.message || err)); 

// --- Importar Modelos ---
const Plato = require('./models/Plato');
const Especial = require('./models/Especial'); 
const MenuCategoria = require('./models/MenuCategoria');
const MenuDia = require('./models/MenuDia');
const Restaurante = require('./models/Restaurante');
const Usuario = require('./models/Usuario');
const Pedido = require('./models/Pedido'); 

// --- Configuración de Resend ---
const resend = new Resend(process.env.RESEND_API_KEY);

// Función para generar un código de verificación de 6 dígitos
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ========================================================
// === RUTAS DE REGISTRO Y VERIFICACIÓN ===================
// ========================================================
app.post('/api/register', async (req, res) => {
    try {
        const { nombreRestaurante, email, password } = req.body;
        const usuarioExistente = await Usuario.findOne({ email });
        if (usuarioExistente) { return res.status(409).json({ message: 'Este correo ya está registrado.' }); }
        
        const slug = nombreRestaurante.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
        const restauranteExistente = await Restaurante.findOne({ slug });
        if (restauranteExistente) { return res.status(409).json({ message: 'El nombre de este restaurante ya genera una URL que existe. Por favor, elige otro.' }); }

        const nuevoRestaurante = new Restaurante({ nombre: nombreRestaurante, slug: slug });
        await nuevoRestaurante.save();

        const verificationCode = generateVerificationCode();
        const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // Código válido por 15 minutos

        const nuevoUsuario = new Usuario({
            email, password, rol: 'admin_restaurante', restaurante: nuevoRestaurante._id,
            isVerified: false, verificationCode: verificationCode, verificationCodeExpires: verificationCodeExpires
        });
        await nuevoUsuario.save(); 
        
        // --- INICIO DEL CAMBIO PARA EL CORREO DE VERIFICACIÓN ---
        // Usamos process.env.FRONTEND_URL que configuramos en Render, 
        // o 'http://localhost:3000' para desarrollo local.
        const appBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        // Enviar correo de verificación con Resend
        await resend.emails.send({
            from: `Tu Menú Digital <verificacion@ting-col.com>`, // ¡Usando tu dominio verificado!
            to: email,
            subject: 'Verifica tu cuenta de Menú Digital',
            html: `
                <p>Hola,</p>
                <p>Gracias por registrarte en Menú Digital. Por favor, usa el siguiente código para verificar tu cuenta:</p>
                <h3 style="color: ${process.env.COLOR_VERDE_LIMA || '#89d341'};">${verificationCode}</h3>
                <p>Este código es válido por 15 minutos.</p>
                <p>Ingresa este código en la página de verificación: <a href="${appBaseUrl}/verify.html?email=${encodeURIComponent(email)}">${appBaseUrl}/verify.html</a></p>
                <p>Si no te registraste en Menú Digital, puedes ignorar este correo.</p>
            `,
        });
        // --- FIN DEL CAMBIO PARA EL CORREO DE VERIFICACIÓN ---
        console.log(`✅ Correo de verificación enviado a ${email} usando Resend.`);

        res.status(201).json({ message: '¡Registro exitoso! Revisa tu correo para el código de verificación.' });
    } catch (e) {
        console.error("❌ Error en /api/register:", e.message || e);
        res.status(500).json({ message: 'Ocurrió un error en el servidor al registrar el usuario.' });
    }
});

app.post('/api/verify', async (req, res) => {
    try {
        const { email, code } = req.body; 
        const usuario = await Usuario.findOne({ email });

        console.log('--- ESPÍA DE VERIFICACIÓN ---');
        console.log('Email:', email);
        console.log('Código Recibido del Formulario:', code);
        console.log('Código Guardado en la Base de Datos:', usuario ? usuario.verificationCode : 'N/A');
        console.log('¿Coinciden?:', usuario ? (String(usuario.verificationCode) === String(code)) : 'N/A');
        console.log('Hora de Expiración:', usuario ? usuario.verificationCodeExpires.toISOString() : 'N/A');
        console.log('Hora Actual del Servidor:', new Date().toISOString());
        console.log('------------------------------------');

        if (!usuario) { return res.status(404).json({ message: 'Usuario no encontrado.' }); }
        if (usuario.isVerified) { return res.status(400).json({ message: 'Esta cuenta ya ha sido verificada.' }); }
        
        if (new Date() > usuario.verificationCodeExpires) { return res.status(400).json({ message: 'El código de verificación ha expirado.' });}
        
        if (String(usuario.verificationCode) !== String(code)) { 
            return res.status(400).json({ message: 'Código de verificación incorrecto.' });
        }

        usuario.isVerified = true;
        usuario.verificationCode = undefined; 
        usuario.verificationCodeExpires = undefined; 
        await usuario.save();

        res.status(200).json({ message: 'Cuenta verificada con éxito. Ya puedes iniciar sesión.' });
    } catch (e) {
        console.error("❌ Error en /api/verify:", e.message || e);
        res.status(500).json({ message: 'Ocurrió un error en el servidor durante la verificación.' });
    }
});

// ========================================================
// === RUTAS PARA "OLVIDÓ SU CONTRASEÑA" ==================
// ========================================================

// RUTA 1: SOLICITAR RESTABLECIMIENTO DE CONTRASEÑA (Envía correo con token)
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const usuario = await Usuario.findOne({ email });

        if (!usuario) {
            // Por seguridad, siempre respondemos con un mensaje genérico para no revelar si el email existe o no
            return res.status(200).json({ message: 'Si el correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña.' });
        }

        const resetToken = crypto.randomBytes(20).toString('hex'); 
        const resetTokenExpires = new Date(Date.now() + 3600000); // Token válido por 1 hora

        usuario.resetToken = resetToken;
        usuario.resetTokenExpires = resetTokenExpires;
        await usuario.save();

        // --- INICIO DEL CAMBIO PARA EL CORREO DE RESTABLECIMIENTO ---
        // Usamos process.env.FRONTEND_URL que configuramos en Render, 
        // o 'http://localhost:3000' para desarrollo local.
        const appBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetUrl = `${appBaseUrl}/reset-password.html?token=${resetToken}`;
        // --- FIN DEL CAMBIO PARA EL CORREO DE RESTABLECIMIENTO ---

        await resend.emails.send({
            from: `Tu Menú Digital <noreply@ting-col.com>`, 
            to: email,
            subject: 'Restablecer tu Contraseña de Menú Digital',
            html: `
                <p>Hola,</p>
                <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta de Menú Digital.</p>
                <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
                <p><a href="${resetUrl}">${resetUrl}</a></p>
                <p>Este enlace es válido por 1 hora.</p>
                <p>Si no solicitaste un restablecimiento de contraseña, puedes ignorar este correo.</p>
            `,
        });
        console.log(`✅ Correo de restablecimiento de contraseña enviado a ${email} con token: ${resetToken}`);

        res.status(200).json({ message: 'Si el correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña.' });

    } catch (e) {
        console.error("❌ Error en /api/forgot-password:", e.message || e);
        res.status(500).json({ message: 'Ocurrió un error en el servidor al solicitar el restablecimiento de contraseña.' });
    }
});

// RUTA 2: RESTABLECER CONTRASEÑA (Valida token y actualiza contraseña)
app.post('/api/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const usuario = await Usuario.findOne({
            resetToken: token,
            resetTokenExpires: { $gt: new Date() } // Token no expirado
        });

        // --- ESPÍA DE RESTABLECIMIENTO ---
        console.log('--- DIAGNÓSTICO DE RESTABLECIMIENTO ---');
        console.log('Token recibido:', token);
        console.log('Usuario encontrado por token:', usuario ? usuario.email : 'N/A');
        console.log('Contraseña nueva (sin hashear):', password); 
        console.log('Contraseña actual del usuario (antes de actualizar):', usuario ? usuario.password : 'N/A');
        console.log('------------------------------------');


        if (!usuario) {
            return res.status(400).json({ message: 'El token de restablecimiento es inválido o ha expirado.' });
        }

        // NO HASHEAR AQUÍ. El middleware pre('save') en Usuario.js lo hará.
        usuario.password = password; // Asignar la contraseña en texto plano

        // Limpiar el token y la fecha de expiración
        usuario.resetToken = undefined;
        usuario.resetTokenExpires = undefined;
        usuario.isVerified = true; // Asegurarse de que la cuenta esté verificada al restablecer

        await usuario.save();
        console.log(`✅ Contraseña restablecida con éxito para ${usuario.email}`);
        console.log('DEBUG: Nueva contraseña hasheada guardada (después de save):', usuario.password); 

        res.status(200).json({ message: 'Contraseña restablecida con éxito. Ya puedes iniciar sesión.' });

    } catch (e) {
        console.error("❌ Error en /api/reset-password:", e.message || e);
        res.status(500).json({ message: 'Ocurrió un error en el servidor al restablecer la contraseña.' });
    }
});


// ========================================================
// === RUTAS DEL SUPER-ADMIN - GESTIÓN DE RESTAURANTES ====
// ========================================================

// RUTA PARA CREAR RESTAURANTES
app.post('/api/restaurantes', async (req, res) => { 
    try { 
        console.log("✅ Petición recibida para crear restaurante con los datos:", req.body);
        const item = new Restaurante(req.body); 
        await item.save(); 
        console.log("✅ Restaurante guardado con éxito en la base de datos.");
        res.status(201).json(item); 
    } catch (e) { 
        console.error("❌ ERROR al crear restaurante:", e.message || e);
        // Si el error es una validación de Mongoose, e.name será 'ValidationError'
        if (e.name === 'ValidationError') {
            return res.status(400).json({ message: e.message });
        }
        res.status(500).json({ message: 'Error interno del servidor al crear restaurante.' }); 
    } 
});

// RUTA PARA OBTENER TODOS LOS RESTAURANTES
app.get('/api/restaurantes', async (req, res) => {
    try {
        const items = await Restaurante.find();
        res.json(items);
    } catch (e) {
        console.error("❌ ERROR al obtener restaurantes:", e.message || e);
        res.status(500).json({ message: 'Error interno del servidor al obtener restaurantes.' });
    }
});

// RUTA PARA OBTENER UN RESTAURANTE POR ID (para edición)
app.get('/api/restaurantes/:id', async (req, res) => {
    try {
        const item = await Restaurante.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Restaurante no encontrado.' });
        }
        res.json(item);
    } catch (e) {
        console.error("❌ ERROR al obtener restaurante por ID:", e.message || e);
        res.status(500).json({ message: 'Error interno del servidor al obtener restaurante por ID.' });
    }
});

// RUTA PARA ACTUALIZAR UN RESTAURANTE POR ID
app.put('/api/restaurantes/:id', async (req, res) => {
    try {
        // { new: true } devuelve el documento actualizado
        // { runValidators: true } asegura que las validaciones del esquema se apliquen
        const item = await Restaurante.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!item) {
            return res.status(404).json({ message: 'Restaurante no encontrado para actualizar.' });
        }
        res.json(item);
    } catch (e) {
        console.error("❌ ERROR al actualizar restaurante:", e.message || e);
        if (e.name === 'ValidationError') {
            return res.status(400).json({ message: e.message });
        }
        res.status(500).json({ message: 'Error interno del servidor al actualizar restaurante.' });
    }
});

// RUTA PARA ELIMINAR UN RESTAURANTE POR ID
app.delete('/api/restaurantes/:id', async (req, res) => {
    try {
        const item = await Restaurante.findByIdAndDelete(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Restaurante no encontrado para eliminar.' });
        }
        res.status(204).send(); // 204 No Content: éxito sin devolver contenido
    } catch (e) {
        console.error("❌ ERROR al eliminar restaurante:", e.message || e);
        res.status(500).json({ message: 'Error interno del servidor al eliminar restaurante.' });
    }
});


// ========================================================
// === RUTAS DEL SUPER-ADMIN - GESTIÓN DE USUARIOS ========
// ========================================================

// RUTA PARA CREAR USUARIOS DESDE SUPER-ADMIN
app.post('/api/usuarios', async (req, res) => { 
    try { 
        const { email, password, rol, restaurante } = req.body; 
        
        const item = new Usuario({ 
            email, 
            password, // La contraseña se hasheará en el middleware 'pre' de Usuario.js
            rol, 
            restaurante, 
            isVerified: true // El usuario NO está verificado al crearse por superadmin
        }); 
        await item.save(); // Aquí es donde el middleware en Usuario.js actuará.
        
        res.status(201).json(item); 
    } catch (e) { 
        console.error("❌ Error al crear usuario (superadmin):", e.message || e);
        if (e.name === 'ValidationError') {
            return res.status(400).json({ message: e.message });
        }
        res.status(500).json({ message: 'Error interno del servidor al crear usuario.' }); 
    }
});

// RUTA PARA OBTENER UN USUARIO POR ID (para edición)
app.get('/api/usuarios/:id', async (req, res) => {
    try {
        const item = await Usuario.findById(req.params.id).populate('restaurante', 'nombre');
        if (!item) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        res.json(item);
    } catch (e) {
        console.error("❌ ERROR al obtener usuario por ID:", e.message || e);
        res.status(500).json({ message: 'Error interno del servidor al obtener usuario por ID.' });
    }
});

// RUTA PARA ACTUALIZAR UN USUARIO POR ID
app.put('/api/usuarios/:id', async (req, res) => {
    try {
        const { email, password, rol, restaurante, isVerified } = req.body;
        const updateData = { email, rol, restaurante, isVerified };

        // Si se proporciona una nueva contraseña, hashearla
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        const item = await Usuario.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
        if (!item) {
            return res.status(404).json({ message: 'Usuario no encontrado para actualizar.' });
        }
        res.json(item);
    } catch (e) {
        console.error("❌ Error al actualizar usuario:", e.message || e);
        if (e.name === 'ValidationError') {
            return res.status(400).json({ message: e.message });
        }
        res.status(500).json({ message: 'Error interno del servidor al actualizar usuario.' });
    }
});

// RUTA PARA ELIMINAR UN USUARIO POR ID
app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        const item = await Usuario.findByIdAndDelete(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Usuario no encontrado para eliminar.' });
        }
        res.status(204).send(); // 204 No Content: éxito sin devolver contenido
    } catch (e) {
        console.error("❌ Error al eliminar usuario:", e.message || e);
        res.status(500).json({ message: 'Error interno del servidor al eliminar usuario.' });
    }
});

// RUTA PARA OBTENER TODOS LOS USUARIOS
app.get('/api/usuarios', async (req, res) => { 
    try { 
        const items = await Usuario.find().populate('restaurante', 'nombre'); 
        res.json(items); 
    } catch (e) { 
        console.error("❌ Error al obtener usuarios:", e.message || e);
        res.status(500).json({ message: 'Error interno del servidor al obtener usuarios.' }); 
    } 
});

// RUTA DE LOGIN (INICIO DE SESIÓN)
app.post('/api/login', async (req, res) => { 
    try { 
        const { email, password } = req.body; 
        const usuario = await Usuario.findOne({ email }); 
        
        if (!usuario) { 
            return res.status(401).json({ message: 'Credenciales incorrectas' }); 
        } 
        
        if(!usuario.isVerified) { 
            return res.status(401).json({ message: 'Tu cuenta no ha sido verificada. Por favor, revisa tu correo.'}); 
        } 
        
        // --- ESPÍA DE LOGIN ---
        console.log('--- DIAGNÓSTICO DE LOGIN ---');
        console.log('Email recibido:', email);
        console.log('Contraseña recibida (sin hashear):', password); // ¡NO HACER ESTO EN PRODUCCIÓN! Solo para depuración
        console.log('Contraseña hasheada en DB:', usuario.password);
        const esValida = await usuario.comparePassword(password); 
        console.log('Resultado de bcrypt.compare():', esValida);
        console.log('----------------------------');
        // --- FIN ESPÍA DE LOGIN ---

        if (!esValida) { 
            return res.status(401).json({ message: 'Credenciales incorrectas' }); 
        } 
        
        let nombreRestaurante = null; 
        if(usuario.restaurante) { 
            const rest = await Restaurante.findById(usuario.restaurante); 
            nombreRestaurante = rest ? rest.nombre : null; 
        } 
        
        res.json({ userId: usuario._id, email: usuario.email, rol: usuario.rol, restauranteId: usuario.restaurante, nombreRestaurante }); 
    } catch (e) { 
        console.error("❌ Error en el login del servidor:", e.message || e);
        res.status(500).json({ message: 'Error interno del servidor durante el login.' }); 
    }
});


// ========================================================
// === RUTAS DEL ADMIN DE RESTAURANTE =====================
// ========================================================

// RUTAS PARA PLATOS
app.post('/api/platos', async (req, res) => { 
    try { const item = new Plato(req.body); await item.save(); res.status(201).json(item); } catch (e) { console.error("❌ Error al crear plato:", e.message || e); res.status(400).json({ message: e.message }); } 
});
app.get('/api/platos/restaurante/:restauranteId', async (req, res) => { 
    try { const items = await Plato.find({ restaurante: req.params.restauranteId }); res.json(items); } catch (e) { console.error("❌ Error al obtener platos por restaurante:", e.message || e); res.status(500).json({ message: e.message }); } 
});
app.get('/api/platos/:id', async (req, res) => { 
    try { const item = await Plato.findById(req.params.id); if (!item) return res.status(404).json({ message: 'Plato no encontrado.' }); res.json(item); } catch (e) { console.error("❌ Error al obtener plato por ID:", e.message || e); res.status(500).json({ message: e.message }); } 
});
app.put('/api/platos/:id', async (req, res) => { 
    try { const item = await Plato.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!item) return res.status(404).json({ message: 'Plato no encontrado para actualizar.' }); res.json(item); } catch (e) { console.error("❌ Error al actualizar plato:", e.message || e); res.status(400).json({ message: e.message }); } 
});
app.delete('/api/platos/:id', async (req, res) => { 
    try { const item = await Plato.findByIdAndDelete(req.params.id); if (!item) return res.status(404).json({ message: 'Plato no encontrado para eliminar.' }); res.status(204).send(); } catch (e) { console.error("❌ Error al eliminar plato:", e.message || e); res.status(500).json({ message: e.message }); } 
});

// RUTA PARA ALTERNAR DISPONIBILIDAD DE UN PLATO
app.patch('/api/platos/:id/toggle', async (req, res) => {
    try {
        const plato = await Plato.findById(req.params.id);
        if (!plato) {
            return res.status(404).json({ message: 'Plato no encontrado.' });
        }
        plato.disponible = !plato.disponible; // Invierte el estado de disponibilidad
        await plato.save();
        res.json(plato); // Devuelve el plato con el estado actualizado
    } catch (e) {
        console.error("❌ Error al alternar disponibilidad de plato:", e.message || e);
        res.status(500).json({ message: 'Error interno del servidor al alternar disponibilidad del plato.' });
    }
});

// RUTAS PARA ESPECIALES
app.post('/api/especiales', async (req, res) => { 
    try { const item = new Especial(req.body); await item.save(); res.status(201).json(item); } catch (e) { console.error("❌ Error al crear especial:", e.message || e); res.status(400).json({ message: e.message }); } 
});
app.get('/api/especiales/restaurante/:restauranteId', async (req, res) => { 
    try { const items = await Especial.find({ restaurante: req.params.restauranteId }); res.json(items); } catch (e) { console.error("❌ Error al obtener especiales por restaurante:", e.message || e); res.status(500).json({ message: e.message }); } 
});
app.get('/api/especiales/:id', async (req, res) => { 
    try { const item = await Especial.findById(req.params.id); if (!item) return res.status(404).json({ message: 'Especial no encontrado.' }); res.json(item); } catch (e) { console.error("❌ Error al obtener especial por ID:", e.message || e); res.status(500).json({ message: e.message }); } 
});
app.put('/api/especiales/:id', async (req, res) => { 
    try { const item = await Especial.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!item) return res.status(404).json({ message: 'Especial no encontrado para actualizar.' }); res.json(item); } catch (e) { console.error("❌ Error al actualizar especial:", e.message || e); res.status(400).json({ message: e.message }); } 
});
app.delete('/api/especiales/:id', async (req, res) => { 
    try { const item = await Especial.findByIdAndDelete(req.params.id); if (!item) return res.status(404).json({ message: 'Especial no encontrado para eliminar.' }); res.status(204).send(); } catch (e) { console.error("❌ Error al eliminar especial:", e.message || e); res.status(500).json({ message: e.message }); } 
});

// RUTA PARA ALTERNAR DISPONIBILIDAD DE UN ESPECIAL
app.patch('/api/especiales/:id/toggle', async (req, res) => {
    try {
        const especial = await Especial.findById(req.params.id);
        if (!especial) {
            return res.status(404).json({ message: 'Especial no encontrado.' });
        }
        especial.disponible = !especial.disponible; // Invierte el estado de disponibilidad
        await especial.save();
        res.json(especial); // Devuelve el especial con el estado actualizado
    } catch (e) {
        console.error("❌ Error al alternar disponibilidad de especial:", e.message || e);
        res.status(500).json({ message: 'Error interno del servidor al alternar disponibilidad del especial.' });
    }
});

// RUTAS PARA CATEGORÍAS DE MENÚ
app.post('/api/menu-categorias', async (req, res) => { 
    try { const item = new MenuCategoria(req.body); await item.save(); res.status(201).json(item); } catch (e) { console.error("❌ Error al crear categoría de menú:", e.message || e); res.status(400).json({ message: e.message }); } 
});
app.get('/api/menu-categorias/restaurante/:restauranteId', async (req, res) => { 
    try { const items = await MenuCategoria.find({ restaurante: req.params.restauranteId }); res.json(items); } catch (e) { console.error("❌ Error al obtener categorías de menú por restaurante:", e.message || e); res.status(500).json({ message: e.message }); } 
});
app.get('/api/menu-categorias/:id', async (req, res) => { 
    try { const item = await MenuCategoria.findById(req.params.id); if (!item) return res.status(404).json({ message: 'Categoría de menú no encontrada.' }); res.json(item); } catch (e) { console.error("❌ Error al obtener categoría de menú por ID:", e.message || e); res.status(500).json({ message: e.message }); } 
});
app.put('/api/menu-categorias/:id', async (req, res) => { 
    try { const item = await MenuCategoria.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!item) return res.status(404).json({ message: 'Categoría de menú no encontrada para actualizar.' }); res.json(item); } catch (e) { console.error("❌ Error al actualizar categoría de menú:", e.message || e); res.status(400).json({ message: e.message }); } 
});
app.delete('/api/menu-categorias/:id', async (req, res) => { 
    try { const item = await MenuCategoria.findByIdAndDelete(req.params.id); if (!item) return res.status(404).json({ message: 'Categoría de menú no encontrada para eliminar.' }); res.status(204).send(); } catch (e) { console.error("❌ Error al eliminar categoría de menú:", e.message || e); res.status(500).json({ message: e.message }); } 
});

// RUTAS PARA MENÚS DEL DÍA
app.post('/api/menus-dia', async (req, res) => { 
    try { const item = new MenuDia(req.body); await item.save(); res.status(201).json(item); } catch (e) { console.error("❌ Error al crear menú del día:", e.message || e); res.status(400).json({ message: e.message }); } 
});
app.get('/api/menus-dia/restaurante/:restauranteId', async (req, res) => { 
    try { const items = await MenuDia.find({ restaurante: req.params.restauranteId }); res.json(items); } catch (e) { console.error("❌ Error al obtener menús del día por restaurante:", e.message || e); res.status(500).json({ message: e.message }); } 
});
app.get('/api/menus-dia/:id', async (req, res) => { 
    try { const item = await MenuDia.findById(req.params.id); if (!item) return res.status(404).json({ message: 'Menú del día no encontrado.' }); res.json(item); } catch (e) { console.error("❌ Error al obtener menú del día por ID:", e.message || e); res.status(500).json({ message: e.message }); } 
});
app.put('/api/menus-dia/:id', async (req, res) => { 
    try { const item = await MenuDia.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!item) return res.status(404).json({ message: 'Menú del día no encontrado para actualizar.' }); res.json(item); } catch (e) { console.error("❌ Error al actualizar menú del día:", e.message || e); res.status(400).json({ message: e.message }); } 
});
app.delete('/api/menus-dia/:id', async (req, res) => { 
    try { const item = await MenuDia.findByIdAndDelete(req.params.id); if (!item) return res.status(404).json({ message: 'Menú del día no encontrado para eliminar.' }); res.status(204).send(); } catch (e) { console.error("❌ Error al eliminar menú del día:", e.message || e); res.status(500).json({ message: e.message }); } 
});


// ========================================================
// === RUTAS PÚBLICAS Y PARA SERVIR ARCHIVOS HTML =========
// ========================================================
app.get('/api/public/menu/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const restaurante = await Restaurante.findOne({ slug });
        if (!restaurante) return res.status(404).json({ message: 'Restaurante no encontrado' });
        const inicioDelDia = new Date(new Date().setUTCHours(0, 0, 0, 0));
        const finDelDia = new Date(new Date().setUTCHours(23, 59, 59, 999));
        const menuDelDia = await MenuDia.findOne({ restaurante: restaurante._id, fecha: { $gte: inicioDelDia, $lte: finDelDia }, activo: true });
        const platosALaCarta = await Plato.find({ restaurante: restaurante._id, disponible: true });
        const platosEspeciales = await Especial.find({ restaurante: restaurante._id, disponible: true });
        res.json({ restaurante, menuDelDia, platosALaCarta, platosEspeciales });
    } catch (e) {
        console.error("❌ Error en ruta de menú público:", e.message || e);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'landing.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/verify', (req, res) => res.sendFile(path.join(__dirname, 'public', 'verify.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/super_admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'super_admin.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/r/:slug', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/forgot-password', (req, res) => res.sendFile(path.join(__dirname, 'public', 'forgot-password.html'))); 
app.get('/reset-password', (req, res) => res.sendFile(path.join(__dirname, 'public', 'reset-password.html'))); 

// --- Iniciar Servidor ---
app.listen(port, () => { console.log(`🚀 Servidor funcionando en http://localhost:${port}`); });
