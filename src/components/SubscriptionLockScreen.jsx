import { useState } from 'react'
import Topbar from './Topbar'
import { useI18n } from '../i18n'
import { SUBSCRIPTION_PLANS, formatSubscriptionAmount } from '../subscription'

const normalizeWhatsAppNumber = (value = '') => {
  const digits = String(value).replace(/\D/g, '')
  if (digits.startsWith('0')) return `213${digits.slice(1)}`
  if (digits.startsWith('213')) return digits
  return digits
}

export default function SubscriptionLockScreen({
  status = 'pending', // 'pending' | 'expired' | 'blocked'
  isBarber = false,
  shopName = 'Barber DZ',
  salonCode = '',
  phone = '',
  ownerName = '',
  address = '',
  logout,
  contact = {},
  onCreateOrder,
}) {
  const { t, locale } = useI18n()
  const ar = locale === 'ar'
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [submittedOrder, setSubmittedOrder] = useState(null)
  const supportPhone = contact.phone || ''
  const supportWhatsapp = normalizeWhatsAppNumber(contact.whatsapp)

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

  const submitOrder = async (event) => {
    event.preventDefault()
    if (!selectedPlan || !onCreateOrder) return
    const whatsappWindow = paymentMethod === 'ccp' && supportWhatsapp ? window.open('', '_blank') : null
    const created = await onCreateOrder({ planId: selectedPlan.id, paymentMethod })
    if (created) {
      setSubmittedOrder(created)
      setSelectedPlan(null)
      if (whatsappWindow) {
        whatsappWindow.location.href = buildWhatsappUrl(created, supportWhatsapp, shopName, salonCode, phone, ownerName, address)
      }
    } else if (whatsappWindow) {
      whatsappWindow.close()
    }
  }

  const buildWhatsappUrl = (order, whatsappNumber, salon, code, ownerPhone, owner, salonAddress) => `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Bonjour,\n\nJe souhaite confirmer mon abonnement.\n\nSalon : ${salon}\nPropriétaire : ${owner || 'Non renseigné'}\nAdresse : ${salonAddress || 'Non renseignée'}\nCode salon : ${code}\nTéléphone : ${ownerPhone}\nDemande : #${order.id || 'à confirmer'}\nPlan : ${order.label}\nMontant : ${formatSubscriptionAmount(order.amount)}\nMode de paiement : CCP\n\nJe joins ma preuve de paiement.`)}`

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

        {!isBarber && (status === 'expired' || status === 'pending') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <div className="subscription-plans">
              {SUBSCRIPTION_PLANS.map((plan) => <button type="button" className="subscription-plan" key={plan.id} onClick={() => setSelectedPlan(plan)}><strong>{ar ? `${plan.months} شهر` : plan.label}</strong><b>{formatSubscriptionAmount(plan.amount)}</b><span>{ar ? 'اشترك' : 'S’abonner'}</span></button>)}
            </div>
            {submittedOrder && <SubscriptionConfirmation order={submittedOrder} ar={ar} ccp={contact.ccp} supportWhatsapp={supportWhatsapp} shopName={shopName} salonCode={salonCode} phone={phone} ownerName={ownerName} address={address} buildWhatsappUrl={buildWhatsappUrl} />}
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
                {ar ? `اتصل بالدعم: ${supportPhone}` : `Appeler le support: ${supportPhone}`}
              </a>
            )}
          </div>
        )}

        {selectedPlan && <div className="subscription-modal-backdrop"><form className="subscription-modal" onSubmit={submitOrder}><h3>{ar ? 'اختر طريقة الدفع' : 'Choisissez votre mode de paiement'}</h3><p><strong>{selectedPlan.label}</strong> · {formatSubscriptionAmount(selectedPlan.amount)}</p><div className="payment-options"><button type="button" className={paymentMethod === 'cash' ? 'active' : ''} onClick={() => setPaymentMethod('cash')}>{ar ? 'الدفع نقداً' : 'Paiement en espèces'}</button><button type="button" className={paymentMethod === 'ccp' ? 'active' : ''} onClick={() => setPaymentMethod('ccp')}>CCP</button></div>{paymentMethod === 'ccp' && <p>{ar ? `حوّل إلى حساب CCP: ${contact.ccp || 'غير مضبوط'}` : `Effectuez le virement vers le compte CCP : ${contact.ccp || 'non configuré'}`}</p>}<div className="form-actions"><button type="button" className="button secondary" onClick={() => setSelectedPlan(null)}>{ar ? 'إلغاء' : 'Annuler'}</button><button type="submit" className="button">{ar ? 'تأكيد الطلب' : 'Confirmer la demande'}</button></div></form></div>}

        <button type="button" className="text-button" onClick={logout} style={{ marginTop: '10px' }}>
          ← {ar ? 'تسجيل الخروج والعودة' : 'Se déconnecter et revenir à l’accueil'}
        </button>
      </div>
    </section>
  )
}

function SubscriptionConfirmation({ order, ar, ccp, supportWhatsapp, shopName, salonCode, phone, ownerName, address, buildWhatsappUrl }) {
  return <div className="subscription-confirmation">
    <p className="success">{ar ? 'تم إرسال طلب الاشتراك بنجاح.' : 'Demande envoyée avec succès. Notre équipe va vous contacter.'}</p>
    <p><strong>{ar ? 'رقم الطلب' : 'Demande'} :</strong> #{order.id || 'en attente'}</p>
    <p><strong>{ar ? 'الخطة' : 'Plan'} :</strong> {order.label}</p>
    <p><strong>{ar ? 'المبلغ' : 'Montant'} :</strong> {formatSubscriptionAmount(order.amount)}</p>
    <p><strong>{ar ? 'طريقة الدفع' : 'Paiement'} :</strong> {order.paymentMethod === 'ccp' ? 'CCP' : 'Cash'}</p>
    {order.paymentMethod === 'ccp' && <>
      <p><strong>CCP :</strong> {ccp || (ar ? 'غير مضبوط' : 'Non configuré')}</p>
      {supportWhatsapp ? <a className="whatsapp-proof-button" href={buildWhatsappUrl(order, supportWhatsapp, shopName, salonCode, phone, ownerName, address)} target="_blank" rel="noopener noreferrer">{ar ? 'إرسال إثبات الدفع عبر واتساب' : 'Envoyer le reçu via WhatsApp'}</a> : <p className="error">{ar ? 'رقم واتساب غير مضبوط من الإدارة.' : 'Le numéro WhatsApp du Super Admin n’est pas configuré.'}</p>}
    </>}
  </div>
}
