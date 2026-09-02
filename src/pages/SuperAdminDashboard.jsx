import { useState, useEffect, useMemo } from 'react'
import Topbar from '../components/Topbar'
import supabase from '../supabaseClient'
import { useI18n } from '../i18n'
import { SUBSCRIPTION_PLANS, addMonths, formatSubscriptionAmount } from '../subscription'

export default function SuperAdminDashboard({ session, logout, onEnterSalon, activeView = 'overview', onViewChange }) {
  const { t, locale } = useI18n()
  const ar = locale === 'ar'

  const [salons, setSalons] = useState([])
  const [allBarbers, setAllBarbers] = useState([])
  const [allTransactions, setAllTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'pending' | 'active' | 'expired' | 'blocked'
  const [customDaysModal, setCustomDaysModal] = useState(null) // { salonId, shopName }
  const [customDaysInput, setCustomDaysInput] = useState('30')
  const [actionToast, setActionToast] = useState('')
  const [subscriptionOrders, setSubscriptionOrders] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [contact, setContact] = useState({ whatsapp: '', phone: '', ccp: '', countdown: true, expiryNotifications: true })
  const [now, setNow] = useState(Date.now())
  const [orderFilter, setOrderFilter] = useState('all')
  const [orderDateFrom, setOrderDateFrom] = useState('')
  const [orderDateTo, setOrderDateTo] = useState('')
  const [salonDateFrom, setSalonDateFrom] = useState('')
  const [salonDateTo, setSalonDateTo] = useState('')

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const showToast = (msg) => {
    setActionToast(msg)
    setTimeout(() => setActionToast(''), 3000)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [profilesRes, barbersRes, txnsRes, ordersRes, subscriptionsRes, contactRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('barbers').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('subscription_orders').select('*').order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
        supabase.from('platform_settings').select('value').eq('key', 'contact').maybeSingle(),
      ])

      const list = Array.isArray(profilesRes.data)
        ? profilesRes.data.filter((p) => !p.is_super_admin)
        : []
      setSalons(list)
      setAllBarbers(Array.isArray(barbersRes.data) ? barbersRes.data : [])
      setAllTransactions(Array.isArray(txnsRes.data) ? txnsRes.data : [])
      setSubscriptionOrders(Array.isArray(ordersRes.data) ? ordersRes.data : [])
      setSubscriptions(Array.isArray(subscriptionsRes.data) ? subscriptionsRes.data : [])
      setContact((current) => ({ ...current, ...(contactRes.data?.value || {}) }))
    } catch (err) {
      console.error('[SuperAdmin] Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const [customUnit, setCustomUnit] = useState('days') // 'minutes' | 'hours' | 'days'

  // Calculate status for each salon
  const getSalonStatus = (salon) => {
    if (salon.subscription_status === 'blocked') {
      return { key: 'blocked', label: ar ? 'معلق / محظور' : 'Bloqué', class: 'badge-danger', daysLeft: 0 }
    }
    if (!salon.subscription_end || salon.subscription_status === 'pending') {
      return { key: 'pending', label: ar ? 'في انتظار التفعيل' : 'En attente', class: 'badge-pending', daysLeft: 0 }
    }

    const end = new Date(salon.subscription_end).getTime()
    const diffMs = end - now

    if (diffMs <= 0) {
      const pastDays = Math.max(1, Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24)))
      return {
        key: 'expired',
        label: ar ? `منتهي (منذ ${pastDays} يوم)` : `Expiré (depuis ${pastDays}j)`,
        class: 'badge-danger',
        daysLeft: -pastDays,
      }
    }

    let label = ''
    let badgeClass = 'badge-success'

    const diffMins = Math.ceil(diffMs / (1000 * 60))
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffMs < 60 * 60 * 1000) {
      label = ar ? `نشط (${diffMins} دقيقة متبقية)` : `Actif (${diffMins} min restantes)`
      badgeClass = 'badge-warning'
    } else if (diffMs < 24 * 60 * 60 * 1000) {
      label = ar ? `نشط (${diffHours} ساعة متبقية)` : `Actif (${diffHours}h restantes)`
      badgeClass = 'badge-warning'
    } else {
      label = ar ? `نشط (متبقي ${diffDays} يوم)` : `Actif (${diffDays}j restants)`
      badgeClass = diffDays <= 3 ? 'badge-warning' : 'badge-success'
    }

    return {
      key: 'active',
      label,
      class: badgeClass,
      daysLeft: diffDays,
    }
  }

  const countdown = (endDate) => {
    const remaining = new Date(endDate).getTime() - now
    if (!Number.isFinite(remaining) || remaining <= 0) return ar ? 'منتهي' : 'Expiré'
    const totalSeconds = Math.floor(remaining / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, '0')
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
    const seconds = String(totalSeconds % 60).padStart(2, '0')
    return `${days}j ${hours}:${minutes}:${seconds}`
  }

  // Extend or activate subscription (supports minutes, hours, days)
  const setSubscription = async (salonId, amount, unit = 'days', forceFromNow = true) => {
    try {
      const salon = salons.find((s) => s.id === salonId)
      if (!salon) return

      let baseTime = Date.now()
      if (!forceFromNow && salon.subscription_end && new Date(salon.subscription_end).getTime() > Date.now()) {
        baseTime = new Date(salon.subscription_end).getTime()
      }

      let multiplier = 24 * 60 * 60 * 1000
      let unitLabel = ar ? 'يوم' : 'jours'

      if (unit === 'minutes') {
        multiplier = 60 * 1000
        unitLabel = ar ? 'دقيقة' : 'minutes'
      } else if (unit === 'hours') {
        multiplier = 60 * 60 * 1000
        unitLabel = ar ? 'ساعة' : 'heures'
      }

      const newEnd = new Date(baseTime + amount * multiplier).toISOString()

      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'active',
          subscription_end: newEnd,
        })
        .eq('id', salonId)

      if (error) throw error
      const { error: subscriptionError } = await supabase.from('subscriptions').insert({
        salon_id: salonId,
        plan: unit === 'days' && amount >= 365 ? 'year' : unit === 'days' && amount >= 30 ? 'month' : 'custom',
        status: 'active',
        start_date: new Date(baseTime).toISOString(),
        end_date: newEnd,
        activated_at: new Date().toISOString(),
        activated_by: session?.adminId || null,
      })
      if (subscriptionError && subscriptionError.code !== '23505') throw subscriptionError

      showToast(ar ? `تم تفعيل +${amount} ${unitLabel} بنجاح.` : `+${amount} ${unitLabel} activé(e)s avec succès.`)
      setCustomDaysModal(null)
      loadData()
    } catch (err) {
      console.error('[SuperAdmin] setSubscription error:', err)
      showToast(ar ? 'حدث خطأ أثناء التحديث.' : 'Erreur lors de la mise à jour.')
    }
  }

  // Block / Unblock salon
  const toggleBlock = async (salon) => {
    const isCurrentlyBlocked = salon.subscription_status === 'blocked'
    const newStatus = isCurrentlyBlocked ? 'active' : 'blocked'

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_status: newStatus })
        .eq('id', salon.id)

      if (error) throw error

      showToast(
        isCurrentlyBlocked
          ? (ar ? 'تم إلغاء حظر الصالون.' : 'Salon débloqué.')
          : (ar ? 'تم حظر الصalون.' : 'Salon bloqué.')
      )
      loadData()
    } catch (err) {
      console.error('[SuperAdmin] toggleBlock error:', err)
    }
  }

  const updateOrder = async (order, status) => {
    try {
      const validatedAt = new Date().toISOString()
      if (status === 'confirmed') {
        const plan = SUBSCRIPTION_PLANS.find((item) => item.id === order.plan)
        if (!plan) throw new Error('Unknown subscription plan')
        const startDate = new Date()
        const endDate = addMonths(startDate, plan.months)
        const { data: existingSubscription, error: lookupError } = await supabase.from('subscriptions').select('id').eq('order_id', order.id).maybeSingle()
        if (lookupError) throw lookupError
        const { error: subscriptionError } = existingSubscription
          ? await supabase.from('subscriptions').update({ plan: plan.id, status: 'active', start_date: startDate.toISOString(), end_date: endDate.toISOString(), activated_at: validatedAt, activated_by: session?.adminId || null }).eq('id', existingSubscription.id)
          : await supabase.from('subscriptions').insert({ salon_id: order.salon_id, order_id: order.id, plan: plan.id, status: 'active', start_date: startDate.toISOString(), end_date: endDate.toISOString(), activated_at: validatedAt, activated_by: session?.adminId || null })
        if (subscriptionError) throw subscriptionError
        const { error: profileError } = await supabase.from('profiles').update({ subscription_status: 'active', subscription_end: endDate.toISOString() }).eq('id', order.salon_id)
        if (profileError) throw profileError
      }
      const { error } = await supabase.from('subscription_orders').update({ status, validated_at: validatedAt, validated_by: session?.adminId || null }).eq('id', order.id)
      if (error) throw error
      showToast(ar ? 'تم تحديث طلب الاشتراك.' : 'Demande d’abonnement mise à jour.')
      loadData()
    } catch (err) {
      console.error('[SuperAdmin] subscription order error:', err)
      const details = err.code === '42P01'
        ? (ar ? 'جدول الاشتراكات غير موجود. نفذ ملف SQL.' : 'La table des abonnements est absente. Exécutez le fichier SQL.')
        : err.code === '42501'
          ? (ar ? 'ليس لديك صلاحية التأكيد. أعد تنفيذ سياسات RLS.' : 'Permission refusée. Réexécutez les politiques RLS des abonnements.')
          : err.code === '23503'
            ? (ar ? 'المدير أو الصالون غير موجود في profiles.' : 'Le Super Admin ou le salon n’existe pas dans profiles.')
          : err.message
      showToast(details || (ar ? 'تعذر تحديث الطلب.' : 'Impossible de mettre à jour la demande.'))
    }
  }

  const saveContact = async (event) => {
    event.preventDefault()
    const { data: savedContact, error } = await supabase.from('platform_settings').upsert([{
      key: 'contact',
      value: contact,
      updated_at: new Date().toISOString(),
    }], { onConflict: 'key' }).select('value').single()
    if (error) {
      console.error('[SuperAdmin] save contact error:', error)
      const details = error.code === '42P01'
        ? (ar ? 'جدول إعدادات الاتصال غير موجود. نفذ ملف SQL.' : 'La table des paramètres est absente. Exécutez le fichier SQL.')
        : error.code === '42501'
          ? (ar ? 'ليس لديك صلاحية الحفظ. أعد تنفيذ سياسات RLS.' : 'Permission refusée. Réexécutez les politiques RLS.')
          : error.message
      showToast(details || (ar ? 'تعذر حفظ الإعدادات.' : 'Impossible d’enregistrer les paramètres.'))
      return
    }
    setContact((current) => ({ ...current, ...(savedContact?.value || {}) }))
    showToast(ar ? 'تم حفظ إعدادات الاتصال.' : 'Paramètres de contact enregistrés.')
  }

  // Delete salon and its data
  const deleteSalon = async (salon) => {
    const confirmMsg = ar
      ? `هل أنت متأكد من حذف صالون "${salon.shop_name}"؟ سيتم مسح الحلاقين والمعاملات التابعة له نهائياً.`
      : `Voulez-vous supprimer définitivement le salon "${salon.shop_name}" et toutes ses données (coiffeurs, transactions) ?`

    if (!window.confirm(confirmMsg)) return

    try {
      await supabase.from('transactions').delete().eq('admin_id', salon.id)
      await supabase.from('barbers').delete().eq('admin_id', salon.id)
      await supabase.from('profiles').delete().eq('id', salon.id)

      showToast(ar ? 'تم حذف الصالون بنجاح.' : 'Salon supprimé avec succès.')
      loadData()
    } catch (err) {
      console.error('[SuperAdmin] deleteSalon error:', err)
    }
  }

  // Platform Metrics
  const stats = useMemo(() => {
    let pendingCount = 0
    let activeCount = 0
    let expiredCount = 0
    let blockedCount = 0

    salons.forEach((s) => {
      const st = getSalonStatus(s)
      if (st.key === 'pending') pendingCount++
      else if (st.key === 'active') activeCount++
      else if (st.key === 'expired') expiredCount++
      else if (st.key === 'blocked') blockedCount++
    })

    const totalRevenue = allTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

    return {
      totalSalons: salons.length,
      pendingCount,
      activeCount,
      expiredCount,
      blockedCount,
      totalBarbers: allBarbers.length,
      totalTransactions: allTransactions.length,
      totalRevenue,
    }
  }, [salons, allBarbers, allTransactions])

  // Filtered Salons
  const filteredSalons = useMemo(() => {
    return salons.filter((s) => {
      const st = getSalonStatus(s)
      if (filter !== 'all' && st.key !== filter) return false
      if (salonDateFrom && new Date(s.created_at).getTime() < new Date(`${salonDateFrom}T00:00:00`).getTime()) return false
      if (salonDateTo && new Date(s.created_at).getTime() > new Date(`${salonDateTo}T23:59:59.999`).getTime()) return false

      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const name = (s.shop_name || '').toLowerCase()
        const owner = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase()
        const phone = (s.phone || '').toLowerCase()
        const code = (s.salon_code || '').toLowerCase()
        const address = (s.shop_address || '').toLowerCase()
        return name.includes(q) || owner.includes(q) || phone.includes(q) || code.includes(q) || address.includes(q)
      }
      return true
    })
  }, [salons, filter, search, salonDateFrom, salonDateTo, now])

  const filteredOrders = useMemo(() => subscriptionOrders.filter((order) => {
    if (orderFilter !== 'all' && order.status !== orderFilter) return false
    if (orderDateFrom && new Date(order.created_at).getTime() < new Date(`${orderDateFrom}T00:00:00`).getTime()) return false
    if (orderDateTo && new Date(order.created_at).getTime() > new Date(`${orderDateTo}T23:59:59.999`).getTime()) return false
    return true
  }), [subscriptionOrders, orderFilter, orderDateFrom, orderDateTo])

  return (
    <div className="superadmin-wrapper" dir={ar ? 'rtl' : 'ltr'}>
      <Topbar
        title={ar ? '👑 لوحة الإدارة العامة - Barber DZ' : '👑 Super Admin - Barber DZ'}
        actions={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="icon-button" onClick={loadData} title={ar ? 'تحديث البيانات' : 'Rafraîchir'}>
              🔄
            </button>
            <button className="logout" onClick={logout}>
              {t('logout') || 'Déconnexion'}
            </button>
          </div>
        }
      />

      <div className="superadmin-content" style={{ padding: '24px', maxWidth: '1300px', margin: '0 auto' }}>
        <nav className="superadmin-tabs" aria-label={ar ? 'أقسام الإدارة' : 'Sections administrateur'}>
          {[['overview', ar ? 'نظرة عامة' : 'Vue d’ensemble'], ['requests', ar ? 'الطلبات' : 'Demandes'], ['salons', ar ? 'الصالونات' : 'Salons'], ['settings', ar ? 'الإعدادات' : 'Paramètres']].map(([view, label]) => <button type="button" className={activeView === view ? 'active' : ''} key={view} onClick={() => onViewChange?.(view)}>{label}</button>)}
        </nav>

        {/* Global Platform KPIs */}
        {activeView === 'overview' && <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', color: 'var(--text-main)' }}>
            {ar ? '📊 إحصائيات المنصة الشاملة' : '📊 Statistiques Globales de la Plateforme'}
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            <div className="card-stat">
              <span className="stat-label">{ar ? '🏢 إجمالي الصالونات' : '🏢 Total Salons'}</span>
              <strong className="stat-value">{stats.totalSalons}</strong>
              <small style={{ color: '#64748b' }}>{ar ? 'صالون مسجل' : 'salons inscrits'}</small>
            </div>

            <div className="card-stat" style={{ borderLeft: '4px solid #10b981' }}>
              <span className="stat-label">{ar ? '🟢 صالونات نشطة' : '🟢 Salons Actifs'}</span>
              <strong className="stat-value" style={{ color: '#10b981' }}>{stats.activeCount}</strong>
              <small style={{ color: '#10b981' }}>{ar ? 'اشتراك ساري' : 'abonnements valides'}</small>
            </div>

            <div className="card-stat" style={{ borderLeft: '4px solid #f59e0b' }}>
              <span className="stat-label">{ar ? '⏳ في انتظار التفعيل' : '⏳ En Attente'}</span>
              <strong className="stat-value" style={{ color: '#f59e0b' }}>{stats.pendingCount}</strong>
              <small style={{ color: '#f59e0b' }}>{ar ? 'جدد بحاجة للموافقة' : 'nouveaux comptes'}</small>
            </div>

            <div className="card-stat" style={{ borderLeft: '4px solid #ef4444' }}>
              <span className="stat-label">{ar ? '🔴 منتهية / محظورة' : '🔴 Expirés / Bloqués'}</span>
              <strong className="stat-value" style={{ color: '#ef4444' }}>{stats.expiredCount + stats.blockedCount}</strong>
              <small style={{ color: '#ef4444' }}>{stats.expiredCount} {ar ? 'منتهي' : 'expirés'}, {stats.blockedCount} {ar ? 'محظور' : 'bloqués'}</small>
            </div>

            <div className="card-stat" style={{ borderLeft: '4px solid #6366f1' }}>
              <span className="stat-label">{ar ? '✂️ إجمالي الحلاقين' : '✂️ Total Coiffeurs'}</span>
              <strong className="stat-value" style={{ color: '#6366f1' }}>{stats.totalBarbers}</strong>
              <small style={{ color: '#64748b' }}>{ar ? 'عبر كل الصالونات' : 'dans tous les salons'}</small>
            </div>

            <div className="card-stat" style={{ borderLeft: '4px solid #06b6d4' }}>
              <span className="stat-label">{ar ? '📑 إجمالي المعاملات' : '📑 Total Prestations'}</span>
              <strong className="stat-value" style={{ color: '#06b6d4' }}>{stats.totalTransactions}</strong>
              <small style={{ color: '#64748b' }}>{stats.totalRevenue.toLocaleString()} DZD {ar ? 'حجم الأعمال' : 'volume'}</small>
            </div>
          </div>
        </div>}

        {/* Filter and Search Bar */}
        {(activeView === 'overview' || activeView === 'salons') && <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            background: 'var(--bg-card)',
            padding: '16px 20px',
            borderRadius: '14px',
            border: '1px solid var(--border-color, #e2e8f0)',
            marginBottom: '20px',
          }}
        >
          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              {ar ? 'الكل' : 'Tous'} ({salons.length})
            </button>
            <button
              type="button"
              className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
              onClick={() => setFilter('pending')}
            >
              ⏳ {ar ? 'في الانتظار' : 'En attente'} ({stats.pendingCount})
            </button>
            <button
              type="button"
              className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
              onClick={() => setFilter('active')}
            >
              🟢 {ar ? 'النشطة' : 'Actifs'} ({stats.activeCount})
            </button>
            <button
              type="button"
              className={`filter-btn ${filter === 'expired' ? 'active' : ''}`}
              onClick={() => setFilter('expired')}
            >
              🔴 {ar ? 'المنتهية' : 'Expirés'} ({stats.expiredCount})
            </button>
            <button
              type="button"
              className={`filter-btn ${filter === 'blocked' ? 'active' : ''}`}
              onClick={() => setFilter('blocked')}
            >
              🚫 {ar ? 'المحظورة' : 'Bloqués'} ({stats.blockedCount})
            </button>
          </div>

          {/* Search Box */}
          <div style={{ minWidth: '260px', flex: '1', maxWidth: '400px' }}>
            <input
              type="search"
              placeholder={ar ? '🔍 ابحث بالاسم، الهاتف، الرمز...' : '🔍 Rechercher salon, téléphone, code...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #cbd5e1)',
                background: 'var(--bg-input, #fff)',
                color: 'var(--text-main)',
              }}
            />
          </div>
          {activeView === 'salons' && <div className="superadmin-date-filters"><label>{ar ? 'من' : 'Du'}<input type="date" value={salonDateFrom} onChange={(event) => setSalonDateFrom(event.target.value)} /></label><label>{ar ? 'إلى' : 'Au'}<input type="date" value={salonDateTo} onChange={(event) => setSalonDateTo(event.target.value)} /></label></div>}
        </div>}

        {activeView === 'settings' && <form className="platform-contact-panel" onSubmit={saveContact}>
          <h2>{ar ? 'إعدادات الاتصال' : 'Paramètres de contact'}</h2>
          <div className="platform-contact-grid">
            <label>{ar ? 'واتساب' : 'WhatsApp'}<input value={contact.whatsapp} onChange={(event) => setContact({ ...contact, whatsapp: event.target.value })} placeholder="213..." /></label>
            <label>{ar ? 'الهاتف' : 'Téléphone'}<input value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} /></label>
            <label>CCP<input value={contact.ccp} onChange={(event) => setContact({ ...contact, ccp: event.target.value })} /></label>
          </div>
          <label className="platform-checkbox"><input type="checkbox" checked={contact.countdown} onChange={(event) => setContact({ ...contact, countdown: event.target.checked })} /> {ar ? 'عرض العد التنازلي' : 'Afficher le compte à rebours'}</label>
          <label className="platform-checkbox"><input type="checkbox" checked={contact.expiryNotifications} onChange={(event) => setContact({ ...contact, expiryNotifications: event.target.checked })} /> {ar ? 'تفعيل تنبيهات الانتهاء' : 'Activer les alertes d’expiration'}</label>
          <button type="submit" className="button contact-save-button">{ar ? 'حفظ' : 'Enregistrer'}</button>
        </form>}

        {activeView === 'requests' && <section className="subscription-orders-panel">
          <h2>{ar ? 'طلبات الاشتراك' : 'Demandes d’abonnement'}</h2>
          <div className="superadmin-filter-row"><select value={orderFilter} onChange={(event) => setOrderFilter(event.target.value)}><option value="all">{ar ? 'كل الحالات' : 'Tous les statuts'}</option><option value="pending">pending</option><option value="verification">verification</option><option value="confirmed">confirmed</option><option value="rejected">rejected</option><option value="cancelled">cancelled</option></select><input type="date" value={orderDateFrom} onChange={(event) => setOrderDateFrom(event.target.value)} /><input type="date" value={orderDateTo} onChange={(event) => setOrderDateTo(event.target.value)} /></div>
          {filteredOrders.length === 0 ? <p>{ar ? 'لا توجد طلبات.' : 'Aucune demande.'}</p> : filteredOrders.map((order) => {
            const salon = salons.find((item) => item.id === order.salon_id)
            const plan = SUBSCRIPTION_PLANS.find((item) => item.id === order.plan)
            return <article className="subscription-order-row" key={order.id}><div><strong>{salon?.shop_name || order.salon_id}</strong><small>{plan?.label || order.duration} · {formatSubscriptionAmount(order.amount)} · {order.payment_method === 'ccp' ? 'CCP' : 'Cash'}</small><small>{new Date(order.created_at).toLocaleString(ar ? 'ar-DZ' : 'fr-DZ')}</small></div><span className={`status-pill ${order.status === 'confirmed' ? 'badge-success' : order.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>{order.status}</span>{order.status === 'pending' || order.status === 'verification' ? <div className="subscription-order-actions"><button type="button" onClick={() => updateOrder(order, 'confirmed')}>{ar ? 'تأكيد الدفع' : 'Confirmer le paiement'}</button><button type="button" onClick={() => updateOrder(order, 'rejected')}>{ar ? 'رفض' : 'Rejeter'}</button></div> : null}</article>
          })}
        </section>}

        {/* Salons List */}
        {activeView === 'salons' && (loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            <span style={{ fontSize: '2rem' }}>🔄</span>
            <p>{ar ? 'جاري تحميل الصالونات...' : 'Chargement des salons...'}</p>
          </div>
        ) : filteredSalons.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
            <span style={{ fontSize: '2.5rem' }}>💈</span>
            <h3 style={{ marginTop: '10px', color: 'var(--text-main)' }}>{ar ? 'لا يوجد صالونات تطابق البحث' : 'Aucun salon trouvé'}</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{ar ? 'جرب تغيير خيارات الفلترة أو البحث.' : 'Essayez de modifier votre recherche ou filtre.'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredSalons.map((salon) => {
              const statusInfo = getSalonStatus(salon)
              const subscription = subscriptions.find((item) => item.salon_id === salon.id && item.status === 'active') || subscriptions.find((item) => item.salon_id === salon.id)
              const salonBarbers = allBarbers.filter((b) => b.admin_id === salon.id)
              const salonTxns = allTransactions.filter((t) => t.admin_id === salon.id)
              const salonRevenue = salonTxns.reduce((s, t) => s + (Number(t.amount) || 0), 0)
              const dateCreated = salon.created_at ? new Date(salon.created_at).toLocaleDateString() : '-'

              return (
                <div
                  key={salon.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '14px',
                    padding: '18px 22px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  {/* Salon Information */}
                  <div style={{ minWidth: '280px', flex: '1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '1.15rem', color: 'var(--text-main)' }}>
                        {salon.shop_name || 'Sans Nom'}
                      </strong>
                      <span className={`status-pill ${statusInfo.class}`} style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: '12px' }}>
                        {statusInfo.label}
                      </span>
                      <span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', color: '#475569', fontWeight: 'bold' }}>
                        {salon.salon_code || 'SL-???'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.88rem', color: 'var(--text-muted, #64748b)', display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '4px' }}>
                      <span>👤 {salon.first_name || ''} {salon.last_name || ''}</span>
                      <span>📞 <a href={`tel:${salon.phone}`} style={{ color: 'inherit' }}>{salon.phone || '-'}</a></span>
                      <span>📍 {salon.shop_address || '-'}</span>
                      <span>📅 {ar ? 'مسجل في:' : 'Inscrit le:'} {dateCreated}</span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '8px', display: 'flex', gap: '16px' }}>
                      <span>✂️ <strong>{salonBarbers.length}</strong> {ar ? 'حلاقين' : 'coiffeurs'}</span>
                      <span>📑 <strong>{salonTxns.length}</strong> {ar ? 'معاملات' : 'prestations'}</span>
                      <span>💰 <strong>{salonRevenue.toLocaleString()} DZD</strong></span>
                    </div>
                    <div className="subscription-dates"><span>{ar ? 'البداية' : 'Début'} : {subscription?.start_date ? new Date(subscription.start_date).toLocaleString() : '-'}</span><span>{ar ? 'النهاية' : 'Fin'} : {subscription?.end_date || salon.subscription_end ? new Date(subscription?.end_date || salon.subscription_end).toLocaleString() : '-'}</span>{statusInfo.key === 'active' && <strong>{ar ? 'المتبقي' : 'Restant'} : {countdown(subscription?.end_date || salon.subscription_end)}</strong>}</div>
                  </div>

                  {/* Subscription Controls & Action Buttons */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    {/* If account is pending, show prominent Validation Button that activates 14 days trial in 1 click */}
                    {statusInfo.key === 'pending' && (
                      <button
                        type="button"
                        onClick={() => setSubscription(salon.id, 14, 'days')}
                        title={ar ? 'الموافقة على الحساب وتفعيل 14 يوم تجربة مجانية' : 'Valider le compte et activer 14 jours d’essai'}
                        style={{
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#fff',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontWeight: '800',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(16,185,129,0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        ✅ {ar ? 'الموافقة وتفعيل الحساب' : 'Valider le Compte'}
                      </button>
                    )}

                    {/* +14 Days Trial */}
                    <button
                      type="button"
                      onClick={() => setSubscription(salon.id, 14, 'days', false)}
                      title={ar ? 'إضافة 14 يوم تجربة' : 'Ajouter 14 jours (+14j)'}
                      style={{
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(16,185,129,0.2)',
                      }}
                    >
                      ⚡ +14j
                    </button>

                    {/* +30 Days Monthly */}
                    <button
                      type="button"
                      onClick={() => setSubscription(salon.id, 30, 'days', false)}
                      title={ar ? 'تجديد شهر (+30 يوم)' : 'Renouveler 1 mois (+30j)'}
                      style={{
                        background: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(59,130,246,0.2)',
                      }}
                    >
                      📅 +1 {ar ? 'شهر' : 'Mois'}
                    </button>

                    {/* +365 Days Yearly */}
                    <button
                      type="button"
                      onClick={() => setSubscription(salon.id, 365, 'days', false)}
                      title={ar ? 'اشتراك سنوي (+1 سنة)' : 'Abonnement 1 an (+365j)'}
                      style={{
                        background: '#8b5cf6',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(139,92,246,0.2)',
                      }}
                    >
                      🗓️ +1 {ar ? 'سنة' : 'An'}
                    </button>

                    {/* Custom Duration Modal Trigger */}
                    <button
                      type="button"
                      onClick={() => {
                        setCustomDaysModal(salon)
                        setCustomDaysInput('2')
                        setCustomUnit('minutes')
                      }}
                      title={ar ? 'تحديد مدة مخصصة (دقائق / ساعات / أيام)' : 'Durée personnalisée (min / h / jours)'}
                      style={{
                        background: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      ⏱️ {ar ? 'مخصص (دقيقة/ساعة/يوم)...' : 'Personnalisé (min/h/j)...'}
                    </button>

                    {/* Block / Unblock */}
                    <button
                      type="button"
                      onClick={() => toggleBlock(salon)}
                      title={statusInfo.key === 'blocked' ? (ar ? 'إلغاء الحظر' : 'Débloquer') : (ar ? 'حظر الصالون' : 'Bloquer le salon')}
                      style={{
                        background: statusInfo.key === 'blocked' ? '#10b981' : '#fee2e2',
                        color: statusInfo.key === 'blocked' ? '#fff' : '#b91c1c',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      {statusInfo.key === 'blocked' ? (ar ? '🔓 إلغاء الحظر' : '🔓 Débloquer') : (ar ? '🚫 حظر' : '🚫 Bloquer')}
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => deleteSalon(salon)}
                      title={ar ? 'حذف الصالون نهائياً' : 'Supprimer le salon'}
                      style={{
                        background: 'transparent',
                        color: '#94a3b8',
                        border: '1px solid #e2e8f0',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {/* Custom Duration Modal (Minutes / Hours / Days + Quick Test Presets) */}
        {customDaysModal && (
          <div
            style={{
              position: 'fixed',
              inset: '0',
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px',
              backdropFilter: 'blur(3px)',
            }}
          >
            <div
              style={{
                background: 'var(--bg-card, #fff)',
                borderRadius: '16px',
                padding: '26px',
                maxWidth: '480px',
                width: '100%',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-main)' }}>
                  ⏱️ {ar ? 'مدة اشتراك مخصصة (للاختبار والتحكم)' : 'Durée d’Abonnement Personnalisée'}
                </h3>
                <button
                  onClick={() => setCustomDaysModal(null)}
                  style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
                >
                  ✕
                </button>
              </div>

              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '18px' }}>
                {ar ? `الصالون: ` : `Salon cible : `}
                <strong style={{ color: '#0b7a5b' }}>{customDaysModal.shop_name}</strong>
              </p>

              {/* Unit Selector (Minutes / Heures / Jours) */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '8px', color: '#334155' }}>
                  {ar ? 'اختر الوحدة الزمنية:' : 'Unité de temps :'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setCustomUnit('minutes')}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: customUnit === 'minutes' ? '2px solid #0b7a5b' : '1px solid #cbd5e1',
                      background: customUnit === 'minutes' ? '#e7f5ef' : '#fff',
                      color: customUnit === 'minutes' ? '#075a43' : '#475569',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    ⏱️ {ar ? 'دقائق (Minutes)' : 'Minutes'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomUnit('hours')}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: customUnit === 'hours' ? '2px solid #0b7a5b' : '1px solid #cbd5e1',
                      background: customUnit === 'hours' ? '#e7f5ef' : '#fff',
                      color: customUnit === 'hours' ? '#075a43' : '#475569',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    🕒 {ar ? 'ساعات (Heures)' : 'Heures'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomUnit('days')}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: customUnit === 'days' ? '2px solid #0b7a5b' : '1px solid #cbd5e1',
                      background: customUnit === 'days' ? '#e7f5ef' : '#fff',
                      color: customUnit === 'days' ? '#075a43' : '#475569',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    📅 {ar ? 'أيام (Jours)' : 'Jours'}
                  </button>
                </div>
              </div>

              {/* Quick Test Presets */}
              <div style={{ marginBottom: '18px', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '8px' }}>
                  ⚡ {ar ? 'أزرار اختبار وتفعيل سريعة:' : 'Raccourcis de test rapide :'}
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => { setCustomUnit('minutes'); setCustomDaysInput('2'); }}
                    style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    ⚡ 2 min (Test)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomUnit('minutes'); setCustomDaysInput('5'); }}
                    style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    ⚡ 5 min (Test)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomUnit('hours'); setCustomDaysInput('1'); }}
                    style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    🕒 1 heure
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomUnit('days'); setCustomDaysInput('7'); }}
                    style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    📅 7 jours
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomUnit('days'); setCustomDaysInput('14'); }}
                    style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    📅 14 jours
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomUnit('days'); setCustomDaysInput('30'); }}
                    style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    📅 30 jours
                  </button>
                </div>
              </div>

              {/* Input Value */}
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '700', marginBottom: '6px', color: '#1e293b' }}>
                {ar ? `القيمة بالـ (${customUnit === 'minutes' ? 'دقائق' : customUnit === 'hours' ? 'ساعات' : 'أيام'}):` : `Valeur en (${customUnit}) :`}
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                value={customDaysInput}
                onChange={(e) => setCustomDaysInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '1.15rem',
                  fontWeight: '700',
                  marginBottom: '20px',
                  boxSizing: 'border-box',
                }}
              />

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setCustomDaysModal(null)}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  {ar ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const val = parseFloat(customDaysInput)
                    if (val > 0) {
                      setSubscription(customDaysModal.id, val, customUnit, true)
                    }
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #0b7a5b, #075a43)',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(11,122,91,0.25)',
                  }}
                >
                  ✓ {ar ? 'تأكيد التفعيل' : 'Confirmer l’activation'}
                </button>
              </div>
            </div>
          </div>
        )}

        {actionToast && (
          <div className="toast" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 10000 }}>
            ✓ {actionToast}
          </div>
        )}
      </div>
    </div>
  )
}
