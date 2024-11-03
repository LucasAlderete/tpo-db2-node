import readlineSync from 'readline-sync';
import inquirer from 'inquirer';
import { mongoConnection, cerrarConexiones } from './config/db.js';
import { capitalize } from './utils/mayus.js';
import { agregarHabitacion, agregarHotel, obtenerHotel, obtenerPoiPorHotel, obtenerHotelCercanoAPoiNeo, obtenerTodosLosHoteles, eliminarHotel, obtenerHotelPorId } from './services/hotelService.js';
import { obtenerTodosPoi } from './services/poiService.js';
import { eliminarHabitacion, obtenerHabitacionPorId } from './services/habitacionService.js';
import { agregarHuesped, obtenerHuespedPorId, obtenerTodosLosHuespedes } from './services/huespedService.js'
import { agregarReserva, validarDisponibilidad } from './services/reservaService.js';
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
      console.log("0. Salir");
      const opcion = readlineSync.question("Selecciona una opción: ");
  
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
          pending(); //Modificar hotel
          break;
        case "9":
          pending(); //Modificar habitacion
          break;
        case "10":
          await nuevoHuesped();
          break;
        case "11":
          await nuevaReserva();
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
      fecha_inicio = readlineSync.question("Fecha Inicio: ");
      fecha_fin = readlineSync.question("Fecha Fin: ");
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

function pending(){
    console.log("Pendiente");
}