import { useState } from 'react'

const barberCustomerLabels = ['Nom du client (facultatif)', 'اسم العميل (اختياري)']

export default function Field({ label, ...props }) {
  if (barberCustomerLabels.includes(label)) return null

  const isPassword = props.type === 'password'
  const [visible, setVisible] = useState(false)
  const inputType = isPassword && visible ? 'text' : props.type

  if (isPassword) {
    return (
      <label className="field field-password">
        <span>{label}</span>
        <div className="password-input-wrapper">
          <input {...props} type={inputType} />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setVisible(!visible)}
            tabIndex={-1}
            aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            <span className="material-symbols-outlined" aria-hidden="true">{visible ? 'visibility' : 'visibility_off'}</span>
          </button>
        </div>
      </label>
    )
  }

  return <label className="field"><span>{label}</span><input {...props} /></label>
}