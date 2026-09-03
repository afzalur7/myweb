/* === common.js — Insurtech & Digital Risk Solutions ===
 * Shared utilities: header/footer injection, theme toggle, data table loading,
 * navigation highlighting, and volatile content checker integration.
 */

(function () {
    'use strict';

    /* --- Path Resolution ---
     * Figure out how deep we are relative to site root.
     * index.html → ./ (root)
     * content/chapters/chapter-XX.html → ../../
     */
    function getRootPath() {
        var path = window.location.pathname;
        var depth = 0;
        if (path.indexOf('/content/sessions/') !== -1) depth = 2;
        else if (path.indexOf('/content/') !== -1) depth = 1;
        if (depth === 0) return '.';
        var parts = [];
        for (var i = 0; i < depth; i++) parts.push('..');
        return parts.join('/');
    }

    var ROOT = getRootPath();

    /* --- Header / Footer Injection --- */
    function loadInclude(selector, url) {
        var container = document.querySelector(selector);
        if (!container) return;
        fetch(url)
            .then(function (r) {
                if (!r.ok) throw new Error('Failed to load: ' + url);
                return r.text();
            })
            .then(function (html) {
                container.innerHTML = html;
                fixIncludePaths(container);
                initThemeToggle();
                highlightCurrentNav();
            })
            .catch(function (err) {
                console.warn('Include load error:', err.message);
            });
    }

    function fixIncludePaths(container) {
        var attrs = ['href', 'src'];
        var elements = container.querySelectorAll('a, img, link, script');
        for (var i = 0; i < elements.length; i++) {
            var el = elements[i];
            for (var j = 0; j < attrs.length; j++) {
                var attr = attrs[j];
                var val = el.getAttribute(attr);
                if (val && val.indexOf('../') === 0 && ROOT !== '.') {
                    el.setAttribute(attr, ROOT + '/' + val.replace(/^\.\.\//, ''));
                } else if (val && val.indexOf('./') !== 0 && val.indexOf('http') !== 0 && val.indexOf('/') !== 0 && ROOT !== '.') {
                    // relative without prefix — only fix if we're in a subdirectory and the path is relative
                    if (attr === 'href' && el.tagName === 'A' && val.indexOf('#') !== 0 && val.indexOf('index.html') === 0) {
                        el.setAttribute(attr, ROOT + '/' + val);
                    } else if (attr === 'src' && val.indexOf('assets/') === 0) {
                        el.setAttribute(attr, ROOT + '/' + val);
                    }
                }
            }
        }
    }

    /* --- Theme Toggle --- */
    function initThemeToggle() {
        var toggle = document.getElementById('theme-toggle');
        if (!toggle) return;

        // Remove any existing listeners by cloning
        var newToggle = toggle.cloneNode(true);
        toggle.parentNode.replaceChild(newToggle, toggle);
        toggle = newToggle;

        // Load saved preference
        var saved = localStorage.getItem('theme');
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
        }

        toggle.addEventListener('click', function () {
            var current = document.documentElement.getAttribute('data-theme');
            var next = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        });
    }

    /* --- Active Nav Highlighting --- */
    function highlightCurrentNav() {
        var currentPath = window.location.pathname;
        var navLinks = document.querySelectorAll('.header-nav a');
        for (var i = 0; i < navLinks.length; i++) {
            var href = navLinks[i].getAttribute('href');
            if (href && href !== '#' && href !== '../index.html' && href !== 'index.html') {
                if (currentPath.indexOf(href.replace(/^\.\.\//, '').replace(/^\.\//, '')) !== -1) {
                    navLinks[i].classList.add('active');
                }
            }
            if ((href === 'index.html' || href === '../index.html') && (currentPath.endsWith('index.html') || currentPath.endsWith('/'))) {
                navLinks[i].classList.add('active');
            }
        }
    }

    /* --- Data Table Loading ---
     * Loads data from an inline registry (window.DATA_TABLES) first so tables
     * work when opened directly from disk (file:// protocol blocks fetch()).
     * Falls back to fetch() from /data/*.json when deployed to S3/HTTP.
     * data-table may be a dotted path, e.g. "comparisons.traditionalVsDigital".
     */
    function loadDataTables() {
        var containers = document.querySelectorAll('.data-table-container[data-source]');
        for (var i = 0; i < containers.length; i++) {
            (function (container) {
                var source = container.getAttribute('data-source');
                var table = container.getAttribute('data-table');

                // 1. Prefer inline data (works on file:// — no fetch needed)
                var inline = window.DATA_TABLES && window.DATA_TABLES[source];
                if (inline) {
                    renderTableFromData(container, inline, table);
                    return;
                }

                // 2. Fall back to fetch (works when served over HTTP/S3)
                var url = ROOT + '/data/' + source + '.json';
                fetch(url)
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                        renderTableFromData(container, data, table);
                    })
                    .catch(function () {
                        container.innerHTML = '<p class="text-muted">Data table unavailable. Please check your connection.</p>';
                    });
            })(containers[i]);
        }
    }

    function renderTableFromData(container, data, table) {
        var rows = data;

        // Resolve dotted path, e.g. "comparisons.traditionalVsDigital"
        if (table) {
            var keys = String(table).split('.');
            for (var k = 0; k < keys.length; k++) {
                if (rows && typeof rows === 'object' && rows[keys[k]] !== undefined) {
                    rows = rows[keys[k]];
                } else {
                    rows = undefined;
                    break;
                }
            }
            if (rows === undefined || rows === null) rows = data; // fall back to whole object
        }

        // If it is an object containing arrays (e.g. { traditionalVsDigital: [...] }),
        // use the first array found.
        if (!Array.isArray(rows) && rows && typeof rows === 'object') {
            var arrKeys = Object.keys(rows);
            for (var a = 0; a < arrKeys.length; a++) {
                if (Array.isArray(rows[arrKeys[a]])) { rows = rows[arrKeys[a]]; break; }
            }
        }

        if (!Array.isArray(rows)) rows = [rows];
        renderDataTable(container, rows);
    }

    function renderDataTable(container, rows) {
        if (!rows.length) {
            container.innerHTML = '<p class="text-muted">No data available.</p>';
            return;
        }
        // Optional ordered column whitelist via data-columns="a,b,c" on the
        // container, so internal keys (id, url, lastVerified...) stay hidden.
        // Without the attribute, all keys of the first row are shown.
        var wanted = container.getAttribute('data-columns');
        var cols = wanted
            ? wanted.split(',').map(function (c) { return c.trim(); }).filter(Boolean)
            : Object.keys(rows[0]);
        var html = '<table class="comparison-table"><thead><tr>';
        for (var i = 0; i < cols.length; i++) {
            html += '<th>' + escapeHtml(formatColumnName(cols[i])) + '</th>';
        }
        html += '</tr></thead><tbody>';
        for (var r = 0; r < rows.length; r++) {
            html += '<tr>';
            for (var c = 0; c < cols.length; c++) {
                var val = rows[r][cols[c]];
                if (val === null || val === undefined) val = '—';
                else if (typeof val === 'boolean') val = val ? '✓' : '✗';  // ✓ / ✗ — text, not entities (escapeHtml would print entities literally)
                // Years and other small counts stay plain ("2008", not "2,008");
                // large figures get thousands separators.
                else if (typeof val === 'number') val = (Math.abs(val) < 10000) ? String(val) : val.toLocaleString();
                else if (Array.isArray(val)) val = val.join(', ');
                html += '<td>' + escapeHtml(String(val)) + '</td>';
            }
            html += '</tr>';
        }
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    function formatColumnName(name) {
        return name
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')   // camelCase boundary
            .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')  // acronym + word (KYC stays KYC)
            .replace(/_/g, ' ')
            .replace(/^./, function (s) { return s.toUpperCase(); })
            .trim();
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    /* --- Review Warning for Stale Content --- */
    function checkVolatileContent() {
        var volatileSections = document.querySelectorAll('.stability-volatile[data-review-cycle]');
        var now = new Date();
        var warnings = [];

        for (var i = 0; i < volatileSections.length; i++) {
            var section = volatileSections[i];
            var lastReviewed = section.getAttribute('data-last-reviewed');
            var cycle = section.getAttribute('data-review-cycle');
            if (!lastReviewed || !cycle) continue;

            var reviewDate = new Date(lastReviewed + 'T00:00:00');
            var daysSinceReview = (now - reviewDate) / (1000 * 60 * 60 * 24);
            var threshold = cycle === 'monthly' ? 30 : cycle === 'quarterly' ? 90 : 180;

            if (daysSinceReview > threshold) {
                var id = section.getAttribute('data-review-id');
                warnings.push({ id: id, daysSince: Math.round(daysSinceReview), cycle: cycle });
            }
        }

        if (warnings.length > 0 && typeof showToast === 'function') {
            showToast(
                warnings.length + ' section(s) may contain outdated information. Content review is overdue.',
                'warning'
            );
        }
    }

    /* --- Toast Notifications --- */
    window.showToast = function (message, type) {
        var container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        var toast = document.createElement('div');
        toast.className = 'toast alert-' + (type || 'info');
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(function () {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(function () { toast.remove(); }, 300);
        }, 4000);
    };

    /* --- Active Tab Persistence --- */
    function initTabs() {
        var tabContainers = document.querySelectorAll('[data-tabs]');
        for (var i = 0; i < tabContainers.length; i++) {
            (function (container) {
                var buttons = container.querySelectorAll('.tab-btn');
                var panels = container.querySelectorAll('.tab-panel');
                for (var j = 0; j < buttons.length; j++) {
                    buttons[j].addEventListener('click', function () {
                        var target = this.getAttribute('data-tab');
                        for (var k = 0; k < buttons.length; k++) buttons[k].classList.remove('active');
                        for (var k = 0; k < panels.length; k++) panels[k].classList.remove('active');
                        this.classList.add('active');
                        var panel = container.querySelector('[data-panel="' + target + '"]');
                        if (panel) panel.classList.add('active');
                    });
                }
            })(tabContainers[i]);
        }
    }

    /* --- Accordion Init --- */
    function initAccordions() {
        var headers = document.querySelectorAll('.accordion-header');
        for (var i = 0; i < headers.length; i++) {
            headers[i].addEventListener('click', function () {
                var accordion = this.parentElement;
                accordion.classList.toggle('open');
            });
        }
    }

    /* --- Code Copy Buttons --- */
    function initCodeCopy() {
        var blocks = document.querySelectorAll('pre code');
        for (var i = 0; i < blocks.length; i++) {
            (function (codeEl) {
                var pre = codeEl.parentElement;
                var wrapper = document.createElement('div');
                wrapper.className = 'code-block-wrapper';

                var header = document.createElement('div');
                header.className = 'code-block-header';

                var lang = codeEl.className.replace('language-', '') || 'code';
                var label = document.createElement('span');
                label.textContent = lang;
                header.appendChild(label);

                var btn = document.createElement('button');
                btn.className = 'copy-btn';
                btn.textContent = 'Copy';
                btn.addEventListener('click', function () {
                    var text = codeEl.textContent;
                    navigator.clipboard.writeText(text).then(function () {
                        btn.textContent = 'Copied!';
                        setTimeout(function () { btn.textContent = 'Copy'; }, 2000);
                    }).catch(function () {
                        btn.textContent = 'Failed';
                        setTimeout(function () { btn.textContent = 'Copy'; }, 2000);
                    });
                });
                header.appendChild(btn);

                pre.parentNode.insertBefore(wrapper, pre);
                wrapper.appendChild(header);
                wrapper.appendChild(pre);
            })(blocks[i]);
        }
    }

    /* --- Filter Bar --- */
    function initFilters() {
        var filterInputs = document.querySelectorAll('.filter-input[data-filter-target]');
        for (var i = 0; i < filterInputs.length; i++) {
            filterInputs[i].addEventListener('input', function () {
                var target = this.getAttribute('data-filter-target');
                var query = this.value.toLowerCase();
                var items = document.querySelectorAll(target);
                for (var j = 0; j < items.length; j++) {
                    var text = items[j].textContent.toLowerCase();
                    items[j].style.display = text.indexOf(query) !== -1 ? '' : 'none';
                }
            });
        }
    }

    /* --- Smooth Scroll for Anchor Links --- */
    function initSmoothScroll() {
        document.addEventListener('click', function (e) {
            var link = e.target.closest('a[href^="#"]');
            if (!link) return;
            var target = document.querySelector(link.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    /* --- Boot --- */
    function boot() {
        loadInclude('#header-container', ROOT + '/includes/header.html');
        loadInclude('#footer-container', ROOT + '/includes/footer.html');
        initSmoothScroll();
        document.addEventListener('DOMContentLoaded', function () {
            loadDataTables();
            initTabs();
            initAccordions();
            initCodeCopy();
            initFilters();
            checkVolatileContent();
        });
        // Also run immediately in case DOMContentLoaded already fired
        if (document.readyState === 'interactive' || document.readyState === 'complete') {
            loadDataTables();
            initTabs();
            initAccordions();
            initCodeCopy();
            initFilters();
            checkVolatileContent();
        }
    }

    boot();
})();
