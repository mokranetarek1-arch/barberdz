import { useEffect, useMemo, useState } from 'react'
import './index.css'
import Topbar from './components/Topbar'
import Button from './components/Button'
import Field from './components/Field'
import Avatar from './components/Avatar'
import Metric from './components/Metric'
import ActionCard from './components/ActionCard'
import RoleScreen from './pages/Role'
import AdminLogin from './pages/AdminLogin'
import Register from './pages/Register'
import BarberLogin from './pages/BarberLogin'
import Sidebar from './components/Sidebar'
import Preferences from './components/Preferences'
import AdminCashSale from './components/AdminCashSale'
import TransactionCount from './components/TransactionCount'
import SuperAdminDashboard from './pages/SuperAdminDashboard'
import SubscriptionLockScreen from './components/SubscriptionLockScreen'
import supabase from './supabaseClient'
import { I18nContext, getMessages } from './i18n'

const DEFAULT_SALON_CODE = 'SL-001'
const initialData = {
  shop: { name: 'Barber DZ', phone: '', address: '', salonCode: DEFAULT_SALON_CODE },
  barbers: [],
  transactions: [],
  admin: { id: '', firstName: '', lastName: '', phone: '', password: '', salonCode: DEFAULT_SALON_CODE },
}

const checkSubscriptionStatus = (profile) => {
  if (profile?.is_super_admin) return { isLocked: false, status: 'active', isSuperAdmin: true }
  const status = profile?.subscription_status || 'pending'
  if (status === 'blocked') return { isLocked: true, status: 'blocked', isSuperAdmin: false }
  if (status === 'pending' || !profile?.subscription_end) return { isLocked: true, status: 'pending', isSuperAdmin: false }
  const end = new Date(profile.subscription_end).getTime()
  if (end < Date.now()) return { isLocked: true, status: 'expired', isSuperAdmin: false }
  return { isLocked: false, status: 'active', isSuperAdmin: false }
}
const services = [['Coupe', 1200], ['Barbe', 700], ['VIP', 2200], ['Coloration', 3000], ['Soin', 900], ['Enfant', 600]]
const arServices = ['قص الشعر', 'اللحية', 'VIP', 'صبغة', 'عناية', 'الأطفال']
const normalizePhone = (value = '') => String(value || '').replace(/\s+/g, '').replace(/^\+/, '')
const cleanPhone = (val = '') => String(val || '').replace(/\D/g, '').replace(/^213/, '').replace(/^0/, '')
const phonesMatch = (p1, p2) => {
  const c1 = cleanPhone(p1)
  const c2 = cleanPhone(p2)
  if (!c1 || !c2) return false
  return c1 === c2 || c1.endsWith(c2) || c2.endsWith(c1)
}
const cleanCode = (val = '') => String(val || '').trim().toUpperCase()
const codesMatch = (c1, c2) => {
  const k1 = cleanCode(c1)
  const k2 = cleanCode(c2)
  return Boolean(k1 && k2 && k1 === k2)
}
const makeAdminEmail = (phone) => `${normalizePhone(phone || 'admin').replace(/[^a-zA-Z0-9]/g, '') || 'admin'}@barberdz.local`
const formatSalonCode = (value, fallback = DEFAULT_SALON_CODE) => {
  const text = String(value || '').trim().toUpperCase()
  if (text) return text
  return fallback
}
const generateBarberCode = (salonCode, index = 0) => `${formatSalonCode(salonCode, DEFAULT_SALON_CODE)}-${String((Number(index) || 0) + 1).padStart(2, '0')}`
const money = (value) => `${new Intl.NumberFormat('fr-DZ', { maximumFractionDigits: 0 }).format(value)} DA`
const copy = (ar) => ar ? { dashboard: 'لوحة التحكم', hello: 'مرحباً، المدير', revenue: 'رقم الأعمال', profit: 'ربح الصالون', commissions: 'العمولات المستحقة', management: 'إدارة الصالون', manageBarbers: 'إدارة الحلاقين', manageText: 'إضافة وتعديل ومتابعة فريقك', dailySummary: 'ملخص اليوم', summaryText: 'الإيرادات والعمولات حسب كل حلاق', performance: 'أداء الفريق', barbers: 'حلاقون', services: 'خدمات', commission: 'العمولة', barberManagement: 'إدارة الحلاقين', addBarber: 'إضافة حلاق', fullName: 'الاسم الكامل', phone: 'الهاتف', loginCode: 'رمز الدخول الذي تم إنشاؤه', commissionRate: 'نسبة العمولة (%)', cancel: 'إلغاء', saveChanges: 'حفظ التعديلات', add: 'إضافة الحلاق', team: 'فريقك', members: 'أعضاء', edit: 'تعديل', delete: 'حذف', summary: 'ملخص اليوم', income: 'الإيرادات', salonShare: 'حصة الصالون', details: 'التفاصيل حسب الحلاق', payouts: 'للدفع', workspace: 'مساحتي', newService: 'خدمة جديدة', stats: 'إحصائياتي', recordService: 'تسجيل خدمة', customer: 'اسم العميل (اختياري)', amount: 'المبلغ المقبوض (دج)', note: 'ملاحظة (اختيارية)', myCommission: 'عمولتك:', saveService: 'حفظ الخدمة', myRevenue: 'رقم أعمالي', clients: 'زبائني', latest: 'آخر الخدمات', unnamed: 'زبون بدون اسم', none: 'لا توجد خدمات مسجلة اليوم.', invalidAmount: 'أدخل مبلغاً صحيحاً.', saved: 'تم تسجيل الخدمة بنجاح.', settings: 'الإعدادات', about: 'حول التطبيق', aboutText: 'تطبيق لإدارة الصالون والعمولات والإيرادات اليومية.', adminProfile: 'المعلومات الشخصية', firstName: 'الاسم', lastName: 'اللقب', salonCode: 'رمز الصالون', copy: 'نسخ', copied: 'تم النسخ', shopInfo: 'معلومات الصالون', shopName: 'اسم الصالون', address: 'العنوان', save: 'حفظ', profile: 'ملفي الشخصي', name: 'الاسم', code: 'الرمز', logout: 'خروج', date: new Date().toLocaleDateString('ar-DZ', { weekday: 'long', day: 'numeric', month: 'long' }) } : { dashboard: 'Tableau de bord', hello: 'Bonjour, propriétaire', revenue: 'Chiffre d’affaires', profit: 'Bénéfice du salon', commissions: 'Commissions à verser', management: 'Gestion du salon', manageBarbers: 'Gérer les barbiers', manageText: 'Ajouter, modifier et suivre votre équipe', dailySummary: 'Résumé de la journée', summaryText: 'Revenus, commissions et détail par barbier', performance: 'Performance de l’équipe', barbers: 'barbiers', services: 'prestations', commission: 'Commission', barberManagement: 'Gestion des barbiers', addBarber: 'Ajouter un barbier', fullName: 'Nom complet', phone: 'Téléphone', loginCode: 'Code de connexion généré', commissionRate: 'Taux de commission (%)', cancel: 'Annuler', saveChanges: 'Enregistrer les changements', add: 'Ajouter le barbier', team: 'Votre équipe', members: 'membres', edit: 'Modifier', delete: 'Supprimer', summary: 'Résumé de la journée', income: 'Revenus', salonShare: 'Part salon', details: 'Détail par barbier', payouts: 'À verser', workspace: 'Mon espace', newService: 'Nouvelle prestation', stats: 'Mes statistiques', recordService: 'Enregistrer une prestation', customer: 'Nom du client (facultatif)', amount: 'Montant encaissé (DA)', note: 'Note (facultatif)', myCommission: 'Votre commission :', saveService: 'Enregistrer la prestation', myRevenue: 'Mon chiffre d’affaires', clients: 'Mes clients', latest: 'Dernières prestations', unnamed: 'Client sans nom', none: 'Aucune prestation enregistrée aujourd’hui.', invalidAmount: 'Saisissez un montant valide.', saved: 'Prestation enregistrée avec succès.', settings: 'Paramètres', about: 'À propos', aboutText: 'Application de gestion de salon, des commissions et des revenus quotidiens.', adminProfile: 'Informations personnelles', firstName: 'Prénom', lastName: 'Nom', salonCode: 'Code du salon', copy: 'Copier', copied: 'Copié', shopInfo: 'Informations du salon', shopName: 'Nom du salon', address: 'Adresse', save: 'Enregistrer', profile: 'Mon profil', name: 'Nom', code: 'Code', logout: 'Se déconnecter', date: new Date().toLocaleDateString('fr-DZ', { weekday: 'long', day: 'numeric', month: 'long' }) }

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const mapBarberRow = (row) => ({
  id: row.id,
  name: row.full_name || row.name || 'Barbier',
  phone: row.phone || '',
  rate: safeNumber(row.commission_rate ?? row.rate, 0),
  code: row.access_code || row.code || 'SL-001-01',
  adminId: row.admin_id || row.adminId || null,
})

