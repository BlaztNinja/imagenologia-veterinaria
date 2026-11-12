import { iniciarSesion, obtenerRol } from "./datos/autenticacion.js";

const formulario = document.querySelector("#formulario-acceso");
const boton = formulario.querySelector("button");
const estado = document.querySelector("#estado-acceso");
let procesando = false;

function mostrarEstado(texto, error = false) {
    estado.classList.toggle("error", error);
    estado.setAttribute("role", error ? "alert" : "status");
    estado.textContent = texto;
}

const motivo = new URLSearchParams(window.location.search).get("sesion");
if (motivo === "cerrada") mostrarEstado("Sesión cerrada.");
if (motivo === "error") {
    mostrarEstado("No se pudo verificar el acceso. Intenta iniciar sesión nuevamente.", true);
}

formulario.addEventListener("invalid", (evento) => {
    const campo = evento.target;
    campo.setAttribute("aria-invalid", "true");
    campo.setAttribute("aria-describedby", "estado-acceso");
    mostrarEstado(campo.validity.valueMissing
        ? "Completa el correo y la contraseña."
        : "Ingresa un correo electrónico válido.", true);
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
    procesando = true;
    boton.disabled = true;
    mostrarEstado("Iniciando sesión…");

    try {
        const usuarioId = await iniciarSesion(datos.get("correo").trim(), datos.get("contrasena"));
        const rol = await obtenerRol(usuarioId);

        formulario.reset();
        if (rol === "admin") {
            window.location.replace("./admin/index.html");
            return;
        }

        window.location.replace("./index.html");
    } catch (error) {
        console.error("Error de acceso", error);
        mostrarEstado(error.code === "invalid_credentials"
            ? "El correo o la contraseña son incorrectos."
            : error.code === "email_not_confirmed"
                ? "Confirma tu correo electrónico antes de iniciar sesión."
                : "No se pudo completar el acceso. Inténtalo de nuevo.", true);
    } finally {
        procesando = false;
        boton.disabled = false;
    }
});

boton.disabled = false;
