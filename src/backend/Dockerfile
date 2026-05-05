FROM eclipse-temurin:25-jdk AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends maven && rm -rf /var/lib/apt/lists/*

COPY pom.xml ./
COPY src ./src

RUN mvn -Dmaven.test.skip=true package

FROM eclipse-temurin:25-jre

WORKDIR /app

COPY --from=builder /app/target/backend-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
