package vn.unihub.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties("app.ai")
@Getter
@Setter
public class AiProperties {
    /** OpenRouter API key (value, not env var name) */
    private String apiKey = "";
    /** OpenRouter base URL */
    private String baseUrl = "https://openrouter.ai/api/v1";
    /** Model ID to use for summarization */
    private String model = "openai/gpt-4o-mini";
    /** Local directory to store uploaded documents */
    private String docsDir = "./data/documents";
    /** Max file size in MB */
    private int maxFileSizeMb = 10;
}
