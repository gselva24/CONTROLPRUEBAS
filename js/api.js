function dataViewEstadoDefault(viewName, options = {}) {
    return options.estado || (viewName === "historial" ? historialEstadoFiltro : "todos");
}

function dataViewLimitDefault(viewName, estado, options = {}) {
    if (typeof options.limit !== "undefined") return options.limit;
    if (viewName !== "historial") return "";
    return estado === "completados" ? 100 : 50;
}

function dataViewCacheKey(viewName, options = {}) {
    const estado = dataViewEstadoDefault(viewName, options);
    const limit = dataViewLimitDefault(viewName, estado, options);
    return `${viewName}:${estado}:${limit}`;
}

function applyDataFromCloud(data) {
    if (Object.prototype.hasOwnProperty.call(data, "frutas")) frutasCatalog = data.frutas || [];
    if (Object.prototype.hasOwnProperty.call(data, "pedidosPendientes")) pedidosPendientes = data.pedidosPendientes || [];
    if (Object.prototype.hasOwnProperty.call(data, "pedidosParciales")) pedidosParciales = data.pedidosParciales || [];
    if (Object.prototype.hasOwnProperty.call(data, "historial")) historialCompleto = data.historial || [];
    if (Object.prototype.hasOwnProperty.call(data, "inventarioBodega")) inventarioBodega = data.inventarioBodega || [];
    if (Object.prototype.hasOwnProperty.call(data, "clientes")) clientesCatalog = data.clientes || [];
    if (Object.prototype.hasOwnProperty.call(data, "productos")) productosCatalog = data.productos || [];
    if (Object.prototype.hasOwnProperty.call(data, "productosCliente")) productosClienteCatalog = data.productosCliente || [];
    if (Object.prototype.hasOwnProperty.call(data, "pedidosCliente")) pedidosCliente = data.pedidosCliente || [];
    if (Object.prototype.hasOwnProperty.call(data, "detallePedidosCliente")) detallePedidosCliente = data.detallePedidosCliente || [];
    if (Object.prototype.hasOwnProperty.call(data, "asignacionesPedido")) asignacionesPedido = data.asignacionesPedido || [];
    if (Object.prototype.hasOwnProperty.call(data, "empaqueSesiones")) empaqueSesiones = data.empaqueSesiones || [];
    if (Object.prototype.hasOwnProperty.call(data, "produccionesAreas")) produccionesAreas = data.produccionesAreas || [];
}

function renderDataView(viewName) {
    if (viewName === "main") {
        if (typeof renderFrutasSelect === "function") renderFrutasSelect();
        if (typeof renderParcialesSelect === "function") renderParcialesSelect();
        if (typeof renderPlanchas === "function") renderPlanchas();
        if (typeof renderTamales === "function") renderTamales();
        return;
    }

    if (viewName === "empaque") {
        if (typeof renderEmpaqueSelect === "function") renderEmpaqueSelect();
        return;
    }

    if (viewName === "pedidos") {
        if (typeof renderClientesSelect === "function") renderClientesSelect();
        if (typeof renderProductosPedidoSelect === "function") renderProductosPedidoSelect();
        if (typeof renderProductosAdmin === "function") renderProductosAdmin();
        if (typeof renderPedidosResumen === "function") renderPedidosResumen();
        if (typeof renderPedidosCards === "function") renderPedidosCards();
        if (typeof renderClientesList === "function") renderClientesList();
        return;
    }

    if (viewName === "historial") {
        if (typeof renderMobileHistory === "function") renderMobileHistory();
    }
}

function fetchDataView(viewName = "main", options = {}) {
    const cacheKey = dataViewCacheKey(viewName, options);
    if (!options.force && loadedDataViews[cacheKey]) {
        renderDataView(viewName);
        return Promise.resolve();
    }

    document.getElementById("global-status").innerText = "Sincronizando...";
    const estado = dataViewEstadoDefault(viewName, options);
    const limit = dataViewLimitDefault(viewName, estado, options);
    const params = {
        view: viewName,
        estado,
        limit
    };
    const baseUrl = typeof appApiUrl === "function" ? appApiUrl(params) : GOOGLE_SHEETS_URL;
    const cacheBust = baseUrl.includes("?") ? `&t=${Date.now()}` : `?t=${Date.now()}`;

    return fetch(`${baseUrl}${cacheBust}`, { redirect: "follow" })
        .then(res => res.json())
        .then(data => {
            applyDataFromCloud(data || {});
            loadedDataViews[cacheKey] = true;
            renderDataView(viewName);

            const historialSinMetricas = historialCompleto.some(p =>
                typeof p.pesoProcesado === "undefined" || typeof p.cajasProcesadas === "undefined"
            );
            if (historialSinMetricas) {
                document.getElementById("global-status").innerText = "Script sin metricas V2";
                document.getElementById("global-status").className = "text-[10px] text-amber-400 font-medium italic";
                return;
            }

            document.getElementById("global-status").innerText = "Sincronizado";
            document.getElementById("global-status").className = "text-[10px] text-emerald-400 font-medium italic";
        })
        .catch(err => {
            console.error("Error de conexión GET:", err);
            document.getElementById("global-status").innerText = "Error conexión";
            document.getElementById("global-status").className = "text-[10px] text-rose-400 font-medium italic";
        });
}

function fetchDataFromCloud(options = {}) {
    if (options.force) loadedDataViews = {};
    const appView = currentViewName || (typeof defaultAppView === "function" ? defaultAppView() : "home");
    const viewName = typeof dataViewForAppView === "function" ? dataViewForAppView(appView) : "main";
    return fetchDataView(viewName, Object.assign({ force: true }, options));
}

function postFrutas(payload, successMessage) {
    document.getElementById("global-status").innerText = "Guardando...";
    fetch(GOOGLE_SHEETS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(resData => {
            if (resData && resData.status === "error") {
                alert("Error: " + resData.message);
            } else {
                alert(successMessage);
                resetFrutasForm();
                loadedDataViews = {};
                fetchDataFromCloud({ force: true });
                switchView("historial");
            }
        })
        .catch(err => { console.error(err); alert("Error de red al guardar."); });
}
