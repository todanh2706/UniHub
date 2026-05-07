package vn.unihub.backend.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import vn.unihub.backend.config.AiProperties;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Pipe Filter 2: AI summarization via OpenRouter (OpenAI-compatible API).
 * Can be swapped for any OpenAI-compatible provider by changing config.
 */
@Slf4j
@Service
public class OpenRouterAiService {

    private final AiProperties aiProperties;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public OpenRouterAiService(AiProperties aiProperties) {
        this.aiProperties = aiProperties;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Summarize the given text using the configured AI model.
     *
     * @param extractedText extracted text from the PDF document
     * @return summary text, or error message prefixed with "ERROR:"
     */
    public String summarize(String extractedText) {
        if (extractedText == null || extractedText.isBlank()) {
            return "ERROR: No text provided for summarization";
        }

        String apiKey = aiProperties.getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            return "ERROR: AI_API_KEY is not configured. Set AI_API_KEY in .env to use AI summarization.";
        }

        // Truncate very long texts to avoid exceeding context limits
        String truncatedText = extractedText.length() > 50000
                ? extractedText.substring(0, 50000) + "\n\n[... truncated ...]"
                : extractedText;

        try {
            ObjectNode requestBody = objectMapper.createObjectNode();
            requestBody.put("model", aiProperties.getModel());

            ArrayNode messages = requestBody.putArray("messages");
            ObjectNode systemMessage = messages.addObject();
            systemMessage.put("role", "system");
            systemMessage.put("content", "Bạn là trợ lý tóm tắt nội dung workshop. "
                    + "Hãy tóm tắt nội dung dưới đây bằng tiếng Việt, ngắn gọn trong 3-5 câu. "
                    + "Tập trung vào chủ đề chính, mục tiêu và kết quả mong đợi.");

            ObjectNode userMessage = messages.addObject();
            userMessage.put("role", "user");
            userMessage.put("content", "Hãy tóm tắt nội dung workshop sau:\n\n" + truncatedText);

            requestBody.put("max_tokens", 1024);
            requestBody.put("temperature", 0.3);

            String json = objectMapper.writeValueAsString(requestBody);
            log.info("Calling AI model {} at {}", aiProperties.getModel(), aiProperties.getBaseUrl());

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(aiProperties.getBaseUrl() + "/chat/completions"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .header("HTTP-Referer", "https://unihub.local")
                    .header("X-Title", "UniHub Workshop")
                    .timeout(Duration.ofSeconds(30))
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("AI API returned status {}: {}", response.statusCode(), response.body());
                return "ERROR: AI service returned status " + response.statusCode();
            }

            JsonNode responseJson = objectMapper.readTree(response.body());
            String summary = responseJson
                    .path("choices")
                    .path(0)
                    .path("message")
                    .path("content")
                    .asText("");

            if (summary.isBlank()) {
                log.warn("AI returned empty summary for text length {}", extractedText.length());
                return "ERROR: AI returned an empty response";
            }

            log.info("Generated summary ({} chars) using model {}", summary.length(), aiProperties.getModel());
            return summary.trim();

        } catch (java.net.ConnectException e) {
            log.error("Cannot connect to AI API at {}", aiProperties.getBaseUrl(), e);
            return "ERROR: Cannot connect to AI service at " + aiProperties.getBaseUrl();
        } catch (java.net.http.HttpTimeoutException e) {
            log.error("AI API timed out", e);
            return "ERROR: AI service timed out after 30 seconds";
        } catch (Exception e) {
            log.error("AI summarization failed", e);
            return "ERROR: " + e.getMessage();
        }
    }
}
