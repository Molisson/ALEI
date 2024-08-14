export const defaultCommentText = "";

export function addCommentData(entity, position, text) {
    if (entity.comments === undefined) { //if object doesn't have comments yet
        entity.comments = {};
    }
    entity.comments[position] = text;
}

export function setCommentData(entity, position, text) {
    if (commentExists(entity, position)) {
        entity.comments[position] = text;
    }
}

export function removeCommentData(entity, position) {
    delete entity.comments[position];
    if (Object.keys(entity.comments).length == 0) {
        delete entity.comments;
    }
}

export function getCommentText(entity, position) {
    return entity.comments[position];
}

export function getCommentPositions(entity) {
    if (!isEntityCommented(entity)) {
        return [];
    }
    return Object.keys(entity.comments).map((key) => parseInt(key));
}

export function commentExists(entity, position) {
    return entity.comments !== undefined && entity.comments[position] !== undefined;
}

export function isEntityCommented(entity) {
    return entity.comments !== undefined;
}