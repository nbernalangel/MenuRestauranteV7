// app.js
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

const app = express();
const port = process.env.PORT || 3000;

// --- Middlewares ---
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- Conexión a MongoDB ---
const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/menu-restaurante-db';
mongoose.connect(dbUri)
    .then(() => console.log('✅ Conectado a MongoDB'))
    .catch(err => console.error('❌ Error de conexión a MongoDB:', err.message || err)); 

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
        res.status(500).json({ message: 'Hubo un error al enviar el mensaje. Por favor, inténtalo de nuevo más tarde.' });
    }
});


// ========================================================
// === EL RESTO DE TU CÓDIGO CONTINÚA AQUÍ ================
// ========================================================

// RUTA PARA CREAR UN NUEVO PEDIDO (PÚBLICA)
app.post('/api/pedidos', async (req, res) => {
    try {
        const nuevoPedido = new Pedido(req.body);
        await nuevoPedido.save();
        console.log(`✅ Nuevo pedido ${nuevoPedido.numeroPedido} guardado con éxito.`);
        res.status(201).json({ message: 'Pedido creado con éxito', pedido: nuevoPedido });
    } catch (error) {
        console.error("❌ Error al crear el pedido:", error.message || error);
        res.status(500).json({ message: 'Error interno del servidor al crear el pedido.' });
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
        const resetUrl = `${appBaseUrl}/reset-password.html?token=${resetToken}`;

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

// RUTAS DEL SUPER-ADMIN - GESTIÓN DE RESTAURANTES
app.post('/api/restaurantes', async (req, res) => { 
    try { 
        const item = new Restaurante(req.body); 
        await item.save(); 
        res.status(201).json(item); 
    } catch (e) { 
        if (e.name === 'ValidationError') {
            return res.status(400).json({ message: e.message });
        }
        res.status(500).json({ message: 'Error interno del servidor al crear restaurante.' }); 
    } 
});
app.get('/api/restaurantes', async (req, res) => {
    try {
        const items = await Restaurante.find();
        res.json(items);
    } catch (e) {
        res.status(500).json({ message: 'Error interno del servidor al obtener restaurantes.' });
    }
});
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
app.put('/api/restaurantes/:id', async (req, res) => {
    try {
        const item = await Restaurante.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!item) {
            return res.status(404).json({ message: 'Restaurante no encontrado para actualizar.' });
        }
        res.json(item);
    } catch (e) {
        if (e.name === 'ValidationError') {
            return res.status(400).json({ message: e.message });
        }
        res.status(500).json({ message: 'Error interno del servidor al actualizar restaurante.' });
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

// RUTAS DEL SUPER-ADMIN - GESTIÓN DE USUARIOS
app.post('/api/usuarios', async (req, res) => { 
    try { 
        const { email, password, rol, restaurante } = req.body; 
        const item = new Usuario({ email, password, rol, restaurante, isVerified: true }); 
        await item.save();
        res.status(201).json(item); 
    } catch (e) { 
        if (e.name === 'ValidationError') {
            return res.status(400).json({ message: e.message });
        }
        res.status(500).json({ message: 'Error interno del servidor al crear usuario.' }); 
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

// RUTA PARA DESCARGAR REPORTE DE PEDIDOS EN EXCEL
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

        worksheet.columns = [
            { header: 'Fecha', key: 'fecha', width: 20 },
            { header: 'Número Pedido', key: 'numeroPedido', width: 20 },
            { header: 'Cliente', key: 'cliente', width: 30 },
            { header: 'Teléfono', key: 'telefono', width: 15 },
            { header: 'Ítems', key: 'items', width: 50 },
            { header: 'Total', key: 'total', width: 15, style: { numFmt: '"$"#,##0.00' } },
            { header: 'Estado', key: 'estado', width: 15 }
        ];

        pedidos.forEach(pedido => {
            const itemsStr = pedido.items.map(item => 
                `${item.cantidad}x ${item.nombre ? item.nombre : 'Nombre no encontrado'}`
            ).join(', ');

            worksheet.addRow({
                fecha: pedido.createdAt,
                numeroPedido: pedido.numeroPedido,
                cliente: pedido.cliente.nombre,
                telefono: pedido.cliente.telefono,
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
        
        console.log(`✅ Reporte Excel generado para ${restaurante.nombre}.`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("❌ Error al generar el reporte de Excel:", error.message || error);
        res.status(500).send('Error interno del servidor al generar el reporte.');
    }
});


// RUTAS PÚBLICAS Y PARA SERVIR ARCHIVOS HTML
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
