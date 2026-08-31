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
import supabase from './supabaseClient'
import { I18nContext, getMessages } from './i18n'

const initialData = { shop:{ name:'Salon HFafa', phone:'0555000000', address:'Alger' }, barbers:[{id:'b1',name:'Yacine',phone:'0555 00 11 22',rate:60,code:'HF-1001'},{id:'b2',name:'Karim',phone:'0555 00 33 44',rate:50,code:'HF-1002'},{id:'b3',name:'Sami',phone:'0555 00 55 66',rate:70,code:'HF-1003'}], transactions:[], admin:{phone:'',password:''} }
const services = [['Coupe',1200],['Barbe',700],['VIP',2200],['Coloration',3000],['Soin',900],['Enfant',600]]
const arServices = ['قص الشعر','اللحية','VIP','صبغة','عناية','الأطفال']
const normalizePhone = (value = '') => String(value).replace(/\D/g, '')
const makeAdminEmail = (phone) => `${normalizePhone(phone || 'admin').replace(/[^a-zA-Z0-9]/g, '') || 'admin'}@hfafa.local`
const money = (value) => `${new Intl.NumberFormat('fr-DZ',{maximumFractionDigits:0}).format(value)} DA`
const copy = (ar) => ar ? { dashboard:'لوحة التحكم', hello:'مرحباً، المدير', revenue:'رقم الأعمال', profit:'ربح الصالون', commissions:'العمولات المستحقة', management:'إدارة الصالون', manageBarbers:'إدارة الحلاقين', manageText:'إضافة وتعديل ومتابعة فريقك', dailySummary:'ملخص اليوم', summaryText:'الإيرادات والعمولات حسب كل حلاق', performance:'أداء الفريق', barbers:'حلاقون', services:'خدمات', commission:'العمولة', barberManagement:'إدارة الحلاقين', addBarber:'إضافة حلاق', fullName:'الاسم الكامل', phone:'الهاتف', loginCode:'رمز الدخول الذي تم إنشاؤه', commissionRate:'نسبة العمولة (%)', cancel:'إلغاء', saveChanges:'حفظ التعديلات', add:'إضافة الحلاق', team:'فريقك', members:'أعضاء', edit:'تعديل', delete:'حذف', summary:'ملخص اليوم', income:'الإيرادات', salonShare:'حصة الصالون', details:'التفاصيل حسب الحلاق', payouts:'للدفع', workspace:'مساحتي', newService:'خدمة جديدة', stats:'إحصائياتي', recordService:'تسجيل خدمة', customer:'اسم العميل (اختياري)', amount:'المبلغ المقبوض (دج)', note:'ملاحظة (اختيارية)', myCommission:'عمولتك:', saveService:'حفظ الخدمة', myRevenue:'رقم أعمالي', clients:'زبائني', latest:'آخر الخدمات', unnamed:'زبون بدون اسم', none:'لا توجد خدمات مسجلة اليوم.', invalidAmount:'أدخل مبلغاً صحيحاً.', saved:'تم تسجيل الخدمة بنجاح.', settings:'الإعدادات', about:'حول التطبيق', aboutText:'تطبيق لإدارة الصالون والعمولات والإيرادات اليومية.', shopInfo:'معلومات الصالون', shopName:'اسم الصالون', address:'العنوان', save:'حفظ', profile:'ملفي الشخصي', name:'الاسم', code:'الرمز', logout:'خروج', date:new Date().toLocaleDateString('ar-DZ',{weekday:'long',day:'numeric',month:'long'}) } : { dashboard:'Tableau de bord', hello:'Bonjour, propriétaire', revenue:'Chiffre d’affaires', profit:'Bénéfice du salon', commissions:'Commissions à verser', management:'Gestion du salon', manageBarbers:'Gérer les barbiers', manageText:'Ajouter, modifier et suivre votre équipe', dailySummary:'Résumé de la journée', summaryText:'Revenus, commissions et détail par barbier', performance:'Performance de l’équipe', barbers:'barbiers', services:'prestations', commission:'Commission', barberManagement:'Gestion des barbiers', addBarber:'Ajouter un barbier', fullName:'Nom complet', phone:'Téléphone', loginCode:'Code de connexion généré', commissionRate:'Taux de commission (%)', cancel:'Annuler', saveChanges:'Enregistrer les changements', add:'Ajouter le barbier', team:'Votre équipe', members:'membres', edit:'Modifier', delete:'Supprimer', summary:'Résumé de la journée', income:'Revenus', salonShare:'Part salon', details:'Détail par barbier', payouts:'À verser', workspace:'Mon espace', newService:'Nouvelle prestation', stats:'Mes statistiques', recordService:'Enregistrer une prestation', customer:'Nom du client (facultatif)', amount:'Montant encaissé (DA)', note:'Note (facultatif)', myCommission:'Votre commission :', saveService:'Enregistrer la prestation', myRevenue:'Mon chiffre d’affaires', clients:'Mes clients', latest:'Dernières prestations', unnamed:'Client sans nom', none:'Aucune prestation enregistrée aujourd’hui.', invalidAmount:'Saisissez un montant valide.', saved:'Prestation enregistrée avec succès.', settings:'Paramètres', about:'À propos', aboutText:'Application de gestion de salon, des commissions et des revenus quotidiens.', shopInfo:'Informations du salon', shopName:'Nom du salon', address:'Adresse', save:'Enregistrer', profile:'Mon profil', name:'Nom', code:'Code', logout:'Se déconnecter', date:new Date().toLocaleDateString('fr-DZ',{weekday:'long',day:'numeric',month:'long'}) }

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const mapBarberRow = (row) => ({
  id: row.id,
  name: row.full_name || row.name || 'Barbier',
  phone: row.phone || '',
  rate: safeNumber(row.commission_rate ?? row.rate, 0),
  code: row.access_code || row.code || 'HF-0000',
  adminId: row.admin_id || null,
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
  adminId: row.admin_id || null,
})