const mapTransactionRow = (row) => ({
  id: row.id,
  barberId: row.barber_id || row.barberId || null,
  customer: row.customer_name || row.customer || '',
  amount: safeNumber(row.amount, 0),
  commission: safeNumber(row.commission_rate ?? row.barber_share ?? row.commission, 0),
  note: row.notes || row.note || '',
  paymentMethod: row.payment_method || 'cash',
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  adminId: row.admin_id || row.adminId || null,
})

async function loadFromSupabase(currentSession) {
  try {
    if (!currentSession) {
      return null
    }

    if ((currentSession.role === 'admin' || currentSession.role === 'super_admin') && currentSession.adminId) {
      const [profileRes, barbersRes, transactionsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', currentSession.adminId),
        supabase.from('barbers').select('*').eq('admin_id', currentSession.adminId),
        supabase.from('transactions').select('*').eq('admin_id', currentSession.adminId),
      ])

      const profile = Array.isArray(profileRes.data) && profileRes.data.length > 0 ? profileRes.data[0] : null
      const barbers = Array.isArray(barbersRes.data) ? barbersRes.data.map(mapBarberRow) : []
      const transactions = Array.isArray(transactionsRes.data) ? transactionsRes.data.map(mapTransactionRow) : []

      if (!profile) return null

      const subStatus = checkSubscriptionStatus(profile)
      const salonCode = formatSalonCode(profile.salon_code, DEFAULT_SALON_CODE)

      return {
        shop: {
          name: profile.shop_name || 'Barber DZ',
          phone: profile.phone || '',
          address: profile.shop_address || '',
          salonCode,
          adminId: profile.id,
          subscriptionStatus: profile.subscription_status || 'pending',
          subscriptionEnd: profile.subscription_end,
          isSuperAdmin: Boolean(profile.is_super_admin),
        },
        admin: {
          id: profile.id,
          phone: profile.phone || '',
          password: profile.password || '',
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          salonCode,
          isSuperAdmin: Boolean(profile.is_super_admin),
          isLocked: subStatus.isLocked,
          lockStatus: subStatus.status,
        },
        barbers,
        transactions,
        isSuperAdmin: Boolean(profile.is_super_admin),
        isLocked: subStatus.isLocked,
        lockStatus: subStatus.status,
      }
    }

    if (currentSession.role === 'barber' && currentSession.barberId) {
      const [barberRes, transactionsRes] = await Promise.all([
        supabase.from('barbers').select('*').eq('id', currentSession.barberId),
        supabase.from('transactions').select('*').eq('barber_id', currentSession.barberId),
      ])

      const barberRow = Array.isArray(barberRes.data) && barberRes.data.length > 0 ? barberRes.data[0] : null
      if (!barberRow) return null

      const barber = mapBarberRow(barberRow)
      const transactions = Array.isArray(transactionsRes.data) ? transactionsRes.data.map(mapTransactionRow) : []

      let shop = { name: 'Barber DZ', phone: '', address: '', salonCode: DEFAULT_SALON_CODE }
      let isLocked = false
      let lockStatus = 'active'

      if (barber.adminId) {
        const { data: profiles } = await supabase.from('profiles').select('*').eq('id', barber.adminId)
        if (profiles && profiles.length > 0) {
          const p = profiles[0]
          const sub = checkSubscriptionStatus(p)
          isLocked = sub.isLocked
          lockStatus = sub.status
          shop = {
            name: p.shop_name || 'Barber DZ',
            phone: p.phone || '',
            address: p.shop_address || '',
            salonCode: formatSalonCode(p.salon_code, DEFAULT_SALON_CODE),
            adminId: p.id,
            subscriptionStatus: p.subscription_status,
            subscriptionEnd: p.subscription_end,
          }
        }
      }

      return {
        shop,
        barbers: [barber],
        transactions,
        isLocked,
        lockStatus,
      }
    }

    return null
  } catch (err) {
    console.error('[loadFromSupabase] ERROR:', err)
    return null
  }
}

