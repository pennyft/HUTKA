package com.hutka.backend.booking.entity;

import com.hutka.backend.booking.enums.PhotoType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "booking_photos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(nullable = false, length = 500)
    private String url;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private PhotoType photoType;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
