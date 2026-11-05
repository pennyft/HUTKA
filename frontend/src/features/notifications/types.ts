/** Элемент GET /notifications (NotificationResponse). type приходит строкой: набор типов на бэке может расти. */
export interface AppNotification {
  id: string
  type: string
  /** Идентификаторы и факты, готового текста бэк не присылает (см. NotificationService.send) */
  payload: Record<string, unknown> | null
  read: boolean
  createdAt: string
}

export interface NotificationList {
  unreadCount: number
  notifications: AppNotification[]
}

/** Кабинет, в котором открыт список: от него зависит, куда ведут общие для двух ролей уведомления. */
export type Cabinet = 'renter' | 'partner'
