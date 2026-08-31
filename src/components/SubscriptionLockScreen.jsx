import Topbar from './Topbar'
import { useI18n } from '../i18n'

export default function SubscriptionLockScreen({
  status = 'pending', // 'pending' | 'expired' | 'blocked'
  isBarber = false,
  shopName = 'Barber DZ',
  salonCode = '',
  phone = '',
  logout,
  supportPhone = '0770000000',
  supportWhatsapp = '213770000000',
}) {
  const { t, locale } = useI18n()
  const ar = locale === 'ar'

  let title = ''
  let message = ''
  let badgeClass = ''
  let badgeText = ''
  let icon = '🔒'

  if (isBarber) {
    icon = '💈'
    badgeClass = 'badge-warning'
    badgeText = ar ? 'الصالون متوقف مؤقتاً' : 'Salon suspendu'
    title = ar ? 'خدمة الصالون متوقفة حالياً' : 'Salon temporairement inactif'
    message = ar
      ? `تم تعليق الوصول لصالون "${shopName}". يرجى التواصل مع مسؤول الصالون لتجديد الاشتراك.`
      : `L'accès au salon "${shopName}" est suspendu. Veuillez contacter le gérant du salon pour réactiver l'abonnement.`
  } else if (status === 'pending') {
    icon = '⏳'
    badgeClass = 'badge-pending'
    badgeText = ar ? 'في انتظار التفعيل' : 'En attente d’activation'
    title = ar ? 'حسابك في انتظار التفعيل' : 'Compte en attente d’activation'
    message = ar
      ? `تم إنشاء حساب صالون "${shopName}" بنجاح! للبدء في الاستخدام والحصول على فترة التجربة أو تفعيل الاشتراك، يرجى التواصل معنا عبر واتساب.`
      : `Le compte du salon "${shopName}" a été créé avec succès ! Pour activer votre accès et démarrer, contactez-nous via WhatsApp.`
  } else if (status === 'blocked') {
    icon = '🚫'
    badgeClass = 'badge-danger'
    badgeText = ar ? 'الحساب معلق' : 'Compte suspendu'
    title = ar ? 'تم تعليق حساب هذا الصالون' : 'Compte suspendu'
    message = ar
      ? `تم تعليق حساب صالون "${shopName}" من قِبل الإدارة. يرجى التواصل مع الدعم الفني للاستفسار.`
      : `Le compte du salon "${shopName}" a été suspendu par l'administration. Veuillez contacter le support pour plus d'informations.`
  } else {
    // expired
    icon = '⚠️'
    badgeClass = 'badge-danger'
    badgeText = ar ? 'انتهت مدة الاشتراك' : 'Abonnement expiré'
    title = ar ? 'انتهت فترة اشتراكك في Barber DZ' : 'Votre abonnement a expiré'
    message = ar
      ? `لقد انتهت فترة الاشتراك لصالون "${shopName}". جدد اشتراكك الآن لمواصلة إدارة الحلاقين، الخدمات والإيرادات اليومية دون انقطاع.`
      : `La période d'abonnement pour le salon "${shopName}" est arrivée à son terme. Renouvelez dès maintenant pour continuer à gérer vos coiffeurs et vos revenus.`
  }

  const whatsappMsg = encodeURIComponent(
    `Bonjour Barber DZ, je souhaite activer/renouveler l'abonnement de mon salon:\n- Nom: ${shopName}\n- Code: ${salonCode}\n- Téléphone: ${phone}`
  )
  const whatsappUrl = `https://wa.me/${supportWhatsapp}?text=${whatsappMsg}`

  return (
    <section className="auth-page lock-page" dir={ar ? 'rtl' : 'ltr'}>
      <Topbar title="Barber DZ" actions={<button className="logout" onClick={logout}>{t('logout') || 'Déconnexion'}</button>} />
      <div className="auth-card lock-card" style={{ maxWidth: '520px', textAlign: 'center', margin: '30px auto' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>{icon}</div>
        <span className={`status-pill ${badgeClass}`} style={{ fontSize: '0.85rem', padding: '6px 14px', borderRadius: '20px', display: 'inline-block', marginBottom: '14px' }}>
          {badgeText}
        </span>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '12px', color: 'var(--text-main, #1e293b)' }}>{title}</h2>
        <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>
          {message}
        </p>

        {salonCode && (
          <div style={{ background: 'var(--bg-card, #f8fafc)', border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '10px', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{ar ? 'رمز صالونك:' : 'Code de votre salon:'}</span>
            <strong style={{ display: 'block', fontSize: '1.1rem', color: '#0f172a', letterSpacing: '1px' }}>{salonCode}</strong>
          </div>
        )}

        {!isBarber && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: '#25D366',
                color: '#fff',
                textDecoration: 'none',
                padding: '12px 20px',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '1rem',
              }}
            >
              <span>💬</span> {ar ? 'تواصل معنا عبر واتساب للتفعيل' : 'Activer via WhatsApp'}
            </a>
            {supportPhone && (
              <a
                href={`tel:${supportPhone}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'var(--bg-card, #f1f5f9)',
                  color: 'var(--text-main, #334155)',
                  textDecoration: 'none',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontWeight: '500',
                  border: '1px solid #cbd5e1',
                }}
              >
                <span>📞</span> {ar ? `اتصل بالدعم: ${supportPhone}` : `Appeler le support: ${supportPhone}`}
              </a>
            )}
          </div>
        )}

        <button type="button" className="text-button" onClick={logout} style={{ marginTop: '10px' }}>
          ← {ar ? 'تسجيل الخروج والعودة' : 'Se déconnecter et revenir à l’accueil'}
        </button>
      </div>
    </section>
  )
}
