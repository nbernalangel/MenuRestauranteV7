// app.js (MODIFICADO CON SOCKET.IO)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Resend } = require('resend');
const ExcelJS = require('exceljs');
const crypto = require('crypto');
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const { Client } = require("@googlemaps/google-maps-services-js");

// --- CAMBIO 1: IMPORTAMOS HTTP Y SOCKET.IO ---
const http = require('http');
const { Server } = require('socket.io');
// -------------------------------------------

const app = express();
const port = process.env.PORT || 3000;

// --- CAMBIO 2: CREAMOS EL SERVIDOR HTTP Y EL SERVIDOR DE SOCKETS ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "https://app.ting-col.com", // Puedes restringir esto a tu dominio en producción
        methods: ["GET", "POST"]
    }
    allowEIO3: true
});
// -----------------------------------------------------------------

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// === SERVIR ARCHIVOS ESTÁTICOS ===
app.use(express.static('public'));

const mapsClient = new Client({});

// --- Conexión a MongoDB ---
const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/menu-restaurante-db';
mongoose.connect(dbUri)
    .then(() => console.log('✅ Conectado a MongoDB'))
    .catch(err => console.error('❌ Error de conexión a MongoDB:', err.message || err));

// ... (El resto de tu código de configuración de Cloudinary, Resend, Modelos, etc., sigue igual)
// --- Configuración de Cloudinary ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

// --- Configuración de Resend ---
const resend = new Resend(process.env.RESEND_API_KEY);

// --- Importar Modelos ---
const Plato = require('./models/Plato');
const Especial = require('./models/Especial');
const MenuCategoria = require('./models/MenuCategoria');
const MenuDia = require('./models/MenuDia');
const Restaurante = require('./models/Restaurante');
const Usuario = require('./models/Usuario');
const Pedido = require('./models/Pedido');
const Bebida = require('./models/Bebida'); // <-- ¡LÍNEA AÑADIDA!
const Pizza = require('./models/Pizza');


// --- CAMBIO 3: LÓGICA DE CONEXIÓN DE SOCKET.IO ---
io.on('connection', (socket) => {
    console.log('✅ Un cliente se ha conectado al WebSocket.');
    
    // Unirse a una "sala" específica por restaurante
    socket.on('join_admin_room', (restauranteId) => {
        socket.join(restauranteId);
        console.log(`👨‍💼 Admin se unió a la sala: ${restauranteId}`);
    });

    socket.on('disconnect', () => {
        console.log('❌ Un cliente se ha desconectado del WebSocket.');
    });
});
// ----------------------------------------------------


// ... (Todas tus otras rutas: /api/sign-upload, /api/contact, /api/register, etc. siguen aquí)

// ========================================================
// === EL RESTO DE TU CÓDIGO CONTINÚA AQUÍ ================
// ========================================================

// --- CAMBIO 4: MODIFICAMOS LA RUTA PARA CREAR PEDIDOS ---
// RUTA PARA CREAR UN NUEVO PEDIDO (PÚBLICA)
app.post('/api/pedidos', async (req, res) => {
    try {
        const nuevoPedido = new Pedido(req.body);
        await nuevoPedido.save();

        // Después de guardar, poblamos los datos del restaurante para enviarlos
        const pedidoCompleto = await Pedido.findById(nuevoPedido._id).populate('restaurante');
        
        console.log(`✅ Nuevo pedido ${pedidoCompleto.numeroPedido} guardado con éxito.`);
        
        // ¡LA MAGIA! Emitimos el evento 'nuevo-pedido' a la sala del restaurante específico
        if(pedidoCompleto.restaurante && pedidoCompleto.restaurante._id) {
            io.to(pedidoCompleto.restaurante._id.toString()).emit('nuevo-pedido', pedidoCompleto);
            console.log(`📢 Evento "nuevo-pedido" emitido a la sala ${pedidoCompleto.restaurante._id}`);
        }
        
        res.status(201).json({ message: 'Pedido creado con éxito', pedido: pedidoCompleto });

    } catch (error) {
        console.error("❌ Error al crear el pedido:", error.message || error);
        res.status(500).json({ message: 'Error interno del servidor al crear el pedido.' });
    }
});

