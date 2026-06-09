package com.neosis.config;

// IMPORTANT: Update these two imports if your packages are named differently!
import com.neosis.model.User;
import com.neosis.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    // Inject your database repository so we can save new users
    @Autowired
    private UserRepository userRepository;

    // Dynamically inject the frontend URL from application.yml
    @Value("${app.frontend.url:https://neosis-static-site.onrender.com}")
    private String frontendUrl;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(request -> {
                CorsConfiguration config = new CorsConfiguration();
                // Dynamically use your frontendUrl variable here
                config.setAllowedOrigins(List.of("http://localhost:5173", frontendUrl)); 
                config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
                config.setAllowedHeaders(List.of("*")); // CRITICAL FIX: Allows Axios preflight headers
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
                    
                    // Extract the user's details from Google
                    OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
                    String email = oAuth2User.getAttribute("email");
                    String name = oAuth2User.getAttribute("name");

                    // Save to Postgres if this is their first time logging in!
                    if (userRepository.findByEmail(email) == null) {
                        User newUser = new User();
                        newUser.setEmail(email);
                        newUser.setName(name); 
                        userRepository.save(newUser);
                    }

                    // Redirect dynamically using the injected frontendUrl
                    response.sendRedirect(frontendUrl + "/chat");
                })
            );

        return http.build();
    }
}