import { neo4jSession } from '../config/db.js';
import { Habitacion } from "../models/habitacionModel.js";

export async function obtenerHabitacionPorId(id) {
    try {
        return await Habitacion.findById(id);
        
      } catch (error) {
        console.log("error al obtener habitacion por _id", error);
      }
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

export async function modificarHabitacion(idRef, data) {
  try {
      // Actualizar en MongoDB
      const habitacion = await Habitacion.findById(idRef);
      if (!habitacion) {
          throw new Error("Habitación no encontrada");
      }

      // Actualiza los campos con los datos proporcionados
      habitacion.nombre = data.nombre || habitacion.nombre;
      habitacion.tipo = data.tipo || habitacion.tipo;
      habitacion.capacidad = data.capacidad || habitacion.capacidad;
      habitacion.precio_base = data.precio_base || habitacion.precio_base;
      habitacion.amenities = data.amenities || habitacion.amenities;

      await habitacion.save();
      console.log("Habitación actualizada en MongoDB");

      // Actualizar en Neo4j
      await neo4jSession.run(
          `MATCH (h:Habitacion {id_ref: $habitacionId})
           SET h.nombre = $nombre, h.tipo = $tipo, h.capacidad = $capacidad, h.precio_base = $precio_base
           RETURN h`,
          {
              habitacionId: habitacion._id.toString(),
              nombre: habitacion.nombre,
              tipo: habitacion.tipo,
              capacidad: habitacion.capacidad,
              precio_base: habitacion.precio_base
          }
      );
      console.log("Habitación actualizada en Neo4j");

      // Actualizar amenities en Neo4j
      for (const amenity of data.amenities) {
          const result = await neo4jSession.run(
              `MATCH (a:Amenity {nombre: $nombre}) RETURN a`,
              { nombre: amenity }
          );

          if (result.records.length === 0) {
              await neo4jSession.run(
                  `
                  MATCH (h:Habitacion {id_ref: $habitacionId})
                  CREATE (a:Amenity {nombre: $nombre})
                  CREATE (a)-[:Incluido_En]->(h)
                  CREATE (h)-[:incluye]->(a)
                  `,
                  {
                      habitacionId: habitacion._id.toString(),
                      nombre: amenity
                  }
              );
              console.log(`Amenity '${amenity}' creado y relacionado con la habitación en Neo4j`);
          } else {
              await neo4jSession.run(
                  `
                  MATCH (a:Amenity {nombre: $nombre}), (h:Habitacion {id_ref: $habitacionId})
                  MERGE (a)-[:Incluido_En]->(h)
                  MERGE (h)-[:Incluye]->(a)
                  `,
                  {
                      habitacionId: habitacion._id.toString(),
                      nombre: amenity
                  }
              );
              console.log(`Amenity '${amenity}' relacionado con la habitación en Neo4j`);
          }
      }

  } catch (err) {
      console.error("Error al modificar Habitación:", err);
  }
}

export async function buscarHabitacionPorFechas(fechaInicio, fechaFin) {
    try {
        const result = await neo4jSession.run(
            `
            MATCH (habitacion:Habitacion)
            WHERE NOT EXISTS {
                MATCH (habitacion)-[:No_Disponible]->(reserva:Reserva)
                WHERE (reserva.fecha_inicio < $fechaFin AND reserva.fecha_fin > $fechaInicio)
            }
            RETURN habitacion.nombre AS NombreHabitacion
            ORDER BY NombreHabitacion
            `,
            { fechaInicio, fechaFin } // Parámetros de rango de fechas
        );

        
        const habitacionesDisponibles = result.records.map(record => record.get('NombreHabitacion'));

        if (habitacionesDisponibles.length > 0) {
            console.log("Habitaciones disponibles:");
            habitacionesDisponibles.forEach(nombre => {
                console.log(`- ${nombre}`);
            });
        } else {
            console.log("No hay habitaciones disponibles en ese rango de fechas.");
        }

        return habitacionesDisponibles;
    } catch (error) {
        console.error("Error al obtener habitaciones disponibles:", error);
        throw error;
    }
}


