import { obtenerContacto } from "../data/contacto.js";

function soloDigitos(texto) {
    return String(texto ?? "").replace(/\D/g, "");
}

function paraTelefono(texto) {
    return String(texto ?? "").replace(/[^\d+]/g, "");
}

function actualizarTelefono(telefono) {
    document.querySelectorAll('[data-contacto="telefono"]').forEach((elemento) => {
        elemento.textContent = telefono;

        if (elemento instanceof HTMLAnchorElement) {
            elemento.href = `tel:${paraTelefono(telefono)}`;
        }
    });

    const numero = soloDigitos(telefono);
    document.documentElement.dataset.whatsapp = numero;

    document.querySelectorAll('a[href*="wa.me/"]').forEach((enlace) => {
        const url = new URL(enlace.href);
        const partes = url.pathname.split("/").filter(Boolean);

        if (partes.length === 0) return;

        partes[0] = numero;
        url.pathname = `/${partes.join("/")}`;
        enlace.href = url.toString();
    });
}

function actualizarCorreo(correo) {
    document.querySelectorAll('[data-contacto="correo"]').forEach((elemento) => {
        elemento.textContent = correo;

        if (elemento instanceof HTMLAnchorElement) {
            elemento.href = `mailto:${correo}`;
        }
    });
}

function actualizarHorarios(horarios) {
    document.querySelectorAll('[data-contacto="horarios"]').forEach((lista) => {
        const elementos = horarios.map((horario) => {
            const item = document.createElement("li");
            item.textContent = horario;
            return item;
        });

        lista.replaceChildren(...elementos);
    });
}

async function cargarContactoPublico() {
    let contacto;

    try {
        contacto = await obtenerContacto();
    } catch {
        return;
    }

    if (!contacto) return;

    actualizarTelefono(contacto.telefono);
    actualizarCorreo(contacto.correo);
    actualizarHorarios(contacto.horarios);
}

cargarContactoPublico();
