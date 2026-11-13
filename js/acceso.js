import { iniciarSesion, obtenerRol } from "./datos/autenticacion.js";
import { registrarUsuario } from "./data/auth.js";

const formulario = document.querySelector("#formulario-acceso");
const boton = document.querySelector("#boton-acceso");
const estado = document.querySelector("#estado-acceso");
const titulo = document.querySelector("#titulo-acceso");
const ayuda = document.querySelector("#ayuda-acceso");
const modoLogin = document.querySelector("#modo-login");
const modoRegistro = document.querySelector("#modo-registro");
const correo = formulario.elements.correo;
const contrasena = formulario.elements.contrasena;
const verContrasena = document.querySelector("#ver-contrasena");

let modoAcceso = "login";
let procesando = false;
let redirigiendo = false;

function mostrarEstado(texto, error = false) {
    estado.classList.toggle("error", error);
    estado.setAttribute("role", error ? "alert" : "status");
    estado.textContent = texto;
}

function establecerModo(modo, enfocar = true) {
    modoAcceso = modo;
    const esRegistro = modo === "registro";

    modoLogin.setAttribute("aria-pressed", String(!esRegistro));
    modoRegistro.setAttribute("aria-pressed", String(esRegistro));

    titulo.textContent = esRegistro ? "Crear cuenta" : "Iniciar sesión";
    ayuda.textContent = esRegistro
        ? "Regístrate con tu correo. La cuenta se crea con rol de usuario; un administrador debe autorizarte para usar el backoffice."
        : "Ingresa con tu correo y contraseña.";
    boton.textContent = esRegistro ? "Crear cuenta" : "Iniciar sesión";
    document.title = esRegistro
        ? "Crear cuenta - Imagenología Veterinaria"
        : "Iniciar sesión - Imagenología Veterinaria";

    contrasena.autocomplete = esRegistro ? "new-password" : "current-password";
    if (esRegistro) {
        contrasena.setAttribute("minlength", "6");
    } else {
        contrasena.removeAttribute("minlength");
    }

    contrasena.value = "";
    ocultarContrasena();
    correo.removeAttribute("aria-invalid");
    contrasena.removeAttribute("aria-invalid");
    mostrarEstado("");

    if (enfocar) correo.focus();
}

const motivo = new URLSearchParams(window.location.search).get("sesion");
if (motivo === "cerrada") mostrarEstado("Sesión cerrada.");
if (motivo === "error") {
    mostrarEstado("No se pudo verificar el acceso. Intenta iniciar sesión nuevamente.", true);
}
if (motivo === "sin-permiso") {
    mostrarEstado("Tu cuenta no tiene permisos de administrador. Inicia sesión con una cuenta autorizada.", true);
}

function ocultarContrasena() {
    contrasena.type = "password";
    verContrasena.setAttribute("aria-pressed", "false");
    verContrasena.setAttribute("aria-label", "Mostrar contraseña");
}

verContrasena.addEventListener("click", () => {
    const visible = contrasena.type === "password";
    contrasena.type = visible ? "text" : "password";
    verContrasena.setAttribute("aria-pressed", String(visible));
    verContrasena.setAttribute("aria-label", visible ? "Ocultar contraseña" : "Mostrar contraseña");
    contrasena.focus();
});

modoLogin.addEventListener("click", () => {
    if (procesando || modoAcceso === "login") return;
    establecerModo("login");
});

modoRegistro.addEventListener("click", () => {
    if (procesando || modoAcceso === "registro") return;
    establecerModo("registro");
});

formulario.addEventListener("invalid", (evento) => {
    const campo = evento.target;
    campo.setAttribute("aria-invalid", "true");
    campo.setAttribute("aria-describedby", "estado-acceso");

    if (campo.validity.valueMissing) {
        mostrarEstado("Completa el correo y la contraseña.", true);
    } else if (campo.validity.tooShort) {
        mostrarEstado("La contraseña debe tener al menos 6 caracteres.", true);
    } else {
        mostrarEstado("Ingresa un correo electrónico válido.", true);
    }
}, true);

formulario.addEventListener("input", (evento) => {
    evento.target.removeAttribute("aria-invalid");
    evento.target.removeAttribute("aria-describedby");
    mostrarEstado("");
});

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (procesando) return;

    const datos = new FormData(formulario);
    const correoValor = String(datos.get("correo") ?? "").trim();
    const contrasenaValor = String(datos.get("contrasena") ?? "");
    const esRegistro = modoAcceso === "registro";

    if (!correoValor) {
        correo.setAttribute("aria-invalid", "true");
        correo.setAttribute("aria-describedby", "estado-acceso");
        mostrarEstado("Completa el correo electrónico.", true);
        correo.focus();
        return;
    }

    if (esRegistro && contrasenaValor.length < 6) {
        contrasena.setAttribute("aria-invalid", "true");
        contrasena.setAttribute("aria-describedby", "estado-acceso");
        mostrarEstado("La contraseña debe tener al menos 6 caracteres.", true);
        contrasena.focus();
        return;
    }

    procesando = true;
    boton.disabled = true;
    modoLogin.disabled = true;
    modoRegistro.disabled = true;
    mostrarEstado(esRegistro ? "Creando cuenta…" : "Iniciando sesión…");

    try {
        if (esRegistro) {
            const data = await registrarUsuario(correoValor, contrasenaValor);

            if (!data.session) {
                contrasena.value = "";
                establecerModo("login", false);
                mostrarEstado("Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.");
                return;
            }

            formulario.reset();
            mostrarEstado("Cuenta creada correctamente. Tu cuenta tiene rol de usuario. Ingresando al sitio…");
            redirigiendo = true;

            setTimeout(() => {
                window.location.replace("./index.html");
            }, 1200);
            return;
        }

        const usuarioId = await iniciarSesion(correoValor, contrasenaValor);
        const rol = await obtenerRol(usuarioId);

        formulario.reset();
        if (rol === "admin") {
            window.location.replace("./admin/index.html");
            return;
        }

        window.location.replace("./index.html");
    } catch (error) {
        console.error("Error de acceso", error);
        const mensaje = esRegistro
            ? error.message || "No se pudo crear la cuenta. Inténtalo de nuevo."
            : error.code === "invalid_credentials"
                ? "El correo o la contraseña son incorrectos."
                : error.code === "email_not_confirmed"
                    ? "Confirma tu correo electrónico antes de iniciar sesión."
                    : "No se pudo completar el acceso. Inténtalo de nuevo.";

        mostrarEstado(mensaje, true);
    } finally {
        procesando = false;
        if (!redirigiendo) {
            boton.disabled = false;
            modoLogin.disabled = false;
            modoRegistro.disabled = false;
        }
    }
});

boton.disabled = false;
