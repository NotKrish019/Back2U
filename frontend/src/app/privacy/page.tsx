import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto', width: '100%', color: 'var(--text-purple)' }}>
      <div style={{ marginBottom: '3rem' }}>
        <span className="subheading">LEGAL</span>
        <h1 className="heading-lg" style={{ fontSize: '3rem', margin: '0.5rem 0', fontFamily: 'var(--font-coolvetica)' }}>PRIVACY POLICY</h1>
        <p style={{ opacity: 0.7, fontSize: '1.1rem', lineHeight: 1.6 }}>
          Last Updated: September 23, 2026
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', lineHeight: 1.7 }}>
        <section>
          <h2 style={{ fontFamily: 'var(--font-coolvetica)', fontSize: '1.8rem', marginBottom: '1rem' }}>1. Introduction</h2>
          <p style={{ opacity: 0.85 }}>
            Welcome to Back2U. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: 'var(--font-coolvetica)', fontSize: '1.8rem', marginBottom: '1rem' }}>2. The Data We Collect About You</h2>
          <p style={{ opacity: 0.85, marginBottom: '1rem' }}>
            Personal data, or personal information, means any information about an individual from which that person can be identified. We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
          </p>
          <ul style={{ paddingLeft: '1.5rem', opacity: 0.85, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier, and profile picture.</li>
            <li><strong>Contact Data:</strong> includes email address and telephone numbers. Telephone numbers are used exclusively for secure account authentication (SMS OTP) and, if you opt in, urgent notifications about your items.</li>
            <li><strong>Content Data:</strong> includes images of items you upload, descriptions of lost/found items, and location data related to where items were lost or found.</li>
            <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform.</li>
            <li><strong>Usage Data:</strong> includes information about how you use our website, products and services.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontFamily: 'var(--font-coolvetica)', fontSize: '1.8rem', marginBottom: '1rem' }}>3. How We Use Your Personal Data</h2>
          <p style={{ opacity: 0.85, marginBottom: '1rem' }}>
            We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
          </p>
          <ul style={{ paddingLeft: '1.5rem', opacity: 0.85, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>To register you as a new user.</li>
            <li>To process and deliver your lost or found item reports.</li>
            <li>To utilize our Machine Learning algorithms to match lost and found items.</li>
            <li>To manage our relationship with you, including notifying you of matches.</li>
            <li>To improve our website, services, marketing, customer relationships and experiences.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontFamily: 'var(--font-coolvetica)', fontSize: '1.8rem', marginBottom: '1rem' }}>4. Data Security</h2>
          <p style={{ opacity: 0.85 }}>
            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know. They will only process your personal data on our instructions and they are subject to a duty of confidentiality.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: 'var(--font-coolvetica)', fontSize: '1.8rem', marginBottom: '1rem' }}>5. AI & Machine Learning</h2>
          <p style={{ opacity: 0.85 }}>
            Back2U utilizes advanced Machine Learning models to identify and match items. The images you upload (Content Data) are processed by these models to extract vector representations. We do not use facial recognition, nor do we attempt to identify individuals from the images uploaded. Images are strictly used for the purpose of identifying and matching physical objects.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: 'var(--font-coolvetica)', fontSize: '1.8rem', marginBottom: '1rem' }}>6. Data Retention</h2>
          <p style={{ opacity: 0.85 }}>
            We will only retain your personal data for as long as reasonably necessary to fulfill the purposes we collected it for, including for the purposes of satisfying any legal, regulatory, tax, accounting or reporting requirements. Resolved reports and associated images may be kept in an anonymized format for the purpose of training and improving our object recognition algorithms, unless you explicitly request deletion.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: 'var(--font-coolvetica)', fontSize: '1.8rem', marginBottom: '1rem' }}>7. Your Legal Rights</h2>
          <p style={{ opacity: 0.85, marginBottom: '1rem' }}>
            Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to:
          </p>
          <ul style={{ paddingLeft: '1.5rem', opacity: 0.85, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>Request access to your personal data.</li>
            <li>Request correction of your personal data.</li>
            <li>Request erasure of your personal data.</li>
            <li>Object to processing of your personal data.</li>
            <li>Request restriction of processing your personal data.</li>
          </ul>
          <p style={{ opacity: 0.85, marginTop: '1rem' }}>
            You can exercise most of these rights directly through your Account Settings page on our platform.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: 'var(--font-coolvetica)', fontSize: '1.8rem', marginBottom: '1rem' }}>8. Contact Us</h2>
          <p style={{ opacity: 0.85 }}>
            If you have any questions about this privacy policy or our privacy practices, please contact our data privacy manager at: <strong>privacy@back2u.example.edu</strong>.
          </p>
        </section>
      </div>
    </div>
  );
}
