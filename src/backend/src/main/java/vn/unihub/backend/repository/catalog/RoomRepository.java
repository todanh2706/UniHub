package vn.unihub.backend.repository.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.unihub.backend.entity.catalog.Room;

import java.util.UUID;

public interface RoomRepository extends JpaRepository<Room, UUID> {
}
