export interface Theme {
    id: string;
    name: string;
    primary: string;    // --cosmos-primary
    secondary: string;  // --cosmos-blue / accents
    bg: string;         // background accent (light version of primary)
}

export const PREDEFINED_THEMES: Theme[] = [
    {
        id: 'cosmos-classic',
        name: 'Cosmos Indigo (Classic)',
        primary: '#4f46e5', // Indigo 600
        secondary: '#6366f1', // Indigo 500
        bg: '#eef2ff'
    },
    {
        id: 'ocean-premium',
        name: 'Ocean Deep',
        primary: '#0891b2', // Cyan 600
        secondary: '#06b6d4', // Cyan 500
        bg: '#ecfeff'
    },
    {
        id: 'emerald-luxury',
        name: 'Emerald Forest',
        primary: '#059669', // Emerald 600
        secondary: '#10b981', // Emerald 500
        bg: '#ecfdf5'
    },
    {
        id: 'crimson-royal',
        name: 'Crimson Royal',
        primary: '#e11d48', // Rose 600
        secondary: '#f43f5e', // Rose 500
        bg: '#fff1f2'
    },
    {
        id: 'golden-slate',
        name: 'Golden Slate',
        primary: '#d97706', // Amber 600
        secondary: '#f59e0b', // Amber 500
        bg: '#fffbeb'
    },
    {
        id: 'violet-night',
        name: 'Violet Night',
        primary: '#7c3aed', // Violet 600
        secondary: '#8b5cf6', // Violet 500
        bg: '#f5f3ff'
    }
];

export const getThemeById = (id: string) => {
    return PREDEFINED_THEMES.find(t => t.id === id) || PREDEFINED_THEMES[0];
};
