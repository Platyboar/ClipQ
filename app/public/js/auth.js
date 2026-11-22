/**
 * auth.js — Twitch OAuth Implicit Grant Flow
 */
window.ClipQ = window.ClipQ || {};

ClipQ.CLIENT_ID = 'fvu8e09aa5f2xhomhll396ogkdyckb';

ClipQ.Auth = (() => {
    'use strict';

    const REDIRECT_URI = `${window.location.origin}/`;
    const TOKEN_KEY = 'clipq_token';
    const USER_KEY = 'clipq_user';
    const OBS_REDIRECT_KEY = 'clipq_obs_redirect';
    const OBS_KEY_PATH_RE = /^\/obs\/([A-Za-z0-9_-]{16,128})\/?$/i;
    let activeObsKey = null;

    function getUrlObsKey() {
        const match = window.location.pathname.match(OBS_KEY_PATH_RE);
        return match ? match[1] : null;
    }

    function isObsMode() {
        if (getUrlObsKey()) return true;
        const obsParam = new URLSearchParams(window.location.search).get('obs');
        if (obsParam === '0') return false;
        return obsParam === '1' || /^\/obs\/?$/i.test(window.location.pathname);
    }

    function setActiveObsKey(key) {
        activeObsKey = key || null;
    }

    function getActiveObsKey() {
        return activeObsKey;
    }

    function getLoginUrl() {
        try {
            if (isObsMode()) sessionStorage.setItem(OBS_REDIRECT_KEY, '1');
            else sessionStorage.removeItem(OBS_REDIRECT_KEY);
        } catch { /* ignore sessionStorage errors */ }
        const scopes = 'chat:read user:write:chat';
        return `https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=${ClipQ.CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}`;
    }

    function parseTokenFromHash() {
        const hash = window.location.hash.substring(1);
        if (!hash) return null;
        const params = new URLSearchParams(hash);
        const token = params.get('access_token');
        if (token) {
            try {
                localStorage.setItem(TOKEN_KEY, token);
            } catch { /* ignore storage quota errors */ }
            let restoreObs = false;
            try {
                restoreObs = sessionStorage.getItem(OBS_REDIRECT_KEY) === '1';
                sessionStorage.removeItem(OBS_REDIRECT_KEY);
            } catch { /* ignore sessionStorage errors */ }
            // Clean URL and restore /obs path after OAuth redirect back to origin root
            history.replaceState(null, '', restoreObs ? '/obs' : window.location.pathname);
            return token;
        }
        return null;
    }

    function getToken() {
        try {
            return localStorage.getItem(TOKEN_KEY);
        } catch {
            return null;
        }
    }

    async function fetchUser(token) {
        try {
            const res = await fetch('https://api.twitch.tv/helix/users', {
                headers: { 'Client-ID': ClipQ.CLIENT_ID, 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return null;
            const data = await res.json();
            if (data.data && data.data[0]) {
                const user = {
                    id: data.data[0].id,
                    login: data.data[0].login,
                    displayName: data.data[0].display_name,
                    avatar: data.data[0].profile_image_url
                };
                try {
                    localStorage.setItem(USER_KEY, JSON.stringify(user));
                } catch { /* ignore storage quota errors */ }
                return user;
            }
        } catch (e) {
            console.error('Failed to fetch user:', e);
        }
        return null;
    }

    function getUser() {
        try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
    }

    async function validate(token) {
        try {
            const res = await fetch('https://id.twitch.tv/oauth2/validate', {
                headers: { 'Authorization': `OAuth ${token}` }
            });
            if (!res.ok) {
                return { valid: false, unauthorized: res.status === 401 };
            }
            const data = await res.json().catch(() => null);
            const clientMismatch = Boolean(data?.client_id && data.client_id !== ClipQ.CLIENT_ID);
            return { valid: !clientMismatch, unauthorized: clientMismatch };
        } catch {
            return { valid: false, unauthorized: false };
        }
    }

    function clearSession() {
        activeObsKey = null;
        try {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        } catch { /* ignore storage errors */ }
    }

    function logout() {
        clearSession();
        try {
            localStorage.removeItem('clipq_language');
        } catch { /* ignore storage errors */ }
        window.location.reload();
    }

    return {
        getLoginUrl, parseTokenFromHash, getToken, fetchUser, getUser,
        validate, clearSession, logout, isObsMode, getUrlObsKey, setActiveObsKey, getActiveObsKey
    };
})();
