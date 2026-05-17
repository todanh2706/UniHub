package vn.unihub.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.unihub.backend.entity.payment.Payment;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByCheckoutToken(String checkoutToken);

    List<Payment> findAllByRegistrationIdOrderByRequestedAtDesc(UUID registrationId);

    default Optional<Payment> findSinglePaymentIntentByRegistrationId(UUID registrationId) {
        List<Payment> payments = findAllByRegistrationIdOrderByRequestedAtDesc(registrationId);
        if (payments.size() > 1) {
            throw new IllegalStateException("Expected a single payment intent for registration " + registrationId);
        }
        return payments.stream().findFirst();
    }
}
