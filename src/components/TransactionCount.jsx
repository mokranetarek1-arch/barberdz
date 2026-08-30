import { useI18n } from '../i18n'

export default function TransactionCount({ count }) {
  const { locale } = useI18n()
  const ar = locale === 'ar'
  return <div className="transaction-count"><span>{ar ? 'إجمالي الخدمات اليوم' : 'Total des prestations aujourd’hui'}</span><strong>{count}</strong><small>{ar ? 'خدمة / تحصيل مسجّل' : 'prestation(s) / encaissement(s) enregistré(s)'}</small></div>
}
