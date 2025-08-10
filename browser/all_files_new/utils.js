/**
 * @author Jakub Augustýn <kubik.augustyn@post.cz>
 * @copyright Jakub Augustýn <kubik.augustyn@post.cz>
 * @home https://jakub-augustyn.web.app/
 */

/**
 * @param tagName {string}
 * @param content {(HTMLElement|Text|null)[]|string|null}
 * @param attributes {Object<string, string>|null}
 * @return {HTMLElement}
 */
export function createElement(tagName, content = null, attributes = null) {
    const element = document.createElement(tagName);

    if (attributes)
        Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));

    if (content !== null) {
        if (typeof content === "string")
            element.innerText = content;
        else
            content.forEach(child => (child instanceof HTMLElement || child instanceof Text) && element.appendChild(child));
    }

    return element;
}

/**
 * @param text {string}
 * @param label {string}
 * @return {HTMLButtonElement}
 */
export function copyToClipboardButton(text, label = "Copy to clipboard") {
    const button = createElement("button", label)
    button.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(text);
            button.innerText = "Copied!"
            setTimeout(() => button.innerText = label, 1000)
        } catch (err) {
            console.error("Error copying text:", err);
            alert("Failed to copy text.");
        }
    })
    return button
}

/**
 * @param canvas {HTMLCanvasElement}
 * @param fileName {string}
 * @param label {string}
 * @return {HTMLButtonElement}
 */
export function downloadCanvasButton(canvas, fileName = "canvas.png", label = "Download") {
    const button = createElement("button", label)
    button.addEventListener("click", async () => {
        try {
            const link = document.createElement("a")
            link.href = canvas.toDataURL("image/png")
            link.download = fileName
            link.click()
            button.innerText = "Downloading!"
            setTimeout(() => button.innerText = label, 1000)
        } catch (err) {
            console.error("Error downloading canvas:", err);
            alert("Failed to download the canvas.");
        }
    })
    return button
}

/**
 * @param raw {ArrayBufferLike|Uint8Array}
 * @param fileName {string}
 * @param label {string}
 * @return {HTMLButtonElement}
 */
export function downloadRawButton(raw, fileName = "canvas.png", label = "Download") {
    const button = createElement("button", label)
    button.addEventListener("click", async () => {
        try {
            const link = document.createElement("a")
            const blob = new Blob([raw], {type: "application/octet-stream"})
            const url = URL.createObjectURL(blob)
            link.href = url
            link.download = fileName
            link.click()
            URL.revokeObjectURL(url)
            button.innerText = "Downloading!"
            setTimeout(() => button.innerText = label, 1000)
        } catch (err) {
            console.error("Error downloading raw data:", err);
            alert("Failed to download the raw data.");
        }
    })
    return button
}

/**
 * @param url {string}
 * @return {Promise<HTMLImageElement|never>}
 */
export async function createAndLoadImageElement(url) {
    const image = createElement("img", [], {src: url})

    await new Promise((resolve, reject) => {
        image.addEventListener("load", resolve)
        image.addEventListener("error", reject)
    })

    return image
}


/**
 * @param width {number}
 * @param height {number}
 * @param populateEngine {function(engine: CanvasEngine2D): void | null}
 * @param scale {number}
 * @param backgroundColor {number[]|null}
 * @return {HTMLCanvasElement}
 */
export function renderCanvasEngine2DImage(width, height, populateEngine, scale = 1, backgroundColor = null) {
    const canvas = document.createElement("canvas")
    const engine = new CanvasEngine2D({
        canvas: canvas,
        appName: "diamondRush-browser-all_files_new-utils-renderCanvasEngine2DImage",
        imageW: width,
        imageH: height,
        backgroundColor: backgroundColor || [0, 255, 0, 255],
        scale
    })
    populateEngine(engine)
    engine.render()
    return canvas
}


/**
 * @param pixels {CanvasEngine2DImageData}
 * @param scale {number}
 * @param preRender {function(engine: CanvasEngine2D): void | null}
 * @return {HTMLCanvasElement}
 */
export function createImageFromPixels(pixels, scale = 1, preRender = null) {
    return renderCanvasEngine2DImage(pixels.width, pixels.height, engine => {
        engine.addElement(engine.createImage("texture", pixels), 0, 0, 0)
        if (preRender !== null) preRender(engine)
    }, scale)
}

