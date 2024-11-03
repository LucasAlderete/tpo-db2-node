import { neo4jSession } from '../config/db.js';
import { Habitacion } from "../models/habitacionModel.js";

export async function obtenerHabitacionPorId(id) {
    return await Habitacion.findById(id);
}

export async function eliminarHabitacion(idRef) {
  try {
    await Habitacion.findByIdAndDelete(idRef);
    console.log("Habitacion eliminada de Mongo");

    await neo4jSession.run(
      `
      MATCH (h:habitacion {id_ref: $idRef})
      DETACH DELETE h
      `,
      { idRef: idRef }
    );

    console.log("Habitacion eliminada de Neo4j");
  }
  catch (err) {
    console.log("Error al intentar eliminar habitacion", e);
  }
}