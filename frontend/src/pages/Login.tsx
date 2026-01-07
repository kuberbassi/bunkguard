import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';

const Login: React.FC = () => {
    const { loginWithGoogle } = useAuth();

    const handleLogin = useGoogleLogin({
        onSuccess: async (codeResponse) => {

            try {
                await loginWithGoogle(codeResponse.code);

                // User will be redirected by AuthContext
            } catch (error) {
                console.error('❌ Backend login failed:', error);
                alert('Login failed. Check console for details.');
            }
        },
        onError: (error) => {
            console.error('❌ Google Login Failed:', error);
            alert(`Google Login Error: ${JSON.stringify(error)}`);
        },
        flow: 'auth-code',
        scope: 'email profile openid https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly https://www.googleapis.com/auth/classroom.announcements.readonly https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly'
    });

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-surface-container p-4 relative overflow-hidden">
            {/* M3 Dynamic Background Shapes */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary-container rounded-full blur-[100px] opacity-60 animate-pulse-slow" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-secondary-container rounded-full blur-[80px] opacity-60 animate-pulse-slow" style={{ animationDelay: '2s' }} />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="z-10 w-full max-w-md"
            >
                <Card variant="elevated" className="text-center p-8 m3-card !rounded-3xl shadow-elevation-3 bg-surface/90 backdrop-blur-sm dark:bg-dark-surface-container dark:text-dark-surface-on">
                    {/* Icon */}
                    <div className="mb-6 flex justify-center">
                        <div className="w-16 h-16 rounded-2xl bg-primary-container text-primary flex items-center justify-center">
                            <span className="material-icons text-4xl">inventory_2</span>
                        </div>
                    </div>

                    <h1 className="text-3xl font-display font-medium text-on-surface dark:text-dark-surface-on mb-2 tracking-tight">
                        AcadHub
                    </h1>
                    <p className="text-on-surface-variant text-lg">
                        Your ultimate student companion for attendance, timetables, and more.
                    </p>
                    <p className="text-on-surface-variant dark:text-dark-surface-variant mb-8 text-base">
                        Sign in to AcadHub to continue
                    </p>

                    <Button
                        onClick={() => handleLogin()}
                        variant="filled"
                        size="lg"
                        className="w-full !rounded-full !h-12 !text-base shadow-none hover:shadow-elevation-1"
                        icon={<span className="material-icons text-xl">login</span>}
                    >
                        Sign in with Google
                    </Button>

                    <p className="mt-8 text-xs text-on-surface-variant dark:text-dark-surface-variant opacity-70">
                        By continuing, you agree to our{' '}
                        <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
                        {' '}and{' '}
                        <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
                    </p>
                </Card>
            </motion.div>
        </div>
    );
};

export default Login;
