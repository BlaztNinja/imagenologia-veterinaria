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
