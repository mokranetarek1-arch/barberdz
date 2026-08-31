import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  import.meta.env?.VITE_SUPABASE_URL || 'https://qyrussyxedydtngpmlxc.supabase.co'
const SUPABASE_ANON_KEY =
  import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_lw6oVKrNECceNFwAtzKcnQ_w4awaNwG'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export default supabase

