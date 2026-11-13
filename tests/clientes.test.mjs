import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";
import { fechaActual, validarFechaCita } from "../js/datos/fechas.js";

const fuente = (await readFile(new URL("../js/ui/clientes.js", import.meta.url), "utf8"))
    .replace(/^import .*;\r?$/gm, "").replaceAll("export ", "");

function preparar() {
    class Nodo {
        children = [];
        eventos = {};
        atributos = {};
        value = "";
        dataset = {};
        hidden = false;
        classList = { toggle() {} };
        append(...nodos) { this.children.push(...nodos); }
        replaceChildren(...nodos) { this.children = nodos; }
        addEventListener(nombre, callback) { this.eventos[nombre] = callback; }
        setAttribute(nombre, valor) { this.atributos[nombre] = valor; }
        getAttribute(nombre) { return this.atributos[nombre]; }
        get selectedOptions() { return this.children.filter((nodo) => nodo.value === this.value); }
        focus() {}
        reset() {}
        setCustomValidity() {}
    }
    const nodos = new Map();
    const nodo = (id) => {
        if (!nodos.has(id)) nodos.set(id, new Nodo());
        return nodos.get(id);
    };
    nodo("#form-cliente").elements = Object.fromEntries(
        ["nombre", "telefono", "correo", "motivo", "notas", "proximaCita", "servicio"].map((nombre) => [nombre, new Nodo()])
    );
    let filas = [{ id: "1", nombre: "Solicitud de prueba", servicio_id: "servicio", servicioNombre: "Ecografía", estado: "nueva" }];
    const pendientes = new Map();
    let secuencia = 0;
    const contexto = vm.createContext({
        document: { querySelector: nodo, createElement: () => new Nodo() },
        fechaActual, validarFechaCita, confirm: () => true,
        listarSolicitudes: async () => filas,
        listarServicios: async () => [{ id: "servicio", nombre: "Ecografía" }],
        eliminarSolicitud: async (id) => { filas = filas.filter((fila) => fila.id !== id); },
        setTimeout: (callback, espera) => { const id = ++secuencia; pendientes.set(id, { callback, espera }); return id; },
        clearTimeout: (id) => pendientes.delete(id)
    });
    vm.runInContext(fuente, contexto);
    contexto.iniciarClientes({ estaOcupado: () => false, ocupar() {} });
    return { contexto, nodo, pendientes, fila: filas[0] };
}

test("el aviso de eliminación desaparece después de cinco segundos", async () => {
    const { contexto, nodo, pendientes, fila } = preparar();
    await contexto.cargarClientes();
    contexto.abrirDetalle(fila);
    await nodo("#eliminar-cliente").eventos.click();
    assert.match(nodo("#mensaje-clientes").textContent, /Solicitud de prueba se eliminó/);
    const temporizador = [...pendientes.values()][0];
    assert.equal(temporizador.espera, 5000);
    temporizador.callback();
    assert.equal(nodo("#mensaje-clientes").hidden, true);
});

test("un aviso nuevo cancela el temporizador anterior", async () => {
    const { contexto, nodo, pendientes, fila } = preparar();
    await contexto.cargarClientes();
    contexto.abrirDetalle(fila);
    await nodo("#eliminar-cliente").eventos.click();
    contexto.mostrarMensaje("Error de conexión", true);
    assert.equal(pendientes.size, 0);
    assert.equal(nodo("#mensaje-clientes").textContent, "Error de conexión");
    assert.equal(nodo("#mensaje-clientes").hidden, false);
});
