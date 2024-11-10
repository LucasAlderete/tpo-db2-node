import readlineSync from 'readline-sync';
import moment from 'moment';
import inquirer from 'inquirer';
import { mongoConnection, cerrarConexiones } from './config/db.js';
import { capitalize } from './utils/mayus.js';
import { agregarHabitacion, agregarHotel, obtenerHotel, obtenerPoiPorHotel, obtenerHotelCercanoAPoiNeo, obtenerTodosLosHoteles, eliminarHotel, obtenerHotelPorId, modificarHotel } from './services/hotelService.js';
import { obtenerTodosPoi } from './services/poiService.js';
import { eliminarHabitacion, obtenerHabitacionPorId, modificarHabitacion, buscarHabitacionPorFechas } from './services/habitacionService.js';
import { agregarHuesped, obtenerHuespedPorId, obtenerTodosLosHuespedes } from './services/huespedService.js'
import { agregarReserva, validarDisponibilidad, buscarReservaPorFecha } from './services/reservaService.js';
import { crearCodigoReserva } from "./utils/codes.js";

async function main() {
  await mongoConnection;

    let salir = false;
    while (!salir) {
      console.log("\n=== Menú ===");
      console.log("1. Agregar Hotel");
      console.log("2. Agregar Habitacion");
      console.log("3. Buscar hoteles cerca de un punto de interes");
      console.log("4. Buscar información de un hotel");
      console.log("5. Buscar puntos de interés cercanos a un hotel");
      console.log("6. Eliminar Hotel");
      console.log("7. Eliminar Habitacion");
      console.log("8. Modificar Hotel");
      console.log("9. Modificar Habitacion");
      console.log("10. Agregar Huesped");
      console.log("11. Agregar Reserva");
      console.log("12. Buscar Huesped");
      console.log("13. Buscar reserva");
      console.log("14. Buscar amenities de una habitacion");
      console.log("15. Buscar Habitaciones disponibles por fechas");
      console.log("0. Salir");
      const opcion = readlineSync.question("Selecciona una opcion: ");
  
      switch (opcion) {
        case "0":
          salir = true;
          break;
        case "1":
          await nuevoHotel();
          break;
        case "2":
          await nuevaHabitacion();
          break;
        case "3":
          await buscarHotelPorPoi();
          break;
        case "4":
          await buscarHotel();
          break;
        case "5":
          await buscarPoiPorHotel();
          break;
        case "6":
          await seleccionarYEliminarHotel();
          break;
        case "7":
          await seleccionarHotelYEliminarHabitacion();
          break;
        case "8":
          await seleccionarYModificarHotel();
          break;
        case "9":
          await seleccionarHotelYModificarHabitacion();
          break;
        case "10":
          await nuevoHuesped();
          break;
        case "11":
          await nuevaReserva();
          break;
        case "12":
          await seleccionarYBuscarHuesped();
          break;
        case "13":
          await buscarReserva();
          break;
          case "14":
            await buscarAmenitiesPorHabitacion();
            break;
          case "15":
            await buscarHabitacionesDisponiblesPorFecha();
            break;
        default:
          console.log("Opción no válida. Inténtalo de nuevo.");
          break;
      }
    }
    
    await cerrarConexiones();
  }
  
main().catch(console.error);

//Opciones Menu

// (1)
async function nuevoHotel() {
  
    const nombre = readlineSync.question("Nombre del hotel: ");

    const exists = (await obtenerHotel(nombre)) != null;

    if (exists) {
        console.log("Ya existe un hotel con ese nombre.")
        await nuevoHotel();
    }

    const direccion = readlineSync.question("Dirección: ");
    const telefono = readlineSync.question("Teléfono: ").split(",");
    const email = readlineSync.question("Email: ");
    const puntosInteres = readlineSync.question("Puntos de interés (separados por comas): ").split(",");
    const hotelData = { nombre, direccion, telefono, email, puntosInteres };
  
    await agregarHotel(hotelData);
}

// (2)
async function nuevaHabitacion() {
    const { hotelSeleccionado } = await seleccionarHotel();

    const hotel = await obtenerHotelPorId(hotelSeleccionado);

    if (!hotel) {
        console.log("No existe un hotel con ese nombre.")
        await nuevaHabitacion();
    }

    console.log(`Agregando habitacion al hotel "${hotel.nombre}"\n`);
    const nombre = readlineSync.question("Nombre Habitacion: ");
    const tipo = readlineSync.question("Tipo: ");
    const capacidad = readlineSync.question("Capacidad: ");
    const precio_base = readlineSync.question("Precio Base: ");
    const amenities = readlineSync.question("Amenities (separados por coma): ").split(",");
    const habitacionData = { 
        nombre,
        tipo,
        capacidad,
        precio_base,
        amenities,
        hotel
    };
  
    await agregarHabitacion(habitacionData);
}

