/**
 * @author Jakub Augustýn <kubik.augustyn@post.cz>
 * @copyright Jakub Augustýn <kubik.augustyn@post.cz>
 * @home https://jakub-augustyn.web.app/
 */

import {copyToClipboardButton, createElement, delayedRender, downloadCanvasButton, toggleButton} from "../utils.js";

const fileNameToMapID = new Map([
    ["w0.bin", "angkor"],
    ["w1.bin", "bavaria"],
    ["w2.bin", "siberia"],
])
const mapIDToBlocksFileName = new Map([
    ["angkor", "0.f"],
    ["bavaria", "1.f"],
    ["siberia", "2.f"],
])

class BlockWrapper {
    /**
     * @type {image: Promise<CanvasEngine2DImageData|null>, dx: number, dy: number}
     */
    image
    /**
     * @type {string}
     */
    elementId
    /**
     * @type {number}
     */
    layer
    /**
     * @type {boolean}
     */
    handlePlayerLayer
    /**
     * @type {function}
     */
    customHandler
    /**
     * @type {}
     */
    customData

    constructor(image, elementId, layer = 0, handlePlayerLayer = true, customHandler = null, customData = null) {
        this.image = image
        this.elementId = elementId
        this.layer = layer
        this.handlePlayerLayer = handlePlayerLayer
        this.customHandler = customHandler
        this.customData = customData
    }

    addToEngine(engine, x, y, specData) {
        if (this.image !== null) {
            engine.addElement(engine.createImage(this.elementId, this.image.image), x + this.image.dx, y + this.image.dy, this.layer)
        }

        if (this.customHandler !== null) {
            this.customHandler(engine, this.elementId, x, y, specData, this.customData)
        }
        return this.handlePlayerLayer
    }
}

export class Stage {
    /**
     * @readonly
     * @type {number}
     */
    width
    /**
     * @readonly
     * @type {number}
     */
    height
    /**
     * @readonly
     * @type {Uint8Array}
     */
    backgroundLayer
    /**
     * @readonly
     * @type {Uint8Array}
     */
    playerLayer
    /**
     * @readonly
     * @type {Uint8Array}
     */
    foregroundLayer

    /**
     * @param width {number}
     * @param height {number}
     * @param backgroundLayer {Uint8Array}
     * @param playerLayer {Uint8Array}
     * @param foregroundLayer {Uint8Array}
     */
    constructor(width, height, backgroundLayer, playerLayer, foregroundLayer) {
        if (backgroundLayer.length !== width * height || playerLayer.length !== width * height || foregroundLayer.length !== width * height)
            throw new Error("Invalid layer length")

        this.width = width
        this.height = height
        this.backgroundLayer = backgroundLayer
        this.playerLayer = playerLayer
        this.foregroundLayer = foregroundLayer
    }

    /**
     * @param x {number}
     * @param y {number}
     * @return {{background: number, foreground: number, player: number}}
     */
    getBlock(x, y) {
        if (x < 0 || x >= this.width) throw new Error("Block X out of bounds")
        if (y < 0 || y >= this.height) throw new Error("Block Y out of bounds")
        const index = x + y * this.width

        return {
            background: this.backgroundLayer[index],
            player: this.playerLayer[index],
            foreground: this.foregroundLayer[index],
        }
    }

