/**
 * @author Jakub Augustýn <kubik.augustyn@post.cz>
 * @copyright Jakub Augustýn <kubik.augustyn@post.cz>
 * @home https://jakub-augustyn.web.app/
 */

import {BSprite, render as renderSprite} from "./sprites.js"
import {createElement, delayedRender} from "../utils.js";
import {parseRequiredFilesToRender, Stage} from "./stages.js";

/**
 * @readonly
 * @enum {number}
 */
const OPCODE = {
    PARALLEL_EXECUTION: 0,
    MOVE_CAMERA: 1,
    PAINT_CHAT: 2,
    DELAY: 6,
    PLAYER_MOVE: 10,
    SET_DEMO_SPR: 11,
    SET_POS_AND_SHOW_DEMO_SPR: 12,
    HIDE_DEMO_SPR: 15,
    SHOW_DECO_SYMBOL: 16,
    HIDE_DECO_SYMBOL: 17,
    SCREEN_BLINK: 18,
    SET_BLOCK_3: 25,
    SET_BLOCK_4: 26,
    PAINT_HINT: 27,
}

/**
 * @readonly
 * @type {Readonly<{demoID: number, worldIndex: number, stageIndex: number, x: number, y: number}[]>}
 */
const HARDCODED_DEMOS = Object.freeze([
    {demoID: 10, worldIndex: 0, stageIndex: 13, x: 31, y: 7},
    {demoID: 11, worldIndex: 0, stageIndex: 13, x: 28, y: 6},
    {demoID: 13, worldIndex: 0, stageIndex: 13, x: 37, y: 7},
    {demoID: 16, worldIndex: 0, stageIndex: 13, x: 46, y: 7},
    {demoID: 20, worldIndex: 0, stageIndex: 0, x: 20 - 1, y: 9}, // Technically doesn't have a block that starts it, but whatever
    {demoID: 22, worldIndex: 0, stageIndex: 3, x: 26, y: 18},
    {demoID: 23, worldIndex: 1, stageIndex: 2, x: 24, y: 25},
    {demoID: 24, worldIndex: 1, stageIndex: 7, x: 20, y: 12},
    {demoID: 25, worldIndex: 2, stageIndex: 5, x: 32, y: 22},
    {demoID: 28, worldIndex: 0, stageIndex: 13, x: 57, y: 8},
    {demoID: 29, worldIndex: 0, stageIndex: 13, x: 6, y: 4},
    {demoID: 30, worldIndex: 0, stageIndex: 2, x: 6, y: 18},
    {demoID: 33, worldIndex: 0, stageIndex: 8, x: 6, y: 5},
    {demoID: 34, worldIndex: 1, stageIndex: 9, x: 9, y: 20},
    {demoID: 35, worldIndex: 2, stageIndex: 10, x: 8, y: 16},
])

/**
 * @param config {TParseConfig|null}
 * @param operation {Object}
 * @return {Promise<void>}
 */
async function parseText(config, operation) {
    // https://github.com/kubikaugustyn/DiamondRushSource/blob/4629d6c6729875d479e65f93a8fe3f9d36b3e51e/src/main/java/i.java#L3017-L3184
    operation.textIndex = {
        0: 79,
        1: 80,
        2: 91,
        3: 102,
        4: 112,
        5: 113,
        6: 114,
        7: 115,
        8: 116,
        9: 117,
        10: 81,
        11: 82,
        12: 83,
        13: 84,
        14: 85,
        15: 86,
        16: 87,
        17: 88,
        18: 89,
        19: 90,
        20: 92,
        21: 93,
        22: 94,
        23: 95,
        24: 96,
        25: 97,
        26: 98,
        27: 99,
        28: 100,
        29: 101,
        30: 103,
        31: 104,
        32: 105,
        33: 106,
        34: 107,
        35: 108,
        36: 109,
        37: 110,
        38: 111,
    }[parseInt(operation.rawText, 10)] ?? null

    if (config === null || operation.textIndex === null) {
        operation.text = null
        return
    }
    const chunks = await config.parseOtherFile("lang.xx")
    if (chunks === null || chunks.length < 1) {
        operation.text = null
        return
    }
    const data = (await chunks[0].parse(config)).data
    operation.text = data.texts[operation.textIndex] ?? "null"
}

