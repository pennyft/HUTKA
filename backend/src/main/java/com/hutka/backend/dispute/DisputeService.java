package com.hutka.backend.dispute;

import com.hutka.backend.booking.entity.Booking;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.booking.repository.BookingRepository;
import com.hutka.backend.dispute.dto.DisputeRequest;
import com.hutka.backend.dispute.dto.DisputeResponse;
import com.hutka.backend.dispute.entity.Dispute;
import com.hutka.backend.dispute.enums.DisputeInitiator;
import com.hutka.backend.dispute.enums.DisputeStatus;
import com.hutka.backend.dispute.repository.DisputeRepository;
import com.hutka.backend.exception.BadRequestException;
import com.hutka.backend.exception.ConflictException;
import com.hutka.backend.exception.ForbiddenException;
import com.hutka.backend.exception.NotFoundException;
import com.hutka.backend.user.User;
import com.hutka.backend.user.UserRepository;
import com.hutka.backend.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DisputeService {

    private final DisputeRepository disputeRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;

    // ───── ОТКРЫТЬ СПОР ─────

    public DisputeResponse openDispute(DisputeRequest request, User initiator) {
        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new NotFoundException("Booking not found"));

        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new BadRequestException("Dispute can only be opened for completed bookings");
        }

        if (disputeRepository.existsByBookingId(booking.getId())) {
            throw new ConflictException("Dispute already exists for this booking");
        }

        DisputeInitiator initiatorRole;
        if (booking.getRenter().getId().equals(initiator.getId())) {
            initiatorRole = DisputeInitiator.RENTER;
        } else if (booking.getCar().getOwner().getId().equals(initiator.getId())) {
            initiatorRole = DisputeInitiator.PARTNER;
        } else {
            throw new ForbiddenException("Access denied");
        }

        Dispute dispute = Dispute.builder()
                .booking(booking)
                .initiator(initiator)
                .initiatorRole(initiatorRole)
                .description(request.getDescription())
                .status(DisputeStatus.OPEN)
                .build();

        disputeRepository.save(dispute);
        return toDisputeResponse(dispute);
    }

    // ───── ПОЛУЧЕНИЕ СПОРОВ ─────

    public DisputeResponse getDisputeById(UUID disputeId, User requestingUser) {
        Dispute dispute = getDisputeOrThrow(disputeId);

        boolean isAdmin = requestingUser.getRole() == UserRole.ADMIN;
        boolean isRenter = dispute.getBooking().getRenter().getId().equals(requestingUser.getId());
        boolean isPartner = dispute.getBooking().getCar().getOwner().getId().equals(requestingUser.getId());

        if (!isAdmin && !isRenter && !isPartner) {
            throw new ForbiddenException("Access denied");
        }

        return toDisputeResponse(dispute);
    }

    public List<DisputeResponse> getMyDisputes(UUID userId) {
        return disputeRepository.findByInitiatorId(userId)
                .stream()
                .map(this::toDisputeResponse)
                .toList();
    }

    // ───── МОДЕРАТОР ─────

    public DisputeResponse takeInReview(UUID disputeId, User moderator) {
        Dispute dispute = getDisputeOrThrow(disputeId);

        if (dispute.getStatus() != DisputeStatus.OPEN) {
            throw new BadRequestException("Dispute is not open");
        }

        dispute.setStatus(DisputeStatus.IN_REVIEW);
        dispute.setResolver(moderator);
        disputeRepository.save(dispute);
        return toDisputeResponse(dispute);
    }

    public DisputeResponse resolveDispute(UUID disputeId, String resolution, User moderator) {
        Dispute dispute = getDisputeOrThrow(disputeId);

        if (dispute.getStatus() != DisputeStatus.IN_REVIEW) {
            throw new BadRequestException("Dispute is not in review");
        }

        dispute.setStatus(DisputeStatus.RESOLVED);
        dispute.setResolution(resolution);
        dispute.setResolver(moderator);
        disputeRepository.save(dispute);
        return toDisputeResponse(dispute);
    }

    public DisputeResponse closeDispute(UUID disputeId, User moderator) {
        Dispute dispute = getDisputeOrThrow(disputeId);

        dispute.setStatus(DisputeStatus.CLOSED);
        dispute.setResolver(moderator);
        disputeRepository.save(dispute);
        return toDisputeResponse(dispute);
    }

    public List<DisputeResponse> getDisputesByStatus(DisputeStatus status) {
        return disputeRepository.findByStatus(status)
                .stream()
                .map(this::toDisputeResponse)
                .toList();
    }

    // ───── ПРИВАТНЫЕ МЕТОДЫ ─────

    private Dispute getDisputeOrThrow(UUID disputeId) {
        return disputeRepository.findById(disputeId)
                .orElseThrow(() -> new NotFoundException("Dispute not found"));
    }

    private DisputeResponse toDisputeResponse(Dispute dispute) {
        DisputeResponse response = new DisputeResponse();
        response.setId(dispute.getId());
        response.setBookingId(dispute.getBooking().getId());
        response.setInitiatorId(dispute.getInitiator().getId());
        response.setInitiatorRole(dispute.getInitiatorRole());
        response.setDescription(dispute.getDescription());
        response.setStatus(dispute.getStatus());
        response.setResolution(dispute.getResolution());
        response.setResolverId(dispute.getResolver() != null ? dispute.getResolver().getId() : null);
        response.setCreatedAt(dispute.getCreatedAt());
        response.setUpdatedAt(dispute.getUpdatedAt());
        return response;
    }
}