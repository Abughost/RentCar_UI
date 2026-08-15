/**
 * Every icon and car silhouette in the product, as one inline <svg> sprite.
 * Mounted once at the app root; <Icon> and <CarArt> reference the symbols by id.
 * Paths are copied verbatim from km0-rental-design.html.
 */
export default function Sprite() {
  return (
    <svg className="sprite" aria-hidden="true">
      {/* ---- car silhouettes ---- */}
      <symbol id="c-sedan" viewBox="0 0 200 78">
        <path d="M10 58 L12 45c1-5 6-7 15-8l32-2 22-16c4-3 9-4 14-4h27c6 0 11 2 15 6l16 14 28 3c8 1 12 5 12 11v9c0 3-2 5-5 5H15c-3 0-5-2-5-5z" />
        <path d="M66 35l18-13c2-2 5-3 8-3h9v16zM104 35V19h20c4 0 7 1 10 4l13 12z" opacity=".26" />
      </symbol>
      <symbol id="c-suv" viewBox="0 0 200 78">
        <path d="M9 58V38c0-6 4-10 12-11l30-3 18-13c4-3 8-4 13-4h39c6 0 10 2 14 5l17 12 32 4c8 1 12 5 12 11v19c0 3-2 5-5 5H14c-3 0-5-2-5-5z" />
        <path d="M58 26l14-10c2-2 5-3 8-3h12v13zM102 26V13h22c4 0 7 1 10 3l13 10z" opacity=".26" />
      </symbol>
      <symbol id="c-hatch" viewBox="0 0 200 78">
        <path d="M12 58 L14 44c1-5 5-7 13-8l30-2 21-15c4-3 8-4 13-4h30c6 0 10 2 14 6l20 18 21 3c8 1 12 5 12 11v5c0 3-2 5-5 5H17c-3 0-5-2-5-5z" />
        <path d="M64 34l17-12c2-2 5-3 8-3h8v15zM101 34V19h17c4 0 7 1 10 4l12 11z" opacity=".26" />
      </symbol>
      <symbol id="c-van" viewBox="0 0 200 78">
        <path d="M8 58V26c0-6 4-10 11-10h100c5 0 9 2 12 6l24 28 33 3c7 1 10 4 10 9v-1c0 3-2 5-5 5H13c-3 0-5-2-5-5z" />
        <path d="M30 24h34v18H30zM76 24h30c3 0 5 1 7 3l12 15H76z" opacity=".26" />
      </symbol>

      {/* ---- interface icons ---- */}
      <symbol id="i-seat" viewBox="0 0 24 24"><path d="M6 4v9a3 3 0 0 0 3 3h6M6 20h11a2 2 0 0 0 2-2v-2" /></symbol>
      <symbol id="i-gear" viewBox="0 0 24 24"><path d="M7 4v16M7 12h10M17 4v16M12 4v8" /><circle cx="7" cy="4" r="1.6" /></symbol>
      <symbol id="i-fuel" viewBox="0 0 24 24"><path d="M4 20V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14M3 20h12M6 10h6M17 9l3 3v6a1.5 1.5 0 0 1-3 0V9z" /></symbol>
      <symbol id="i-bolt" viewBox="0 0 24 24"><path d="M13 3 4 14h7l-1 7 9-11h-7z" /></symbol>
      <symbol id="i-bag" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></symbol>
      <symbol id="i-door" viewBox="0 0 24 24"><path d="M4 20h16M6 20V6l10-2v16M13 12v2" /></symbol>
      <symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></symbol>
      <symbol id="i-cal" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></symbol>
      <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></symbol>
      <symbol id="i-check" viewBox="0 0 24 24"><path d="M4 12.5 9.5 18 20 6.5" /></symbol>
      <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></symbol>
      <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m16.5 16.5 4 4" /></symbol>
      <symbol id="i-chev" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></symbol>
      <symbol id="i-chevD" viewBox="0 0 24 24"><path d="m5 9 7 7 7-7" /></symbol>
      <symbol id="i-key" viewBox="0 0 24 24"><circle cx="8" cy="12" r="4.5" /><path d="M12.5 12H21M18 12v3.5M15.5 12v2.5" /></symbol>
      <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3 5 6v6c0 4.5 3 7.8 7 9 4-1.2 7-4.5 7-9V6z" /></symbol>
      <symbol id="i-card" viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19M6 15h4" /></symbol>
      <symbol id="i-route" viewBox="0 0 24 24"><circle cx="5.5" cy="6" r="2.5" /><circle cx="18.5" cy="18" r="2.5" /><path d="M8 6h6.5a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h1" /></symbol>
      <symbol id="i-star" viewBox="0 0 24 24"><path d="m12 3.5 2.6 5.5 6 .8-4.3 4.3 1 6-5.3-2.9L6.7 20l1-6L3.4 9.8l6-.8z" /></symbol>
      <symbol id="i-doc" viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></symbol>
      <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></symbol>
      <symbol id="i-slider" viewBox="0 0 24 24"><path d="M4 8h10M18 8h2M4 16h4M12 16h8" /><circle cx="16" cy="8" r="2" /><circle cx="10" cy="16" r="2" /></symbol>
      <symbol id="i-out" viewBox="0 0 24 24"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h11" /></symbol>
      <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" /></symbol>
      <symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></symbol>

      {/* ---- theme switch ---- */}
      <symbol id="i-sun" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
      </symbol>
      <symbol id="i-moon" viewBox="0 0 24 24">
        <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z" />
      </symbol>
      <symbol id="i-system" viewBox="0 0 24 24">
        <rect x="2.5" y="4" width="19" height="13" rx="2" />
        <path d="M8.5 21h7M12 17v4" />
      </symbol>
    </svg>
  )
}
