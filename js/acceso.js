import { iniciarSesion, obtenerRol } from "./datos/autenticacion.js";

const formulario = document.querySelector("#formulario-acceso");
const boton = formulario.querySelector("button");
const estado = document.querySelector("#estado-acceso");
const avisoAdmin = document.querySelector("#aviso-admin");
let procesando = false;

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (procesando) return;

    const datos = new FormData(formulario);
    procesando = true;
    boton.disabled = true;
    estado.textContent = "Iniciando sesión…";

    try {
        const usuarioId = await iniciarSesion(datos.get("correo").trim(), datos.get("contrasena"));
        const rol = await obtenerRol(usuarioId);

        formulario.reset();
        if (rol === "admin") {
            document.querySelector("#panel-acceso").hidden = true;
            avisoAdmin.hidden = false;
            avisoAdmin.querySelector("h1").focus();
            return;
        }

        window.location.replace("./index.html");
    } catch (error) {
        console.error("Error de acceso", error);
        estado.textContent = error.code === "invalid_credentials"
            ? "El correo o la contraseña son incorrectos."
            : "No se pudo completar el acceso. Inténtalo de nuevo.";
    } finally {
        procesando = false;
        boton.disabled = false;
    }
});

boton.disabled = false;
