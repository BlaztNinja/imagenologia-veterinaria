import { supabase } from "../config/supabase.js";

export async function iniciarSesion(email, password) {
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        throw new Error("No se pudo iniciar sesión. Revisá tus credenciales.");
    }
}

export async function cerrarSesion() {
    const { error } = await supabase.auth.signOut({ scope: "local" });

    if (error) {
        throw new Error("No se pudo cerrar la sesión. Intentá nuevamente.");
    }
}

export async function obtenerPersonal() {
    const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

    if (sessionError) {
        throw new Error("No se pudo consultar la sesión.");
    }

    if (!sessionData.session) {
        return null;
    }

    const { data: userData, error: userError } =
        await supabase.auth.getUser();

    if (userError) {
        throw new Error("La sesión no es válida. Volvé a iniciar sesión.");
    }

    const { data, error } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", userData.user.id)
        .maybeSingle();

    if (error) {
        throw new Error("No se pudieron comprobar los permisos.");
    }

    if (!data || data.rol !== "admin") {
        throw new Error("Esta cuenta no está autorizada para usar el backoffice.");
    }

    return userData.user;
}

export function observarSesion(callback) {
    return supabase.auth.onAuthStateChange(callback);
}