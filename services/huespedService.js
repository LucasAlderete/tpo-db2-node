import { Huesped } from "../models/huespedModel.js";
import { neo4jSession } from '../config/db.js';

export async function agregarHuesped(huespedData) {
    const nuevoHuesped = new Huesped(huespedData);
    await nuevoHuesped.save();
    console.log("Huésped agregado exitosamente.");
}