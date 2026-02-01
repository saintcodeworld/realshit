
import React from 'react';
import { MinerStatus } from '../types';
import PillNav, { PillNavItem } from './PillNav';

interface HeaderProps {
  status: MinerStatus;
  onLogout: () => void;
  onSettingsClick: () => void;
}

const mainLogo = '/character.png';

const Header: React.FC<HeaderProps> = ({ status, onLogout, onSettingsClick }) => {
  const isActive = status === MinerStatus.MINING || status === MinerStatus.TAB_MINING;

  // Nav items with logout handler for the Logout button
  const navItems: PillNavItem[] = [
    { label: 'Settings', href: '#settings', onClick: onSettingsClick },
    { label: 'Logout', href: '#logout', onClick: onLogout },
  ];

  return (
    <header className="sticky top-0 z-50">
      <div className="container mx-auto px-4 h-20 flex items-center justify-center relative">
        {/* PillNav Section - Centered */}
        <div className="flex items-center justify-center">
          <PillNav
            logo={mainLogo}
            logoAlt="$WWR MADE BY WHITE WHALE DEV"
            items={navItems}
            activeHref="#dashboard"
            baseColor="linear-gradient(145deg, #2e2d2d, #212121)"
            pillColor="#1a1a1a"
            hoveredPillTextColor="#1a1a1a"
            pillTextColor="#fff"
            className="!relative !top-0 !left-0 !w-auto"
            initialLoadAnimation={true}
          />
        </div>

        {/* Status Indicator - Positioned to the right */}
        <div className="absolute right-4 flex items-center gap-3 bg-zinc-900/40 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/10 text-white shadow-lg">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' :
            status === MinerStatus.THROTTLED ? 'bg-yellow-500 animate-pulse' :
              'bg-zinc-600'
            }`} />

        </div>
      </div>
    </header>
  );
};

export default Header;
