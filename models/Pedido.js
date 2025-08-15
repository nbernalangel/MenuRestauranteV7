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
        direccion: { type: String },
        numeroMesa: { type: String }
    },
    tipo: {
        type: String,
        // --- ESTE ES EL ÚNICO CAMBIO ---
        enum: ['Domicilio', 'Mesa', 'Recoger'], // Añadimos la nueva opción
        required: [true, 'El tipo de pedido es obligatorio.']
    },
    estado: {
        type: String,
        enum: ['pendiente', 'en preparación', 'listo', 'entregado', 'cancelado'],
        default: 'pendiente'
    },
    metodoDePago: {
        type: String,
        enum: ['Efectivo', 'Tarjeta', 'Transferencia'],
        required: [true, 'El método de pago es obligatorio.']
    },
    notas: {
        type: String
    }
}, { timestamps: true });

// Tu excelente middleware para generar el número de pedido se mantiene intacto.
pedidoSchema.pre('save', async function(next) {
    if (this.isNew && !this.numeroPedido) {
        try {
            const count = await mongoose.model('Pedido').countDocuments({ restaurante: this.restaurante });
            const restaurante = await mongoose.model('Restaurante').findById(this.restaurante);
            const prefix = restaurante ? restaurante.nombre.substring(0, 4).toUpperCase().replace(/\s+/g, '') : 'PED';
            this.numeroPedido = `${prefix}-${(count + 1).toString().padStart(5, '0')}`;
        } catch (error) {
            console.error("Error generando número de pedido:", error);
            return next(error);
        }
    }
    next();
});

module.exports = mongoose.model('Pedido', pedidoSchema);