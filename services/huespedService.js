import { Huesped } from "../models/huespedModel.js";

export async function agregarHuesped(huespedData) {
    const nuevoHuesped = new Huesped(huespedData);
    const huespedCreado = await nuevoHuesped.save();
    console.log("Huésped agregado exitosamente.");
    return huespedCreado;
}

export async function obtenerTodosLosHuespedes() {
    return await Huesped.find();
}

export async function obtenerHuespedPorId(id) {
    return await Huesped.findById(id);
}