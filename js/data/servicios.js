import { supabase } from "../config/supabase.js";

const TABLAS = {
    servicios: "servicios",
    requisitos: "requisitos_servicio"
};

function obtenerTabla(tipo) {
    const tabla = TABLAS[tipo];

    if (!tabla) {
        throw new Error("Tipo de contenido inválido.");
    }

    return tabla;
}

export async function listarContenido(tipo) {
    const campos = tipo === "servicios"
        ? "*"
        : "id, servicio_id, texto, orden, servicios(nombre)";
    const { data, error } = await supabase
        .from(obtenerTabla(tipo))
        .select(campos)
        .order("orden")
        .order("id");

    if (error) {
        console.error("Error al cargar contenido", error);
        throw new Error("No se pudo cargar el contenido. Intentá nuevamente.");
    }

    if (tipo === "requisitos") {
        return data.map((requisito) => ({
            ...requisito,
            nombre: requisito.servicios?.nombre ?? "Servicio",
            descripcion: requisito.texto
        }));
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
    if (tipo === "requisitos") {
        return {
            texto: validarTexto(valores.descripcion, "Las indicaciones", 3000)
        };
    }

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

    let consulta = supabase
        .from(tabla)
        .update(cambios)
        .eq("id", registro.id);

    // Compara los valores leídos para detectar ediciones de otra sesión.
    if (tipo === "requisitos") {
        consulta = consulta.eq("texto", registro.texto)
            .eq("servicio_id", registro.servicio_id);
    } else {
        consulta = consulta.eq("nombre", registro.nombre)
            .eq("descripcion", registro.descripcion)
            .eq("precio", registro.precio)
            .eq("detalles", `{${registro.detalles.map((detalle) => JSON.stringify(detalle)).join(",")}}`);
    }

    const { data, error } = await consulta.select().maybeSingle();

    if (error) {
        console.error("Error al guardar contenido", error);
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