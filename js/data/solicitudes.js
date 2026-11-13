import { supabase } from "../config/supabase.js";
import { validarSolicitud } from "./procesar-solicitudes.js";

function envolver(error, respaldo, permiso) {
    const codigo = error?.code ?? "";
    const texto = String(error?.message ?? "").toLowerCase();
    let mensaje = respaldo;

    if (
        texto.includes("fetch")
        || texto.includes("network")
        || texto.includes("load failed")
    ) {
        mensaje = "No hay conexión con la base de datos.";
    } else if (codigo === "23514" || codigo === "23503" || codigo === "23502") {
        mensaje = "Hay un dato que no cumple las reglas. Revisa el servicio, el teléfono y el correo.";
    } else if (
        codigo === "PGRST204"
        || codigo === "42703"
        || texto.includes("proxima_cita")
        || texto.includes("schema cache")
    ) {
        mensaje = "Falta actualizar la base para guardar las notas, la fecha y eliminar clientes.";
    } else if (
        codigo === "42501"
        || texto.includes("permission denied")
        || texto.includes("row-level security")
    ) {
        mensaje = permiso || respaldo;
    }

    const envuelto = new Error(mensaje);
    envuelto.esSolicitud = true;
    envuelto.codigo = codigo;
    envuelto.detalle = texto;
    return envuelto;
}

function faltaColumna(error) {
    return error?.codigo === "PGRST204"
        || error?.codigo === "42703"
        || String(error?.detalle ?? "").includes("proxima_cita")
        || String(error?.detalle ?? "").includes("schema cache");
}

function normalizarNotas(valor) {
    const notas = String(valor ?? "").trim();

    if (notas.length > 2000) {
        throw new Error("Las notas pueden tener hasta 2000 caracteres.");
    }

    return notas;
}

function normalizarFecha(valor) {
    const fecha = String(valor ?? "").trim();

    if (!fecha) return null;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        throw new Error("La fecha de la siguiente cita no es válida.");
    }

    return fecha;
}

function normalizarEstado(valor) {
    if (valor !== "nueva" && valor !== "atendida") {
        throw new Error("El estado indicado no es válido.");
    }

    return valor;
}

async function ejecutar(promesa, respaldo, permiso) {
    try {
        const resultado = await promesa;

        if (resultado.error) {
            throw envolver(resultado.error, respaldo, permiso);
        }

        return resultado;
    } catch (error) {
        throw error?.esSolicitud ? error : envolver(error, respaldo, permiso);
    }
}

export async function crearSolicitud(valores) {
    const solicitud = validarSolicitud(valores);
    const { data: { user }, error: errorUsuario } = await supabase.auth.getUser();

    if (errorUsuario || !user) {
        throw new Error("Inicia sesión o crea una cuenta para guardar la solicitud.");
    }

    // return=minimal evita que la base intente leer la fila recién creada.
    // Esa lectura solo la tiene el admin, y hacía fallar el envío.
    await ejecutar(
        supabase.from("solicitudes").insert({
            servicio_id: solicitud.servicio_id,
            nombre: solicitud.nombre,
            telefono: solicitud.telefono,
            correo: solicitud.correo,
            motivo: solicitud.motivo
        }).setHeader("Prefer", "return=minimal"),
        "No se pudo registrar la solicitud. Inténtalo de nuevo.",
        "Inicia sesión o crea una cuenta para guardar la solicitud."
    );
}

const CAMPOS_SOLICITUD = "id, nombre, telefono, correo, motivo, estado, creada_en, servicio_id, notas, proxima_cita";
const CAMPOS_SOLICITUD_BASE = "id, nombre, telefono, correo, motivo, estado, creada_en, servicio_id";

async function leerSolicitudes() {
    const pedir = (campos) => ejecutar(
        supabase.from("solicitudes").select(campos).order("creada_en", { ascending: false }),
        "No se pudo cargar el historial. Intentá nuevamente."
    );

    try {
        return await pedir(CAMPOS_SOLICITUD);
    } catch (error) {
        if (!faltaColumna(error)) throw error;
        return pedir(CAMPOS_SOLICITUD_BASE);
    }
}

