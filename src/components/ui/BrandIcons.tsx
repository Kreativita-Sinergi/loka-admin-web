import type { SVGProps } from 'react'

// Ikon merek (lucide tidak lagi menyediakan logo merek). Gaya outline seperti
// lucide: viewBox 24, garis currentColor, ujung bulat — ukuran & warna ikut
// prop `size`/className seperti ikon lucide lain.

type BrandIconProps = Omit<SVGProps<SVGSVGElement>, 'ref'> & { size?: number; strokeWidth?: number }

function Outline({ size = 24, strokeWidth = 2, children, ...rest }: BrandIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  )
}

export function InstagramIcon(props: BrandIconProps) {
  return (
    <Outline {...props}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.25" />
      <circle cx="17.4" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
    </Outline>
  )
}

/** Logo Threads: garis "@" melingkar. */
export function ThreadsIcon(props: BrandIconProps) {
  return (
    <Outline {...props}>
      <path d="M17.2 11.2c-.4-2.6-2.2-3.9-4.8-3.9-2.8 0-4.4 1.9-4.4 4.4 0 2.3 1.6 3.9 3.8 3.9 2.7 0 4.1-1.9 4.1-4.9 0-5.1-3-7.7-7-7.7C5 3 2.9 7 2.9 12s2.4 9 8 9c2.9 0 5.1-1 6.6-2.9" />
      <path d="M15.9 12.3c2.6.5 4.2 1.8 4.2 3.5 0 1.3-.9 2.4-2.6 2.8" />
    </Outline>
  )
}
