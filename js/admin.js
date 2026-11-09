import {
    iniciarSesion,
    cerrarSesion,
    obtenerPersonal,
    observarSesion
} from "../data/auth.js";

import {
    listarContenido,
    actualizarContenido
} from "../data/servicios.js";

const elementos = {
    mensaje: document.querySelector("#mensaje"),
    acceso: document.querySelector("#acceso"),
    backoffice: document.querySelector("#backoffice"),
    usuario: document.querySelector("#usuario"),
    login: document.querySelector("#form-login"),
    logout: document.querySelector("#logout"),
    recargar: document.querySelector("#recargar"),
    editor: document.querySelector("#editor"),
    formulario: document.querySelector("#form-editor"),
    campos: document.querySelector("#campos-editor"),
    titulo: document.querySelector("#titulo-editor"),
    camposServicio: document.querySelector("#campos-servicio"),
    cancelar: document.querySelector("#cancelar")
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
    elementos.mensaje.classList.toggle("error", error);
}

function establecerOcupado(valor) {
    ocupado = valor;
    elementos.backoffice.setAttribute("aria-busy", String(valor));
    elementos.campos.disabled = valor;
    elementos.recargar.disabled = valor;
    elementos.logout.disabled = valor;

    document.querySelectorAll(".lista button").forEach((boton) => {
        boton.disabled = valor;
    });
}

function cerrarEditor() {
    seleccion = null;
    elementos.formulario.reset();
    elementos.editor.hidden = true;
}

function mostrarAcceso() {
    sesionRevision += 1;
    cerrarEditor();
    elementos.backoffice.hidden = true;
    elementos.acceso.hidden = false;
    elementos.usuario.textContent = "";

    Object.values(listas).forEach((lista) => lista.replaceChildren());
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
            mostrarMensaje("Ingresá con tu cuenta del personal.");
            return;
        }

        elementos.acceso.hidden = true;
        elementos.backoffice.hidden = false;
        elementos.usuario.textContent = personal.email;
        mostrarMensaje("Cargando contenido…");
        await cargarListas();
        mostrarMensaje("Seleccioná el contenido que querés editar.");
    } catch (error) {
        mostrarMensaje(error.message, true);
        if (elementos.backoffice.hidden) {
            elementos.acceso.hidden = false;
        }
    } finally {
        establecerOcupado(false);
    }
}

elementos.login.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const boton = elementos.login.querySelector("button");
    boton.disabled = true;
    mostrarMensaje("Iniciando sesión…");

    try {
        await iniciarSesion(
            elementos.login.elements.email.value.trim(),
            elementos.login.elements.password.value
        );

        elementos.login.elements.password.value = "";
        await acceder();
    } catch (error) {
        mostrarMensaje(error.message, true);
    } finally {
        boton.disabled = false;
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
                "Los cambios se guardaron, pero la lista no pudo actualizarse. Usá Recargar listas.",
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
        await cargarListas();
        mostrarMensaje("Listas actualizadas.");
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
        mostrarAcceso();
        mostrarMensaje("Sesión cerrada.");
    } catch (error) {
        mostrarMensaje(error.message, true);
    } finally {
        establecerOcupado(false);
    }
});

observarSesion((evento) => {
    if (evento === "SIGNED_OUT") {
        mostrarAcceso();
        mostrarMensaje("La sesión finalizó. Volvé a ingresar.");
    }
});

window.addEventListener("beforeunload", (evento) => {
    if (seleccion) {
        evento.preventDefault();
        evento.returnValue = "";
    }
});

acceder();