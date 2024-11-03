export function crearCodigoReserva() {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigoReserva = '';

    for (let i = 0; i < 6; i++) {
        const indiceAleatorio = Math.floor(Math.random() * caracteres.length);
        codigoReserva += caracteres[indiceAleatorio];
    }

    return codigoReserva;
}
