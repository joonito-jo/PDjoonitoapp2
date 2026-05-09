import type { ReactNode } from 'react';

export function Field({ label, value, onChange, placeholder, textarea = false, type = 'text', inputClassName = '', rows = 4 }: { label: string; value: string | number; onChange: (v: string) => void; placeholder?: string; textarea?: boolean; type?: string; inputClassName?: string; rows?: number }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold text-zinc-500">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className={`w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 ${inputClassName}`} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} className={`w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 ${inputClassName}`} />
      )}
    </label>
  );
}

export function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold text-zinc-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500">
        {children}
      </select>
    </label>
  );
}
