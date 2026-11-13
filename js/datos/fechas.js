export function fechaActual(ahora = new Date()) {
    const partes = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/El_Salvador", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(ahora);
    const valor = (tipo) => partes.find((parte) => parte.type === tipo).value;
    return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

export function validarFechaCita(valor, ahora = new Date()) {
    const fecha = String(valor ?? "").trim();
    if (!fecha) return null;
    const dia = new Date(`${fecha}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(dia.getTime())
        || dia.toISOString().slice(0, 10) !== fecha) {
        throw new Error("La fecha de la siguiente cita no es válida.");
    }
    if (fecha < fechaActual(ahora)) {
        throw new Error("La siguiente cita debe ser hoy o una fecha futura.");
    }
    return fecha;
}
