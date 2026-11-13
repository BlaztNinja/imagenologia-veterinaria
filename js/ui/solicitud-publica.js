import { listarServiciosActivos } from "../data/servicios.js";
import { crearSolicitud } from "../data/solicitudes.js";
import { validarSolicitud } from "../data/procesar-solicitudes.js";

const formulario = document.querySelector("#formulario-contacto");
const aviso = document.querySelector("#formulario-aviso");
const boton = formulario.querySelector("button[type='submit']");

let serviciosDisponibles = [];
let enviando = false;

function mostrarAviso(texto, error = false) {
    aviso.textContent = texto;
    aviso.hidden = !texto;
    aviso.classList.toggle("error", error);
}

function formatearPrecio(precio) {
    const numero = Number(precio);

    if (!Number.isFinite(numero)) return "";

    return Number.isInteger(numero) ? `$${numero}` : `$${numero.toFixed(2)}`;
}

function pintarServicios(servicios) {
    const select = formulario.elements.servicio;
    select.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = servicios.length
        ? "Selecciona un servicio"
        : "No hay servicios disponibles";
    select.append(placeholder);

    servicios.forEach((servicio) => {
        const opcion = document.createElement("option");
        const precio = formatearPrecio(servicio.precio);
        opcion.value = servicio.id;
        opcion.textContent = precio ? `${servicio.nombre} (${precio})` : servicio.nombre;
        select.append(opcion);
    });

    select.disabled = servicios.length === 0;
}

async function cargarServicios() {
    try {
        serviciosDisponibles = await listarServiciosActivos();
        pintarServicios(serviciosDisponibles);
    } catch (error) {
        serviciosDisponibles = [];
        pintarServicios([]);
        mostrarAviso(error.message, true);
    }
}

function mostrarConfirmacion() {
    const titulo = document.querySelector("#titulo-solicitud");
    const ayuda = document.querySelector("#ayuda-solicitud");
    const confirmacion = document.querySelector("#confirmacion-solicitud");

    if (titulo) titulo.textContent = "Solicitud enviada";
    if (ayuda) ayuda.hidden = true;
    formulario.hidden = true;
    mostrarAviso("");
    confirmacion.hidden = false;
}

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    if (enviando) return;

    formulario.querySelectorAll("[aria-invalid='true']").forEach((campo) => {
        campo.removeAttribute("aria-invalid");
    });

    if (serviciosDisponibles.length === 0) {
        mostrarAviso("No hay servicios disponibles para solicitar en este momento.", true);
        return;
    }

    let datos;

    try {
        datos = validarSolicitud({
            nombre: formulario.elements.nombre.value,
            telefono: formulario.elements.telefono.value,
            correo: formulario.elements.correo.value,
            servicio_id: formulario.elements.servicio.value,
            motivo: formulario.elements.motivo.value
        });
    } catch (error) {
        mostrarAviso(error.message, true);
        const campo = formulario.elements[error.campo];

        if (campo) {
            campo.setAttribute("aria-invalid", "true");
            campo.focus();
        }

        return;
    }

    enviando = true;
    boton.disabled = true;
    mostrarAviso("Guardando tus datos…");

    try {
        await crearSolicitud(datos);
        formulario.reset();
        pintarServicios(serviciosDisponibles);
        mostrarConfirmacion();
    } catch (error) {
        mostrarAviso(error.message, true);
    } finally {
        enviando = false;
        boton.disabled = false;
    }
});

cargarServicios();
