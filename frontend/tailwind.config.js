/** @type {import('tailwindcss').Config} */
// Design tokens come straight from the ORCIID brand book:
//  • Primary  = Cobalt  #5B53FF (with Cobalt Light #6369FF / Cobalt Dark #5237F9)
//  • Neutrals = the brand's blue-tinted greyscale (Grey 00–100), mapped onto
//    Tailwind's gray-* positions so every existing `gray-*` class in the app
//    picks up brand neutrals without touching the components.
//  • Accents  = Electric / Iris / Coral, for charts, badges and highlights.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Cobalt — buttons land on 600 (brand Cobalt) and hover to 700 (Cobalt Dark).
        primary: {
          50: '#F6F6FF',
          100: '#EBECFF',
          200: '#D6D8FF',
          300: '#B9BCFF',
          400: '#9296FF',
          500: '#6369FF', // Cobalt Light
          600: '#5B53FF', // Cobalt  ← brand hero
          700: '#5237F9', // Cobalt Dark
          800: '#3F30A7',
          900: '#342C78',
          950: '#2C2953',
        },
        // Brand greyscale (blue-tinted), mapped to Tailwind positions.
        gray: {
          50: '#F5F5F8',  // Grey 97
          100: '#E8E9F3', // Grey 93
          200: '#D5D6EA', // Grey 88
          300: '#C1C2D9', // Grey 80
          400: '#A3A4BF', // Grey 70
          500: '#81859F', // Grey 60
          600: '#6A6B83', // Grey 50
          700: '#4F5167', // Grey 40
          800: '#36384A', // Grey 30
          900: '#252736', // Grey 15
          950: '#12131D', // Grey 08
        },
        // Full brand greyscale, available by its own names when an exact step is needed.
        ink: {
          0: '#000000',
          5: '#0D0D18',
          8: '#12131D',
          10: '#161722',
          12: '#1D1F2C',
          15: '#252736',
          20: '#2E2F40',
          30: '#36384A',
          40: '#4F5167',
          50: '#6A6B83',
          60: '#81859F',
          70: '#A3A4BF',
          80: '#C1C2D9',
          88: '#D5D6EA',
          90: '#DEDFEE',
          93: '#E8E9F3',
          95: '#F0F0F7',
          97: '#F5F5F8',
          100: '#FCFCFC',
        },
        cobalt: { light: '#6369FF', DEFAULT: '#5B53FF', dark: '#5237F9' },
        electric: { light: '#87FFFF', DEFAULT: '#47EBEB', dark: '#00B8B9' },
        iris: { light: '#9F75F9', DEFAULT: '#8952FD', dark: '#632CDA' },
        coral: { light: '#FCA493', DEFAULT: '#FC856D', dark: '#E36B52' },
        brand: {
          facebook: '#1877F2',
          instagram: '#E1306C',
          twitter: '#1DA1F2',
          linkedin: '#0A66C2',
          tiktok: '#000000',
          youtube: '#FF0000',
          pinterest: '#E60023',
        },
      },
      fontFamily: {
        // Now carries Latin; Noor covers Arabic glyphs Now doesn't have, so
        // mixed ar/en copy renders in-brand without per-language classes.
        sans: ['Now', 'Noor', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Now', 'Noor', 'system-ui', 'sans-serif'],
        arabic: ['Noor', 'Now', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        // Brand gradient (Cobalt → Iris → Coral) used for hero/accent surfaces.
        'brand-gradient': 'linear-gradient(135deg, #5B53FF 0%, #8952FD 55%, #FC856D 100%)',
        'cobalt-gradient': 'linear-gradient(135deg, #6369FF 0%, #5237F9 100%)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
