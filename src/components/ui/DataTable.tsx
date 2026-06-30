import React from "react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/Card"

export interface ColumnDef<T> {
  header: string
  accessorKey?: keyof T | string
  accessorFn?: (row: T) => any
  cell?: (row: T) => React.ReactNode
  className?: string
  headerClassName?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  className?: string
  tableClassName?: string
  emptyState?: React.ReactNode
}

export function DataTable<T>({
  data,
  columns,
  className,
  tableClassName,
  emptyState,
}: DataTableProps<T>) {
  return (
    <Card className={cn("bg-[var(--fd-surface)] border border-[var(--fd-border)] rounded-[var(--fd-r)] shadow-[var(--fd-shadow-sm)] overflow-hidden", className)}>
      <div className="overflow-x-auto w-full">
        <table className={cn("w-full text-left border-collapse", tableClassName)}>
          <thead>
            <tr className="border-b border-[var(--fd-border)] bg-[var(--fd-surface2)]/30 text-[10px] sm:text-[11px] font-bold text-[var(--fd-text3)] uppercase tracking-wider select-none">
              {columns.map((col, idx) => (
                <th key={idx} className={cn("p-3.5 sm:p-4 font-bold", col.headerClassName)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--fd-border)]/50 text-xs text-[var(--fd-text2)] font-medium">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-[var(--fd-text3)] font-semibold">
                  {emptyState || "Kayıt bulunamadı."}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-[var(--fd-surface2)]/40 transition duration-150 ease-in-out">
                  {columns.map((col, colIdx) => {
                    let cellVal: any = ""
                    if (col.cell) {
                      cellVal = col.cell(row)
                    } else if (col.accessorKey) {
                      cellVal = (row as any)[col.accessorKey]
                    } else if (col.accessorFn) {
                      cellVal = col.accessorFn(row)
                    }
                    return (
                      <td key={colIdx} className={cn("p-3.5 sm:p-4 align-middle", col.className)}>
                        {cellVal}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
