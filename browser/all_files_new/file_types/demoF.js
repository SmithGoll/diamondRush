/**
 * @author Jakub Augustýn <kubik.augustyn@post.cz>
 * @copyright Jakub Augustýn <kubik.augustyn@post.cz>
 * @home https://jakub-augustyn.web.app/
 */

import {BSprite, render as renderSprite} from "./sprites.js"
import {createElement} from "../utils.js";

/**
 * @readonly
 * @enum {number}
 */
const OPCODE = {
    INSTRUCTION_BLOCK: 0,
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
 * Writes an unsigned Java short to a byte array at a certain offset (little endian).
 * @param bytes {Uint8Array}
 * @param offset {number}
 * @param short {number}
 */
function writeShort(bytes, offset, short) {
    bytes[offset] = short & 0xFF
    bytes[offset + 1] = (short >> 8) & 0xFF
}

/**
 * Writes an unsigned Java int to a byte array at a certain offset (little endian).
 * @param bytes {Uint8Array}
 * @param offset {number}
 * @param int {number}
 */
function writeInt(bytes, offset, int) {
    bytes[offset] = int & 0xFF
    bytes[offset + 1] = (int >> 8) & 0xFF
    bytes[offset + 2] = (int >> 16) & 0xFF
    bytes[offset + 3] = (int >> 24) & 0xFF
}

/**
 * @param chunk {FileChunk}
 * @return {Promise<TParsedDataData>}
 */
export async function parse(chunk) {
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
                case OPCODE.INSTRUCTION_BLOCK:
                    operation.instructionCount = subDataView.getUint8(subPtr++)
                    opcodeCountPlusNestedBlocks += operation.instructionCount
                    break
                case OPCODE.MOVE_CAMERA:
                    // https://github.com/kubikaugustyn/Diamond-Rush-Decomp/blob/1a7b9af43eb73f8778e4fe3a59e27c171e9829ea/src/DemoInterpreter.java#L793-L805
                    operation.deltaX = (subDataView.getUint16(subPtr, true) * 24) & 0xFFFF
                    subPtr += 2
                    operation.deltaY = (subDataView.getUint16(subPtr, true) * 24) & 0xFFFF
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
                    operation.text = textDecoder.decode(subDataView.buffer.slice(subPtr, subPtr + operation.textSize))
                    subPtr += operation.textSize
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
                    operation.text = textDecoder.decode(subDataView.buffer.slice(subPtr, subPtr + operation.textSize))
                    subPtr += operation.textSize
                    break
                default:
                    console.warn("Unknown opcode " + opcode)
                    break opcode_loop
            }
            operations.push(operation)
            // console.log(operation)
        }

        demos.push({
            i,
            demoID,
            data,
            spriteIDs,
            opcodeCount,
            operationRawData: subDataView.buffer.slice(2 + spriteIDsCount * 2),
            operations
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

    const demosDivs = []
    for (const demo of demos) {
        demosDivs.push(createElement("div", [
            createElement("h2", `Demo ${demo.i + 1} (ID: ${demo.demoID})`),
            createElement("p", "Required sprite IDs: " + (demo.spriteIDs.length ? demo.spriteIDs.join(", ") : "none")),
            createElement("p", "Instructions:"),
            createElement("ul", demo.operations.map(operation => createElement("li",
                `${operation.opcodeName}(${Object
                    .entries(operation)
                    .filter(([key, value]) => !["opcode", "opcodeName"].includes(key))
                    .map(([key, value]) => `${key}: ${typeof value === "string" ? '"' + value + '"' : value}`)
                    .join(", ")
                })`
            ))),
        ]))
    }

    return createElement("div", demosDivs)
}
