const APP_CONTEXTS = {
    "frutas-empaque": {
        title: "Frutas + Empaque",
        defaultView: "frutas",
        views: ["home", "frutas", "empaque", "pedidos", "historial"],
        historyAreas: ["frutas", "planchas", "tamales"]
    },
    planchas: {
        title: "Planchas",
        defaultView: "planchas",
        views: ["planchas", "pedidos", "historial"],
        orderArea: "Planchas",
        productionArea: "Planchas",
        historyAreas: ["planchas"]
    },
    tamales: {
        title: "Tamales",
        defaultView: "tamales",
        views: ["tamales", "pedidos", "historial"],
        orderArea: "Tamales",
        productionArea: "Tamales",
        historyAreas: ["tamales"]
    }
};

function inferAppContext() {
    if (window.APP_CONTEXT && APP_CONTEXTS[window.APP_CONTEXT]) return window.APP_CONTEXT;
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("app");
    if (fromQuery && APP_CONTEXTS[fromQuery]) return fromQuery;
    const path = window.location.pathname.toLowerCase();
    if (path.includes("planchas")) return "planchas";
    if (path.includes("tamales")) return "tamales";
    return "frutas-empaque";
}

const APP_CONTEXT = inferAppContext();
const APP_CONFIG = APP_CONTEXTS[APP_CONTEXT];
window.APP_CONTEXT = APP_CONTEXT;
window.APP_CONFIG = APP_CONFIG;

function appAllowsView(viewName) {
    return APP_CONFIG.views.includes(viewName);
}

function defaultAppView() {
    return APP_CONFIG.defaultView;
}

function appApiUrl(params = {}) {
    const urlParams = new URLSearchParams({ app: APP_CONTEXT });
    Object.keys(params).forEach(key => {
        if (params[key] !== "" && typeof params[key] !== "undefined" && params[key] !== null) {
            urlParams.set(key, params[key]);
        }
    });
    const separator = GOOGLE_SHEETS_URL.includes("?") ? "&" : "?";
    return `${GOOGLE_SHEETS_URL}${separator}${urlParams.toString()}`;
}

function isProductionOnlyApp() {
    return APP_CONTEXT === "planchas" || APP_CONTEXT === "tamales";
}

function appOrderArea() {
    return APP_CONFIG.orderArea || "";
}

function normalizarTextoFront(valor) {
    return (valor || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

function dataViewForAppView(viewName) {
    if (viewName === "pedidos") return "pedidos";
    if (viewName === "historial") return "historial";
    if (viewName === "empaque") return "empaque";
    return "main";
}
