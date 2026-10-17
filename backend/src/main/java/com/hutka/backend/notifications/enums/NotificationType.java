package com.hutka.backend.notifications.enums;





public enum NotificationType {
    
    booking_created,
    
    booking_new,
    
    booking_status_changed,
    
    booking_request_expired,
    
    booking_renter_no_show,
    
    booking_partner_no_show,
    
    booking_partner_strike,
    
    booking_overdue_escalated,
    
    license_approved,
    
    license_rejected,
    
    car_approved,
    
    car_rejected,
    
    car_returned_to_catalog,
    
    dispute_resolved,
    
    ticket_message,
    
    ticket_closed,
    
    ai_escalated,
    
    group_trip_joined,
    
    group_trip_closed,
    
    group_trip_cancelled,
    
    /** Партнёру: администратор принудительно скрыл машину (16.3); payload: carId, car, reason. */
    car_hidden_by_admin,

    /** Партнёру: администратор снял скрытие (16.3); payload: carId, car, visible (false, если машина всё ещё скрыта по страйкам). */
    car_unhidden_by_admin,

    /** Партнёру: администратор удалил машину (16.3); payload: carId, car. */
    car_deleted_by_admin,

    weather_warning,
    
    system
}
