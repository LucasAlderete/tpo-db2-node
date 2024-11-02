import readlineSync from 'readline-sync';
import inquirer from 'inquirer';
import { agregarHabitacion, agregarHotel, obtenerHotel, obtenerPoiPorHotel, obtenerHotelCercanoAPoiNeo, obtenerTodosLosHoteles, eliminarHotel } from './services/hotelService.js';
import { obtenerTodosPoi } from './services/poiService.js';
import { capitalize } from './utils/mayus.js';
import { mongoConnection, cerrarConexiones } from './config/db.js';

async function main() {
    let salir = false;
    while (!salir) {
      console.log("\n=== Menú ===");
      console.log("1. Agregar Hotel (a mongo y neo)");
      console.log("2. Agregar Habitacion");
      console.log("3. Buscar hoteles cerca de un punto de interes");
      console.log("4. Buscar información de un hotel");
      console.log("5. Buscar puntos de interés cercanos a un hotel");
      console.log("6. Eliminar Hotel");
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
        default:
          console.log("Opción no válida. Inténtalo de nuevo.");
          break;
      }
    }
    
    await cerrarConexiones();
  }
  
main().catch(console.error);

//Privates
async function nuevoHotel() {
    await mongoConnection;
  
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

async function nuevaHabitacion() {
    await mongoConnection;
  
    const nombreHotel = readlineSync.question("Nombre del hotel: ");

    const hotel = await obtenerHotel(nombreHotel);

    if (!hotel) {
        console.log("No existe un hotel con ese nombre.")
        await nuevaHabitacion();
    }

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
async function nuevoPOI() {
    await mongoConnection;
  
    const nombrePoi = readlineSync.question("Nombre del POI: ");

    const poi = await obtenerPoi(nombrePoi);

    if (poi) {
        console.log(`Ya existe el punto de interes: ${nombreHotel}`);
        await nuevoPOI();
    }

    await agregarHabitacion(habitacionData);
}

async function buscarHotel() {
  const nombreHotel = readlineSync.question("Indique el nombre del hotel: ")

  const hotel = await obtenerHotel(nombreHotel);
  if(!hotel) {
    console.log(`\n=== No se encontra registrado un hotel con nombre ${nombreHotel} ===`);
    return;
  }

  const camposParaMostrar = ["nombre", "direccion", "telefono", "email"];

  const hotelObj = hotel.toObject();
  const hotelPropiedades = Object.keys(hotelObj);

  console.log(`\n=== Hotel ${nombreHotel} encontrado!===`);
  console.log("=== Información: ===");

  hotelPropiedades.forEach(propiedad => {
    if (camposParaMostrar.includes(propiedad)) {
      console.log(`${capitalize(propiedad)}: ${hotelObj[propiedad]}`);
    }
  });
}

async function buscarPoiPorHotel() {
  const nombreHotel = readlineSync.question("Indique el nombre del hotel: ")
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

async function seleccionarYEliminarHotel() {
    try {
      const { hotelSeleccionado } = await seleccionarHotel();

      await eliminarHotel(hotelSeleccionado)
  
    } catch (err) {
      console.error("Error al eliminar el hotel:", err);
    }
}

async function seleccionarHotel() {
  const hoteles = await obtenerTodosLosHoteles();
  
    if (hoteles.length == 0) {
      console.log("No hay hoteles");
      return;
    }

    const opcionesHoteles = hoteles.map(hotel => ({
      name: hotel.nombre,
      value: hotel._id.toString() 
    }));

    return await inquirer.prompt([
      {
        type: 'list',
        name: 'hotelSeleccionado',
        message: 'Selecciona el hotel que deseas eliminar:',
        choices: opcionesHoteles
      }
    ]);
}
  
function pending(){
    console.log("Pendiente");
}