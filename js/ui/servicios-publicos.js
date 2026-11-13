import { listarServiciosPublicos, listarRequisitosPublicos } from "../datos/servicios.js?v=2";
import { agruparRequisitos, etiquetaVariante, textoVariante } from "../datos/requisitos.js";

async function cargarServiciosPublicos() {
    const listaServicios = document.querySelector(".servicios-grid");
    const listaRequisitos = document.querySelector(".requirements .lista");
    const enlaceOriginal = listaServicios.querySelector("a");
    try {
        const [servicios, requisitos] = await Promise.all([listarServiciosPublicos(), listarRequisitosPublicos()]);
        const tarjetas = servicios.map((servicio) => {
            const tarjeta = document.createElement("article");
            tarjeta.className = "servicio-card";
            const nombre = document.createElement("h3");
            nombre.textContent = servicio.nombre;
            const descripcion = document.createElement("p");
            descripcion.textContent = servicio.descripcion;
            const detalles = document.createElement("ul");
            for (const texto of servicio.detalles ?? []) {
                const detalle = document.createElement("li");
                detalle.textContent = texto;
                detalles.append(detalle);
            }
            const precio = document.createElement("p");
            precio.className = "servicio-precio";
            precio.textContent = new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(servicio.precio);
            tarjeta.append(nombre, descripcion, detalles, precio);
            if (enlaceOriginal) {
                const enlace = enlaceOriginal.cloneNode(true);
                enlace.setAttribute("aria-label", `Consultar sobre ${servicio.nombre}`);
                tarjeta.append(enlace);
            }
            return tarjeta;
        });
        const grupos = agruparRequisitos(requisitos).map((grupo) => {
            const fila = document.createElement("li");
            const nombre = document.createElement("strong");
            nombre.textContent = grupo.nombre;
            fila.append(nombre);
            if (grupo.orden !== 1 && grupo.variantes.length === 1) {
                const texto = document.createElement("span");
                texto.textContent = textoVariante(grupo, grupo.variantes[0]);
                fila.append(texto);
            } else {
                const variantes = document.createElement("ul");
                variantes.className = "sublista";
                for (const variante of grupo.variantes) {
                    const item = document.createElement("li");
                    const etiqueta = etiquetaVariante(grupo, variante);
                    item.textContent = `${etiqueta ? `${etiqueta}: ` : ""}${textoVariante(grupo, variante)}`;
                    variantes.append(item);
                }
                fila.append(variantes);
            }
            return fila;
        });
        listaServicios.replaceChildren(...tarjetas);
        listaRequisitos.replaceChildren(...grupos);
    } catch (error) {
        console.error("No se pudo actualizar Servicios. Se conserva el contenido original.", error);
    }
}

cargarServiciosPublicos();
