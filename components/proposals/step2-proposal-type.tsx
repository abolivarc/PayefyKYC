"use client"

import { StepProps, ProposalType } from "@/lib/proposals/types"
import { BarChart3, FileText, Check } from "lucide-react"

const proposalTypes: {
  value: ProposalType
  title: string
  description: string
  features: string[]
  icon: React.ReactNode
}[] = [
  {
    value: "comparative",
    title: "Propuesta Comparativa",
    description:
      "Compara las tasas actuales del cliente con Payefy y muestra el ahorro potencial",
    features: [
      "Tabla comparativa de tasas",
      "Cálculo de ahorro mensual y anual",
      "Gráfico de barras visual",
      "Desglose por tipo de tarjeta",
    ],
    icon: <BarChart3 className="h-8 w-8" />,
  },
  {
    value: "general",
    title: "Propuesta General",
    description:
      "Presenta las tasas negociadas de Payefy y la propuesta de valor",
    features: [
      "Tasas negociadas del producto",
      "Propuesta de valor Payefy",
      "Terminales disponibles",
      "Beneficios y servicios",
    ],
    icon: <FileText className="h-8 w-8" />,
  },
]

export function Step2ProposalType({ data, updateData }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Tipo de Propuesta</h2>
        <p className="text-muted-foreground text-sm">
          Selecciona el tipo de propuesta que deseas generar para{" "}
          <span className="font-medium text-foreground">{data.businessName}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {proposalTypes.map((type) => {
          const isSelected = data.proposalType === type.value
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => updateData({ proposalType: type.value })}
              className={`p-6 rounded-xl border text-left cursor-pointer transition-all hover:shadow-lg ${
                isSelected
                  ? "ring-2 ring-[#004238] bg-[#F0FAF3] border-transparent"
                  : "border-gray-200 hover:border-[#004238]/50 bg-white"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-3 rounded-lg ${
                    isSelected
                      ? "bg-[#004238] text-[#AEFF99]"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {type.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{type.title}</h3>
                    {isSelected && (
                      <div className="h-6 w-6 rounded-full bg-[#004238] flex items-center justify-center">
                        <Check className="h-4 w-4 text-[#AEFF99]" />
                      </div>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm mt-2">{type.description}</p>
                  <ul className="mt-4 space-y-2">
                    {type.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#004238] mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {data.proposalType && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm">
            <span className="font-medium">Seleccionado:</span>{" "}
            {proposalTypes.find((t) => t.value === data.proposalType)?.title}
          </p>
        </div>
      )}
    </div>
  )
}
