window.addEventListener('DOMContentLoaded', () => {
    fetchDataFromCloud();
    switchView('home');
});

function switchView(viewName) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${viewName}`).classList.remove('hidden');
}
