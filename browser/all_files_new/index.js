/**
 * @author Jakub Augustýn <kubik.augustyn@post.cz>
 * @copyright Jakub Augustýn <kubik.augustyn@post.cz>
 * @home https://jakub-augustyn.web.app/
 */

import {FileType, FileInfo, files} from "./files.js";
import {FileChunk, parseFile} from "./parsing.js";
import {colorArrayToHexColorString, createElement, hexColorStringToColorArray} from "./utils.js";

/** @type {FileInfo|null} */
let currentFile = null

{
    /** @type {string|null} */
    const fileName = readCurrentFileName() // localStorage.getItem("diamondRushBrowserAllFilesNew-fileName")
    if (fileName !== null)
        currentFile = files.find(file => file.fileName === fileName) || null;
}

/**
 * @param file {FileInfo}
 */
function addFileInputElement(file) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "file_id"
    input.value = file.id.toString()
    if (currentFile === file)
        input.setAttribute("checked", "");
    label.appendChild(input)
    label.appendChild(new Text(file.fileName))
    input.addEventListener("click", () => input.form.requestSubmit()) // Warning: do not use submit()
    document.getElementById("file_list").appendChild(label);
}

/**
 * @param config {TParseConfig}
 */
function saveCurrentConfig(config) {
    localStorage.setItem("diamondRushBrowserAllFilesNew-config", JSON.stringify(config))
}

/**
 * @return {Partial<TParseConfig>}
 */
function loadSavedConfig() {
    const config = JSON.parse(localStorage.getItem("diamondRushBrowserAllFilesNew-config")) ?? {}
    if (typeof config !== "object") return {}
    return config
}

/**
 * @return {never}
 */
function resetSavedConfig() {
    localStorage.removeItem("diamondRushBrowserAllFilesNew-config")
    document.location.reload()
    throw new Error("Nothing should run after this")
}

/**
 * @param form {HTMLFormElement}
 * @param config {Partial<TParseConfig>}
 */
function applyConfigToForm(form, config) {
    // @formatter:off
    if (config.hasOwnProperty("render_scale"))                        form["render_scale"].value = config.render_scale.toString(10)
    if (config.hasOwnProperty("sprites_background"))                  form["sprites_background"].value = colorArrayToHexColorString(config.sprites_background)
    if (config.hasOwnProperty("sprites_animation_origin"))            form["sprites_animation_origin"].value = config.sprites_animation_origin
    if (config.hasOwnProperty("sprites_animation_origin_background")) form["sprites_animation_origin_background"].value = colorArrayToHexColorString(config.sprites_animation_origin_background)
    if (config.hasOwnProperty("stages_render_background"))            form["stages_render_background"].checked = config.stages_render_background
    if (config.hasOwnProperty("stages_render_player"))                form["stages_render_player"].checked = config.stages_render_player
    if (config.hasOwnProperty("stages_render_foreground"))            form["stages_render_foreground"].checked = config.stages_render_foreground
    if (config.hasOwnProperty("stages_render_special"))               form["stages_render_special"].checked = config.stages_render_special
    if (config.hasOwnProperty("stages_render_chest_contents"))        form["stages_render_chest_contents"].checked = config.stages_render_chest_contents
    if (config.hasOwnProperty("stages_render_unknown"))               form["stages_render_unknown"].checked = config.stages_render_unknown
    if (config.hasOwnProperty("stages_render_pot_fan_air"))           form["stages_render_pot_fan_air"].checked = config.stages_render_pot_fan_air
    if (config.hasOwnProperty("enable_delayed_rendering"))            form["enable_delayed_rendering"].checked = config.enable_delayed_rendering
    // @formatter:on
}

/**
 * @param fileName {string}
 * @param e {PopStateEvent|Event|null}
 */
function writeCurrentFileName(fileName, e = null) {
    if (e?.type === "popstate") return // We don't push the state when going back in history

    const url = new URL(document.location)
    url.searchParams.set("fileName", fileName)

    // Add the new URL to the history without reloading the page
    history.pushState({fileName}, '', url)
}

/**
 * @return {string|null}
 */
function readCurrentFileName() {
    const params = new URL(document.location).searchParams
    return params.has("fileName") ? params.get("fileName") : null
}

async function onload() {
    for (const file of files)
        addFileInputElement(file)

    const form = document.getElementById("file_config_form")
    applyConfigToForm(form, loadSavedConfig())
    document.getElementById("file_config_form_reset_button").addEventListener("click", () => {
        if (confirm("Are you sure you want to reset the configuration?"))
            resetSavedConfig()
    })

    // Lazily load the files
    setTimeout(async () => {
        for (const file of files) {
            await file.loadData()
            await new Promise(resolve => setTimeout(resolve, 10))
        }
    }, 100)

    await loadAndOpenCurrentFile()
}

/** @param event {SubmitEvent} */
async function onFileFormSubmit(event) {
    event.preventDefault()
    const data = new FormData(event.target)

    currentFile = files.find(file => file.id.toString() === data.get("file_id")) || null;
    if (currentFile === null) {
        alert("Please select a file")
        return
    }
    if (currentFile.isDefaultFile) {
        currentFile.isChunks = currentFile.autoIsChunks
        currentFile.fileType = currentFile.autoFileType
    }
    await loadAndOpenCurrentFile()
}

