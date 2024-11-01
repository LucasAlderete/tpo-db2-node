import readlineSync from 'readline-sync';
import { agregarHabitacion, agregarHotel, obtenerHotel, obtenerPoiPorHotel } from './services/hotelService.js';
import { capitalize } from './utils/mayus.js';
import { mongoConnection } from './config/db.js';

async function main() {
    let salir = false;
    while (!salir) {
      console.log("\n=== Menú ===");
      console.log("1. Agregar Hotel (a mongo y neo)");
      console.log("2. Agregar Habitacion");
      console.log("3. Agregar POI");
      console.log("4. Buscar información de un hotel");
      console.log("5. Buscar puntos de interés cercanos a un hotel");
      console.log("6. Salir");
      const opcion = readlineSync.question("Selecciona una opción: ");
  
      switch (opcion) {
        case "1":
          await nuevoHotel();
          break;
        case "2":
          await nuevaHabitacion();
          break;
        case "3":
            pending();
          break;
        case "4":
          await buscarHotel();
          break;
        case "5":
          await buscarPoiPorHotel();
          break;
        case "6":
          pending();
          break;
        default:
          console.log("Opción no válida. Inténtalo de nuevo.");
          break;
      }
    }
  
    // Cerrar conexiones
    mongoose.connection.close();
    await neo4jSession.close();
    await neo4jDriver.close();
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
  
    const hotel = await agregarHotel(hotelData);
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
  
function pending(){
    console.log("Pendiente");
}