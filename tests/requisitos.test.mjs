import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { agruparRequisitos, etiquetaVariante, prepararEdicionRequisitos, textoVariante } from "../js/datos/requisitos.js";

function registros() {
    return ["Ecografía gestacional", "Ultrasonido abdominal", "Ultrasonido de urgencia"].flatMap((nombre, i) =>
        [1, 2, 3, 4].map((orden) => ({ id: `${i}-${orden}`, servicio_id: String(i), servicios: { nombre }, orden,
            texto: orden === 1 ? (i === 1 ? "Ayuno de 8-12 horas." : "Ayuno: consulte con nosotros.")
                : ({ 2: "Vejiga llena: indicaciones comunes.", 3: "Afeitado: indicaciones comunes.", 4: "Historial clínico: indicaciones comunes." })[orden] })));
}

test("doce registros se muestran como cuatro categorías, sin perder sus asociaciones", () => {
    const grupos = agruparRequisitos(registros());
    assert.deepEqual(grupos.map((grupo) => grupo.nombre), ["Ayuno", "Vejiga llena", "Afeitado", "Historial clínico"]);
    assert.equal(grupos[0].variantes.length, 2);
    assert.equal(etiquetaVariante(grupos[0], grupos[0].variantes[0]), "Ultrasonido abdominal");
    assert.equal(etiquetaVariante(grupos[0], grupos[0].variantes[1]), "Otros estudios");
    assert.equal(grupos[1].variantes[0].registros.length, 3);
    assert.equal(textoVariante(grupos[1], grupos[1].variantes[0]), "Indicaciones comunes.");
});

test("un requisito común genera un único cambio para sus tres servicios", () => {
    const grupo = agruparRequisitos(registros())[1];
    const cambios = prepararEdicionRequisitos(grupo, { "requisito-0": "Nueva indicación" });
    assert.equal(cambios.length, 1);
    assert.deepEqual(cambios[0].ids, ["0-2", "1-2", "2-2"]);
});

test("el ayuno conserva campos independientes y se validan todos antes de guardar", () => {
    const grupo = agruparRequisitos(registros())[0];
    assert.throws(() => prepararEdicionRequisitos(grupo, { "requisito-0": "Cambio abdominal", "requisito-1": " " }), /1 y 3000/);
    const cambios = prepararEdicionRequisitos(grupo, { "requisito-0": grupo.variantes[0].texto, "requisito-1": "Nueva indicación para otros" });
    assert.deepEqual(cambios[0].ids, ["0-1", "2-1"]);
});

test("indicaciones diferentes de un requisito no se fusionan ni se pierden", () => {
    const filas = registros();
    filas.find((fila) => fila.id === "0-2").texto = "Otra indicación";
    assert.equal(agruparRequisitos(filas)[1].variantes.length, 2);
});

test("el ayuno abdominal sigue siendo independiente aunque tenga el mismo texto que otros estudios", () => {
    const filas = registros();
    for (const fila of filas.filter((item) => item.orden === 1)) fila.texto = "Consultar con la clínica.";
    const ayuno = agruparRequisitos(filas)[0];
    assert.equal(ayuno.variantes.length, 2);
    assert.equal(ayuno.variantes[0].registros.length, 1);
    assert.equal(ayuno.variantes[1].registros.length, 2);
});

const origen = new URL("../js/data/servicios.js", import.meta.url);
const fuente = (await readFile(origen, "utf8"))
    .replace('import { supabase } from "../config/supabase.js";', "const supabase = globalThis.__pruebaRequisitos;")
    .replace('"../datos/requisitos.js"', JSON.stringify(new URL("../js/datos/requisitos.js", import.meta.url).href));
let secuencia = 0;
async function modulo(fallas = false) {
    const escrituras = [];
    globalThis.__pruebaRequisitos = { from(tabla) {
        let ids;
        const consulta = { update(valores) { escrituras.push({ tabla, valores }); return this; },
            in(campo, valores) { ids = valores; escrituras.at(-1).ids = valores; return this; },
            eq() { return this; }, async select() {
                return fallas ? { data: null, error: { code: "42501" } } : { data: ids.map((id) => ({ id })), error: null };
            } };
        return consulta;
    } };
    const api = await import(`data:text/javascript;base64,${Buffer.from(`${fuente}\n//${++secuencia}`).toString("base64")}`);
    return { api, escrituras };
}

test("guardar un requisito común actualiza todas sus copias en una sola petición", async () => {
    const { api, escrituras } = await modulo();
    await api.actualizarRequisitos(agruparRequisitos(registros())[2], { "requisito-0": "Nueva preparación" });
    assert.equal(escrituras.length, 1);
    assert.equal(escrituras[0].tabla, "requisitos_servicio");
    assert.equal(escrituras[0].ids.length, 3);
});

test("un fallo de guardado requiere recargar y no comunica éxito", async () => {
    const { api } = await modulo(true);
    await assert.rejects(api.actualizarRequisitos(agruparRequisitos(registros())[2], { "requisito-0": "Cambio" }),
        (error) => error.recargarRequisitos === true && /guardado completo/.test(error.message));
});
