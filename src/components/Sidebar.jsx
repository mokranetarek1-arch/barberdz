import { useI18n } from '../i18n'

export default function Sidebar({ setScreen, logout, role, screen, shopName, isSuperAdmin }) {
  const isAdmin = role === 'admin' || role === 'super_admin'
  const { t } = useI18n()

  if (role === 'super_admin' || isSuperAdmin) {
    return (
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">👑</div>
          <div className="brand-info">
            <strong>Barber DZ</strong>
            <small style={{ color: '#f59e0b', fontWeight: 'bold' }}>SUPER ADMIN</small>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button
            className={screen === 'super-admin' ? 'active' : ''}
            onClick={() => setScreen('super-admin')}
            style={{ fontWeight: '800' }}
          >
            👑 {t('superAdmin') || 'Gestion des Salons'}
          </button>
          <button
            className={screen === 'dashboard' ? 'active' : ''}
            onClick={() => setScreen('dashboard')}
          >
            ✂️ {t('dashboard') || 'Mon Salon'}
          </button>
          <button
            className={screen === 'barbers' ? 'active' : ''}
            onClick={() => setScreen('barbers')}
          >
            ♙ {t('barbers') || 'Mes Barbiers'}
          </button>
          <button
            className={screen === 'settings' ? 'active' : ''}
            onClick={() => setScreen('settings')}
          >
            ⚙ {t('settings') || 'Paramètres'}
          </button>
        </nav>
        <div className="sidebar-footer">
          <button className="ghost" onClick={logout}>
            {t('logout')}
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">✂</div>
        <div className="brand-info">
          <strong>{shopName || 'Barber DZ'}</strong>
          <small>{isAdmin ? t('admin') : t('barber')}</small>
        </div>
      </div>
      <nav className="sidebar-nav">
        <button
          className={screen === (isAdmin ? 'dashboard' : 'barber-workspace') ? 'active' : ''}
          onClick={() => setScreen(isAdmin ? 'dashboard' : 'barber-workspace')}
        >
          {isAdmin ? `⌂ ${t('dashboard')}` : `⌂ ${t('workspace')}`}
        </button>
        {isAdmin && (
          <>
            <button className={screen === 'barbers' ? 'active' : ''} onClick={() => setScreen('barbers')}>
              ♙ {t('barbers')}
            </button>
            <button className={screen === 'summary' ? 'active' : ''} onClick={() => setScreen('summary')}>
              ◫ {t('summary')}
            </button>
          </>
        )}
        <button className={screen === 'settings' ? 'active' : ''} onClick={() => setScreen('settings')}>
          ⚙ {t('settings')}
        </button>
      </nav>
      <div className="sidebar-footer">
        <button className="ghost" onClick={logout}>
          {t('logout')}
        </button>
      </div>
    </aside>
  )
}
