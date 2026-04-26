import { supabase } from './supabaseClient.js'

// ======================
// CONFIG
// ======================
const ADMIN_KEY = "123"
const BUCKET = "files"

// ======================
// ROLE SYSTEM (FINAL FIX)
// ======================
const url = new URL(window.location.href)
const key = url.searchParams.get("key")

let isAdmin = false

// hanya admin kalau key EXACT
if (key === ADMIN_KEY) {
  isAdmin = true
} else {
  // hapus key kalau tidak valid / biar tidak nyangkut
  if (url.searchParams.has("key")) {
    url.searchParams.delete("key")
    window.history.replaceState({}, '', url.pathname)
  }
}

// DEBUG (optional)
console.log("URL:", window.location.href)
console.log("KEY:", key)
console.log("IS ADMIN:", isAdmin)

// ======================
// UI SETUP
// ======================
const roleText = document.getElementById("roleText")
const uploadSection = document.getElementById("uploadSection")

if (isAdmin) {
  roleText.innerText = "Mode: ADMIN"
} else {
  roleText.innerText = "Mode: GUEST"
  uploadSection.style.display = "none"
}

// ======================
// STATE
// ======================
let currentPath = ""

// ======================
// UPLOAD
// ======================
document.getElementById("uploadBtn")?.addEventListener("click", uploadFile)

async function uploadFile() {
  const file = document.getElementById("fileInput").files[0]
  const folder = document.getElementById("folderInput").value.trim()

  if (!file) return alert("Pilih file!")

  const path = folder
    ? `${currentPath}${folder}/${file.name}`
    : `${currentPath}${file.name}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true })

  if (error) {
    console.error(error)
    return alert("Upload gagal")
  }

  alert("Upload berhasil")
  loadFiles(currentPath)
}

// ======================
// LOAD FILES
// ======================
async function loadFiles(path = "") {
  currentPath = path

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(path, { limit: 100 })

  if (error) {
    console.error(error)
    return
  }

  const list = document.getElementById("fileList")
  list.innerHTML = ""

  document.getElementById("backBtn").style.display =
    path ? "block" : "none"

  data.forEach(item => {
    const li = document.createElement("li")

    if (item.id === null) {
      // 📁 Folder
      li.innerHTML = `📁 ${item.name}`
      li.onclick = () => loadFiles(path + item.name + "/")
    } else {
      // 📄 File
      const fullPath = path + item.name

      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(fullPath)

      li.innerHTML = `
        📄 <a href="${urlData.publicUrl}" target="_blank">${item.name}</a>
        ${isAdmin ? `<button onclick="deleteFile('${fullPath}')">🗑️</button>` : ""}
      `
    }

    list.appendChild(li)
  })
}

// ======================
// BACK BUTTON
// ======================
document.getElementById("backBtn").onclick = () => {
  const parts = currentPath.split("/").filter(Boolean)
  parts.pop()
  const newPath = parts.length ? parts.join("/") + "/" : ""
  loadFiles(newPath)
}

// ======================
// DELETE
// ======================
window.deleteFile = async function(path) {
  if (!isAdmin) return

  if (!confirm("Hapus file ini?")) return

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([path])

  if (error) {
    console.error(error)
    return alert("Gagal hapus")
  }

  loadFiles(currentPath)
}

// ======================
// INIT
// ======================
loadFiles()