package vn.unihub.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties("app.csv-sync")
@Getter
@Setter
public class CsvSyncProperties {
    /** Directory to scan for CSV files */
    private String csvDir = "./data/csv";
    /** Cron expression for scheduled sync (default: 2 AM daily) */
    private String cron = "0 0 2 * * *";
    /** Number of rows to process before flushing to DB */
    private int batchSize = 100;
}
