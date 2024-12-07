import { Hotel } from "../models/hotelModel.js";
import { Habitacion } from "../models/habitacionModel.js";
import { neo4jSession } from '../config/db.js';

export async function agregarHotel(data) {
    try {
      let hotel = new Hotel(data);
      hotel.nombre = hotel.nombre.trim();
      await hotel.save();
      console.log("Hotel guardado en Mongo");
      
      await neo4jSession.run(
        `CREATE (h:Hotel {nombre: $nombre, id_ref: $id_ref}) RETURN h`,
        {
          nombre: hotel.nombre,
          id_ref: hotel._id.toString()
        } 
      );
      console.log("Hotel guardado en Neo");

      for (const poi of data.puntosInteres) {
        const result = await neo4jSession.run(
          `MATCH (p:POI {nombre: $nombre}) RETURN p`,
          { nombre: poi }
        );

        if (result.records.length === 0) {
          await neo4jSession.run(
            `
            MATCH (h:Hotel {id_ref: $hotelId})
            CREATE (p:POI {nombre: $nombre})
            CREATE (p)-[:CERCANO_A]->(h)
            CREATE (h)-[:CERCANO_A]->(p)
            `,
            {
              hotelId: hotel._id.toString(),
              nombre: poi
            }
          );
          console.log(`Punto de interés '${poi}' creado y relacionado con el hotel en Neo`);
        } else {
          await neo4jSession.run(
            `
            MATCH (p:POI {nombre: $nombre}), (h:Hotel {id_ref: $hotelId})
            CREATE (p)-[:CERCANO_A]->(h)
            CREATE (h)-[:CERCANO_A]->(p)
            `,
            {
              hotelId: hotel._id.toString(),
              nombre: poi
            }
          );
          console.log(`Punto de interés '${poi}' ya existía y fue relacionado con el hotel en Neo`);
        }
      }

    } catch (err) {
      console.error("Error al guardar Hotel:", err);
    }
    
}
  
export async function agregarHabitacion(data) {
    try {
        const hotel = await Hotel.findById(data.hotel);
        if (!hotel) {
          throw new Error("Hotel no encontrado");
        }
    
        const habitacion = new Habitacion(data);
        await habitacion.save();
        console.log("Habitacion guardada en Mongo");
    
        hotel.habitaciones.push(habitacion._id);
        await hotel.save();
        console.log("Habitacion asociada al hotel en Mongo");
    
        await neo4jSession.run(
          `
          MATCH (h:Hotel {id_ref: $hotelId})
          CREATE (r:Habitacion {nombre: $nombre, id_ref: $habitacionId})
          CREATE (r)-[:Esta_en]->(h)
          CREATE (h)-[:tiene]->(r)
          RETURN h, r
          `,
          {
            nombre: habitacion.nombre,
            hotelId: hotel._id.toString(),
            habitacionId: habitacion._id.toString()
          }
        );
    
        console.log("Relación de habitación y hotel guardada en Neo");
        
        const amenities = data.amenities.map((amenity) => amenity.trim());

        for (const amenity of amenities) {
            const result = await neo4jSession.run(
                `MATCH (a:Amenity {nombre: $nombre}) RETURN a`,
                { nombre: amenity }
            );

            if (result.records.length === 0) {
                await neo4jSession.run(
                `
                MATCH (r:Habitacion {id_ref: $habitacionId})
                CREATE (a:Amenity {nombre: $nombre})
                CREATE (a)-[:Incluido_En]->(r)
                CREATE (r)-[:incluye]->(a)
                `,
                {
                    habitacionId: habitacion._id.toString(),
                    nombre: amenity,
                }
                );
                console.log(`Amenity '${amenity}' creado y relacionado con la habitación en Neo`);
            } else {
                await neo4jSession.run(
                `
                MATCH (a:Amenity {nombre: $nombre}), (r:Habitacion {id_ref: $habitacionId})
                CREATE (a)-[:Incluido_En]->(r)
                CREATE (r)-[:Incluye]->(a)
                `,
                {
                    habitacionId: habitacion._id.toString(),
                    nombre: amenity,
                }
                );
                console.log(`Amenity '${amenity}' ya existía y fue relacionado con la habitación en Neo`);
            }
        }

    
      } catch (err) {
        console.error("Error al guardar Habitacion:", err);
      }
}
  
