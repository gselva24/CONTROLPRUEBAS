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
    "js/modules/frutas.js",
    "js/modules/empaque.js",
    "js/modules/pedidos.js",
    "js/modules/historial.js"
].forEach(file => {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
});

elements["f-pedido-parcial-select"] = element();

vm.runInContext(`
    pedidosParciales = [{
        id: "0107-PR-001",
        nombre: "Lote de prueba",
        fruta: "Nance",
        estadoFrutas: "Pausado",
        visibleApp: "SI"
    }];
    renderParcialesSelect();
`, context);

assert.match(elements["f-pedido-parcial-select"].innerHTML, /0107-PR-001 - Nance - Lote de prueba \(Pausado\)/);

elements["e-pedido-cliente-select"] = element();
elements["e-pedido-cliente-select"].value = "CLI-0107-001";
elements["e-detalle-pedido-select"] = element();
elements["e-detalle-pedido-select"].value = "LIN-001";
elements["e-lote-fruta-select"] = element();

vm.runInContext(`
    detallePedidosCliente = [
        {
            idPedido: "CLI-0107-001",
            idLinea: "LIN-001",
            area: "Empaque",
            producto: "NANCE 12x15 oz.",
            productoBaseProduccion: "Nance",
            estadoDetalle: "Pendiente",
            visibleApp: "SI"
        },
        {
            idPedido: "CLI-0107-001",
            idLinea: "LIN-002",
            area: "Empaque",
            producto: "NANCE 12x15 oz.",
            productoBaseProduccion: "Nance",
            estadoDetalle: "Pendiente",
            visibleApp: "SI"
        }
    ];
    pedidosPendientes = [
        { id: "L-NANCE", fruta: "Nance", visibleApp: "SI", estadoFrutas: "Finalizado", estadoEmpaqueGlobal: "Pendiente", pesoProcesado: 100 },
        { id: "L-MAMEY", fruta: "Mamey", visibleApp: "SI", estadoFrutas: "Finalizado", estadoEmpaqueGlobal: "Pendiente", pesoProcesado: 100 }
    ];
    renderEmpaqueLoteSelect();
`, context);

assert.match(elements["e-lote-fruta-select"].innerHTML, /L-NANCE/);
assert.doesNotMatch(elements["e-lote-fruta-select"].innerHTML, /L-MAMEY/);
elements["e-detalle-pedido-select"].value = "LIN-002";
assert.equal(vm.runInContext("buscarDetalleEmpaqueSeleccionado().idLinea", context), "LIN-002");

elements["p-cliente-select"] = element();
elements["p-cliente-select"].value = "CLI-UUID";
elements["p-linea-producto-cliente"] = element();
elements["p-linea-producto-info"] = element();
elements["p-linea-cantidad"] = element();
elements["p-lineas-form"] = element();

vm.runInContext(`
    clientesCatalog = [{
        idCliente: "CLI-UUID",
        codigo: "CLI",
        nombre: "Cliente Prueba",
        visibleApp: "SI"
    }];
    productosCatalog = [{
        idProducto: "PROD-UUID",
        nombreBase: "Nance",
        presentacion: "12x15 oz.",
        area: "Empaque",
        productoBaseProduccion: "Nance",
        visibleApp: "SI"
    }];
    productosClienteCatalog = [{
        idProductoCliente: "SKU-UUID",
        idCliente: "CLI-UUID",
        idProducto: "PROD-UUID",
        nombreComercial: "NANCE DIAMOND ROCK 12x15 oz.",
        visibleApp: "SI"
    }];
    renderProductosPedidoSelect();
`, context);

assert.match(elements["p-linea-producto-cliente"].innerHTML, /NANCE DIAMOND ROCK/);
elements["p-linea-producto-cliente"].value = "SKU-UUID";
elements["p-linea-cantidad"].value = "12";
vm.runInContext("actualizarInfoProductoPedido(); agregarLineaPedido();", context);
const lineaCatalogo = JSON.parse(vm.runInContext("JSON.stringify(pedidoLineasForm[0])", context));
assert.equal(lineaCatalogo.idProductoCliente, "SKU-UUID");
assert.equal(lineaCatalogo.productoBaseProduccion, "Nance");
assert.equal(lineaCatalogo.cantidadPedida, 12);
assert.equal(lineaCatalogo.unidad, "cajas");

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
    empaqueSesiones = [
        {
            idPedido: "CLI-0107-001",
            cliente: "Cliente Prueba",
            idLoteFruta: "L-NANCE",
            fruta: "Nance",
            cajasHechas: 25,
            pesoEmpacadoLb: 250,
            estadoUsoLote: "Empacado Parcial",
            sobranteLoteLb: 50,
            fecha: "2026-06-30T10:00:00Z",
            estadoRegistro: "Activa"
        },
        {
            idPedido: "PEDIDO-CANCELADO",
            cliente: "Cliente Cancelado",
            idLoteFruta: "L-NANCE",
            fruta: "Nance",
            cajasHechas: 10,
            pesoEmpacadoLb: 100,
            estadoUsoLote: "Empacado Parcial",
            fecha: "2026-06-30T09:00:00Z",
            estadoRegistro: "Revertida"
        }
    ];
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

assert.equal(elements["cards-container"].children.length, 1);
assert.match(elements["cards-container"].children[0].innerHTML, /CLI-0107-001/);
assert.doesNotMatch(elements["cards-container"].children[0].innerHTML, /PEDIDO-CANCELADO/);
assert.match(elements["cards-container"].children[0].innerHTML, /class="hidden grid-cols-2/);

vm.runInContext("isAdmin = true; renderMobileHistory();", context);
assert.match(elements["cards-container"].children[0].innerHTML, /class="grid grid-cols-2/);
assert.match(elements["cards-container"].children[0].innerHTML, /gerenteOcultarLoteApp\('L-NANCE'\)/);
assert.match(elements["cards-container"].children[0].innerHTML, /gerenteBorrarLoteTotal\('L-NANCE'\)/);

elements["p-cards-container"] = element();
elements["p-admin-panel"] = element();
vm.runInContext("renderPedidosCards();", context);
assert.match(elements["p-cards-container"].innerHTML, /01-07-2026/);
assert.match(elements["p-cards-container"].innerHTML, /class="hidden px-4 pb-4/);

vm.runInContext('toggleDetallePedido("CLI-0107-001");', context);
assert.doesNotMatch(elements["p-cards-container"].innerHTML, /class="hidden px-4 pb-4/);

console.log("Smoke tests passed.");
