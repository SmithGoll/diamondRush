/**
 * @author Smith Goll
 */

import {createElement, createTable, renderCanvasEngine2DImage} from "../utils.js";

function isDisplayableChar(code) {
    return code >= 32 && (code < 127 || code > 159);
}

/**
 * @param chunk {FileChunk}
 * @return {Promise<TParsedDataData>}
 */
export async function parse(chunk) {
    const data = chunk.data
    return {data}
}

/**
 * @param chunk {FileChunk}
 * @param parsed {TParsedDataData}
 * @param config {TParseConfig}
 * @return {Promise<HTMLElement>}
 */
export async function render(chunk, parsed, config) {
    /** @type {Uint8Array} */
    const data = new Uint8Array(parsed.data)
    const fontSprData = await config.parseOtherFile("ui.f")
    const sprite = (await fontSprData[1].parse()).data.sprite

    const renderImageData = (data, scale = config.render_scale) => renderCanvasEngine2DImage(data.width, data.height, engine => {
        engine.addElement(engine.createImage("image", data), 0, 0, 0)
    }, scale, config.sprites_background)

    const tableContent = []
    for (let i = 0; i < data.length; i++) {
        let desc = 'None'
        let charSpr = ''

        if (i <= 0x20) {
            switch (i) {
                case 0x1:
                    desc = 'SetCurPalette nextChar'
                    break
                case 0x2:
                    desc = 'SetMapIndex nextChar'
                    break
                case 0xa:
                    desc = 'LF (Line Feed)'
                    break
                case 0x20:
                    desc = 'Space'
                    break
            }
        } else {
            let mapIndex = data[i]

            // (/ui.f chunk 1) fm_num[0] = 0x59
            if (mapIndex >= 0x59) {
                mapIndex -= 0x59;

                desc = `Frame ${mapIndex}`
                charSpr = await sprite.frames[mapIndex].getParsedData(0)
            } else {
                const moduleIndex = sprite.frameModules[mapIndex].moduleIndex

                desc = `FModule ${mapIndex}`
                charSpr = await sprite.modules[moduleIndex].getParsedData(0)
            }
        }

        if (typeof charSpr !== "string") {
            charSpr = renderImageData(charSpr)
        }

        tableContent.push([
            isDisplayableChar(i) ? `'${String.fromCharCode(i)}'` : `0x${i.toString(16).padStart(2, '0')}`,
            desc,
            charSpr
        ])
    }

    return createElement("div", [
        createTable(
            ['Index', 'Description', 'Sprite'],
            tableContent
        )
    ])
}
