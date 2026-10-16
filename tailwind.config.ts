import type { Config } from 'tailwindcss';
import { appConfig } from './src/config/appConfig';

// 색상은 src/config/appConfig.ts 의 colors 에서 바꾸세요. 여기서는 그 값을 가져다 씁니다.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: appConfig.colors.primary,
        accent: appConfig.colors.accent,
        success: '#1f7a4d',
        danger: '#b42318',
        ink: '#1c2433',
        muted: '#4a5568',
        surface: '#f6f7fb',
      },
      fontFamily: {
        sans: [
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'Apple SD Gothic Neo',
          'Malgun Gothic',
          'sans-serif',
        ],
      },
      fontSize: {
        base: ['17px', '1.65'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(20, 40, 75, 0.06), 0 8px 24px -12px rgba(20, 40, 75, 0.18)',
      },
      minHeight: {
        touch: '48px',
      },
    },
  },
  plugins: [],
} satisfies Config;
