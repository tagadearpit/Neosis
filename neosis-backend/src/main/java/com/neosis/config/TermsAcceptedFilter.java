package com.neosis.config;

import com.neosis.model.User;
import com.neosis.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Locale;

@Component
public class TermsAcceptedFilter extends OncePerRequestFilter {

    public static final String SESSION_ATTRIBUTE = "NEOSIS_TERMS_ACCEPTED";

    private final UserRepository userRepository;

    public TermsAcceptedFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (!path.startsWith("/api/")) return true;
        if (path.equals("/api/csrf")) return true;
        if (path.equals("/api/users/accept-terms")) return true;
        if (path.equals("/api/users/me")) {
            return "GET".equalsIgnoreCase(request.getMethod()) || "DELETE".equalsIgnoreCase(request.getMethod());
        }
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication.getName() == null) {
            filterChain.doFilter(request, response);
            return;
        }

        HttpSession session = request.getSession(false);
        if (session != null && Boolean.TRUE.equals(session.getAttribute(SESSION_ATTRIBUTE))) {
            filterChain.doFilter(request, response);
            return;
        }

        String email = authentication.getName().trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(email);
        if (user != null && user.isTermsAccepted()) {
            if (session != null) session.setAttribute(SESSION_ATTRIBUTE, true);
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setHeader("Cache-Control", "no-store");
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"Accept the terms before using Neosis.\",\"code\":\"TERMS_REQUIRED\"}");
    }
}