function App() {
  // SESSION ONLY in localStorage — the data itself always comes from Supabase.
  // Different ports (5173, 5174) and different browsers each have their own localStorage,
  // so data must never be stored there. Only who is logged in is cached locally.
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hfafa-session')) || null
    } catch {
      return null
    }
  })
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [screen, setScreen] = useState(() => {
    try {
      const savedSession = JSON.parse(localStorage.getItem('hfafa-session'))
      if (savedSession?.role === 'super_admin' || savedSession?.isSuperAdmin) return 'super-admin'
      if (savedSession?.isLocked) return 'lock-screen'
      if (savedSession?.role === 'admin') return 'dashboard'
      if (savedSession?.role === 'barber') return 'barber-workspace'
      return 'role'
    } catch {
      return 'role'
    }
  })
  const [toast, setToast] = useState('')
  const [locale, setLocale] = useState(() => localStorage.getItem('hfafa-locale') || 'fr')
  const [theme, setTheme] = useState(() => localStorage.getItem('hfafa-theme') || 'light')

  // Reload all data from Supabase for the current session
  const refreshRemote = async (activeSession) => {
    const sess = activeSession ?? session
    if (!sess) return
    const remoteData = await loadFromSupabase(sess)
    if (remoteData) {
      setData({
        shop: remoteData.shop || initialData.shop,
        admin: remoteData.admin || initialData.admin,
        barbers: remoteData.barbers || [],
        transactions: remoteData.transactions || [],
      })
      if (remoteData.isSuperAdmin && !sess.isSuperAdmin) {
        setSession((current) => ({
          ...current,
          role: 'super_admin',
          isSuperAdmin: true,
        }))
        setScreen('super-admin')
      }
    }
  }

  // On mount: if we have a saved session, reload data from Supabase immediately
  // and subscribe to Realtime changes so all tabs/browsers/devices stay in sync
  useEffect(() => {
    let channel

    const init = async () => {
      if (session) {
        setLoading(true)
        await refreshRemote(session)
        setLoading(false)
      }

      channel = supabase
        .channel('barber-dz-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'barbers' }, () => refreshRemote())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => refreshRemote())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => refreshRemote())
        .subscribe()
    }

    init()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [session?.adminId, session?.barberId])

  // Persist session to localStorage (only who is logged in, not the data)
  useEffect(() => {
    if (session) {
      localStorage.setItem('hfafa-session', JSON.stringify(session))
    } else {
      localStorage.removeItem('hfafa-session')
    }
  }, [session])

  useEffect(() => {
    localStorage.setItem('hfafa-locale', locale)
    document.documentElement.lang = locale
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
  }, [locale])

  useEffect(() => {
    localStorage.setItem('hfafa-theme', theme)
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(''), 3200)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    if (!session && !['role', 'admin-login', 'register', 'barber-login'].includes(screen)) {
      setScreen('role')
    } else if (session?.isSuperAdmin || session?.role === 'super_admin') {
      if (screen !== 'super-admin') setScreen('super-admin')
    } else if (session?.isLocked && screen !== 'lock-screen') {
      setScreen('lock-screen')
    } else if (session?.role === 'barber' && screen === 'dashboard') {
      setScreen('barber-workspace')
    }
  }, [session, screen])

  const totals = useMemo(() => data.transactions.reduce((sum, txn) => ({ revenue: sum.revenue + txn.amount, barber: sum.barber + txn.commission }), { revenue: 0, barber: 0 }), [data.transactions])

  const logout = () => {
    setSession(null)
    localStorage.removeItem('hfafa-session')
    setData(initialData)
    setScreen('role')
  }

  const addBarber = async (barber) => {
    const adminId = session?.adminId || data.admin?.id || data.shop?.adminId || null
    const newBarber = {
      ...barber,
      id: barber.id || crypto.randomUUID(),
      adminId,
    }
    setData((current) => ({
      ...current,
      barbers: [...current.barbers, newBarber],
    }))
    try {
      const { error } = await supabase.from('barbers').upsert([{
        id: newBarber.id,
        admin_id: adminId,
        full_name: newBarber.name,
        phone: newBarber.phone,
        commission_rate: newBarber.rate,
        access_code: cleanCode(newBarber.code),
        is_active: true,
        created_at: new Date().toISOString(),
      }])
      if (error) {
        console.error('[addBarber] Supabase error:', error)
        setToast(ar ? 'خطأ في حفظ الحلاق في قاعدة البيانات' : 'Erreur enregistrement Supabase')
      }
    } catch (err) {
      console.error('[addBarber] Exception:', err)
    }
  }

  const updateBarber = async (id, changes) => {
    setData((current) => ({
      ...current,
      barbers: current.barbers.map((b) => b.id === id ? { ...b, ...changes } : b),
    }))
    try {
      const existing = data.barbers.find((b) => b.id === id)
      const merged = { ...existing, ...changes }
      const { error } = await supabase.from('barbers').update({
        full_name: merged.name,
        phone: merged.phone,
        commission_rate: merged.rate,
        access_code: cleanCode(merged.code || ''),
      }).eq('id', id)
      if (error) {
        console.error('[updateBarber] Supabase error:', error)
      }
    } catch (err) {
      console.error('[updateBarber] Exception:', err)
    }
  }

  const deleteBarber = async (id) => {
    setData((current) => ({
      ...current,
      barbers: current.barbers.filter((b) => b.id !== id),
      transactions: current.transactions.filter((t) => t.barberId !== id),
    }))
    try {
      const { error: err1 } = await supabase.from('barbers').delete().eq('id', id)
      const { error: err2 } = await supabase.from('transactions').delete().eq('barber_id', id)
      if (err1 || err2) {
        console.error('[deleteBarber] Supabase error:', err1, err2)
      }
    } catch (err) {
      console.error('[deleteBarber] Exception:', err)
    }
  }

  const addTransaction = async (txn) => {
    const adminId = session?.adminId || data.admin?.id || data.shop?.adminId || null
    const newTxn = {
      ...txn,
      id: crypto.randomUUID(),
      adminId,
      createdAt: Date.now(),
    }
    setData((current) => ({
      ...current,
      transactions: [newTxn, ...current.transactions],
    }))
    try {
      const { error } = await supabase.from('transactions').upsert([{
        id: newTxn.id,
        admin_id: adminId,
        barber_id: newTxn.barberId || null,
        customer_name: newTxn.customer || '',
        amount: newTxn.amount ?? 0,
        commission_rate: newTxn.commission ?? 0,
        barber_share: newTxn.commission ?? 0,
        shop_share: Math.max((newTxn.amount ?? 0) - (newTxn.commission ?? 0), 0),
        payment_method: newTxn.paymentMethod || 'cash',
        notes: newTxn.note || '',
        created_at: new Date(newTxn.createdAt).toISOString(),
      }])
      if (error) {
        console.error('[addTransaction] Supabase error:', error)
        setToast(ar ? 'خطأ في حفظ المعاملة في قاعدة البيانات' : 'Erreur enregistrement Supabase')
      }
    } catch (err) {
      console.error('[addTransaction] Exception:', err)
    }
  }

  const ar = locale === 'ar'
  const l = copy(ar)

  const handleAdminLogin = async (phone, password) => {
    const rawPhone = String(phone || '').trim()

    try {
      const { data: rows, error } = await supabase.from('profiles').select('*')

      if (error || !rows || rows.length === 0) {
        setToast(ar ? 'رقم الهاتف غير مسجل.' : 'Numéro non enregistré.')
        return false
      }

      const profile = rows.find(
        (r) =>
          phonesMatch(r.phone, rawPhone) ||
          normalizePhone(r.phone) === normalizePhone(rawPhone) ||
          r.phone === rawPhone
      )

      if (!profile) {
        setToast(ar ? 'رقم الهاتف غير مسجل.' : 'Numéro non enregistré.')
        return false
      }

      if (String(profile.password).trim() !== String(password).trim()) {
        setToast(ar ? 'كلمة المرور غير صحيحة.' : 'Mot de passe incorrect.')
        return false
      }

      const isSuperAdmin = Boolean(profile.is_super_admin) || profile.role === 'super_admin'
      const sub = checkSubscriptionStatus(profile)
      const savedSalonCode = formatSalonCode(profile?.salon_code, isSuperAdmin ? 'SUPER-ADMIN' : DEFAULT_SALON_CODE)

      if (isSuperAdmin) {
        const newSession = {
          role: 'super_admin',
          adminId: profile.id,
          phone: profile.phone,
          isSuperAdmin: true,
          salonCode: 'SUPER-ADMIN',
        }
        setSession(newSession)
        setScreen('super-admin')
        return true
      }

      const [barbersRes, txnsRes] = await Promise.all([
        supabase.from('barbers').select('*').eq('admin_id', profile.id),
        supabase.from('transactions').select('*').eq('admin_id', profile.id),
      ])

      const remoteBarbers = Array.isArray(barbersRes.data) ? barbersRes.data.map(mapBarberRow) : []
      const remoteTxns = Array.isArray(txnsRes.data) ? txnsRes.data.map(mapTransactionRow) : []

      setData({
        shop: {
          name: profile.shop_name || 'Barber DZ',
          phone: profile.phone || '',
          address: profile.shop_address || '',
          salonCode: savedSalonCode,
          adminId: profile.id,
          subscriptionStatus: profile.subscription_status,
          subscriptionEnd: profile.subscription_end,
          isSuperAdmin: false,
        },
        admin: {
          id: profile.id,
          phone: profile.phone,
          password: profile.password,
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          salonCode: savedSalonCode,
          isSuperAdmin: false,
          isLocked: sub.isLocked,
          lockStatus: sub.status,
        },
        barbers: remoteBarbers,
        transactions: remoteTxns,
      })

      const newSession = {
        role: 'admin',
        adminId: profile.id,
        phone: profile.phone,
        salonCode: savedSalonCode,
        isSuperAdmin: false,
        isLocked: sub.isLocked,
        lockStatus: sub.status,
      }
      setSession(newSession)
      setScreen(sub.isLocked ? 'lock-screen' : 'dashboard')
      return true
    } catch (err) {
      console.error('[handleAdminLogin] ERROR:', err)
      setToast(ar ? 'رقم الهاتف غير مسجل.' : 'Numéro non enregistré.')
      return false
    }
  }

  const handleBarberLogin = async (phone, code) => {
    const queryPhone = String(phone || '').trim()
    const queryCode = cleanCode(code)

    try {
      const { data: rows, error } = await supabase.from('barbers').select('*')
      if (error || !Array.isArray(rows) || rows.length === 0) {
        setToast(ar ? 'بيانات الحلاق غير صحيحة.' : 'Identifiants barbier incorrects.')
        return false
      }

      const found = rows.find((r) => phonesMatch(r.phone, queryPhone) && (codesMatch(r.access_code, queryCode) || codesMatch(r.code, queryCode)))
      if (!found) {
        setToast(ar ? 'بيانات الحلاق غير صحيحة.' : 'Identifiants barbier incorrects.')
        return false
      }

      const barber = mapBarberRow(found)

      let shop = { name: 'Barber DZ', phone: '', address: '', salonCode: DEFAULT_SALON_CODE, adminId: barber.adminId || '' }
      let isLocked = false
      let lockStatus = 'active'

      if (barber.adminId) {
        const { data: profiles } = await supabase.from('profiles').select('*').eq('id', barber.adminId)
        if (profiles && profiles.length > 0) {
          const p = profiles[0]
          const sub = checkSubscriptionStatus(p)
          isLocked = sub.isLocked
          lockStatus = sub.status
          shop = {
            name: p.shop_name || 'Barber DZ',
            phone: p.phone || '',
            address: p.shop_address || '',
            salonCode: formatSalonCode(p.salon_code, DEFAULT_SALON_CODE),
            adminId: p.id,
            subscriptionStatus: p.subscription_status,
            subscriptionEnd: p.subscription_end,
          }
        }
      }

      const { data: txRows } = await supabase.from('transactions').select('*').eq('barber_id', barber.id)
      const remoteTxns = Array.isArray(txRows) ? txRows.map(mapTransactionRow) : []

      setData({
        shop,
        admin: initialData.admin,
        barbers: [barber],
        transactions: remoteTxns,
      })

      const newSession = {
        role: 'barber',
        barberId: barber.id,
        adminId: barber.adminId,
        isLocked,
        lockStatus,
      }
      setSession(newSession)
      setScreen(isLocked ? 'lock-screen' : 'barber-workspace')
      return true
    } catch {
      setToast(ar ? 'بيانات الحلاق غير صحيحة.' : 'Identifiants barbier incorrects.')
      return false
    }
  }

  const handleRegister = async (admin, shop) => {
    const safeAdmin = {
      ...admin,
      firstName: admin.firstName || '',
      lastName: admin.lastName || '',
      password: admin.password || '',
      phone: normalizePhone(admin.phone),
    }
    const safeShop = {
      ...shop,
      name: shop.name || 'Barber DZ',
      phone: normalizePhone(shop.phone || safeAdmin.phone),
      address: shop.address || '',
    }

    if (!safeAdmin.phone || !safeAdmin.password || safeAdmin.password.length < 6) {
      setToast(ar ? 'أدخل رقم هاتف وكلمة مرور صحيحة.' : 'Saisis un téléphone et un mot de passe valides.')
      return
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: makeAdminEmail(safeAdmin.phone),
        password: safeAdmin.password,
        options: {
          data: {
            phone: safeAdmin.phone,
            first_name: safeAdmin.firstName,
            last_name: safeAdmin.lastName,
            shop_name: safeShop.name,
            shop_address: safeShop.address,
            role: 'admin',
          },
        },
      })

      if (authError) {
        /* proceed with custom id fallback */
      }

      const userId = authData?.user?.id || crypto.randomUUID()
      const generatedSalonCode = formatSalonCode(safeShop.salonCode || DEFAULT_SALON_CODE, DEFAULT_SALON_CODE)
      const payload = {
        id: userId,
        first_name: safeAdmin.firstName,
        last_name: safeAdmin.lastName,
        phone: safeAdmin.phone,
        password: safeAdmin.password,
        shop_name: safeShop.name,
        shop_address: safeShop.address,
        salon_code: generatedSalonCode,
        role: 'admin',
        is_super_admin: false,
        subscription_status: 'pending',
        subscription_end: null,
        created_at: new Date().toISOString(),
      }

      const { error: profileError } = await supabase.from('profiles').upsert([payload], { onConflict: 'id' }).select()
      if (profileError) {
        throw profileError
      }

      setToast(ar ? 'تم إنشاء الحساب بنجاح! حسابك في انتظار التفعيل من قِبل الإدارة.' : 'Compte créé ! En attente d’activation par l’administrateur.')
      setScreen('admin-login')
    } catch (error) {
      const message = error?.message || (ar ? 'Échec de création du compte.' : 'La création du compte a échoué.')
      setToast(ar ? `تعذر إنشاء الحساب: ${message}` : `Création impossible: ${message}`)
    }
  }

  const handleSaveSettings = async (form) => {
    const adminId = session?.adminId || data.admin?.id || data.shop?.adminId
    const updatedSalonCode = formatSalonCode(form.salonCode, data.shop?.salonCode || DEFAULT_SALON_CODE)
    setData((current) => ({
      ...current,
      admin: {
        ...current.admin,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || current.admin?.phone,
        salonCode: updatedSalonCode,
      },
      shop: {
        ...current.shop,
        name: form.shopName || current.shop?.name,
        phone: form.phone || current.shop?.phone,
        address: form.address || current.shop?.address,
        salonCode: updatedSalonCode,
      }
    }))
    setToast(ar ? 'تم حفظ المعلومات.' : 'Informations enregistrées.')

    if (adminId) {
      try {
        await supabase.from('profiles').update({
          first_name: form.firstName,
          last_name: form.lastName,
          shop_name: form.shopName,
          phone: form.phone,
          shop_address: form.address,
          salon_code: updatedSalonCode,
        }).eq('id', adminId)
      } catch {
        /* ignore */
      }
    }
  }

  let content
  if (screen === 'super-admin') {
    content = <SuperAdminDashboard session={session} logout={logout} />
  } else if (session?.isLocked || screen === 'lock-screen') {
    content = (
      <SubscriptionLockScreen
        status={session?.lockStatus || data.admin?.lockStatus || 'pending'}
        isBarber={session?.role === 'barber'}
        shopName={data.shop?.name}
        salonCode={data.shop?.salonCode}
        phone={data.admin?.phone || session?.phone}
        logout={logout}
      />
    )
  } else if (screen === 'role') content = <RoleScreen onChoose={(role) => setScreen(role === 'admin' ? 'admin-login' : 'barber-login')} shopName={data.shop?.name} />
  else if (screen === 'admin-login') content = <AdminLogin data={data} onBack={() => setScreen('role')} onLogin={(phone, password) => handleAdminLogin(phone, password)} onRegister={() => setScreen('register')} />
  else if (screen === 'register') content = <Register onBack={() => setScreen('admin-login')} onRegister={handleRegister} />
  else if (screen === 'barber-login') content = <BarberLogin onBack={() => setScreen('role')} onLogin={(phone, code) => handleBarberLogin(phone, code)} shopName={data.shop?.name} />
  else if (screen === 'dashboard') {
    content = (session?.isSuperAdmin || session?.role === 'super_admin')
      ? <SuperAdminDashboard session={session} logout={logout} />
      : <Dashboard data={data} totals={totals} setScreen={setScreen} logout={logout} l={l} />
  }
  else if (screen === 'barbers') content = <BarberManagement barbers={data.barbers} salonCode={data.admin?.salonCode || data.shop?.salonCode || DEFAULT_SALON_CODE} onBack={() => setScreen('dashboard')} onAdd={addBarber} onUpdate={updateBarber} onDelete={deleteBarber} l={l} shopName={data.shop?.name} />
  else if (screen === 'summary') content = <Summary data={data} totals={totals} onBack={() => setScreen('dashboard')} l={l} shopName={data.shop?.name} />
  else if (screen === 'settings') content = <Settings data={data} isAdmin={session?.role === 'admin' || session?.role === 'super_admin'} barber={data.barbers.find((b) => b.id === session?.barberId)} onBack={() => setScreen(session?.role === 'admin' || session?.role === 'super_admin' ? 'dashboard' : 'barber-workspace')} onSave={handleSaveSettings} logout={logout} l={l} ar={ar} />
  else content = <BarberWorkspace barber={data.barbers.find((b) => b.id === session?.barberId)} transactions={data.transactions} onSave={addTransaction} onSettings={() => setScreen('settings')} logout={logout} l={l} ar={ar} shopName={data.shop?.name} />

  return (
    <I18nContext.Provider value={{ locale, t: (key) => getMessages(locale)[key] || key }}>
      <div className={`app-layout ${session ? 'is-authenticated' : 'is-guest'}`} dir={ar ? 'rtl' : 'ltr'}>
        {session && (
          <Sidebar
            role={session.role}
            isSuperAdmin={Boolean(session.isSuperAdmin || session.role === 'super_admin')}
            setScreen={setScreen}
            logout={logout}
            screen={screen}
            shopName={data.shop?.name}
          />
        )}
        <main className="app">
          <Preferences locale={locale} theme={theme} onLocaleChange={setLocale} onThemeChange={setTheme} />
          {session?.role === 'admin' && !session?.isLocked && <AdminCashSale onSave={addTransaction} />}
          {screen === 'summary' && <TransactionCount count={data.transactions.length} />}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px', opacity: 0.6 }}>
              <span style={{ fontSize: '2rem' }}>✂</span>
              <p>Chargement…</p>
            </div>
          ) : content}
          {toast && <div className="toast">✓ {toast}</div>}
        </main>
      </div>
    </I18nContext.Provider>
  )
}

