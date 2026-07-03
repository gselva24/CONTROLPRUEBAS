const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class MockRange {
    constructor(sheet, row, column, rows = 1, columns = 1) {
        this.sheet = sheet;
        this.row = row;
        this.column = column;
        this.rows = rows;
        this.columns = columns;
    }

    getValue() {
        return this.getValues()[0][0];
    }

    getValues() {
        const values = [];
        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.columns; c++) {
                row.push(this.sheet.valueAt(this.row + r, this.column + c));
            }
            values.push(row);
        }
        return values;
    }

    setValue(value) {
        this.sheet.setValueAt(this.row, this.column, value);
        return this;
    }

    setValues(values) {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.columns; c++) {
                this.sheet.setValueAt(this.row + r, this.column + c, values[r][c]);
            }
        }
        return this;
    }
}

class MockSheet {
    constructor(rows) {
        this.rows = rows.map(row => [...row]);
    }

    valueAt(row, column) {
        return (this.rows[row - 1] || [])[column - 1] ?? "";
    }

    setValueAt(row, column, value) {
        while (this.rows.length < row) this.rows.push([]);
        while (this.rows[row - 1].length < column) this.rows[row - 1].push("");
        this.rows[row - 1][column - 1] = value;
    }

    getDataRange() {
        return new MockRange(this, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn()));
    }

    getRange(row, column, rows = 1, columns = 1) {
        return new MockRange(this, row, column, rows, columns);
    }

    getLastRow() {
        return this.rows.length;
    }

    getLastColumn() {
        return this.rows.reduce((max, row) => Math.max(max, row.length), 0);
    }

    appendRow(row) {
        this.rows.push([...row]);
    }

    deleteRow(row) {
        this.rows.splice(row - 1, 1);
    }

    clearContents() {
        this.rows = [];
    }
}

class MockSpreadsheet {
    constructor(sheets) {
        this.sheets = sheets;
    }

    getSheetByName(name) {
        return this.sheets[name] || null;
    }

    getSheets() {
        return Object.values(this.sheets);
    }

    insertSheet(name) {
        this.sheets[name] = new MockSheet([]);
        return this.sheets[name];
    }

    getId() {
        return "TEST-SPREADSHEET";
    }
}

const sessionHeaders = [
    "ID_Sesion_Empaque", "Fecha", "ID_Pedido_Cliente", "Cliente", "Codigo_Cliente",
    "Area_Detalle", "Producto_Detalle", "Presentacion_Detalle", "Unidad", "Cajas_Hechas",
    "Presentacion_Lb", "ID_Lote_Fruta", "Fruta", "Estado_Uso_Lote", "Sobrante_Lote_Lb",
    "Responsable", "Nota", "Estado_Registro", "Fecha_Reversion", "Motivo_Reversion"
];

