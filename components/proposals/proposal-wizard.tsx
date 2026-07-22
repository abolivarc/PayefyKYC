"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Step1BusinessInfo } from "./step1-business-info"
import { Step2ProposalType } from "./step2-proposal-type"
import { Step3RatesConfig } from "./step3-rates-config"
import { Step4Preview } from "./step4-preview"
import {
  ProposalData,
  AMEX_FLOOR_RATE,
  INTERNATIONAL_FLOOR_RATE,
} from "@/lib/proposals/types"

const steps = [
  { number: 1, title: "Información del Negocio" },
  { number: 2, title: "Tipo de Propuesta" },
  { number: 3, title: "Configuración de Tasas" },
  { number: 4, title: "Vista Previa" },
]

export function ProposalWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<Partial<ProposalData>>({
    debitDistribution: 50,
    creditDistribution: 50,
    amexDistribution: 0,
    internationalDistribution: 0,
  })

  const updateData = (newData: Partial<ProposalData>) => {
    setData((prev) => ({ ...prev, ...newData }))
  }

  const handleNext = () => currentStep < steps.length && setCurrentStep(currentStep + 1)
  const handleBack = () => currentStep > 1 && setCurrentStep(currentStep - 1)

  const ratesValid =
    data.negotiatedDebitRate !== undefined &&
    data.negotiatedCreditRate !== undefined &&
    data.negotiatedDebitRate >= (data.sectorDebitFloor || 0) &&
    data.negotiatedCreditRate >= (data.sectorCreditFloor || 0) &&
    (data.negotiatedAmexRate ?? AMEX_FLOOR_RATE) >= AMEX_FLOOR_RATE &&
    (data.negotiatedInternationalRate ?? INTERNATIONAL_FLOOR_RATE) >= INTERNATIONAL_FLOOR_RATE

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!(
          data.productType &&
          data.businessName &&
          data.entityType &&
          data.mccCode &&
          data.monthlyVolume &&
          data.contactName &&
          data.contactEmail
        )
      case 2:
        return !!data.proposalType
      case 3:
        if (!ratesValid) return false
        if (data.proposalType === "comparative") {
          return !!(
            data.competitorName &&
            data.competitorDebitRate !== undefined &&
            data.competitorCreditRate !== undefined
          )
        }
        return true
      default:
        return true
    }
  }

  const stepProps = { data, updateData }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    step.number === currentStep
                      ? "bg-[#004238] text-[#AEFF99]"
                      : step.number < currentStep
                        ? "bg-[#004238]/80 text-[#AEFF99]"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {step.number}
                </div>
                <span
                  className={`text-xs mt-2 text-center hidden sm:block ${
                    step.number === currentStep
                      ? "font-semibold text-[#0F1B2A]"
                      : "text-gray-400"
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-2 rounded ${
                    step.number < currentStep ? "bg-[#004238]/70" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white border border-[#E7ECF1] rounded-2xl shadow-sm p-6 mb-6">
        {currentStep === 1 && <Step1BusinessInfo {...stepProps} />}
        {currentStep === 2 && <Step2ProposalType {...stepProps} />}
        {currentStep === 3 && <Step3RatesConfig {...stepProps} />}
        {currentStep === 4 && <Step4Preview data={data} onBack={handleBack} />}
      </div>

      {/* Navigation */}
      {currentStep < 4 && (
        <div className="flex justify-between pb-10">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Anterior
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            style={{ background: "#004238", color: "#AEFF99" }}
          >
            Siguiente
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