// RUTA 1: OBTENER TODOS LOS PEDIDOS DE HOY PARA UN RESTAURANTE
app.get('/api/pedidos/restaurante/:restauranteId/hoy', async (req, res) => {
    try {
        const { restauranteId } = req.params;

        // Configuramos el inicio del día en la zona horaria local (Colombia)
        const hoy = new Date();
        const inicioDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        
        const pedidos = await Pedido.find({
            restaurante: restauranteId,
            createdAt: { $gte: inicioDelDia } // Filtro para traer solo pedidos creados desde el inicio del día de hoy
        }).sort({ createdAt: -1 }); // Los más nuevos primero

        res.json(pedidos);

    } catch (error) {
        console.error("❌ Error al obtener los pedidos de hoy:", error.message || error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// RUTA 2: ACTUALIZAR EL ESTADO DE UN PEDIDO
app.patch('/api/pedidos/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        // Validamos que el estado enviado sea uno de los permitidos en el modelo
        const estadosPermitidos = Pedido.schema.path('estado').enumValues;
        if (!estadosPermitidos.includes(estado)) {
            return res.status(400).json({ message: 'Estado no válido.' });
        }

        const pedidoActualizado = await Pedido.findByIdAndUpdate(
            id,
            { estado: estado },
            { new: true } // Devuelve el documento actualizado
        );

        if (!pedidoActualizado) {
            return res.status(404).json({ message: 'Pedido no encontrado.' });
        }

        // ¡LA MAGIA EN TIEMPO REAL!
        // Notificamos a todos en la sala del restaurante que un estado ha cambiado.
        io.to(pedidoActualizado.restaurante.toString()).emit('actualizacion-estado', pedidoActualizado);
        console.log(`📢 Estado del pedido ${pedidoActualizado.numeroPedido} actualizado a "${estado}". Evento emitido.`);

        res.json(pedidoActualizado);

    } catch (error) {
        console.error("❌ Error al actualizar el estado del pedido:", error.message || error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// -------------------------------------------------------

// ... (El resto de tus rutas existentes: /api/register, /api/verify, etc., van aquí sin cambios)

/*
 PEGA AQUÍ TODO EL RESTO DE TUS RUTAS DESDE:
 app.post('/api/register', ...);
 HASTA EL FINAL DE LAS RUTAS...
 app.get('/r/:slug/menu', ...);
*/
// ========================================================
// === RUTAS PARA LA SUBIDA DE LOGOS ======================
// ========================================================

app.post('/api/sign-upload', (req, res) => {
    const timestamp = Math.round((new Date).getTime()/1000);
    try {
        const signature = cloudinary.utils.api_sign_request({
            timestamp: timestamp,
            folder: 'logos_restaurantes'
        }, cloudinary.config().api_secret);
        res.json({ timestamp, signature });
    } catch (error) {
        console.error("Error al firmar la subida:", error);
        res.status(500).json({ message: "Error al autorizar la subida de la imagen." });
    }
});

app.get('/api/config', (req, res) => {
    res.json({
        cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
        cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
    });
});

// ========================================================
// === RUTA PARA EL FORMULARIO DE CONTACTO DE LA LANDING ===
// ========================================================
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ message: 'Todos los campos son requeridos.' });
        }

        await resend.emails.send({
            from: `Formulario de Contacto <noreply@ting-col.com>`,
            to: 'hola@ting-col.com',
            subject: `Nuevo mensaje de contacto de ${name}`,
            reply_to: email,
            html: `
                <p>Has recibido un nuevo mensaje desde el formulario de contacto de tu página web.</p>
                <hr>
                <p><strong>Nombre:</strong> ${name}</p>
                <p><strong>Correo del remitente:</strong> ${email}</p>
                <p><strong>Mensaje:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
                <hr>
            `,
        });

        console.log(`✅ Correo de contacto enviado con éxito de parte de ${email}`);
        res.status(200).json({ message: '¡Mensaje enviado con éxito! Gracias por contactarnos.' });

    } catch (error) {
        console.error("❌ Error al enviar el correo de contacto:", error);
        res.status(500).json({ message: 'Hubo un error al enviar el mensaje. Por favor, inténtalo de nuevo más horrible.' });
    }
});


// RUTAS DE REGISTRO Y VERIFICACIÓN
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

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);

        const nuevoUsuario = new Usuario({
            email, password, rol: 'admin_restaurante', restaurante: nuevoRestaurante._id,
            isVerified: false, verificationCode, verificationCodeExpires
        });
        await nuevoUsuario.save();

        const appBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        await resend.emails.send({
            from: `Tu Menú Digital <verificacion@ting-col.com>`,
            to: email,
            subject: 'Verifica tu cuenta de Menú Digital',
            html: `<p>Usa este código para verificar tu cuenta: <strong>${verificationCode}</strong></p>`,
        });
        console.log(`✅ Correo de verificación enviado a ${email}`);

        res.status(201).json({ message: '¡Registro exitoso! Revisa tu correo para el código de verificación.' });
    } catch (e) {
        console.error("❌ Error en /api/register:", e.message || e);
        res.status(500).json({ message: 'Ocurrió un error en el servidor.' });
    }
});

