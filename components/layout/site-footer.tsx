import Link from "next/link"

const LEGAL_LINKS = [
  { href: "/aviso-de-privacidad", label: "Aviso de Privacidad" },
  { href: "/terminos-y-condiciones", label: "Términos y Condiciones" },
  { href: "/cookies", label: "Política de Cookies" },
]

/**
 * Footer con identidad legal y enlaces a las políticas.
 * variant "dark": para fondos oscuros (login/registro).
 * variant "light": para el portal y páginas legales (fondo claro).
 */
export function SiteFooter({
  variant = "light",
  className = "",
}: {
  variant?: "light" | "dark"
  className?: string
}) {
  const base = variant === "dark" ? "text-white/70" : "text-slate-500"
  const link =
    variant === "dark"
      ? "text-white/80 hover:text-white underline-offset-2 hover:underline"
      : "text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline"

  return (
    <footer className={`text-center text-xs leading-relaxed ${base} ${className}`}>
      <nav aria-label="Enlaces legales" className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {LEGAL_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={link}>
            {l.label}
          </Link>
        ))}
      </nav>
      <p className="mt-2">
        Payefy, S.A.P.I. de C.V. · Espacio Santa Fe, Carretera México–Toluca 5420, 701-B,
        Col. El Yaqui, Cuajimalpa de Morelos, C.P. 05320, Ciudad de México
      </p>
      <p className="mt-0.5">
        <a href="mailto:contacto@payefy.me" className={link}>
          contacto@payefy.me
        </a>{" "}
        · Tel. +52 800 953 7909
      </p>
    </footer>
  )
}
