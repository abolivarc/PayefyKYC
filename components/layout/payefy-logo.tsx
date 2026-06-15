export function PayefyLogo({ size = 32, variant = "dark" }: { size?: number; variant?: "dark" | "light" }) {
  const bg = variant === "light" ? "#AEFF99" : "#004238"
  const fg = variant === "light" ? "#004238" : "#AEFF99"

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="16" r="16" fill={bg} />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill={fg}
        fontSize="16"
        fontWeight="700"
        fontFamily="Arial, sans-serif"
      >
        P
      </text>
    </svg>
  )
}