app.post('/api/verify', async (req, res) => {
    try {
        const { email, code } = req.body;
        const usuario = await Usuario.findOne({ email });

        if (!usuario) { return res.status(404).json({ message: 'Usuario no encontrado.' }); }
        if (usuario.isVerified) { return res.status(400).json({ message: 'Esta cuenta ya ha sido verificada.' }); }
        if (new Date() > usuario.verificationCodeExpires) { return res.status(400).json({ message: 'El código de verificación ha expirado.' });}
        if (String(usuario.verificationCode) !== String(code)) { return res.status(400).json({ message: 'Código de verificación incorrecto.' });}

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

// RUTAS PARA "OLVIDÓ SU CONTRASEÑA"
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const usuario = await Usuario.findOne({ email });

        if (!usuario) {
            return res.status(200).json({ message: 'Si el correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña.' });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hora

        usuario.resetToken = resetToken;
        usuario.resetTokenExpires = resetTokenExpires;
        await usuario.save();

        const appBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        
        // --- CÓDIGO CORREGIDO: Se define la variable resetUrl antes de usarla ---
        const resetUrl = `${appBaseUrl}/reset-password/${resetToken}`;
        // ----------------------------------------------------------------------
        
        await resend.emails.send({
            from: `Tu Menú Digital <noreply@ting-col.com>`,
            to: email,
            subject: 'Restablecer tu Contraseña de Menú Digital',
            html: `<p>Para restablecer tu contraseña, haz clic en este enlace: <a href="${resetUrl}">${resetUrl}</a></p>`,
        });
        console.log(`✅ Correo de restablecimiento enviado a ${email}`);

        res.status(200).json({ message: 'Si el correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña.' });

    } catch (e) {
        console.error("❌ Error en /api/forgot-password:", e.message || e);
        res.status(500).json({ message: 'Ocurrió un error en el servidor.' });
    }
});

app.post('/api/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const usuario = await Usuario.findOne({
            resetToken: token,
            resetTokenExpires: { $gt: new Date() }
        });

        if (!usuario) {
            return res.status(400).json({ message: 'El token de restablecimiento es inválido o ha expirado.' });
        }

        usuario.password = password;
        usuario.resetToken = undefined;
        usuario.resetTokenExpires = undefined;
        usuario.isVerified = true;

        await usuario.save();
        console.log(`✅ Contraseña restablecida para ${usuario.email}`);

        res.status(200).json({ message: 'Contraseña restablecida con éxito. Ya puedes iniciar sesión.' });

    } catch (e) {
        console.error("❌ Error en /api/reset-password:", e.message || e);
        res.status(500).json({ message: 'Ocurrió un error en el servidor.' });
    }
});

