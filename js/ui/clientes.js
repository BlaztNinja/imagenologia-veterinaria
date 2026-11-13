import { actualizarSolicitud, eliminarSolicitud, listarSolicitudes } from "../data/solicitudes.js?v=8";
import { listarServicios } from "../data/servicios.js";

let controles = {
    estaOcupado: () => false,
    ocupar: () => {}
};
let elementos = null;
let registros = [];
let servicios = [];
let elegido = null;
let editando = false;
let listo = false;
let revision = 0;

function requerir(selector) {
    const nodo = document.querySelector(selector);

    if (!nodo) {
        throw new Error(`Falta ${selector} en el backoffice.`);
    }

    return nodo;
}

function mostrarMensaje(texto, error = false) {
    elementos.mensaje.textContent = texto;
    elementos.mensaje.hidden = !texto;
    elementos.mensaje.classList.toggle("error", error);
}

function citaPendiente(estado) {
    return estado === "nueva";
}

function textoCita(estado) {
    return citaPendiente(estado) ? "Cita pendiente" : "Consulta finalizada";
}

function formatearFecha(valor) {
    const fecha = String(valor ?? "");
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);

    if (!partes) return "";

    return `${partes[3]}/${partes[2]}/${partes[1]}`;
}

function pintarServicios(servicioId) {
    const select = elementos.formulario.elements.servicio;
    select.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Selecciona un servicio";
    select.append(placeholder);

    let encontrado = false;

    servicios.forEach((servicio) => {
        const opcion = document.createElement("option");
        opcion.value = servicio.id;
        opcion.textContent = servicio.nombre;
        if (servicio.id === servicioId) encontrado = true;
        select.append(opcion);
    });

    if (servicioId && !encontrado) {
        const opcion = document.createElement("option");
        opcion.value = servicioId;
        opcion.textContent = "Servicio no disponible";
        select.append(opcion);
    }

    select.value = servicioId || "";
}

function pintarLista() {
    elementos.lista.replaceChildren();

    if (registros.length === 0) {
        const vacio = document.createElement("li");
        vacio.textContent = "Todavía no hay clientes.";
        elementos.lista.append(vacio);
        return;
    }

    registros.forEach((cliente) => {
        const fila = document.createElement("li");
        const boton = document.createElement("button");
        const nombre = document.createElement("span");
        const meta = document.createElement("span");
        const cita = document.createElement("span");

        boton.type = "button";
        boton.className = "cliente-boton secundario";
        boton.dataset.cliente = cliente.id;
        nombre.textContent = cliente.nombre;
        meta.className = "cliente-meta";
        cita.className = citaPendiente(cliente.estado)
            ? "estado estado-nueva"
            : "estado estado-atendida";
        cita.textContent = textoCita(cliente.estado);
        meta.append(cita);

        if (cliente.proxima_cita) {
            const fecha = document.createElement("span");
            fecha.className = "cliente-fecha";
            fecha.textContent = formatearFecha(cliente.proxima_cita);
            meta.append(fecha);
        }

        boton.append(nombre, meta);
        fila.append(boton);
        elementos.lista.append(fila);
    });
}

function mostrarEdicion(activo) {
    editando = activo;
    elementos.campos.hidden = !activo;
    elementos.ficha.hidden = activo;
    elementos.editar.textContent = activo ? "Ver información" : "Editar";
}

function pintarFicha() {
    const campos = elementos.formulario.elements;

    elementos.nombre.textContent = campos.nombre.value;
    elementos.telefono.textContent = campos.telefono.value;
    elementos.correo.textContent = campos.correo.value;
    elementos.motivo.textContent = campos.motivo.value;
    elementos.servicio.textContent = campos.servicio.selectedOptions[0]?.textContent
        || "Servicio no disponible";
}

function marcarEstado(estado) {
    const pendiente = estado !== "atendida";
    elementos.pendiente.setAttribute("aria-pressed", String(pendiente));
    elementos.finalizada.setAttribute("aria-pressed", String(!pendiente));
}

function mostrarLista() {
    elegido = null;
    editando = false;
    elementos.detalle.hidden = true;
    elementos.lista.hidden = false;
    elementos.ficha.hidden = false;
    elementos.campos.hidden = true;
    elementos.editar.textContent = "Editar";
    elementos.formulario.reset();
}

function abrirDetalle(cliente) {
    elegido = cliente;
    const campos = elementos.formulario.elements;

    campos.nombre.value = cliente.nombre;
    campos.telefono.value = cliente.telefono;
    campos.correo.value = cliente.correo;
    campos.motivo.value = cliente.motivo;
    campos.notas.value = cliente.notas ?? "";
    campos.proximaCita.value = cliente.proxima_cita ?? "";
    pintarServicios(cliente.servicio_id);
    pintarFicha();
    marcarEstado(cliente.estado);
    mostrarEdicion(false);

    elementos.lista.hidden = true;
    elementos.detalle.hidden = false;
    elementos.nombre.focus();
}

function valoresFormulario() {
    const campos = elementos.formulario.elements;

    return {
        nombre: campos.nombre.value,
        telefono: campos.telefono.value,
        correo: campos.correo.value,
        servicio_id: campos.servicio.value,
        motivo: campos.motivo.value,
        notas: campos.notas.value,
        proximaCita: campos.proximaCita.value,
        estado: elementos.finalizada.getAttribute("aria-pressed") === "true" ? "atendida" : "nueva"
    };
}

