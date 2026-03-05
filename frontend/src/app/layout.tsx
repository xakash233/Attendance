import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from 'react-hot-toast';

const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"] });

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
            <body className={`${plusJakarta.className} bg-white text-black`}>
                <AuthProvider>
                    {children}
                </AuthProvider>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        style: {
                            background: '#000',
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            borderRadius: '12px',
                            padding: '16px 24px',
                            letterSpacing: '0.05em'
                        },
                        success: { iconTheme: { primary: '#fff', secondary: '#000' } },
                        error: { iconTheme: { primary: '#ff4b4b', secondary: '#fff' } }
                    }}
                />
            </body>
        </html>
    );
}
