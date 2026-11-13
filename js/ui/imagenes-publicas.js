import { leerImagenesSitio, listarEquipoPublico, urlImagen } from "../data/imagenes.js";

function aplicarImagen(imagen, ruta) {
    if (!ruta) return;
    const original = imagen.src;
    imagen.addEventListener("error", () => { imagen.src = original; }, { once: true });
    imagen.src = urlImagen(ruta);
}

async function cargarImagenesPublicas() {
    const imagenes = [...document.querySelectorAll("img[data-imagen]")];
    if (!imagenes.length) return;
    try {
        const bloques = await leerImagenesSitio([...new Set(imagenes.map((nodo) => nodo.dataset.imagen))]);
        for (const imagen of imagenes) {
            aplicarImagen(imagen, bloques.find((bloque) => bloque.clave === imagen.dataset.imagen)?.imagen_ruta);
        }
    } catch (error) {
        console.error("No se pudieron actualizar las imágenes; se conservan las imágenes locales.", error);
    }
}

async function cargarEquipo() {
    const lista = document.querySelector("[data-equipo]");
    if (!lista) return;
    try {
        const equipo = await listarEquipoPublico();
        if (!equipo.length) return;
        const original = lista.querySelector("img")?.src;
        lista.replaceChildren(...equipo.map((persona) => {
            const tarjeta = document.createElement("div");
            tarjeta.className = "team-card";
            const avatar = document.createElement("div");
            avatar.className = "team-avatar";
            const foto = document.createElement("img");
            foto.className = "team-img";
            foto.alt = persona.nombre;
            if (original) foto.src = original;
            aplicarImagen(foto, persona.foto_ruta);
            avatar.append(foto);
            const nombre = document.createElement("h4");
            nombre.textContent = persona.nombre;
            const cargo = document.createElement("p");
            cargo.className = "team-role";
            cargo.textContent = persona.cargo;
            const descripcion = document.createElement("p");
            descripcion.className = "team-bio";
            descripcion.textContent = persona.descripcion;
            tarjeta.append(avatar, nombre, cargo, descripcion);
            return tarjeta;
        }));
    } catch (error) {
        console.error("No se pudieron actualizar las fotos del equipo.", error);
    }
}

cargarImagenesPublicas();
cargarEquipo();
