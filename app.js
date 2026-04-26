import { supabase } from './supabaseClient.js'

const ADMIN_KEY = "123"
const BUCKET = "files"
const MAX_FILES = 5
const MAX_SIZE = 10 * 1024 * 1024

const params = new URLSearchParams(window.location.search)
const key = params.get("key")
const isAdmin = key === ADMIN_KEY

const adminPanel = document.getElementById("adminPanel")
if (!isAdmin) adminPanel.style.display = "none"

let currentPath = ""

// SEARCH
document.getElementById("searchInput").addEventListener("input", e => {
  loadFiles(currentPath, e.target.value)
})

// FILE ICON
function getFileIcon(name) {
  const ext = name.split('.').pop()
  if (["png","jpg"].includes(ext)) return "🖼️"
  if (["pdf"].includes(ext)) return "📕"
  if (["zip"].includes(ext)) return "🗜️"
  return "📄"
}

// LOAD FILES
async function loadFiles(path = "", search = "") {
  currentPath = path

  const { data } = await supabase.storage.from(BUCKET).list(path)

  let total = 0
  const list = document.getElementById("fileList")
  list.innerHTML = ""

  data.forEach(item => {
    if (!item.name.includes(search)) return

    const size = item.metadata?.size || 0
    total += size

    const div = document.createElement("div")
    div.className = "file-item"

    const fullPath = path + item.name
    const { data: url } = supabase.storage.from(BUCKET).getPublicUrl(fullPath)

    div.innerHTML = `
      ${getFileIcon(item.name)} ${item.name}
      (${(size/1024).toFixed(1)} KB)
      ${!isAdmin ? `<a href="${url.publicUrl}" download>⬇️</a>` : ""}
    `
    list.appendChild(div)
  })

  if (isAdmin) {
    document.getElementById("storageInfo").innerText =
      "Total: " + (total / (1024*1024)).toFixed(2) + " MB"
  }
}

// MULTI UPLOAD
document.getElementById("uploadBtn").onclick = async () => {
  const files = document.getElementById("fileInput").files

  if (files.length > MAX_FILES) return alert("Max 5 file")

  const tasks = []

  for (let file of files) {
    if (file.size > MAX_SIZE) continue

    const item = createUploadUI(file.name)
    tasks.push(uploadFile(file, item))
  }

  await Promise.all(tasks)
  loadFiles(currentPath)
}

// UPLOAD UI
function createUploadUI(name) {
  const list = document.getElementById("uploadList")
  const div = document.createElement("div")
  div.className = "upload-item"

  const fill = document.createElement("div")
  fill.className = "upload-fill"

  div.innerHTML = name
  div.appendChild(fill)
  list.appendChild(div)

  return fill
}

// UPLOAD
async function uploadFile(file, fill) {
  let progress = 0
  const interval = setInterval(() => {
    progress += 10
    if (progress < 90) fill.style.width = progress + "%"
  }, 200)

  await supabase.storage.from(BUCKET).upload(file.name, file, { upsert: true })

  clearInterval(interval)
  fill.style.width = "100%"
}

// DRAG DROP
const dropZone = document.getElementById("dropZone")

dropZone.ondrop = e => {
  e.preventDefault()
  handleDrop(e.dataTransfer.files)
}

dropZone.ondragover = e => e.preventDefault()

async function handleDrop(files) {
  const tasks = []
  for (let file of files) {
    const ui = createUploadUI(file.name)
    tasks.push(uploadFile(file, ui))
  }
  await Promise.all(tasks)
  loadFiles()
}

// INIT
loadFiles()