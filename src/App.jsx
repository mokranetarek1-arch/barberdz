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
import { SUBSCRIPTION_PLANS, formatSubscriptionAmount } from './subscription'

const DEFAULT_SALON_CODE = 'SL-001'
const initialData = {
  shop: { name: 'Barber DZ', phone: '', address: '', salonCode: DEFAULT_SALON_CODE },
  barbers: [],
  transactions: [],
  admin: { id: '', firstName: '', lastName: '', phone: '', password: '', salonCode: DEFAULT_SALON_CODE },
  contact: { whatsapp: '', phone: '', ccp: '', countdown: true, expiryNotifications: true },
  subscriptions: [],
  subscriptionOrders: [],
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
const dateInputValue = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const monthInputValue = (date) => dateInputValue(date).slice(0, 7)
const getPeriodDates = (period, startDate, endDate, selectedMonth, selectedYear) => {
  const now = new Date()
  const selectedMonthDate = selectedMonth ? new Date(`${selectedMonth}-01T00:00:00`) : now
  const selectedYearNumber = Number(selectedYear) || now.getFullYear()
  const start = period === 'month'
    ? new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), 1)
    : period === 'year'
      ? new Date(selectedYearNumber, 0, 1)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start)
  if (period === 'month') end.setMonth(start.getMonth() + 1, 0)
  if (period === 'year') end.setFullYear(start.getFullYear() + 1, 0, 0)
  if (period === 'custom') {
    const customStart = startDate ? new Date(`${startDate}T00:00:00`) : start
    const customEnd = endDate ? new Date(`${endDate}T23:59:59.999`) : end
    return customStart <= customEnd ? [customStart, customEnd] : [customEnd, customStart]
  }
  end.setHours(23, 59, 59, 999)
  return [start, end]
}
const filterTransactions = (transactions, period, startDate, endDate, selectedMonth, selectedYear) => {
  const [start, end] = getPeriodDates(period, startDate, endDate, selectedMonth, selectedYear)
  return transactions.filter((transaction) => transaction.createdAt >= start.getTime() && transaction.createdAt <= end.getTime())
}
const formatTransactionTime = (timestamp, ar) => new Date(timestamp).toLocaleTimeString(ar ? 'ar-DZ' : 'fr-DZ', { hour: '2-digit', minute: '2-digit', hour12: false })
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
      const [profileRes, barbersRes, transactionsRes, contactRes, subscriptionsRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', currentSession.adminId),
        supabase.from('barbers').select('*').eq('admin_id', currentSession.adminId),
        supabase.from('transactions').select('*').eq('admin_id', currentSession.adminId),
        supabase.from('platform_settings').select('value').eq('key', 'contact').maybeSingle(),
        supabase.from('subscriptions').select('*').eq('salon_id', currentSession.adminId).order('created_at', { ascending: false }),
        supabase.from('subscription_orders').select('*').eq('salon_id', currentSession.adminId).order('created_at', { ascending: false }),
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
        contact: { ...initialData.contact, ...(contactRes.data?.value || {}) },
        subscriptions: Array.isArray(subscriptionsRes.data) ? subscriptionsRes.data : [],
        subscriptionOrders: Array.isArray(ordersRes.data) ? ordersRes.data : [],
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

      const { data: subscriptions } = await supabase.from('subscriptions').select('*').eq('salon_id', barber.adminId).order('created_at', { ascending: false })
      return {
        shop,
        barbers: [barber],
        transactions,
        isLocked,
        lockStatus,
        subscriptions: Array.isArray(subscriptions) ? subscriptions : [],
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
  const [superAdminView, setSuperAdminView] = useState('overview')

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
        contact: remoteData.contact || initialData.contact,
        subscriptions: remoteData.subscriptions || [],
        subscriptionOrders: remoteData.subscriptionOrders || [],
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

    // Register realtime callbacks synchronously BEFORE any await,
    // otherwise StrictMode's double-mount can call .on() after
    // .subscribe() on the same shared channel instance and crash.
    channel = supabase
      .channel('barber-dz-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barbers' }, () => refreshRemote())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => refreshRemote())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => refreshRemote())
      .subscribe()

    const init = async () => {
      if (session) {
        setLoading(true)
        await refreshRemote(session)
        setLoading(false)
      }
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

  const createSubscriptionOrder = async (order) => {
    const salonId = session?.adminId || data.admin?.id || data.shop?.adminId
    const plan = SUBSCRIPTION_PLANS.find((item) => item.id === order.planId)
    if (!salonId || !plan) return false
    const orderId = crypto.randomUUID()
    const { error } = await supabase.from('subscription_orders').insert({
      id: orderId,
      salon_id: salonId,
      plan: plan.id,
      duration: plan.duration,
      amount: plan.amount,
      payment_method: order.paymentMethod,
      payment_reference: order.paymentReference || null,
      note: order.note || null,
      status: order.paymentMethod === 'ccp' ? 'verification' : 'pending',
    })
    if (error) {
      console.error('[createSubscriptionOrder] Supabase error:', error)
      const message = error.code === '42P01'
        ? (ar ? 'جدول الطلبات غير موجود. نفذ ملف SQL.' : 'La table des demandes est absente. Exécutez le fichier SQL.')
        : error.code === '42501'
          ? (ar ? 'ليس لديك صلاحية إرسال الطلب. أعد تنفيذ سياسات RLS.' : 'Permission refusée. Réexécutez les politiques RLS des demandes.')
          : error.message
      setToast(message || (ar ? 'تعذر إرسال طلب الاشتراك.' : 'Impossible d’envoyer la demande d’abonnement.'))
      return false
    }
    setToast(ar ? 'تم إرسال طلب الاشتراك.' : 'Demande d’abonnement envoyée.')
    return { ...order, ...plan, id: orderId }
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

      const [barbersRes, txnsRes, contactRes, subscriptionsRes, ordersRes] = await Promise.all([
        supabase.from('barbers').select('*').eq('admin_id', profile.id),
        supabase.from('transactions').select('*').eq('admin_id', profile.id),
        supabase.from('platform_settings').select('value').eq('key', 'contact').maybeSingle(),
        supabase.from('subscriptions').select('*').eq('salon_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('subscription_orders').select('*').eq('salon_id', profile.id).order('created_at', { ascending: false }),
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
        contact: { ...initialData.contact, ...(contactRes.data?.value || {}) },
        subscriptions: Array.isArray(subscriptionsRes.data) ? subscriptionsRes.data : [],
        subscriptionOrders: Array.isArray(ordersRes.data) ? ordersRes.data : [],
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

      // Générer un code salon incrémenté automatiquement
      let generatedSalonCode = DEFAULT_SALON_CODE
      try {
        const { data: existingProfiles, error: fetchError } = await supabase
          .from('profiles')
          .select('salon_code')

        console.log('[generateSalonCode] fetch result:', { existingProfiles, fetchError })

        if (fetchError) {
          console.warn('[generateSalonCode] query error:', fetchError)
        }

        if (existingProfiles && existingProfiles.length > 0) {
          let maxNum = 0
          existingProfiles.forEach((p) => {
            const code = String(p.salon_code || '').trim().toUpperCase()
            const match = code.match(/^SL-(\d+)$/)
            if (match) {
              const num = parseInt(match[1], 10)
              if (num > maxNum) maxNum = num
            }
          })
          if (maxNum > 0) {
            generatedSalonCode = `SL-${String(maxNum + 1).padStart(3, '0')}`
          }
        }
      } catch (e) {
        console.warn('[generateSalonCode] exception:', e)
      }

      console.log('[generateSalonCode] generated:', generatedSalonCode)

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
    content = <SuperAdminDashboard session={session} logout={logout} activeView={superAdminView} onViewChange={setSuperAdminView} />
  } else if (session?.isLocked || screen === 'lock-screen') {
    content = (
      <SubscriptionLockScreen
        status={session?.lockStatus || data.admin?.lockStatus || 'pending'}
        isBarber={session?.role === 'barber'}
        shopName={data.shop?.name}
        salonCode={data.shop?.salonCode}
        phone={data.admin?.phone || session?.phone}
        ownerName={`${data.admin?.firstName || ''} ${data.admin?.lastName || ''}`.trim()}
        address={data.shop?.address}
        contact={data.contact}
        onCreateOrder={createSubscriptionOrder}
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
      : <Dashboard data={data} totals={totals} setScreen={setScreen} logout={logout} l={l} ar={ar} />
  }
  else if (screen === 'barbers') content = <BarberManagement barbers={data.barbers} salonCode={data.admin?.salonCode || data.shop?.salonCode || DEFAULT_SALON_CODE} onBack={() => setScreen('dashboard')} onAdd={addBarber} onUpdate={updateBarber} onDelete={deleteBarber} l={l} shopName={data.shop?.name} />
  else if (screen === 'summary') content = <Summary data={data} onBack={() => setScreen('dashboard')} l={l} ar={ar} shopName={data.shop?.name} />
  else if (screen === 'subscription') content = <AdminSubscription data={data} onBack={() => setScreen('dashboard')} l={l} ar={ar} shopName={data.shop?.name} onCreateOrder={createSubscriptionOrder} />
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
            superAdminView={superAdminView}
            onSuperAdminView={setSuperAdminView}
          />
        )}
        <main className="app">
          <Preferences locale={locale} theme={theme} onLocaleChange={setLocale} onThemeChange={setTheme} />
          {session?.role === 'admin' && !session?.isLocked && <AdminCashSale onSave={addTransaction} />}
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

function AdminSubscription({ data, onBack, l, ar, shopName, onCreateOrder }) {
  const [now, setNow] = useState(Date.now())
  const [requested, setRequested] = useState(null)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const active = data.subscriptions?.find((item) => item.status === 'active' && new Date(item.end_date).getTime() > now) || data.subscriptions?.[0]
  const countdown = active?.end_date ? formatSubscriptionCountdown(active.end_date, now, ar) : (ar ? 'غير مفعل' : 'Non activé')
  const activePlan = SUBSCRIPTION_PLANS.find((plan) => plan.id === active?.plan)
  const requestPlan = async (plan) => {
    const order = await onCreateOrder({ planId: plan.id, paymentMethod: 'cash' })
    if (order) setRequested(order)
  }
  return <>
    <Topbar title={l.subscription} back={onBack} shopName={shopName} />
    <section className="page">
      <div className="subscription-current-card">
        <h2>{ar ? 'اشتراكي الحالي' : 'Mon abonnement actuel'}</h2>
        <p><strong>{ar ? 'الخطة' : 'Plan'} :</strong> {activePlan?.label || active?.plan || (ar ? 'غير مفعل' : 'Non activé')}</p>
        <p><strong>{ar ? 'البداية' : 'Début'} :</strong> {active?.start_date ? new Date(active.start_date).toLocaleString(ar ? 'ar-DZ' : 'fr-DZ') : '-'}</p>
        <p><strong>{ar ? 'النهاية' : 'Fin'} :</strong> {active?.end_date ? new Date(active.end_date).toLocaleString(ar ? 'ar-DZ' : 'fr-DZ') : '-'}</p>
        <div className="subscription-countdown"><span>{ar ? 'الوقت المتبقي' : 'Temps restant'}</span><strong>{countdown}</strong></div>
      </div>
      <div className="section-title"><h2>{ar ? 'الخطط' : 'Formules'}</h2></div>
      <div className="subscription-plans">{SUBSCRIPTION_PLANS.map((plan) => <button type="button" className="subscription-plan" key={plan.id} onClick={() => requestPlan(plan)}><strong>{plan.label}</strong><b>{formatSubscriptionAmount(plan.amount)}</b><span>{ar ? 'اشترك' : 'S’abonner'}</span></button>)}</div>
      {requested && <p className="success subscription-request-message">{ar ? 'تم إرسال طلب الاشتراك.' : `Demande ${requested.label} envoyée. Notre équipe va vous contacter.`}</p>}
      <div className="section-title"><h2>{ar ? 'السجل' : 'Historique des abonnements'}</h2></div>
      <div className="list-card subscription-history-list">{data.subscriptionOrders?.length ? data.subscriptionOrders.map((order) => <div className="subscription-history-row" key={order.id}><div><strong>{order.plan}</strong><small>{new Date(order.created_at).toLocaleString(ar ? 'ar-DZ' : 'fr-DZ')}</small></div><span className={`status-pill ${order.status === 'confirmed' ? 'badge-success' : order.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>{order.status}</span><b>{formatSubscriptionAmount(order.amount)}</b></div>) : <p className="empty">{ar ? 'لا يوجد سجل.' : 'Aucun historique.'}</p>}</div>
    </section>
  </>
}

function formatSubscriptionCountdown(endDate, now, ar) {
  const remaining = new Date(endDate).getTime() - now
  if (remaining <= 0) return ar ? 'منتهي' : 'Expiré'
  const totalSeconds = Math.floor(remaining / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${days}j ${hours}:${minutes}:${seconds}`
}

function Dashboard({ data, totals, setScreen, logout, l, ar }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const activeSubscription = data.subscriptions?.find((item) => item.status === 'active' && new Date(item.end_date).getTime() > now)
  return <>
    <Topbar title={l.dashboard} shopName={data.shop?.name} actions={<><button className="icon-button" onClick={() => setScreen('settings')}>⚙</button><button className="logout" onClick={logout}>{l.logout}</button></>} />
    <section className="page">
      <div className="heading"><p className="eyebrow">{l.date}</p><h2>{l.hello} 👋</h2></div>
      <div className="metrics">
        <Metric label={l.revenue} value={money(totals.revenue)} color="green" icon="↗" />
        <Metric label={l.profit} value={money(totals.revenue - totals.barber)} color="orange" icon="◈" />
        <Metric label={l.commissions} value={money(totals.barber)} color="blue" icon="◉" />
      </div>
      {activeSubscription && <div className="dashboard-subscription-countdown"><span>{l.subscription || (ar ? 'الاشتراك' : 'Abonnement')} · {ar ? 'الوقت المتبقي' : 'Temps restant'}</span><strong>{formatSubscriptionCountdown(activeSubscription.end_date, now, ar)}</strong><small>{activeSubscription.start_date ? new Date(activeSubscription.start_date).toLocaleDateString(ar ? 'ar-DZ' : 'fr-DZ') : '-'} → {new Date(activeSubscription.end_date).toLocaleDateString(ar ? 'ar-DZ' : 'fr-DZ')}</small></div>}
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

function PeriodFilter({ ar, period, onPeriodChange, monthDate, onMonthDateChange, yearDate, onYearDateChange, startDate, endDate, onStartDateChange, onEndDateChange }) {
  const labels = ar
    ? { period: 'الفترة', day: 'يومي', month: 'شهري', year: 'سنوي', custom: 'مخصص', from: 'من', to: 'إلى' }
    : { period: 'Période', day: 'Journalier', month: 'Mensuel', year: 'Annuel', custom: 'Personnalisé', from: 'Du', to: 'Au' }
  return <div className="period-filter">
    <span className="period-label">{labels.period}</span>
    <div className="period-options">
      {['day', 'month', 'year', 'custom'].map((value) => <button type="button" key={value} className={period === value ? 'active' : ''} onClick={() => onPeriodChange(value)}>{labels[value]}</button>)}
    </div>
    {period === 'month' && <label className="period-choice">{labels.month}<input type="month" value={monthDate} onChange={(event) => onMonthDateChange(event.target.value)} /></label>}
    {period === 'year' && <label className="period-choice">{labels.year}<input type="number" min="2000" max="2100" value={yearDate} onChange={(event) => onYearDateChange(event.target.value)} /></label>}
    {period === 'custom' && <div className="period-dates">
      <label>{labels.from}<input type="date" value={startDate} onChange={(event) => onStartDateChange(event.target.value)} /></label>
      <label>{labels.to}<input type="date" value={endDate} onChange={(event) => onEndDateChange(event.target.value)} /></label>
    </div>}
  </div>
}

function Summary({ data, onBack, l, shopName, ar }) {
  const today = dateInputValue(new Date())
  const currentMonth = monthInputValue(new Date())
  const currentYear = String(new Date().getFullYear())
  const [period, setPeriod] = useState('day')
  const [monthDate, setMonthDate] = useState(currentMonth)
  const [yearDate, setYearDate] = useState(currentYear)
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const filteredTransactions = useMemo(() => filterTransactions(data.transactions, period, startDate, endDate, monthDate, yearDate), [data.transactions, period, startDate, endDate, monthDate, yearDate])
  const totals = useMemo(() => filteredTransactions.reduce((sum, txn) => ({ revenue: sum.revenue + txn.amount, barber: sum.barber + txn.commission }), { revenue: 0, barber: 0 }), [filteredTransactions])
  const historyTransactions = useMemo(() => [...filteredTransactions].sort((first, second) => second.createdAt - first.createdAt), [filteredTransactions])
  const historyTitle = ar ? 'سجل الخدمات' : 'Historique des prestations'
  const adminSaleLabel = ar ? 'تحصيل المدير' : 'Encaissement admin'
  return <>
    <Topbar title={l.summary} back={onBack} shopName={shopName} />
    <section className="page">
      <PeriodFilter ar={ar} period={period} onPeriodChange={setPeriod} monthDate={monthDate} onMonthDateChange={setMonthDate} yearDate={yearDate} onYearDateChange={setYearDate} startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />
      <TransactionCount count={filteredTransactions.length} />
      <div className="metrics">
        <Metric label={l.income} value={money(totals.revenue)} color="green" icon="↗" />
        <Metric label={l.salonShare} value={money(totals.revenue - totals.barber)} color="orange" icon="◈" />
        <Metric label={l.commissions} value={money(totals.barber)} color="blue" icon="◉" />
      </div>
      <div className="section-title"><h2>{l.details}</h2></div>
      <div className="summary-list">
        {data.barbers.map((barber) => {
          const txns = filteredTransactions.filter((t) => t.barberId === barber.id)
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
      <div className="section-title"><h2>{historyTitle}</h2></div>
      <div className="list-card history-list">
        {historyTransactions.length ? historyTransactions.map((txn) => {
          const barberName = data.barbers.find((barber) => barber.id === txn.barberId)?.name || adminSaleLabel
          return <div className="history-row" key={txn.id}><div><strong>{new Date(txn.createdAt).toLocaleDateString(ar ? 'ar-DZ' : 'fr-DZ')}</strong><small>{formatTransactionTime(txn.createdAt, ar)}</small></div><span>{barberName}</span><b>{money(txn.amount)}</b></div>
        }) : <p className="empty">{l.none}</p>}
      </div>
    </section>
  </>
}

function BarberWorkspace({ barber, transactions, onSave, onSettings, logout, l, ar, shopName }) {
  const [tab, setTab] = useState('sale')
  const [form, setForm] = useState({ customer: '', amount: '', note: '' })
  const [message, setMessage] = useState('')
  const today = dateInputValue(new Date())
  const currentMonth = monthInputValue(new Date())
  const currentYear = String(new Date().getFullYear())
  const [period, setPeriod] = useState('day')
  const [monthDate, setMonthDate] = useState(currentMonth)
  const [yearDate, setYearDate] = useState(currentYear)
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  if (!barber) return null
  const myTxns = filterTransactions(transactions.filter((t) => t.barberId === barber.id), period, startDate, endDate, monthDate, yearDate)
  const historyTitle = ar ? 'سجل الخدمات' : 'Historique des prestations'
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
          <PeriodFilter ar={ar} period={period} onPeriodChange={setPeriod} monthDate={monthDate} onMonthDateChange={setMonthDate} yearDate={yearDate} onYearDateChange={setYearDate} startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />
          <div className="metrics">
            <Metric label={l.myRevenue} value={money(revenue)} color="green" icon="↗" />
            <Metric label={l.myCommission} value={money(commission)} color="blue" icon="◉" />
            <Metric label={l.clients} value={myTxns.length} color="orange" icon="♙" />
          </div>
          <div className="section-title"><h2>{historyTitle}</h2></div>
          <div className="list-card history-list">
            {myTxns.length ? [...myTxns].sort((first, second) => second.createdAt - first.createdAt).map((txn) => <div className="history-row" key={txn.id}><div><strong>{new Date(txn.createdAt).toLocaleDateString(ar ? 'ar-DZ' : 'fr-DZ')}</strong><small>{formatTransactionTime(txn.createdAt, ar)}</small></div><b>{money(txn.amount)}</b></div>) : <p className="empty">{l.none}</p>}
          </div>
        </>
      )}
    </section>
  </>
}

function Settings({ data, isAdmin, barber, onBack, onSave, logout, l }) {
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
