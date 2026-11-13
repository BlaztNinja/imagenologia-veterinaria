import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const origen = new URL("../js/data/imagenes.js", import.meta.url);
const fuente = (await readFile(origen, "utf8"))
    .replace('import { supabase } from "../config/supabase.js";', 'const supabase = globalThis.__clienteImagenesPrueba;')
    .replaceAll("import.meta.url", JSON.stringify(origen.href));
let numero = 0;
async function cargar(cliente) {
    globalThis.__clienteImagenesPrueba = cliente;
    return import(`data:text/javascript;base64,${Buffer.from(`${fuente}\n// prueba ${++numero}`).toString("base64")}`);
}
const png = () => new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "imagen.png", { type: "image/png" });
const original = { id: "inicio.imagen", tipo: "contenido", ruta: "inicio/original.webp", disponible: true };
function cliente({ errorCarga = null, errorDatos = null, sinFila = false } = {}) {
    const llamadas = [];
    return { llamadas, storage: { from(bucket) {
        return { async upload(ruta, archivo, opciones) {
            llamadas.push({ operacion: "upload", bucket, ruta, opciones });
            return { error: errorCarga };
        } };
    } }, from(tabla) {
        const consulta = {
            update(cambios) { llamadas.push({ operacion: "update", tabla, cambios }); return this; },
            eq(campo, valor) { llamadas.push({ operacion: "eq", campo, valor }); return this; },
            is(campo, valor) { llamadas.push({ operacion: "is", campo, valor }); return this; },
            select() { return this; },
            async maybeSingle() { return { data: sinFila ? null : { clave: original.id }, error: errorDatos }; }
        };
        return consulta;
    } };
}

test("rechaza archivos inválidos o demasiado grandes antes de subirlos", async () => {
    const mock = cliente();
    const { guardarImagen } = await cargar(mock);
    await assert.rejects(guardarImagen(original, new File(["texto"], "falso.png", { type: "image/png" })), /formato/);
    await assert.rejects(guardarImagen(original, new File(["svg"], "logo.svg", { type: "image/svg+xml" })), /JPEG/);
    await assert.rejects(guardarImagen(original, new File([new Uint8Array(5 * 1024 * 1024 + 1)], "grande.png", { type: "image/png" })), /5 MB/);
    assert.equal(mock.llamadas.length, 0);
});

test("guarda en una ruta nueva y compara la referencia anterior", async () => {
    const mock = cliente();
    const { guardarImagen } = await cargar(mock);
    const guardada = await guardarImagen(original, png());
    assert.match(guardada.ruta, /^inicio\/[\w-]+\.png$/);
    assert.notEqual(guardada.ruta, original.ruta);
    assert.equal(mock.llamadas[0].opciones.upsert, false);
    assert.equal(mock.llamadas[0].bucket, "imagenologia");
    assert.ok(mock.llamadas.some((paso) => paso.operacion === "eq" && paso.campo === "imagen_ruta" && paso.valor === original.ruta));
});

test("no cambia la referencia si Storage rechaza la carga", async () => {
    const mock = cliente({ errorCarga: { message: "sin permiso" } });
    const { guardarImagen } = await cargar(mock);
    await assert.rejects(guardarImagen(original, png()), /subir/);
    assert.equal(mock.llamadas.filter((paso) => paso.operacion === "update").length, 0);
});

test("no informa éxito si otra sesión cambió la imagen", async () => {
    const mock = cliente({ sinFila: true });
    const { guardarImagen } = await cargar(mock);
    await assert.rejects(guardarImagen(original, png()), /otra sesión/);
});

test("permite asignar la primera foto de un integrante", async () => {
    const mock = cliente();
    const { guardarImagen } = await cargar(mock);
    const resultado = await guardarImagen({ id: "integrante", tipo: "equipo", ruta: null, disponible: true }, png());
    assert.match(resultado.ruta, /^equipo\//);
    assert.ok(mock.llamadas.some((paso) => paso.operacion === "update" && paso.tabla === "equipo" && paso.cambios.foto_ruta));
    assert.ok(mock.llamadas.some((paso) => paso.operacion === "is" && paso.campo === "foto_ruta" && paso.valor === null));
});

test("una respuesta incierta exige recargar antes de reintentar", async () => {
    const mock = cliente({ errorDatos: { message: "conexión interrumpida" } });
    const { guardarImagen } = await cargar(mock);
    await assert.rejects(guardarImagen(original, png()), /no se pudo confirmar/);
    assert.equal(original.ruta, "inicio/original.webp");
});
