import { supabase } from "../config/supabase.js";

const TABLAS = {
    servicios: "servicios",
    requisitos: "requisitos_paciente"
};

function obtenerTabla(tipo) {
    const tabla = TABLAS[tipo];

    if (!tabla) {
        throw new Error("Tipo de contenido inválido.");
    }

    return tabla;
}

export async function listarContenido(tipo) {
    const { data, error } = await supabase
        .from(obtenerTabla(tipo))
        .select("*")
        .order("id");

    if (error) {
        throw new Error("No se pudo cargar el contenido. Intentá nuevamente.");
    }

    return data;
}

function validarTexto(valor, nombre, limite) {
    const texto = String(valor ?? "").trim();

    if (!texto || texto.length > limite) {
        throw new Error(`${nombre} debe tener entre 1 y ${limite} caracteres.`);
    }

    return texto;
}

function prepararCambios(tipo, valores) {
    const cambios = {
        nombre: validarTexto(valores.nombre, "El nombre", 150),
        descripcion: validarTexto(valores.descripcion, "La descripción", 3000)
    };

    if (tipo === "servicios") {
        const precioTexto = String(valores.precio).trim();

        if (!/^\d{1,8}(\.\d{1,2})?$/.test(precioTexto)) {
            throw new Error("Ingresá un precio válido con hasta dos decimales.");
        }

        cambios.precio = Number(precioTexto);
        cambios.detalles = String(valores.detalles ?? "")
            .split("\n")
            .map((detalle) => detalle.trim())
            .filter(Boolean);
    }

    return cambios;
}

export async function actualizarContenido(tipo, registro, valores) {
    const tabla = obtenerTabla(tipo);
    const cambios = prepararCambios(tipo, valores);

    const { data, error } = await supabase
        .from(tabla)
        .update({
            ...cambios,
            version: registro.version + 1
        })
        .eq("id", registro.id)
        .eq("version", registro.version)
        .select()
        .maybeSingle();

    if (error) {
        throw new Error(
            "No se pudo confirmar el guardado. Revisá la conexión y recargá la lista antes de reintentar."
        );
    }

    if (!data) {
        throw new Error(
            "El registro cambió o ya no tenés permiso para editarlo. Cancelá y recargá la lista."
        );
    }

    return data;
}