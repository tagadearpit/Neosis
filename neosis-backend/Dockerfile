# Build stage: Compiles your Java code
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Run stage: Packages the app into a lightweight container
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
# Copies the compiled jar file from the build stage
COPY --from=build /app/target/neosis-backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
