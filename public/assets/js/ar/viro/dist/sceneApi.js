export const VIRO_INVALID_HANDLE = 0;
/** Mirrors VROLightingModel in the renderer (VROMaterial.h). */
export var ViroLightingModel;
(function (ViroLightingModel) {
    ViroLightingModel[ViroLightingModel["Constant"] = 0] = "Constant";
    ViroLightingModel[ViroLightingModel["Lambert"] = 1] = "Lambert";
    ViroLightingModel[ViroLightingModel["Blinn"] = 2] = "Blinn";
    ViroLightingModel[ViroLightingModel["Phong"] = 3] = "Phong";
    ViroLightingModel[ViroLightingModel["PhysicallyBased"] = 4] = "PhysicallyBased";
})(ViroLightingModel || (ViroLightingModel = {}));
/** Texture channel on a material (matches viroSetMaterialTexture in VROSceneWeb.cpp). */
export var ViroTextureChannel;
(function (ViroTextureChannel) {
    ViroTextureChannel[ViroTextureChannel["Diffuse"] = 0] = "Diffuse";
    ViroTextureChannel[ViroTextureChannel["Specular"] = 1] = "Specular";
    ViroTextureChannel[ViroTextureChannel["Normal"] = 2] = "Normal";
    ViroTextureChannel[ViroTextureChannel["Roughness"] = 3] = "Roughness";
    ViroTextureChannel[ViroTextureChannel["Metalness"] = 4] = "Metalness";
    ViroTextureChannel[ViroTextureChannel["AmbientOcclusion"] = 5] = "AmbientOcclusion";
})(ViroTextureChannel || (ViroTextureChannel = {}));
/** Mirrors VROWrapMode (VROTexture.h). */
export var ViroWrapMode;
(function (ViroWrapMode) {
    ViroWrapMode[ViroWrapMode["Clamp"] = 0] = "Clamp";
    ViroWrapMode[ViroWrapMode["Repeat"] = 1] = "Repeat";
    ViroWrapMode[ViroWrapMode["ClampToBorder"] = 2] = "ClampToBorder";
    ViroWrapMode[ViroWrapMode["Mirror"] = 3] = "Mirror";
})(ViroWrapMode || (ViroWrapMode = {}));
/** Mirrors VROFilterMode (VROTexture.h). */
export var ViroFilterMode;
(function (ViroFilterMode) {
    ViroFilterMode[ViroFilterMode["None"] = 0] = "None";
    ViroFilterMode[ViroFilterMode["Nearest"] = 1] = "Nearest";
    ViroFilterMode[ViroFilterMode["Linear"] = 2] = "Linear";
})(ViroFilterMode || (ViroFilterMode = {}));
/** Mirrors VROCullMode (VROMaterial.h). */
export var ViroCullMode;
(function (ViroCullMode) {
    ViroCullMode[ViroCullMode["Back"] = 0] = "Back";
    ViroCullMode[ViroCullMode["Front"] = 1] = "Front";
    ViroCullMode[ViroCullMode["None"] = 2] = "None";
})(ViroCullMode || (ViroCullMode = {}));
/** Mirrors VROBlendMode (VROMaterial.h) subset exposed to web. */
export var ViroBlendMode;
(function (ViroBlendMode) {
    ViroBlendMode[ViroBlendMode["None"] = 0] = "None";
    ViroBlendMode[ViroBlendMode["Alpha"] = 1] = "Alpha";
    ViroBlendMode[ViroBlendMode["Add"] = 2] = "Add";
    ViroBlendMode[ViroBlendMode["Multiply"] = 3] = "Multiply";
    ViroBlendMode[ViroBlendMode["Subtract"] = 4] = "Subtract";
    ViroBlendMode[ViroBlendMode["Screen"] = 5] = "Screen";
})(ViroBlendMode || (ViroBlendMode = {}));
/** Text horizontal alignment (mirrors VROTextHorizontalAlignment). */
export var ViroTextHorizontalAlignment;
(function (ViroTextHorizontalAlignment) {
    ViroTextHorizontalAlignment[ViroTextHorizontalAlignment["Left"] = 0] = "Left";
    ViroTextHorizontalAlignment[ViroTextHorizontalAlignment["Right"] = 1] = "Right";
    ViroTextHorizontalAlignment[ViroTextHorizontalAlignment["Center"] = 2] = "Center";
})(ViroTextHorizontalAlignment || (ViroTextHorizontalAlignment = {}));
/** Text vertical alignment (mirrors VROTextVerticalAlignment). */
export var ViroTextVerticalAlignment;
(function (ViroTextVerticalAlignment) {
    ViroTextVerticalAlignment[ViroTextVerticalAlignment["Top"] = 0] = "Top";
    ViroTextVerticalAlignment[ViroTextVerticalAlignment["Bottom"] = 1] = "Bottom";
    ViroTextVerticalAlignment[ViroTextVerticalAlignment["Center"] = 2] = "Center";
})(ViroTextVerticalAlignment || (ViroTextVerticalAlignment = {}));
/** Line break mode (mirrors VROLineBreakMode). */
export var ViroLineBreakMode;
(function (ViroLineBreakMode) {
    ViroLineBreakMode[ViroLineBreakMode["WordWrap"] = 0] = "WordWrap";
    ViroLineBreakMode[ViroLineBreakMode["CharWrap"] = 1] = "CharWrap";
    ViroLineBreakMode[ViroLineBreakMode["Justify"] = 2] = "Justify";
    ViroLineBreakMode[ViroLineBreakMode["None"] = 3] = "None";
})(ViroLineBreakMode || (ViroLineBreakMode = {}));
/** Text clip mode (mirrors VROTextClipMode). */
export var ViroTextClipMode;
(function (ViroTextClipMode) {
    ViroTextClipMode[ViroTextClipMode["ClipToBounds"] = 0] = "ClipToBounds";
    ViroTextClipMode[ViroTextClipMode["None"] = 1] = "None";
})(ViroTextClipMode || (ViroTextClipMode = {}));
/** Rigid body kind (mirrors VROPhysicsBody::VROPhysicsBodyType). */
export var ViroPhysicsBodyType;
(function (ViroPhysicsBodyType) {
    ViroPhysicsBodyType[ViroPhysicsBodyType["Static"] = 0] = "Static";
    ViroPhysicsBodyType[ViroPhysicsBodyType["Kinematic"] = 1] = "Kinematic";
    ViroPhysicsBodyType[ViroPhysicsBodyType["Dynamic"] = 2] = "Dynamic";
})(ViroPhysicsBodyType || (ViroPhysicsBodyType = {}));
/**
 * Collider shape (mirrors VROPhysicsShape::VROShapeType).
 *
 * `Infer` is the absence of a shape, not a shape: virocore then fits one to the
 * node's own bounding box and applies its world scale, which is what the editors
 * measure. Sending a unit box instead is what used to give a 0.4 m model a 1 m
 * collider and stand it off the ground.
 */