// (3)
async function buscarHotelPorPoi() {
  const listadoPois = await obtenerTodosPoi();

  const puntosDeInteres = listadoPois.records.map(record => record.get('nombre'));

  const { poiSeleccionado } = await inquirer.prompt([
    {
      type: 'list',
      name: 'poiSeleccionado',
      message: 'Selecciona el punto de interés:',
      choices: puntosDeInteres
    }
  ]);

  const hotelesRelacionados = await obtenerHotelCercanoAPoiNeo(poiSeleccionado);

  if (hotelesRelacionados.records.length === 0) {
    console.log(`No se encontraron hoteles cercanos a '${poiSeleccionado}'.`);
  } else {
    console.log(`Hoteles cercanos a '${poiSeleccionado}':`);
    hotelesRelacionados.records.forEach(record => {
      console.log(`- ${record.get('nombre')}`);
    });
  }
}

// (4)
async function buscarHotel() {
  
  const { hotelSeleccionado } = await seleccionarHotel();
  const hotel = await obtenerHotelPorId(hotelSeleccionado);

  const camposParaMostrar = ["nombre", "direccion", "telefono", "email"];

  const hotelObj = hotel.toObject();
  const hotelPropiedades = Object.keys(hotelObj);

  console.log(`\n=== Hotel ${hotel.nombre} encontrado!===`);
  console.log("=== Información: ===");

  hotelPropiedades.forEach(propiedad => {
    if (camposParaMostrar.includes(propiedad)) {
      console.log(`${capitalize(propiedad)}: ${hotelObj[propiedad]}`);
    }
  });
}

// (5)
async function buscarPoiPorHotel() {
  const { hotelSeleccionado } = await seleccionarHotel();
  const hotel = await obtenerHotelPorId(hotelSeleccionado);
  const nombreHotel = hotel.nombre;
  const poiCernanos = await obtenerPoiPorHotel(nombreHotel);
  if(poiCernanos.length === 0) {
    console.log(`\n=== No se encontraron puntos de interés cercanos al hotel ${nombreHotel} ===`);
    return;
  }

  console.log(`\n=== Puntos de interés cercanos al hotel ${nombreHotel} ===`);
  poiCernanos.forEach(poi => {
    console.log(`- ${poi.nombre}`);
  });
}

// (6)
async function seleccionarYEliminarHotel() {
    try {
      const { hotelSeleccionado } = await seleccionarHotel();

      await eliminarHotel(hotelSeleccionado)
  
    } catch (err) {
      console.error("Error al eliminar el hotel:", err);
    }
}

// (7)
async function seleccionarHotelYEliminarHabitacion() {
  try {
    const { hotelSeleccionado } = await seleccionarHotel();
    const hotel = await obtenerHotelPorId(hotelSeleccionado);
    if (!hotel) {
      return;
    }

    const { habitacionSeleccionada } = await seleccionarHabitacion(hotel);

    if (!habitacionSeleccionada) {
      return;
    }

    await eliminarHabitacion(habitacionSeleccionada);
  } catch (error) {
    console.log("Error al eliminar habitacion", error);
  }
}

// (8)
async function seleccionarYModificarHotel() {
  const { hotelSeleccionado } = await seleccionarHotel();

  console.log("IMPORTANTE: Dejar vacio el campo para no modificarlo\n");

  const nombre = readlineSync.question("Nombre del hotel: ");
  const direccion = readlineSync.question("Direccion: ");
  const telefono = readlineSync.question("Telefono: ").split(",");
  const email = readlineSync.question("Email: ");
  let puntosInteres = readlineSync.question("Puntos de interes: ").split(",");
  if (puntosInteres = '') {
    puntosInteres = undefined;
  }

  const data = {
      nombre: nombre || undefined,
      direccion: direccion || undefined,
      telefono: telefono.length ? telefono : undefined,
      email: email || undefined,
      puntosInteres: puntosInteres.length ? puntosInteres : undefined
  };

  await modificarHotel(hotelSeleccionado, data);
  console.log("Hotel modificado exitsamente.");
}

