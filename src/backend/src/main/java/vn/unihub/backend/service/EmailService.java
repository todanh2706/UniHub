package vn.unihub.backend.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender javaMailSender;
    private final TemplateEngine templateEngine;

    @org.springframework.beans.factory.annotation.Value("${spring.mail.username:noreply@unihub.local}")
    private String fromEmail;

    public void sendHtmlEmail(String to, String subject, String templateName, Map<String, Object> variables, Map<String, byte[]> inlineImages) {
        try {
            Context context = new Context();
            context.setVariables(variables);
            String htmlContent = templateEngine.process(templateName, context);

            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            helper.setFrom("UniHub <" + fromEmail + ">");

            if (inlineImages != null) {
                for (Map.Entry<String, byte[]> entry : inlineImages.entrySet()) {
                    helper.addInline(entry.getKey(), new org.springframework.core.io.ByteArrayResource(entry.getValue()), "image/png");
                }
            }

            javaMailSender.send(message);
            log.info("Sent HTML email to: {} with subject: {}", to, subject);
        } catch (MessagingException e) {
            log.error("Failed to send HTML email to: {}", to, e);
            throw new RuntimeException("Failed to send email", e);
        }
    }

    public void sendHtmlEmail(String to, String subject, String templateName, Map<String, Object> variables) {
        sendHtmlEmail(to, subject, templateName, variables, null);
    }
}
