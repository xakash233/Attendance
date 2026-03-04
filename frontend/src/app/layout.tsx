import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Tectra Technologies | Attendance System",
    description: "Advanced HRMS and Attendance Management System",
    icons: {
        icon: [
            { url: '/favicon.png', type: 'image/png' },
            { url: '/logo/Tectra.png', type: 'image/png' },
        ],
        apple: [
            { url: '/logo/Tectra.png', type: 'image/png' }
        ]
    }
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.className} bg-white text-black`}>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}
