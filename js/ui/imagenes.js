import { guardarImagen, listarImagenes, urlImagen, validarArchivoImagen } from "../data/imagenes.js";

let controles;
let revision = 0;
const pendientes = new Map();
const lista = document.querySelector("#lista-imagenes");
const mensaje = document.querySelector("#mensaje-imagenes");

function mostrarEstado(nodo, texto, error = false) {
    nodo.textContent = texto;
    nodo.hidden = !texto;
    nodo.classList.toggle("error", error);
}

function liberarPendiente(id) {
    const pendiente = pendientes.get(id);
    if (pendiente) URL.revokeObjectURL(pendiente.url);
    pendientes.delete(id);
}

export function hayImagenesPendientes() {
    return pendientes.size > 0;
}

export function limpiarImagenes() {
    revision += 1;
    for (const id of pendientes.keys()) liberarPendiente(id);
    lista.replaceChildren();
    mostrarEstado(mensaje, "");
}

function crearTarjeta(registro) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "imagen-tarjeta";
    const titulo = document.createElement("h3");
    titulo.textContent = registro.nombre;
    const uso = document.createElement("p");
    uso.className = "admin-ayuda";
    uso.textContent = registro.uso;
    const imagen = document.createElement("img");
    imagen.className = "imagen-miniatura";
    imagen.alt = registro.nombre;
    const avisoImagen = document.createElement("p");
    avisoImagen.className = "admin-ayuda";
    const restaurar = () => {
        const ruta = urlImagen(registro.ruta) || registro.respaldo;
        avisoImagen.hidden = Boolean(ruta);
        avisoImagen.textContent = ruta ? "" : "Todavía no hay una foto guardada.";
        imagen.hidden = !ruta;
        if (ruta) imagen.src = ruta;
        else imagen.removeAttribute("src");
    };
    imagen.addEventListener("error", () => {
        imagen.hidden = true;
        avisoImagen.hidden = false;
        avisoImagen.textContent = "No se pudo mostrar esta imagen. Puedes seleccionar una nueva.";
    });
    restaurar();

    const formulario = document.createElement("form");
    const campos = document.createElement("fieldset");
    campos.className = "campos-imagen";
    campos.dataset.disponible = String(registro.disponible);
    campos.disabled = controles.estaOcupado() || !registro.disponible;
    const etiqueta = document.createElement("label");
    const archivo = document.createElement("input");
    archivo.id = `imagen-${registro.tipo}-${registro.id.replaceAll(".", "-")}`;
    archivo.type = "file";
    archivo.accept = "image/jpeg,image/png,image/webp";
    etiqueta.htmlFor = archivo.id;
    etiqueta.textContent = "Seleccionar nueva imagen";
    const acciones = document.createElement("div");
    acciones.className = "acciones";
    const guardar = document.createElement("button");
    guardar.type = "submit";
    guardar.textContent = "Guardar imagen";
    guardar.disabled = true;
    const cancelar = document.createElement("button");
    cancelar.type = "button";
    cancelar.className = "secundario";
    cancelar.textContent = "Descartar selección";
    cancelar.hidden = true;
    acciones.append(guardar, cancelar);
    campos.append(etiqueta, archivo, acciones);
    const estado = document.createElement("p");
    estado.className = "imagen-estado";
    estado.setAttribute("role", "status");
    estado.hidden = true;
    formulario.append(campos, estado);
    tarjeta.append(titulo, uso, imagen, avisoImagen, formulario);
    if (!registro.disponible) {
        campos.disabled = true;
        mostrarEstado(estado, "Falta configurar esta imagen en los datos iniciales del sitio.", true);
    }
    let seleccionRevision = 0;
    archivo.addEventListener("change", async () => {
        const actual = ++seleccionRevision;
        const archivoElegido = archivo.files[0];
        liberarPendiente(registro.id);
        guardar.disabled = true;
        cancelar.hidden = true;
        restaurar();
        mostrarEstado(estado, "");
        if (!archivoElegido) return;
        let url;
        try {
            await validarArchivoImagen(archivoElegido);
            url = URL.createObjectURL(archivoElegido);
            const comprobacion = new Image();
            comprobacion.src = url;
            await comprobacion.decode();
            if (actual !== seleccionRevision || !tarjeta.isConnected) {
                URL.revokeObjectURL(url);
                return;
            }
            pendientes.set(registro.id, { archivo: archivoElegido, url });
            imagen.src = url;
            imagen.hidden = false;
            avisoImagen.hidden = true;
            guardar.disabled = false;
            cancelar.hidden = false;
            mostrarEstado(estado, "Vista previa de la nueva imagen. Pulsa Guardar imagen para aplicarla.");
        } catch (error) {
            if (url) URL.revokeObjectURL(url);
            if (actual !== seleccionRevision) return;
            archivo.value = "";
            mostrarEstado(estado, error.message || "No se pudo abrir esta imagen.", true);
        }
    });
    cancelar.addEventListener("click", () => {
        seleccionRevision += 1;
        liberarPendiente(registro.id);
        formulario.reset();
        guardar.disabled = true;
        cancelar.hidden = true;
        restaurar();
        mostrarEstado(estado, "");
    });
    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const pendiente = pendientes.get(registro.id);
        if (!pendiente || controles.estaOcupado()) return;
        controles.ocupar(true);
        mostrarEstado(estado, "Guardando imagen…");
        try {
            registro = await guardarImagen(registro, pendiente.archivo);
            liberarPendiente(registro.id);
            formulario.reset();
            cancelar.hidden = true;
            restaurar();
            controles.actualizada(registro);
            mostrarEstado(estado, "Imagen guardada. Ya puedes verla en Ver sitio.");
        } catch (error) {
            mostrarEstado(estado, error.message, true);
        } finally {
            controles.ocupar(false);
            guardar.disabled = !pendientes.has(registro.id);
        }
    });
    return tarjeta;
}

export async function cargarImagenes() {
    const actual = ++revision;
    mostrarEstado(mensaje, "Cargando imágenes…");
    try {
        const registros = await listarImagenes();
        if (actual !== revision) return;
        for (const id of pendientes.keys()) liberarPendiente(id);
        lista.replaceChildren(...registros.map(crearTarjeta));
        mostrarEstado(mensaje, registros.length ? "" : "No hay imágenes configuradas.");
    } catch (error) {
        if (actual === revision) mostrarEstado(mensaje, error.message, true);
    }
}

export function iniciarImagenes(opciones) {
    controles = opciones;
    document.querySelector("#recargar-imagenes").addEventListener("click", async () => {
        if (controles.estaOcupado()) return;
        if (hayImagenesPendientes() && !confirm("¿Descartar las imágenes sin guardar y recargar?")) return;
        controles.ocupar(true);
        try { await cargarImagenes(); }
        finally { controles.ocupar(false); }
    });
}
