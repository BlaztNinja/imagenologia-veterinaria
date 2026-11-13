import {
    cerrarSesion,
    obtenerPersonal,
    observarSesion
} from "../data/auth.js";

import {
    listarContenido,
    actualizarContenido,
    actualizarRequisitos
} from "../data/servicios.js";
import { agruparRequisitos, etiquetaVariante, textoVariante } from "../datos/requisitos.js";

import {
    obtenerContacto,
    actualizarContacto
} from "../data/contacto.js";

import {
    iniciarClientes,
    cargarClientes,
    limpiarClientes
} from "./clientes.js?v=11";

import { cargarImagenes, iniciarImagenes, limpiarImagenes, hayImagenesPendientes } from "./imagenes.js";
import { urlImagen } from "../data/imagenes.js";

const elementos = {
    mensaje: document.querySelector("#mensaje"),
    controles: document.querySelector("#controles-admin"),
    verSitio: document.querySelector("#ver-sitio"),
    vistaPrevia: document.querySelector("#vista-previa"),
    sitioPrevio: document.querySelector("#sitio-previo"),
    contenido: document.querySelector("#contenido-admin"),
    backoffice: document.querySelector("#backoffice"),
    usuario: document.querySelector("#usuario"),
    logout: document.querySelector("#logout"),
    recargar: document.querySelector("#recargar"),
    editor: document.querySelector("#editor"),
    formulario: document.querySelector("#form-editor"),
    campos: document.querySelector("#campos-editor"),
    titulo: document.querySelector("#titulo-editor"),
    camposServicio: document.querySelector("#campos-servicio"),
    cancelar: document.querySelector("#cancelar"),
    contacto: document.querySelector("#form-contacto"),
    camposContacto: document.querySelector("#campos-contacto"),
    mensajeContacto: document.querySelector("#mensaje-contacto")
};

const listas = {
    servicios: document.querySelector("#lista-servicios"),
    requisitos: document.querySelector("#lista-requisitos")
};

let seleccion = null;
let ocupado = false;
let sesionRevision = 0;
let seccionActual = "";
const secciones = {
    clientes: ["Clientes", "Gestioná las solicitudes y las fichas de los clientes."],
    servicios: ["Servicios", "Editá los servicios y los requisitos del paciente."],
    contactos: ["Contactos", "Actualizá el teléfono, el correo y los horarios de la clínica."],
    imagenes: ["Imágenes", "Actualizá las imágenes que se muestran en el sitio."]
};
const enlacesSeccion = document.querySelectorAll("[data-seccion]");
const tarjetaSesion = document.querySelector(".admin-sesion");

document.addEventListener("click", (evento) => {
    if (!tarjetaSesion.contains(evento.target)) tarjetaSesion.open = false;
});

document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && tarjetaSesion.open) {
        tarjetaSesion.open = false;
        tarjetaSesion.querySelector("summary").focus();
    }
});

function mostrarMensaje(texto, error = false) {
    elementos.mensaje.textContent = texto;
    elementos.mensaje.hidden = !texto;
    elementos.mensaje.classList.toggle("error", error);
}

function mostrarMensajeContacto(texto, error = false) {
    elementos.mensajeContacto.textContent = texto;
    elementos.mensajeContacto.hidden = !texto;
    elementos.mensajeContacto.classList.toggle("error", error);
}

function establecerOcupado(valor) {
    ocupado = valor;
    elementos.backoffice.setAttribute("aria-busy", String(valor));
    elementos.campos.disabled = valor;
    elementos.camposContacto.disabled = valor;
    elementos.recargar.disabled = valor;
    elementos.logout.disabled = valor;
    elementos.verSitio.disabled = valor;
    document.querySelector("#recargar-imagenes").disabled = valor;
    document.querySelectorAll(".campos-imagen").forEach((campos) => {
        campos.disabled = valor || campos.dataset.disponible === "false";
    });

    document.querySelectorAll(
        "#form-cliente input, #form-cliente select, #form-cliente textarea, #form-cliente button, .lista button"
    ).forEach((boton) => {
        boton.disabled = valor;
    });
}

function cerrarEditor() {
    seleccion = null;
    elementos.formulario.reset();
    elementos.editor.hidden = true;
    document.querySelector("#listado-servicios").hidden = false;
}