    /**
     * @param scale {number}
     * @return {HTMLCanvasElement}
     */
    renderNumbers(scale) {
        var canvas = document.createElement("canvas")
        var s = scale // Scale
        var bs = 24 * s // Block size
        canvas.width = bs * this.width
        canvas.height = bs * this.height
        var ctx = canvas.getContext("2d")

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const block = this.getBlock(x, y)
                var bx = x * bs // Block X
                var by = y * bs // Block Y
                ctx.fillStyle = "white"

                if (block.player === 255)
                    ctx.fillStyle = (block.foreground >= 80 && block.foreground <= 146) ?
                        "#0F0" :
                        "green"
                else if (block.player === 10)
                    ctx.fillStyle = "lightgreen"
                else if (block.player === 0)
                    ctx.fillStyle = "gray"
                else if (block.player === 1)
                    ctx.fillStyle = "#F0F"
                else if (block.player >= 80 && block.player <= 146)
                    ctx.fillStyle = "yellow"

                ctx.fillRect(bx, by, bs, bs)
                ctx.rect(bx, by, bs, bs)

                ctx.fillStyle = "black"
                ctx.font = `${6 * s}px Arial`
                ctx.textBaseline = "top"

                ctx.fillText(block.player.toString().padStart(3, ""), bx + s, by + s, bs)
                ctx.fillText(block.background.toString().padStart(3, ""), bx + s, by + 9 * s, bs)
                ctx.fillText(block.foreground.toString().padStart(3, ""), bx + s, by + 17 * s, bs)
            }
        }
        ctx.strokeStyle = "black"
        ctx.stroke()

        return canvas
    }

    /**
     * @param engine {CanvasEngine2D}
     * @param blocksFileChunks {FileChunk[]|null}
     * @param cm {FileChunk[]|null}
     * @param gen0 {FileChunk[]|null}
     * @param gen1 {FileChunk[]|null}
     * @param gen2 {FileChunk[]|null}
     * @param gen3 {FileChunk[]|null}
     * @param gen4 {FileChunk[]|null}
     * @param mmv {FileChunk[]|null}
     * @param b0 {FileChunk[]|null}
     * @param ui {FileChunk[]|null}
     * @param mm0 {FileChunk[]|null}
     * @param b1 {FileChunk[]|null}
     * @param mm1 {FileChunk[]|null}
     * @param worldIndex {0|1|2}
     * @param stageIndex {number}
     * @param config {TParseConfig|null}
     * @returns {HTMLCanvasElement}
     */
    async renderToEngine(engine, blocksFileChunks, {
        cm,
        gen0,
        gen1,
        gen2,
        gen3,
        gen4,
        mmv,
        b0,
        ui,
        mm0,
        b1,
        mm1
    }, worldIndex, stageIndex, config = null) {
        config = config || {
            stages_render_special: true,
            stages_render_chest_contents: true,
            stages_render_unknown: true,
            stages_render_decoration: true,
            stages_render_invisible: true
        }

        engine.args.renderText = config.stages_render_invisible

        /**
         * Gets a module from a file's chunk.
         * @param file {FileChunk[]|null}
         * @param chunkI {number}
         * @param moduleI {number}
         * @param paletteI {number}
         * @return {Promise<CanvasEngine2DImageData|null>}
         */
        async function getModule(file, chunkI, moduleI, paletteI, dx = 0, dy = 0) {
            if (file === null) return null
            const sprite = (await file[chunkI].parse()).data.sprite
            return {
                image: await sprite.modules[moduleI].getParsedData(paletteI),
                dx: dx,
                dy: dy
            }
        }

        /**
         * Gets a frame from a file's chunk.
         * @param file {FileChunk[]|null}
         * @param chunkI {number}
         * @param frameI {number}
         * @param paletteI {number}
         * @return {Promise<CanvasEngine2DImageData|null>}
         */
        async function getFrame(file, chunkI, frameI, paletteI, ox = 0, oy = 0) {
            if (file === null) return null
            const sprite = (await file[chunkI].parse()).data.sprite
            return {
                image: await sprite.frames[frameI].getParsedData(paletteI),
                dx: sprite.frames[frameI].bbox.x + ox,
                dy: sprite.frames[frameI].bbox.y + oy
            }
        }

        function enginePutText(engine, id, text, color, ox, oy, layer) {
            engine.addElement(
                engine.createText(id, text, color, "13px monospace"),
                ox, oy, layer
            )
        }

        function enginePutImage(engine, id, image, ox, oy, layer) {
            engine.addElement(engine.createImage(id, image.image), ox + image.dx, oy + image.dy, layer)
        }

        function imageDataFlipX(image) {
            const w = image.width,
                  h = image.height
            const data = image.data

            const flipWidth = Math.floor(w / 2)
            for (let y = 0; y < h; y++) {
                const posY = y * w
                for (let x = 0; x < flipWidth; x++) {
                    const tmp = data[posY + x]
                    data[posY + x] = data[posY + w - 1 - x]
                    data[posY + w - 1 - x] = tmp
                }
            }
            // image.data = data
            return image
        }

        function drawFanPotAir(engine, elementId, x, y, specData, customData) {
            const stage = customData[0]
            const fanPotAirTile = customData[1]

            const blockX = x / 24
            const blockY = y / 24

            for (let i = 1; i < 10; i++) {
                if (blockY - i < 0) break
                const block = stage.getBlock(blockX, blockY - i)
                if (block.player !== 255 && block.player >= 80) break
                if ([10, 18, 22, 23, 30, 34, 35, 37, 44, 47, 79].includes(block.player)) break
                engine.drawImageImage(x + fanPotAirTile.dx, y - (i * 24) + fanPotAirTile.dy, fanPotAirTile.image)
            }
        }

        function drawSpawnPointDoor(engine, elementId, x, y, specData, customData) {
            let blockX = x - 48

            // set layer to 1 make sure door rendering fine
            enginePutImage(engine, "spawn_point_door", customData[0], blockX, y, 1)
            enginePutImage(engine, "spawn_point_door", customData[1], blockX, y, 1)
        }

        function drawSnake(engine, elementId, x, y, specData, customData) {
            let snakeTile = customData[1]
            switch (specData) {
                case 0:
                    snakeTile = customData[2]
                    break
                case 1:
                case 3:
                    snakeTile = customData[0]
                    break
            }

            enginePutImage(engine, elementId, snakeTile, x, y, 1)
        }

        function drawPurpleGemCount(engine, elementId, x, y, specData, customData) {
            let gemCount = specData
            const digitFont = customData

            // Draw digit
            for (let i = 0; gemCount > 0; i++) {
                const ox = specData >= 10 ? 12 - (7 * i) : 8
                const oy = 12 // 9 + 15/2 - 9/2

                const idx = gemCount % 10

                enginePutImage(engine, "purple_gem_count", digitFont[idx], x + ox, y + oy, 2)

                gemCount = Math.floor(gemCount / 10)
            }
        }

        function drawIceLaserShooter(engine, elementId, x, y, specData, customData) {
            const shooterTile = customData[specData === 4 ? 0 : 1]
            engine.drawImageImage(x, y - 23, shooterTile.image)

            if (!config.stages_render_decoration) return

            // Draw laser
            const stage = customData[2]

            let drawDeco = true
            let laserWidth = 0
            const moveDirection = specData === 4 ? -1 : 1

            let blockX = x / 24 + moveDirection
            let blockY = y / 24 - 1
            while (blockX >= 0 && blockX < stage.width) {
                const block = stage.getBlock(blockX, blockY)
                if (block.player === 255) {
                    const laserShooter = stage.getBlock(blockX, blockY + 1)
                    if (laserShooter.player === 48) {
                        if (laserShooter.background === specData)
                            laserWidth += 12
                        drawDeco = false
                        break
                    }
                    blockX += moveDirection
                } else break

                laserWidth += 24
            }

            if (laserWidth !== 0) {
                blockX *= 24
                blockY *= 24

                if (drawDeco) {
                    const decoTile = customData[4 + (specData === 4 ? 0 : 1)]

                    enginePutImage(engine, `${elementId}_deco`, decoTile, blockX, blockY, 1)
                }

                laserWidth += 12
                blockY += 10

                if (moveDirection === 1)
                    blockX -= laserWidth
                else
                    blockX += 24

                blockX += (laserWidth % 24 === 0 ? 12 : 0) * moveDirection

                const iceLaserPosition = customData[3]
                iceLaserPosition.push({
                    x: blockX,
                    y: blockY,
                    width: laserWidth
                })
            }
        }

        function drawTurtleDirection(engine, elementId, x, y, specData, customData) {
            if (specData === 2 || specData === 4)
                enginePutText(engine, "turtle_direction", specData === 2 ? "L" : "R", "#FF0", x + 8, y + 16, 2)
        }

        function drawText(engine, elementId, x, y, specData, customData) {
            enginePutText(engine, elementId, customData[0], customData[1], x + customData[2], y + customData[3], customData[4])
        }

        function drawWater(engine, elementId, x, y, specData, customData) {
            // Draw water count
            enginePutText(engine, "sewer_water_count", specData.toString(), "#0FF", x + (specData < 10 ? 8 : 4), y + 16, 2)

            if (!config.stages_render_decoration) return

            // Draw water
            const stage = customData[0]
            const waterTile = customData[1]
            const waterSurfaceTiles = customData[2]

            let bottomBlockX = x / 24,
                bottomBlockY = y / 24

            function isAccessibleBlock(blockX, blockY) {
                const playerBlock = stage.getBlock(blockX, blockY).player
                return ![10, 35, 37].includes(playerBlock) && (playerBlock === 255 || playerBlock < 80)
            }

            function findDownGap(direction) {
                let i
                for (i = bottomBlockX; isAccessibleBlock(i, bottomBlockY); i += direction) {
                    if (isAccessibleBlock(i, bottomBlockY + 1)) {
                        bottomBlockX = i
                        bottomBlockY++

                        return true
                    }
                }
                bottomBlockX = i - 1 * direction
                return false
            }

            function drawWaterTile(count, tile, dx = 0, dy = 0) {
                for (let i = 0; i < count; i++) {
                    enginePutImage(engine, "water", tile, (bottomBlockX - i) * 24 + dx, bottomBlockY * 24 + dy, 1)
                }
            }

            while (true) {
                // search down gap
                if (isAccessibleBlock(bottomBlockX, bottomBlockY + 1)) {
                    bottomBlockY++
                    continue
                }

                // search left gap
                if (findDownGap(-1)) continue

                // search right gap
                if (findDownGap(1)) continue

                break
            }

            while (specData > 0) {
                let waterUsed = 0

                for (let i = bottomBlockX; isAccessibleBlock(i, bottomBlockY); i--) {
                    waterUsed++
                }

                if (specData < waterUsed + Math.floor(waterUsed / 2)) {
                    drawWaterTile(waterUsed, waterSurfaceTiles[0])
                    drawWaterTile(waterUsed, waterSurfaceTiles[1], 0, 8)
                    drawWaterTile(waterUsed, waterSurfaceTiles[1], 0, 16)
                    break
                } else if (specData === Math.floor(waterUsed / 2)) {
                    drawWaterTile(waterUsed, waterSurfaceTiles[0], 0, 16)
                    break
                } else {
                    drawWaterTile(waterUsed, waterTile)
                }

                // find up gap
                for (let i = bottomBlockX; !isAccessibleBlock(i, bottomBlockY - 1); i--) {
                    bottomBlockX--
                }
                bottomBlockY--
                for (let i = bottomBlockX + 1; isAccessibleBlock(i, bottomBlockY); i++) {
                    bottomBlockX++
                }

                specData -= waterUsed
            }
        }

        function drawSpikeDirection(engine, elementId, x, y, specData, customData) {
            const isFacingLeft = specData === 4

            if (config.stages_render_decoration) {
                const directionTile = customData[isFacingLeft ? 0 : 1]

                enginePutImage(engine, "spike_direction", directionTile, x, y, 1)
            } else {
                enginePutText(engine, "spike_direction", isFacingLeft ? "L" : "R", "#FF0", x + 8, y + 16, 2)
            }
        }

        function drawPlateId(engine, elementId, x, y, specData, customData) {
            enginePutText(engine, "pressure_plate_id", specData.toString(), "#F00", x + (specData < 10 ? 8 : 1), y + 11, 2)
        }

        function drawLabelText(engine, elementId, x, y, specData, customData) {
            enginePutText(engine, elementId, customData, "#FFF", x, y + 11, 2)
            enginePutText(engine, elementId, specData.toString(), "#FFF", x + (specData < 10 ? 8 : 1), y + 21, 2)
        }

        function drawHintTile(engine, elementId, x, y, specData, customData) {
            if (config.stages_render_decoration) {
                const hintTile = customData[specData > 1 ? 0 : specData]

                enginePutImage(engine, elementId, hintTile, x, y, 0)
            }
        }

        function drawExit(engine, elementId, x, y, specData, customData) {
            const exitTile = customData[specData === 2 ? 0 : 1]

            if (elementId.includes("secret"))
                enginePutText(engine, elementId, "SECRET", "#0FF", x + 24, y + 14, 2)

            enginePutImage(engine, elementId, exitTile, x, y, 0)
        }

        function drawId(engine, elementId, x, y, specData, customData) {
            enginePutText(engine, `${elementId}_id`, specData.toString(), "#F00", x + (specData < 10 ? 8 : 1), y + 16, 2)
        }

        function drawDoorHead(engine, elementId, x, y, specData, customData) {
            const doorHeadTile = customData[1]
            const block = customData[0].getBlock(x / 24, y / 24 - 1)

            if (![8, 9].includes(block.foreground)) {
                // PS: set layer to 0.5
                enginePutImage(engine, elementId, doorHeadTile, x, y, 0.5)
            }

            enginePutText(engine, "door_id", specData.toString(), "#F00", x + (specData < 10 ? 8 : 1), y + 16, 2)
        }

        function drawChest(engine, elementId, x, y, specData, customData) {
            const contentId = customData[13].getBlock(x / 24, y / 24).player

            // const chestTile = [2, 5, 7, 41].includes(contentId) ? customData[16] : customData[15]
            const chestTileIdx = [2, 5, 7, 41].includes(contentId) ? 16 : 15
            const chestTile = customData[chestTileIdx]

            elementId = chestTileIdx === 15 ? "red_chest" : "chest"

            // PS: set layer to 0.5
            enginePutImage(engine, elementId, chestTile, x, y, 0.5)

            if (config.stages_render_chest_contents) {
                const digitFont = customData[14]
                const contentMap = [2, 4, 5, 6, 24, 26, 27, 40, 42, 51, 52, 53]

                let contentCount = 0
                let contentTile = null

                if (contentId === 7 || contentId === 41) {
                    contentCount = contentId === 7 ? 10 : specData
                    contentTile = customData[12]
                } else {
                    for (let i = 0; i < contentMap.length; i++) {
                        if (contentId === contentMap[i]) {
                            contentTile = customData[i]
                            break
                        }
                    }
                }

                if (contentTile === null) {
                    enginePutText(engine, `${elementId}_unknown_content`, "???", "#F00", x + 1, y + 20, 3)
                    return
                }

                const dx = Math.floor(12 - contentTile.image.width / 2)
                const dy = Math.floor(12 - contentTile.image.height / 2) - 12

                // PS: set layer to 1
                // Do not use enginePutImage in here, we dont need the offset of image
                engine.addElement(engine.createImage(`${elementId}_content`, contentTile.image), x + dx, y + dy, 1)

                // Draw digit
                for (let i = 1; contentCount > 0; i++) {
                    const ox = 24 - (7 * i) + dx
                    const oy = 24 - 9 + dy

                    const idx = contentCount % 10

                    enginePutImage(engine, `${elementId}_content_count`, digitFont[idx], x + ox, y + oy, 2)

                    contentCount = Math.floor(contentCount / 10)
                }
            }
        }

        function drawSpike(engine, elementId, x, y, specData, customData) {
            const direction = [3, 33].includes(specData) ? 1 /* down */: -1 /* up */
            const spikeHeadTile = direction === 1 ? customData[0] : customData[1]

            // Draw stick
            for (let i = 0; i < 2; i++) {
                const spikeStick = direction === 1 ? customData[2 + i] : customData[3 - i]

                enginePutImage(engine, `${elementId}_stick`, spikeStick, x, y, 0)
                y += 24 * direction
            }

            enginePutImage(engine, elementId, spikeHeadTile, x, y, 0)
        }

        function drawFire(engine, elementId, x, y, specData, customData) {
            if (config.stages_render_decoration) {
                enginePutImage(engine, `${elementId}_fire`, customData, x, y, 0)
            }
        }

        const backgroundTile = await getModule(blocksFileChunks, 3, 0, 0)

        const boulderTile = worldIndex === 1 ?
            await getFrame(blocksFileChunks, 0, 0, 0) :
            await getModule(blocksFileChunks, 0, 0, 0)

        const leafTile = await getModule(blocksFileChunks, 1, 0, 0)

        const wallTilesSprite = (await blocksFileChunks[2].parse()).data.sprite
        const wallTiles = Object.fromEntries(
            new Array(wallTilesSprite.frames.length)
                .fill(0)
                .map((_, index) =>
                    [80 + index, {
                        image: wallTilesSprite.frames[index].getParsedData(0),
                        dx: wallTilesSprite.frames[index].bbox.x,
                        dy: wallTilesSprite.frames[index].bbox.y
                    }]
                )
        )

        const checkpointTile = await getFrame(cm, 6, 0, 0)

        const gemVioletTile = await getFrame(cm, 2, 0, 0),
            gemRedTile = await getFrame(cm, 2, 0, 1)

        const snakeNormalDownTile = worldIndex === 0 ?
            await getFrame(gen1, 5, 6, 0) :
            worldIndex === 1 ?
                await getFrame(gen1, 7, 0, 0) :
                await getFrame(gen1, 5, 6, 2)
        const snakeRedDownTile = worldIndex === 0 ?
            await getFrame(gen1, 5, 6, 1) :
            await getFrame(gen1, 7, 0, 1)
        const snakeNormalRightTile = worldIndex === 0 ?
            await getFrame(gen1, 5, 15, 0) :
            worldIndex === 1 ?
                await getFrame(gen1, 7, 0, 0) :
                await getFrame(gen1, 5, 15, 2)
        const snakeRedRightTile = worldIndex === 0 ?
            await getFrame(gen1, 5, 15, 1) :
            await getFrame(gen1, 7, 0, 1)
        const dizzySnakeTile = await getFrame(gen1, 5, 2, 1)

        const fireSpitterLeftTile = await getFrame(gen0, 9, 0, 0),
            fireSpitterRightTile = await getFrame(gen0, 9, 1, 0)

        const fireRightTile = await getFrame(gen1, 0, 7, 0, 24)
        const fireLeftTile = {
            image: imageDataFlipX(fireRightTile.image.clone()),
            dx: -3 * 24 + 3,
            dy: 0
        }

        const beansTile = await getModule(gen0, 7, 0, worldIndex === 2 ? 1 : 0)

        const pressurePlateTile = await getModule(gen2, 9, 0, 0)
        pressurePlateTile.dy = 11

        const mysticMalletTile = await getModule(gen1, 9, 0, 0, 0, 1),
            grippingHookTile = await getModule(gen1, 9, 1, 0, 0, 4),
            freezeMalletTile = await getModule(gen1, 9, 2, 0, 0, 1),
            mysticPotionTile = await getModule(gen2, 7, 0, 0)

        const exitLeftTile = await getModule(cm, 0, 1, 0),
            exitRightTile = await getModule(cm, 0, 0, 0)

        const magicPadlockTile = await getFrame(cm, 5, 0, 0)

        const doorHeadTile = await getFrame(cm, 1, 0, worldIndex),
            doorBottomTile = await getFrame(cm, 1, 3, worldIndex)

        const decoration2x2 = worldIndex === 0 ?
            [
                await getFrame(gen0, 4, 0, 0), await getFrame(gen0, 4, 2, 0),
                await getFrame(gen0, 4, 4, 0), await getFrame(gen0, 4, 6, 0)
            ] :
            worldIndex === 1 ?
                [
                    await getFrame(gen2, 1, 4, 0), await getFrame(gen2, 1, 6, 0),
                    await getFrame(gen2, 1, 0, 0), await getFrame(gen2, 1, 2, 0)
                ] :
                [
                    magicPadlockTile, magicPadlockTile,
                    magicPadlockTile, magicPadlockTile
                ]

        const chestRedTile = config.stages_render_chest_contents ?
            await getFrame(gen2, 2, 1, 0, -1) :
            await getFrame(gen2, 2, 0, 0, -1)
        const chestBrownTile = config.stages_render_chest_contents ?
            await getFrame(gen3, 3, 2, 0, -2, 1) :
            await getFrame(gen3, 3, 0, 0, -2, 1)

        // Position fix
        // chestRedTile.dx -= 1
        // chestBrownTile.dx -= 2
        // chestBrownTile.dy += 1

        const goldKeyTile = await getModule(gen0, 2, 0, 0),
            silverKeyTile = await getModule(gen0, 2, 0, 1)

        const oneUpTile = await getModule(cm, 4, 0, 0),
            revivePotionTile = await getModule(cm, 4, 1, 0)

        const goldKeyholeTile = await getFrame(gen2, 8, 0, 0),
            silverKeyholeTile = await getFrame(gen2, 8, 0, 1)

        const fireballTile = await getModule(gen1, 4, 0, 0)

        const fireCrystalTile = await getFrame(mmv, 3, 0, 0)
        const silverDiamondTile = await getFrame(mmv, 2, 0, 0)
        const iceCrystalTile = await getFrame(mmv, 1, 0, 0)

        const compassTile = await getModule(gen3, 1, 0, 0)

        const spikeTileTopHead = await getFrame(gen1, 1, 0, 0, 3),
            spikeTileTopStick = await getFrame(gen1, 1, 1, 0, 3),
            spikeTileBottomHead = await getFrame(gen1, 1, 3, 0, 3),
            spikeTileBottomStick = await getFrame(gen1, 1, 2, 0, 3)

        const knightRight = await getFrame(gen1, 3, 0, 0),
            knightLeft = await getFrame(gen1, 3, 1, 0, 24)
        // knightLeft.dx += 24

        const spikeBall = await getModule(gen1, 2, 2, 0),
            spikeDirectionDecoLeft = await getModule(gen1, 2, 10, 0, 16, 16),
            spikeDirectionDecoRight = await getModule(gen1, 2, 5, 0, -8, 16)

        const trapdoorRed = await getFrame(gen2, 4, 4, 0),
            trapdoorBlue = await getFrame(gen2, 4, 0, 1),
            trapdoorSwitch = await getFrame(gen3, 9, 0, 0)

        const torchUnlit = await getFrame(gen0, 8, 0, 0),
            torchLit = await getFrame(gen0, 8, 1, 0)

        const bomb = await getFrame(gen0, 5, 0, 0),
            bombCloth = await getModule(gen2, 5, 0, 0)

        const sewer = await getModule(gen0, 6, 0, 0)

        const icicle = await getFrame(gen3, 4, 0, 0),
            icicleBroken = await getFrame(gen3, 4, 3, 0)

        const turtleTile = await getFrame(gen4, 1, 1, 0)

        const monkeyTile = await getFrame(gen3, 5, 1, 0)

        const waspTile = await getFrame(gen3, 7, 12, 0)

        const waterTile = await getModule(gen2, 6, 16, 0),
              waterSurfaceHeadTile = await getFrame(gen2, 6, 15, 0),
              waterSurfaceBottomTile = await getFrame(gen2, 6, 16, 0)

        const fanPot = await getFrame(gen2, 3, 0, 0),
            fanPotAir = await getFrame(gen2, 3, 5, 0, 1)
        // fanPotAir.dx = 2

        const iceLaserShooterLeft = await getFrame(gen3, 2, 0, 0),
            iceLaserShooterRight = await getFrame(gen3, 2, 1, 0)

        const iceLaserDecoRight = await getFrame(gen4, 0, 3, 0)
        if (iceLaserDecoRight !== null) iceLaserDecoRight.dy += 12

        const iceLaserDecoLeft = iceLaserDecoRight ? {
            image: imageDataFlipX(iceLaserDecoRight.image.clone()),
            dx: iceLaserDecoRight.dx * -1 + 10,
            dy: iceLaserDecoRight.dy
        } : null

        const iceLaserPosition = []

        // Load digit module image
        const digitFont = []
        for (let i = 0; i < 10; i++) {
            digitFont.push(await getModule(ui, 2, i, 0))
        }

        const chestContentData = [
            gemRedTile,
            goldKeyTile,
            silverKeyTile,
            oneUpTile,
            mysticMalletTile,
            freezeMalletTile,
            grippingHookTile,
            mysticPotionTile,
            compassTile,
            silverDiamondTile,
            iceCrystalTile,
            fireCrystalTile,
            gemVioletTile,
            this,
            digitFont,
            chestRedTile,
            chestBrownTile
        ]

        const foregroundBlockMap = new Map([
            [0,  new BlockWrapper(null, "demo", 0, true, drawLabelText, "DEM")],
            [1,  new BlockWrapper(null, "screen_shake", 0, false, drawText, ["SHK", "#F00", 1, 16, 2])],
            [2,  new BlockWrapper(null, "hint", 0, false, drawHintTile, [mysticMalletTile, grippingHookTile])],

            [4,  new BlockWrapper(checkpointTile, "checkpoint", 0, true,
                (engine, elementId, x, y, specData, customData) => {
                    enginePutText(engine, "checkpoint_id", specData.toString(), "#FF0000", x + 8, y + 16, 2)
                })],

            [5,  new BlockWrapper(null, "exit", 0, false, drawExit, [exitRightTile, exitLeftTile])],
            [6,  new BlockWrapper(pressurePlateTile, "pressure_plate", 0, false, drawPlateId)],
            [7,  new BlockWrapper(doorBottomTile, "door_bottom", 0, false, drawDoorHead, [this, doorHeadTile])],
            [8,  new BlockWrapper(silverKeyholeTile, "silver_keyhole", 0, false, drawId)],
            [9,  new BlockWrapper(goldKeyholeTile, "gold_keyhole", 0, false, drawId)],
            [14, new BlockWrapper(null, "red_chest", 0.5, false, drawChest, chestContentData)],
            [17, new BlockWrapper(null, "defeat_everyone_label", 0, true, drawLabelText, "DEL")],
            [26, new BlockWrapper(null, "defeat_everyone_trigger", 0, true, drawLabelText, "DET")],
            [28, new BlockWrapper(null, "secret_exit", 0, false, drawExit, [exitRightTile, exitLeftTile])],
            [33, new BlockWrapper(null, "chest", 0.5, false, drawChest, chestContentData)],
            [34, new BlockWrapper(icicleBroken, "icicle_broken", 0, false)]
        ])

        const blockMap = new Map([
            [0,  new BlockWrapper(boulderTile, "boulder")],
            [1,  new BlockWrapper(gemVioletTile, "purple_gem")],
            [8,  new BlockWrapper(bomb, "bomb")],
            [10, new BlockWrapper(leafTile, "leaf")],
            [11, new BlockWrapper(fireballTile, "fireball", 1)],
            [12, new BlockWrapper(magicPadlockTile, "gem_padlock", 0, true, drawPurpleGemCount, digitFont)],
            [14, new BlockWrapper(spikeBall, "spike_ball", 1, true, drawSpikeDirection, [spikeDirectionDecoLeft, spikeDirectionDecoRight])],

            [16, new BlockWrapper(null, "knight", 1, true,
                (engine, elementId, x, y, specData, customData) => {
                    const knightTile = customData[specData === 4 ? 0 : 1]

                    enginePutImage(engine, elementId, knightTile, x, y, 1)
                }, [knightLeft, knightRight])],

            [18, new BlockWrapper(trapdoorSwitch, "trapdoor_switcher")],
            [19, new BlockWrapper(null, "normal_snake", 1, true, drawSnake, [snakeNormalDownTile, snakeNormalRightTile, dizzySnakeTile])],
            [22, new BlockWrapper(fireSpitterRightTile, "firespitter_right", 0, true, drawFire, fireRightTile)],
            [23, new BlockWrapper(fireSpitterLeftTile, "firespitter_left", 0, true, drawFire, fireLeftTile)],
            [28, new BlockWrapper(null, "spike", 1, true, drawSpike, [spikeTileTopHead, spikeTileBottomHead, spikeTileBottomStick, spikeTileTopStick])],
            [30, new BlockWrapper(beansTile, "beans")],
            [31, new BlockWrapper(null, "player_barrier", 2, true, drawText, ["NPB", "#0FF", 1, 16, 2])],
            [33, new BlockWrapper(null, "enemy_barrier", 2, true, drawText, ["NEB", "#0FF", 1, 16, 2])],
            [34, new BlockWrapper(trapdoorBlue, "trapdoor_blue")],
            [35, new BlockWrapper(trapdoorRed, "trapdoor_red")],

            [36, new BlockWrapper(null, "torch", 1, true,
                (engine, elementId, x, y, specData, customData) => {
                    const torchTile = [0, 255].includes(specData) ? customData[0] : customData[1]

                    enginePutImage(engine, elementId, torchTile, x, y, 1)
                }, [torchUnlit, torchLit])],

            [37, new BlockWrapper(bombCloth, "bomb_cloth")],
            [38, new BlockWrapper(sewer, "sewer", 0, true, drawWater, [this, waterTile, [waterSurfaceHeadTile, waterSurfaceBottomTile]])],
            [43, new BlockWrapper(null, "red_snake", 1, true, drawSnake, [snakeRedDownTile, snakeRedRightTile, dizzySnakeTile])],
            [44, new BlockWrapper(icicle, "icicle")],
            [45, new BlockWrapper(monkeyTile, "monkey", 1)],
            [46, new BlockWrapper(waspTile, "wasp", 1)],

            config.stages_render_decoration ?
                [47, new BlockWrapper(fanPot, "fan_pot", 0, true, drawFanPotAir, [this, fanPotAir])] :
                [47, new BlockWrapper(fanPot, "fan_pot")],

            [48, new BlockWrapper(null, "ice_laser_shooter", 1, true, drawIceLaserShooter, [iceLaserShooterLeft, iceLaserShooterRight, this, iceLaserPosition, iceLaserDecoLeft, iceLaserDecoRight])],
            [49, new BlockWrapper(turtleTile, "turtle", 1, true, drawTurtleDirection)],
            [79, new BlockWrapper(null, "spawn_point", 1, true, drawSpawnPointDoor, [doorHeadTile, doorBottomTile])]
        ])

        // Draw background
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                engine.drawImageImage(x * 24, y * 24, backgroundTile.image)
            }
        }

        // Main loop
        const mapHasSpawnPoint = this.playerLayer.includes(79)
        for (let y = 0; y < this.height; y++) {
            const blockY = y * 24
            for (let x = 0; x < this.width; x++) {
                const block = this.getBlock(x, y)
                const blockX = x * 24

                let handlePlayerLayer = true
                let imageData = null, dX = 0, dY = 0

                switch (block.foreground) {
                    case 20:
                    case 21:
                    case 22:
                    case 23: {
                        const decoTile = decoration2x2[block.foreground - 20]

                        enginePutImage(engine, "foreground_decoration", decoTile, blockX, blockY, 2)
                        break
                    }
                    case 255:
                        break
                    default:
                        if (wallTiles.hasOwnProperty(block.foreground)) {
                            const wallTile = wallTiles[block.foreground]

                            enginePutImage(engine, "foreground_block", wallTile, blockX, blockY, 2)
                            break
                        }

                        if (foregroundBlockMap.has(block.foreground)) {
                            const handler = foregroundBlockMap.get(block.foreground)
                            handlePlayerLayer = handler.addToEngine(engine, blockX, blockY, block.background)
                        } else if (config.stages_render_unknown) {
                            enginePutText(engine, "unk_fg_content", "???", "#F00", blockX + 1, blockY + 20, 3)
                        }
                        break
                }

                if (!handlePlayerLayer || block.player === 255)
                    continue

                if (wallTiles.hasOwnProperty(block.player)) {
                    const wallTile = wallTiles[block.player]

                    enginePutImage(engine, "background_block", wallTile, blockX, blockY, 0)
                } else if (blockMap.has(block.player)) {
                    const handler = blockMap.get(block.player)
                    handler.addToEngine(engine, blockX, blockY, block.background)
                } else if (config.stages_render_unknown) {
                    enginePutText(engine, "unk_bg_content", "UNK", "#F00", blockX + 1, blockY + 20, 3)
                }
            }
        }

        if (iceLaserPosition.length !== 0) {
            const borderColor = 0xFFFFC51B
            const innerColor = 0xFFFFF5D7

            iceLaserPosition.forEach(pos => {
                for (let i = 0; i < pos.width; i++) {
                    engine.drawImagePixel(pos.x + i, pos.y, borderColor)
                    engine.drawImagePixel(pos.x + i, pos.y + 1, innerColor)
                    engine.drawImagePixel(pos.x + i, pos.y + 2, borderColor)
                }
                // console.log(`x: ${pos.x}, w: ${pos.width}`)
            })
        }

        if (config.stages_render_special) {
            if (worldIndex === 0) {
                switch (stageIndex) {
                    case 5: {
                        const firePillarTile = await getFrame(mm0, 1, 12, 0)
                        for (let i = 0; i < 2; i++) {
                            enginePutImage(engine, "angkor_fire_pillar", firePillarTile, (9 + i * 4) * 24, 42 * 24, 1)
                        }
                        break
                    }
                    case 8: {
                        const greatAnacondaBlockDownTile = await getFrame(b0, 1, 1, 0)
                        for (let i = 0; i < 3; i++) {
                            enginePutImage(engine, "angkor_boss_hole_block", greatAnacondaBlockDownTile, (10 + i * 3) * 24, 9 * 24, 0)
                        }
                        break
                    }
                    case 13: {
                        let sealTileIdx = 4
                        for (let y = 0; y < 5; y++) {
                            for (let x = 0; x < 5; x++) {
                                const sealTile = await getFrame(mmv, 0, sealTileIdx++, 0)

                                enginePutImage(engine, "seal", sealTile, (60 + x) * 24, (2 + y) * 24, 1)
                            }
                        }
                        break
                    }
                }
            } else if (worldIndex === 1 && stageIndex === 9) {
                const teutonicKnightTile = await getFrame(b1, 0, 47, 0)

                enginePutImage(engine, "bavaria_boss", teutonicKnightTile, 17 * 24, 21 * 24, 1)
            } else if (worldIndex === 2 && stageIndex === 10) {
                const yetiTile = await getFrame(mm1, 0, 2, 0)

                enginePutImage(engine, "siberia_boss", yetiTile, 15 * 24, 21 * 24, 1)
            }
        }
    }

    /**
     * @param scale {number}
     * @param blocksFileChunks {FileChunk[]|null}
     * @param cm {FileChunk[]|null}
     * @param gen0 {FileChunk[]|null}
     * @param gen1 {FileChunk[]|null}
     * @param gen2 {FileChunk[]|null}
     * @param gen3 {FileChunk[]|null}
     * @param gen4 {FileChunk[]|null}
     * @param mmv {FileChunk[]|null}
     * @param b0 {FileChunk[]|null}
     * @param ui {FileChunk[]|null}
     * @param mm0 {FileChunk[]|null}
     * @param b1 {FileChunk[]|null}
     * @param mm1 {FileChunk[]|null}
     * @param worldIndex {0|1|2}
     * @param stageIndex {number}
     * @param config {TParseConfig|null}
     * @returns {HTMLCanvasElement}
     */
    async render(scale, blocksFileChunks, {cm, gen0, gen1, gen2, gen3, gen4, mmv, b0, ui, mm0, b1, mm1}, worldIndex, stageIndex, config = null) {
        const canvas = document.createElement("canvas")
        const engine = new CanvasEngine2D({
            canvas: canvas,
            appName: "diamondRush-browser-all_files_new-utils-renderCanvasEngine2DImage",
            imageW: this.width * 24,
            imageH: this.height * 24,
            backgroundColor: CanvasEngine2DVariables.COLORS.BLACK,
            scale: scale,
            customBackground: true
        })

        await this.renderToEngine(engine, blocksFileChunks, {
            cm,
            gen0,
            gen1,
            gen2,
            gen3,
            gen4,
            mmv,
            b0,
            ui,
            mm0,
            b1,
            mm1
        }, worldIndex, stageIndex, config)

        engine.render()
        return canvas
    }
}

