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

// NEW IMPORTS REQUIRED FOR MOBILE PWA COOKIE FIX
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private UserRepository userRepository;

    @Value("${app.frontend.url:https://neosis-static-site.onrender.com}")
    private String frontendUrl;

    // INJECT THE NEW COOKIE REPOSITORY
    @Autowired
    private HttpCookieOAuth2AuthorizationRequestRepository cookieAuthorizationRequestRepository;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(request -> {
                CorsConfiguration config = new CorsConfiguration();
                
                // Clean the frontend URL just in case it has a trailing slash
                String cleanFrontendUrl = frontendUrl.endsWith("/") ? 
                    frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl;

                // Explicitly define the allowed origins. NO WILDCARDS ALLOWED here!
                config.setAllowedOrigins(List.of("http://localhost:5173", cleanFrontendUrl)); 
                config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
                
                // Explicitly allow common headers instead of a wildcard (*)
                config.setAllowedHeaders(List.of("Authorization", "Cache-Control", "Content-Type", "X-XSRF-TOKEN")); 
                
                // This allows the React frontend to see the JSESSIONID cookie
                config.setExposedHeaders(List.of("Set-Cookie")); 
                
                // Required for cross-origin session cookies
                config.setAllowCredentials(true); 
                
                return config;
            }))
            // Enable CSRF but expose token to React and ignore OAuth paths
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                .ignoringRequestMatchers("/login/**", "/oauth2/**") 
            )
            .authorizeHttpRequests(auth -> auth
                // Added /api/users/me to prevent 302 redirect loops during frontend auth checks
                .requestMatchers("/", "/login", "/ws/**", "/api/users/me").permitAll() 
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                // OVERRIDE DEFAULT SESSION STORAGE WITH SECURE COOKIE STORAGE FOR MOBILE PWA
                .authorizationEndpoint(authEndpoint -> authEndpoint
                    .authorizationRequestRepository(cookieAuthorizationRequestRepository)
                )
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
