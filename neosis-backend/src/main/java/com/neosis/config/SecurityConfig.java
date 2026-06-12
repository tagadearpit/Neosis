package com.neosis.config;

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
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private UserRepository userRepository;

    @Value("${app.frontend.url:https://neosis-static-site.onrender.com}")
    private String frontendUrl;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(request -> {
                CorsConfiguration config = new CorsConfiguration();
                
                String cleanFrontendUrl = frontendUrl.endsWith("/") ? 
                    frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl;

                config.setAllowedOrigins(List.of("http://localhost:5173", cleanFrontendUrl)); 
                config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
                
                // CRITICAL FIX: Explicitly allow common headers instead of a wildcard (*)
                config.setAllowedHeaders(List.of("Authorization", "Cache-Control", "Content-Type", "X-XSRF-TOKEN")); 
                
                // CRITICAL FIX: This allows the React frontend to see the JSESSIONID cookie
                config.setExposedHeaders(List.of("Set-Cookie")); 
                
                config.setAllowCredentials(true); 
                
                return config;
            }))
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                .ignoringRequestMatchers("/login/**", "/oauth2/**", "/ws/**") 
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/login", "/ws/**", "/api/users/me").permitAll() 
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .successHandler((request, response, authentication) -> {
                    
                    OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
                    String email = oAuth2User.getAttribute("email");
                    String name = oAuth2User.getAttribute("name");

                    if (userRepository.findByEmail(email) == null) {
                        User newUser = new User();
                        newUser.setEmail(email);
                        newUser.setName(name); 
                        userRepository.save(newUser);
                    }

                    response.sendRedirect(frontendUrl + "/chat");
                })
            );

        return http.build();
    }
}
