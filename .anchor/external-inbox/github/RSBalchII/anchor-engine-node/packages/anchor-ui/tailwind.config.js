/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#3bbbf7',
                'primary-dark': '#2a8bba',
                'background-dark': '#0f172a',
                'panel-bg': '#1e293b',
                'border-color': '#334155',
                'text-primary': '#f8fafc',
                'text-secondary': '#94a3b8',
                cyan: {
                    400: '#22d3ee',
                    500: '#06b6d4',
                    950: '#083344',
                },
                emerald: {
                    400: '#34d399',
                },
                slate: {
                    400: '#94a3b8',
                    500: '#64748b',
                    800: '#1e293b',
                    900: '#0f172a',
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['"JetBrains Mono"', '"Roboto Mono"', 'monospace'],
            },
            boxShadow: {
                'glow': '0 0 15px rgba(59, 187, 247, 0.3)',
                'glow-sm': '0 0 8px rgba(59, 187, 247, 0.2)',
            }
        },
    },
    plugins: [
      require('@tailwindcss/forms'),
      require('@tailwindcss/container-queries'),
    ],
}
