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

    insertSheet(name) {
        this.sheets[name] = new MockSheet([]);
        return this.sheets[name];
    }
}

const sessionHeaders = [
    "ID_Sesion_Empaque", "Fecha", "ID_Pedido_Cliente", "Cliente", "Codigo_Cliente",
    "Area_Detalle", "Producto_Detalle", "Presentacion_Detalle", "Unidad", "Cajas_Hechas",
    "Presentacion_Lb", "ID_Lote_Fruta", "Fruta", "Estado_Uso_Lote", "Sobrante_Lote_Lb",
    "Responsable", "Nota", "Estado_Registro", "Fecha_Reversion", "Motivo_Reversion"
];

const sheets = {
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
const context = vm.createContext({
    console,
    SpreadsheetApp: {
        getActiveSpreadsheet() {
            return spreadsheet;
        }
    }
});

const codePath = path.resolve(__dirname, "../apps-script/Code.gs");
vm.runInContext(fs.readFileSync(codePath, "utf8"), context, { filename: "Code.gs" });

const firstResult = vm.runInContext(
    'revertirAsignacionesPedidoCliente_(SpreadsheetApp.getActiveSpreadsheet(), "P1", "Pedido cancelado")',
    context
);

assert.equal(firstResult.length, 1);
assert.equal(firstResult[0].pesoReincorporadoLb, 50);
assert.equal(sheets.Empaque_Sesiones.valueAt(2, 18), "Revertida");
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

console.log("Apps Script cancellation tests passed.");
