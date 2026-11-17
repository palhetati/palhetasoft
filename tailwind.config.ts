import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/modules/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-active': 'var(--color-primary-active)',
        secondary: 'var(--color-secondary)',
        'on-primary': 'var(--color-on-primary)',
        canvas: 'var(--color-canvas)',
        'canvas-soft': 'var(--color-canvas-soft)',
        surface: 'var(--color-surface)',
        ink: 'var(--color-ink)',
        'ink-secondary': 'var(--color-ink-secondary)',
        'ink-muted': 'var(--color-ink-muted)',
        'ink-faint': 'var(--color-ink-faint)',
        hairline: 'var(--color-hairline)',
        'accent-sky': 'var(--color-accent-sky)',
        'accent-purple': 'var(--color-accent-purple)',
        'accent-purple-deep': 'var(--color-accent-purple-deep)',
        'accent-pink': 'var(--color-accent-pink)',
        'accent-orange': 'var(--color-accent-orange)',
        'accent-orange-deep': 'var(--color-accent-orange-deep)',
        'accent-teal': 'var(--color-accent-teal)',
        'accent-green': 'var(--color-accent-green)',
        'accent-brown': 'var(--color-accent-brown)',
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        soft: 'var(--shadow-level-1)',
        elevated: 'var(--shadow-level-2)',
      },
    },
  },
  plugins: [],
};

export default config;
