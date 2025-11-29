/**
 * Nexus Landing Page - Main JavaScript
 * Optimized for performance and accessibility
 * @version 1.0.0
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    
    // ===== STICKY HEADER FUNCTIONALITY =====
    /**
     * Enhances header with scroll-based styling changes
     * Improves visual feedback and compact navigation on scroll
     */
    function initStickyHeader() {
        const header = document.querySelector('header');
        
        window.addEventListener('scroll', function() {
            if (window.scrollY > 100) {
                header.style.padding = '10px 0';
                header.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.1)';
            } else {
                header.style.padding = '20px 0';
                header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
            }
        });
    }

    // ===== MOBILE MENU FUNCTIONALITY =====
    /**
     * Handles mobile menu toggle with accessibility features
     * Manages ARIA attributes for screen reader compatibility
     */
    function initMobileMenu() {
        const mobileMenu = document.querySelector('.mobile-menu');
        const navLinks = document.querySelector('.nav-links');
        
        if (!mobileMenu || !navLinks) return;
        
        mobileMenu.addEventListener('click', function() {
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            
            // Toggle menu visibility
            if (navLinks.style.display === 'flex') {
                navLinks.style.display = 'none';
                this.setAttribute('aria-expanded', 'false');
            } else {
                navLinks.style.display = 'flex';
                this.setAttribute('aria-expanded', 'true');
            }
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!navLinks.contains(event.target) && !mobileMenu.contains(event.target)) {
                navLinks.style.display = 'none';
                mobileMenu.setAttribute('aria-expanded', 'false');
            }
        });
        
        // Close menu on escape key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && navLinks.style.display === 'flex') {
                navLinks.style.display = 'none';
                mobileMenu.setAttribute('aria-expanded', 'false');
                mobileMenu.focus();
            }
        });
    }

    // ===== SMOOTH SCROLLING FUNCTIONALITY =====
    /**
     * Implements smooth scrolling for anchor links
     * Includes accessibility considerations and mobile menu handling
     */
    function initSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    // Calculate scroll position with header offset
                    const headerHeight = document.querySelector('header').offsetHeight;
                    const targetPosition = targetElement.offsetTop - headerHeight;
                    
                    // Perform smooth scroll
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                    
                    // Update URL without page jump
                    history.pushState(null, null, targetId);
                    
                    // Close mobile menu if open
                    if (window.innerWidth <= 768) {
                        const navLinks = document.querySelector('.nav-links');
                        const mobileMenu = document.querySelector('.mobile-menu');
                        if (navLinks && mobileMenu) {
                            navLinks.style.display = 'none';
                            mobileMenu.setAttribute('aria-expanded', 'false');
                        }
                    }
                    
                    // Focus management for accessibility
                    targetElement.setAttribute('tabindex', '-1');
                    targetElement.focus();
                    targetElement.removeAttribute('tabindex');
                }
            });
        });
    }

    // ===== TESTIMONIALS SLIDER FUNCTIONALITY =====
    /**
     * Simple testimonial slider with auto-rotation
     * Accessible with keyboard controls and ARIA labels
     */
    function initTestimonialsSlider() {
        const testimonials = document.querySelectorAll('.testimonial-card');
        if (testimonials.length <= 1) return; // No slider needed for single testimonial
        
        let currentTestimonial = 0;
        
        function showTestimonial(index) {
            testimonials.forEach((testimonial, i) => {
                testimonial.style.display = i === index ? 'block' : 'none';
                testimonial.setAttribute('aria-hidden', i !== index);
            });
            
            currentTestimonial = index;
        }
        
        // Auto-rotate testimonials every 5 seconds
        setInterval(() => {
            let nextIndex = (currentTestimonial + 1) % testimonials.length;
            showTestimonial(nextIndex);
        }, 5000);
        
        // Initialize first testimonial
        showTestimonial(0);
    }

    // ===== PERFORMANCE OPTIMIZATIONS =====
    /**
     * Implements performance optimizations
     * Includes lazy loading and intersection observer
     */
    function initPerformanceOptimizations() {
        // Lazy load images that are not in viewport
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });
            
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    // ===== ACCESSIBILITY ENHANCEMENTS =====
    /**
     * Adds additional accessibility features
     * Focus management and keyboard navigation improvements
     */
    function initAccessibilityFeatures() {
        // Add focus styles for keyboard navigation
        document.addEventListener('keyup', function(e) {
            if (e.key === 'Tab') {
                document.documentElement.classList.add('keyboard-navigation');
            }
        });
        
        document.addEventListener('mousedown', function() {
            document.documentElement.classList.remove('keyboard-navigation');
        });
        
        // Handle focus trapping for modal (if added in future)
        function trapFocus(element) {
            const focusableElements = element.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            element.addEventListener('keydown', function(e) {
                if (e.key === 'Tab') {
                    if (e.shiftKey) {
                        if (document.activeElement === firstElement) {
                            e.preventDefault();
                            lastElement.focus();
                        }
                    } else {
                        if (document.activeElement === lastElement) {
                            e.preventDefault();
                            firstElement.focus();
                        }
                    }
                }
            });
        }
    }

    // ===== FORM VALIDATION =====
    /**
     * Basic form validation utility
     * Can be extended for contact forms
     */
    function initFormValidation() {
        window.validateForm = function(form) {
            const inputs = form.querySelectorAll('input[required], textarea[required]');
            let isValid = true;
            
            inputs.forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    input.classList.add('error');
                    
                    // Add error message
                    if (!input.nextElementSibling || !input.nextElementSibling.classList.contains('error-message')) {
                        const errorMessage = document.createElement('span');
                        errorMessage.className = 'error-message';
                        errorMessage.textContent = 'This field is required';
                        errorMessage.style.cssText = 'color: red; font-size: 0.8rem; display: block; margin-top: 5px;';
                        input.parentNode.insertBefore(errorMessage, input.nextSibling);
                    }
                } else {
                    input.classList.remove('error');
                    const errorMessage = input.nextElementSibling;
                    if (errorMessage && errorMessage.classList.contains('error-message')) {
                        errorMessage.remove();
                    }
                }
            });
            
            return isValid;
        };
    }

    // ===== SCROLL ANIMATIONS =====
    /**
     * Basic scroll animation implementation
     * Can be enhanced with Intersection Observer API
     */
    function initScrollAnimations() {
        // Simple fade-in animation for elements
        const animateOnScroll = function() {
            const elements = document.querySelectorAll('.feature-card, .pricing-card, .testimonial-card');
            
            elements.forEach(element => {
                const elementTop = element.getBoundingClientRect().top;
                const elementVisible = 150;
                
                if (elementTop < window.innerHeight - elementVisible) {
                    element.style.opacity = "1";
                    element.style.transform = "translateY(0)";
                }
            });
        };
        
        // Set initial state for animated elements
        const animatedElements = document.querySelectorAll('.feature-card, .pricing-card, .testimonial-card');
        animatedElements.forEach(element => {
            element.style.opacity = "0";
            element.style.transform = "translateY(20px)";
            element.style.transition = "opacity 0.6s ease, transform 0.6s ease";
        });
        
        // Run on scroll and initial load
        window.addEventListener('scroll', animateOnScroll);
        animateOnScroll(); // Initial check
    }

    // ===== INITIALIZE ALL FUNCTIONALITY =====
    /**
     * Main initialization function
     * Sets up all features with error handling
     */
    function init() {
        try {
            initStickyHeader();
            initMobileMenu();
            initSmoothScrolling();
            initTestimonialsSlider();
            initPerformanceOptimizations();
            initAccessibilityFeatures();
            initFormValidation();
            initScrollAnimations();
            
            console.log('Nexus Landing Page initialized successfully');
        } catch (error) {
            console.error('Error initializing Nexus Landing Page:', error);
        }
    }

    // Start the application
    init();

});

// ===== PERFORMANCE MONITORING =====
/**
 * Performance monitoring utilities
 * Helps track Core Web Vitals in development
 */
if (typeof window !== 'undefined' && 'performance' in window) {
    // Log largest contentful paint
    new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
    }).observe({type: 'largest-contentful-paint', buffered: true});

    // Log cumulative layout shift
    new PerformanceObserver((entryList) => {
        let clsValue = 0;
        for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
                clsValue += entry.value;
            }
        }
        console.log('CLS:', clsValue);
    }).observe({type: 'layout-shift', buffered: true});
}

// ===== ERROR HANDLING =====
/**
 * Global error handler for better debugging
 */
window.addEventListener('error', function(e) {
    console.error('Script Error:', e.error);
});

/**
 * Promise rejection handler
 */
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled Promise Rejection:', e.reason);
});