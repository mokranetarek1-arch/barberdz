import React from 'react'

export default function Avatar({ name }) {
  return <span className="avatar">{String(name).slice(0, 2).toUpperCase()}</span>
}
