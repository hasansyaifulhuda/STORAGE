import { supabase } from './supabaseClient.js'

// ======================
// ROLE (SUPER CEPAT)
// ======================
const ADMIN_KEY = "123"
const params = new URLSearchParams(window.location.search)
const isAdmin = params.get("key") === ADMIN_KEY

// 🔥 SET ROLE LANGSUNG (ANTI FLASH)
document.body.classList.remove("guest")
document.body.classList.add(isAdmin ? "admin" : "guest")

// ======================
const BUCKET = "files"
let currentPath = ""

// ======================
// SEARCH
// ======================
document.getElementById("searchInput").oninput = (e) => {
  loadFiles(currentPath, e.target.value.toLowerCase())
}

// ======================
// ICON
// ======================
function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase()
  if (["png","jpg","jpeg"].includes(ext)) return "🖼️"
  if (["pdf"].includes(ext)) return "📕"
  if (["zip"].includes(ext)) return "🗜️"
  return "📄"
}

// ======================
// LOAD FILE
// ======================
async function loadFiles(path = "", search = "") {
  currentPath = path

  const { data } = await supabase.storage.from(BUCKET).list(path)

  const list = document.getElementById("fileList")
  list.innerHTML = ""

  let total = 0

  data.forEach(item => {
    if (search && !item.name.toLowerCase().includes(search)) return

    const div = document.createElement("div")
    div.className = "file-item"

    const isFolder = !item.metadata

    if (isFolder) {
      div.innerHTML = `📁 ${item.name}`
      div.onclick = () => loadFiles(path + item.name + "/")
    } else {
      const size = item.metadata.size || 0
      total += size

      const fullPath = path + item.name

      const { data: url } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(fullPath)

      div.innerHTML = `
        <div class="file-left">
          ${getFileIcon(item.name)} ${item.name}
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

  if (list.innerHTML === "") {
    list.innerHTML = `<div style="color:gray">Tidak ada file</div>`
  }

  if (isAdmin) {
    document.getElementById("storageInfo").innerText =
      "Total Storage: " + (total / (1024*1024)).toFixed(2) + " MB"
  }
}

// ======================
// UPLOAD
// ======================
document.getElementById("uploadBtn").onclick = async () => {
  const files = document.getElementById("fileInput").files
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

  const bar = document.createElement("div")
  bar.className = "upload-bar"

  const fill = document.createElement("div")
  fill.className = "upload-fill"

  bar.appendChild(fill)
  div.innerText = name
  div.appendChild(bar)

  list.appendChild(div)

  return fill
}

// ======================
// UPLOAD CORE
// ======================
async function uploadFile(file, fill) {
  const folder = document.getElementById("folderInput").value.trim()

  const path = folder
    ? `${currentPath}${folder}/${file.name}`
    : `${currentPath}${file.name}`

  let progress = 0

  const interval = setInterval(() => {
    progress += Math.random() * 10
    if (progress < 90) fill.style.width = progress + "%"
  }, 200)

  await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })

  clearInterval(interval)
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
// DRAG DROP
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
loadFiles()