function Dashboard({ data, totals, setScreen, logout, l }) {
  return <>
    <Topbar title={l.dashboard} shopName={data.shop?.name} actions={<><button className="icon-button" onClick={() => setScreen('settings')}>⚙</button><button className="logout" onClick={logout}>{l.logout}</button></>} />
    <section className="page">
      <div className="heading"><p className="eyebrow">{l.date}</p><h2>{l.hello} 👋</h2></div>
      <div className="metrics">
        <Metric label={l.revenue} value={money(totals.revenue)} color="green" icon="↗" />
        <Metric label={l.profit} value={money(totals.revenue - totals.barber)} color="orange" icon="◈" />
        <Metric label={l.commissions} value={money(totals.barber)} color="blue" icon="◉" />
      </div>
      <div className="section-title"><h2>{l.management}</h2></div>
      <div className="action-grid">
        <ActionCard icon="♙" title={l.manageBarbers} text={l.manageText} onClick={() => setScreen('barbers')} />
        <ActionCard icon="▥" title={l.dailySummary} text={l.summaryText} onClick={() => setScreen('summary')} />
      </div>
      <div className="section-title"><h2>{l.performance}</h2><span>{data.barbers.length} {l.barbers}</span></div>
      <div className="list-card">
        {data.barbers.map((barber) => {
          const txns = data.transactions.filter((t) => t.barberId === barber.id)
          const commission = txns.reduce((sum, t) => sum + t.commission, 0)
          return <div className="team-row" key={barber.id}><Avatar name={barber.name} /><div><strong>{barber.name}</strong><small>{txns.length} {l.services} · {l.commission} {barber.rate}%</small></div><b>{money(commission)}</b></div>
        })}
      </div>
    </section>
  </>
}

