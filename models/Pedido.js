// models/Pedido.js
const mongoose = require('mongoose');

// FIX: Se modifica el sub-esquema para que coincida con la estructura de la base de datos.
// Ahora se guardará el nombre y el precio directamente, en lugar de una referencia.
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
    items: [itemPedidoSchema], // <-- Usamos el sub-esquema corregido
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

pedidoSchema.pre('save', async function(next) {
    if (this.isNew && !this.numeroPedido) {
        const count = await mongoose.model('Pedido').countDocuments({ restaurante: this.restaurante });
        this.numeroPedido = `PED-${(count + 1).toString().padStart(5, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Pedido', pedidoSchema);