async function loadFromSupabase() {
  try {
    const [profileRes, barbersRes, transactionsRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('barbers').select('*'),
      supabase.from('transactions').select('*'),
    ])

    if (profileRes.error && !profileRes.data && barbersRes.error && !barbersRes.data && transactionsRes.error && !transactionsRes.data) {
      return null
    }

    const profile = Array.isArray(profileRes.data) && profileRes.data.length > 0 ? profileRes.data[0] : null
    const barbers = Array.isArray(barbersRes.data) ? barbersRes.data.map(mapBarberRow) : []
    const transactions = Array.isArray(transactionsRes.data) ? transactionsRes.data.map(mapTransactionRow) : []

    if (!profile && !barbers.length && !transactions.length) {
      return null
    }

    return {
      shop: {
        name: profile?.shop_name || 'Salon HFafa',
        phone: profile?.phone || '',
        address: profile?.shop_address || '',
      },
      admin: {
        phone: profile?.phone || '',
        password: profile?.password || '',
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
      },
      barbers,
      transactions,
    }
  } catch {
    return null
  }
}

async function syncToSupabase(data) {
  if (!data) return

  try {
    if (data.shop || data.admin) {
      const profilePayload = {
        id: crypto.randomUUID(),
        first_name: data.admin?.firstName || '',
        last_name: data.admin?.lastName || '',
        phone: data.admin?.phone || data.shop?.phone || '',
        password: data.admin?.password || '',
        shop_name: data.shop?.name || '',
        shop_address: data.shop?.address || '',
        role: 'admin',
        created_at: new Date().toISOString(),
      }

      await supabase.from('profiles').upsert([profilePayload], { onConflict: 'id' }).select()
    }

    if (Array.isArray(data.barbers) && data.barbers.length) {
      const barbersPayload = data.barbers.map((barber) => ({
        id: barber.id || crypto.randomUUID(),
        admin_id: barber.adminId || null,
        full_name: barber.name || '',
        phone: barber.phone || '',
        commission_rate: barber.rate ?? 0,
        access_code: barber.code || '',
        is_active: true,
        created_at: new Date().toISOString(),
      }))
      await supabase.from('barbers').upsert(barbersPayload, { onConflict: 'id' }).select()
    }

    if (Array.isArray(data.transactions) && data.transactions.length) {
      const txPayload = data.transactions.map((txn) => ({
        id: txn.id || crypto.randomUUID(),
        admin_id: txn.adminId || null,
        barber_id: txn.barberId || null,
        customer_name: txn.customer || '',
        amount: txn.amount ?? 0,
        commission_rate: txn.commission ?? 0,
        barber_share: txn.commission ?? 0,
        shop_share: Math.max((txn.amount ?? 0) - (txn.commission ?? 0), 0),
        payment_method: txn.paymentMethod || 'cash',
        notes: txn.note || '',
        created_at: txn.createdAt ? new Date(txn.createdAt).toISOString() : new Date().toISOString(),
      }))
      await supabase.from('transactions').upsert(txPayload, { onConflict: 'id' }).select()
    }
  } catch {
    // Ignore sync errors: app keeps working locally if Supabase tables are absent or not yet configured.
  }
}