export async function agregarPoi(data) {
    //
    return;
}

export async function obtenerHotel(nombre) {
  
  try {
    const hotel = await Hotel.findOne({ nombre: { $regex: new RegExp(nombre, 'i') } });
    return hotel;

  } catch (err) {
    console.error("Error al buscar Hotel:", err);
  }
}

export async function obtenerPoiPorHotel(nombre) {

  try{
    const result = await neo4jSession.run(
      `MATCH (h:Hotel {nombre: $nombre})-[:CERCANO_A]->(p:POI) RETURN p`,
      { nombre }
    );
    return result.records.map(record => record.get(0).properties);
    
  } catch (err) {
    console.error("Error al buscar POIs por Hotel:", err);
  }
}

export async function obtenerHotelCercanoAPoiNeo(nombrePoi) {
  try {
    return await neo4jSession.run(
      `
      MATCH (h:Hotel)-[:CERCANO_A]->(p:POI {nombre: $nombrePOI})
      RETURN h.nombre AS nombre, h.id_ref AS id_ref
      `,
      { nombrePOI: nombrePoi }
    );
  } catch (err) {
    console.error("Error al obtenerHotelCercanoAPoiNeo:", err);
  }
}

export async function obtenerTodosLosHoteles() {
  return await Hotel.find();
}

export async function eliminarHotel(idRef) {
  try {
    await Hotel.findByIdAndDelete(idRef);
    console.log("Hotel eliminado de Mongo");

    await neo4jSession.run(
      `
      MATCH (h:Hotel {id_ref: $hotelId})
      DETACH DELETE h
      `,
      { hotelId: idRef }
    );

    console.log("Hotel eliminado de Neo4j");
  }
  catch (err) {
    console.log("Error al intentar eliminar el hotel", e);
  }

}

export async function obtenerHotelPorId(idRef) {
  try {
    return await Hotel.findById(idRef)
    .populate('habitaciones');

  } catch (error) {
    console.log("error al obtener hotel por _id", err);
  }
}

export async function modificarHotel(idRef, data) {
  try {
      // Actualizar en MongoDB
      const hotel = await Hotel.findById(idRef);
      if (!hotel) {
          throw new Error("Hotel no encontrado");
      }

      // Actualiza los campos según los datos proporcionados
      hotel.nombre = data.nombre || hotel.nombre;
      hotel.direccion = data.direccion || hotel.direccion;
      hotel.telefono = data.telefono || hotel.telefono;
      hotel.email = data.email || hotel.email;
      hotel.puntosInteres = data.puntosInteres || hotel.puntosInteres;


      await hotel.save();
      console.log("Hotel actualizado en MongoDB");

      // Actualizar en Neo4j
      await neo4jSession.run(
          `MATCH (h:Hotel {id_ref: $hotelId})
           SET h.nombre = $nombre
           RETURN h`,
          {
              hotelId: hotel._id.toString(),
              nombre: hotel.nombre
          }
      );
      console.log("Nombre de hotel actualizado en Neo4j");


      // Actualizar puntos de interés en Neo4j
      for (const poi of data.puntosInteres) {
          const result = await neo4jSession.run(
              `MATCH (p:POI {nombre: $nombre}) RETURN p`,
              { nombre: poi }
          );

          if (result.records.length === 0) {
              await neo4jSession.run(
                  `
                  MATCH (h:Hotel {id_ref: $hotelId})
                  CREATE (p:POI {nombre: $nombre})
                  CREATE (p)-[:CERCANO_A]->(h)
                  CREATE (h)-[:CERCANO_A]->(p)
                  `,
                  {
                      hotelId: hotel._id.toString(),
                      nombre: poi
                  }
              );
              console.log(`Punto de interés '${poi}' creado y relacionado con el hotel en Neo`);
          } else {
              await neo4jSession.run(
                  `
                  MATCH (p:POI {nombre: $nombre}), (h:Hotel {id_ref: $hotelId})
                  MERGE (p)-[:CERCANO_A]->(h)
                  MERGE (h)-[:CERCANO_A]->(p)
                  `,
                  {
                      hotelId: hotel._id.toString(),
                      nombre: poi
                  }
              );
              console.log(`Punto de interés '${poi}' relacionado con el hotel en Neo`);
          }
      }

  } catch (err) {
      console.error("Error al modificar Hotel:", err);
  }
}

