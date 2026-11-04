import type { LucideIcon } from 'lucide-react'

interface ButtonIconProps {
  icon: LucideIcon
  /** Posisi terhadap teks: `start` memberi jarak kanan, `end` jarak kiri. */
  side?: 'start' | 'end'
  size?: number
}

/**
 * Ikon kecil yang duduk sebaris dengan teks tombol/tautan, tanpa harus mengubah
 * tombolnya menjadi flex. Satu tempat untuk ukuran dan perataan ikon inline.
 */
export default function ButtonIcon({ icon: Icon, side = 'start', size = 15 }: ButtonIconProps) {
  return (
    <Icon
      size={size}
      strokeWidth={2}
      aria-hidden
      className={`inline-block shrink-0 align-[-0.15em] ${side === 'start' ? 'mr-1.5' : 'ml-1'}`}
    />
  )
}