// (9)
async function seleccionarHotelYModificarHabitacion() {
  try {
    
    const { hotelSeleccionado } = await seleccionarHotel();
    const hotel = await obtenerHotelPorId(hotelSeleccionado);
    if (!hotel) {
      return;
    }

    const { habitacionSeleccionada } = await seleccionarHabitacion(hotel);

    if (!habitacionSeleccionada) {
      return;
    }

    console.log("IMPORTANTE: Dejar vacio el campo para no modificarlo\n");

    const nombre = readlineSync.question("Nombre habitacion: ");
    const tipo = readlineSync.question("Tipo: ");
    const capacidad = readlineSync.question("Capacidad: ");
    const precio_base = readlineSync.question("Precio Base: ");
    const amenities = readlineSync.question("Amenities (separados por coma): ").split(",");

    const data = {
        nombre: nombre || undefined,
        tipo: tipo || undefined,
        capacidad: capacidad || undefined,
        precio_base: precio_base || undefined,
        amenities: amenities.length ? amenities : undefined
    };

    await modificarHabitacion(habitacionSeleccionada, data);
    console.log("Habitación modificada exitosamente.");
  } catch (error) {
    console.log("Error al modificar habitacion.", error);
  }
}

// (10)
async function nuevoHuesped() {
  const nombre = readlineSync.question("Nombre: ");
  const apellido = readlineSync.question("Apellido: ");
  const telefonos = readlineSync.question("Teléfonos (separados por comas): ").split(",").map(t => t.trim());
  const emails = readlineSync.question("Emails (separados por comas): ").split(",").map(e => e.trim());

  const calle = readlineSync.question("Calle: ");
  const numero = readlineSync.question("Número: ");
  const codigoPostal = readlineSync.question("Código Postal: ");
  const provincia = readlineSync.question("Provincia: ");
  const pais = readlineSync.question("País: ");

  const direccion = {
      calle,
      numero,
      codigoPostal,
      provincia,
      pais
  };

  const huespedData = { nombre, apellido, telefonos, emails, direccion };

  return await agregarHuesped(huespedData);
}
// (11)
async function nuevaReserva() {
  try {
    const { hotelSeleccionado } = await seleccionarHotel();
    const hotel = await obtenerHotelPorId(hotelSeleccionado);
    if (!hotel) {
      return;
    }

    const { habitacionSeleccionada } = await seleccionarHabitacion(hotel);

    if (!habitacionSeleccionada) {
      return;
    }

    console.log("1. Agregar Huesped");
    console.log("2. Buscar Huesped");
    const opcion = readlineSync.question("Selecciona una opción: ");
    let huesped = null;
    switch (opcion) {
      case "1":
        huesped = (await nuevoHuesped())._id;
        break;
      case "2":
        huesped = await seleccionarHuesped();
        break;
    }

    const codigo = crearCodigoReserva();
    let fecha_inicio, fecha_fin;
    let fechaValida = false;
    while(!fechaValida) {
      fecha_inicio = readlineSync.question("Fecha Inicio (yyyy-MM-dd): ");
      fecha_fin = readlineSync.question("Fecha Fin (yyyy-MM-dd): ");
      fechaValida = await validarDisponibilidad(habitacionSeleccionada, fecha_inicio, fecha_fin);
    }
    
    const precio = readlineSync.question("Precio: ");
    const habitacion = habitacionSeleccionada;
    const reserva = {fecha_inicio, fecha_fin, precio, habitacion, huesped, codigo};
    await agregarReserva(reserva);

  } catch (error) {
    console.log("Error al crear reserva", error);
  }
}


// (12)
async function seleccionarYBuscarHuesped() {
  try {
    const huespedSeleccionado  = await seleccionarHuesped();
    const huesped = await obtenerHuespedPorId(huespedSeleccionado)
    const huespedObj = huesped.toObject();

    const camposParaMostrar = [
      "nombre", "apellido", "telefonos", "emails", 
      "direccion.calle", "direccion.numero", "direccion.codigoPostal", 
      "direccion.provincia", "direccion.pais"
    ];

    console.log(`\n=== Huesped ${huesped.nombre} encontrado!===`);
    console.log("=== Información seleccionada: ===");

    // Mostrar los campos específicos
    camposParaMostrar.forEach(campo => {
      const partes = campo.split('.'); // Divide el campo en partes, por ejemplo "direccion.calle"
      let valor = huespedObj;

      // Navega por el objeto para obtener el valor de las propiedades anidadas
      partes.forEach(p => {
        if (valor && valor[p] !== undefined) {
          valor = valor[p];
        }
      });

      if (valor !== undefined) {
        // Procesa el nombre del campo para quitar la parte "direccion."
        const nombreCampo = partes.length > 1 ? partes[1] : partes[0]; // Obtiene la última parte (ej. "calle", "numero")
        console.log(`${capitalize(nombreCampo)}: ${valor}`);
      }
    });

  } catch (err) {
    console.error("Error al buscar el huesped:", err);
  }
}

