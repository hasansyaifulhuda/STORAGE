import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://gxyidnmeqddweeoaanm.supabase.co'
const supabaseKey = 'sb_publishable_LRTWgT4AoMGohvvac97Avg_W2sEZZPP'

export const supabase = createClient(supabaseUrl, supabaseKey)