/**
 * @param chunk {FileChunk}
 * @param config {TParseConfig|null}
 * @return {Promise<TParsedDataData>}
 */
export async function parse(chunk, config) {
    const dataView = new DataView(chunk.data)
    let ptr = 0

    const demoCount = dataView.getUint16(ptr, true)
    ptr += 2
    /** @x-type {{i: number, demoSpriteID: number, data: ArrayBuffer, sprite: BSprite}[]} */
    const demos = []
    for (let i = 0; i < demoCount; i++) {
        const demoID = dataView.getUint16(ptr, true)
        ptr += 2

        const opcodeCount = dataView.getUint16(ptr, true)
        let opcodeCountPlusNestedBlocks = opcodeCount
        ptr += 2
        const dataSize = dataView.getUint32(ptr, true)
        ptr += 4
        const data = dataView.buffer.slice(ptr, ptr + dataSize)
        ptr += dataSize

        // Change the view
        const subDataView = new DataView(data)
        let subPtr = 0

        const spriteIDsCount = subDataView.getUint16(subPtr, true)
        subPtr += 2
        const spriteIDs = []
        for (let j = 0; j < spriteIDsCount; j++) {
            spriteIDs.push(subDataView.getUint16(subPtr, true))
            subPtr += 2
        }
        spriteIDs.sort((a, b) => a - b) // ChatGPT says they use it... idk why


        const textDecoder = new TextDecoder("utf-8", {fatal: true, ignoreBOM: false})
        const operations = []
        opcode_loop: for (let j = 0; j < opcodeCountPlusNestedBlocks; j++) {
            const opcode = subDataView.getUint8(subPtr++)
            // console.log(i, j, opcode, new Uint8Array(subDataView.buffer.slice(subPtr - 1, subPtr + 50)))

            const operation = {
                opcode,
                opcodeName: Object.entries(OPCODE).find(([name, value]) => value === opcode)?.[0] ?? null,
                data: null,
            }
            switch (opcode) {
                case OPCODE.PARALLEL_EXECUTION:
                    operation.instructionCount = subDataView.getUint8(subPtr++)
                    opcodeCountPlusNestedBlocks += operation.instructionCount
                    break
                case OPCODE.MOVE_CAMERA:
                    // https://github.com/kubikaugustyn/Diamond-Rush-Decomp/blob/1a7b9af43eb73f8778e4fe3a59e27c171e9829ea/src/DemoInterpreter.java#L793-L805
                    operation.blockX = subDataView.getUint16(subPtr, true)
                    subPtr += 2
                    operation.blockY = subDataView.getUint16(subPtr, true)
                    subPtr += 2
                    operation.frames = subDataView.getUint16(subPtr, true)
                    subPtr += 2
                    /*writeShort(operation.data = new Uint8Array(12), 2, operation.deltaX)
                    writeShort(operation.data, 4, operation.deltaY)
                    writeShort(operation.data, 6, operation.frames)
                    writeShort(operation.data, 8, 10_000)
                    writeShort(operation.data, 10, 10_000)*/
                    break
                case OPCODE.PLAYER_MOVE:
                    operation.direction = subDataView.getUint8(subPtr++)
                    operation.directionName = [null, "UP", "RIGHT", "DOWN", "LEFT"][operation.direction] ?? null
                    break
                case OPCODE.SET_DEMO_SPR:
                    // https://github.com/kubikaugustyn/Diamond-Rush-Decomp/blob/1a7b9af43eb73f8778e4fe3a59e27c171e9829ea/src/DemoInterpreter.java#L886-L893
                    operation.heroSpriteId = subDataView.getUint16(subPtr, true)
                    subPtr += 2
                    operation.backgroundSpriteAnimationId = subDataView.getUint16(subPtr, true)
                    subPtr += 2
                    /*writeShort(operation.data = new Uint8Array(6), 2, operation.heroSpriteId)
                    writeShort(operation.data, 4, operation.backgroundSpriteAnimationId)*/
                    break
                case OPCODE.SET_POS_AND_SHOW_DEMO_SPR:
                    operation.posX = subDataView.getUint16(subPtr, true)
                    subPtr += 2
                    operation.posY = subDataView.getUint16(subPtr, true)
                    subPtr += 2
                    break
                case OPCODE.HIDE_DEMO_SPR:
                    break
                case OPCODE.DELAY:
                    operation.delay = subDataView.getUint32(subPtr, true)
                    subPtr += 4
                    break
                case OPCODE.PAINT_CHAT:
                    operation.textLines = subDataView.getUint8(subPtr)
                    subPtr += 1
                    operation.offsetY = subDataView.getUint16(subPtr, true)
                    subPtr += 2
                    operation.textSize = subDataView.getUint16(subPtr, true)
                    subPtr += 2
                    operation.rawText = textDecoder.decode(subDataView.buffer.slice(subPtr, subPtr + operation.textSize))
                    subPtr += operation.textSize
                    await parseText(config, operation)
                    break
                case OPCODE.SHOW_DECO_SYMBOL:
                    operation.frameIndex = subDataView.getUint16(subPtr, true)
                    subPtr += 2
                    operation.blinkCount = subDataView.getUint8(subPtr++)
                    break
                case OPCODE.HIDE_DECO_SYMBOL:
                    operation.unused_frameIndex = subDataView.getUint16(subPtr, true)
                    subPtr += 2
                    operation.needHide = subDataView.getUint8(subPtr++)
                    break
                case OPCODE.SCREEN_BLINK:
                    operation.blinkCount = subDataView.getUint8(subPtr++)
                    operation.color = [
                        subDataView.getUint8(subPtr++),
                        subDataView.getUint8(subPtr++),
                        subDataView.getUint8(subPtr++)
                    ]
                    break
                case OPCODE.SET_BLOCK_3:
                    operation.blockX = subDataView.getUint16(subPtr, true)
                    subPtr += 2
                    operation.blockY = subDataView.getUint16(subPtr, true)
                    subPtr += 2
                    operation.blockId = subDataView.getUint8(subPtr++)
                    operation.specialData = subDataView.getUint8(subPtr++)
                    break
                case OPCODE.SET_BLOCK_4:
                    operation.blockX = subDataView.getUint16(subPtr, true)
                    subPtr += 2
                    operation.blockY = subDataView.getUint16(subPtr, true)
                    subPtr += 2
                    operation.blockId = subDataView.getUint32(subPtr)
                    subPtr += 4
                    break
                case OPCODE.PAINT_HINT:
                    operation.textSize = subDataView.getUint16(subPtr, true)
                    subPtr += 2
                    operation.rawText = textDecoder.decode(subDataView.buffer.slice(subPtr, subPtr + operation.textSize))
                    subPtr += operation.textSize
                    await parseText(config, operation)
                    break
                default:
                    console.warn("Unknown opcode " + opcode)
                    break opcode_loop
            }
            operations.push(operation)
            // console.log(operation)
        }
        const transformedOperations = []
        for (let i = 0; i < operations.length; i++) {
            const operation = operations[i]

            if (operation.opcode === OPCODE.PARALLEL_EXECUTION) {
                operation.subOperations = operations.slice(i + 1, i + 1 + operation.instructionCount)
                i += operation.instructionCount
            }

            transformedOperations.push(operation)
        }

        demos.push({
            i,
            demoID,
            data,
            spriteIDs,
            opcodeCount,
            operationRawData: subDataView.buffer.slice(2 + spriteIDsCount * 2),
            operations: transformedOperations
        })
        // console.log("Demos:", demos)
    }

    console.log("demo.f parsed:", demos)

    return {demos}
}