export var ViroPhysicsShapeType;
(function (ViroPhysicsShapeType) {
    ViroPhysicsShapeType[ViroPhysicsShapeType["Infer"] = -1] = "Infer";
    ViroPhysicsShapeType[ViroPhysicsShapeType["Sphere"] = 2] = "Sphere";
    /** params are HALF spans, as virocore takes them. */
    ViroPhysicsShapeType[ViroPhysicsShapeType["Box"] = 3] = "Box";
    /**
     * Parts flattened into `params`, VIRO_COMPOUND_CHILD_STRIDE floats each:
     * the part type (0 box, 1 sphere), then the box's three spans or the sphere's
     * radius in the first of those three slots, then the part's position relative
     * to the node. A part's rotation is not carried — virocore has nowhere to put
     * it, so a rotated part is placed unrotated rather than silently misplaced.
     */
    ViroPhysicsShapeType[ViroPhysicsShapeType["Compound"] = 5] = "Compound";
})(ViroPhysicsShapeType || (ViroPhysicsShapeType = {}));
/** VROPhysicsShape::kCompoundChildStride. */
export const VIRO_COMPOUND_CHILD_STRIDE = 7;
/** Free axis for a billboard constraint (mirrors VROBillboardAxis). */
export var ViroBillboardAxis;
(function (ViroBillboardAxis) {
    ViroBillboardAxis[ViroBillboardAxis["X"] = 0] = "X";
    ViroBillboardAxis[ViroBillboardAxis["Y"] = 1] = "Y";
    ViroBillboardAxis[ViroBillboardAxis["Z"] = 2] = "Z";
    ViroBillboardAxis[ViroBillboardAxis["All"] = 3] = "All";
})(ViroBillboardAxis || (ViroBillboardAxis = {}));
/** Particle spawn-volume shape (mirrors VROParticleSpawnVolume::Shape). */
export var ViroParticleSpawnShape;
(function (ViroParticleSpawnShape) {
    ViroParticleSpawnShape[ViroParticleSpawnShape["Box"] = 0] = "Box";
    ViroParticleSpawnShape[ViroParticleSpawnShape["Sphere"] = 1] = "Sphere";
    ViroParticleSpawnShape[ViroParticleSpawnShape["Point"] = 2] = "Point";
})(ViroParticleSpawnShape || (ViroParticleSpawnShape = {}));
/** Which of a particle's visual properties a modifier drives. */
export var ViroParticleProperty;
(function (ViroParticleProperty) {
    /** Opacity. Only the x component is read. */
    ViroParticleProperty[ViroParticleProperty["Alpha"] = 0] = "Alpha";
    /** Colour, as rgb in 0..1. */
    ViroParticleProperty[ViroParticleProperty["Color"] = 1] = "Color";
    ViroParticleProperty[ViroParticleProperty["Scale"] = 2] = "Scale";
    /** Radians. */
    ViroParticleProperty[ViroParticleProperty["Rotation"] = 3] = "Rotation";
})(ViroParticleProperty || (ViroParticleProperty = {}));
/** What a particle modifier interpolates against over the particle's life. */
export var ViroParticleFactor;
(function (ViroParticleFactor) {
    ViroParticleFactor[ViroParticleFactor["Time"] = 0] = "Time";
    ViroParticleFactor[ViroParticleFactor["Distance"] = 1] = "Distance";
    ViroParticleFactor[ViroParticleFactor["Velocity"] = 2] = "Velocity";
})(ViroParticleFactor || (ViroParticleFactor = {}));
/**
 * Floats per interpolation point in a modifier's flattened interval list:
 * startFactor, endFactor, then the target x, y, z.
 */