function App() {
  const [data,setData] = useState(() => { try { return JSON.parse(localStorage.getItem('hfafa-data')) || initialData } catch { return initialData } }); const [screen,setScreen] = useState('role'); const [session,setSession] = useState(null); const [toast,setToast] = useState(''); const [locale,setLocale] = useState(() => localStorage.getItem('hfafa-locale') || 'fr'); const [theme,setTheme] = useState(() => localStorage.getItem('hfafa-theme') || 'light')
  useEffect(() => { let active = true; const loadRemote = async () => { const remoteData = await loadFromSupabase(); if (remoteData && active) { setData((current) => ({ ...current, ...remoteData, barbers: remoteData.barbers || current.barbers, transactions: remoteData.transactions || current.transactions })) } }; loadRemote(); return () => { active = false } }, [])
  useEffect(() => localStorage.setItem('hfafa-data',JSON.stringify(data)),[data]); useEffect(() => { localStorage.setItem('hfafa-locale',locale); document.documentElement.lang=locale; document.documentElement.dir=locale==='ar'?'rtl':'ltr' },[locale]); useEffect(() => { localStorage.setItem('hfafa-theme',theme); document.documentElement.dataset.theme=theme },[theme]); useEffect(() => { if(!toast)return; const id=setTimeout(() => setToast(''),3200); return () => clearTimeout(id) },[toast]); useEffect(() => { if(!session && !['role','admin-login','register','barber-login'].includes(screen)) setScreen('role') },[session,screen]); useEffect(() => { if(session?.role==='barber' && screen==='dashboard') setScreen('barber-workspace') },[session,screen]); useEffect(() => { syncToSupabase(data) }, [data])
  const totals=useMemo(() => data.transactions.reduce((sum,txn) => ({revenue:sum.revenue+txn.amount,barber:sum.barber+txn.commission}),{revenue:0,barber:0}),[data.transactions]); const logout=() => {setSession(null);setScreen('role')}; const addBarber=(barber) => setData((current) => ({...current,barbers:[...current.barbers,{...barber,id:barber.id||crypto.randomUUID()}]})); const updateBarber=(id,changes) => setData((current) => ({...current,barbers:current.barbers.map((b) => b.id===id?{...b,...changes}:b)})); const deleteBarber=(id) => setData((current) => ({...current,barbers:current.barbers.filter((b) => b.id!==id),transactions:current.transactions.filter((t) => t.barberId!==id)})); const addTransaction=(txn) => setData((current) => ({...current,transactions:[{...txn,id:crypto.randomUUID(),createdAt:Date.now()},...current.transactions]})); const ar=locale==='ar'; const l=copy(ar)
  const handleAdminLogin = async (phone, password) => {
    const queryPhone = normalizePhone(phone)

    const localAdminPhone = normalizePhone(data?.admin?.phone || '')
    if (localAdminPhone === queryPhone && String(data?.admin?.password || '') === String(password)) {
      setData((current) => ({ ...current, admin: { ...current.admin, phone: current.admin.phone, password: current.admin.password } }))
      setSession({ role: 'admin' })
      setScreen('dashboard')
      return
    }

    try {
      const { data: rows, error } = await supabase.from('profiles').select('*').eq('phone', queryPhone)
      if (error || !rows || rows.length === 0) {
        setToast(ar ? 'رقم الهاتف غير مسجل.' : 'Numéro non enregistré.')
        return
      }

      const profile = rows[0]
      if (profile.password !== password) {
        setToast(ar ? 'كلمة المرور غير صحيحة.' : 'Mot de passe incorrect.')
        return
      }

      setData((current) => ({ ...current, admin: { phone: profile.phone, password: profile.password, firstName: profile.first_name || '', lastName: profile.last_name || '' }, shop: { name: profile.shop_name || current.shop.name, phone: profile.phone || current.shop.phone, address: profile.shop_address || current.shop.address } }))
      setSession({ role: 'admin' })
      setScreen('dashboard')
    } catch {
      setToast(ar ? 'رقم الهاتف غير مسجل.' : 'Numéro non enregistré.')
    }
  }

  const handleRegister = async (admin, shop) => {
    const safeAdmin = { ...admin, password: admin.password || '', phone: normalizePhone(admin.phone) }
    const safeShop = { ...shop, name: shop.name || 'Salon HFafa', phone: normalizePhone(shop.phone || safeAdmin.phone), address: shop.address || '' }

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
            first_name: admin.firstName || '',
            last_name: admin.lastName || '',
            shop_name: safeShop.name,
            shop_address: safeShop.address,
            role: 'admin',
          },
        },
      })

      if (authError) {
        throw authError
      }

      const userId = authData?.user?.id || crypto.randomUUID()
      const payload = {
        id: userId,
        first_name: admin.firstName || '',
        last_name: admin.lastName || '',
        phone: safeAdmin.phone,
        password: safeAdmin.password,
        shop_name: safeShop.name,
        shop_address: safeShop.address,
        role: 'admin',
        created_at: new Date().toISOString(),
      }

      const { error: profileError } = await supabase.from('profiles').upsert([payload], { onConflict: 'id' }).select()
      if (profileError) {
        throw profileError
      }

      setData((current) => ({ ...current, admin: safeAdmin, shop: safeShop }))
      setToast(ar ? 'تم إنشاء الحساب. سجّل الدخول.' : 'Compte administrateur créé. Connectez-vous.')
      setScreen('admin-login')
    } catch (error) {
      const message = error?.message || (ar ? 'Échec de création du compte.' : 'La création du compte a échoué.')
      setToast(ar ? `تعذر إنشاء الحساب: ${message}` : `Création impossible: ${message}`)
    }
  }

  let content; if(screen==='role') content=<RoleScreen onChoose={(role) => setScreen(role==='admin'?'admin-login':'barber-login')} />; else if(screen==='admin-login') content=<AdminLogin data={data} onBack={() => setScreen('role')} onLogin={(phone, password) => handleAdminLogin(phone, password)} onRegister={() => setScreen('register')} />; else if(screen==='register') content=<Register onBack={() => setScreen('admin-login')} onRegister={handleRegister} />; else if(screen==='barber-login') content=<BarberLogin barbers={data.barbers} onBack={() => setScreen('role')} onLogin={(barber) => {setSession({role:'barber',barberId:barber.id});setScreen('barber-workspace')}} />; else if(screen==='dashboard') content=<Dashboard data={data} totals={totals} setScreen={setScreen} logout={logout} l={l} />; else if(screen==='barbers') content=<BarberManagement barbers={data.barbers} onBack={() => setScreen('dashboard')} onAdd={addBarber} onUpdate={updateBarber} onDelete={deleteBarber} l={l} />; else if(screen==='summary') content=<Summary data={data} totals={totals} onBack={() => setScreen('dashboard')} l={l} />; else if(screen==='settings') content=<Settings data={data} isAdmin={session?.role==='admin'} barber={data.barbers.find((b) => b.id===session?.barberId)} onBack={() => setScreen(session?.role==='admin'?'dashboard':'barber-workspace')} onSave={(shop) => {setData((current) => ({...current,shop}));setToast(ar?'تم حفظ المعلومات.':'Informations enregistrées.')}} logout={logout} l={l} />; else content=<BarberWorkspace barber={data.barbers.find((b) => b.id===session?.barberId)} transactions={data.transactions} onSave={addTransaction} onSettings={() => setScreen('settings')} logout={logout} l={l} ar={ar} />
  return <I18nContext.Provider value={{locale,t:(key) => getMessages(locale)[key]||key}}><div className={`app-layout ${session?'is-authenticated':'is-guest'}`} dir={ar?'rtl':'ltr'}>{session&&<Sidebar role={session.role} setScreen={setScreen} logout={logout} screen={screen}/>}<main className="app"><Preferences locale={locale} theme={theme} onLocaleChange={setLocale} onThemeChange={setTheme}/>{session?.role==='admin'&&<AdminCashSale onSave={addTransaction}/>} {screen==='summary'&&<TransactionCount count={data.transactions.length}/>} {content}{toast&&<div className="toast">✓ {toast}</div>}</main></div></I18nContext.Provider>
}

