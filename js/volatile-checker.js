/* === volatile-checker.js — Insurtech & Digital Risk Solutions ===
 * Monitors content freshness for volatile sections.
 * Checks review dates against current date and surfaces warnings.
 */
(function () {
    'use strict';

    var REVIEW_THRESHOLDS = {
        monthly: 30,
        quarterly: 90,
        biannual: 180
    };

    function daysBetween(dateStr1, dateStr2) {
        var d1 = new Date(dateStr1 + 'T00:00:00');
        var d2 = new Date(dateStr2 + 'T00:00:00');
        return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
    }

    function getTodayISO() {
        var d = new Date();
        return d.toISOString().split('T')[0];
    }

    function checkAllVolatileSections() {
        var sections = document.querySelectorAll('.stability-volatile[data-review-cycle][data-last-reviewed]');
        var today = getTodayISO();
        var stale = [];
        var warning = [];

        for (var i = 0; i < sections.length; i++) {
            var section = sections[i];
            var id = section.getAttribute('data-review-id') || 'unknown';
            var cycle = section.getAttribute('data-review-cycle');
            var lastReviewed = section.getAttribute('data-last-reviewed');
            var threshold = REVIEW_THRESHOLDS[cycle] || 90;
            var daysSince = daysBetween(lastReviewed, today);

            if (daysSince > threshold) {
                stale.push({ id: id, daysSince: daysSince, cycle: cycle, threshold: threshold });
            } else if (daysSince > threshold * 0.8) {
                warning.push({ id: id, daysSince: daysSince, cycle: cycle, threshold: threshold, remaining: threshold - daysSince });
            }
        }

        return { stale: stale, warning: warning, today: today };
    }

    function renderReviewBanner() {
        var results = checkAllVolatileSections();

        if (results.stale.length === 0 && results.warning.length === 0) return;

        var existingBanner = document.querySelector('.review-warning-banner');
        if (existingBanner) existingBanner.remove();

        var banner = document.createElement('div');
        banner.className = 'review-warning-banner';

        if (results.stale.length > 0) {
            banner.className += ' review-warning';
            banner.innerHTML =
                '<span class="warning-icon">&#9888;</span>' +
                '<div><strong>Content Review Overdue</strong><br>' +
                results.stale.length + ' volatile section(s) are past their review date. ' +
                'Data may be outdated. Last verified: ' + results.today + '.</div>';
        } else if (results.warning.length > 0) {
            banner.className += ' review-warning';
            banner.innerHTML =
                '<span class="warning-icon">&#128203;</span>' +
                '<div><strong>Review Approaching</strong><br>' +
                results.warning.length + ' section(s) due for review within ' +
                results.warning[0].remaining + ' days.</div>';
        }

        var main = document.querySelector('main');
        if (main) {
            main.insertBefore(banner, main.firstChild);
        }
    }

    // Export for use by common.js
    window.VolatileChecker = {
        check: checkAllVolatileSections,
        renderBanner: renderReviewBanner,
        getTodayISO: getTodayISO
    };

    // Auto-run on load
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        renderReviewBanner();
    } else {
        document.addEventListener('DOMContentLoaded', renderReviewBanner);
    }
})();
