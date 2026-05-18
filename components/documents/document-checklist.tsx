import { DocumentUploadRow } from "./document-upload-row"
import { MultiUploadRow } from "./multi-upload-row"

export interface DocWithTemplate {
  id: string
  status: "pending_upload" | "pending_review" | "approved" | "rejected" | "changes_requested"
  storage_path: string | null
  file_name: string | null
  application_id: string
  template: {
    id: string
    code: string
    name: string
    description: string | null
    is_form: boolean
    is_required: boolean
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
    <div className="space-y-6">
      {categories.map((cat) => {
        if (cat.groups.length === 0) return null
        return (
          <section key={cat.title}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 px-1">
              {cat.title}
            </h3>
            <div className="rounded-lg border bg-card divide-y divide-border">
              <div className="px-4">
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
                      isShared={group.isShared}
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