/**
 * @param chunk {FileChunk}
 * @return {Promise<TParsedDataData>}
 */
export async function parse(chunk) {
    const mapID = fileNameToMapID.get(chunk.file.fileName) || "angkor"

    const dataView = new DataView(chunk.data)
    let ptr = 0

    if (dataView.getUint8(ptr++) !== 0x01)
        throw new Error(`File magic mismatch, got 0x${dataView.getUint8(ptr - 1)}, but expected 0x01`)

    const stageCount = dataView.getUint8(ptr++)
    /** @type {Stage[]} */
    const stages = new Array(stageCount)
    for (let i = 0; i < stageCount; i++) {
        const width = dataView.getUint16(ptr, true)
        ptr += 2
        const height = dataView.getUint16(ptr, true)
        ptr += 2

        const playerLayer = new Uint8Array(dataView.buffer.slice(ptr, ptr + width * height))
        ptr += width * height
        const backgroundLayer = new Uint8Array(dataView.buffer.slice(ptr, ptr + width * height))
        ptr += width * height
        const foregroundLayer = new Uint8Array(dataView.buffer.slice(ptr, ptr + width * height))
        ptr += width * height

        stages[i] = new Stage(width, height, backgroundLayer, playerLayer, foregroundLayer)
    }

    console.log("Stages:", stages)

    return {stages, mapID}
}

