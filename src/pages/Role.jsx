import { Brand } from '../components/Topbar'
import { useI18n } from '../i18n'

export default function Role({ onChoose }) {
  const { t } = useI18n()
  return <section className="auth-page"><Brand /><div className="welcome"><p className="eyebrow">{t('access')}</p><h1>{t('welcome')}</h1><p>{t('chooseAccess')}</p></div><div className="role-grid"><button className="role-card" onClick={() => onChoose('admin')}><span className="role-icon">♛</span><strong>{t('admin')}</strong><small>{t('adminDescription')}</small><span>{t('accessButton')}</span></button><button className="role-card" onClick={() => onChoose('barber')}><span className="role-icon">✂</span><strong>{t('barber')}</strong><small>{t('barberDescription')}</small><span>{t('accessButton')}</span></button></div><p className="install-hint">{t('install')}</p></section>
}
