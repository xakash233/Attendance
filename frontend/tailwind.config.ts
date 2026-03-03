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
                // Strict White Corporate UI (Light)
                background: {
                    DEFAULT: "#FFFFFF",
                },
                foreground: {
                    DEFAULT: "#000000",
                },
                primary: {
                    DEFAULT: "#2563eb",
                    foreground: "#FFFFFF",
                },
                card: {
                    DEFAULT: "#F9FAFB",
                    foreground: "#000000",
                },
                border: {
                    DEFAULT: "rgba(0,0,0,0.1)",
                },
                muted: {
                    DEFAULT: "#E5E7EB",
                    foreground: "#6B7280",
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
