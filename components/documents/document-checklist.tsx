import { DocumentUploadRow } from "./document-upload-row"
import { MultiUploadRow } from "./multi-upload-row"
import { CheckOrUploadRow } from "./check-or-upload-row"
import { DataInputField } from "./data-input-field"

export interface DocWithTemplate {
  id: string
  status: "pending_upload" | "pending_review" | "approved" | "rejected" | "changes_requested"
  storage_path: string | null
  file_name: string | null
  application_id: string
  is_checked: boolean
  uploaded_at: string | null
  reviewer_notes?: string | null
  client_notes?: string | null
  template: {
    id: string
    code: string
    name: string
    description: string | null
    is_form: boolean
    is_required: boolean
    field_type: string
    file_format: string
    instructions: string | null
    sort_order: number
  }
  isShared?: boolean
}

export interface DocGroup {
  templateCode: string
  templateId: string
  templateName: string
  templateInstructions: string | null
  is_form: boolean
  is_required: boolean
  field_type: string
  file_format: string
  docs: DocWithTemplate[]
  isMulti: boolean
  isShared: boolean
}

export interface ChecklistCategory {
  title: string
  groups: DocGroup[]
}

interface Props {
  categories: ChecklistCategory[]
  applicationId: string
}

export function DocumentChecklist({ categories, applicationId }: Props) {
  // Separate data_check groups into their own section
  const dataGroups = categories.flatMap((c) =>
    c.groups.filter((g) => g.field_type === "data_check")
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Data input fields section ── */}
      {dataGroups.length > 0 && (
        <section>
          <p
            style={{
              margin: "0 0 8px 2px",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#8A9E94",
            }}
          >
            Datos solicitados
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 8,
            }}
          >
            {dataGroups.map((group) => {
              const doc = group.docs[0]
              if (!doc) return null
              return (
                <DataInputField
                  key={group.templateCode}
                  documentId={doc.id}
                  applicationId={applicationId}
                  templateName={group.templateName}
                  templateInstructions={group.templateInstructions}
                  currentValue={doc.file_name}
                  currentStatus={doc.status}
                  isRequired={group.is_required}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* ── Document upload tiles ── */}
      {categories.map((cat) => {
        const uploadGroups = cat.groups.filter((g) => g.field_type !== "data_check")
        if (uploadGroups.length === 0) return null
        return (
          <section key={cat.title}>
            <p
              style={{
                margin: "0 0 6px 2px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#8A9E94",
              }}
            >
              {cat.title}{" "}
              <span style={{ color: "#C8D5CC", fontWeight: 600 }}>
                {uploadGroups.length}
              </span>
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                gap: 8,
              }}
            >
              {uploadGroups.map((group) => {
                if (group.isMulti) {
                  return (
                    <div
                      key={group.templateCode}
                      style={{ gridColumn: "span 2" }}
                    >
                      <MultiUploadRow
                        applicationId={applicationId}
                        templateId={group.templateId}
                        templateName={group.templateName}
                        templateInstructions={group.templateInstructions}
                        fileFormat={group.file_format}
                        initialDocs={group.docs.map((d) => ({
                          id: d.id,
                          status: d.status,
                          fileName: d.file_name,
                        }))}
                      />
                    </div>
                  )
                }

                const doc = group.docs[0]
                if (!doc) return null

                if (group.field_type === "check_or_upload") {
                  return (
                    <CheckOrUploadRow
                      key={group.templateCode}
                      documentId={doc.id}
                      templateName={group.templateName}
                      templateInstructions={group.templateInstructions}
                      currentStatus={doc.status}
                      fileFormat={group.file_format}
                      fileName={doc.file_name}
                      initialIsChecked={doc.is_checked}
                      isRequired={group.is_required}
                    />
                  )
                }

                return (
                  <DocumentUploadRow
                    key={group.templateCode}
                    documentId={doc.id}
                    applicationId={applicationId}
                    templateCode={group.templateCode}
                    templateName={group.templateName}
                    templateInstructions={group.templateInstructions}
                    currentStatus={doc.status}
                    fileFormat={group.file_format}
                    isForm={group.is_form}
                    supportsDirectUpload={group.templateCode === "terms_and_conditions"}
                    fileName={doc.file_name}
                    uploadedAt={doc.uploaded_at}
                    isShared={group.isShared}
                    isRequired={group.is_required}
                    reviewerNotes={doc.reviewer_notes}
                    clientNotes={doc.client_notes}
                  />
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