export async function listarSolicitudes() {
    const [solicitudes, servicios] = await Promise.all([
        leerSolicitudes(),
        ejecutar(
            supabase.from("servicios").select("id, nombre"),
            "No se pudieron cargar los nombres de los servicios. Intentá nuevamente."
        )
    ]);

    const nombres = new Map(
        (servicios.data ?? []).map((servicio) => [servicio.id, servicio.nombre])
    );

    return (solicitudes.data ?? []).map((fila) => ({
        id: fila.id,
        nombre: fila.nombre,
        telefono: fila.telefono,
        correo: fila.correo,
        motivo: fila.motivo,
        estado: fila.estado,
        notas: fila.notas ?? "",
        proxima_cita: fila.proxima_cita ?? "",
        creada_en: fila.creada_en,
        servicio_id: fila.servicio_id,
        servicioNombre: nombres.get(fila.servicio_id) ?? "Servicio no disponible"
    }));
}

export async function cambiarEstadoSolicitud(id, estado) {
    const estadoValido = normalizarEstado(estado);

    const { data } = await ejecutar(
        supabase
            .from("solicitudes")
            .update({ estado: estadoValido })
            .eq("id", id)
            .select("id, estado")
            .maybeSingle(),
        "No se pudo actualizar el estado. Intentá nuevamente."
    );

    if (!data) {
        throw new Error(
            "No se pudo confirmar el cambio. Recargá la lista."
        );
    }

    return data;
}

export async function actualizarSolicitud(id, valores) {
    const solicitud = validarSolicitud(valores);
    const estado = normalizarEstado(valores.estado);
    const notas = normalizarNotas(valores.notas);
    const proximaCita = normalizarFecha(valores.proximaCita);

    const { data } = await ejecutar(
        supabase
            .from("solicitudes")
            .update({ estado })
            .eq("id", id)
            .select("id, estado")
            .maybeSingle(),
        "No se pudo guardar el cliente. Intentá nuevamente."
    );

    if (!data) {
        throw new Error("No se pudo confirmar el guardado. Recargá la lista.");
    }

    let datosPendientes = false;

    try {
        const perfil = await ejecutar(
            supabase
                .from("solicitudes")
                .update({
                    nombre: solicitud.nombre,
                    telefono: solicitud.telefono,
                    correo: solicitud.correo,
                    motivo: solicitud.motivo,
                    servicio_id: solicitud.servicio_id
                })
                .eq("id", id)
                .select("id")
                .maybeSingle(),
            "No se pudieron guardar los datos del cliente. Intentá nuevamente."
        );

        if (!perfil.data) {
            throw new Error("No se pudieron guardar los datos del cliente. Recargá la lista.");
        }
    } catch (error) {
        if (error?.codigo !== "42501") throw error;
        datosPendientes = true;
    }

    let fichaPendiente = false;

    try {
        const extra = await ejecutar(
            supabase
                .from("solicitudes")
                .update({ notas, proxima_cita: proximaCita })
                .eq("id", id)
                .select("id")
                .maybeSingle(),
            "No se pudieron guardar las notas ni la fecha. Intentá nuevamente."
        );

        if (!extra.data) {
            throw new Error("No se pudieron guardar las notas ni la fecha. Recargá la lista.");
        }
    } catch (error) {
        if (!faltaColumna(error) && error?.codigo !== "42501") throw error;
        fichaPendiente = true;
    }

    return { ...data, fichaPendiente, datosPendientes };
}

export async function eliminarSolicitud(id) {
    if (!id) {
        throw new Error("No se indicó el cliente.");
    }

    const { data } = await ejecutar(
        supabase
            .from("solicitudes")
            .delete()
            .eq("id", id)
            .select("id")
            .maybeSingle(),
        "No se pudo eliminar el cliente. Intentá nuevamente."
    );

    if (!data) {
        throw new Error("No se pudo confirmar la eliminación. Recargá la lista.");
    }

    return data;
}
