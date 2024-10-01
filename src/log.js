import { aleiSettings } from "./storage/settings.js";

export const logLevel = {
    INFO: 0,
    DEBUG: 1,
    DEBUG2: 2,
    VERBOSE: 2, //alias
    WARN: -1,
    SWARN: -2
};

// Just for styling.
export const ANSI_RESET = "\x1B[0m"
export const ANSI_RED = "\x1B[31m"
export const ANSI_GREY = "\x1B[37m"
export const ANSI_YELLOW = "\x1B[93m"
export const ANSI_GREEN = "\x1B[92m"
export const ANSI_CYAN = "\x1B[96m"

const levelToNameMap = {
    0: `${ANSI_CYAN}INFO${ANSI_RESET}`,
    1: `${ANSI_GREEN}DEBUG${ANSI_RESET}`,
    2: `${ANSI_GREEN}VERBOSE${ANSI_RESET}`
};

export function aleiLog(level, text) {
    if (level <= logLevel.WARN) {
        console.warn(`[ALEI:WARNING]: ${text}`);
        if (level === logLevel.WARN) NewNote(`ALEI: Please check console.`, "#FFFF00");
    }
    else if (level <= aleiSettings.logLevel) {
        console.log(`[${ANSI_GREEN}ALEI:${levelToNameMap[level]}]: ${text}`);
    }
}