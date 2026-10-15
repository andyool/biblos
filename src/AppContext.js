import { createContext, useContext } from 'react';

// start(plan), openVerse(id), openSheet(sheet), closeSheet(), go(tab)
export const AppContext = createContext(null);

export const useApp = () => useContext(AppContext);