function mostrarAcceso(motivo = "") {
    mostrarAdministracion();
    elementos.controles.hidden = true;
    elementos.sitioPrevio.removeAttribute("src");
    sesionRevision += 1;
    cerrarEditor();
    elementos.backoffice.hidden = true;
    elementos.usuario.textContent = "";
    elementos.contacto.reset();
    mostrarMensajeContacto("");

    Object.values(listas).forEach((lista) => lista.replaceChildren());
    limpiarClientes();
    limpiarImagenes();
    const destino = new URL("../acceso.html", window.location.href);
    if (motivo) destino.searchParams.set("sesion", motivo);
    window.location.replace(destino.href);
}

function pintarContacto(contacto) {
    const campos = elementos.contacto.elements;

    campos.telefono.value = contacto.telefono;
    campos.correo.value = contacto.correo;
    campos.horarios.value = contacto.horarios.join("\n");
}

async function cargarContacto() {
    const revision = sesionRevision;
    const contacto = await obtenerContacto();

    if (revision !== sesionRevision) return;

    if (!contacto) {
        elementos.contacto.reset();
        mostrarMensajeContacto(
            "No hay datos de contacto configurados en la base de datos."
        );
        return;
    }

    pintarContacto(contacto);
    mostrarMensajeContacto("");
}

function abrirEditor(tipo, registro) {
    if (ocupado) return;

    if (seleccion && !confirm("¿Descartar el formulario abierto?")) {
        return;
    }

    seleccion = { tipo, registro };
    const campos = elementos.formulario.elements;
    const esServicio = tipo === "servicios";

    campos.nombre.value = esServicio ? registro.nombre : "";
    campos.nombre.required = esServicio;
    campos.descripcion.value = esServicio ? registro.descripcion : "";
    campos.descripcion.required = esServicio;
    campos.precio.value = esServicio ? registro.precio : "";
    campos.detalles.value = esServicio ? registro.detalles.join("\n") : "";

    campos.precio.required = esServicio;
    campos.precio.disabled = !esServicio;
    campos.detalles.disabled = !esServicio;
    elementos.camposServicio.hidden = !esServicio;
    document.querySelector("#campos-contenido").hidden = !esServicio;
    document.querySelectorAll("#campos-contenido input, #campos-contenido textarea").forEach((campo) => {
        campo.disabled = !esServicio;
    });
    const indicaciones = document.querySelector("#campos-requisitos");
    indicaciones.hidden = esServicio;
    indicaciones.replaceChildren();
    if (!esServicio) {
        registro.variantes.forEach((variante, indice) => {
            const etiqueta = document.createElement("label");
            const campo = document.createElement("textarea");
            campo.id = `requisito-${indice}`;
            campo.name = campo.id;
            campo.rows = 4;
            campo.maxLength = 3000;
            campo.required = true;
            campo.value = variante.texto;
            etiqueta.htmlFor = campo.id;
            etiqueta.textContent = etiquetaVariante(registro, variante) || "Indicaciones para todos los servicios";
            indicaciones.append(etiqueta, campo);
        });
    }
    document.querySelector("#guardar-editor").disabled = false;
    document.querySelector("#ayuda-editor").textContent = esServicio
        ? "Edita los datos del servicio y guarda los cambios."
        : "Cada indicación se actualiza en todos los servicios a los que corresponde.";

    elementos.titulo.textContent = `Editar ${registro.nombre}`;

    document.querySelector("#listado-servicios").hidden = true;
    elementos.editor.hidden = false;
    mostrarMensaje("Editá los campos y guardá los cambios.");
    elementos.titulo.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
}

function pintarLista(tipo, registros) {
    const lista = listas[tipo];
    lista.replaceChildren();

    if (registros.length === 0) {
        const mensaje = document.createElement("li");
        mensaje.textContent = "Todavía no hay registros.";
        lista.append(mensaje);
        return;
    }

    registros.forEach((registro) => {
        const fila = document.createElement("li");
        const contenido = document.createElement("div");
        const nombre = document.createElement("strong");
        const descripcion = document.createElement("p");
        const boton = document.createElement("button");

        nombre.textContent = registro.nombre;
        contenido.append(nombre);
        if (tipo === "servicios") {
            descripcion.textContent = registro.descripcion;
            contenido.append(descripcion);
        } else if (registro.variantes.length === 1 && registro.orden !== 1) {
            descripcion.textContent = textoVariante(registro, registro.variantes[0]);
            contenido.append(descripcion);
        } else {
            const variantes = document.createElement("ul");
            for (const variante of registro.variantes) {
                const item = document.createElement("li");
                const etiqueta = etiquetaVariante(registro, variante);
                item.textContent = `${etiqueta ? `${etiqueta}: ` : ""}${textoVariante(registro, variante)}`;
                variantes.append(item);
            }
            contenido.append(variantes);
        }

        if (tipo === "servicios") {
            const precio = document.createElement("p");
            precio.textContent = new Intl.NumberFormat("es-SV", {
                style: "currency",
                currency: "USD"
            }).format(registro.precio);
            contenido.append(precio);

            const detalles = document.createElement("ul");

            registro.detalles.forEach((texto) => {
                const detalle = document.createElement("li");
                detalle.textContent = texto;
                detalles.append(detalle);
            });

            contenido.append(detalles);
        }

        boton.type = "button";
        boton.textContent = "Editar";
        boton.setAttribute("aria-label", `Editar ${registro.nombre}`);
        boton.addEventListener("click", () => abrirEditor(tipo, registro));

        fila.append(contenido, boton);
        lista.append(fila);
    });
}

