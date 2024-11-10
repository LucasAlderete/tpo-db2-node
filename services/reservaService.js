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
      const fecha = new Date(paramFecha);   
      const reservas = await Reserva.aggregate([
        {
          $lookup: {
            from: 'habitacions', 
            localField: 'habitacion', 
            foreignField: '_id', 
            as: 'infoHabitacion'
          }
        },
        { $unwind: '$infoHabitacion' },
        
        {
          $lookup: {
            from: 'hotels', 
            localField: 'infoHabitacion.hotel', 
            foreignField: '_id', 
            as: 'infoHotel'
          }
        },
        { $unwind: '$infoHotel' },
  
        {
          $lookup: {
            from: 'huespeds',
            localField: 'huesped', 
            foreignField: '_id', 
            as: 'infoHuesped'
          }
        },
        { $unwind: '$infoHuesped' },
  
        {
          $match: {
            'infoHotel._id': new mongoose.Types.ObjectId(IdHotel),
            fecha_inicio: { $lte: fecha }, 
            fecha_fin: { $gte: fecha } 
          }
        }
      ]);
  
      return reservas;
    } catch (error) {
      console.error('Error al obtener las reservas:', error);
    }
  }