//privates
async function seleccionarHotel() {
  const hoteles = await obtenerTodosLosHoteles();
  
    if (hoteles.length == 0) {
      console.log("No hay hoteles");
      return { hotelSeleccionado : null };
    }

    const opcionesHoteles = hoteles.map(hotel => ({
      name: hotel.nombre,
      value: hotel._id.toString() 
    }));

    return await inquirer.prompt([
      {
        type: 'list',
        name: 'hotelSeleccionado',
        message: 'Selecciona el hotel:',
        choices: opcionesHoteles
      }
    ]);
}

async function seleccionarHabitacion(hotel) {
    const habitaciones = hotel.habitaciones;
  
    if (habitaciones.length == 0) {
      console.log("No hay habitaciones");
      return { habitacionSeleccionada: null };
    }

    const opcionesHabitaciones = habitaciones.map(habitacion => ({
      name: habitacion.nombre,
      value: habitacion._id.toString() 
    }));

    return await inquirer.prompt([
      {
        type: 'list',
        name: 'habitacionSeleccionada',
        message: 'Selecciona una habitacion del hotel "' + hotel.nombre + '":',
        choices: opcionesHabitaciones
      }
    ]);
}

async function seleccionarHuesped() {
  const huespedes = await obtenerTodosLosHuespedes();
  
    if (huespedes.length == 0) {
      console.log("No hay Huespedes");
      return { huespedSeleccionado : null };
    }

    const opciones = huespedes.map(h => ({
      name: h.nombre + " " + h.apellido,
      value: h._id.toString() 
    }));

    let { huespedSeleccionado} = await inquirer.prompt([
      {
        type: 'list',
        name: 'huespedSeleccionado',
        message: 'Selecciona el huesped:',
        choices: opciones
      }
    ]);


    return huespedSeleccionado;
}

async function buscarAmenitiesPorHabitacion(){
  const { hotelSeleccionado } = await seleccionarHotel();
  const hotel = await obtenerHotelPorId(hotelSeleccionado);
  if (!hotel) {
    return;
  }

  const { habitacionSeleccionada } = await seleccionarHabitacion(hotel);

  if (!habitacionSeleccionada) {
    return;
  }

  const habitacion = await obtenerHabitacionPorId(habitacionSeleccionada);

  console.log(`\nAmenities de la habitación ${habitacion.nombre}: ${habitacion.amenities.join(", ")}`);
}

// 15
async function buscarHabitacionesDisponiblesPorFecha() {
  const fecha_inicio = readlineSync.question("Fecha Inicio (yyyy-MM-dd): ");
  const fecha_fin = readlineSync.question("Fecha Fin (yyyy-MM-dd): ");
  await buscarHabitacionPorFechas(fecha_inicio, fecha_inicio);
}

async function buscarReserva() {
    const { hotelSeleccionado } = await seleccionarHotel();
  
    let fechaValida = null;

    while(fechaValida == null) {
      let fechaInput = readlineSync.question("Ingrese una Fecha valida (yyyy-MM-dd): ");
      if (!fechaInput || isNaN(new Date(fechaInput).getTime())) {
        console.log('Fecha no valida');
      } else {
        fechaValida = fechaInput
      }
    }
    
    let reservas = await buscarReservaPorFecha(fechaValida, hotelSeleccionado);

    if (reservas.length === 0) {
      console.log(`No se encontraron reservas para la fecha ${fechaValida}.`);
      return;
    } else {
      console.log('--------------------------'); // Separador entre documentos
      
      reservas.forEach(res => {
        console.log(`Reserva - Codigo: ${res.codigo}`);
        console.log(`Reserva - Fecha de inicio: ${moment(res.fecha_inicio).format('DD/MM/YYYY')}`);
        console.log(`Reserva - Fecha de fin: ${moment(res.fecha_fin).format('DD/MM/YYYY')}`);
        console.log(`Reserva - Precio: $${res.precio}`);
        console.log(`Hotel - Nombre: ${res.infoHotel.nombre}`);
        console.log(`Habitacion - Nombre: ${res.infoHabitacion.nombre}`);
        console.log(`Habitacion - Tipo: ${res.infoHabitacion.tipo}`);
        console.log(`Habitacion - Capacidad: ${res.infoHabitacion.capacidad}`);
        console.log(`Habitacion - Precio base: $${res.infoHabitacion.precio_base}`);
        console.log(`Habitacion - Amenities: ${res.infoHabitacion.amenities.join(", ")}`);
        console.log('--------------------------'); // Separador entre documentos
      });
    }
}



function pending(){
    console.log("Pendiente");
}