async function cargarListas() {
    const revision = sesionRevision;

    const [servicios, requisitos] = await Promise.all([
        listarContenido("servicios"),
        listarContenido("requisitos")
    ]);

    if (revision !== sesionRevision) return;

    pintarLista("servicios", servicios);
    pintarLista("requisitos", agruparRequisitos(requisitos));
}

async function acceder() {
    establecerOcupado(true);

    try {
        const personal = await obtenerPersonal();

        if (!personal) {
            mostrarAcceso();
            mostrarMensaje("");
            return;
        }

        elementos.backoffice.hidden = false;
        elementos.controles.hidden = false;
        elementos.usuario.textContent = personal.email;
        elementos.usuario.title = personal.email;

        mostrarMensaje("Cargando contenido…");
        const cargaClientes = cargarClientes();
        const cargaImagenes = cargarImagenes();

        try {
            await cargarContacto();
        } catch (error) {
            mostrarMensajeContacto(error.message, true);
        }

        try {
            await cargarListas();
            mostrarMensaje(
                "Revisá los datos de contacto, los clientes o el contenido que querés editar."
            );
        } catch (error) {
            mostrarMensaje(error.message, true);
        }

        await cargaClientes;
        await cargaImagenes;
    } catch (error) {
        console.error("Error al verificar el acceso administrativo", error);
        mostrarAcceso(error.code === "sin_permiso" ? "sin-permiso" : "error");
    } finally {
        establecerOcupado(false);
    }
}

elementos.contacto.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    if (ocupado) return;

    const valores = Object.fromEntries(new FormData(elementos.contacto));

    establecerOcupado(true);
    mostrarMensajeContacto("Guardando datos de contacto…");

    try {
        const contacto = await actualizarContacto(valores);
        pintarContacto(contacto);
        mostrarMensajeContacto("Datos de contacto actualizados correctamente.");
    } catch (error) {
        mostrarMensajeContacto(error.message, true);
    } finally {
        establecerOcupado(false);
    }
});

elementos.formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    if (ocupado || !seleccion) return;

    const { tipo, registro } = seleccion;
    const valores = Object.fromEntries(new FormData(elementos.formulario));

    establecerOcupado(true);
    mostrarMensaje("Guardando cambios…");

    try {
        if (tipo === "requisitos") await actualizarRequisitos(registro, valores);
        else await actualizarContenido(tipo, registro, valores);
        cerrarEditor();

        try {
            await cargarListas();
            mostrarMensaje("Cambios guardados correctamente.");
        } catch {
            mostrarMensaje(
                "Los cambios se guardaron, pero la lista no pudo actualizarse. Usá Recargar contenido.",
                true
            );
        }
    } catch (error) {
        if (error.recargarRequisitos) {
            seleccion.requiereRecarga = true;
            document.querySelector("#guardar-editor").disabled = true;
        }
        mostrarMensaje(error.message, true);
    } finally {
        establecerOcupado(false);
    }
});

elementos.recargar.addEventListener("click", async () => {
    if (ocupado) return;

    if (seleccion && !confirm("¿Descartar el formulario y recargar?")) {
        return;
    }

    cerrarEditor();
    establecerOcupado(true);
    mostrarMensaje("Cargando contenido…");

    try {
        await cargarContacto();
    } catch (error) {
        mostrarMensajeContacto(error.message, true);
    }

    try {
        await cargarListas();
        await cargarClientes();
        mostrarMensaje("Contenido actualizado.");
    } catch (error) {
        mostrarMensaje(error.message, true);
    } finally {
        establecerOcupado(false);
    }
});

