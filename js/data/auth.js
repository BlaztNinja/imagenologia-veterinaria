import { supabase } from "../config/supabase.js";

function traducirErrorRegistro(error) {
    const mensaje = String(error?.message ?? "").toLowerCase();
    const codigo = String(error?.code ?? "");

    if (
        codigo === "user_already_exists"
        || codigo === "email_exists"
        || mensaje.includes("already registered")
        || mensaje.includes("already exists")
    ) {
        return "Ese correo ya está registrado. Inicia sesión.";
    }

    if (
        codigo === "weak_password"
        || mensaje.includes("password should be")
        || mensaje.includes("weak password")
        || mensaje.includes("password is too short")
    ) {
        return "La contraseña es demasiado débil. Usa al menos 6 caracteres.";
    }

    if (
        codigo === "email_address_invalid"
        || mensaje.includes("invalid email")
        || (mensaje.includes("email address") && mensaje.includes("invalid"))
    ) {
        return "Ingresa un correo electrónico válido.";
    }

    if (
        codigo === "over_email_send_rate_limit"
        || mensaje.includes("rate limit")
        || mensaje.includes("too many requests")
    ) {
        return "Demasiados intentos. Espera unos minutos e intenta de nuevo.";
    }

    if (
        codigo === "signup_disabled"
        || mensaje.includes("signups not allowed")
        || mensaje.includes("signup is disabled")
    ) {
        return "El registro está deshabilitado. Contacta al administrador.";
    }

    return "No se pudo crear la cuenta. Inténtalo de nuevo.";
}

export async function registrarUsuario(email, password) {
    const correo = String(email ?? "").trim();
    const contrasena = String(password ?? "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        throw new Error("Ingresa un correo electrónico válido.");
    }

    if (contrasena.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres.");
    }

    const { data, error } = await supabase.auth.signUp({
        email: correo,
        password: contrasena
    });

    if (error) {
        throw new Error(traducirErrorRegistro(error));
    }

    if (
        data.user
        && Array.isArray(data.user.identities)
        && data.user.identities.length === 0
    ) {
        throw new Error("Ese correo ya está registrado. Inicia sesión.");
    }

    return data;
}

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
        const errorPermiso = new Error(
            "Esta cuenta no está autorizada para usar el backoffice."
        );
        errorPermiso.code = "sin_permiso";
        throw errorPermiso;
    }

    return userData.user;
}

export function observarSesion(callback) {
    return supabase.auth.onAuthStateChange(callback);
}