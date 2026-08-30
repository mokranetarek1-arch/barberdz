import React from 'react'

export default function ActionCard({ icon, title, text, onClick }) {
  return (
    <button className="action-card" onClick={onClick}>
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{text}</small>
      </div>
      <i>←</i>
    </button>
  )
}