elementos.cancelar.addEventListener("click", async () => {
    const recargar = seleccion?.requiereRecarga;
    cerrarEditor();
    mostrarMensaje("Edición cancelada.");
    if (recargar) {
        establecerOcupado(true);
        try { await cargarListas(); }
        catch (error) { mostrarMensaje(error.message, true); }
        finally { establecerOcupado(false); }
    }
    document.querySelector("#titulo-servicios-admin").focus();
});

elementos.logout.addEventListener("click", async () => {
    if ((seleccion || hayImagenesPendientes()) && !confirm("¿Descartar los cambios sin guardar y cerrar sesión?")) {
        return;
    }

    establecerOcupado(true);

    try {
        await cerrarSesion();
        mostrarAcceso("cerrada");
    } catch (error) {
        mostrarAdministracion();
        mostrarMensaje(error.message, true);
    } finally {
        establecerOcupado(false);
    }
});

function mostrarAdministracion() {
    document.body.classList.remove("en-vista-previa");
    elementos.vistaPrevia.hidden = true;
    elementos.contenido.hidden = false;
    elementos.verSitio.textContent = "Ver sitio";
    elementos.verSitio.setAttribute("aria-expanded", "false");
}

function cambiarSeccion(seccion) {
    if (!Object.hasOwn(secciones, seccion)) seccion = "clientes";
    if (ocupado || (seccion !== seccionActual && seleccion
        && !confirm("¿Descartar el formulario abierto?"))) {
        history.replaceState(null, "", `#${seccionActual || "clientes"}`);
        return;
    }

    mostrarAdministracion();
    if (seccion !== seccionActual) {
        cerrarEditor();
        mostrarMensaje("");
    }
    seccionActual = seccion;
    Object.keys(secciones).forEach((nombre) => {
        document.querySelector(`#${nombre}`).hidden = nombre !== seccion;
    });
    enlacesSeccion.forEach((enlace) => {
        if (enlace.dataset.seccion === seccion) enlace.setAttribute("aria-current", "page");
        else enlace.removeAttribute("aria-current");
    });
    const [titulo, descripcion] = secciones[seccion];
    document.querySelector("#titulo-seccion").textContent = titulo;
    document.querySelector("#descripcion-seccion").textContent = descripcion;
    document.title = `${titulo} | Backoffice`;
}

enlacesSeccion.forEach((enlace) => enlace.addEventListener("click", (evento) => {
    evento.preventDefault();
    if (ocupado || elementos.backoffice.hidden) return;
    cambiarSeccion(enlace.dataset.seccion);
    if (seccionActual === enlace.dataset.seccion && window.location.hash !== enlace.hash) {
        history.pushState(null, "", enlace.getAttribute("href"));
    }
}));

window.addEventListener("hashchange", () => cambiarSeccion(window.location.hash.slice(1)));

elementos.verSitio.setAttribute("aria-controls", "vista-previa");
elementos.verSitio.setAttribute("aria-expanded", "false");
elementos.verSitio.addEventListener("click", () => {
    if (ocupado || elementos.backoffice.hidden) return;
    if (!elementos.vistaPrevia.hidden) {
        mostrarAdministracion();
        return;
    }
    // Al abrir una revisión, recarga los datos guardados del sitio público.
    elementos.sitioPrevio.src = "../index.html";
    elementos.contenido.hidden = true;
    elementos.vistaPrevia.hidden = false;
    elementos.verSitio.textContent = "Volver";
    elementos.verSitio.setAttribute("aria-expanded", "true");
    document.body.classList.add("en-vista-previa");
});

elementos.sitioPrevio.addEventListener("load", () => {
    // Los controles de sesión permanecen en el encabezado administrativo.
    const documento = elementos.sitioPrevio.contentDocument;
    if (!documento) return;

    const acceso = documento.querySelector(".nav-acceso");
    if (acceso) acceso.hidden = true;
});

observarSesion((evento) => {
    if (evento === "SIGNED_OUT") {
        mostrarAcceso("cerrada");
    }
});

window.addEventListener("beforeunload", (evento) => {
    if (seleccion || hayImagenesPendientes()) {
        evento.preventDefault();
        evento.returnValue = "";
    }
});

iniciarClientes({
    estaOcupado: () => ocupado,
    ocupar: establecerOcupado,
    cerrarEditor
});

iniciarImagenes({
    estaOcupado: () => ocupado,
    ocupar: establecerOcupado,
    actualizada: (registro) => {
        if (registro.id === "sitio.logo") {
            document.querySelector('.brand-logo img').src = urlImagen(registro.ruta);
        }
    }
});

cambiarSeccion(window.location.hash.slice(1));
acceder();
