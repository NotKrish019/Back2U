import React from 'react';

export default function TermsAndConditionsPage() {
  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto', width: '100%', color: 'var(--text-purple)' }}>
      <div style={{ marginBottom: '3rem' }}>
        <span className="subheading">LEGAL</span>
        <h1 className="heading-lg" style={{ fontSize: '3rem', margin: '0.5rem 0', fontFamily: 'var(--font-coolvetica)' }}>TERMS & CONDITIONS</h1>
        <p style={{ opacity: 0.7, fontSize: '1.1rem', lineHeight: 1.6 }}>
          Last Updated: September 23, 2026
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', lineHeight: 1.7 }}>
        <section>
          <h2 style={{ fontFamily: 'var(--font-coolvetica)', fontSize: '1.8rem', marginBottom: '1rem' }}>1. Agreement to Terms</h2>
          <p style={{ opacity: 0.85 }}>
            These Terms and Conditions constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and Back2U ("we," "us" or "our"), concerning your access to and use of the Back2U website as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto. You agree that by accessing the site, you have read, understood, and agree to be bound by all of these Terms and Conditions.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: 'var(--font-coolvetica)', fontSize: '1.8rem', marginBottom: '1rem' }}>2. User Registration</h2>
          <p style={{ opacity: 0.85, marginBottom: '1rem' }}>
            You may be required to register with the site. You agree to keep your password confidential and will be responsible for all use of your account and password. We reserve the right to remove, reclaim, or change a username you select if we determine, in our sole discretion, that such username is inappropriate, obscene, or otherwise objectionable.
          </p>
          <p style={{ opacity: 0.85 }}>
            By registering or verifying your account using a mobile phone number, you consent to receive SMS text messages for authentication (One-Time Passwords) and account security purposes. Standard message and data rates may apply. You may update your notification preferences in your Account Settings.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: 'var(--font-coolvetica)', fontSize: '1.8rem', marginBottom: '1rem' }}>3. User Generated Contributions</h2>
          <p style={{ opacity: 0.85, marginBottom: '1rem' }}>
            The site may invite you to chat, contribute to, or participate in blogs, message boards, online forums, and other functionality, and may provide you with the opportunity to create, submit, post, display, transmit, perform, publish, distribute, or broadcast content and materials to us or on the Site, including but not limited to text, writings, video, audio, photographs, graphics, comments, suggestions, or personal information or other material (collectively, "Contributions").
          </p>
          <p style={{ opacity: 0.85 }}>
            Any Contributions you transmit may be treated as non-confidential and non-proprietary. By uploading physical item images and descriptions, you grant us the right to use this data to perform machine learning object-matching services and improve our internal algorithms.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: 'var(--font-coolvetica)', fontSize: '1.8rem', marginBottom: '1rem' }}>4. Prohibited Activities</h2>
          <p style={{ opacity: 0.85, marginBottom: '1rem' }}>
            You may not access or use the Site for any purpose other than that for which we make the Site available. The Site may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us. As a user of the Site, you agree not to:
          </p>
          <ul style={{ paddingLeft: '1.5rem', opacity: 0.85, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>Systematically retrieve data or other content from the Site to create or compile, directly or indirectly, a collection, compilation, database, or directory without written permission from us.</li>
            <li>Upload false, misleading, or fraudulent reports regarding lost or found items.</li>
            <li>Use the Site to advertise or offer to sell goods and services.</li>
            <li>Interfere with, disrupt, or create an undue burden on the Site or the networks or services connected to the Site.</li>
            <li>Attempt to bypass any measures of the Site designed to prevent or restrict access to the Site, or any portion of the Site.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontFamily: 'var(--font-coolvetica)', fontSize: '1.8rem', marginBottom: '1rem' }}>5. Intellectual Property Rights</h2>
          <p style={{ opacity: 0.85 }}>
            Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the "Content") and the trademarks, service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws and various other intellectual property rights.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: 'var(--font-coolvetica)', fontSize: '1.8rem', marginBottom: '1rem' }}>6. Disclaimer and Limitations of Liability</h2>
          <p style={{ opacity: 0.85 }}>
            The Site is provided on an as-is and as-available basis. You agree that your use of the Site and our services will be at your sole risk. To the fullest extent permitted by law, we disclaim all warranties, express or implied, in connection with the Site and your use thereof. We make no warranties or representations about the accuracy or completeness of the Site's content. We are not responsible for verifying the legal ownership of physical items exchanged through this platform.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: 'var(--font-coolvetica)', fontSize: '1.8rem', marginBottom: '1rem' }}>7. Term and Termination</h2>
          <p style={{ opacity: 0.85 }}>
            These Terms and Conditions shall remain in full force and effect while you use the Site. WITHOUT LIMITING ANY OTHER PROVISION OF THESE TERMS AND CONDITIONS, WE RESERVE THE RIGHT TO, IN OUR SOLE DISCRETION AND WITHOUT NOTICE OR LIABILITY, DENY ACCESS TO AND USE OF THE SITE, TO ANY PERSON FOR ANY REASON OR FOR NO REASON, INCLUDING WITHOUT LIMITATION FOR BREACH OF ANY REPRESENTATION, WARRANTY, OR COVENANT CONTAINED IN THESE TERMS AND CONDITIONS OR OF ANY APPLICABLE LAW OR REGULATION.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: 'var(--font-coolvetica)', fontSize: '1.8rem', marginBottom: '1rem' }}>8. Contact Us</h2>
          <p style={{ opacity: 0.85 }}>
            In order to resolve a complaint regarding the Site or to receive further information regarding use of the Site, please contact us at: <strong>legal@back2u.example.edu</strong>.
          </p>
        </section>
      </div>
    </div>
  );
}