// ELIMINAR UNA BEBIDA POR ID
app.delete('/api/bebidas/:id', async (req, res) => {
    try {
        const item = await Bebida.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ message: 'Bebida no encontrada para eliminar.' });
        res.status(204).send();
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// ACTIVAR/DESACTIVAR DISPONIBILIDAD DE UNA BEBIDA
app.patch('/api/bebidas/:id/toggle', async (req, res) => {
    try {
        const item = await Bebida.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Bebida no encontrada.' });
        item.disponible = !item.disponible;
        await item.save();
        res.json(item);
    } catch (e) {
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// --- RUTA FALTANTE PARA OBTENER TODOS LOS RESTAURANTES ---
app.post('/api/restaurantes', async (req, res) => {
    try {
        // Lógica para crear un nuevo restaurante
        const { nombre, slug, telefono } = req.body;
        const nuevoRestaurante = new Restaurante({ nombre, slug, telefono });
        await nuevoRestaurante.save();
        res.status(201).json(nuevoRestaurante);
    } catch (error) {
        console.error("❌ Error al crear un nuevo restaurante:", error.message);
        res.status(500).json({ message: 'Error interno del servidor al crear el restaurante.' });
    }
});

app.get('/api/restaurantes', async (req, res) => {
    try {
        const restaurantes = await Restaurante.find({}).sort({ nombre: 1 });
        res.json(restaurantes);
    } catch (e) {
        console.error("❌ Error al obtener la lista de restaurantes:", e.message);
        res.status(500).json({ message: 'Error interno del servidor al obtener los restaurantes.' });
    }
});

// === CAMBIO CLAVE AQUÍ: ESTA RUTA DEBE IR ANTES DE '/api/restaurantes/:id' ===
// RUTA PÚBLICA PARA OBTENER LAS UBICACIONES DE LOS RESTAURANTES
app.get('/api/restaurantes/locations', async (req, res) => {
    try {
        const restaurantes = await Restaurante.find({
            'location.coordinates': { $exists: true, $ne: [] }
        });
        // Si no hay restaurantes, la variable será un array vacío [], lo cual es correcto.
        res.json(restaurantes);

    } catch (e) {
        console.error("❌ Error al obtener ubicaciones:", e.message);
        // Si hay un error, respondemos con un status 500 pero enviamos un array vacío
        // para que el frontend no se rompa.
        res.status(500).json([]);
    }
});
// ==============================================================================


app.get('/api/restaurantes/:id', async (req, res) => {
    try {
        const item = await Restaurante.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Restaurante no encontrado.' });
        }
        res.json(item);
    } catch (e) {
        res.status(500).json({ message: 'Error interno del servidor al obtener restaurante por ID.' });
    }
});
// RUTA PARA ACTUALIZAR UN RESTAURANTE POR ID (CON GEOCODIFICACIÓN)
app.put('/api/restaurantes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // --- INICIO DE LA LÓGICA DE GEOCODIFICACIÓN ---
        if (updateData.direccion) {
            try {
                const response = await mapsClient.geocode({
                    params: {
                        address: updateData.direccion,
                        key: process.env.Maps_API_KEY // Lee la clave desde tu archivo .env
                    }
                });

                if (response.data.results && response.data.results.length > 0) {
                    const location = response.data.results[0].geometry.location;
                    updateData.location = {
                        type: 'Point',
                        coordinates: [location.lng, location.lat] // [longitud, latitud]
                    };
                    console.log(`✅ Coordenadas obtenidas para "${updateData.direccion}":`, updateData.location.coordinates);
                }
            } catch (geocodeError) {
                console.error("❌ Error de geocodificación:", geocodeError.message);
            }
        }
        // --- FIN DE LA LÓGICA DE GEOCODIFICACIÓN ---

        const item = await Restaurante.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

        if (!item) {
            return res.status(404).json({ message: 'Restaurante no encontrado para actualizar.' });
        }
        res.json(item);

    } catch (e) {
        console.error("❌ ERROR al actualizar restaurante:", e.message || e);
        if (e.name === 'ValidationError') {
            return res.status(400).json({ message: e.message });
        }
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});
app.delete('/api/restaurantes/:id', async (req, res) => {
    try {
        const item = await Restaurante.findByIdAndDelete(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Restaurante no encontrado para eliminar.' });
        }
        res.status(204).send();
    } catch (e) {
        res.status(500).json({ message: 'Error interno del servidor al eliminar restaurante.' });
    }
});

// RUTA DEL SUPER-ADMIN PARA CREAR USUARIOS (VERSIÓN CORREGIDA FINAL)
app.post('/api/usuarios', async (req, res) => {
    try {
        const { email, password, rol, restaurante } = req.body;

        const usuarioExistente = await Usuario.findOne({ email });
        if (usuarioExistente) {
            return res.status(409).json({ message: 'Ya existe un usuario con este correo electrónico.' });
        }

        // --- CORRECCIÓN: Se elimina el cifrado manual ---
        // El modelo Usuario.js se encargará de esto automáticamente al hacer .save()
        const nuevoUsuario = new Usuario({
            email,
            password, // Pasamos la contraseña en texto plano para que el modelo la cifre una sola vez
            rol,
            restaurante,
            isVerified: true
        });

        await nuevoUsuario.save();
        
        const usuarioCreado = nuevoUsuario.toObject();
        delete usuarioCreado.password;

        res.status(201).json(usuarioCreado);

    } catch (e) {
        console.error("❌ Error al crear usuario desde super_admin:", e);
        if (e.name === 'ValidationError') {
            return res.status(400).json({ message: e.message });
        }
        res.status(500).json({ message: 'Error interno del servidor al crear el usuario.' });
    }
});
app.get('/api/usuarios', async (req, res) => {
    try {
        const items = await Usuario.find().populate('restaurante', 'nombre');
        res.json(items);
    } catch (e) {
        res.status(500).json({ message: 'Error interno del servidor al obtener usuarios.' });
    }
});
app.get('/api/usuarios/:id', async (req, res) => {
    try {
        const item = await Usuario.findById(req.params.id).populate('restaurante', 'nombre');
        if (!item) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        res.json(item);
    } catch (e) {
        res.status(500).json({ message: 'Error interno del servidor al obtener usuario por ID.' });
    }
});
app.put('/api/usuarios/:id', async (req, res) => {
    try {
        const { email, password, rol, restaurante, isVerified } = req.body;
        const updateData = { email, rol, restaurante, isVerified };
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
        if (e.name === 'ValidationError') {
            return res.status(400).json({ message: e.message });
        }
        res.status(500).json({ message: 'Error interno del servidor al actualizar usuario.' });
    }
});
app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        const item = await Usuario.findByIdAndDelete(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Usuario no encontrado para eliminar.' });
        }
        res.status(204).send();
    } catch (e) {
        res.status(500).json({ message: 'Error interno del servidor al eliminar usuario.' });
    }
});

