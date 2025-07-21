// models/Pedido.js
const mongoose = require('mongoose');

const itemPedidoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    precio: {
        type: Number,
        required: true
    },
    cantidad: {
        type: Number,
        required: true,
        min: 1
    }
}, { _id: false });

const pedidoSchema = new mongoose.Schema({
    restaurante: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurante',
        required: true
    },
    numeroPedido: {
        type: String,
        unique: true,
    },
    items: [itemPedidoSchema],
    total: {
        type: Number,
        required: true
    },
    cliente: {
        nombre: { type: String, required: true },
        telefono: { type: String },
        direccion: { type: String }
    },
    estado: {
        type: String,
        enum: ['pendiente', 'en preparación', 'listo', 'entregado', 'cancelado'],
        default: 'pendiente'
    },
    notas: {
        type: String
    }
}, { timestamps: true });

// FIX: Middleware mejorado para generar un número de pedido único por restaurante
pedidoSchema.pre('save', async function(next) {
    if (this.isNew && !this.numeroPedido) {
        try {
            // 1. Contar cuántos pedidos ya tiene este restaurante
            const count = await mongoose.model('Pedido').countDocuments({ restaurante: this.restaurante });
            
            // 2. Obtener el restaurante para usar su nombre como prefijo
            const restaurante = await mongoose.model('Restaurante').findById(this.restaurante);
            
            // 3. Crear un prefijo de 4 letras (o 'PED' si no se encuentra el restaurante)
            const prefix = restaurante ? restaurante.nombre.substring(0, 4).toUpperCase().replace(/\s+/g, '') : 'PED';

            // 4. Combinar el prefijo y el contador para un ID único (ej: ORIO-00001)
            this.numeroPedido = `${prefix}-${(count + 1).toString().padStart(5, '0')}`;
        } catch (error) {
            console.error("Error generando número de pedido:", error);
            // Si hay un error, pasarlo para que no se guarde un pedido corrupto
            return next(error);
        }
    }
    next();
});

module.exports = mongoose.model('Pedido', pedidoSchema);
