import { obtenerSupabase } from "../config/supabase.js";

export async function iniciarSesion(correo, contrasena) {
    const { data, error } = await obtenerSupabase().auth.signInWithPassword({
        email: correo,
        password: contrasena,
    });

    if (error) throw error;
    return data.user.id;
}

export async function obtenerRol(usuarioId) {
    const { data, error } = await obtenerSupabase()
        .from("perfiles")
        .select("rol")
        .eq("id", usuarioId)
        .single();

    if (error) throw error;
    return data.rol;
}

export async function obtenerSesion() {
    const { data, error } = await obtenerSupabase().auth.getSession();
    if (error) throw error;
    return data.session;
}

export async function cerrarSesion() {
    const { error } = await obtenerSupabase().auth.signOut({ scope: "local" });
    if (error) throw error;
}
