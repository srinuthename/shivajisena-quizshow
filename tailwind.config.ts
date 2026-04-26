import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
	extend: {
fontFamily: {
  display: ['Poppins', 'Noto Sans Telugu', 'ui-sans-serif', 'system-ui'],
  body: ['Poppins', 'Noto Sans Telugu', 'ui-sans-serif', 'system-ui'],
  accent: ['Poppins', 'Noto Sans Telugu', 'ui-sans-serif', 'system-ui'],
  telugu: ['Noto Sans Telugu', 'Poppins', 'ui-sans-serif', 'system-ui']
},
fontVariantNumeric: {
  tabular: 'tabular-nums'
},

			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				quiz: {
					correct: 'hsl(var(--quiz-correct))',
					incorrect: 'hsl(var(--quiz-incorrect))',
					selected: 'hsl(var(--quiz-selected))'
				},
				energy: {
					yellow: 'hsl(var(--energy-yellow))',
					red: 'hsl(var(--energy-red))',
					blue: 'hsl(var(--energy-blue))',
					glow: 'hsl(var(--energy-glow))',
					crimson: 'hsl(var(--energy-crimson))',
					gold: 'hsl(var(--energy-gold))'
				},
				direction: {
					east: 'hsl(var(--direction-east))',
					'east-bg': 'hsl(var(--direction-east-bg))',
					west: 'hsl(var(--direction-west))',
					'west-bg': 'hsl(var(--direction-west-bg))',
					north: 'hsl(var(--direction-north))',
					'north-bg': 'hsl(var(--direction-north-bg))',
					south: 'hsl(var(--direction-south))',
					'south-bg': 'hsl(var(--direction-south-bg))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				timer: {
					safe: 'hsl(var(--timer-safe))',
					warning: 'hsl(var(--timer-warning))',
					danger: 'hsl(var(--timer-danger))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'pulse-glow': {
					'0%, 100%': { 
						boxShadow: '0 0 20px hsl(var(--primary) / 0.5), 0 0 40px hsl(var(--primary) / 0.3)',
						transform: 'scale(1)'
					},
					'50%': { 
						boxShadow: '0 0 40px hsl(var(--primary) / 0.7), 0 0 80px hsl(var(--primary) / 0.4)',
						transform: 'scale(1.03)'
					}
				},
				'score-pop': {
					'0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
					'50%': { transform: 'translateY(-30px) scale(1.2)', opacity: '1' },
					'100%': { transform: 'translateY(-50px) scale(0.8)', opacity: '0' }
				},
				'flash-correct': {
					'0%': { backgroundColor: 'transparent' },
					'50%': { backgroundColor: 'hsl(142 70% 40% / 0.3)' },
					'100%': { backgroundColor: 'transparent' }
				},
				'flash-wrong': {
					'0%': { backgroundColor: 'transparent' },
					'50%': { backgroundColor: 'hsl(0 70% 45% / 0.3)' },
					'100%': { backgroundColor: 'transparent' }
				},
				'shimmer': {
					'0%': { backgroundPosition: '-200% 0' },
					'100%': { backgroundPosition: '200% 0' }
				},
				'bounce-in': {
					'0%': { transform: 'scale(0)', opacity: '0' },
					'50%': { transform: 'scale(1.1)' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'slide-up': {
					'0%': { transform: 'translateY(30px)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				'energy-pulse': {
					'0%, 100%': { 
						filter: 'brightness(1) drop-shadow(0 0 10px hsl(var(--primary) / 0.5))'
					},
					'50%': { 
						filter: 'brightness(1.2) drop-shadow(0 0 30px hsl(var(--primary) / 0.8))'
					}
				},
				'fire-glow': {
					'0%, 100%': { 
						boxShadow: '0 0 20px hsl(28 95% 50% / 0.5), 0 0 40px hsl(0 70% 40% / 0.3)'
					},
					'50%': { 
						boxShadow: '0 0 40px hsl(28 95% 50% / 0.7), 0 0 80px hsl(0 70% 40% / 0.5)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
				'score-pop': 'score-pop 1.5s ease-out forwards',
				'flash-correct': 'flash-correct 0.5s ease-out',
				'flash-wrong': 'flash-wrong 0.5s ease-out',
				'shimmer': 'shimmer 2s linear infinite',
				'bounce-in': 'bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
				'slide-up': 'slide-up 0.5s ease-out',
				'energy-pulse': 'energy-pulse 2s ease-in-out infinite',
				'fire-glow': 'fire-glow 2.5s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;