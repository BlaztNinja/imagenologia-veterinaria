// Procesos del historial en el navegador: validar, filtrar, buscar, ordenar, agrupar e indicadores.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ESTADOS = new Set(["nueva", "atendida"]);

function errorCampo(campo, mensaje) {
    const error = new Error(mensaje);
    error.campo = campo;
    return error;
}

function normalizar(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase();
}

export function validarNombre(valor) {
    const nombre = String(valor ?? "").trim();

    if (nombre.length < 1 || nombre.length > 120) {
        throw errorCampo("nombre", "Ingresa un nombre de 1 a 120 caracteres.");
    }

    return nombre;
}

export function validarTelefono(valor) {
    const telefono = String(valor ?? "").trim();
    const digitos = telefono.replace(/\D/g, "");

    if (
        !/^[+0-9 ()-]{7,25}$/.test(telefono)
        || digitos.length < 7
        || digitos.length > 15
    ) {
        throw errorCampo(
            "telefono",
            "Ingresa un teléfono válido, de 7 a 15 dígitos. Puedes usar +, espacios y guiones."
        );
    }

    return telefono;
}

export function validarCorreo(valor) {
    const correo = String(valor ?? "").trim();

    if (correo.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        throw errorCampo("correo", "Ingresa un correo electrónico válido.");
    }

    return correo;
}

export function validarServicio(valor) {
    const servicioId = String(valor ?? "").trim();

    if (!UUID.test(servicioId)) {
        throw errorCampo("servicio", "Selecciona un servicio.");
    }

    return servicioId;
}

export function validarMotivo(valor) {
    const motivo = String(valor ?? "").trim();

    if (motivo.length < 1 || motivo.length > 2000) {
        throw errorCampo("motivo", "Cuéntanos el motivo en 2000 caracteres como máximo.");
    }

    return motivo;
}

export function validarSolicitud(valores) {
    return {
        nombre: validarNombre(valores.nombre),
        telefono: validarTelefono(valores.telefono),
        correo: validarCorreo(valores.correo),
        servicio_id: validarServicio(valores.servicio_id ?? valores.servicio),
        motivo: validarMotivo(valores.motivo)
    };
}

export function filtrarPorEstado(solicitudes, estado) {
    if (!ESTADOS.has(estado)) {
        return [...solicitudes];
    }

    return solicitudes.filter((solicitud) => solicitud.estado === estado);
}

export function buscarSolicitudes(solicitudes, texto) {
    const consulta = normalizar(texto);

    if (!consulta) {
        return [...solicitudes];
    }

    return solicitudes.filter((solicitud) => {
        const contenido = [
            solicitud.nombre,
            solicitud.telefono,
            solicitud.correo,
            solicitud.motivo,
            solicitud.servicioNombre
        ].map(normalizar).join(" ");

        return contenido.includes(consulta);
    });
}

export function ordenarSolicitudes(solicitudes, orden) {
    const direccion = orden === "antiguas" ? 1 : -1;

    return [...solicitudes].sort((primera, segunda) => {
        const diferencia = new Date(primera.creada_en) - new Date(segunda.creada_en);
        return direccion * diferencia;
    });
}

export function agruparPorCliente(solicitudes) {
    const grupos = new Map();

    solicitudes.forEach((solicitud) => {
        const clave = normalizar(solicitud.correo);
        let grupo = grupos.get(clave);

        if (!grupo) {
            grupo = {
                clave,
                nombre: solicitud.nombre,
                correo: solicitud.correo,
                telefono: solicitud.telefono,
                solicitudes: []
            };
            grupos.set(clave, grupo);
        }

        grupo.solicitudes.push(solicitud);
    });

    return [...grupos.values()];
}

export function calcularIndicadores(solicitudes) {
    const nuevas = solicitudes.filter((solicitud) => solicitud.estado === "nueva").length;
    const atendidas = solicitudes.filter((solicitud) => solicitud.estado === "atendida").length;
    const clientes = new Set(
        solicitudes.map((solicitud) => normalizar(solicitud.correo))
    ).size;

    return {
        total: solicitudes.length,
        nuevas,
        atendidas,
        clientes
    };
}
