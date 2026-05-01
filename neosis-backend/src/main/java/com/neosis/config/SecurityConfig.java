package com.neosis.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(request -> {
                CorsConfiguration config = new CorsConfiguration();
                // Both localhost and your live Render frontend are now allowed
                config.setAllowedOrigins(List.of("http://localhost:5173", "https://neosis-static-site.onrender.com")); 
                config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
                config.setAllowCredentials(true);
                return config;
            }))
            .csrf(csrf -> csrf.disable()) // Disable CSRF for simplicity in local development
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/login", "/ws/**").permitAll() // Allow login route and WebSocket handshakes
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .successHandler((request, response, authentication) -> {
                    // Redirect to your live React frontend after a successful Google Login
                    response.sendRedirect("https://neosis-static-site.onrender.com/chat");
                })
            );

        return http.build();
    }
}
