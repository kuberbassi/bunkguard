import React from 'react';
import Card from '@/components/ui/Card';

const TermsOfService: React.FC = () => {
    return (
        <div className="min-h-screen bg-surface-container p-4 md:p-8 flex justify-center">
            <Card className="max-w-4xl w-full p-8 shadow-elevation-1">
                <h1 className="text-3xl font-bold mb-6 text-on-surface">Terms of Service</h1>
                <p className="mb-4 text-on-surface-variant">Last updated: February 4, 2026 • v3.0.0</p>

                <div className="space-y-6 text-on-surface">
                    <section>
                        <h2 className="text-xl font-semibold mb-2">1. Acceptance of Terms</h2>
                        <p>By accessing and using AcadHub, you accept and agree to be bound by the terms and provision of this agreement.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-2">2. Description of Service</h2>
                        <p>AcadHub provides an academic management dashboard that integrates with your Google account to track attendance, assignments, and tasks. You understand and agree that the Service is provided "AS-IS".</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-2">3. User Conduct</h2>
                        <p>You agree to use the Service only for lawful purposes. You are responsible for all activities that occur under your account.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-2">4. Termination</h2>
                        <p>We reserve the right to terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-2">5. Changes to Terms</h2>
                        <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-2">6. Contact Us</h2>
                        <p>If you have any questions about these Terms, please contact us at kuberbassi2007@gmail.com.</p>
                    </section>
                </div>
            </Card>
        </div>
    );
};

export default TermsOfService;