const sheets = {
    Clientes: new MockSheet([
        ["Codigo_Cliente", "Nombre_Cliente", "Visible_App"],
        ["C1", "Cliente 1", "SI"],
        ["C2", "Cliente 2", "SI"]
    ]),
    Pedidos_Cliente: new MockSheet([
        ["ID_Pedido", "Fecha_Creacion", "Cliente", "Codigo_Cliente", "Fecha_Carga", "Estado_Pedido", "Visible_App", "Nota"],
        ["P1", "2026-06-30", "Cliente 1", "C1", "2026-07-01", "En proceso", "SI", ""],
        ["P2", "2026-06-30", "Cliente 2", "C2", "2026-07-01", "En proceso", "SI", ""]
    ]),
    Detalle_Pedido_Cliente: new MockSheet([
        ["ID_Pedido", "Area", "Producto", "Presentacion", "Unidad", "Cantidad_Pedida", "Cantidad_Completada", "Estado_Detalle", "Visible_App", "Nota"],
        ["P1", "Empaque", "Nance", "Caja 10 lb", "cajas", 10, 5, "Parcial", "SI", ""],
        ["P2", "Empaque", "Nance", "Caja 10 lb", "cajas", 10, 3, "Parcial", "SI", ""]
    ]),
    Pedidos_Fruta: new MockSheet([
        ["ID", "Fecha", "Nombre_Pedido", "Proveedor_Iniciales", "Fruta", "Peso_Neto_Entrada_Lb", "Peso_Neto_Final_Lb", "Rendimiento_Peso", "Estado_Frutas", "Peso_Averia_Lb", "Peso_Desecho_Lb", "Nota_Final", "Estado_Empaque", "Visible_App", "Peso_Disponible_Empaque_Lb"],
        ["L1", "2026-06-30", "Lote Nance", "PR", "Nance", 100, 100, 1, "Finalizado", 0, 0, "", "Empacado Total", "SI", 0]
    ]),
    Empaque_Sesiones: new MockSheet([
        sessionHeaders,
        ["EMP-001", "2026-06-30", "P1", "Cliente 1", "C1", "Empaque", "Nance", "Caja 10 lb", "cajas", 5, 10, "L1", "Nance", "Empacado Parcial", 50, "OP", "", "Activa", "", ""],
        ["EMP-002", "2026-06-30", "P2", "Cliente 2", "C2", "Empaque", "Nance", "Caja 10 lb", "cajas", 3, 10, "L1", "Nance", "Empacado Total", 0, "OP", "", "Activa", "", ""]
    ]),
    Empaque_Salidas: new MockSheet([
        ["ID", "Nombre_Pedido", "Fruta", "Fecha_Empaque", "Cajas", "Estado_Empaque"],
        ["L1", "P2", "Nance", "2026-06-30", 8, "Empacado Total"]
    ]),
    Control_Materia_Prima: new MockSheet([
        ["ID", "Pedido", "Fruta", "Total_Peso_Procesado_Lb", "Total_Cajas", "Peso_Por_Caja"],
        ["L1", "Lote Nance", "Nance", 100, 8, 12.5]
    ])
};

const spreadsheet = new MockSpreadsheet(sheets);
const properties = {};
let uuidSequence = 0;
const context = vm.createContext({
    console,
    ContentService: {
        MimeType: { JSON: "application/json" },
        createTextOutput(text) {
            return {
                text,
                setMimeType() { return this; }
            };
        }
    },
    LockService: {
        getScriptLock() {
            return {
                waitLock() {},
                releaseLock() {}
            };
        }
    },
    Utilities: {
        getUuid() {
            uuidSequence += 1;
            return `uuid-${uuidSequence}`;
        },
        formatDate(value) { return String(value); }
    },
    Session: {
        getScriptTimeZone() { return "America/Guatemala"; }
    },
    PropertiesService: {
        getScriptProperties() {
            return {
                getProperty(key) { return properties[key] || null; },
                setProperty(key, value) { properties[key] = value; }
            };
        }
    },
    SpreadsheetApp: {
        getActiveSpreadsheet() {
            return spreadsheet;
        }
    }
});

const codePath = path.resolve(__dirname, "../apps-script/Code.gs");
vm.runInContext(fs.readFileSync(codePath, "utf8"), context, { filename: "Code.gs" });

vm.runInContext(
    "asegurarEstructuraTecnica_(SpreadsheetApp.getActiveSpreadsheet(), true)",
    context
);

assert.match(sheets.Clientes.valueAt(2, 4), /^uuid-/);
assert.match(sheets.Pedidos_Cliente.valueAt(2, 9), /^uuid-/);
assert.match(sheets.Detalle_Pedido_Cliente.valueAt(2, 11), /^uuid-/);
assert.match(sheets.Pedidos_Fruta.valueAt(2, 16), /^uuid-/);
assert.equal(sheets.Asignaciones_Pedido.getLastRow(), 3);

const productAreaResponse = vm.runInContext(`doPost({
    postData: {
        contents: JSON.stringify({
            action: "guardarProductoGeneral",
            nombreBase: "Rigua con queso",
            presentacion: "30x5x3.2 oz.",
            area: "Planchas",
            productoBaseProduccion: "Nance",
            unidadProduccion: "unidad"
        })
    }
})`, context);
const productAreaData = JSON.parse(productAreaResponse.text);
assert.equal(productAreaData.status, "success");
assert.equal(sheets.Productos.valueAt(2, 5), "Rigua con queso");

const firstResult = vm.runInContext(
    'revertirAsignacionesPedidoCliente_(SpreadsheetApp.getActiveSpreadsheet(), "P1", "Pedido cancelado")',
    context
);

