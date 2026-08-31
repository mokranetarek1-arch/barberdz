import { useI18n } from '../i18n'

export function Brand({ name }) { return <div className="brand"><span className="brand-mark">✂</span><span>{name || 'Barber DZ'}</span></div> }

export default function Topbar({ title, back, actions, shopName }) {
  const { t } = useI18n()
  return <header className="topbar">{back ? <button className="icon-button" onClick={back} aria-label={t('back')}>→</button> : <Brand name={shopName} />}<h1>{title}</h1><div className="top-actions">{actions}</div></header>
}