export const VIRO_PARTICLE_INTERVAL_STRIDE = 5;
/** AR tracking state (mirrors VROARTrackingState in VROARCamera.h). */
export var ViroTrackingState;
(function (ViroTrackingState) {
    ViroTrackingState[ViroTrackingState["Unavailable"] = 1] = "Unavailable";
    ViroTrackingState[ViroTrackingState["Limited"] = 2] = "Limited";
    ViroTrackingState[ViroTrackingState["Normal"] = 3] = "Normal";
})(ViroTrackingState || (ViroTrackingState = {}));
/** Easing for declarative animations (matches easingValue in VROSceneWeb.cpp). */
export var ViroEasing;
(function (ViroEasing) {
    ViroEasing[ViroEasing["Linear"] = 0] = "Linear";
    ViroEasing[ViroEasing["EaseIn"] = 1] = "EaseIn";
    ViroEasing[ViroEasing["EaseOut"] = 2] = "EaseOut";
    ViroEasing[ViroEasing["EaseInEaseOut"] = 3] = "EaseInEaseOut";
    ViroEasing[ViroEasing["Bounce"] = 4] = "Bounce";
    ViroEasing[ViroEasing["PowerDecel"] = 5] = "PowerDecel";
})(ViroEasing || (ViroEasing = {}));
/** Model container format for loadModel (matches viroLoadModel in VROSceneWeb.cpp). */
export var ViroModelFormat;
(function (ViroModelFormat) {
    ViroModelFormat[ViroModelFormat["GLB"] = 0] = "GLB";
    ViroModelFormat[ViroModelFormat["GLTF"] = 1] = "GLTF";
    ViroModelFormat[ViroModelFormat["VRX"] = 2] = "VRX";
    /** Needs its companion .mtl (and any textures it names) passed as resources. */
    ViroModelFormat[ViroModelFormat["OBJ"] = 3] = "OBJ";
})(ViroModelFormat || (ViroModelFormat = {}));
/** Mirrors VROLightType (VROLight.h). */
export var ViroLightType;
(function (ViroLightType) {
    ViroLightType[ViroLightType["Ambient"] = 0] = "Ambient";
    ViroLightType[ViroLightType["Directional"] = 1] = "Directional";
    ViroLightType[ViroLightType["Omni"] = 2] = "Omni";
    ViroLightType[ViroLightType["Spot"] = 3] = "Spot";
})(ViroLightType || (ViroLightType = {}));
/** Mirrors VROEventDelegate::EventAction (VROEventDelegate.h). */
export var ViroEventAction;
(function (ViroEventAction) {
    ViroEventAction[ViroEventAction["Hover"] = 1] = "Hover";
    ViroEventAction[ViroEventAction["Click"] = 2] = "Click";
    ViroEventAction[ViroEventAction["Touch"] = 3] = "Touch";
})(ViroEventAction || (ViroEventAction = {}));
/** Mirrors VROEventDelegate::ClickState. */
export var ViroClickState;
(function (ViroClickState) {
    ViroClickState[ViroClickState["ClickDown"] = 1] = "ClickDown";
    ViroClickState[ViroClickState["ClickUp"] = 2] = "ClickUp";
    ViroClickState[ViroClickState["Clicked"] = 3] = "Clicked";
})(ViroClickState || (ViroClickState = {}));
/**
 * Typed, ergonomic facade over the WASM scene-graph C API. The TS bridge
 * reconciler drives these methods; handles are opaque ints owned by the WASM
 * module (see VROSceneWeb.cpp). Grouped by object kind for clarity.
 */
