export function readStorage(key, defaultValue, func) {
    let val = localStorage[key];
    if (val === undefined) return defaultValue;
    return func(localStorage[key])
}

export function writeStorage(key, value) {
    try {
        localStorage[key] = value;
    } catch (e) {
        NewNote("ALEI: There was some issue trying to save into storage. You might need to clear your datas.", note_bad);
        console.error(e);
    }
}