<template>
    <div class="legal-container">
        <div class="legal-content glass-panel">
            <h1>Privacy Policy</h1>
            <p class="last-updated">Last updated: August 2026</p>

            <section>
                <h2>1. Information We Collect</h2>
                <p>We collect the following information when you use VEXT:</p>
                <ul>
                    <li><strong>Account data:</strong> username, email address, profile picture</li>
                    <li><strong>Usage data:</strong> game play time, purchase history, library contents</li>
                    <li><strong>Social data:</strong> friends list, chat messages, lobby participation</li>
                    <li><strong>Technical data:</strong> IP address, device type, operating system</li>
                    <li><strong>Financial data:</strong> transaction history, wallet balance (payment details are handled by third-party processors)</li>
                </ul>
            </section>

            <section>
                <h2>2. How We Use Your Information</h2>
                <p>Your data is used to:</p>
                <ul>
                    <li>Provide and maintain the VEXT platform and services</li>
                    <li>Process purchases, refunds, and marketplace transactions</li>
                    <li>Enable social features (friends, chat, lobbies)</li>
                    <li>Improve the platform and user experience</li>
                    <li>Detect and prevent fraud or abuse</li>
                    <li>Communicate important updates about your account</li>
                </ul>
            </section>

            <section>
                <h2>3. Data Storage & Security</h2>
                <p>Your data is stored on secure servers. We use encryption for sensitive data, including passwords (bcrypt) and communications (TLS/SSL). We retain your data for as long as your account is active.</p>
            </section>

            <section>
                <h2>4. Third-Party Services</h2>
                <p>We use the following third-party services:</p>
                <ul>
                    <li><strong>Cloudinary:</strong> Image and media storage</li>
                    <li><strong>Payment processors:</strong> For wallet deposits and withdrawals</li>
                    <li><strong>GitHub:</strong> Optional social login</li>
                </ul>
                <p>These services have their own privacy policies. We do not sell your personal data to third parties.</p>
            </section>

            <section>
                <h2>5. Chat & Social Features</h2>
                <p>Messages sent through VEXT chat are stored to enable conversation history. Messages in lobbies are transient and not permanently stored. We may moderate content to enforce our Terms of Service.</p>
            </section>

            <section>
                <h2>6. Cookies & Local Storage</h2>
                <p>VEXT uses local storage to save your preferences (install path, theme, language) and authentication tokens. As a desktop application, we do not use third-party tracking cookies.</p>
            </section>

            <section>
                <h2>7. Your Rights</h2>
                <p>You have the right to:</p>
                <ul>
                    <li>Access your personal data</li>
                    <li>Correct inaccurate data</li>
                    <li>Request deletion of your account and data</li>
                    <li>Export your data in a portable format</li>
                    <li>Withdraw consent for optional data processing</li>
                </ul>
                <p>To exercise these rights, contact us at <strong>privacy@vext.gg</strong>.</p>
            </section>

            <section>
                <h2>8. Children's Privacy</h2>
                <p>VEXT is not intended for children under 13. We do not knowingly collect data from children under 13. If we discover such data, we will delete it promptly.</p>
            </section>

            <section>
                <h2>9. Changes to This Policy</h2>
                <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification.</p>
            </section>

            <section>
                <h2>10. Contact</h2>
                <p>For privacy-related questions, contact us at <strong>privacy@vext.gg</strong>.</p>
            </section>
        </div>
    </div>
</template>

<style scoped>
.legal-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 20px;
    color: #fff;
}

.glass-panel {
    background: rgba(30, 30, 30, 0.6);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 40px;
}

h1 {
    font-size: 2rem;
    font-weight: 800;
    margin-bottom: 8px;
}

.last-updated {
    color: #888;
    font-size: 0.9rem;
    margin-bottom: 30px;
}

h2 {
    font-size: 1.3rem;
    font-weight: 700;
    margin-top: 30px;
    margin-bottom: 12px;
    color: #00dc82;
}

p {
    line-height: 1.7;
    color: #ccc;
    margin-bottom: 12px;
}

ul {
    padding-left: 24px;
    color: #ccc;
    line-height: 1.8;
    margin-bottom: 12px;
}

section {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding-bottom: 20px;
}

section:last-child {
    border-bottom: none;
}
</style>
