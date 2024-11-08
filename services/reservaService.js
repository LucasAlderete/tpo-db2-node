import { Reserva } from "../models/reservaModel.js";
import { neo4jSession } from '../config/db.js';
import mongoose from "mongoose";

export async function agregarReserva(data) {
    try {
        let reserva = new Reserva(data);
        await reserva.save();
        console.log("Reserva guardada en Mongo");

        const habitacionId = data.habitacion;
        
        const result = await neo4jSession.run(
            `MATCH (h:Habitacion {id_ref: $habitacionId}) RETURN h`,
            { habitacionId }
        );

        if (result.records.length == 0) {
            throw new Error("Habitación no encontrada en Neo4j");
        }

        // Crear relación No_Disponible en Neo4j
        await neo4jSession.run(
            `
            MATCH
                (h:Habitacion {id_ref: $habitacionId})
            CREATE 
                (h)-[:No_Disponible]->
                (r:Reserva {
                    id_ref: $id_ref, 
                    fecha_inicio: $fechaInicio,
                    fecha_fin: $fechaFin
                })`,
            {
                habitacionId,
                fechaInicio: data.fecha_inicio,
                fechaFin: data.fecha_fin,
                id_ref: reserva._id.toString()
            }
        );

        console.log("Relación de habitación No_Disponible en Reserva guardada en Neo");

    } catch (err) {
        console.error("Error al guardar Reserva:", err);
    }
}

export async function validarDisponibilidad(habitacionId, fechaInicio, fechaFin) {
    const result = await neo4jSession.run(
        `
        MATCH (h:Habitacion {id_ref: $habitacionId})-[:No_Disponible]->(r:Reserva)
        WHERE 
            (r.fecha_inicio < $fechaFin AND r.fecha_fin > $fechaInicio)
        RETURN COUNT(r) AS reservasExistentes
        `,
        {
            habitacionId,
            fechaInicio,
            fechaFin
        }
    );
    const reservasExistentes = result.records[0].get('reservasExistentes').toNumber();
    if (reservasExistentes > 0) {
        console.log("Habitacion no disponible en esas fechas");
    }
    return reservasExistentes == 0;
}

export async function buscarReservaPorFecha(paramFecha, IdHotel) {

    try {
      const fecha = new Date(paramFecha); // Convertir la fecha a un objeto Date
  
      const reservas = await Reserva.aggregate([
        // Primer $lookup: Unir con la colección de habitaciones
        {
          $lookup: {
            from: 'habitacions', // Nombre de la colección de habitaciones
            localField: 'habitacion', // Campo en reservas que hace referencia al _id de la habitación
            foreignField: '_id', // Campo en habitaciones que corresponde al _id
            as: 'infoHabitacion'
          }
        },
        {
          $unwind: '$infoHabitacion' // Descompone el array para facilitar el acceso a los datos de la habitación
        },
        // Segundo $lookup: Unir con la colección de hoteles
        {
          $lookup: {
            from: 'hotels', // Nombre de la colección de hoteles
            localField: 'infoHabitacion.hotel', // Campo en habitaciones que hace referencia al _id del hotel
            foreignField: '_id', // Campo en hoteles que corresponde al _id
            as: 'infoHotel'
          }
        },
        {
          $unwind: {
            path: '$infoHotel', // Descompone el array de hoteles
            preserveNullAndEmptyArrays: true // Esto permite que se muestren registros sin coincidencias
          }
        },
        // Filtramos las reservas que cumplen con los parámetros
        {
          $match: {
            'infoHotel._id': new mongoose.Types.ObjectId(IdHotel), // Filtramos por el id del hotel
            fecha_inicio: { $lte: fecha }, // Filtra por fecha de inicio mayor o igual a parametroFecha
            fecha_fin: { $gte: fecha } // Filtra por fecha de fin menor o igual a parametroFecha
          }
        },
        // Proyectamos los campos que necesitamos
      ]);
      return reservas;
    } catch (error) {
      console.error('Error al obtener las reservas:', error);
    }
  }