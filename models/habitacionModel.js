import mongoose from "mongoose";

const habitacionSchema = new mongoose.Schema({
  nombre: String,
  tipo: String,
  capacidad: Number,
  precio_base: Number,
  amenities: [String],
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' }
});

export const Habitacion = mongoose.model("Habitacion", habitacionSchema);
