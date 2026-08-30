import { useState } from 'react'
import Topbar from '../components/Topbar'
import Field from '../components/Field'
import Button from '../components/Button'
import { useI18n } from '../i18n'

export default function Register({ onBack, onRegister }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', shopName: '', address: '', password: '' }); const { t } = useI18n(); const update = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  return <section className="auth-page"><Topbar title={t('createTitle')} back={onBack} /><form className="auth-card" onSubmit={(e) => { e.preventDefault(); onRegister({ phone: form.phone, password: form.password }, { name: form.shopName, phone: form.phone, address: form.address }) }}><h2>{t('salonStart')}</h2><div className="field-row"><Field label={t('firstName')} value={form.firstName} onChange={update('firstName')} required /><Field label={t('lastName')} value={form.lastName} onChange={update('lastName')} required /></div><Field label={t('phone')} type="tel" value={form.phone} onChange={update('phone')} required /><Field label={t('salonName')} value={form.shopName} onChange={update('shopName')} required /><Field label={t('address')} value={form.address} onChange={update('address')} required /><Field label={t('passwordHint')} type="password" minLength="6" value={form.password} onChange={update('password')} required /><Button type="submit">{t('createMyAccount')}</Button></form></section>
}
