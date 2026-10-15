import { createContext, useContext } from 'react';

// start(plan), read(section), openVerse(id), openSheet(sheet), closeSheet(), go(tab)
export const AppContext = createContext(null);

export const useApp = () => useContext(AppContext);
