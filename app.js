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
const key = params.get("key")

let isAdmin = false

// ADMIN kalau key cocok
if (key === ADMIN_KEY) {
  isAdmin = true
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
  const fileInput = document.getElementById("fileInput")
  const file = fileInput.files[0]

  if (!file) return alert("Pilih file dulu!")

  // max 10MB
  if (file.size > 10 * 1024 * 1024) {
    return alert("Max file 10MB")
  }

  const fileName = Date.now() + "_" + file.name

  try {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, file)

    if (error) throw error

    alert("Upload berhasil!")
    loadFiles()

  } catch (err) {
    console.error(err)
    alert("Upload gagal! Cek console.")
  }
}

// ======================
// 📥 LOAD FILE LIST
// ======================
async function loadFiles() {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: 100 })

    if (error) throw error

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

  } catch (err) {
    console.error(err)
  }
}

// ======================
// 🗑️ DELETE FILE (ADMIN)
// ======================
window.deleteFile = async function(fileName) {
  if (!isAdmin) return

  if (!confirm("Hapus file ini?")) return

  try {
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([fileName])

    if (error) throw error

    loadFiles()

  } catch (err) {
    console.error(err)
    alert("Gagal hapus file")
  }
}

// ======================
// 🚀 INIT
// ======================
loadFiles()