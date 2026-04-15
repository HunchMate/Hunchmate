import './Legal.css';

export default function Privacy() {
  return (
    <section className="legal-page">
      <div className="container legal-page__shell">
        <header className="legal-page__hero">
          <p className="legal-page__eyebrow">Legal</p>
          <h1>Privacy Policy</h1>
          <p>
            This policy explains what information we collect, how we use it, and how we
            protect your data when you use Hunchmate.
          </p>
        </header>

        <article className="legal-page__content">
          <p className="legal-page__updated">Last updated: April 8, 2026</p>

          <section className="legal-page__section">
            <h2>1. Information We Collect</h2>
            <p>
              We collect account information such as name, email, profile details, and activity
              data needed to provide event registration, check-in, and credentialing features.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>2. How We Use Data</h2>
            <p>
              Your information is used to operate the platform, secure accounts, process event
              participation, provide support, and improve user experience.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>3. Data Sharing</h2>
            <p>
              We share limited data with organizers and service providers only where necessary to
              deliver platform functions. We do not sell personal information.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>4. Security and Retention</h2>
            <p>
              We apply technical and organizational safeguards to protect data and retain personal
              information only as long as required for business or legal purposes.
            </p>
          </section>

          <section className="legal-page__section">
            <h2>5. Your Rights</h2>
            <p>
              You can request updates or deletion of personal information by contacting
              support@hunchmate.com. Some records may be retained where legally required.
            </p>
          </section>
        </article>
      </div>
    </section>
  );
}
