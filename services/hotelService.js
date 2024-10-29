import { Hotel } from "../models/hotelModel.js";
import { neo4jSession } from '../config/db.js';

export async function agregarHotel(data) {

  try {
    const hotel = new Hotel(data);
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

  } catch (err) {
    console.error("Error al guardar Hotel:", err);
  }
  
}

export async function obtenerHotel(nombre) {
  
  try {
    const hotel = await Hotel.findOne({nombre});
    return hotel;

  } catch (err) {
    console.error("Error al buscar Hotel:", err);
  }
}
