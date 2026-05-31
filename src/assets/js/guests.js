/**
 * Персональные ссылки: https://ваш-домен/<path>
 *
 * /semen-anastasia   — Семен и Анастасия
 * /dmitry-alexandra  — Дмитрий и Александра
 * /sergey-anna       — Сергей и Анна
 * /maxim-anastasia   — Максим и Анастасия
 * /dmitry-marusya    — Дмитрий и Маруся
 * /vitaly-elizaveta  — Виталий и Елизавета
 * /dmitry-alina      — Дмитрий и Алина
 * /igor-darya        — Игорь и Дарья
 * /elizaveta-german  — Елизавета и Герман
 * /irina-evgeny      — Ирина и Евгений
 * /family            — Александр, Светлана, Эвелина и Роман
 * /nadezhda          — Надежда
 * /zahar             — Захар
 * /aleksandr         — Александр
 * /anton             — Антон
 * /natalya           — Наталья
 *
 * /                  — Дорогой Гость
 */
export const GUEST_BY_PATH = {
    'semen-anastasia': {type: 'plural', names: 'Семен и Анастасия'},
    'dmitry-alexandra': {type: 'plural', names: 'Дмитрий и Александра'},
    'sergey-anna': {type: 'plural', names: 'Сергей и Анна'},
    'maxim-anastasia': {type: 'plural', names: 'Максим и Анастасия'},
    'dmitry-marusya': {type: 'plural', names: 'Дмитрий и Маруся'},
    'vitaly-elizaveta': {type: 'plural', names: 'Виталий и Елизавета'},
    'dmitry-alina': {type: 'plural', names: 'Дмитрий и Алина'},
    'igor-darya': {type: 'plural', names: 'Игорь и Дарья'},
    'elizaveta-german': {type: 'plural', names: 'Елизавета и Герман'},
    'irina-evgeny': {type: 'plural', names: 'Ирина и Евгений'},
    family: {type: 'plural', names: 'Александр, Светлана, Эвелина и Роман'},
    nadezhda: {type: 'female', names: 'Надежда'},
    zahar: {type: 'male', names: 'Захар'},
    alexandr: {type: 'male', names: 'Александр'},
    anton: {type: 'male', names: 'Антон'},
    natalya: {type: 'female', names: 'Наталья'}
};

export const DEFAULT_GUEST = {type: 'male', names: 'Гость'};

const GREETING_PREFIX = {
    plural: 'Дорогие',
    male: 'Дорогой',
    female: 'Дорогая'
};

export function formatGuestGreetingHtml(guest) {
    const prefix = GREETING_PREFIX[guest.type] || GREETING_PREFIX.plural;
    const multiline = guest.names.includes(' и ') || guest.names.includes(',');

    if (multiline) {
        return `<span class="timeline__title-prefix">${prefix}</span><br><span class="timeline__title-names">${guest.names}!</span>`;
    }

    return `<span class="timeline__title-prefix">${prefix}</span> <span class="timeline__title-names">${guest.names}!</span>`;
}

export function getGuestPathFromUrl() {
    return window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
}

export function getGuestFromUrl() {
    const path = getGuestPathFromUrl();

    if (!path) {
        return DEFAULT_GUEST;
    }

    return GUEST_BY_PATH[path] || DEFAULT_GUEST;
}

export function applyGuestPersonalization() {
    const guest = getGuestFromUrl();
    const titleEl = document.getElementById('timeline-guest-title');

    if (!titleEl) {
        return;
    }

    titleEl.innerHTML = formatGuestGreetingHtml(guest);

    window.dispatchEvent(new Event('guest-personalized'));
}