assert.equal(firstResult.length, 1);
assert.equal(firstResult[0].pesoReincorporadoLb, 50);
assert.equal(sheets.Empaque_Sesiones.valueAt(2, 18), "Revertida");
assert.equal(sheets.Asignaciones_Pedido.valueAt(2, 10), "Revertida");
assert.equal(sheets.Asignaciones_Pedido.valueAt(3, 10), "Activa");
assert.equal(sheets.Pedidos_Fruta.valueAt(2, 15), 50);
assert.equal(sheets.Pedidos_Fruta.valueAt(2, 13), "Empacado Parcial");
assert.equal(sheets.Empaque_Salidas.valueAt(2, 5), 3);
assert.equal(sheets.Control_Materia_Prima.valueAt(2, 5), 3);

const secondResult = vm.runInContext(
    'revertirAsignacionesPedidoCliente_(SpreadsheetApp.getActiveSpreadsheet(), "P1", "Pedido cancelado")',
    context
);

assert.equal(secondResult.length, 0);
assert.equal(sheets.Pedidos_Fruta.valueAt(2, 15), 50);

const idLineaP2 = sheets.Detalle_Pedido_Cliente.valueAt(3, 11);
const response = vm.runInContext(`doPost({
    postData: {
        contents: JSON.stringify({
            action: "registroEmpaquePedido",
            idPedidoCliente: "P2",
            idLinea: "${idLineaP2}",
            idLoteFruta: "L1",
            cajas: 1,
            presentacionLb: 10,
            estadoUsoLote: "Empacado Parcial",
            sobranteLoteLb: 40,
            responsable: "OP",
            nota: "Prueba UUID",
            fecha: "2026-06-30"
        })
    }
})`, context);
const responseData = JSON.parse(response.text);

assert.equal(responseData.status, "success");
assert.equal(sheets.Detalle_Pedido_Cliente.valueAt(3, 7), 4);
assert.equal(sheets.Pedidos_Fruta.valueAt(2, 15), 40);
assert.equal(sheets.Empaque_Sesiones.getLastRow(), 4);
assert.equal(sheets.Empaque_Sesiones.valueAt(4, 21), idLineaP2);
assert.match(sheets.Empaque_Sesiones.valueAt(4, 22), /^uuid-/);
assert.equal(sheets.Asignaciones_Pedido.getLastRow(), 4);
assert.equal(sheets.Asignaciones_Pedido.valueAt(4, 4), idLineaP2);
assert.equal(sheets.Asignaciones_Pedido.valueAt(4, 10), "Activa");

const idClienteC1 = sheets.Clientes.valueAt(2, 4);
sheets.Productos.appendRow([
    "PROD-TAMAL", "Tamal Pisque", "12x4x6.35 oz.", "Tamales", "Tamal Pisque", "SI", "2026-07-01", "unidad"
]);
sheets.Productos_Cliente.appendRow([
    "SKU-TAMAL", idClienteC1, "C1", "PROD-TAMAL", "TAMAL PISQUE 12x4x6.35 oz.", "SI", "2026-07-01"
]);
sheets.Pedidos_Cliente.appendRow([
    "P3", "2026-07-01", "Cliente 1", "C1", "2026-07-02", "Abierto", "SI", "", "PED-TECH-P3", idClienteC1
]);
sheets.Detalle_Pedido_Cliente.appendRow([
    "P3", "Tamales", "TAMAL PISQUE 12x4x6.35 oz.", "12x4x6.35 oz.", "cajas",
    12, 0, "Pendiente", "SI", "", "LINE-P3", "PED-TECH-P3", "SKU-TAMAL", "PROD-DESTINO", "Tamal Pisque"
]);

const productionResponse = vm.runInContext(`doPost({
    postData: {
        contents: JSON.stringify({
            action: "registroProduccionArea",
            area: "Tamales",
            idCliente: "${idClienteC1}",
            idProductoCliente: "SKU-TAMAL",
            unidadesFuncionales: 1900,
            unidadesAveria: 100,
            responsable: "Supervisor Tamales",
            nota: "Prueba de produccion",
            fecha: "2026-07-01"
        })
    }
})`, context);
const productionData = JSON.parse(productionResponse.text);