function Dashboard({data,totals,setScreen,logout,l}) { return <><Topbar title={l.dashboard} actions={<><button className="icon-button" onClick={() => setScreen('settings')}>⚙</button><button className="logout" onClick={logout}>{l.logout}</button></>}/><section className="page"><div className="heading"><p className="eyebrow">{l.date}</p><h2>{l.hello} 👋</h2></div><div className="metrics"><Metric label={l.revenue} value={money(totals.revenue)} color="green" icon="↗"/><Metric label={l.profit} value={money(totals.revenue-totals.barber)} color="orange" icon="◈"/><Metric label={l.commissions} value={money(totals.barber)} color="blue" icon="◉"/></div><div className="section-title"><h2>{l.management}</h2></div><div className="action-grid"><ActionCard icon="♙" title={l.manageBarbers} text={l.manageText} onClick={() => setScreen('barbers')}/><ActionCard icon="▥" title={l.dailySummary} text={l.summaryText} onClick={() => setScreen('summary')}/></div><div className="section-title"><h2>{l.performance}</h2><span>{data.barbers.length} {l.barbers}</span></div><div className="list-card">{data.barbers.map((barber) => { const txns=data.transactions.filter((t) => t.barberId===barber.id); const commission=txns.reduce((sum,t) => sum+t.commission,0); return <div className="team-row" key={barber.id}><Avatar name={barber.name}/><div><strong>{barber.name}</strong><small>{txns.length} {l.services} · {l.commission} {barber.rate}%</small></div><b>{money(commission)}</b></div>})}</div></section></> }
function BarberManagement({barbers,onBack,onAdd,onUpdate,onDelete,l}) { const [form,setForm]=useState({name:'',phone:'',rate:'50'});const [editing,setEditing]=useState(null);const code=`HF-${1001+barbers.length}`;const submit=(e) => {e.preventDefault();const rate=Number(form.rate);if(!form.name.trim()||!form.phone.trim()||rate<=0)return;if(editing)onUpdate(editing.id,{name:form.name,phone:form.phone,rate});else onAdd({name:form.name,phone:form.phone,rate,code});setForm({name:'',phone:'',rate:'50'});setEditing(null)};return <><Topbar title={l.barberManagement} back={onBack}/><section className="page"><form className="form-card" onSubmit={submit}><h2>{editing?`${l.edit} ${editing.name}`:l.addBarber}</h2><div className="field-row"><Field label={l.fullName} value={form.name} onChange={(e) => setForm({...form,name:e.target.value})} required/><Field label={l.phone} value={form.phone} onChange={(e) => setForm({...form,phone:e.target.value})} required/></div>{!editing&&<div className="code-box"><span>{l.loginCode}</span><b>{code}</b></div>}<Field label={l.commissionRate} type="number" min="1" max="100" value={form.rate} onChange={(e) => setForm({...form,rate:e.target.value})} required/><div className="form-actions">{editing&&<Button type="button" className="secondary" onClick={() => {setEditing(null);setForm({name:'',phone:'',rate:'50'})}}>{l.cancel}</Button>}<Button type="submit">{editing?l.saveChanges:l.add}</Button></div></form><div className="section-title"><h2>{l.team}</h2><span>{barbers.length} {l.members}</span></div><div className="list-card">{barbers.map((barber) => <div className="barber-row" key={barber.id}><Avatar name={barber.name}/><div><strong>{barber.name}</strong><small>{barber.phone} · {barber.code} · {barber.rate}%</small></div><button className="mini-button" onClick={() => {setEditing(barber);setForm({name:barber.name,phone:barber.phone,rate:String(barber.rate)})}}>{l.edit}</button><button className="delete-button" onClick={() => {if(confirm(`${l.delete} ${barber.name} ?`))onDelete(barber.id)}}>×</button></div>)}</div></section></> }
function Summary({data,totals,onBack,l}) { return <><Topbar title={l.summary} back={onBack}/><section className="page"><div className="metrics"><Metric label={l.income} value={money(totals.revenue)} color="green" icon="↗"/><Metric label={l.salonShare} value={money(totals.revenue-totals.barber)} color="orange" icon="◈"/><Metric label={l.commissions} value={money(totals.barber)} color="blue" icon="◉"/></div><div className="section-title"><h2>{l.details}</h2></div><div className="summary-list">{data.barbers.map((barber) => {const txns=data.transactions.filter((t) => t.barberId===barber.id);const revenue=txns.reduce((sum,t) => sum+t.amount,0);const commission=txns.reduce((sum,t) => sum+t.commission,0);return <article className="summary-card" key={barber.id}><div className="summary-head"><div><Avatar name={barber.name}/><strong>{barber.name}</strong></div><span>{barber.rate}% {l.commission}</span></div><div className="summary-values"><span><small>{l.services}</small><b>{txns.length}</b></span><span><small>{l.income}</small><b>{money(revenue)}</b></span><span><small>{l.payouts}</small><b className="green-text">{money(commission)}</b></span></div></article>})}</div></section></> }
function BarberWorkspace({barber,transactions,onSave,onSettings,logout,l,ar}) { const [tab,setTab]=useState('sale');const [form,setForm]=useState({customer:'',amount:'',note:''});const [message,setMessage]=useState('');if(!barber)return null;const myTxns=transactions.filter((t) => t.barberId===barber.id);const revenue=myTxns.reduce((sum,t) => sum+t.amount,0);const commission=myTxns.reduce((sum,t) => sum+t.commission,0);const submit=(e) => {e.preventDefault();const amount=Number(form.amount);if(!amount||amount<=0){setMessage(l.invalidAmount);return}onSave({barberId:barber.id,customer:form.customer,amount,note:form.note,commission:amount*barber.rate/100});setForm({customer:'',amount:'',note:''});setMessage(l.saved);setTab('stats')};return <><Topbar title={`${l.workspace} · ${barber.name}`} actions={<><button className="icon-button" onClick={onSettings}>⚙</button><button className="logout" onClick={logout}>{l.logout}</button></>}/><section className="page"><div className="profile"><Avatar name={barber.name}/><div><strong>{barber.name}</strong><small>{barber.phone} · {barber.code}</small></div><b>{barber.rate}%</b></div><div className="tabs"><button className={tab==='sale'?'active':''} onClick={() => setTab('sale')}>{l.newService}</button><button className={tab==='stats'?'active':''} onClick={() => setTab('stats')}>{l.stats}</button></div>{tab==='sale'?<form className="form-card" onSubmit={submit}><h2>{l.recordService}</h2><Field label={l.customer} value={form.customer} onChange={(e) => setForm({...form,customer:e.target.value})}/><Field label={l.amount} type="number" min="1" value={form.amount} onChange={(e) => setForm({...form,amount:e.target.value})} required/><div className="service-chips">{services.map(([name,value],index) => <button type="button" key={name} onClick={() => setForm({...form,amount:String(value)})}>{ar?arServices[index]:name}<b>{money(value)}</b></button>)}</div><Field label={l.note} value={form.note} onChange={(e) => setForm({...form,note:e.target.value})}/><div className="commission-preview">{l.myCommission} <b>{money((Number(form.amount)||0)*barber.rate/100)}</b></div>{message&&<p className="success">{message}</p>}<Button type="submit">{l.saveService}</Button></form>:<><div className="metrics"><Metric label={l.myRevenue} value={money(revenue)} color="green" icon="↗"/><Metric label={l.myCommission} value={money(commission)} color="blue" icon="◉"/><Metric label={l.clients} value={myTxns.length} color="orange" icon="♙"/></div><div className="section-title"><h2>{l.latest}</h2></div><div className="list-card">{myTxns.length?myTxns.map((txn) => <div className="team-row" key={txn.id}><span className="service-dot">✂</span><div><strong>{txn.customer||l.unnamed}</strong><small>{new Date(txn.createdAt).toLocaleString(ar?'ar-DZ':'fr-DZ')}</small></div><b>{money(txn.amount)}</b></div>):<p className="empty">{l.none}</p>}</div></>}</section></> }
function Settings({data,isAdmin,barber,onBack,onSave,logout,l}) { const [shop,setShop]=useState(data.shop);return <><Topbar title={l.settings} back={onBack}/><section className="page"><article className="info-card"><h2>{l.about}</h2><p>HFafa Barber Shop · PWA v1.0</p><small>{l.aboutText}</small></article>{isAdmin?<form className="form-card" onSubmit={(e) => {e.preventDefault();onSave(shop)}}><h2>{l.shopInfo}</h2><Field label={l.shopName} value={shop.name} onChange={(e) => setShop({...shop,name:e.target.value})}/><Field label={l.phone} value={shop.phone} onChange={(e) => setShop({...shop,phone:e.target.value})}/><Field label={l.address} value={shop.address} onChange={(e) => setShop({...shop,address:e.target.value})}/><Button>{l.save}</Button></form>:<article className="info-card"><h2>{l.profile}</h2><p><b>{l.name} :</b> {barber?.name}</p><p><b>{l.phone} :</b> {barber?.phone}</p><p><b>{l.code} :</b> {barber?.code}</p></article>}<button className="danger-wide" onClick={logout}>{l.logout}</button></section></> }
export default App
