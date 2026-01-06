import React from 'react'
export function SectionTitle(props: { title: string; right?: React.ReactNode; subtitle?: string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'flex-start', marginBottom:10, flexWrap:'wrap' }}>
      <div>
        <div style={{ fontWeight: 900, fontSize: 14 }}>{props.title}</div>
        {props.subtitle ? <div className="small">{props.subtitle}</div> : null}
      </div>
      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>{props.right}</div>
    </div>
  )
}
export function EmptyState(props: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="card pad" style={{ textAlign:'center' }}>
      <div style={{ fontWeight: 900, fontSize: 14 }}>{props.title}</div>
      {props.hint ? <div className="small" style={{ marginTop:6 }}>{props.hint}</div> : null}
      {props.action ? <div style={{ marginTop:12 }}>{props.action}</div> : null}
    </div>
  )
}
