import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: {
        '2xl': '1280px',
      },
    },
    extend: {
      colors: {
        brand: {
          coffee: '#24140E', // Deep Roasted Coffee / Espresso
          navy: '#24140E',   // Coffee alias for backward compatibility
          orange: '#EA580C', // Vibrant Academic Orange
          emerald: '#EA580C',// Orange alias for backward compatibility
          cream: '#FAF7F2',  // Warm Ivory Cream
          page: '#FAF7F2',   // Cream page background
          mint: '#F6EFE7',   // Latte Cream subtle accent
          amber: '#D97706',  // Warm Honey Amber
          slate: '#78665A',  // Warm Coffee Slate text
          border: '#E8DDD1', // Warm Cream Parchment Border
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#24140E',
          foreground: '#FFFFFF',
          orange: '#EA580C',
          coffee: '#24140E',
          cream: '#FAF7F2',
          emerald: '#EA580C',
        },
        secondary: {
          DEFAULT: '#EA580C',
          foreground: '#FFFFFF',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: '#F4EAE0',
          foreground: '#78665A',
        },
        accent: {
          DEFAULT: '#F6EFE7',
          foreground: '#EA580C',
          orange: '#EA580C',
          amber: '#D97706',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'ui-monospace',
          'monospace',
        ],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
