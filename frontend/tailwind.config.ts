import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Strict Black & White Corporate UI (Dark)
                background: {
                    DEFAULT: "#000000",
                },
                foreground: {
                    DEFAULT: "#FFFFFF",
                },
                primary: {
                    DEFAULT: "#2563eb",
                    foreground: "#FFFFFF",
                },
                card: {
                    DEFAULT: "#111111",
                    foreground: "#FFFFFF",
                },
                border: {
                    DEFAULT: "rgba(255,255,255,0.1)",
                },
                muted: {
                    DEFAULT: "#1A1A1A",
                    foreground: "#A0A0A0",
                },
            },
            borderRadius: {
                'xl': '1rem',
                '2xl': '1.5rem',
                '3xl': '2rem',
                '4xl': '3.5rem',
            },
        },
    },
    plugins: [],
};
export default config;