function BarberManagement({ barbers, salonCode, onBack, onAdd, onUpdate, onDelete, l, shopName }) {
  const [form, setForm] = useState({ name: '', phone: '', rate: '50' })
  const [editing, setEditing] = useState(null)
  const [copied, setCopied] = useState(false)
  const safeSalonCode = formatSalonCode(salonCode, DEFAULT_SALON_CODE)
  const generatedCode = useMemo(() => generateBarberCode(safeSalonCode, barbers.length), [safeSalonCode, barbers.length])
  const submit = (e) => {
    e.preventDefault()
    const rate = Number(form.rate)
    if (!form.name.trim() || !form.phone.trim() || rate <= 0) return
    if (editing) onUpdate(editing.id, { name: form.name, phone: form.phone, rate })
    else onAdd({ name: form.name, phone: form.phone, rate, code: generatedCode })
    setForm({ name: '', phone: '', rate: '50' })
    setEditing(null)
  }
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      /* ignore clipboard errors */
    }
  }
  return <>
    <Topbar title={l.barberManagement} back={onBack} shopName={shopName} />
    <section className="page">
      <form className="form-card" onSubmit={submit}>
        <h2>{editing ? `${l.edit} ${editing.name}` : l.addBarber}</h2>
        <div className="field-row">
          <Field label={l.fullName} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Field label={l.phone} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
        </div>
        {!editing && <div className="code-box"><span>{l.loginCode}</span><b>{generatedCode}</b><button type="button" className="mini-button" onClick={handleCopy}>{copied ? l.copied : l.copy}</button></div>}
        <Field label={l.commissionRate} type="number" min="1" max="100" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} required />
        <div className="form-actions">
          {editing && <Button type="button" className="secondary" onClick={() => { setEditing(null); setForm({ name: '', phone: '', rate: '50' }) }}>{l.cancel}</Button>}
          <Button type="submit">{editing ? l.saveChanges : l.add}</Button>
        </div>
      </form>
      <div className="section-title"><h2>{l.team}</h2><span>{barbers.length} {l.members}</span></div>
      <div className="list-card">
        {barbers.map((barber) => <div className="barber-row" key={barber.id}><Avatar name={barber.name} /><div><strong>{barber.name}</strong><small>{barber.phone} · {barber.code} · {barber.rate}%</small></div><button className="mini-button" onClick={() => { setEditing(barber); setForm({ name: barber.name, phone: barber.phone, rate: String(barber.rate) }) }}>{l.edit}</button><button className="delete-button" onClick={() => { if (confirm(`${l.delete} ${barber.name} ?`)) onDelete(barber.id) }}>×</button></div>)}
      </div>
    </section>
  </>
}

