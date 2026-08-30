import { useState } from 'react'
import { useI18n } from '../i18n'
import Field from './Field'
import Button from './Button'

export default function AdminCashSale({ onSave }) {
  const { locale } = useI18n()
  const ar = locale === 'ar'
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const submit = (event) => {
    event.preventDefault()
    const value = Number(amount)
    if (!value || value <= 0) return
    onSave({ barberId: 'admin', customer: '', amount: value, note: '', commission: 0 })
    setAmount('')
    setOpen(false)
  }
  return <div className="admin-cash-sale"><button className="cash-trigger" onClick={() => setOpen(true)}>+ {ar ? 'إضافة تحصيل' : 'Ajouter un encaissement'}</button>{open && <div className="cash-backdrop" role="presentation" onClick={() => setOpen(false)}><form className="cash-modal form-card" onSubmit={submit} onClick={(event) => event.stopPropagation()}><div className="cash-modal-head"><div><p className="eyebrow">{ar ? 'إدارة الصالون' : 'GESTION DU SALON'}</p><h2>{ar ? 'تحصيل مباشر' : 'Encaissement direct'}</h2></div><button type="button" className="icon-button" onClick={() => setOpen(false)}>×</button></div><p>{ar ? 'لن تُحسب أي عمولة على هذا المبلغ.' : 'Aucune commission ne sera calculée sur ce montant.'}</p><Field label={ar ? 'المبلغ المقبوض (دج)' : 'Montant encaissé (DA)'} type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} required /><Button type="submit">{ar ? 'تسجيل التحصيل' : 'Enregistrer l’encaissement'}</Button></form></div>}</div>
}
