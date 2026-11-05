/** adminapi/dto/PddQuestionAdminResponse.java. */
export interface PddQuestion {
  id: string
  text: string
  variants: string[]
  /** Индекс верного варианта с нуля. */
  correctIndex: number
  category: string | null
  active: boolean
  source: string | null
  createdAt: string
}

export interface PddForm {
  text: string
  variants: string[]
  correctIndex: number
  category: string
  active: boolean
}

export interface CreatePddBody {
  text: string
  variants: string[]
  correctIndex: number
  category?: string
  active: boolean
}
export type UpdatePddBody = Partial<CreatePddBody>
