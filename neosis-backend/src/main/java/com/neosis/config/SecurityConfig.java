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
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

import java.util.List;
import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private UserRepository userRepository;

    @Value("${app.frontend.url:https://neosis-static-site.onrender.com}")
    private String frontendUrl;

    @Autowired
    private HttpCookieOAuth2AuthorizationRequestRepository cookieAuthorizationRequestRepository;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        
        String cleanFrontendUrl = frontendUrl.endsWith("/") ? 
            frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl;

        config.setAllowedOrigins(Arrays.asList("http://localhost:5173", cleanFrontendUrl)); 
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("Authorization", "Cache-Control", "Content-Type", "X-XSRF-TOKEN", "Accept", "Origin", "X-Requested-With")); 
        config.setExposedHeaders(Arrays.asList("Set-Cookie")); 
        config.setAllowCredentials(true); 

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config); 
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                // FIX: Removed "/api/**". CSRF tokens will now protect all mutations.
                .ignoringRequestMatchers("/login/**", "/oauth2/**", "/ws/**") 
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/", "/login", "/ws/**", "/api/users/me").permitAll() 
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
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