const barberCustomerLabels = ['Nom du client (facultatif)', 'اسم العميل (اختياري)']

export default function Field({ label, ...props }) {
  if (barberCustomerLabels.includes(label)) return null
  return <label className="field"><span>{label}</span><input {...props} /></label>
}
