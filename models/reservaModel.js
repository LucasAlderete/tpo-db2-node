import mongoose from "mongoose";

const reservaSchema = new mongoose.Schema({
  codigo: String,
  fecha_inicio: Date,
  fecha_fin: Date,
  estado: String,
  precio_final: Number,
  habitacion: { type: mongoose.Schema.Types.ObjectId, ref: 'Habitacion' },
  husped: { type: mongoose.Schema.Types.ObjectId, ref: 'Huesped' },
});

export const Reserva = mongoose.model("Reserva", reservaSchema);
