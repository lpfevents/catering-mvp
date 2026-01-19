import clsx from 'clsx'

export function Card({
  title,
  children,
  className,
}: {
  title?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={clsx('rounded-2xl border border-slate-200 bg-white p-5 shadow-sm', className)}>
      {title && <h2 className="font-semibold">{title}</h2>}
      <div className={title ? 'mt-3' : ''}>{children}</div>
    </div>
  )
}
