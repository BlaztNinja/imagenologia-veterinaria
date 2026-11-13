import assert from "node:assert/strict";
import { test } from "node:test";
import { fechaActual, validarFechaCita } from "../js/datos/fechas.js";

const ahora = new Date("2026-11-13T03:00:00Z");

test("el día de referencia corresponde a El Salvador, aunque UTC ya cambió de día", () => {
    assert.equal(fechaActual(ahora), "2026-11-12");
});
test("acepta hoy, una fecha futura y una cita sin fecha", () => {
    assert.equal(validarFechaCita("2026-11-12", ahora), "2026-11-12");
    assert.equal(validarFechaCita("2027-01-01", ahora), "2027-01-01");
    assert.equal(validarFechaCita("", ahora), null);
});
test("rechaza fechas anteriores y días inexistentes", () => {
    assert.throws(() => validarFechaCita("2026-11-11", ahora), /hoy/);
    assert.throws(() => validarFechaCita("2027-02-29", ahora), /no es válida/);
    assert.throws(() => validarFechaCita("2027-13-01", ahora), /no es válida/);
    assert.equal(validarFechaCita("2028-02-29", ahora), "2028-02-29");
});
