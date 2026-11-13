import { obtenerSupabase } from "../config/supabase.js";

export async function listarServiciosPublicos() {
    const { data, error } = await obtenerSupabase()
        .from("servicios")
        .select("id, nombre, descripcion, detalles, precio")
        .eq("activo", true)
        .order("orden")
        .order("nombre");

    if (error) {
        throw error;
    }

    return data;
}

export async function listarRequisitosPublicos() {
    const { data, error } = await obtenerSupabase().from("requisitos_servicio")
        .select("id, servicio_id, texto, orden, servicios!inner(nombre, activo)")
        .eq("servicios.activo", true).order("orden").order("id");
    if (error) throw error;
    return data ?? [];
}