assert.equal(productionData.status, "success");
assert.match(productionData.codigoProduccion, /^TAM-\d{4}-001$/);
assert.equal(sheets.Produccion_Areas.valueAt(2, 12), 1900);
assert.equal(sheets.Produccion_Areas.valueAt(2, 13), 100);
assert.equal(sheets.Produccion_Areas.valueAt(2, 14), 2000);
assert.equal(sheets.Produccion_Areas.valueAt(2, 15), 1900);
assert.equal(sheets.Produccion_Areas.valueAt(2, 16), 100);

const packingProductionResponse = vm.runInContext(`doPost({
    postData: {
        contents: JSON.stringify({
            action: "registroEmpaqueProduccion",
            idPedidoCliente: "P3",
            idLinea: "LINE-P3",
            idProduccion: "${productionData.idProduccion}",
            cantidadPorCaja: 48,
            cajas: 10,
            estadoUsoLote: "Empacado Parcial",
            sobranteFuente: 1520,
            responsable: "Supervisor Empaque",
            nota: "Primer empaque",
            fecha: "2026-07-01"
        })
    }
})`, context);
const packingProductionData = JSON.parse(packingProductionResponse.text);

assert.equal(packingProductionData.status, "success");
assert.equal(packingProductionData.cantidadConsumida, 480);
assert.equal(sheets.Produccion_Areas.valueAt(2, 22), 1520);
assert.equal(sheets.Detalle_Pedido_Cliente.valueAt(4, 7), 10);
assert.equal(sheets.Empaque_Sesiones.valueAt(5, 25), "Produccion");
assert.equal(sheets.Empaque_Sesiones.valueAt(5, 30), 480);
assert.equal(sheets.Empaque_Sesiones.valueAt(5, 31), 48);
assert.equal(sheets.Empaque_Sesiones.valueAt(5, 32), 2000);
assert.equal(sheets.Empaque_Sesiones.valueAt(5, 33), 1520);
assert.equal(sheets.Empaque_Sesiones.valueAt(5, 34), 480);
assert.equal(sheets.Empaque_Sesiones.valueAt(5, 35), "unidad");
assert.equal(sheets.Empaque_Sesiones.valueAt(5, 36), "PROD-TAMAL");
assert.equal(sheets.Empaque_Sesiones.valueAt(5, 37), "PROD-DESTINO");

const packingAveriaResponse = vm.runInContext(`doPost({
    postData: {
        contents: JSON.stringify({
            action: "registroEmpaqueProduccion",
            idPedidoCliente: "P3",
            idLinea: "LINE-P3",
            idProduccion: "${productionData.idProduccion}",
            cantidadPorCaja: 48,
            cajas: 2,
            estadoUsoLote: "Empacado Parcial",
            sobranteFuente: 1424,
            responsable: "Supervisor Empaque",
            nota: "Uso de averia",
            fecha: "2026-07-01"
        })
    }
})`, context);
const packingAveriaData = JSON.parse(packingAveriaResponse.text);

assert.equal(packingAveriaData.status, "success");
assert.equal(sheets.Produccion_Areas.valueAt(2, 22), 1424);
assert.equal(sheets.Detalle_Pedido_Cliente.valueAt(4, 7), 12);

const productionReversal = vm.runInContext(
    'revertirAsignacionesPedidoCliente_(SpreadsheetApp.getActiveSpreadsheet(), "P3", "Pedido cancelado")',
    context
);

assert.equal(productionReversal.length, 1);
assert.equal(sheets.Produccion_Areas.valueAt(2, 15), 1900);
assert.equal(sheets.Produccion_Areas.valueAt(2, 16), 100);
assert.equal(sheets.Produccion_Areas.valueAt(2, 22), 2000);
assert.equal(sheets.Produccion_Areas.valueAt(2, 17), "Disponible");

const getResponse = vm.runInContext("doGet({})", context);
const cloudData = JSON.parse(getResponse.text);
assert.equal(cloudData.produccionesAreas.length, 1);
assert.equal(cloudData.produccionesAreas[0].totalFisico, 2000);
assert.equal(cloudData.empaqueSesiones.filter(item => item.tipoFuente === "Produccion").length, 2);

console.log("Apps Script cancellation tests passed.");
