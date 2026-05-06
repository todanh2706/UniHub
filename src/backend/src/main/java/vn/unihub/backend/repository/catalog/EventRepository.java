package vn.unihub.backend.repository.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.unihub.backend.entity.catalog.Event;

import java.util.UUID;

public interface EventRepository extends JpaRepository<Event, UUID> {
}