function Summary({ data, totals, onBack, l, shopName }) {
  return <>
    <Topbar title={l.summary} back={onBack} shopName={shopName} />
    <section className="page">
      <div className="metrics">
        <Metric label={l.income} value={money(totals.revenue)} color="green" icon="↗" />
        <Metric label={l.salonShare} value={money(totals.revenue - totals.barber)} color="orange" icon="◈" />
        <Metric label={l.commissions} value={money(totals.barber)} color="blue" icon="◉" />
      </div>
      <div className="section-title"><h2>{l.details}</h2></div>
      <div className="summary-list">
        {data.barbers.map((barber) => {
          const txns = data.transactions.filter((t) => t.barberId === barber.id)
          const revenue = txns.reduce((sum, t) => sum + t.amount, 0)
          const commission = txns.reduce((sum, t) => sum + t.commission, 0)
          return <article className="summary-card" key={barber.id}>
            <div className="summary-head"><div><Avatar name={barber.name} /><strong>{barber.name}</strong></div><span>{barber.rate}% {l.commission}</span></div>
            <div className="summary-values">
              <span><small>{l.services}</small><b>{txns.length}</b></span>
              <span><small>{l.income}</small><b>{money(revenue)}</b></span>
              <span><small>{l.payouts}</small><b className="green-text">{money(commission)}</b></span>
            </div>
          </article>
        })}
      </div>
    </section>
  </>
}

