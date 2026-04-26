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
// DOM READY (PENTING)
// ======================
window.addEventListener("DOMContentLoaded", () => {

  // SEARCH
  const searchInput = document.getElementById("searchInput")
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      loadFiles(currentPath, e.target.value.toLowerCase())
    })
  }

  // BACK
  const backBtn = document.getElementById("backBtn")
  if (backBtn) {
    backBtn.onclick = () => {
      const parts = currentPath.split("/").filter(Boolean)
      parts.pop()
      const newPath = parts.length ? parts.join("/") + "/" : ""
      loadFiles(newPath)
    }
  }

  // UPLOAD (🔥 FIX UTAMA)
  const uploadBtn = document.getElementById("uploadBtn")

  if (uploadBtn) {
    uploadBtn.onclick = async () => {

      const input = document.getElementById("fileInput")
      const files = input?.files

      if (!files || files.length === 0) {
        alert("Pilih file dulu!")
        return
      }

      const tasks = []

      for (let file of files) {
        const ui = createUploadUI(file.name)
        tasks.push(uploadFile(file, ui))
      }

      await Promise.all(tasks)
      loadFiles(currentPath)
    }
  }

  // DRAG DROP
  const dropZone = document.getElementById("dropZone")

  if (dropZone) {
    dropZone.ondrop = (e) => {
      e.preventDefault()
      handleDrop(e.dataTransfer.files)
    }
    dropZone.ondragover = (e) => e.preventDefault()
  }

  loadFiles()
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
  if (backBtn) {
    backBtn.style.display = path ? "inline-block" : "none"
  }

  const { data } = await supabase.storage.from(BUCKET).list(path)

  const list = document.getElementById("fileList")
  list.innerHTML = ""

  data.forEach(item => {
    if (search && !item.name.toLowerCase().includes(search)) return

    const div = document.createElement("div")
    div.className = "file-item"

    const isFolder = !item.metadata

    if (isFolder) {
      div.innerHTML = `📁 <b>${item.name}</b>`
      div.onclick = () => loadFiles(path + item.name + "/")
    } else {
      const fullPath = path + item.name
      const { data: url } = supabase.storage.from(BUCKET).getPublicUrl(fullPath)

      div.innerHTML = `
        <div class="file-left">
          ${getFileIcon(item.name)}
          <span>${item.name}</span>
        </div>
        <div>
          ${!isAdmin ? `<button onclick="downloadFile('${url.publicUrl}', '${item.name}')"> 📥</button>` : ""}
          ${isAdmin ? `<button onclick="deleteFile('${fullPath}')">🗑️</button>` : ""}
        </div>
      `
    }

    list.appendChild(div)
  })
}

// ======================
// DOWNLOAD
// ======================
window.downloadFile = async function(url, filename) {
  const res = await fetch(url)
  const blob = await res.blob()

  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
}

// ======================
// UPLOAD UI
// ======================
function createUploadUI(name) {
  const list = document.getElementById("uploadList")

  const div = document.createElement("div")
  div.innerText = name

  const bar = document.createElement("div")
  bar.className = "upload-bar"

  const fill = document.createElement("div")
  fill.className = "upload-fill"

  bar.appendChild(fill)
  div.appendChild(bar)
  list.appendChild(div)

  return fill
}

// ======================
// UPLOAD CORE
// ======================
async function uploadFile(file, fill) {
  const path = currentPath + file.name

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true })

  if (error) {
    fill.style.background = "red"
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
async function handleDrop(files) {
  const tasks = []

  for (let file of files) {
    const ui = createUploadUI(file.name)
    tasks.push(uploadFile(file, ui))
  }

  await Promise.all(tasks)
  loadFiles(currentPath)
}