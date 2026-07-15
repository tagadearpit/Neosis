package com.neosis.config;

import com.neosis.model.User;
import com.neosis.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final UserRepository userRepository;

    @Value("${app.frontend.url:https://neosis-static-site.onrender.com}")
    private String frontendUrl;

    public SecurityConfig(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        String cleanFrontendUrl = frontendUrl.endsWith("/")
            ? frontendUrl.substring(0, frontendUrl.length() - 1)
            : frontendUrl;

        config.setAllowedOrigins(Arrays.asList("http://localhost:5173", cleanFrontendUrl));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList(
            "Authorization", "Cache-Control", "Content-Type", "X-XSRF-TOKEN", "X-CSRF-TOKEN",
            "Accept", "Origin", "X-Requested-With"
        ));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        AuthenticationEntryPoint apiUnauthorized = new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED);

        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf
                .csrfTokenRepository(new HttpSessionCsrfTokenRepository())
                .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                .ignoringRequestMatchers("/login/**", "/oauth2/**", "/ws/**")
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/", "/login/**", "/oauth2/**", "/error", "/ws/**").permitAll()
                .requestMatchers(HttpMethod.GET,
                    "/api/csrf", "/api/users/me", "/actuator/health", "/actuator/health/**"
                ).permitAll()
                .anyRequest().authenticated()
            )
            .exceptionHandling(exceptions -> exceptions
                .defaultAuthenticationEntryPointFor(apiUnauthorized, new AntPathRequestMatcher("/api/**"))
                .accessDeniedHandler((request, response, exception) -> {
                    response.setStatus(HttpStatus.FORBIDDEN.value());
                    response.setContentType("application/json");
                    if (exception instanceof CsrfException) {
                        response.getWriter().write("{\"error\":\"Invalid or expired CSRF token\",\"code\":\"CSRF_INVALID\"}");
                    } else {
                        response.getWriter().write("{\"error\":\"Access denied\"}");
                    }
                })
            )
            .sessionManagement(session -> session
                .sessionFixation(fixation -> fixation.changeSessionId())
            )
            .logout(logout -> logout
                .logoutUrl("/logout")
                .invalidateHttpSession(true)
                .clearAuthentication(true)
                .deleteCookies("NEOSIS_SESSION", "JSESSIONID", "XSRF-TOKEN")
                .logoutSuccessHandler((request, response, authentication) -> response.setStatus(HttpStatus.NO_CONTENT.value()))
            )
            .oauth2Login(oauth2 -> oauth2
                .successHandler((request, response, authentication) -> {
                    OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();
                    String email = normalizeEmail(oauthUser.getAttribute("email"));
                    String googleName = oauthUser.getAttribute("name");

                    if (email == null) {
                        response.sendError(HttpStatus.BAD_REQUEST.value(), "Google account did not provide an email address");
                        return;
                    }

                    User user = userRepository.findByEmailIgnoreCase(email);
                    if (user == null) {
                        user = new User();
                        user.setEmail(email);
                        user.setName(googleName);
                        user.setCreatedAt(LocalDateTime.now());
                        user.setUpdatedAt(LocalDateTime.now());
                        userRepository.save(user);
                    } else if (!user.isNameCustomized() && googleName != null && !googleName.equals(user.getName())) {
                        user.setName(googleName);
                        user.setUpdatedAt(LocalDateTime.now());
                        userRepository.save(user);
                    }

                    // User destinations depend on Principal#getName(). Keep it equal to the normalized email.
                    OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
                    Map<String, Object> normalizedAttributes = new HashMap<>(oauthUser.getAttributes());
                    normalizedAttributes.put("email", email);
                    DefaultOAuth2User emailPrincipal = new DefaultOAuth2User(
                        oauthUser.getAuthorities(),
                        normalizedAttributes,
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
