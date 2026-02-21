/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                wa: {
                    dark: '#020617', // Slate 950 (Deep Space)
                    panel: '#0f172a', // Slate 900 (Glass Base)
                    primary: '#f1f5f9', // Slate 100 (High Contrast Text)
                    secondary: '#94a3b8', // Slate 400 (Muted Text)
                    'accent-wa-teal': '#22d3ee', // Cyan 400 (Electric Neon)
                    'accent-wa-teal-dark': '#06b6d4', // Cyan 500
                    danger: '#f87171', // Red 400 (Soft Neon Red)
                    incoming: '#1e293b', // Slate 800
                    outgoing: '#0e7490', // Cyan 700
                },
            },
            fontFamily: {
                sans: ['"Segoe UI"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
