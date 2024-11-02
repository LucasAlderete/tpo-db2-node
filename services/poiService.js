import { neo4jSession } from '../config/db.js';

export async function obtenerTodosPoi() {
    return await neo4jSession.run(`MATCH (p:POI) RETURN p.nombre AS nombre`);
}

