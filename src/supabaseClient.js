import { createClient } from '@supabase/supabase-js'

// Supabase settings taken from the Flutter project — replace if you have new keys
const SUPABASE_URL = 'https://qyrussyxedydtngpmlxc.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_lw6oVKrNECceNFwAtzKcnQ_w4awaNwG'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export default supabase
