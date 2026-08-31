import { useState } from 'react'
import Topbar from '../components/Topbar'
import Field from '../components/Field'
import Button from '../components/Button'
import { useI18n } from '../i18n'

export default function AdminLogin({ data, onBack, onLogin, onRegister }) {
  const [phone, setPhone] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const { t } = useI18n()

  const normalizePhone = (value = '') => value.replace(/\s+/g, '').replace(/^\+/, '')

  const submit = async (e) => {
    e.preventDefault()
    const savedPhone = data?.admin?.phone || ''
    const savedPassword = data?.admin?.password || ''

    const isValid = Boolean(savedPhone && savedPassword) &&
      normalizePhone(phone) === normalizePhone(savedPhone) &&
      password === savedPassword

    if (isValid) {
      onLogin(phone, password)
      return
    }

    setError(t('invalidAdmin'))
  }

  return <section className="auth-page"><Topbar title={t('adminLogin')} back={onBack} /><form className="auth-card" onSubmit={submit}><h2>{t('welcomeBack')}</h2><p>{t('loginDescription')}</p><Field label={t('phone')} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required /><Field label={t('password')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />{error && <p className="error">{error}</p>}<Button type="submit">{t('login')}</Button><button type="button" className="text-button" onClick={onRegister}>{t('createAccount')}</button></form></section>
}
