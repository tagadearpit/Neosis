package com.neosis.config;

import com.neosis.model.User;
import com.neosis.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Locale;

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
        String cleanFrontendUrl = frontendUrl.endsWith("/")
            ? frontendUrl.substring(0, frontendUrl.length() - 1)
            : frontendUrl;

        config.setAllowedOrigins(Arrays.asList("http://localhost:5173", cleanFrontendUrl));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("Authorization", "Cache-Control", "Content-Type", "X-XSRF-TOKEN", "Accept", "Origin", "X-Requested-With"));
        config.setExposedHeaders(Arrays.asList("Set-Cookie", "X-XSRF-TOKEN"));
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
                // Keep WebSocket/OAuth redirects CSRF-exempt, but protect state-changing REST APIs.
                .ignoringRequestMatchers("/login/**", "/oauth2/**", "/ws/**")
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/", "/login", "/ws/**", "/api/csrf", "/api/users/me").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .authorizationEndpoint(authEndpoint -> authEndpoint
                    .authorizationRequestRepository(cookieAuthorizationRequestRepository)
                )
                .successHandler((request, response, authentication) -> {
                    OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
                    String email = normalizeEmail(oAuth2User.getAttribute("email"));
                    String name = oAuth2User.getAttribute("name");

                    User user = userRepository.findByEmailIgnoreCase(email);
                    if (user == null) {
                        user = new User();
                        user.setEmail(email);
                        user.setName(name);
                        user.setCreatedAt(LocalDateTime.now());
                        userRepository.save(user);
                    } else if (name != null && !name.equals(user.getName())) {
                        user.setName(name);
                        userRepository.save(user);
                    }

                    // Force Principal.getName() to be the email. This is required for convertAndSendToUser().
                    OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
                    DefaultOAuth2User emailPrincipal = new DefaultOAuth2User(
                        oAuth2User.getAuthorities(),
                        oAuth2User.getAttributes(),
                        "email"
                    );
                    OAuth2AuthenticationToken emailAuthentication = new OAuth2AuthenticationToken(
                        emailPrincipal,
                        emailPrincipal.getAuthorities(),
                        oauthToken.getAuthorizedClientRegistrationId()
                    );
                    emailAuthentication.setDetails(authentication.getDetails());

                    SecurityContext context = SecurityContextHolder.createEmptyContext();
                    context.setAuthentication(emailAuthentication);
                    SecurityContextHolder.setContext(context);

                    request.getSession(true).setAttribute(
                        HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                        context
                    );

                    response.sendRedirect(frontendUrl + "/chat");
                })
            );

        return http.build();
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
