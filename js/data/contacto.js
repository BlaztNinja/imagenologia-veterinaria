import { supabase } from "../config/supabase.js";

const CAMPOS = "id, telefono, correo, horarios";

export async function obtenerContacto() {
    const { data, error } = await supabase
        .from("datos_contacto")
        .select(CAMPOS)
        .eq("id", 1)
        .maybeSingle();

    if (error) {
        throw new Error("No se pudieron cargar los datos de contacto.");
    }

    return data;
}

function validarTelefono(valor) {
    const telefono = String(valor ?? "").trim();
    const digitos = telefono.replace(/\D/g, "");

    if (
        !/^[+0-9 ()-]{7,25}$/.test(telefono)
        || digitos.length < 7
        || digitos.length > 15
    ) {
        throw new Error(
            "Ingresá un teléfono válido con entre 7 y 15 dígitos."
        );
    }

    return telefono;
}

function validarCorreo(valor) {
    const correo = String(valor ?? "").trim();

    if (
        correo.length > 254
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
    ) {
        throw new Error("Ingresá un correo electrónico válido.");
    }

    return correo;
}

function validarHorarios(valor) {
    const horarios = String(valor ?? "")
        .split("\n")
        .map((horario) => horario.trim())
        .filter(Boolean);

    if (horarios.length === 0) {
        throw new Error("Ingresá al menos un horario de atención.");
    }

    if (horarios.some((horario) => horario.length > 150)) {
        throw new Error("Cada horario debe tener como máximo 150 caracteres.");
    }

    return horarios;
}

function prepararCambios(valores) {
    return {
        telefono: validarTelefono(valores.telefono),
        correo: validarCorreo(valores.correo),
        horarios: validarHorarios(valores.horarios)
    };
}

export async function actualizarContacto(valores) {
    const cambios = prepararCambios(valores);

    const { data, error } = await supabase
        .from("datos_contacto")
        .update(cambios)
        .eq("id", 1)
        .select(CAMPOS)
        .maybeSingle();

    if (error) {
        throw new Error(
            "No se pudieron guardar los datos de contacto. Intentá nuevamente."
        );
    }

    if (!data) {
        throw new Error(
            "No se pudo confirmar el guardado. Verificá tu sesión y recargá los datos."
        );
    }

    return data;
}
