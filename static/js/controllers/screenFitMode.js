// screenFitMode.js
// Encapsulates screen fit/fill mode logic for the home view

export function applyScreenFitMode(mode) {
    const homeView = document.getElementById('home-view');
    if (!homeView) return;
    homeView.classList.remove('screen-fit-mode', 'screen-fill-mode');
    if (mode === 'fit') {
        homeView.classList.add('screen-fit-mode');
    } else if (mode === 'fill') {
        homeView.classList.add('screen-fill-mode');
    }
}

export function getSavedScreenFitMode() {
    return (localStorage.getItem('screen-fit-mode') || 'fit');
}

export function saveScreenFitMode(mode) {
    localStorage.setItem('screen-fit-mode', mode);
}

export function setupScreenFitListeners() {
    const fitRadio = document.getElementById('screen-fit-radio-fit');
    const fillRadio = document.getElementById('screen-fit-radio-fill');
    if (!fitRadio || !fillRadio) return;
    [fitRadio, fillRadio].forEach(radio => {
        radio.addEventListener('change', () => {
            if (fitRadio.checked) {
                applyScreenFitMode('fit');
                saveScreenFitMode('fit');
            } else if (fillRadio.checked) {
                applyScreenFitMode('fill');
                saveScreenFitMode('fill');
            }
        });
    });
} 