/**
 * @param config {TParseConfig}
 * @param worldIndex {0|1|2}
 * @return {Promise<{blocksFileChunks: (FileChunk[]|null), otherFiles: {cm: (FileChunk[]|null), gen0: (FileChunk[]|null), gen1: (FileChunk[]|null), gen2: (FileChunk[]|null), gen3: (FileChunk[]|null), gen4: (FileChunk[]|null), mmv: (FileChunk[]|null), b0: (FileChunk[]|null)}}>}
 */
export async function parseRequiredFilesToRender(config, worldIndex) {
    const mapID = worldIndex === 0 ? "angkor" : (worldIndex === 1 ? "bavaria" : "siberia")
    /** @type {FileChunk[]|null} */
    const blocksFileChunks = await config.parseOtherFile(mapIDToBlocksFileName.get(mapID))
    /** @type {FileChunk[]|null} */
    const cm = await config.parseOtherFile("cm.f"),
        gen0 = await config.parseOtherFile("gen0.f"),
        gen1 = await config.parseOtherFile("gen1.f"),
        gen2 = await config.parseOtherFile("gen2.f"),
        gen3 = await config.parseOtherFile("gen3.f"),
        gen4 = (mapID === "siberia" ? await config.parseOtherFile("gen4.f") : null),
        mmv = await config.parseOtherFile("mmv.f"),
        b0 = (mapID === "angkor" ? await config.parseOtherFile("b0.f") : null),
        ui = await config.parseOtherFile("ui.f"),
        mm0 = (mapID === "angkor" ? await config.parseOtherFile("mm0.f") : null),
        b1 = (mapID === "bavaria" ? await config.parseOtherFile("b1.f") : null),
        mm1 = (mapID === "siberia" ? await config.parseOtherFile("mm1.f") : null)

    return {blocksFileChunks, otherFiles: {cm, gen0, gen1, gen2, gen3, gen4, mmv, b0, ui, mm0, b1, mm1}}
}

