import { supabase } from './supabaseClient.js'

// ======================
// CONFIG
// ======================
const ADMIN_KEY = "123"
const BUCKET = "files"

// ======================
// ROLE
// ======================
const params = new URLSearchParams(window.location.search)
const isAdmin = params.get("key") === ADMIN_KEY

const adminPanel = document.getElementById("adminPanel")
const storageInfo = document.getElementById("storageInfo")

if (!isAdmin) {
  adminPanel.style.display = "none"
  storageInfo.style.display = "none"
}

// ======================
// STATE
// ======================
let currentPath = ""

// ======================
// SEARCH (FIX)
// ======================
const searchInput = document.getElementById("searchInput")

searchInput.addEventListener("input", () => {
  const keyword = searchInput.value.trim().toLowerCase()
  loadFiles(currentPath, keyword)
})

// ======================
// ICON FILE
// ======================
function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase()

  if (["png","jpg","jpeg","gif"].includes(ext)) return "🖼️"
  if (["pdf"].includes(ext)) return "📕"
  if (["zip","rar"].includes(ext)) return "🗜️"
  if (["mp4","mp3"].includes(ext)) return "🎬"
  if (["html","js","css"].includes(ext)) return "💻"

  return "📄"
}

// ======================
// LOAD FILE (FIX SEARCH + FOLDER)
// ======================
async function loadFiles(path = "", search = "") {
  currentPath = path

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(path)

  if (error) {
    console.error(error)
    return
  }

  const list = document.getElementById("fileList")
  list.innerHTML = ""

  let total = 0

  data.forEach(item => {
    const name = item.name.toLowerCase()

    // 🔥 FIX SEARCH
    if (search && !name.includes(search)) return

    const div = document.createElement("div")
    div.className = "file-item"

    const isFolder = !item.metadata

    // ======================
    // FOLDER
    // ======================
    if (isFolder) {
      div.innerHTML = `📁 <b>${item.name}</b>`
      div.onclick = () => loadFiles(path + item.name + "/")
    } 
    // ======================
    // FILE
    // ======================
    else {
      const size = item.metadata.size || 0
      total += size

      const fullPath = path + item.name

      const { data: url } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(fullPath)

      div.innerHTML = `
        <div class="file-left">
          ${getFileIcon(item.name)}
          <span>${item.name}</span>
          <span class="file-size">${(size/1024).toFixed(1)} KB</span>
        </div>

        <div>
          ${!isAdmin ? `<a href="${url.publicUrl}" download>⬇️</a>` : ""}
          ${isAdmin ? `<button onclick="deleteFile('${fullPath}')">🗑️</button>` : ""}
        </div>
      `
    }

    list.appendChild(div)
  })

  // ======================
  // EMPTY STATE
  // ======================
  if (list.innerHTML === "") {
    list.innerHTML = `<div style="color:gray">Tidak ada file</div>`
  }

  // ======================
  // TOTAL STORAGE
  // ======================
  if (isAdmin) {
    storageInfo.innerText =
      "Total Storage: " + (total / (1024*1024)).toFixed(2) + " MB"
  }
}

// ======================
// MULTI UPLOAD + PROGRESS
// ======================
document.getElementById("uploadBtn").onclick = async () => {
  const files = document.getElementById("fileInput").files

  if (!files.length) return alert("Pilih file dulu!")

  const tasks = []

  for (let file of files) {
    const ui = createUploadUI(file.name)
    tasks.push(uploadFile(file, ui))
  }

  await Promise.all(tasks)

  loadFiles(currentPath)
}

// ======================
// UI PROGRESS
// ======================
function createUploadUI(name) {
  const list = document.getElementById("uploadList")

  const div = document.createElement("div")
  div.className = "upload-item"

  const title = document.createElement("div")
  title.innerText = name

  const bar = document.createElement("div")
  bar.className = "upload-bar"

  const fill = document.createElement("div")
  fill.className = "upload-fill"

  bar.appendChild(fill)
  div.appendChild(title)
  div.appendChild(bar)

  list.appendChild(div)

  return fill
}

// ======================
// UPLOAD CORE (PROGRESS FIX)
// ======================
async function uploadFile(file, fill) {
  const folder = document.getElementById("folderInput").value.trim()

  const path = folder
    ? `${currentPath}${folder}/${file.name}`
    : `${currentPath}${file.name}`

  let progress = 0

  const interval = setInterval(() => {
    progress += Math.random() * 12
    if (progress < 90) {
      fill.style.width = progress + "%"
    }
  }, 200)

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true })

  clearInterval(interval)

  if (error) {
    fill.style.background = "red"
    console.error(error)
    return
  }

  fill.style.width = "100%"
}

// ======================
// DELETE
// ======================
window.deleteFile = async function(path) {
  await supabase.storage.from(BUCKET).remove([path])
  loadFiles(currentPath)
}

// ======================
// DRAG & DROP
// ======================
const dropZone = document.getElementById("dropZone")

dropZone.ondrop = (e) => {
  e.preventDefault()
  handleDrop(e.dataTransfer.files)
}

dropZone.ondragover = (e) => e.preventDefault()

async function handleDrop(files) {
  const tasks = []

  for (let file of files) {
    const ui = createUploadUI(file.name)
    tasks.push(uploadFile(file, ui))
  }

  await Promise.all(tasks)

  loadFiles(currentPath)
}

// ======================
// INIT
// ======================
loadFiles()