/**
 * @param chunk {FileChunk}
 * @param parsed {TParsedDataData}
 * @param config {TParseConfig}
 * @return {Promise<HTMLElement>}
 */
export async function render(chunk, parsed, config) {
    const demos = parsed.demos

    const stringifyOperation = operation => `${operation.opcodeName}(${Object
        .entries(operation)
        .filter(([key, value]) => !["opcode", "opcodeName", "data", "subOperations"].includes(key))
        .map(([key, value]) => `${key}: ${typeof value === "string" ? '"' + value + '"' : value}`)
        .join(", ")
    })`

    const demosDivs = []
    for (const demo of demos) {
        demosDivs.push(createElement("div", [
            createElement("h2", `Demo ${demo.i + 1} (ID: ${demo.demoID})`),
            createElement("p", "Required sprite IDs: " + (demo.spriteIDs.length ? demo.spriteIDs.join(", ") : "none")),
            createElement("p", "Instructions:"),
            createElement("ul", demo.operations.map(operation => createElement("li", [
                new Text(stringifyOperation(operation)),
                operation.opcode === OPCODE.PARALLEL_EXECUTION ?
                    createElement("ul", operation.subOperations.map(op => createElement("li", stringifyOperation(op)))) :
                    null
            ]))),
            await delayedRender(async () => {
                return renderDemo(chunk, demo, config);
            }, config)
        ]))
    }

    return createElement("div", demosDivs)
}

