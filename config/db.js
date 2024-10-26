import mongoose from "mongoose";
import neo4j from "neo4j-driver";

const mongoConnection = mongoose.connect("mongodb://localhost:27017/tareas_db", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("Conectado a MongoDB"))
.catch((err) => console.error("Error conectando a MongoDB:", err));

const neo4jDriver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "macbookpro")
);
const neo4jSession = neo4jDriver.session();

export { mongoConnection, neo4jDriver, neo4jSession };
