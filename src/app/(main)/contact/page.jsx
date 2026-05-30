'use client';

import { useMemo, useState } from 'react';
import { Mail, MessageSquare, Phone, Send, MapPin, Building2 } from 'lucide-react';
import '@/vite-pages/Contact.css';

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  subject: '',
  message: '',
};

export default function Contact() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ type: '', text: '' });

  const canSubmit = useMemo(() => {
    return Boolean(
      form.firstName.trim()
      && form.lastName.trim()
      && form.email.trim()
      && form.subject.trim()
      && form.message.trim()
    );
  }, [form]);

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setNotice({ type: '', text: '' });

    const contactApiUrl = (typeof process !== 'undefined' && process.env ? (process.env.NEXT_PUBLIC_CONTACT_EMAIL_API_URL || process.env.VITE_CONTACT_EMAIL_API_URL) : '') ||
      (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_CONTACT_EMAIL_API_URL : '') ||
      'http://localhost:8787/api/contact/email';

    try {
      const response = await fetch(contactApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
          email: form.email.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to send message. Please try again.');
      }

      setForm(INITIAL_FORM);
      setNotice({ type: 'success', text: 'Message sent. Our team has been notified.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Unable to send message. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="contact-page">
      <div className="container contact-page__shell">
        <header className="contact-page__hero">
          <p className="contact-page__eyebrow">Contact us</p>
          <h1>Chat to our friendly team</h1>
          <p>
            We&apos;d love to hear from you. Please fill out this form or shoot us an email.
          </p>
        </header>

        <div className="contact-page__grid">
          <aside className="contact-page__panel contact-page__panel--channels">
            <article className="contact-channel-card">
              <span className="contact-channel-card__icon"><Mail size={18} /></span>
              <h2>Email</h2>
              <p>Our friendly team is here to help.</p>
              <a href="mailto:hunchmate@gmail.com">hunchmate@gmail.com</a>
            </article>

            <article className="contact-channel-card">
              <span className="contact-channel-card__icon"><MessageSquare size={18} /></span>
              <h2>Live chat</h2>
              <p>Connect with us for quick support.</p>
              <a href="https://hunchmate.com" target="_blank" rel="noreferrer">Start new chat</a>
            </article>

            <article className="contact-channel-card">
              <span className="contact-channel-card__icon"><Building2 size={18} /></span>
              <h2>Office</h2>
              <p>Come say hello at our office HQ.</p>
              <p>Geenovate TBI,<br/>Hyderabad, Telangana - 501301</p>
            </article>

            <article className="contact-channel-card">
              <span className="contact-channel-card__icon"><Phone size={18} /></span>
              <h2>Phone</h2>
              <p>Mon-Fri from 8am to 5pm.</p>
              <a href="tel:+917993662605">+91 79936 62605</a>
            </article>
          </aside>

          <article className="contact-page__panel contact-page__panel--form">
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="contact-form__row">
                <label>
                  First Name
                  <input value={form.firstName} onChange={handleChange('firstName')} placeholder="John" required />
                </label>

                <label>
                  Last Name
                  <input value={form.lastName} onChange={handleChange('lastName')} placeholder="Doe" required />
                </label>
              </div>

              <label>
                Email address
                <input type="email" value={form.email} onChange={handleChange('email')} placeholder="john@example.com" required />
              </label>

              <label>
                Subject
                <input value={form.subject} onChange={handleChange('subject')} placeholder="How can we help?" required />
              </label>

              <label>
                Message
                <textarea
                  rows={7}
                  value={form.message}
                  onChange={handleChange('message')}
                  placeholder="Tell us a little about your request"
                  required
                />
              </label>

              <button type="submit" disabled={!canSubmit || loading}>
                <Send size={16} /> {loading ? 'Sending...' : 'Send message'}
              </button>

              {notice.text ? (
                <p className={`contact-form__notice ${notice.type === 'error' ? 'contact-form__notice--error' : ''}`}>
                  {notice.text}
                </p>
              ) : null}
            </form>
          </article>
        </div>

        <div className="contact-page__map-note">
          <span><MapPin size={16} /></span>
          <p>Best response time: within 24 hours on business days.</p>
        </div>
      </div>
    </section>
  );
}
