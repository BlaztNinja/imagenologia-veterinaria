import { cerrarSesion, iniciarSesion, obtenerSesion } from "../datos/autenticacion.js";
import { registrarUsuario } from "../data/auth.js";

const titulo = document.querySelector("#titulo-solicitud");
const ayuda = document.querySelector("#ayuda-solicitud");
const acceso = document.querySelector("#acceso-contacto");
const formularioDatos = document.querySelector("#formulario-contacto");
const formulario = document.querySelector("#formulario-acceso-contacto");
const boton = document.querySelector("#boton-acceso-contacto");
const estado = document.querySelector("#estado-acceso-contacto");
const modoLogin = document.querySelector("#modo-login-contacto");
const modoRegistro = document.querySelector("#modo-registro-contacto");
const correo = formulario.elements.correo;
const contrasena = formulario.elements.contrasena;
const verContrasena = document.querySelector("#ver-contrasena-contacto");
const enlaceAcceso = document.querySelector("#enlace-acceso");
const botonSalir = document.querySelector("#cerrar-sesion");

let modoAcceso = "login";
let procesando = false;

function mostrarEstado(texto, error = false) {
    estado.textContent = texto;
    estado.hidden = !texto;
    estado.classList.toggle("error", error);
}

function guardarFormulario() {
    contrasena.value = "";
    correo.value = "";
    ocultarContrasena();
    correo.disabled = true;
    contrasena.disabled = true;
    mostrarEstado("");
}

function mostrarFormulario() {
    titulo.textContent = "Deja tus datos";
    ayuda.textContent = "Completa el formulario con tu nombre, teléfono, correo, el servicio y el motivo. Al enviarlo, la clínica guarda tus datos.";
    guardarFormulario();
    acceso.hidden = true;
    formularioDatos.hidden = false;
    if (enlaceAcceso) enlaceAcceso.hidden = true;
    if (botonSalir) botonSalir.hidden = false;
}

function mostrarAcceso() {
    titulo.textContent = "Inicia sesión";
    ayuda.textContent = "Para llenar el formulario necesitas una cuenta. Inicia sesión o regístrate y el formulario aparece aquí.";
    correo.disabled = false;
    contrasena.disabled = false;
    acceso.hidden = false;
    formularioDatos.hidden = true;
    if (enlaceAcceso) enlaceAcceso.hidden = false;
    if (botonSalir) botonSalir.hidden = true;
}

function ocultarContrasena() {
    contrasena.type = "password";
    verContrasena.setAttribute("aria-pressed", "false");
    verContrasena.setAttribute("aria-label", "Mostrar contraseña");
}

function establecerModo(modo, enfocar = true) {
    modoAcceso = modo;
    const esRegistro = modo === "registro";

    modoLogin.setAttribute("aria-pressed", String(!esRegistro));
    modoRegistro.setAttribute("aria-pressed", String(esRegistro));
    boton.textContent = esRegistro ? "Crear cuenta" : "Iniciar sesión";
    contrasena.autocomplete = esRegistro ? "new-password" : "current-password";

    if (esRegistro) {
        contrasena.setAttribute("minlength", "6");
    } else {
        contrasena.removeAttribute("minlength");
    }

    contrasena.value = "";
    ocultarContrasena();
    mostrarEstado("");
    if (enfocar) correo.focus();
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

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (procesando) return;

    const correoValor = correo.value.trim();
    const contrasenaValor = contrasena.value;
    const esRegistro = modoAcceso === "registro";

    if (!correoValor) {
        mostrarEstado("Completa el correo electrónico.", true);
        correo.focus();
        return;
    }

    if (esRegistro && contrasenaValor.length < 6) {
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
                establecerModo("login", false);
                mostrarEstado("Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.");
                return;
            }

            mostrarFormulario();
            return;
        }

        await iniciarSesion(correoValor, contrasenaValor);
        mostrarFormulario();
    } catch (error) {
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
        boton.disabled = false;
        modoLogin.disabled = false;
        modoRegistro.disabled = false;
    }
});

botonSalir.addEventListener("click", async () => {
    if (procesando) return;

    procesando = true;
    botonSalir.disabled = true;

    try {
        await cerrarSesion();
        mostrarAcceso();
    } catch (error) {
        console.error("Error al cerrar sesión", error);
        mostrarEstado("No se pudo cerrar la sesión. Inténtalo de nuevo.", true);
    } finally {
        procesando = false;
        botonSalir.disabled = false;
    }
});

try {
    const sesion = await obtenerSesion();
    if (sesion) mostrarFormulario();
    else mostrarAcceso();
} catch (error) {
    console.error("Error al comprobar la sesión", error);
    mostrarAcceso();
    mostrarEstado("No se pudo comprobar la sesión. Inicia sesión para ver el formulario.", true);
}