/**
 * @param chunk {FileChunk}
 * @param parsed {TParsedDataData}
 * @param config {TParseConfig}
 * @return {Promise<HTMLElement>}
 */
export async function render(chunk, parsed, config) {
    /** @type {Stage[]} */
    const stages = parsed.stages
    /** @type {string} */
    const mapID = parsed.mapID
    /** @type {0|1|2} */
    const worldIndex = mapID === "angkor" ? 0 : (mapID === "bavaria" ? 1 : 2)
    const {
        blocksFileChunks,
        otherFiles: {cm, gen0, gen1, gen2, gen3, gen4, mmv, b0, ui, mm0, b1, mm1}
    } = await parseRequiredFilesToRender(config, worldIndex)

    function getStageName(stageIndex) {
        const secretStageBase = [9, 10, 11]

        if (worldIndex === 0 && stageIndex === 13) {
            return "intro-stage"
        }

        if (stageIndex >= secretStageBase[worldIndex]) {
            return `secret-stage-${stageIndex - secretStageBase[worldIndex] + 1}`
        }

        return `stage-${stageIndex + 1}`
    }

    const stageDivs = []
    for (let i = 0; i < stages.length; i++) {
        const stage = stages[i]

        const delayed = await delayedRender(async () => {
            const numbersCanvas = stage.renderNumbers(config.render_scale)
            const numbersDiv = createElement("div", [
                numbersCanvas,
                createElement("br"),
                downloadCanvasButton(numbersCanvas, `${mapID}-${getStageName(i)}-numbers.png`)
            ])

            const fullRenderCanvas = blocksFileChunks ?
                await stage.render(config.render_scale, blocksFileChunks, {
                    cm,
                    gen0,
                    gen1,
                    gen2,
                    gen3,
                    gen4,
                    mmv,
                    b0,
                    ui,
                    mm0,
                    b1,
                    mm1
                }, worldIndex, i, config) :
                null
            const fullRenderDiv = fullRenderCanvas && createElement("div", [
                fullRenderCanvas,
                createElement("br"),
                downloadCanvasButton(fullRenderCanvas, `${mapID}-${getStageName(i)}-full-render.png`)
            ])

            return createElement("div", [toggleButton(numbersDiv, false, "Show numbers", "Hide numbers"),
                createElement("br"),
                numbersDiv,
                fullRenderDiv])
        }, config)

        stageDivs.push(createElement("div", [
            createElement("h2", `Stage ${i + 1}`),
            delayed
        ], {"class": "stage"}))
    }

    return createElement("div", stageDivs, {"class": "stages"})
}
