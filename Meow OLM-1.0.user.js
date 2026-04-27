// ==UserScript==
// @name         Meow OLM
// @namespace    https://olm.vn
// @version      1.0
// @description  Meow OLM Auto Solver
// @author       Meow
// @match        https://olm.vn/*
// @icon         https://emojicdn.elk.sh/🐱‍💻
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      meowolm.meowhackerunlimited.workers.dev
// ==/UserScript==

(function() {
    'use strict';

    const WORKER = 'https://meowolm.meowhackerunlimited.workers.dev';

    function getOLMUsername() {
        const cm = document.cookie.match(/user=([^;]+)/);
        if (cm) {
            try {
                const d = JSON.parse(decodeURIComponent(cm[1]));
                return d.username || d.name || '';
            } catch(e) {}
        }
        const m = document.body.innerHTML.match(/"username"\s*:\s*"([^"]+)"/);
        if (m) return m[1];
        return '';
    }

    function showNoAccessPopup() {
        // Xóa popup cũ nếu có
        const old = document.getElementById('meow-noaccess-popup');
        if (old) old.remove();

        const popup = document.createElement('div');
        popup.id = 'meow-noaccess-popup';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 999999;
            background: #1a1510;
            border: 2px solid #D4A017;
            border-radius: 16px;
            padding: 30px;
            text-align: center;
            color: #e8d8b0;
            font-family: Georgia, serif;
            font-size: 14px;
            box-shadow: 0 0 50px rgba(212,160,23,0.3);
            max-width: 400px;
            width: 90%;
        `;

        popup.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 12px;">😿</div>
            <h2 style="color: #D4A017; font-size: 18px; margin-bottom: 12px;">Meow OLM</h2>
            <p style="color: #e8d8b0; line-height: 1.6; margin-bottom: 16px;">
                Bạn không có trong danh sách<br>
                những người <b style="color: #D4A017;">siêu ngầu</b>! 😿
            </p>
            <p style="color: #8a7a5a; font-size: 13px; margin-bottom: 16px;">
                Vui lòng liên hệ số điện thoại<br>
                <a href="tel:0339185635" style="color: #D4A017; font-size: 18px; font-weight: bold; text-decoration: none;">📞 0339185635</a><br>
                để đăng kí!
            </p>
            <div style="font-size: 36px;">🐱‍💻</div>
            <button onclick="document.getElementById('meow-noaccess-popup').remove()" style="
                margin-top: 16px;
                padding: 10px 24px;
                background: linear-gradient(135deg, #8B6914, #D4A017);
                color: #000;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                font-size: 14px;
            ">ĐÃ HIỂU</button>
        `;

        document.body.appendChild(popup);
    }

    async function getJWT(username) {
        const cached = GM_getValue('meow_jwt', '');
        const cachedUser = GM_getValue('meow_jwt_user', '');

        if (cached && cachedUser === username) {
            try {
                const payload = JSON.parse(atob(cached.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
                if (payload.exp && Date.now() < payload.exp) return cached;
            } catch(e) {}
        }

        const resp = await fetch(WORKER + '/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username })
        });

        if (!resp.ok) return null;

        const data = await resp.json();
        if (data.ok && data.token) {
            GM_setValue('meow_jwt', data.token);
            GM_setValue('meow_jwt_user', username);
            return data.token;
        }
        return null;
    }

    async function init() {
        const username = getOLMUsername();
        if (!username) {
            console.log('[Meow] ❌ Không đọc được username OLM!');
            showNoAccessPopup();
            return;
        }

        const jwt = await getJWT(username);
        if (!jwt) {
            console.log('[Meow] ❌ Không có quyền truy cập!');
            showNoAccessPopup();
            return;
        }

        try {
            const verResp = await fetch(WORKER + '/api/version', {
                headers: { 'Authorization': 'Bearer ' + jwt }
            });
            const { version } = await verResp.json();
            const cachedVer = GM_getValue('meow_ver', '');

            let code;
            if (version !== cachedVer || !GM_getValue('meow_core', '')) {
                console.log('[Meow] 🔄 Đang tải v' + version);
                const resp = await fetch(WORKER + '/api/core', {
                    headers: { 'Authorization': 'Bearer ' + jwt }
                });
                if (!resp.ok) throw new Error('Forbidden');
                code = await resp.text();
                GM_setValue('meow_core', code);
                GM_setValue('meow_ver', version);
                console.log('[Meow] ✅ Đã cập nhật!');
            } else {
                code = GM_getValue('meow_core', '');
                console.log('[Meow] 📦 Cache v' + cachedVer);
            }

            const script = document.createElement('script');
            script.textContent = code;
            document.head.appendChild(script);
            console.log('[Meow] 😺 Sẵn sàng!');
        } catch(e) {
            console.log('[Meow] ⚠️ Lỗi:', e.message);
            const cached = GM_getValue('meow_core', '');
            if (cached) {
                const script = document.createElement('script');
                script.textContent = cached;
                document.head.appendChild(script);
            }
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();