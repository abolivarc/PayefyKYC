import Image from "next/image"

const PRODUCT_META: Record<string, {
  kicker: string
  title: string
  sub: string
  img: string
  imgAlt: string
  imgBg: string
  imgPadding: number
}> = {
  cards: {
    kicker: "Tarjetas Empresariales",
    title: "Tarjeta de Crédito Payefy",
    sub: "Líneas de crédito flexibles para financiar el crecimiento de tu empresa.",
    img: "/products/tarjeta-fisica.jpg",
    imgAlt: "Tarjetas Payefy Visa Crédito",
    imgBg: "transparent",
    imgPadding: 0,
  },
  terminals: {
    kicker: "Terminales de Pago",
    title: "Terminal TPV Payefy Ultra",
    sub: "Acepta pagos con tarjeta en tu punto de venta o e-commerce.",
    img: "/products/terminal.png",
    imgAlt: "Terminal Payefy Ultra P2",
    imgBg: "#0E1A26",
    imgPadding: 16,
  },
}

interface ProductHeroProps {
  productCode: string | null
  productName: string | null
}

export function ProductHero({ productCode, productName }: ProductHeroProps) {
  const meta = (productCode ? PRODUCT_META[productCode] : null) ?? {
    kicker: "Solicitud KYC",
    title: productName ?? "Tu solicitud",
    sub: "Completa tu expediente para activar tu producto Payefy.",
    img: "/products/tarjeta-fisica.jpg",
    imgAlt: "Payefy",
    imgBg: "#F4F8F6",
    imgPadding: 8,
  }

  return (
    <div
      className="flex items-center gap-6 rounded-2xl overflow-hidden mb-5"
      style={{
        background: "#fff",
        border: "1px solid #E7ECF1",
        boxShadow: "0 1px 2px rgba(16,30,45,.05)",
        padding: "20px 24px",
      }}
    >
      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-bold uppercase tracking-wider mb-1"
          style={{ color: "#0B7A44", letterSpacing: ".08em" }}
        >
          {meta.kicker}
        </p>
        <h2
          className="font-extrabold leading-tight mb-1.5"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            letterSpacing: "-.02em",
            color: "#0F1B2A",
            margin: "5px 0 6px",
          }}
        >
          {meta.title}
        </h2>
        <p className="text-sm" style={{ color: "#5A6B7B", maxWidth: "48ch" }}>
          {meta.sub}
        </p>
      </div>

      {/* Product image */}
      <div
        className={`hidden sm:flex shrink-0 items-center justify-center ${meta.imgBg === "transparent" ? "" : "rounded-xl overflow-hidden"}`}
        style={{
          width: 220,
          background: meta.imgBg,
          padding: meta.imgPadding,
          borderRadius: meta.imgBg === "transparent" ? 0 : 12,
        }}
      >
        <Image
          src={meta.img}
          alt={meta.imgAlt}
          width={200}
          height={130}
          className="object-contain"
          style={{ maxHeight: 130 }}
        />
      </div>
    </div>
  )
}
