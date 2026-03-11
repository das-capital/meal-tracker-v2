/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background:       'var(--color-bg)',
                surface:          'var(--color-surface)',
                surface2:         'var(--color-surface2)',
                'th-border':      'var(--color-border)',
                'th-border-strong': 'var(--color-border-strong)',
                'th-primary':     'var(--color-text-primary)',
                'th-secondary':   'var(--color-text-secondary)',
                'th-muted':       'var(--color-text-muted)',
                'th-faint':       'var(--color-text-faint)',
                primary:          '#10b981',
                'primary-glow':   '#34d399',
                secondary:        'var(--color-surface2)',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