// RUTA DE LOGIN (INICIO DE SESIÓN)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const usuario = await Usuario.findOne({ email });
        if (!usuario || !usuario.isVerified) {
            return res.status(401).json({ message: 'Credenciales incorrectas o cuenta no verificada.' });
        }
        const esValida = await usuario.comparePassword(password);
        if (!esValida) {
            return res.status(401).json({ message: 'Credenciales incorrectas.' });
        }
        let nombreRestaurante = null;
        if(usuario.restaurante) {
            const rest = await Restaurante.findById(usuario.restaurante);
            nombreRestaurante = rest ? rest.nombre : null;
        }
        res.json({ userId: usuario._id, email: usuario.email, rol: usuario.rol, restauranteId: usuario.restaurante, nombreRestaurante });
    } catch (e) {
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// RUTAS DEL ADMIN DE RESTAURANTE
app.post('/api/platos', async (req, res) => {
    try { const item = new Plato(req.body); await item.save(); res.status(201).json(item); } catch (e) { res.status(400).json({ message: e.message }); }
});
app.get('/api/platos/restaurante/:restauranteId', async (req, res) => {
    try { const items = await Plato.find({ restaurante: req.params.restauranteId }); res.json(items); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.get('/api/platos/:id', async (req, res) => {
    try { const item = await Plato.findById(req.params.id); if (!item) return res.status(404).json({ message: 'Plato no encontrado.' }); res.json(item); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.put('/api/platos/:id', async (req, res) => {
    try { const item = await Plato.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!item) return res.status(404).json({ message: 'Plato no encontrado para actualizar.' }); res.json(item); } catch (e) { res.status(400).json({ message: e.message }); }
});
app.delete('/api/platos/:id', async (req, res) => {
    try { const item = await Plato.findByIdAndDelete(req.params.id); if (!item) return res.status(404).json({ message: 'Plato no encontrado para eliminar.' }); res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.patch('/api/platos/:id/toggle', async (req, res) => {
    try {
        const plato = await Plato.findById(req.params.id);
        if (!plato) return res.status(404).json({ message: 'Plato no encontrado.' });
        plato.disponible = !plato.disponible;
        await plato.save();
        res.json(plato);
    } catch (e) { res.status(500).json({ message: 'Error interno del servidor.' }); }
});

// RUTAS PARA ESPECIALES
app.post('/api/especiales', async (req, res) => {
    try { const item = new Especial(req.body); await item.save(); res.status(201).json(item); } catch (e) { res.status(400).json({ message: e.message }); }
});
app.get('/api/especiales/restaurante/:restauranteId', async (req, res) => {
    try { const items = await Especial.find({ restaurante: req.params.restauranteId }); res.json(items); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.get('/api/especiales/:id', async (req, res) => {
    try { const item = await Especial.findById(req.params.id); if (!item) return res.status(404).json({ message: 'Especial no encontrado.' }); res.json(item); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.put('/api/especiales/:id', async (req, res) => {
    try { const item = await Especial.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!item) return res.status(404).json({ message: 'Especial no encontrado para actualizar.' }); res.json(item); } catch (e) { res.status(400).json({ message: e.message }); }
});
app.delete('/api/especiales/:id', async (req, res) => {
    try { const item = await Especial.findByIdAndDelete(req.params.id); if (!item) return res.status(404).json({ message: 'Especial no encontrado para eliminar.' }); res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.patch('/api/especiales/:id/toggle', async (req, res) => {
    try {
        const especial = await Especial.findById(req.params.id);
        if (!especial) {
            return res.status(404).json({ message: 'Especial no encontrado.' });
        }
        especial.disponible = !especial.disponible;
        await especial.save();
        res.json(especial);
    } catch (e) {
        res.status(500).json({ message: 'Error interno del servidor al alternar disponibilidad del especial.' });
    }
});

// ==============================================
// === NUEVAS RUTAS DEL ADMIN DE RESTAURANTE - GESTIÓN DE BEBIDAS ===
// ==============================================
app.post('/api/bebidas', async (req, res) => {
    try {
        const item = new Bebida(req.body);
        await item.save();
        res.status(201).json(item);
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});

app.get('/api/bebidas/restaurante/:restauranteId', async (req, res) => {
    try {
        const items = await Bebida.find({ restaurante: req.params.restauranteId });
        res.json(items);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.get('/api/bebidas/:id', async (req, res) => {
    try {
        const item = await Bebida.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Bebida no encontrada.' });
        res.json(item);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.put('/api/bebidas/:id', async (req, res) => {
    try {
        const item = await Bebida.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!item) return res.status(404).json({ message: 'Bebida no encontrada para actualizar.' });
        res.json(item);
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});

app.delete('/api/bebidas/:id', async (req, res) => {
    try {
        const item = await Bebida.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ message: 'Bebida no encontrada para eliminar.' });
        res.status(204).send();
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.patch('/api/bebidas/:id/toggle', async (req, res) => {
    try {
        const bebida = await Bebida.findById(req.params.id);
        if (!bebida) return res.status(404).json({ message: 'Bebida no encontrada.' });
        bebida.disponible = !bebida.disponible;
        await bebida.save();
        res.json(bebida);
    } catch (e) {
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// ==============================================
// === RUTAS PARA LA GESTIÓN DE PIZZAS ===
// ==============================================

// CREAR UNA NUEVA PIZZA
app.post('/api/pizzas', async (req, res) => {
    try {
        const item = new Pizza(req.body);
        await item.save();
        res.status(201).json(item);
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});

// OBTENER TODAS LAS PIZZAS DE UN RESTAURANTE
app.get('/api/pizzas/restaurante/:restauranteId', async (req, res) => {
    try {
        const items = await Pizza.find({ restaurante: req.params.restauranteId });
        res.json(items);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// OBTENER UNA PIZZA POR SU ID
app.get('/api/pizzas/:id', async (req, res) => {
    try {
        const item = await Pizza.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Pizza no encontrada.' });
        res.json(item);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// ACTUALIZAR UNA PIZZA POR SU ID
app.put('/api/pizzas/:id', async (req, res) => {
    try {
        const item = await Pizza.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!item) return res.status(404).json({ message: 'Pizza no encontrada para actualizar.' });
        res.json(item);
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});

// ELIMINAR UNA PIZZA POR SU ID
app.delete('/api/pizzas/:id', async (req, res) => {
    try {
        const item = await Pizza.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ message: 'Pizza no encontrada para eliminar.' });
        res.status(204).send();
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// ACTIVAR/DESACTIVAR DISPONIBILIDAD DE UNA PIZZA
app.patch('/api/pizzas/:id/toggle', async (req, res) => {
    try {
        const item = await Pizza.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Pizza no encontrada.' });
        item.disponible = !item.disponible;
        await item.save();
        res.json(item);
    } catch (e) {
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// RUTAS PARA CATEGORÍAS DE MENÚ
app.post('/api/menu-categorias', async (req, res) => {
    try { const item = new MenuCategoria(req.body); await item.save(); res.status(201).json(item); } catch (e) { res.status(400).json({ message: e.message }); }
});
app.get('/api/menu-categorias/restaurante/:restauranteId', async (req, res) => {
    try { const items = await MenuCategoria.find({ restaurante: req.params.restauranteId }); res.json(items); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.get('/api/menu-categorias/:id', async (req, res) => {
    try { const item = await MenuCategoria.findById(req.params.id); if (!item) return res.status(404).json({ message: 'Categoría de menú no encontrada.' }); res.json(item); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.put('/api/menu-categorias/:id', async (req, res) => {
    try { const item = await MenuCategoria.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!item) return res.status(404).json({ message: 'Categoría de menú no encontrada para actualizar.' }); res.json(item); } catch (e) { res.status(400).json({ message: e.message }); }
});
app.delete('/api/menu-categorias/:id', async (req, res) => {
    try { const item = await MenuCategoria.findByIdAndDelete(req.params.id); if (!item) return res.status(404).json({ message: 'Categoría de menú no encontrada para eliminar.' }); res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); }
});

// RUTAS PARA MENÚS DEL DÍA
app.post('/api/menus-dia', async (req, res) => {
    try { const item = new MenuDia(req.body); await item.save(); res.status(201).json(item); } catch (e) { res.status(400).json({ message: e.message }); }
});
app.get('/api/menus-dia/restaurante/:restauranteId', async (req, res) => {
    try { const items = await MenuDia.find({ restaurante: req.params.restauranteId }); res.json(items); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.get('/api/menus-dia/:id', async (req, res) => {
    try { const item = await MenuDia.findById(req.params.id); if (!item) return res.status(404).json({ message: 'Menú del día no encontrado.' }); res.json(item); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.put('/api/menus-dia/:id', async (req, res) => {
    try { const item = await MenuDia.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!item) return res.status(404).json({ message: 'Menú del día no encontrado para actualizar.' }); res.json(item); } catch (e) { res.status(400).json({ message: e.message }); }
});
app.delete('/api/menus-dia/:id', async (req, res) => {
    try { const item = await MenuDia.findByIdAndDelete(req.params.id); if (!item) return res.status(404).json({ message: 'Menú del día no encontrado para eliminar.' }); res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); }
});

// RUTA PARA DESCARGAR REPORTE DE PEDIDOS EN EXCEL (VERSIÓN MEJORADA)
app.get('/api/pedidos/descargar/:restauranteId', async (req, res) => {
    try {
        const { restauranteId } = req.params;

        const restaurante = await Restaurante.findById(restauranteId);
        if (!restaurante) {
            return res.status(404).send('Restaurante no encontrado');
        }

        const pedidos = await Pedido.find({ restaurante: restauranteId })
                                    .sort({ createdAt: -1 });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`Pedidos ${restaurante.nombre}`);

        // --- CAMBIO 1: AÑADIMOS LAS NUEVAS COLUMNAS ---
        worksheet.columns = [
            { header: 'Fecha', key: 'fecha', width: 20 },
            { header: 'Número Pedido', key: 'numeroPedido', width: 20 },
            { header: 'Tipo de Pedido', key: 'tipo', width: 20 }, // <-- NUEVA COLUMNA
            { header: 'Cliente', key: 'cliente', width: 30 },
            { header: 'Detalle (Dirección/Mesa)', key: 'detalle', width: 40 }, // <-- NUEVA COLUMNA
            { header: 'Teléfono', key: 'telefono', width: 15 },
            { header: 'Ítems', key: 'items', width: 50 },
            { header: 'Total', key: 'total', width: 15, style: { numFmt: '"$"#,##0.00' } },
            { header: 'Estado', key: 'estado', width: 15 }
        ];

        pedidos.forEach(pedido => {
            const itemsStr = pedido.items.map(item =>
                `${item.cantidad}x ${item.nombre || 'N/A'}`
            ).join(', ');
            
            // --- CAMBIO 2: LÓGICA PARA OBTENER LOS DATOS CORRECTOS ---
            let tipoPedido = pedido.tipo || 'No especificado';
            let detallePedido = '';
            
            // Verificamos el tipo de pedido y extraemos el dato correspondiente
            if (pedido.tipo === 'Mesa' && pedido.cliente) {
                detallePedido = `Mesa #${pedido.cliente.numeroMesa || 'N/A'}`;
            } else if (pedido.tipo === 'Domicilio' && pedido.cliente) {
                detallePedido = pedido.cliente.direccion || 'No especificada';
            }

            worksheet.addRow({
                fecha: pedido.createdAt,
                numeroPedido: pedido.numeroPedido,
                tipo: tipoPedido, // <-- DATO NUEVO
                cliente: pedido.cliente ? pedido.cliente.nombre : 'N/A',
                detalle: detallePedido, // <-- DATO NUEVO
                telefono: pedido.cliente ? pedido.cliente.telefono || 'N/A' : 'N/A',
                items: itemsStr,
                total: pedido.total,
                estado: pedido.estado
            });
        });

        const slugAmigable = restaurante.slug || 'restaurante';
        const fechaHoy = new Date().toISOString().slice(0, 10);
        const nombreArchivo = `reporte-pedidos-${slugAmigable}-${fechaHoy}.xlsx`;

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${nombreArchivo}"`
        );

        console.log(`✅ Reporte Excel mejorado generado para ${restaurante.nombre}.`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("❌ Error al generar el reporte de Excel:", error.message || error);
        res.status(500).send('Error interno del servidor al generar el reporte.');
    }
});

// app.js (Fragmento de código para la nueva ruta de reportes)
// ========================================================
// === NUEVA RUTA PARA DESCARGAR REPORTE CON FILTROS EN EXCEL ===
// ========================================================
app.get('/api/reportes/descargar', async (req, res) => {
    try {
        const { restauranteId, fechaInicio, fechaFin, ciudad, estado } = req.query;

        // Construir el objeto de consulta de MongoDB
        let query = {};
        if (restauranteId) {
            query.restaurante = restauranteId;
        }
        if (fechaInicio) {
            query.createdAt = {
                ...query.createdAt, // Mantiene otras condiciones de fecha si existen
                $gte: new Date(fechaInicio)
            };
        }
        if (fechaFin) {
            const fechaFinObj = new Date(fechaFin);
            fechaFinObj.setDate(fechaFinObj.getDate() + 1); // Incluye todo el día seleccionado
            query.createdAt = {
                ...query.createdAt,
                $lt: fechaFinObj
            };
        }
        if (ciudad) {
            // Asume que la ciudad se puede filtrar a través del restaurante
            // Se necesita la ciudad en el modelo 'Restaurante'
            // Podríamos hacer una búsqueda anidada o usar un 'populate'
            // Simplificaremos asumiendo un solo filtro por ahora
            // (La lógica real necesitaría un paso extra para buscar por ciudad en el modelo Restaurante)
        }
        if (estado) {
            query.estado = estado;
        }

        // Obtener los pedidos filtrados y popular el restaurante para obtener su nombre
        const pedidos = await Pedido.find(query)
                                    .populate('restaurante', 'nombre')
                                    .sort({ createdAt: -1 });

        // Generar el archivo Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`Reporte de Pedidos`);

        worksheet.columns = [
            { header: 'Fecha', key: 'fecha', width: 20 },
            { header: 'Número Pedido', key: 'numeroPedido', width: 15 },
            { header: 'Restaurante', key: 'restaurante', width: 30 },
            { header: 'Cliente', key: 'cliente', width: 30 },
            { header: 'Teléfono', key: 'telefono', width: 15 },
            { header: 'Total', key: 'total', width: 15, style: { numFmt: '"$"#,##0.00' } },
            { header: 'Estado', key: 'estado', width: 15 }
        ];

        pedidos.forEach(pedido => {
            worksheet.addRow({
                fecha: pedido.createdAt,
                numeroPedido: pedido.numeroPedido,
                restaurante: pedido.restaurante ? pedido.restaurante.nombre : 'N/A',
                cliente: pedido.cliente.nombre,
                telefono: pedido.cliente.telefono,
                total: pedido.total,
                estado: pedido.estado
            });
        });

        const fechaHoy = new Date().toISOString().slice(0, 10);
        const nombreArchivo = `reporte-general-${fechaHoy}.xlsx`;
        
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${nombreArchivo}"`
        );
        
        console.log(`✅ Reporte Excel generado con filtros para ${pedidos.length} pedidos.`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("❌ Error al generar el reporte de Excel filtrado:", error.message || error);
        res.status(500).send('Error interno del servidor al generar el reporte.');
    }
});

// app.js (Fragmento de código para la nueva ruta de reportes de restaurantes)
// ========================================================
// === NUEVA RUTA PARA DESCARGAR REPORTE DE RESTAURANTES CON FILTROS ===
// ========================================================
app.get('/api/reportes/restaurantes/descargar', async (req, res) => {
    try {
        const { nombre, ubicacion } = req.query;

        // Construir el objeto de consulta de MongoDB
        let query = {};
        if (nombre) {
            query.nombre = { $regex: nombre, $options: 'i' }; // Búsqueda insensible a mayúsculas/minúsculas
        }
        if (ubicacion) {
            // Se puede buscar la ubicación en el campo de dirección
            query.direccion = { $regex: ubicacion, $options: 'i' };
        }

        // Obtener los restaurantes filtrados
        const restaurantes = await Restaurante.find(query).sort({ nombre: 1 });

        // Generar el archivo Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`Reporte de Restaurantes`);

        worksheet.columns = [
            { header: 'Nombre', key: 'nombre', width: 30 },
            { header: 'Slug', key: 'slug', width: 20 },
            { header: 'Teléfono', key: 'telefono', width: 20 },
            { header: 'Dirección', key: 'direccion', width: 50 },
            { header: 'Ciudad', key: 'ciudad', width: 20 }, // El modelo no tiene este campo, pero lo dejamos por si lo añades
            { header: 'País', key: 'pais', width: 20 }, // El modelo no tiene este campo, pero lo dejamos por si lo añades
            { header: 'Fecha de Registro', key: 'fechaRegistro', width: 20 }
        ];

        restaurantes.forEach(restaurante => {
            worksheet.addRow({
                nombre: restaurante.nombre,
                slug: restaurante.slug,
                telefono: restaurante.telefono,
                direccion: restaurante.direccion,
                ciudad: restaurante.ciudad || 'N/A',
                pais: restaurante.pais || 'N/A',
                fechaRegistro: restaurante.createdAt
            });
        });

        const fechaHoy = new Date().toISOString().slice(0, 10);
        const nombreArchivo = `reporte-restaurantes-${fechaHoy}.xlsx`;
        
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${nombreArchivo}"`
        );
        
        console.log(`✅ Reporte Excel de restaurantes generado para ${restaurantes.length} restaurantes.`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("❌ Error al generar el reporte de Excel de restaurantes:", error.message || error);
        res.status(500).send('Error interno del servidor al generar el reporte.');
    }
});


// RUTAS PÚBLICAS Y PARA SERVIR ARCHIVOS HTML
// RUTA PÚBLICA PARA OBTENER LOS DATOS DEL MENÚ COMPLETO
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
        const bebidas = await Bebida.find({ restaurante: restaurante._id, disponible: true });
        const pizzas = await Pizza.find({ restaurante: restaurante._id, disponible: true });

        // Ahora el frontend recibirá el objeto 'restaurante' completo, incluyendo 'titulosPersonalizados'
        res.json({ restaurante, menuDelDia, platosALaCarta, platosEspeciales, bebidas, pizzas });
    } catch (e) {
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'landing.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/verify', (req, res) => res.sendFile(path.join(__dirname, 'public', 'verify.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/super_admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'super_admin.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
//app.get('/r/:slug', (req, res) => res.sendFile(path.join(__dirname, 'public', 'seleccionar-pedido.html')));
app.get('/r/:slug/menu', (req, res) => res.sendFile(path.join(__dirname, 'public', 'menu_template.html')));
app.get('/forgot-password', (req, res) => res.sendFile(path.join(__dirname, 'public', 'forgot-password.html')));
app.get('/reset-password', (req, res) => res.sendFile(path.join(__dirname, 'public', 'reset-password.html')));

// --- CAMBIO FINAL: RUTA PÚBLICA PRINCIPAL INTELIGENTE ---
app.get('/r/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const restaurante = await Restaurante.findOne({ slug });

        if (!restaurante) {
            return res.status(404).send('Restaurante no encontrado');
        }

        const domicilioActivo = restaurante.aceptaDomicilios;
        const mesaActiva = restaurante.aceptaServicioEnMesa;

        if (domicilioActivo && mesaActiva) {
            // CASO 1: AMBOS activos -> Muestra la página de selección.
            res.sendFile(path.join(__dirname, 'public', 'seleccionar-pedido.html'));
        } else if (domicilioActivo) {
            // CASO 2: SÓLO domicilios -> Redirige al menú de domicilio.
            res.redirect(`/r/${slug}/menu?tipo=domicilio`);
        } else if (mesaActiva) {
            // CASO 3: SÓLO en mesa -> Redirige al menú de mesa.
            res.redirect(`/r/${slug}/menu?tipo=mesa`);
        } else {
            // CASO 4: NINGUNO activo -> Muestra la página de selección (puedes adaptarla para mostrar un mensaje de "cerrado").
            res.sendFile(path.join(__dirname, 'public', 'seleccionar-pedido.html'));
        }
    } catch (error) {
        console.error("Error en la ruta /r/:slug :", error);
        res.status(500).send("Error interno del servidor.");
    }
});
// ----------------------------------------------------

app.get('/r/:slug/menu', (req, res) => res.sendFile(path.join(__dirname, 'public', 'menu_template.html')));




// --- CAMBIO 5: Iniciar Servidor con el server de http en vez de app ---
server.listen(port, () => { console.log(`🚀 Servidor funcionando en http://localhost:${port}`); });
// ----------------------------------------------------------------------