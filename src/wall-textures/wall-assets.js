import wallMaterialsJSON from "./wall-materials.json";
import { setDirty } from "./wall-textures.js";

export const wallMaterials = Object.fromEntries(
    Object.entries(wallMaterialsJSON).filter(([key, _]) => key !== "example")
);

const resourcesBasePath = "https://raw.githubusercontent.com/Molisson/ALEI/refs/heads/main/resources/";

const wallTextureAssets = {};

export function getWallTextureImage(key) {
    if (wallTextureAssets[key] === undefined) {
        const image = new Image();
        image.src = resourcesBasePath + key + ".webp";
        image.loaded = false;
        image.onload = () => {
            image.loaded = true;
            setDirty();
        };
        wallTextureAssets[key] = image;
    }

    return wallTextureAssets[key];
}