/** @param event {SubmitEvent} */
async function onCustomFileFormSubmit(event) {
    event.preventDefault()
    const data = new FormData(event.target)
    /** @type {File} */
    const file = data.get("file")

    currentFile = new FileInfo(
        file.name,
        file.name.startsWith("lang.") ?
            FileType.TEXTS :
            file.name.endsWith(".f") ?
                FileType.SPRITES :
                FileType.RAW,
        file.name.endsWith(".f"),
        false,
        await file.arrayBuffer()
    );
    files.push(currentFile)
    addFileInputElement(currentFile)
    await loadAndOpenCurrentFile()
}

/** @param event {SubmitEvent} */
async function onFileConfigFormSubmit(event) {
    event.preventDefault()
    const form = event.target
    /** @type {boolean} */
    const isChunks = form["is_chunks"].checked
    /** @type {TFileType|undefined} */
    const fileType = FileType[form["file_type"].value]
    if (!fileType) return

    // if (currentFile.isChunks === isChunks && currentFile.fileType === fileType)
    //     return // Nothing has changed

    currentFile.isChunks = isChunks
    currentFile.fileType = fileType
    await loadAndOpenCurrentFile()
}

async function loadAndOpenCurrentFile(e = null) {
    if (currentFile === null) return

    writeCurrentFileName(currentFile.fileName, e) // localStorage.setItem("diamondRushBrowserAllFilesNew-fileName", currentFile.fileName)
    const form = document.getElementById("file_config_form")
    form["is_chunks"].checked = currentFile.isChunks
    form["file_type"].value = Object.entries(FileType).find(([name, type]) => type === currentFile.fileType)[0]
    /** @type {TParseConfig} */
    const config = {
        render_scale: parseInt(form["render_scale"].value, 10),
        sprites_background: hexColorStringToColorArray(form["sprites_background"].value),
        sprites_animation_origin: form["sprites_animation_origin"].value,
        sprites_animation_origin_background: hexColorStringToColorArray(form["sprites_animation_origin_background"].value),
        stages_render_background: form["stages_render_background"].checked,
        stages_render_player: form["stages_render_player"].checked,
        stages_render_foreground: form["stages_render_foreground"].checked,
        stages_render_special: form["stages_render_special"].checked,
        stages_render_chest_contents: form["stages_render_chest_contents"].checked,
        stages_render_unknown: form["stages_render_unknown"].checked,
        stages_render_pot_fan_air: form["stages_render_pot_fan_air"].checked,
        enable_delayed_rendering: form["enable_delayed_rendering"].checked,
        async parseOtherFile(fileName) {
            const file = files.find(file => file.fileName === fileName) || null;
            if (file === null || file.id === currentFile.id) return null
            return (await parseFileAndItsChunks(file)).chunks
        },
    }
    saveCurrentConfig(config)
    const chunksDiv = document.getElementById("chunks")
    const expectLongRender = ["w0.bin", "w1.bin", "w2.bin", "o.f"].includes(currentFile.fileName)

    // UI stuff
    chunksDiv.innerHTML = "Loading..."
    await currentFile.loadData() // Not necessary
    chunksDiv.innerHTML = "Parsing..."
    await new Promise(resolve => setTimeout(resolve, expectLongRender ? 50 : 0)) // Let HTML render

    const {chunks, errors} = await parseFileAndItsChunks(currentFile)

    chunksDiv.innerHTML = "Rendering..."
    await new Promise(resolve => setTimeout(resolve, expectLongRender ? 50 : 0)) // Let HTML render
    await Promise.all(chunks.map(chunk => chunk.render(config)))
    chunksDiv.innerHTML = ""

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const error = errors[i]

        if (!error) {
            const container = await chunk.render(config)
            container && chunksDiv.appendChild(container)
        }
        else chunksDiv.appendChild(createElement("div", [
            createElement("h1", `Chunk ${i + 1}`),
            createElement("p", "There was an error during the parsing of the chunk. Maybe you selected a wrong file type and/or 'is chunks'? See the console for more information."),
            createElement("pre", error.toString())
        ], {"class": "chunk"}))
    }
}

/**
 * @param file {FileInfo}
 * @return {Promise<{chunks: FileChunk[], errors: Error[]}>}
 */
async function parseFileAndItsChunks(file) {
    console.group("Load file ".concat(file.fileName))
    console.log("File:", file)
    const chunks = await parseFile(file)
    const results = await Promise.allSettled(chunks.map(chunk => chunk.parse()))
    console.log("File chunks parsed:", results)
    const errors = new Array(chunks.length)
    for (let i = 0; i < results.length; i++) {
        const result = results[i]
        if (result.status === "rejected") {
            console.error(result.reason)
            errors[i] = result.reason
        }
    }
    console.groupEnd()
    return {chunks, errors}
}

document.addEventListener("DOMContentLoaded", onload);
document.getElementById("file_form").addEventListener("submit", onFileFormSubmit);
document.getElementById("custom_file_form").addEventListener("submit", onCustomFileFormSubmit);
document.getElementById("file_config_form").addEventListener("submit", onFileConfigFormSubmit);
// Make sure that when going back in history, the fileName parameter is taken into account
window.addEventListener('popstate', (e) => {
    // console.log("popstate", e.state)

    /** @type {string|null} */
    const fileName = e.state.fileName || null // readCurrentFileName()
    if (fileName === null) return

    const file = files.find(file => file.fileName === fileName) || null;
    if (file === null) return

    currentFile = file
    document.getElementById("file_form")["file_id"].value = currentFile.id.toString()
    loadAndOpenCurrentFile(e).then(void 0)
})
