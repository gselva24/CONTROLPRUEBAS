window.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('wheel', event => {
        if (event.target instanceof HTMLInputElement && event.target.type === 'number') {
            event.target.blur();
        }
    }, { capture: true, passive: true });

    document.addEventListener('keydown', event => {
        if (
            event.target instanceof HTMLInputElement &&
            event.target.type === 'number' &&
            (event.key === 'ArrowUp' || event.key === 'ArrowDown')
        ) {
            event.preventDefault();
        }
    });

    fetchDataFromCloud();
    configureAppShell();
    switchView(typeof defaultAppView === "function" ? defaultAppView() : "home");
});

function switchView(viewName) {
    if (typeof appAllowsView === "function" && !appAllowsView(viewName)) {
        viewName = typeof defaultAppView === "function" ? defaultAppView() : "home";
    }
    document.querySelectorAll('.app-view').forEach(v => v.classList.add('hidden'));
    const view = document.getElementById(`view-${viewName}`);
    if (view) view.classList.remove('hidden');
}

function configureAppShell() {
    if (typeof APP_CONFIG !== "undefined") {
        document.querySelectorAll("[data-app-title]").forEach(node => {
            node.textContent = APP_CONFIG.title;
        });
    }
    document.querySelectorAll("[data-view-target]").forEach(node => {
        const view = node.getAttribute("data-view-target");
        if (typeof appAllowsView === "function") {
            node.classList.toggle("hidden", !appAllowsView(view));
        }
    });
}
