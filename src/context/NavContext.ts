// FinCalci — Navigation context
// Replaces window._navGoHome / window._navPush global pollution.
// Any component can navigate without prop drilling or window hacks.
//
// Usage:
//   const nav = useNav();
//   nav.goHome();
//   nav.openCalc('emi');

import { createContext, useContext } from 'react';

export interface NavActions {
  openCalc: (id: string) => void;
  goHome: () => void;
  setTab: (tab: string) => void;
}

// Default no-ops (never used at runtime — App.tsx provides real values)
const NavContext = createContext<NavActions>({
  openCalc: () => {},
  goHome: () => {},
  setTab: () => {},
});

export const NavProvider = NavContext.Provider;

export function useNav(): NavActions {
  return useContext(NavContext);
}
