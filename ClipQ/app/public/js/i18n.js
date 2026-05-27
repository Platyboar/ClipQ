/**
 * i18n.js — Lightweight internationalization system for ClipQ
 * Manages language translations, persistence, and DOM updates.
 */
window.ClipQ = window.ClipQ || {};

ClipQ.I18n = (() => {
    const LANG_KEY = 'clipq_language';
    let currentLang = 'en';
    const translations = {};

    /**
     * Register a language with its translation strings.
     * Called from each lang/*.js file.
     */
    function register(langCode, strings) {
        translations[langCode] = strings;
    }

    /**
     * Set the active language and persist the choice.
     * Triggers a DOM update for all data-i18n elements.
     */
    function setLanguage(lang) {
        if (translations[lang]) {
            currentLang = lang;
            localStorage.setItem(LANG_KEY, lang);
            applyToDOM();
        }
    }

    /** Get the current active language code */
    function getLanguage() {
        return currentLang;
    }

    /** Get the saved language from localStorage (before init) */
    function getSavedLanguage() {
        return localStorage.getItem(LANG_KEY);
    }

    /** Check if a language has been saved */
    function hasLanguage() {
        return localStorage.getItem(LANG_KEY) !== null;
    }

    /**
     * Translate a key, with optional parameter substitution.
     * Falls back to English, then to the raw key.
     * @param {string} key - Translation key (e.g. 'queue.empty')
     * @param {object} [params] - Parameters for substitution: {count} → replaces {count}
     * @returns {string}
     */
    function t(key, params) {
        let str = translations[currentLang]?.[key]
            || translations['en']?.[key]
            || key;
        if (params) {
            str = str.replace(/\{(\w+)\}/g, (match, k) => {
                return params[k] !== undefined ? params[k] : match;
            });
        }
        return str;
    }

    /**
     * Get all available languages with their display names.
     * @returns {Array<{code: string, name: string}>}
     */
    function getAvailableLanguages() {
        return Object.keys(translations).map(code => ({
            code,
            name: translations[code]._name || code,
            flag: translations[code]._flag || ''
        }));
    }

    /**
     * Apply translations to all DOM elements with data-i18n attributes.
     * Also handles data-i18n-placeholder, data-i18n-title, data-i18n-html.
     */
    function applyToDOM() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = t(key);
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
        });
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            el.title = t(el.getAttribute('data-i18n-title'));
        });
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            el.innerHTML = t(key);
        });
    }

    // Auto-initialize: restore saved language
    const saved = localStorage.getItem(LANG_KEY);
    if (saved) currentLang = saved;

    return { register, setLanguage, getLanguage, getSavedLanguage, hasLanguage, t, getAvailableLanguages, applyToDOM };
})();