export function iniciarClientes(controlesRecibidos) {
    controles = controlesRecibidos;
    elementos = {
        seccion: requerir("#clientes"),
        mensaje: requerir("#mensaje-clientes"),
        lista: requerir("#lista-clientes"),
        detalle: requerir("#detalle-cliente"),
        nombre: requerir("#nombre-cliente"),
        ficha: requerir("#ficha-cliente"),
        telefono: requerir("#ver-telefono"),
        correo: requerir("#ver-correo"),
        servicio: requerir("#ver-servicio"),
        motivo: requerir("#ver-motivo"),
        campos: requerir("#campos-cliente"),
        formulario: requerir("#form-cliente"),
        pendiente: requerir("#estado-pendiente"),
        finalizada: requerir("#estado-finalizada"),
        editar: requerir("#editar-cliente"),
        eliminar: requerir("#eliminar-cliente"),
        volver: requerir("#volver-clientes"),
        abrir: requerir("#abrir-clientes")
    };

    if (listo) return;

    listo = true;

    elementos.abrir.addEventListener("click", async () => {
        const panel = document.querySelector("#backoffice");

        if (!panel || panel.hidden) {
            const aviso = document.querySelector("#mensaje");

            if (aviso) {
                aviso.hidden = false;
                aviso.classList.add("error");
                aviso.textContent = "Entrá como admin para ver los clientes.";
            }

            return;
        }

        controles.cerrarEditor?.();
        document.body.classList.remove("en-vista-previa");
        document.querySelector("#vista-previa").hidden = true;
        document.querySelector("#contenido-admin").hidden = false;
        document.querySelector("#ver-sitio").hidden = false;
        document.querySelector("#etiqueta-previa").hidden = true;
        document.querySelector("#gestion-admin").hidden = true;
        document.querySelector("#editor").hidden = true;
        document.querySelector("#abrir-clientes").hidden = true;
        document.querySelector("#volver-admin").hidden = false;
        elementos.seccion.hidden = false;
        elementos.seccion.scrollIntoView({ behavior: "smooth", block: "start" });
        await cargarClientes();
    });

    elementos.lista.addEventListener("click", (evento) => {
        const boton = evento.target.closest("button[data-cliente]");

        if (!boton) return;

        const cliente = registros.find((item) => item.id === boton.dataset.cliente);

        if (cliente) abrirDetalle(cliente);
    });

    elementos.pendiente.addEventListener("click", () => marcarEstado("nueva"));
    elementos.finalizada.addEventListener("click", () => marcarEstado("atendida"));

    elementos.editar.addEventListener("click", () => {
        if (!elegido || controles.estaOcupado()) return;

        if (editando) pintarFicha();
        mostrarEdicion(!editando);

        if (editando) elementos.formulario.elements.nombre.focus();
    });

    elementos.volver.addEventListener("click", () => {
        mostrarLista();
        mostrarMensaje("");
    });

    elementos.eliminar.addEventListener("click", async () => {
        if (controles.estaOcupado() || !elegido) return;

        const nombre = elegido.nombre;

        if (!confirm(`¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`)) return;

        controles.ocupar(true);
        mostrarMensaje("Eliminando cliente…");

        try {
            await eliminarSolicitud(elegido.id);
            elegido = null;
            mostrarLista();
            await cargarClientes();
            mostrarMensaje(`${nombre} se eliminó de los clientes.`);
        } catch (error) {
            mostrarMensaje(error.message, true);
        } finally {
            controles.ocupar(false);
        }
    });

    elementos.formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        if (controles.estaOcupado() || !elegido) return;

        const valores = valoresFormulario();
        const antes = { ...elegido };
        controles.ocupar(true);
        mostrarMensaje("Guardando cliente…");

        try {
            const resultado = await actualizarSolicitud(elegido.id, valores);
            await cargarClientes();
            const cambioDatos = resultado.datosPendientes && (
                valores.nombre.trim() !== antes.nombre
                || valores.telefono.trim() !== antes.telefono
                || valores.correo.trim() !== antes.correo
                || valores.motivo.trim() !== antes.motivo
                || valores.servicio_id !== antes.servicio_id
            );
            const faltaFicha = resultado.fichaPendiente && (valores.notas.trim() || valores.proximaCita);

            mostrarMensaje(
                cambioDatos
                    ? "La consulta se actualizó. Los cambios en los datos se guardan cuando se actualice la base."
                    : faltaFicha
                        ? "La consulta se actualizó. Las notas y la fecha se guardan cuando se actualice la base."
                        : "Datos del cliente actualizados."
            );
        } catch (error) {
            mostrarMensaje(error.message, true);
        } finally {
            controles.ocupar(false);
        }
    });
}

export function ocultarClientes() {
    if (!elementos) return;

    elementos.seccion.hidden = true;
    mostrarLista();
}

export function limpiarClientes() {
    revision += 1;
    registros = [];
    servicios = [];
    elegido = null;
    editando = false;

    if (!elementos) return;

    elementos.seccion.hidden = true;
    mostrarMensaje("");
    elementos.lista.replaceChildren();
    elementos.detalle.hidden = true;
    elementos.formulario.reset();
    mostrarEdicion(false);
}

export async function cargarClientes() {
    if (!elementos) return;

    const actual = ++revision;
    mostrarMensaje("Cargando clientes…");

    try {
        const [lista, catalogo] = await Promise.all([
            listarSolicitudes(),
            listarServicios()
        ]);

        if (actual !== revision) return;

        registros = lista;
        servicios = catalogo;
        mostrarMensaje("");
        pintarLista();

        if (elegido) {
            const sigue = registros.find((item) => item.id === elegido.id);
            if (sigue) abrirDetalle(sigue);
            else mostrarLista();
        }
    } catch (error) {
        if (actual !== revision) return;

        registros = [];
        elementos.lista.replaceChildren();
        mostrarMensaje(error.message, true);
    }
}
