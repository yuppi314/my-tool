// Original illustrated face icons for the three tipster characters.
// Not modeled on any real person.
const TIPSTER_FACES = {
  databall: `
    <circle class="ta-bg" cx="20" cy="20" r="20"/>
    <g transform="translate(-14,-8.9) scale(1.7)">
      <circle cx="20" cy="17" r="8" fill="#fbf6ea"/>
      <path d="M12,13 C12,7 16,4 20,4 C24,4 28,7 28,13 C28,10 24,9 20,9 C16,9 12,10 12,13 Z" fill="#221a12"/>
      <rect x="12.6" y="16" width="5.6" height="4.2" rx="1.3" fill="none" stroke="#221a12" stroke-width="1.2"/>
      <rect x="21.8" y="16" width="5.6" height="4.2" rx="1.3" fill="none" stroke="#221a12" stroke-width="1.2"/>
      <line x1="18.2" y1="18" x2="21.8" y2="18" stroke="#221a12" stroke-width="1.2"/>
      <path d="M17,23.5 Q20,24.5 23,23.5" stroke="#221a12" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    </g>`,
  ketto: `
    <circle class="ta-bg" cx="20" cy="20" r="20"/>
    <g transform="translate(-14,-8.9) scale(1.7)">
      <circle cx="20" cy="17" r="8" fill="#fbf6ea"/>
      <path d="M11,12 Q9,15 11,18.5" stroke="#221a12" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      <path d="M29,12 Q31,15 29,18.5" stroke="#221a12" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      <path d="M13,14.2 Q16,12.6 19,14.2" stroke="#221a12" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      <path d="M21,14.2 Q24,12.6 27,14.2" stroke="#221a12" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      <circle cx="17" cy="17.3" r="0.9" fill="#221a12"/>
      <circle cx="23" cy="17.3" r="0.9" fill="#221a12"/>
      <path d="M15,21.3 Q20,24 25,21.3 Q20,23 15,21.3 Z" fill="#221a12"/>
    </g>`,
  kankaku: `
    <circle class="ta-bg" cx="20" cy="20" r="20"/>
    <g transform="translate(-14,-8.9) scale(1.7)">
      <circle cx="20" cy="17" r="8" fill="#fbf6ea"/>
      <path d="M28,10 C33,10.5 34,16 30,19 C33,16.5 33,12.5 28,10 Z" fill="#221a12"/>
      <path d="M12,12 C12,7 16,5 20,5 C24,5 28,7 28,12 C28,9 24,8 20,8 C16,8 12,9 12,12 Z" fill="#221a12"/>
      <path d="M31,7.5 L32,10 L34.5,11 L32,12 L31,14.5 L30,12 L27.5,11 L30,10 Z" fill="var(--accent-strong)"/>
      <circle cx="17" cy="18" r="1.3" fill="#221a12"/>
      <circle cx="23" cy="18" r="1.3" fill="#221a12"/>
      <path d="M16,22 Q20,26 24,22" stroke="#221a12" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    </g>`
};

function tipsterAvatarSvg(tipsterId) {
  const inner = TIPSTER_FACES[tipsterId] || TIPSTER_FACES.databall;
  return `<svg viewBox="0 0 40 40" aria-hidden="true">${inner}</svg>`;
}
