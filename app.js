import { supabase } from './supabaseClient.js'

// ======================
// 🔐 CONFIG
// ======================
const ADMIN_KEY = "abc123XYZ"
const BUCKET = "files"

// ======================
// 🔍 DETECT ROLE
// ======================
const params = new URLSearchParams(window.location.search)
const role = params.get("role")
const key = params.get("key")

let isAdmin = false

if (role === "admin" && key === ADMIN_KEY) {
  isAdmin = true
}

if (role !== "admin" && role !== "guest") {
  document.body.innerHTML = "<h1>Akses tidak valid</h1>"
  throw new Error("Invalid role")
}

// ======================
// 🎛️ UI SETUP
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
// 📤 UPLOAD FUNCTION
// ======================
document.getElementById("uploadBtn")?.addEventListener("click", uploadFile)

async function uploadFile() {
  const file = document.getElementById("fileInput").files[0]
  if (!file) return alert("Pilih file dulu!")

  // limit 10MB
  if (file.size > 10 * 1024 * 1024) {
    return alert("Max 10MB")
  }

  const fileName = Date.now() + "_" + file.name

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file)

  if (error) {
    console.error(error)
    return alert("Upload gagal")
  }

  alert("Upload berhasil!")
  loadFiles()
}

// ======================
// 📥 LOAD FILE LIST
// ======================
async function loadFiles() {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list('', { limit: 100 })

  if (error) {
    console.error(error)
    return
  }

  const list = document.getElementById("fileList")
  list.innerHTML = ""

  data.forEach(file => {
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(file.name)

    const li = document.createElement("li")

    li.innerHTML = `
      <a href="${urlData.publicUrl}" target="_blank">${file.name}</a>
      ${isAdmin ? `<button onclick="deleteFile('${file.name}')">🗑️</button>` : ""}
    `

    list.appendChild(li)
  })
}

// ======================
// 🗑️ DELETE (ADMIN ONLY)
// ======================
window.deleteFile = async function(fileName) {
  if (!isAdmin) return

  if (!confirm("Hapus file?")) return

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([fileName])

  if (error) {
    console.error(error)
    return alert("Gagal hapus")
  }

  loadFiles()
}

// ======================
// 🚀 INIT
// ======================
loadFiles()