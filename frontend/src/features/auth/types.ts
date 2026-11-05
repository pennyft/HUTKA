/** Ответ GET /users/me (поля из auth/dto/UserResponse.java бэка). После `npm run gen:api` можно заменить типом из схемы. */
export type VerificationStatus = 'unverified' | 'pending' | 'verified'

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  emailVerified: boolean
  phone: string
  birthDate: string
  verificationStatus: VerificationStatus
  isPartner: boolean
}

export interface AuthToken {
  token: string
  tokenType: string
}
