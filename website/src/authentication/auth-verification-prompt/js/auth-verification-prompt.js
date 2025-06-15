// Skip verification and go to dashboard
function skipVerification() {
    window.location.href = '/dashboard-overview/dashboard-home-page/';
}

// Check if user came from signup
document.addEventListener('DOMContentLoaded', function() {
    // If user didn't come from signup, redirect to dashboard
    const referrer = document.referrer;
    if (!referrer.includes('auth-signup-page')) {
        // Could show this page from settings or other contexts
        // For now, we'll allow it from anywhere
    }
});