/**
 * Returns the interpolated (x, y) position for a given frame index in a linear motion between two points.
 *
 * @param {number} startX - Starting X coordinate.
 * @param {number} startY - Starting Y coordinate.
 * @param {number} endX - Ending X coordinate.
 * @param {number} endY - Ending Y coordinate.
 * @param {number} frameCount - Total number of frames (including start and end).
 * @param {number} frameI - Index of the current frame (0 to frameCount - 1).
 * @returns {{x: number, y: number}} Interpolated coordinates at the given frame.
 * @author ChatGPT
 */
function interpolate(startX, startY, endX, endY, frameCount, frameI) {
    const t = frameI / (frameCount - 1);
    const x = startX + t * (endX - startX);
    const y = startY + t * (endY - startY);
    return {x, y};
}

/**
 * @param chunk {FileChunk}
 * @param demo {Object}
 * @param config {TParseConfig}
 * @return {HTMLCanvasElement}
 */
async function renderDemo(chunk, demo, config) {
    const heroSpriteChunks = await config.parseOtherFile("o.f")
    if (heroSpriteChunks === null || heroSpriteChunks.length < 1) return new Text("Error: Could not load o.f")

    const demoSpriteChunks = await config.parseOtherFile("demoSpr.bin")
    if (demoSpriteChunks === null || demoSpriteChunks.length < 1) return new Text("Error: Could not load demoSpr.bin")
    /** @type {BSprite} */
    const heroHeadSprite = (await demoSpriteChunks[0].parse(config)).data.chunks.find(ch => ch.demoSpriteID === 0).sprite,
        heroHeadBackgroundSprite = (await demoSpriteChunks[0].parse(config)).data.chunks.find(ch => ch.demoSpriteID === 2).sprite,
        heroHeadDecorationSprite = (await demoSpriteChunks[0].parse(config)).data.chunks.find(ch => ch.demoSpriteID === 1).sprite
    if (heroHeadSprite === null || heroHeadBackgroundSprite === null || heroHeadDecorationSprite === null) return new Text("Error: Could not find sprites in demoSpr.bin")

    if (demo.operations.length === 0) return new Text("Error: No operations to render")

    const hardcodedDemoInfo = HARDCODED_DEMOS.find(d => d.demoID === demo.demoID) ?? null
    if (hardcodedDemoInfo === null) return new Text("Error: No hardcoded world to render the demo in")
    const worldChunks = await config.parseOtherFile(`w${hardcodedDemoInfo.worldIndex}.bin`)
    if (worldChunks === null) return new Text("Error: Could not load the hardcoded world")
    /** @type {Stage} */
    const stage = (await worldChunks[0].parse(config)).data.stages[hardcodedDemoInfo.stageIndex] ?? null
    if (stage === null) return new Text("Error: Could not load the hardcoded stage")
    const stageBaseLayers = {
        background: new Uint8Array(stage.backgroundLayer),
        player: new Uint8Array(stage.playerLayer),
        foreground: new Uint8Array(stage.foregroundLayer)
    }

    /** @type {BSprite} */
    const heroSprite = (await heroSpriteChunks[0].parse(config)).data.sprite
    const palette = 0 // I like blue

    const canvas = document.createElement("canvas")
    const [width, height] = [240, 320]
    const [originBlockX, originBlockY] = [hardcodedDemoInfo.x, hardcodedDemoInfo.y]
    const [originX, originY] = [originBlockX * 24, originBlockY * 24]
    const engine = new CanvasEngine2D({
        canvas: canvas,
        appName: "diamondRush-browser-all_files_new-utils-renderCanvasEngine2DImage",
        imageW: stage.width * 24,
        imageH: stage.height * 24,
        backgroundColor: config.sprites_background, // or CanvasEngine2DVariables.COLORS.BLACK?
        scale: config.render_scale,
        camera: new CanvasEngine2DCamera(0, 0, width, height, 1), // x, y, w, h, zoom
    })
    /** @type {CanvasEngine2DCamera} */
    const camera = engine.args.camera
    let [cameraBlockX, cameraBlockY] = [0, 0]
    const calcBlockX = x => x * 24
    const calcBlockY = y => y * 24
    const moveCamera = (x, y) => {
        cameraBlockX = x
        cameraBlockY = y
        camera.x = Math.floor(calcBlockX(cameraBlockX) - Math.floor(width / 2) + 12)
        camera.y = Math.floor(calcBlockY(cameraBlockY) - Math.floor(height / 2) + 12)
    }

    const {blocksFileChunks, otherFiles} = await parseRequiredFilesToRender(config, hardcodedDemoInfo.worldIndex)
    let stageImage = null
    const renderStage = async () => {
        const stageCanvas = document.createElement("canvas")
        const stageEngine = new CanvasEngine2D({
            canvas: stageCanvas,
            appName: "diamondRush-browser-all_files_new-utils-renderCanvasEngine2DImage",
            imageW: stage.width * 24,
            imageH: stage.height * 24,
            backgroundColor: CanvasEngine2DVariables.COLORS.BLACK,
            scale: config.render_scale,
            customBackground: true
        })
        await stage.renderToEngine(stageEngine, blocksFileChunks, otherFiles, hardcodedDemoInfo.worldIndex, hardcodedDemoInfo.stageIndex, config)
        stageEngine.render()

        stageImage = stageEngine.image

        engine.removeElementsById("stage_image")
        engine.addElement(engine.createImage("stage_image", stageImage), 0, 0, 0)
    }

    let operationI = 0, operationTick = 0, operationData = null

    async function performOperation(operation) {
        let gotoNextOperation = false, breakCompletely = false, eatFrame = true
        switch (operation.opcode) {
            case OPCODE.MOVE_CAMERA: {
                if (operationTick === 0) {
                    operationData = {startX: cameraBlockX, startY: cameraBlockY}
                }
                const {x, y} = interpolate(
                    operationData.startX, operationData.startY,
                    operation.blockX, operation.blockY,
                    operation.frames, operationTick
                )
                moveCamera(x, y)
                gotoNextOperation = operationTick >= operation.frames - 1
                break
            }
            case OPCODE.SET_BLOCK_3: {
                const blockI = operation.blockX + operation.blockY * stage.width
                stage.playerLayer[blockI] = operation.blockId
                stage.foregroundLayer[blockI] = operation.specialData
                await renderStage()
                gotoNextOperation = true
                break
            }
            case OPCODE.SET_BLOCK_4: {
                const blockI = operation.blockX + operation.blockY * stage.width
                stage.playerLayer[blockI] = operation.blockId
                await renderStage()
                gotoNextOperation = true
                break
            }
            case OPCODE.DELAY:
                gotoNextOperation = operationTick >= operation.delay - 1
                break
            case OPCODE.SET_DEMO_SPR: {
                const {visible, x, y} = engine.getElementById("demoSprite") ?? {visible: false, x: 0, y: 0}
                engine.removeElementsById("demoSprite")

                const heroHeadBackground = heroHeadBackgroundSprite.frames[operation.backgroundSpriteAnimationId & 1].getParsedData(0)
                engine.addElement(engine.createImage("demoSprite", heroHeadBackground), x, y, 12)

                const heroHead = heroHeadSprite.frames[operation.heroSpriteId].getParsedData(0)
                engine.addElement(engine.createImage("demoSprite", heroHead), x, y, 12)

                engine.setElementsVisibilityById("demoSprite", visible)
                gotoNextOperation = true
                eatFrame = false
                break
            }
            case OPCODE.SET_POS_AND_SHOW_DEMO_SPR: {
                engine.setElementsPositionById("demoSprite", camera.x + operation.posX, camera.y + operation.posY, 12)
                engine.setElementsVisibilityById("demoSprite", true)
                gotoNextOperation = true
                break
            }
            case OPCODE.HIDE_DEMO_SPR: {
                engine.setElementsVisibilityById("demoSprite", false)
                engine.removeElementsById("demoSpriteDecoration")
                gotoNextOperation = true
                break
            }
            case OPCODE.PAINT_CHAT: {
                let chat = engine.getElementById("chat")
                if (!chat)
                    chat = engine.addElement(engine.createText("chat", operation.text ?? operation.rawText, "white", "monospace"), 0, 0, 12)
                chat.y = camera.y + operation.offsetY
                chat.x = camera.x + 5 + operationTick * 5
                gotoNextOperation = chat.x - camera.x >= width

                if (gotoNextOperation) {
                    eatFrame = true
                    engine.removeElementsById("chat")
                }
                break
            }
            case OPCODE.PAINT_HINT: {
                let hint = engine.getElementById("hint")
                if (!hint)
                    hint = engine.addElement(engine.createText("hint", operation.text ?? operation.rawText, "white", "monospace"), 0, 0, 12)
                hint.x = camera.x + 5
                hint.y = camera.y + 270
                gotoNextOperation = operationTick >= 20

                if (gotoNextOperation) engine.removeElementsById("hint")
                break
            }
            case OPCODE.SHOW_DECO_SYMBOL: {
                const {x, y} = engine.getElementById("demoSprite") ?? {x: 0, y: 0}
                const SCALE = 5

                let element = engine.getElementById("demoSpriteDecoration")
                if (!element) {
                    const heroHeadDecoration = heroHeadDecorationSprite.frames[operation.frameIndex].getParsedData(0)
                    element = engine.addElement(engine.createImage("demoSpriteDecoration", heroHeadDecoration), x + 75, y, 12)
                }
                element.visible = !(Math.floor(operationTick / SCALE) % 2)

                gotoNextOperation = operationTick >= operation.blinkCount * 2 * SCALE
                if (gotoNextOperation) engine.removeElementsById("demoSpriteDecoration")
                break
            }
            case OPCODE.HIDE_DECO_SYMBOL: {
                engine.removeElementsById("demoSpriteDecoration")
                gotoNextOperation = true
                break
            }
            case OPCODE.SCREEN_BLINK: {
                const SCALE = 5

                let element = engine.getElementById("blinkingOverlay")
                if (!element)
                    element = engine.addElement(
                        engine.createImage("blinkingOverlay", new CanvasEngine2DImageData(
                            width, height,
                            new Uint32Array(width * height).fill(CanvasEngine2DVariables.COLORS.ToNumber([...operation.color, 255]))
                        )),
                        camera.x, camera.y, 1000
                    )
                element.visible = !(Math.floor(operationTick / SCALE) % 2)

                gotoNextOperation = operationTick >= operation.blinkCount * 2 * SCALE
                if (gotoNextOperation) engine.removeElementsById("blinkingOverlay")
                break
            }
            case OPCODE.PARALLEL_EXECUTION: {
                gotoNextOperation = true
                eatFrame = true
                for (const subOperation of operation.subOperations) {
                    if (subOperation.tmp_gotoNext) continue
                    const {
                        gotoNextOperation: sub_gotoNextOperation,
                        breakCompletely: sub_breakCompletely,
                        eatFrame: sub_eatFrame
                    } = await performOperation(subOperation)

                    subOperation.tmp_gotoNext = sub_gotoNextOperation
                    if (!sub_gotoNextOperation) gotoNextOperation = false
                    if (!sub_eatFrame) eatFrame = false
                    if (sub_breakCompletely) {
                        breakCompletely = true
                        break
                    }
                }
                if (gotoNextOperation)
                    for (const subOperation of operation.subOperations) delete subOperation.tmp_gotoNext
                break
            }
            case  OPCODE.PLAYER_MOVE: {
                const STEPS = 12, STEP_FRAMES = 1

                if (operationTick % STEP_FRAMES === 0) {
                    if (operation.directionName === "LEFT")
                        engine.getElementById("hero").x -= 24 / STEPS
                    else if (operation.directionName === "RIGHT")
                        engine.getElementById("hero").x += 24 / STEPS
                    else if (operation.directionName === "UP")
                        engine.getElementById("hero").y -= 24 / STEPS
                    else if (operation.directionName === "DOWN")
                        engine.getElementById("hero").y += 24 / STEPS
                }

                gotoNextOperation = operationTick >= STEPS * STEP_FRAMES - 1
                break
            }
            default:
                console.error(`Unknown operation: ${operation.opcodeName}`)
                breakCompletely = true
                break
        }

        return {gotoNextOperation, breakCompletely, eatFrame}
    }

    async function render() {
        const operation = demo.operations[operationI]
        const {gotoNextOperation, breakCompletely, eatFrame} = await performOperation(operation)

        if (gotoNextOperation) {
            operationI++
            if (operationI >= demo.operations.length) {
                operationI = 0

                engine.getElementById("hero").x = originX
                engine.getElementById("hero").y = originY + 24 - hero.height
                moveCamera(originBlockX, originBlockY)
                stage.backgroundLayer.set(stageBaseLayers.background)
                stage.playerLayer.set(stageBaseLayers.player)
                stage.foregroundLayer.set(stageBaseLayers.foreground)
                await renderStage()
            }
            operationTick = 0
            operationData = null

            if (!eatFrame && !breakCompletely) {
                await render()
                return
            }
        }
        else operationTick++

        engine.render()
        const delay = Math.max(0, 50 - engine.time.render.total) // 20FPS = 50ms per frame
        // console.log("Render", engine.time.render, delay)
        if (!breakCompletely) setTimeout(render, delay)
    }

    // const originImageData = new CanvasEngine2DImageData(24, 24, new Uint32Array(24 * 24).fill(CanvasEngine2DVariables.COLORS.ToNumber(config.sprites_animation_origin_background)))
    // engine.addElement(engine.createImage("origin", originImageData), originX, originY, 10)

    // Move the camera so the origin is in the middle
    moveCamera(originBlockX, originBlockY)

    const hero = heroSprite.frames[2].getParsedData(palette)
    engine.addElement(engine.createImage("hero", hero), originX, originY + 24 - hero.height, 11)

    await renderStage()
    await render()
    console.log(engine)

    return canvas
}
