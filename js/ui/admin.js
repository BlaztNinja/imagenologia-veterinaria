import {
    cerrarSesion,
    obtenerPersonal,
    observarSesion
} from "../data/auth.js";

import {
    listarContenido,
    actualizarContenido
} from "../data/servicios.js";

import {
    obtenerContacto,
    actualizarContacto
} from "../data/contacto.js";

const elementos = {
    mensaje: document.querySelector("#mensaje"),
    controles: document.querySelector("#controles-admin"),
    verSitio: document.querySelector("#ver-sitio"),
    volverAdmin: document.querySelector("#volver-admin"),
    etiquetaPrevia: document.querySelector("#etiqueta-previa"),
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

    document.querySelectorAll(".lista button").forEach((boton) => {
        boton.disabled = valor;
    });
}

function cerrarEditor() {
    seleccion = null;
    elementos.formulario.reset();
    elementos.editor.hidden = true;
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

    campos.nombre.value = registro.nombre;
    campos.nombre.readOnly = !esServicio;
    campos.descripcion.value = registro.descripcion;
    campos.precio.value = esServicio ? registro.precio : "";
    campos.detalles.value = esServicio ? registro.detalles.join("\n") : "";

    campos.precio.required = esServicio;
    campos.precio.disabled = !esServicio;
    campos.detalles.disabled = !esServicio;
    elementos.camposServicio.hidden = !esServicio;

    elementos.titulo.textContent = esServicio
        ? "Editar servicio"
        : "Editar requisito del paciente";

    elementos.editor.hidden = false;
    mostrarMensaje("Editá los campos y guardá los cambios.");
    campos.nombre.focus();
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
        descripcion.textContent = registro.descripcion;
        contenido.append(nombre, descripcion);

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
    pintarLista("requisitos", requisitos);
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

        mostrarMensaje("Cargando contenido…");

        try {
            await cargarContacto();
        } catch (error) {
            mostrarMensajeContacto(error.message, true);
        }

        try {
            await cargarListas();
            mostrarMensaje(
                "Revisá los datos de contacto o seleccioná el contenido que querés editar."
            );
        } catch (error) {
            mostrarMensaje(error.message, true);
        }
    } catch (error) {
        console.error("Error al verificar el acceso administrativo", error);
        mostrarAcceso("error");
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
        await actualizarContenido(tipo, registro, valores);
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
        mostrarMensaje("Contenido actualizado.");
    } catch (error) {
        mostrarMensaje(error.message, true);
    } finally {
        establecerOcupado(false);
    }
});

elementos.cancelar.addEventListener("click", () => {
    cerrarEditor();
    mostrarMensaje("Edición cancelada.");
});

elementos.logout.addEventListener("click", async () => {
    if (seleccion && !confirm("¿Descartar el formulario y cerrar sesión?")) {
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
    elementos.verSitio.hidden = false;
    elementos.volverAdmin.hidden = true;
    elementos.etiquetaPrevia.hidden = true;
}

elementos.verSitio.addEventListener("click", () => {
    if (ocupado || elementos.backoffice.hidden) return;

    // Al abrir una revisión, recarga los datos guardados del sitio público.
    elementos.sitioPrevio.src = "../index.html";
    elementos.contenido.hidden = true;
    elementos.vistaPrevia.hidden = false;
    elementos.verSitio.hidden = true;
    elementos.volverAdmin.hidden = false;
    elementos.etiquetaPrevia.hidden = false;
    document.body.classList.add("en-vista-previa");
    elementos.volverAdmin.focus();
});

elementos.volverAdmin.addEventListener("click", () => {
    mostrarAdministracion();
    elementos.verSitio.focus();
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
    if (seleccion) {
        evento.preventDefault();
        evento.returnValue = "";
    }
});

acceder();