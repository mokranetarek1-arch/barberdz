import { useState } from 'react'
import Topbar from '../components/Topbar'
import Field from '../components/Field'
import Button from '../components/Button'
import { useI18n } from '../i18n'

export default function BarberLogin({ onBack, onLogin, shopName }) {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { t } = useI18n()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const success = await onLogin(phone, code)
      if (!success) {
        setError(t('invalidBarber'))
      }
    } catch {
      setError(t('invalidBarber'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-page">
      <Topbar title={t('barberLogin')} back={onBack} shopName={shopName} />
      <form className="auth-card" onSubmit={submit}>
        <div className="large-icon">✂</div>
        <h2>{t('hello')}</h2>
        <p>{t('barberLoginDescription')}</p>
        <Field
          label={t('phone')}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0555 00 11 22"
          required
        />
        <Field
          label={t('barberCode')}
          placeholder="SL-002-01"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? '...' : t('enterWorkspace')}
        </Button>
      </form>
    </section>
  )
}

