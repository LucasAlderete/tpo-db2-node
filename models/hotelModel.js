import mongoose from "mongoose";

const hotelSchema = new mongoose.Schema({
  nombre: String,
  direccion: {},
  telefono: [String],
  email: String,
  habitaciones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Habitacion' }],
  puntosInteres: [String]
});

export const Hotel = mongoose.model("Hotel", hotelSchema);
