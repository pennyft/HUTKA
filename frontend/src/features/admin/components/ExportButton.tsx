import { Download } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { useExportCsv } from '../finance/hooks'
import { EXPORT_LIMIT, periodProblem } from '../finance/logic'
import type { ExportKind, Period } from '../finance/types'

/** «Скачать CSV» за выбранный период (AD15). Файл собирается в памяти бэка, у выгрузки есть потолок в 50 000 строк. */
export function ExportButton({ kind, period }: { kind: ExportKind; period: Period }) {
  const exp = useExportCsv(kind, period)
  return (
    <div>
      <Button type="button" variant="outline" loading={exp.isPending} disabled={!!periodProblem(period)} onClick={() => exp.mutate()} className="sm:w-auto">
        <Download className="mr-2 size-4" aria-hidden />
        Скачать CSV
      </Button>
      <p className="mt-1 text-xs text-muted">Не больше {EXPORT_LIMIT.toLocaleString('ru-RU')} строк за раз: если период слишком большой, сузьте его.</p>
    </div>
  )
}
