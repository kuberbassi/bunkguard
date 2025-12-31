import React from 'react';
import Card from '@/components/ui/Card';

const PrivacyPolicy: React.FC = () => {
    return (
        <div className="min-h-screen bg-surface-container p-4 md:p-8 flex justify-center">
            <Card className="max-w-4xl w-full p-8 shadow-elevation-1">
                <h1 className="text-3xl font-bold mb-6 text-on-surface">Privacy Policy</h1>
                <p className="mb-4 text-on-surface-variant">Last updated: December 26, 2025</p>

                <div className="space-y-6 text-on-surface">
                    <section>
                        <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
                        <p>Welcome to AcadHub ("we," "our," or "us"). We are committed to protecting your privacy and ensuring you have a positive experience while using our application.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-2">2. Information We Collect</h2>
                        <p>We collect only the information necessary to provide our services:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li><strong>Google Account Information:</strong> When you sign in with Google, we collect your email address, name, and profile picture.</li>
                            <li><strong>Academic Data:</strong> We access your Google Classroom courses and coursework to display your academic planner.</li>
                            <li><strong>Calendar & Tasks:</strong> We access your Google Calendar and Google Tasks to help you manage your schedule and deadlines.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-2">3. How We Use Your Information</h2>
                        <p>We use your information solely to:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Provide and personalize the AcadHub dashboard.</li>
                            <li>Sync your academic schedule and deadlines.</li>
                            <li>Enable you to manage your Google Tasks directly from our platform.</li>
                        </ul>
                        <p className="mt-2 font-medium">We do not sell your personal data to third parties.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-2">4. Data Security</h2>
                        <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-2">5. Google User Data</h2>
                        <p>AcadHub's use and transfer to any other app of information received from Google APIs will adhere to <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-primary hover:underline" target="_blank" rel="noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-2">6. Contact Us</h2>
                        <p>If you have any questions about this Privacy Policy, please contact us at kuberbassi2007@gmail.com.</p>
                    </section>
                </div>
            </Card>
        </div>
    );
};

export default PrivacyPolicy;
