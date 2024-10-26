import mongoose from "mongoose";

const huespedSchema = new mongoose.Schema({
  nombre: String,
  apellido: String,
  telefonos: [String],
  emails: [String],
  direccion: String,
});

export const Huesped = mongoose.model("Huesped", huespedSchema);
