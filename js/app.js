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
    switchView('home');
});

function switchView(viewName) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${viewName}`).classList.remove('hidden');
}
