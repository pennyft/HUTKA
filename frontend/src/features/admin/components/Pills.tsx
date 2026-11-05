import type { ReactNode } from 'react'
import { VERIFICATION_LABEL } from '../logic'
import type { VerificationStatus } from '../types'

/** Небольшая метка статуса: нейтральная или предупреждающая (красная рамка). */
export function Pill({ children, warn = false }: { children: ReactNode; warn?: boolean }) {
  return <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${warn ? 'border-danger/50 text-danger' : 'border-line text-fg'}`}>{children}</span>
}

export const VerificationPill = ({ status }: { status: VerificationStatus }) => <Pill>{VERIFICATION_LABEL[status]}</Pill>
