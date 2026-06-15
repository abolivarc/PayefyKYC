import Image from "next/image"

interface PayefyLogoProps {
  /** Height in px; width is automatic (preserves aspect ratio) */
  size?: number
  /** "dark" = dark-green logo, for light backgrounds. "light" = accent-green logo, for dark backgrounds */
  variant?: "dark" | "light"
}

export function PayefyLogo({ size = 32, variant = "dark" }: PayefyLogoProps) {
  const src = variant === "light" ? "/payefy-mark-light.png" : "/payefy-mark-dark.png"
  return (
    <Image
      src={src}
      alt="Payefy"
      width={size}
      height={size}
      style={{ width: "auto", height: size, objectFit: "contain" }}
      priority
    />
  )
}
