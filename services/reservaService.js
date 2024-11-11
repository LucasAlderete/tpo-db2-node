import { Reserva } from "../models/reservaModel.js";

import { neo4jSession } from '../config/db.js';
import mongoose from "mongoose";
import {obtenerHuespedPorId} from "./huespedService.js";
import {seleccionarHuesped} from "../app.js";


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



export async function buscarReservaPorConfirmacion(numeroConfirmacion) {
    try {
        const reservas = await Reserva.aggregate([
            // Etapa 1: Filtramos por el código de confirmación de la reserva
            {
                $match: {
                    codigo: numeroConfirmacion
                }
            },
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
                $unwind: {
                    path: '$infoHabitacion', // Descompone el array de habitación para facilitar acceso a datos
                    preserveNullAndEmptyArrays: true
                }
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
                    preserveNullAndEmptyArrays: true
                }
            },
            // Proyectamos los campos que necesitamos
            {
                $project: {
                    codigo: 1,
                    fecha_inicio: 1,
                    fecha_fin: 1,
                    precio: 1,
                    "infoHabitacion": 1,
                    "infoHotel": 1,
                }
            }
        ]);

        if (reservas.length === 0) {
            console.log(`No se encontró una reserva con el código de confirmación ${numeroConfirmacion} en el hotel seleccionado.`);
            return [];
        }

        return reservas;

    } catch (error) {
        console.error('Error al buscar la reserva:', error);
        return [];
    }
}




export async function buscarReservaPorHuesped() {
    try {
        const huespedSeleccionado = await seleccionarHuesped();
        const huesped_id = await obtenerHuespedPorId(huespedSeleccionado);

        const reservas = await Reserva.aggregate([
            // Filtramos las reservas por el ID del huésped
            {
                $match: {
                    huesped: new mongoose.Types.ObjectId(huesped_id) // Filtro para el huésped específico
                }
            },
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
                $unwind: {
                    path: '$infoHabitacion', // Descompone el array de habitación para facilitar acceso a datos
                    preserveNullAndEmptyArrays: true
                }
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
                    preserveNullAndEmptyArrays: true
                }
            },
            // Proyectamos los campos que necesitamos
            {
                $project: {
                    codigo: 1,
                    fecha_inicio: 1,
                    fecha_fin: 1,
                    precio: 1,
                    "infoHabitacion": 1,
                    "infoHotel": 1,
                }
            }
        ]);

        return reservas;

    } catch (error) {
        console.error('Error al buscar reservas por huésped:', error);
        return [];
    }
}