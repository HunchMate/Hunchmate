import './Legal.css';

export default function Terms() {
  return (
    <section className="legal-page">
      <div className="container legal-page__shell">
        <header className="legal-page__hero">
          <p className="legal-page__eyebrow">Legal</p>
          <h1>Terms and Conditions</h1>
          <p>
            These terms govern access to Hunchmate services for participants, organizers,
            and platform administrators. By creating an account, you agree to these terms.
          </p>
        </header>

        <article className="legal-page__content">
          <p className="legal-page__updated">Last updated: April 8, 2026</p>

          <section className="legal-page__section">
            <h2>1. Account Responsibilities</h2>
            <p>
              You are responsible for keeping your account credentials secure and for activities
              under your account. You must provide accurate registration information and keep it updated.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>2. Acceptable Use</h2>
            <p>
              You agree not to misuse the platform, attempt unauthorized access, or submit harmful,
              fraudulent, or abusive content. We may suspend accounts violating these rules.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>3. Event Content and Credentials</h2>
            <p>
              Organizers are responsible for event details and participant communication. Hunchmate
              may moderate or remove content that violates policy or legal obligations.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>4. Service Changes</h2>
            <p>
              We may update, improve, or discontinue features as needed. Material changes to terms
              may be posted on this page, and continued use indicates acceptance of the updated terms.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>5. Contact</h2>
            <p>
              For legal questions, reach us at support@hunchmate.com through the Contact page.
            </p>
          </section>
        </article>
      </div>
    </section>
  );
}
