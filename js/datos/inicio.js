import { obtenerSupabase } from "../config/supabase.js";

export async function cargarDatosInicio(claves) {
    const cliente = obtenerSupabase();
    const [bloques, contacto] = await Promise.all([
        cliente.from("contenido_sitio").select("clave, texto, imagen_ruta").in("clave", claves),
        cliente.from("datos_contacto").select("telefono, correo, horarios").eq("id", 1).maybeSingle(),
    ]);

    if (bloques.error) throw bloques.error;
    if (contacto.error) throw contacto.error;

    return {
        bloques: new Map(bloques.data.map((bloque) => [bloque.clave, bloque])),
        contacto: contacto.data,
    };
}

export function obtenerUrlImagen(ruta) {
    return obtenerSupabase().storage.from("imagenologia").getPublicUrl(ruta).data.publicUrl;
}