function BarberWorkspace({ barber, transactions, onSave, onSettings, logout, l, ar, shopName }) {
  const [tab, setTab] = useState('sale')
  const [form, setForm] = useState({ customer: '', amount: '', note: '' })
  const [message, setMessage] = useState('')
  if (!barber) return null
  const myTxns = transactions.filter((t) => t.barberId === barber.id)
  const revenue = myTxns.reduce((sum, t) => sum + t.amount, 0)
  const commission = myTxns.reduce((sum, t) => sum + t.commission, 0)
  const submit = (e) => {
    e.preventDefault()
    const amount = Number(form.amount)
    if (!amount || amount <= 0) {
      setMessage(l.invalidAmount)
      return
    }
    onSave({ barberId: barber.id, customer: form.customer, amount, note: form.note, commission: amount * barber.rate / 100 })
    setForm({ customer: '', amount: '', note: '' })
    setMessage(l.saved)
    setTab('stats')
  }
  return <>
    <Topbar title={`${shopName || 'Barber DZ'} · ${barber.name}`} actions={<><button className="icon-button" onClick={onSettings}>⚙</button><button className="logout" onClick={logout}>{l.logout}</button></>} shopName={shopName} />
    <section className="page">
      <div className="profile"><Avatar name={barber.name} /><div><strong>{barber.name}</strong><small>{barber.phone} · {barber.code}</small></div><b>{barber.rate}%</b></div>
      <div className="tabs">
        <button className={tab === 'sale' ? 'active' : ''} onClick={() => setTab('sale')}>{l.newService}</button>
        <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>{l.stats}</button>
      </div>
      {tab === 'sale' ? (
        <form className="form-card" onSubmit={submit}>
          <h2>{l.recordService}</h2>
          <Field label={l.customer} value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} />
          <Field label={l.amount} type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          <div className="service-chips">
            {services.map(([name, value], index) => <button type="button" key={name} onClick={() => setForm({ ...form, amount: String(value) })}>{ar ? arServices[index] : name}<b>{money(value)}</b></button>)}
          </div>
          <Field label={l.note} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <div className="commission-preview">{l.myCommission} <b>{money((Number(form.amount) || 0) * barber.rate / 100)}</b></div>
          {message && <p className="success">{message}</p>}
          <Button type="submit">{l.saveService}</Button>
        </form>
      ) : (
        <>
          <div className="metrics">
            <Metric label={l.myRevenue} value={money(revenue)} color="green" icon="↗" />
            <Metric label={l.myCommission} value={money(commission)} color="blue" icon="◉" />
            <Metric label={l.clients} value={myTxns.length} color="orange" icon="♙" />
          </div>
          <div className="section-title"><h2>{l.latest}</h2></div>
          <div className="list-card">
            {myTxns.length ? myTxns.map((txn) => <div className="team-row" key={txn.id}><span className="service-dot">✂</span><div><strong>{txn.customer || l.unnamed}</strong><small>{new Date(txn.createdAt).toLocaleString(ar ? 'ar-DZ' : 'fr-DZ')}</small></div><b>{money(txn.amount)}</b></div>) : <p className="empty">{l.none}</p>}
          </div>
        </>
      )}
    </section>
  </>
}

