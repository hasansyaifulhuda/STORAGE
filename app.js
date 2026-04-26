import { supabase } from './supabaseClient.js'

// ======================
// ROLE
// ======================
const ADMIN_KEY = "123"
const params = new URLSearchParams(window.location.search)
const isAdmin = params.get("key") === ADMIN_KEY

document.body.classList.remove("guest")
document.body.classList.add(isAdmin ? "admin" : "guest")

// ======================
const BUCKET = "files"
let currentPath = ""

// ======================
// SEARCH
// ======================
const searchInput = document.getElementById("searchInput")
searchInput.addEventListener("input", () => {
  loadFiles(currentPath, searchInput.value.toLowerCase())
})

// ======================
// ICON
// ======================
function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase()

  if (["png","jpg","jpeg","gif"].includes(ext)) return "🖼️"
  if (["pdf"].includes(ext)) return "📕"
  if (["zip","rar"].includes(ext)) return "📦"
  if (["mp4","mp3"].includes(ext)) return "🎬"
  if (["html","js","css"].includes(ext)) return "📄"

  return "📄"
}

// ======================
// LOAD FILE
// ======================
async function loadFiles(path = "", search = "") {
  currentPath = path

  const backBtn = document.getElementById("backBtn")
  backBtn.style.display = path ? "inline-block" : "none"

  const { data, error } = await supabase.storage.from(BUCKET).list(path)

  if (error) {
    console.error(error)
    return
  }

  const list = document.getElementById("fileList")
  list.innerHTML = ""

  let total = 0

  data.forEach(item => {
    if (search && !item.name.toLowerCase().includes(search)) return

    const div = document.createElement("div")
    div.className = "file-item"

    const isFolder = !item.metadata

    if (isFolder) {
      div.innerHTML = `
        <div class="file-left">
          📁 <b>${item.name}</b>
        </div>
      `
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
          ${getFileIcon(item.name)}
          <span>${item.name}</span>
          <span class="file-size">${(size/1024).toFixed(1)} KB</span>
        </div>

        <div>
          ${!isAdmin ? `
            <button class="icon-btn" onclick="downloadFile('${url.publicUrl}')">📥</button>
          ` : ""}

          ${isAdmin ? `
            <button onclick="deleteFile('${fullPath}')">🗑️</button>
          ` : ""}
        </div>
      `
    }

    list.appendChild(div)
  })

  if (list.innerHTML === "") {
    list.innerHTML = `<div style="color:gray">Tidak ada file</div>`
  }

  // ======================
  // TOTAL SIZE (ADMIN ONLY)
  // ======================
  const totalEl = document.getElementById("totalSize")

  if (isAdmin) {
    totalEl.style.display = "inline"
    totalEl.innerText = (total / (1024 * 1024)).toFixed(2) + " MB"
  } else {
    totalEl.style.display = "none"
  }
}

// ======================
// BACK
// ======================
document.getElementById("backBtn").onclick = () => {
  if (!currentPath) return

  const parts = currentPath.split("/").filter(Boolean)
  parts.pop()

  const newPath = parts.length ? parts.join("/") + "/" : ""
  loadFiles(newPath)
}

// ======================
// DOWNLOAD
// ======================
window.downloadFile = function(url) {
  const a = document.createElement("a")
  a.href = url
  a.download = ""
  a.click()
}

// ======================
// UPLOAD
// ======================
document.getElementById("uploadBtn")?.addEventListener("click", async () => {
  const files = document.getElementById("fileInput").files
  if (!files.length) return

  const tasks = []

  for (let file of files) {
    const ui = createUploadUI(file.name)
    tasks.push(uploadFile(file, ui))
  }

  await Promise.all(tasks)
  loadFiles(currentPath)
})

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
  const folder = document.getElementById("folderInput")?.value.trim()

  const path = folder
    ? `${currentPath}${folder}/${file.name}`
    : `${currentPath}${file.name}`

  let progress = 0

  const interval = setInterval(() => {
    progress += Math.random() * 10
    if (progress < 90) fill.style.width = progress + "%"
  }, 200)

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true })

  clearInterval(interval)

  const parent = fill.parentElement.parentElement

  if (error) {
    fill.style.background = "red"
    parent.innerHTML += " ❌ Gagal"
    return
  }

  fill.style.width = "100%"
  fill.style.background = "#22c55e"

  parent.innerHTML += " ✔ Berhasil"

  setTimeout(() => {
    parent.remove()
  }, 1500)
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

if (dropZone) {
  dropZone.ondrop = (e) => {
    e.preventDefault()
    handleDrop(e.dataTransfer.files)
  }

  dropZone.ondragover = (e) => e.preventDefault()
}

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