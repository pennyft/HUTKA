package com.hutka.backend.review.entity;

import com.hutka.backend.booking.entity.Booking;
import com.hutka.backend.car.entity.Car;
import com.hutka.backend.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table( name="reviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false, unique = true)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "car_id", nullable = false)
    private Car car;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id", nullable = false)
    private User reviewer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewee_id", nullable = false)
    private User reviewee;

    private Integer carRating;

    @Column(columnDefinition = "TEXT")
    private String carComment;

    private  Integer userRating;

    @Column(columnDefinition = "TEXT")
    private String userComment;

    @CreationTimestamp
    private LocalDateTime createdAt;


}
