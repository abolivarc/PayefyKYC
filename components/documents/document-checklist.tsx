import { DocumentUploadRow } from "./document-upload-row"
import { MultiUploadRow } from "./multi-upload-row"
import { CheckOrUploadRow } from "./check-or-upload-row"
import { DataCheckRow } from "./data-check-row"

export interface DocWithTemplate {
  id: string
  status: "pending_upload" | "pending_review" | "approved" | "rejected" | "changes_requested"
  storage_path: string | null
  file_name: string | null
  application_id: string
  is_checked: boolean
  uploaded_at: string | null
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
  return (
    <div className="space-y-5">
      {categories.map((cat) => {
        if (cat.groups.length === 0) return null
        return (
          <section key={cat.title}>
            <h3
              className="px-1 mb-2"
              style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8A9E94" }}
            >
              {cat.title}
            </h3>
            <div
              style={{
                background: "#fff",
                border: "1px solid #E4ECE7",
                borderRadius: 22,
                boxShadow: "0 1px 2px rgba(15,42,34,.04), 0 1px 3px rgba(15,42,34,.06)",
                overflow: "hidden",
              }}
            >
              <div className="px-5">
                {cat.groups.map((group) => {
                  if (group.isMulti) {
                    return (
                      <MultiUploadRow
                        key={group.templateCode}
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

                  if (group.field_type === "data_check") {
                    return (
                      <DataCheckRow
                        key={group.templateCode}
                        templateName={group.templateName}
                        currentStatus={doc.status}
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
                      fileName={doc.file_name}
                      uploadedAt={doc.uploaded_at}
                      isShared={group.isShared}
                      isRequired={group.is_required}
                    />
                  )
                })}
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}
