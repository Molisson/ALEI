import { checkRequirements, checkErrors, checkNumericalRefs } from "./errorcheck.js";
import { displayErrorCheckGUI } from "./errorgui.js";

export function patchFindErrorsButton() {
    unsafeWindow.CheckForErrors = function() {
        const existingEntities = es.filter(entity => entity.exists);
        
        const requirementsStatus = checkRequirements(existingEntities);
        const errors = checkErrors(existingEntities);
        const numericalRefs = checkNumericalRefs(existingEntities);
        
        if (Object.values(requirementsStatus).includes(false) || errors.size > 0 || numericalRefs.size > 0) {
            displayErrorCheckGUI(requirementsStatus, errors, numericalRefs);
        }
        else {
            alert("No errors were found");
        }
    }
}