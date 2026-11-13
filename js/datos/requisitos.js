const TITULOS = { 1: "Ayuno", 2: "Vejiga llena", 3: "Afeitado", 4: "Historial clínico" };

export function agruparRequisitos(registros) {
    const grupos = new Map();
    for (const registro of registros) {
        const orden = Number(registro.orden);
        if (!grupos.has(orden)) grupos.set(orden, {
            id: `requisito-${orden}`, orden, nombre: TITULOS[orden] ?? `Requisito ${orden}`, variantes: []
        });
        const grupo = grupos.get(orden);
        const nombre = registro.servicios?.nombre ?? registro.nombre ?? "Servicio";
        const categoria = orden === 1 ? (/abdominal/i.test(nombre) ? "abdominal" : "otros") : "comun";
        let variante = grupo.variantes.find((item) => item.texto === registro.texto && item.categoria === categoria);
        if (!variante) {
            variante = { texto: registro.texto, categoria, registros: [], servicios: [] };
            grupo.variantes.push(variante);
        }
        variante.registros.push(registro);
        if (!variante.servicios.includes(nombre)) variante.servicios.push(nombre);
    }
    const resultado = [...grupos.values()].sort((a, b) => a.orden - b.orden);
    for (const grupo of resultado) {
        if (grupo.orden === 1) grupo.variantes.sort((a, b) =>
            Number(b.servicios.some((nombre) => /abdominal/i.test(nombre)))
            - Number(a.servicios.some((nombre) => /abdominal/i.test(nombre))));
    }
    return resultado;
}

export function textoVariante(grupo, variante) {
    const prefijo = `${grupo.nombre}:`;
    if (variante.texto.toLocaleLowerCase("es").startsWith(prefijo.toLocaleLowerCase("es"))) {
        const texto = variante.texto.slice(prefijo.length).trim();
        return texto.charAt(0).toLocaleUpperCase("es") + texto.slice(1);
    }
    return variante.texto;
}

export function etiquetaVariante(grupo, variante) {
    if (grupo.orden !== 1 && grupo.variantes.length === 1) return "";
    const otros = grupo.variantes.filter((item) => !item.servicios.some((nombre) => /abdominal/i.test(nombre)));
    if (grupo.orden === 1 && otros.length === 1 && otros[0] === variante) return "Otros estudios";
    return variante.servicios.join(" · ");
}

export function prepararEdicionRequisitos(grupo, valores) {
    if (!grupo?.variantes?.length) throw new Error("No hay requisitos para editar.");
    // Validar todos los campos antes de enviar cualquier cambio.
    return grupo.variantes.map((variante, indice) => {
        const texto = String(valores[`requisito-${indice}`] ?? "").trim();
        if (!texto || texto.length > 3000) {
            throw new Error("Cada indicación debe tener entre 1 y 3000 caracteres.");
        }
        return { anterior: variante.texto, texto, ids: variante.registros.map((fila) => fila.id) };
    }).filter((cambio) => cambio.texto !== cambio.anterior);
}
