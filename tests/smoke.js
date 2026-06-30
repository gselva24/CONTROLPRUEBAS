const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const elements = {};

function classList() {
    const values = new Set();
    return {
        add(value) { values.add(value); },
        remove(value) { values.delete(value); },
        toggle(value, force) {
            if (force) values.add(value);
            else values.delete(value);
        },
        contains(value) { return values.has(value); }
    };
}

function element() {
    return {
        children: [],
        classList: classList(),
        className: "",
        innerHTML: "",
        value: "",
        appendChild(child) { this.children.push(child); }
    };
}

const context = vm.createContext({
    console,
    document: {
        getElementById(id) { return elements[id] || null; },
        createElement() { return element(); }
    }
});

[
    "js/state.js",
    "js/modules/empaque.js",
    "js/modules/pedidos.js",
    "js/modules/historial.js"
].forEach(file => {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
});

elements["e-pedido-cliente-select"] = element();
elements["e-pedido-cliente-select"].value = "CLI-0107-001";
elements["e-detalle-pedido-select"] = element();
elements["e-detalle-pedido-select"].value = "0";
elements["e-lote-fruta-select"] = element();

vm.runInContext(`
    detallePedidosCliente = [{
        idPedido: "CLI-0107-001",
        area: "Empaque",
        producto: "Nance",
        estadoDetalle: "Pendiente",
        visibleApp: "SI"
    }];
    pedidosPendientes = [
        { id: "L-NANCE", fruta: "Nance", visibleApp: "SI", estadoFrutas: "Finalizado", estadoEmpaqueGlobal: "Pendiente", pesoProcesado: 100 },
        { id: "L-MAMEY", fruta: "Mamey", visibleApp: "SI", estadoFrutas: "Finalizado", estadoEmpaqueGlobal: "Pendiente", pesoProcesado: 100 }
    ];
    renderEmpaqueLoteSelect();
`, context);

assert.match(elements["e-lote-fruta-select"].innerHTML, /L-NANCE/);
assert.doesNotMatch(elements["e-lote-fruta-select"].innerHTML, /L-MAMEY/);

elements["historial-pedidos-container"] = element();
elements["cards-container"] = element();

vm.runInContext(`
    pedidosCliente = [{
        idPedido: "CLI-0107-001",
        cliente: "Cliente Prueba",
        fechaCarga: "2026-07-01",
        estadoPedido: "En proceso",
        visibleApp: "SI"
    }];
    detallePedidosCliente = [{
        idPedido: "CLI-0107-001",
        area: "Empaque",
        producto: "Nance",
        presentacion: "Caja 10 lb",
        unidad: "cajas",
        cantidadPedida: 100,
        cantidadCompletada: 25,
        estadoDetalle: "Parcial",
        visibleApp: "SI"
    }];
    empaqueSesiones = [{
        idPedido: "CLI-0107-001",
        cliente: "Cliente Prueba",
        idLoteFruta: "L-NANCE",
        fruta: "Nance",
        cajasHechas: 25,
        pesoEmpacadoLb: 250,
        estadoUsoLote: "Empacado Parcial",
        sobranteLoteLb: 50,
        fecha: "2026-06-30T10:00:00Z"
    }];
    historialCompleto = [{
        id: "L-NANCE",
        nombre: "Lote Nance",
        fruta: "Nance",
        fecha: "2026-06-30",
        pesoProcesado: 300,
        pesoDisponibleEmpaque: 50,
        cajasProcesadas: 25,
        estadoFrutas: "Finalizado",
        estadoEmpaqueGlobal: "Empacado Parcial",
        visibleApp: "SI"
    }];
    renderMobileHistory();
`, context);

assert.equal(elements["historial-pedidos-container"].children.length, 1);
assert.match(elements["historial-pedidos-container"].children[0].innerHTML, /25%/);
assert.match(elements["historial-pedidos-container"].children[0].innerHTML, /L-NANCE/);
assert.equal(elements["cards-container"].children.length, 1);
assert.match(elements["cards-container"].children[0].innerHTML, /CLI-0107-001/);

elements["p-cards-container"] = element();
elements["p-admin-panel"] = element();
vm.runInContext("renderPedidosCards();", context);
assert.match(elements["p-cards-container"].innerHTML, /01-07-2026/);
assert.match(elements["p-cards-container"].innerHTML, /class="hidden px-4 pb-4/);

vm.runInContext('toggleDetallePedido("CLI-0107-001");', context);
assert.doesNotMatch(elements["p-cards-container"].innerHTML, /class="hidden px-4 pb-4/);

console.log("Smoke tests passed.");
