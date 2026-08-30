import React from 'react'

export default function Metric({ label, value, color, icon }) {
  return (
    <article className={`metric ${color}`}>
      <div className="metric-icon">{icon}</div>
      <div><p>{label}</p><strong>{value}</strong></div>
    </article>
  )
}
