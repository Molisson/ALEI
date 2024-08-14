let rparams;
const sideButtonsContainer = document.createElement("div");
sideButtonsContainer.className = "alei-param-side-buttons-container";

let mouseInRparams;
let savedMouseX; // not used
let savedMouseY;

let rparamsLastScrollHeight;
// a resizeobserver won't detect changes in scrollHeight which is why all this dumb stuff is necessary.
// this detects resize on the child elements. if the child element's height changes it means the scrollheight changed
const rparamsChildrenResizeObserver = new ResizeObserver(() => {
    if (rparamsLastScrollHeight !== rparams.scrollHeight) {
        rparamsLastScrollHeight = rparams.scrollHeight;
        updateSideButtons();
    }    
});

// this makes sure all child elements are observed if they're added/removed dynamically
const rparamsMutationObserver = new MutationObserver((mutationList) => {
    for (const mutation of mutationList) {
        for (const node of mutation.removedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                rparamsChildrenResizeObserver.unobserve(node);
            }
        }
        for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains("alei-param-side-buttons-container")) {
                rparamsChildrenResizeObserver.observe(node);
            }
        }
        rparamsLastScrollHeight = rparams.scrollHeight;
        updateSideButtons();
    }
})

let currentSelectionData;
let currentHoveredElements;
let currentHoveredItem;

let sideButtonsDataRegistry = {}; // has properties element, clickFunction, allowMultipleSelection, visibilityCondition
let locationRegistry = {};
/*
example of locationRegistry format:
locationRegistry = {
    trigger: {
        triggerActionsItem: {
            type: "trigger actions",
            buttons: ["commentAdderButton", "openInColorEditorButton"]
        },
        ".alei-comment-box": {
            type: "elements",
            buttons: ["commentRemoverButton"]
        }
    },
    bg: {
        c: {
            type: "param",
            buttons: ["openInColorEditorButton"]
        }
    }
}
*/

export function registerParamSideButton(id, className, text, tooltip, func, locationData, allowMultipleSelection, visibilityCondition=null) {
    const button = makeSideButtonElement(id, className, text, tooltip);
	sideButtonsDataRegistry[id] = {
		element: button,
        clickFunction: func,
		allowMultipleSelection: allowMultipleSelection,
		visibilityCondition: visibilityCondition
	};
	for (const _class in locationData) {
        if (locationRegistry[_class] === undefined) {
            locationRegistry[_class] = {};
        }
        for (const item in locationData[_class]) {
            const type = locationData[_class][item].type;
			if (locationRegistry[_class][item] === undefined) {
                locationRegistry[_class][item] = {
					type: type,
					buttons: [id]
				};
            }
            else {
                locationRegistry[_class][item].buttons.push(id);
            }
        }
    }
}

export function rparamsWasUpdated() {
    // stop observing the previous rparams
    rparamsChildrenResizeObserver.disconnect();
    rparamsMutationObserver.disconnect();

    rparams = document.getElementById("rparams");
    if (rparams === null) {
        return;
    }

    // start observing new rparams
    for (const child of rparams.children) {
        rparamsChildrenResizeObserver.observe(child);
    }
    rparamsMutationObserver.observe(rparams, { childList: true });

    currentSelectionData = getSelectionData();

    // do nothing if selection is mixed or class has no side buttons
    if (currentSelectionData.mixed || locationRegistry[currentSelectionData._class] === undefined) {
        return;
    }

    mouseInRparams = false;
    rparams.addEventListener("mousemove", mouseMovedInRparams);
    rparams.addEventListener("mouseleave", mouseLeftRparams);
    rparams.appendChild(sideButtonsContainer);
}

function mouseMovedInRparams(event) {
    mouseInRparams = true;
    savedMouseX = event.clientX;
    savedMouseY = event.clientY;
    updateSideButtons();
}

function mouseLeftRparams() {
    mouseInRparams = false;
    hideSideButtons();
}

function updateSideButtons() {
    const { elements: hoveredElements, item: hoveredItem } = getHovered();
    currentHoveredElements = hoveredElements;
    currentHoveredItem = hoveredItem;

    hideSideButtons();

    // stop if nothing relevant is hovered
    if (hoveredItem === null) {
        return;
    }

    const rectOfFirst = hoveredElements[0].getBoundingClientRect();
    const itemTop = rectOfFirst.top;
    const itemHeight = hoveredElements.reduce((partialSum, e) => partialSum + e.offsetHeight, 0);
    
    const rparamsRect = rparams.getBoundingClientRect();

    // set side buttons position
    sideButtonsContainer.style.top = itemTop - rparamsRect.top + rparams.scrollTop;
    sideButtonsContainer.style.height = itemHeight;
    sideButtonsContainer.classList.add("alei-param-side-buttons-container--visible");

    // add the buttons
    let buttonIDs = [];
    for (const buttonID of locationRegistry[currentSelectionData._class][hoveredItem].buttons) {
        // skip if multiple objects are selected and the button don't like that
        const allowMultipleSelection = sideButtonsDataRegistry[buttonID].allowMultipleSelection;
        if (currentSelectionData.objs.length > 1 && !allowMultipleSelection) {
            continue;
        }

        // skip if the button shouldn't be visible for whatever reason
        if (!checkVisibilityCondition(buttonID)) {
            continue;
        }

        buttonIDs.push(buttonID);
    }
    addSideButtonsToContainer(buttonIDs);
}