function Settings({ data, isAdmin, barber, onBack, onSave, logout, l, ar }) {
  const [form, setForm] = useState({
    firstName: data.admin?.firstName || '',
    lastName: data.admin?.lastName || '',
    shopName: data.shop?.name || '',
    phone: data.shop?.phone || data.admin?.phone || '',
    address: data.shop?.address || '',
    salonCode: data.shop?.salonCode || data.admin?.salonCode || DEFAULT_SALON_CODE,
  })
  const [copied, setCopied] = useState(false)

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(form.salonCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      /* ignore clipboard errors */
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(form)
  }

  return <>
    <Topbar title={l.settings} back={onBack} shopName={data.shop?.name} />
    <section className="page">
      <article className="info-card">
        <h2>{l.about}</h2>
        <p>Barber DZ · PWA v1.0</p>
        <small>{l.aboutText}</small>
      </article>

      {isAdmin ? (
        <form className="form-card" onSubmit={handleSubmit}>
          <h2>{l.adminProfile}</h2>
          <div className="field-row">
            <Field label={l.firstName} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            <Field label={l.lastName} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </div>

          <h2 style={{ marginTop: '20px' }}>{l.shopInfo}</h2>
          <div className="code-box">
            <span>{l.salonCode}</span>
            <b>{form.salonCode}</b>
            <button type="button" className="mini-button" onClick={handleCopyCode}>
              {copied ? l.copied : l.copy}
            </button>
          </div>
          <Field
            label={l.salonCode}
            value={form.salonCode}
            onChange={(e) => setForm({ ...form, salonCode: e.target.value.toUpperCase().trim() })}
            required
          />
          <Field label={l.shopName} value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} required />
          <Field label={l.phone} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <Field label={l.address} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
          <Button type="submit">{l.save}</Button>
        </form>
      ) : (
        <article className="info-card">
          <h2>{l.profile}</h2>
          <p><b>{l.name} :</b> {barber?.name}</p>
          <p><b>{l.phone} :</b> {barber?.phone}</p>
          <p><b>{l.code} :</b> {barber?.code}</p>
        </article>
      )}

      <button className="danger-wide" onClick={logout}>{l.logout}</button>
    </section>
  </>
}

export default App
