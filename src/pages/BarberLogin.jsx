import { useState } from 'react'
import Topbar from '../components/Topbar'
import Field from '../components/Field'
import Button from '../components/Button'
import { useI18n } from '../i18n'

export default function BarberLogin({ barbers, onBack, onLogin }) {
  const [phone, setPhone] = useState(''); const [code, setCode] = useState(''); const [error, setError] = useState(''); const { t } = useI18n()
  const submit = (e) => { e.preventDefault(); const barber = barbers.find((b) => b.phone.replace(/\s/g, '') === phone.replace(/\s/g, '') && b.code.toUpperCase() === code.trim().toUpperCase()); if (barber) onLogin(barber); else setError(t('invalidBarber')) }
  return <section className="auth-page"><Topbar title={t('barberLogin')} back={onBack} /><form className="auth-card" onSubmit={submit}><div className="large-icon">✂</div><h2>{t('hello')}</h2><p>{t('barberLoginDescription')}</p><Field label={t('phone')} value={phone} onChange={(e) => setPhone(e.target.value)} required /><Field label={t('barberCode')} placeholder="HF-1001" value={code} onChange={(e) => setCode(e.target.value)} required />{error && <p className="error">{error}</p>}<Button type="submit">{t('enterWorkspace')}</Button></form></section>
}
