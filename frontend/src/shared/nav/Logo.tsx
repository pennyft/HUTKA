import { Link } from 'react-router'

/** Слово HUTKA как в AuthLayout. tag — маленькая метка кабинета («Партнёр», «Админ»). */
export function Logo({ to, tag }: { to: string; tag?: string }) {
  return (
    <Link to={to} className="flex select-none items-center gap-2" aria-label={tag ? `HUTKA, ${tag}` : 'HUTKA, на главную'}>
      <span className="flex items-center gap-1 text-xl font-extrabold tracking-wider text-fg">
        HUTKA
        <span aria-hidden className="mt-0.5 size-2 rounded-full bg-accent" />
      </span>
      {tag && <span className="rounded border border-line px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">{tag}</span>}
    </Link>
  )
}