function getHovered() {
    if (mouseInRparams) {
        for (const item in locationRegistry[currentSelectionData._class]) {
            const type = locationRegistry[currentSelectionData._class][item].type;
            let matchedElementsGenerator;
            switch (type) {
                case "param":
                    matchedElementsGenerator = matchedElementsGeneratorForParam;
                    break;
                case "elements":
                    matchedElementsGenerator = matchedElementsGeneratorForElements;
                    break;
                case "trigger actions":
                    matchedElementsGenerator = matchedElementsGeneratorForTriggerActions;
                    break;
            }
            for (const groupOfElements of matchedElementsGenerator(item)) {
                const rectOfFirst = groupOfElements[0].getBoundingClientRect();
                const itemTop = rectOfFirst.top;
                const itemHeight = groupOfElements.reduce((partialSum, e) => partialSum + e.offsetHeight, 0);
                const itemBottom = itemTop + itemHeight;
                if (itemTop <= savedMouseY && savedMouseY <= itemBottom) {
                    return {
                        elements: groupOfElements,
                        item: item
                    };
                }
            }
        }
    }
    return {
        elements: [],
        item: null
    };
}

function* matchedElementsGeneratorForParam(item) {
    yield [rparams.querySelector("#pm_" + item).parentElement];
}

function* matchedElementsGeneratorForElements(item) {
    for (const element of rparams.querySelectorAll(item)) {
        yield [element];
    }
}

function* matchedElementsGeneratorForTriggerActions(item) {
    // loops through each param element and yields the groups of elements corresponding with trigger actions
    let searchForActionNum = 1;
    let i = 0;
    while (i < rparams.children.length) {
        const element = rparams.children[i];
        if (element.className == "p_i") {
            if (element.querySelector(`#pm_actions_${searchForActionNum}_type`) !== null) {
                yield [element, rparams.children[i+1], rparams.children[i+2]];
                i += 3; //if this element was a trigger action, go forward by 3 elements instead of 1
                searchForActionNum += 1;
                continue;
            }
        }
        i++;
    }
}

function hideSideButtons() {
    for (const button of sideButtonsContainer.children) {
        button.remove();
    }
    sideButtonsContainer.classList.remove("alei-param-side-buttons-container--visible");
}

// todo: openable side thing for when there's too many buttons to fit
function addSideButtonsToContainer(buttonIDs) {
    for (const buttonID of buttonIDs) {
        const button = sideButtonsDataRegistry[buttonID].element;
        sideButtonsContainer.appendChild(button);
    }
}

function makeSideButtonElement(id, className, text, tooltip) {
    const button = document.createElement("button");
    button.classList.add(
        "alei-param-side-button",
        className
    );
    button.textContent = text;
    button.title = tooltip;
    button.addEventListener("click", () => sideButtonClicked(id));
    return button;
}

/*
when side button is pressed, it passes this data to func:
- currentSelectionData
- currentHoveredElements
- currentHoveredItem
if currentHoveredItem location type is "trigger actions", it additionally passes the number of the hovered trigger action
*/
function sideButtonClicked(id) {
    if (!mouseInRparams) {
        return; // in case of some freaky bug that may or may not exist
    }
    const data = {
        selectionData: currentSelectionData,
        elements: currentHoveredElements,
        item: currentHoveredItem
    };
    if (locationRegistry[currentSelectionData._class][currentHoveredItem].type == "trigger actions") {
        data.actionNum = getTriggerActionNumFromElements(currentHoveredElements);
    }
    sideButtonsDataRegistry[id].clickFunction(data);
    updateSideButtons(); // the side button may change rparams or the visibility conditions so mouse stuff should be checked again
}

function checkVisibilityCondition(id) {
    const condition = sideButtonsDataRegistry[id].visibilityCondition;
    if (condition === null) {
        return true;
    }

    const data = {
        selectionData: currentSelectionData,
        elements: currentHoveredElements,
        item: currentHoveredItem
    };
    if (locationRegistry[currentSelectionData._class][currentHoveredItem].type == "trigger actions") {
        data.actionNum = getTriggerActionNumFromElements(currentHoveredElements);
    }
    
    return condition(data);
}

function getTriggerActionNumFromElements(triggerActionElements) {
    const first = triggerActionElements[0];
    if (first.className != "p_i") {
        return null;
    }
    const regex = /pm_actions_(\d+)_type/;
    const match = first.children[1].id.match(regex)
    return match === null ? null : match[1];
}

function getSelectionData() {
    let selection = [];
    let mixed = false;
    let selectionClass = null;
    for (const obj of es) {
        if (obj.exists && obj.selected) {
            selection.push(obj);
            if (selectionClass === null) {
                selectionClass = obj._class;
            }
            else if (selectionClass != obj._class) {
                mixed = true;
            }
        }
    }
    return {
        objs: selection,
        mixed: mixed,
        _class: mixed ? null : selectionClass,
    }
}