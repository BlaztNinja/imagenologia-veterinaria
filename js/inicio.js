import { cargarDatosInicio, obtenerUrlImagen } from "./datos/inicio.js";
import { cerrarSesion, obtenerSesion } from "./datos/autenticacion.js";

const estado = document.querySelector("#estado-inicio");
const enlaceAcceso = document.querySelector("#enlace-acceso");
const botonSalir = document.querySelector("#cerrar-sesion");
const estadoSesion = document.querySelector("#estado-sesion");

async function mostrarInicio() {
    const elementos = [...document.querySelectorAll("[data-contenido]")];

    try {
        const { bloques, contacto } = await cargarDatosInicio(elementos.map((elemento) => elemento.dataset.contenido));

        for (const elemento of elementos) {
            const bloque = bloques.get(elemento.dataset.contenido);
            if (bloque?.texto) elemento.textContent = bloque.texto;
            if (bloque?.imagen_ruta) {
                elemento.addEventListener("error", () => {
                    elemento.src = elemento.dataset.respaldo;
                    estado.textContent = "Una imagen de Inicio no está disponible. Se muestra la imagen local.";
                }, { once: true });
                elemento.src = obtenerUrlImagen(bloque.imagen_ruta);
            }
        }

        for (const tarjeta of document.querySelectorAll(".testimonial-card")) {
            const nombre = tarjeta.querySelector(".author-info h4").textContent;
            tarjeta.querySelector(".author-avatar").textContent = nombre.trim().split(/\s+/)
                .slice(0, 2).map((palabra) => palabra[0]).join("").toUpperCase();
        }

        if (contacto) mostrarContacto(contacto);
        estado.textContent = elementos.every((elemento) => bloques.has(elemento.dataset.contenido)) && contacto
            ? ""
            : "Faltan datos de Inicio en Supabase. Se muestra el contenido disponible.";
    } catch (error) {
        console.error("Error al cargar Inicio", error);
        estado.textContent = "No se pudo cargar la información actualizada. Se muestra el contenido local.";
    }
}

function mostrarContacto({ telefono, correo, horarios }) {
    document.querySelector("#telefono-inicio").textContent = `WhatsApp: ${telefono}`;
    document.querySelector("#correo-inicio").textContent = correo;

    const lista = document.querySelector("#horarios-inicio");
    lista.replaceChildren(...horarios.map((horario) => {
        const item = document.createElement("li");
        item.textContent = horario;
        return item;
    }));
    lista.hidden = !horarios.length;

    const numero = telefono.replace(/\D/g, "");
    if (!numero) return;

    for (const enlace of document.querySelectorAll('a[href^="https://wa.me/"]')) {
        const url = new URL(enlace.href);
        url.pathname = `/${numero}`;
        enlace.href = url.href;
    }
}

async function mostrarSesion() {
    try {
        const sesion = await obtenerSesion();
        enlaceAcceso.hidden = Boolean(sesion);
        botonSalir.hidden = !sesion;
    } catch (error) {
        console.error("Error al comprobar la sesión", error);
    }
}

botonSalir.addEventListener("click", async () => {
    botonSalir.disabled = true;
    estadoSesion.textContent = "Cerrando sesión…";
    try {
        await cerrarSesion();
        enlaceAcceso.hidden = false;
        botonSalir.hidden = true;
        enlaceAcceso.focus();
        estadoSesion.textContent = "Sesión cerrada.";
        setTimeout(() => {
            estadoSesion.textContent = "";
        }, 5000);
    } catch (error) {
        console.error("Error al cerrar sesión", error);
        estadoSesion.textContent = "No se pudo cerrar la sesión. Inténtalo de nuevo.";
    } finally {
        botonSalir.disabled = false;
    }
});

estado.textContent = "Cargando información de Inicio…";
mostrarInicio();
mostrarSesion();
