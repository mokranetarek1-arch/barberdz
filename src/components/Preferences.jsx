export default function Preferences({ locale, theme, onLocaleChange, onThemeChange }) {
  return <div className="preferences" aria-label="Préférences d’affichage">
    <button className="locale-switch" onClick={() => onLocaleChange(locale === 'fr' ? 'ar' : 'fr')} aria-label="Changer de langue">
      {locale === 'fr' ? 'AR' : 'FR'}
    </button>
    <button className="theme-switch" onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')} aria-label="Changer de thème">
      {theme === 'light' ? '◐' : '☀'}
    </button>
  </div>
}