/**
 * @param hexString {string}
 * @return {number[]}
 */
export function hexColorStringToColorArray(hexString) {
    const RGB = parseInt(hexString.slice(1), 16)
    return [
        (RGB >> 16) & 0xFF,// R
        (RGB >> 8) & 0xFF,// G
        RGB & 0xFF, // B
        255 // A
    ]
}

/**
 * @param colorArray {number[]}
 * @return {string}
 */
export function colorArrayToHexColorString(colorArray) {
    if (!(colorArray instanceof Array) || !colorArray.every(x => typeof x === "number")) throw new Error("colorArray must be an array of numbers")
    if (colorArray.length < 3) throw new Error("colorArray must have at least 3 elements")

    return "#".concat(
        colorArray
            .slice(0, 3)
            .map(x =>
                (x & 0xFF)
                    .toString(16)
                    .padStart(2, "0")
            )
            .join("")
    )
}

/**
 * @param target {HTMLElement}
 * @param initialState {boolean}
 * @param showText {string|null}
 * @param hideText {string|null}
 * @return {HTMLButtonElement}
 */
export function toggleButton(target, initialState = true, showText = null, hideText = null) {
    const button = createElement("button", "Hide")
    let state = initialState

    const update = () => {
        if (state) target.style.removeProperty("display")
        else target.style.display = "none"
        button.innerText = state ?
            hideText ?? `Hide (${target.children.length})` :
            showText ?? `Show (${target.children.length})`
    }
    button.addEventListener("click", () => {
        state = !state
        update()
    })

    update()
    return button
}

/**
 * @param render {function(): Promise<HTMLElement>}
 * @param content {(HTMLElement|Text|null)[]|string|null} The content to show in the button.
 * @return {HTMLButtonElement}
 */
export function delayedRenderingButton(render, content = null) {
    const button = createElement("button", content ?? "Render")
    button.addEventListener("click", async () => {
        button.innerText = "Rendering..."
        button.disabled = true

        try {
            const rendered = await render()

            // Replace the button with the content
            button.parentNode.replaceChild(rendered, button)
            button.remove()
        } catch (e) {
            console.error("Error while delayed rendering:", e)
            button.disabled = false
            button.innerText = "Rendering failed!"
        }
    })
    return button
}

/**
 * @param render {function(): Promise<HTMLElement>}
 * @param config {TParseConfig}
 * @param content {(HTMLElement|Text|null)[]|string|null} The content to show in the button.
 * @return {Promise<HTMLButtonElement|HTMLElement>}
 */
export async function delayedRender(render, config, content = null) {
    if (config.enable_delayed_rendering)
        return delayedRenderingButton(render, content)
    else
        return await render()
}

export function createTable(headers, tableData, config = {}) {
    const {
        columnAlign = [],
        tableStyle = {
            borderCollapse: 'collapse',
            margin: 'auto',
            width: '800px',
            fontFamily: 'monospace'
        },
        headerStyle = {
            padding: '10px',
            fontWeight: 'bold',
            border: '1px solid #ddd',
            background: '#f0f0f0',
            textAlign: 'center'
        },
        contentStyle = {
            padding: '10px',
            fontFamily: 'monospace',
            border: '1px solid #ddd',
            textAlign: 'center'
        }
    } = config;

    const table = document.createElement('table');
    Object.entries(tableStyle).forEach(([key, value]) => {
        table.style[key] = value;
    });

    const headerRow = document.createElement('tr');
    headers.forEach((obj, j) => {
        const th = document.createElement('th');

        if (typeof obj === "string")
            th.innerText = obj;
        else
            th.appendChild(obj);

        th.innerText = obj;
        if (columnAlign[j]) th.style.textAlign = columnAlign[j];
        Object.entries(headerStyle).forEach(([key, value]) => {
            th.style[key] = value;
        });
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    tableData.forEach(rowData => {
        const tr = document.createElement('tr');
        rowData.forEach((obj, j) => {
            const td = document.createElement('td');

            if (typeof obj === "string")
                td.innerText = obj;
            else
                td.appendChild(obj);

            if (columnAlign[j]) td.style.textAlign = columnAlign[j];
            Object.entries(contentStyle).forEach(([key, value]) => {
                td.style[key] = value;
            });
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });

    return table;
}