export class ViroSceneApi {
    constructor(m) {
        this.m = m;
    }
    // --- Nodes ---
    getRootNode() {
        return this.m.viroGetRootNode();
    }
    createNode() {
        return this.m.viroCreateNode();
    }
    setNodePosition(node, x, y, z) {
        this.m.viroSetNodePosition(node, x, y, z);
    }
    setNodeRotation(node, x, y, z) {
        this.m.viroSetNodeRotation(node, x, y, z);
    }
    setNodeScale(node, x, y, z) {
        this.m.viroSetNodeScale(node, x, y, z);
    }
    setNodeOpacity(node, opacity) {
        this.m.viroSetNodeOpacity(node, opacity);
    }
    setNodeVisible(node, visible) {
        this.m.viroSetNodeVisible(node, visible);
    }
    setNodeGeometry(node, geometry) {
        this.m.viroSetNodeGeometry(node, geometry);
    }
    addChildNode(parent, child) {
        this.m.viroAddChildNode(parent, child);
    }
    removeNodeFromParent(node) {
        this.m.viroRemoveNodeFromParent(node);
    }
    destroyNode(node) {
        this.m.viroDestroyNode(node);
    }
    setNodeEventEnabled(node, action, enabled) {
        this.m.viroSetNodeEventEnabled(node, action, enabled);
    }
    /** Drawn-last wins among equal-depth fragments. Mirrors the native prop. */
    setNodeRenderingOrder(node, order) {
        if (typeof this.m.viroSetNodeRenderingOrder !== "function")
            return;
        this.m.viroSetNodeRenderingOrder(node, order);
    }
    /**
     * A light lights this node only where their masks intersect. `recursive`
     * matters for a loaded model, whose geometry is on children rather than on
     * the handle the caller owns.
     */
    setNodeLightReceivingBitMask(node, mask, recursive = true) {
        if (typeof this.m.viroSetNodeLightReceivingBitMask !== "function")
            return;
        this.m.viroSetNodeLightReceivingBitMask(node, mask, recursive);
    }
    setNodeShadowCastingBitMask(node, mask, recursive = true) {
        if (typeof this.m.viroSetNodeShadowCastingBitMask !== "function")
            return;
        this.m.viroSetNodeShadowCastingBitMask(node, mask, recursive);
    }
    /** Turn the node to face the camera about `axis`, or null to stop. */
    setNodeBillboard(node, axis) {
        if (typeof this.m.viroSetNodeBillboard !== "function")
            return;
        this.m.viroSetNodeBillboard(node, axis ?? -1);
    }
    /**
     * The node's world position, or null on a binary that cannot report it.
     *
     * Null rather than the origin on purpose: a caller measuring a distance has to
     * be able to tell "at the origin" from "unknown", and treating the second as
     * the first fires proximity triggers that should not have fired.
     */
    getNodeWorldPosition(node) {
        if (typeof this.m.viroGetNodeWorldPosition !== "function")
            return null;
        const p = this.m.viroGetNodeWorldPosition(node);
        if (!p || p.length < 3)
            return null;
        return [p[0], p[1], p[2]];
    }
    // --- Geometries ---
    createBox(width, height, length) {
        return this.m.viroCreateBox(width, height, length);
    }
    createSphere(radius) {
        return this.m.viroCreateSphere(radius);
    }
    createSurface(width, height) {
        return this.m.viroCreateSurface(width, height);
    }
    /**
     * A surface whose texture is cropped to [u0,v0]-[u1,v1] rather than stretched
     * over the whole quad — what imageClipMode ClipToBounds does on a device.
     * Falls back to the uncropped surface on a binary without it, which is the
     * picture whole and the wrong size rather than no picture at all.
     */
    createSurfaceUV(width, height, u0, v0, u1, v1) {
        if (typeof this.m.viroCreateSurfaceUV !== "function") {
            return this.m.viroCreateSurface(width, height);
        }
        return this.m.viroCreateSurfaceUV(width, height, u0, v0, u1, v1);
    }
    createText(text, width, height, fontSize, hAlign, vAlign, lineBreak, clipMode, maxLines, color) {
        return this.m.viroCreateText(text, width, height, fontSize, hAlign, vAlign, lineBreak, clipMode, maxLines, color.r, color.g, color.b, color.a);
    }
    /** points: flat [x,y,z, …]. */
    createPolyline(points, thickness) {
        return this.m.viroCreatePolyline(points, thickness);
    }
    /** points: flat [x,y,z, …] perimeter. */
    createPolygon(points) {
        return this.m.viroCreatePolygon(points);
    }
    /** Custom mesh. normals/texcoords may be empty; indices are triangles. */
    createGeometry(vertices, normals, texcoords, indices) {
        return this.m.viroCreateGeometry(vertices, normals, texcoords, indices);
    }
    setGeometryMaterial(geometry, material) {
        this.m.viroSetGeometryMaterial(geometry, material);
    }
    destroyGeometry(geometry) {
        this.m.viroDestroyGeometry(geometry);
    }
    // --- Materials ---
    createMaterial() {
        return this.m.viroCreateMaterial();
    }
    setMaterialDiffuseColor(material, r, g, b, a) {
        this.m.viroSetMaterialDiffuseColor(material, r, g, b, a);
    }
    setMaterialLightingModel(material, model) {
        this.m.viroSetMaterialLightingModel(material, model);
    }
    setMaterialShininess(material, shininess) {
        this.m.viroSetMaterialShininess(material, shininess);
    }
    setMaterialFresnelExponent(material, fresnel) {
        this.m.viroSetMaterialFresnelExponent(material, fresnel);
    }
    setMaterialRoughness(material, roughness) {
        this.m.viroSetMaterialRoughness(material, roughness);
    }
    setMaterialMetalness(material, metalness) {
        this.m.viroSetMaterialMetalness(material, metalness);
    }
    setMaterialDiffuseIntensity(material, intensity) {
        this.m.viroSetMaterialDiffuseIntensity(material, intensity);
    }
    setMaterialCullMode(material, mode) {
        this.m.viroSetMaterialCullMode(material, mode);
    }
    setMaterialBlendMode(material, mode) {
        this.m.viroSetMaterialBlendMode(material, mode);
    }
    setMaterialWritesToDepthBuffer(material, writes) {
        this.m.viroSetMaterialWritesToDepthBuffer(material, writes);
    }
    setMaterialReadsFromDepthBuffer(material, reads) {
        this.m.viroSetMaterialReadsFromDepthBuffer(material, reads);
    }
    // shaderCode should already have any `uniforms` declarations prepended
    // (uniforms + "\n" + body) — the caller owns that concatenation, same as
    // MaterialManager.java::parseShaderModifiers on Android.
    addMaterialShaderModifier(material, entryPoint, shaderCode, varyings, requiresSceneDepth = false, requiresCameraTexture = false) {
        this.m.viroAddMaterialShaderModifier(material, entryPoint, shaderCode, varyings, requiresSceneDepth, requiresCameraTexture);
    }
    removeAllMaterialShaderModifiers(material) {
        this.m.viroRemoveAllMaterialShaderModifiers(material);
    }
    // Dynamic shader-uniform updates. The uniform must be declared in a
    // shaderModifier already applied to this material (addMaterialShaderModifier)
    // for these to have any visible effect — same rule as native.
    setMaterialShaderUniformFloat(material, name, value) {
        this.m.viroSetMaterialShaderUniformFloat(material, name, value);
    }
    setMaterialShaderUniformVec2(material, name, x, y) {
        this.m.viroSetMaterialShaderUniformVec2(material, name, x, y);
    }
    setMaterialShaderUniformVec3(material, name, x, y, z) {
        this.m.viroSetMaterialShaderUniformVec3(material, name, x, y, z);
    }
    setMaterialShaderUniformVec4(material, name, x, y, z, w) {
        this.m.viroSetMaterialShaderUniformVec4(material, name, x, y, z, w);
    }
    setMaterialShaderUniformMat4(material, name, matrix) {
        this.m.viroSetMaterialShaderUniformMat4(material, name, matrix);
    }
    setMaterialShaderUniformTexture(material, name, texture) {
        this.m.viroSetMaterialShaderUniformTexture(material, name, texture);
    }
    /**
     * Merge `material` onto everything `node` draws, itself and its whole subtree.
     * The counterpart of the native bridges' `shaderOverrides` prop, with the same
     * merge: each drawn material keeps its own colours and textures and takes the
     * override's lighting model, shininess, blend mode, transparency mode, cull
     * mode and two depth flags, plus its shader modifiers and uniforms.
     *
     * For a loaded model rather than a geometry built here: `setGeometryMaterial`
     * needs a geometry handle, and a model's geometry belongs to the loader, not
     * to the caller. Re-applying is safe — each call merges onto the materials the
     * node had before the first override, not onto the previous merge.
     */
    applyShaderOverride(node, material) {
        // The binary is a build output of another repo and is routinely older than
        // this file. Calling straight through would throw on a module that predates
        // the export and take the whole scene down over a material; returning false
        // leaves the model with its own materials, which is what it had anyway.
        if (typeof this.m.viroApplyShaderOverride !== "function") {
            return false;
        }
        this.m.viroApplyShaderOverride(node, material);
        return true;
    }
    destroyMaterial(material) {
        this.m.viroDestroyMaterial(material);
    }
    // --- Post-processing effects ---
    //
    // All four open on, and the choreographer degrades whatever the driver cannot
    // do. The native scene navigators expose the same four as props; a caller that
    // switches HDR and bloom off here is matching what a device is told to do,
    // which is the difference these exist to close.
    //
    // The return is the state after the call, not whether the call was understood:
    // asking for HDR where the driver has no float colour buffers leaves it off.
    // A binary that predates these reports false and stays as it was.
    setHDREnabled(enabled) {
        if (typeof this.m.viroSetHDREnabled !== "function")
            return false;
        return this.m.viroSetHDREnabled(enabled);
    }
    setBloomEnabled(enabled) {
        if (typeof this.m.viroSetBloomEnabled !== "function")
            return false;
        return this.m.viroSetBloomEnabled(enabled);
    }
    setPBREnabled(enabled) {
        if (typeof this.m.viroSetPBREnabled !== "function")
            return false;
        return this.m.viroSetPBREnabled(enabled);
    }
    setShadowsEnabled(enabled) {
        if (typeof this.m.viroSetShadowsEnabled !== "function")
            return false;
        return this.m.viroSetShadowsEnabled(enabled);
    }
    // --- Morph targets ---
    //
    // A glTF or FBX model carries its blend shapes in the geometry virocore
    // already loaded; without these nothing on web could name one or move it, so a
    // rig that animates on a phone sat at its rest pose in a browser.
    //
    // Each acts on the node's whole subtree, as the native bridges do: a loaded
    // model keeps its meshes on child nodes.
    /** Weight for one target by name. Unknown names are ignored, as natively. */
    setMorphTargetWeight(node, target, weight) {
        if (typeof this.m.viroSetMorphTargetWeight !== "function")
            return false;
        this.m.viroSetMorphTargetWeight(node, target, weight);
        return true;
    }
    /** The names this model morphs by, sorted, deduplicated across its meshes. */
    getMorphTargetKeys(node) {
        if (typeof this.m.viroGetMorphTargetKeys !== "function")
            return [];
        return this.m.viroGetMorphTargetKeys(node) ?? [];
    }
    /**
     * Where the blending runs: "cpu", "gpu" or "hybrid", the same strings native
     * takes. Returns whether every morpher accepted it — the GPU path needs vertex
     * attributes a model may not have left, and virocore refuses rather than
     * degrade silently.
     */
    setMorphMode(node, mode) {
        if (typeof this.m.viroSetMorphMode !== "function")
            return false;
        return this.m.viroSetMorphMode(node, mode);
    }
    /**
     * What the WASM binary is: the virocore commit it was built from, whether that
     * tree was dirty, and when. Empty from a binary built before the stamp existed.
     *
     * The binary is copied by hand out of virocore into this package and from here
     * into an app's node_modules, so by the time a bug report arrives nothing
     * around the file says where it came from. Asking it directly is the only
     * answer that cannot have drifted.
     */
    getBuildId() {
        if (typeof this.m.viroGetBuildId !== "function")
            return "";
        return this.m.viroGetBuildId();
    }
    /**
     * The tone curve alone. This is the switch a caller wants when the curve is
     * the problem: HDR carries PBR with it (virocore's isPBREnabled is
     * `_hdrEnabled && _pbrEnabled`), so switching HDR off to lose Hable also drops
     * every glTF material back to Blinn, where its default specular renders it
     * white. Native's ViroScene has said this as `toneMappingEnabled` all along.
     */
    setToneMappingEnabled(enabled) {
        if (typeof this.m.viroSetToneMappingEnabled !== "function")
            return false;
        this.m.viroSetToneMappingEnabled(enabled);
        return true;
    }
    // --- Physics ---
    //
    // Bullet ships inside the binary and nothing reached it until these existed.
    //
    // `setPhysicsWorld(false, …)` is a real instruction and not a no-op: it
    // detaches every body. virocore creates a physics world on demand and steps
    // whatever it holds, so a scene whose author switched physics off would
    // otherwise simulate at the engine's own gravity.
    setPhysicsWorld(enabled, gravity) {
        if (typeof this.m.viroSetPhysicsWorld !== "function")
            return false;
        this.m.viroSetPhysicsWorld(enabled, gravity[0], gravity[1], gravity[2]);
        return true;
    }
    /** `tag` is what a collision reports as the other party. */
    setPhysicsBody(node, type, mass, shapeType, shapeParams, tag) {
        if (typeof this.m.viroSetPhysicsBody !== "function")
            return false;
        this.m.viroSetPhysicsBody(node, type, mass, shapeType, shapeParams, tag);
        return true;
    }
    setPhysicsBodyProperties(node, restitution, friction, useGravity) {
        if (typeof this.m.viroSetPhysicsBodyProperties !== "function")
            return;
        this.m.viroSetPhysicsBodyProperties(node, restitution, friction, useGravity);
    }
    /**
     * `isConstant: false` is the instant latch the next physics step consumes
     * once. A constant velocity is reasserted on the rigid body every frame and
     * gravity never gets a turn, so a launched object climbs forever — which is
     * why Studio sends its velocity as an instant one.
     */
    setPhysicsVelocity(node, velocity, isConstant = false) {
        if (typeof this.m.viroSetPhysicsVelocity !== "function")
            return;
        this.m.viroSetPhysicsVelocity(node, velocity[0], velocity[1], velocity[2], isConstant);
    }
    applyPhysicsImpulse(node, impulse) {
        if (typeof this.m.viroApplyPhysicsImpulse !== "function")
            return;
        this.m.viroApplyPhysicsImpulse(node, impulse[0], impulse[1], impulse[2]);
    }
    applyPhysicsTorque(node, torque) {
        if (typeof this.m.viroApplyPhysicsTorque !== "function")
            return;
        this.m.viroApplyPhysicsTorque(node, torque[0], torque[1], torque[2]);
    }
    clearPhysicsBody(node) {
        if (typeof this.m.viroClearPhysicsBody !== "function")
            return;
        this.m.viroClearPhysicsBody(node);
    }
    /** One callback for the whole scene; pass null to stop listening. */
    setCollisionHandler(handler) {
        if (typeof this.m.viroSetCollisionCallback !== "function")
            return false;
        this.m.viroSetCollisionCallback((tag, otherTag, px, py, pz, nx, ny, nz) => {
            handler?.({ tag, otherTag, point: [px, py, pz], normal: [nx, ny, nz] });
        });
        return true;
    }
    // --- Textures ---
    createTextureRGBA(pixels, width, height, sRGB) {
        return this.m.viroCreateTextureRGBA(pixels, width, height, sRGB);
    }
    setTextureWrap(texture, wrapS, wrapT) {
        this.m.viroSetTextureWrap(texture, wrapS, wrapT);
    }
    setTextureFilter(texture, min, mag, mip) {
        this.m.viroSetTextureFilter(texture, min, mag, mip);
    }
    setMaterialTexture(material, channel, texture) {
        this.m.viroSetMaterialTexture(material, channel, texture);
    }
    destroyTexture(texture) {
        this.m.viroDestroyTexture(texture);
    }
    /**
     * A texture the GPU fills straight from a `<video>`, `<canvas>`, ImageBitmap
     * or VideoFrame (see updateTextureFromSource). Returns VIRO_INVALID_HANDLE
     * (0) on a renderer build that predates it; fall back to createTextureRGBA.
     */
    createSourceTexture(sRGB) {
        if (typeof this.m.viroCreateSourceTexture !== "function")
            return 0;
        return this.m.viroCreateSourceTexture(sRGB);
    }
    /**
     * Upload the source's current frame into a texture from createSourceTexture.
     * The size follows the source. False when the source has no frame yet.
     */
    updateTextureFromSource(texture, source) {
        if (typeof this.m.viroUpdateTextureFromSource !== "function")
            return false;
        return this.m.viroUpdateTextureFromSource(texture, source);
    }
    // --- Background (skybox / 360) ---
    /** Six RGBA8 faces in +X,-X,+Y,-Y,+Z,-Z order, each width*height*4 bytes. */
    createTextureCubeRGBA(faces, width, height) {
        return this.m.viroCreateTextureCubeRGBA(faces.px, faces.nx, faces.py, faces.ny, faces.pz, faces.nz, width, height);
    }
    setBackgroundSphere(texture) {
        this.m.viroSetBackgroundSphere(texture);
    }
    setBackgroundCube(texture) {
        this.m.viroSetBackgroundCube(texture);
    }
    setBackgroundRotation(x, y, z) {
        this.m.viroSetBackgroundRotation(x, y, z);
    }
    // --- Lighting environment (IBL) ---
    /** Load a radiance .hdr already written to the FS at `path` → texture handle. */
    loadRadianceHDRTexture(path) {
        return this.m.viroLoadRadianceHDRTexture(path);
    }
    /** Apply an IBL environment texture (0 clears it). */
    setLightingEnvironment(texture) {
        this.m.viroSetLightingEnvironment(texture);
    }
    // --- Portals ---
    createPortalScene() {
        return this.m.viroCreatePortalScene();
    }
    createPortalFrame() {
        return this.m.viroCreatePortalFrame();
    }
    setPortalEntrance(portalScene, frame) {
        this.m.viroSetPortalEntrance(portalScene, frame);
    }
    setPortalPassable(portalScene, passable) {
        this.m.viroSetPortalPassable(portalScene, passable);
    }
    // --- Particles ---
    createParticleEmitter(node, texture, config) {
        const [erMin, erMax] = config.emissionRatePerSecond ?? [10, 10];
        const [ltMin, ltMax] = config.particleLifetime ?? [2000, 2000];
        const [sp0, sp1, sp2] = config.spawnParams ?? [0, 0, 0];
        const [vnx, vny, vnz] = config.velocityMin ?? [0, 0, 0];
        const [vxx, vxy, vxz] = config.velocityMax ?? [0, 0, 0];
        this.m.viroCreateParticleEmitter(node, texture, config.particleWidth ?? 0.1, config.particleHeight ?? 0.1, config.maxParticles ?? 500, erMin, erMax, ltMin, ltMax, config.spawnShape ?? ViroParticleSpawnShape.Point, sp0, sp1, sp2, vnx, vny, vnz, vxx, vxy, vxz);
    }
    /** Acceleration on a running emitter, as a [min, max] range like velocity. */
    setParticleAcceleration(node, min, max) {
        if (typeof this.m.viroSetParticleAcceleration !== "function")
            return;
        this.m.viroSetParticleAcceleration(node, min[0], min[1], min[2], max[0], max[1], max[2]);
    }
    /**
     * How one of a particle's visual properties behaves over its life: an initial
     * [min, max] range to randomise from, what to interpolate against, and the
     * points to interpolate towards.
     *
     * Without these an emitter draws every particle at full opacity and one size
     * until it expires, so smoke never thins and a spark never shrinks.
     *
     * `intervals` is flattened at VIRO_PARTICLE_INTERVAL_STRIDE floats per point,
     * and virocore drops a trailing partial entry rather than reading past it.
     */
    setParticleModifier(node, property, min, max, factor, intervals) {
        if (typeof this.m.viroSetParticleModifier !== "function")
            return false;
        this.m.viroSetParticleModifier(node, property, min[0], min[1], min[2], max[0], max[1], max[2], factor, intervals);
        return true;
    }
    setParticleEmitterRun(node, run) {
        this.m.viroSetParticleEmitterRun(node, run);
    }
    // --- Lights ---
    createLight(type) {
        return this.m.viroCreateLight(type);
    }
    setLightColor(light, r, g, b) {
        this.m.viroSetLightColor(light, r, g, b);
    }
    setLightIntensity(light, intensity) {
        this.m.viroSetLightIntensity(light, intensity);
    }
    setLightTemperature(light, temperature) {
        this.m.viroSetLightTemperature(light, temperature);
    }
    setLightDirection(light, x, y, z) {
        this.m.viroSetLightDirection(light, x, y, z);
    }
    setLightPosition(light, x, y, z) {
        this.m.viroSetLightPosition(light, x, y, z);
    }
    setLightAttenuation(light, start, end) {
        this.m.viroSetLightAttenuation(light, start, end);
    }
    setLightSpotAngles(light, inner, outer) {
        this.m.viroSetLightSpotAngles(light, inner, outer);
    }
    setLightCastsShadow(light, castsShadow) {
        this.m.viroSetLightCastsShadow(light, castsShadow);
    }
    /** Pairs with a node's lightReceivingBitMask: both must intersect to light it. */
    setLightInfluenceBitMask(light, mask) {
        if (typeof this.m.viroSetLightInfluenceBitMask !== "function")
            return;
        this.m.viroSetLightInfluenceBitMask(light, mask);
    }
    /**
     * Shadow tuning. `castsShadow` decides whether a light casts at all; these
     * decide whether the result is usable — too small a map or too low a bias is
     * the difference between a shadow and a field of acne.
     *
     * No orthographic position: the native navigators take one but VROLight has no
     * setter for it, so there is nowhere to forward it.
     */
    setLightShadowOpacity(light, opacity) {
        if (typeof this.m.viroSetLightShadowOpacity !== "function")
            return;
        this.m.viroSetLightShadowOpacity(light, opacity);
    }
    setLightShadowMapSize(light, size) {
        if (typeof this.m.viroSetLightShadowMapSize !== "function")
            return;
        this.m.viroSetLightShadowMapSize(light, size);
    }
    setLightShadowBias(light, bias) {
        if (typeof this.m.viroSetLightShadowBias !== "function")
            return;
        this.m.viroSetLightShadowBias(light, bias);
    }
    setLightShadowNearZ(light, nearZ) {
        if (typeof this.m.viroSetLightShadowNearZ !== "function")
            return;
        this.m.viroSetLightShadowNearZ(light, nearZ);
    }
    setLightShadowFarZ(light, farZ) {
        if (typeof this.m.viroSetLightShadowFarZ !== "function")
            return;
        this.m.viroSetLightShadowFarZ(light, farZ);
    }
    setLightShadowOrthographicSize(light, size) {
        if (typeof this.m.viroSetLightShadowOrthographicSize !== "function")
            return;
        this.m.viroSetLightShadowOrthographicSize(light, size);
    }
    addLightToNode(node, light) {
        this.m.viroAddLightToNode(node, light);
    }
    removeLightFromNode(node, light) {
        this.m.viroRemoveLightFromNode(node, light);
    }
    destroyLight(light) {
        this.m.viroDestroyLight(light);
    }
    // --- Camera ---
    setNodeCamera(node) {
        this.m.viroSetNodeCamera(node);
    }
    setActiveCameraNode(node) {
        this.m.viroSetActiveCameraNode(node);
    }
    /**
     * Returns false when the loaded wasm predates orthographic support, so a
     * renderer built before it degrades to perspective instead of throwing on
     * every camera mount. Same reasoning as arSetCameraIntrinsics below.
     */
    setCameraProjection(node, projection) {
        if (typeof this.m.viroSetCameraProjection !== "function") {
            return false;
        }
        this.m.viroSetCameraProjection(node, projection === "orthographic" ? 1 : 0);
        return true;
    }
    /** Full vertical height in world units; width follows the viewport aspect ratio. */
    setCameraOrthographicScale(node, scale) {
        if (typeof this.m.viroSetCameraOrthographicScale !== "function") {
            return false;
        }
        this.m.viroSetCameraOrthographicScale(node, scale);
        return true;
    }
    // --- Model animations ---
    getAnimationKeys(node) {
        return this.m.viroGetAnimationKeys(node);
    }
    startAnimation(node, name, loop) {
        this.m.viroStartAnimation(node, name, loop);
    }
    pauseAnimation(node) {
        this.m.viroPauseAnimation(node);
    }
    resumeAnimation(node) {
        this.m.viroResumeAnimation(node);
    }
    stopAnimation(node, jumpToEnd = false) {
        this.m.viroStopAnimation(node, jumpToEnd);
    }
    // --- Declarative animations (transform/opacity via transaction) ---
    beginAnimation(node, durationSeconds, delaySeconds, loop, easing) {
        this.m.viroBeginAnimation(node, durationSeconds, delaySeconds, loop, easing);
    }
    commitAnimation() {
        this.m.viroCommitAnimation();
    }
    // --- AR ---
    initAR() {
        this.m.viroInitAR();
    }
    arSetPose(qx, qy, qz, qw, px, py, pz, trackingState) {
        this.m.viroARSetPose(qx, qy, qz, qw, px, py, pz, trackingState);
    }
    arSetCameraBackground(texture) {
        this.m.viroARSetCameraBackground(texture);
    }
    arSetCameraImageSize(width, height) {
        this.m.viroARSetCameraImageSize(width, height);
    }
    /**
     * The camera's real intrinsics, which the projection frustum is built from.
     *
     * Prefer this over arSetCameraImageSize wherever the intrinsics are known.
     * With only the dimensions, virocore projects the scene through a fixed
     * 60-degree vertical field of view — the camera background is a screen-space
     * surface and fills the viewport regardless, so the feed looks right while the
     * 3-D content sits in the wrong place, slightly near the optical axis and
     * badly toward the edges.
     *
     * Returns false against a virocore build without the binding, so a caller can
     * tell "no intrinsics were used" from "intrinsics were applied".
     */
    arSetCameraIntrinsics(fx, fy, cx, cy, width, height) {
        if (typeof this.m.viroARSetCameraIntrinsics !== "function") {
            this.m.viroARSetCameraImageSize(width, height);
            return false;
        }
        this.m.viroARSetCameraIntrinsics(fx, fy, cx, cy, width, height);
        return true;
    }
}
