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
// DARK MODE
// ======================
const themeBtn = document.getElementById("themeToggle")

if (themeBtn) {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark")
    themeBtn.innerText = "☀️"
  }

  themeBtn.onclick = () => {
    document.body.classList.toggle("dark")

    if (document.body.classList.contains("dark")) {
      localStorage.setItem("theme", "dark")
      themeBtn.innerText = "☀️"
    } else {
      localStorage.setItem("theme", "light")
      themeBtn.innerText = "🌙"
    }
  }
}

// ======================
const BUCKET = "files"
let currentPath = ""

// ======================
// SEARCH
// ======================
document.getElementById("searchInput").addEventListener("input", (e) => {
  loadFiles(currentPath, e.target.value.toLowerCase())
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
      div.innerHTML = `📁 <b>${item.name}</b>`
      div.onclick = () => loadFiles(path + item.name + "/")
    } else {
      const size = item.metadata.size || 0
      total += size

      const fullPath = path + item.name
      const { data: url } = supabase.storage.from(BUCKET).getPublicUrl(fullPath)

      div.innerHTML = `
        <div class="file-left">
          ${getFileIcon(item.name)}
          <span>${item.name}</span>
          <span class="file-size">${(size/1024).toFixed(1)} KB</span>
        </div>
        <div>
          ${!isAdmin ? `<button onclick="downloadFile('${url.publicUrl}', '${item.name}')"> 📥</button>` : ""}
          ${isAdmin ? `<button onclick="deleteFile('${fullPath}')">🗑️</button>` : ""}
        </div>
      `
    }

    list.appendChild(div)
  })

  if (list.innerHTML === "") {
    list.innerHTML = `<div style="color:gray">Tidak ada file</div>`
  }

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
  const parts = currentPath.split("/").filter(Boolean)
  parts.pop()
  const newPath = parts.length ? parts.join("/") + "/" : ""
  loadFiles(newPath)
}

// ======================
// DOWNLOAD (FORCE)
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
// DELETE
// ======================
window.deleteFile = async function(path) {
  await supabase.storage.from(BUCKET).remove([path])
  loadFiles(currentPath)
}

// ======================
loadFiles()