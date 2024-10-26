import readlineSync from 'readline-sync';
import { agregarHotel } from './services/hotelService.js';
import { mongoConnection } from './config/db.js';

async function main() {
    let salir = false;
    while (!salir) {
      console.log("\n=== Menú ===");
      console.log("1. Agregar Hotel (a mongo y neo)");
      console.log("2. Agregar Habitacion");
      console.log("3. Agregar POI");
      console.log("0. Salir");
      const opcion = readlineSync.question("Selecciona una opción: ");
  
      switch (opcion) {
        case "1":
          await nuevoHotel();
          break;
        case "2":
          pending();
          break;
        case "3":
            pending();
          break;
        case "4":
          salir = true;
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
    const direccion = readlineSync.question("Dirección: ");
    const telefono = readlineSync.question("Teléfono: ").split(",");
    const email = readlineSync.question("Email: ");
    let puntosInteres = readlineSync.question("Puntos de interés (separados por comas): ").split(",");
    const hotelData = { nombre, direccion, telefono, email, puntosInteres };
  
    const hotel = await agregarHotel(hotelData);
    
    console.log("Hotel agregado exitosamente");
  }
  
function pending(){
    console.log("Pendiente");
}