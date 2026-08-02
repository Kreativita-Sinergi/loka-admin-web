interface PaginationProps {
  page: number
  total: number
  limit: number
  onChange: (page: number) => void
}

export default function Pagination({ page, total, limit, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1) return null

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 text-sm text-slate-600">
      <span>
        Menampilkan {(page - 1) * limit + 1}–{Math.min(page * limit, total)} dari {total} data
      </span>
      <div className="flex gap-1 max-w-full overflow-x-auto pb-1">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ←
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          const p = i + 1
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`px-3 py-1.5 rounded border text-sm ${
                p === page
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-slate-200 hover:bg-slate-100'
              }`}
            >
              {p}
            </button>
          )
        })}
        <button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          →
        </button>
      </div>
    </div>
  )
}
