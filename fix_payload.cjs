const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'organizer', 'CreateEvent.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. UPDATE IMPORTS - add new icons
content = content.replace(
  "import { ArrowLeft, HelpCircle, Link2, ListPlus, Mail, MapPin, Phone, Plus, Trash2, Tag, Type } from 'lucide-react';",
  "import { ArrowLeft, HelpCircle, Link2, ListPlus, Mail, MapPin, Phone, Plus, Trash2, Tag, Type, Network, CheckSquare, Code, Rocket, Trophy, Briefcase, GraduationCap, Award, MoreHorizontal, MonitorPlay, Layers, Clock, DollarSign, Calendar } from 'lucide-react';"
);

// 2. ADD programStructure to form state
content = content.replace(
  "    title: '',\r\n    category: 'Hackathon',",
  "    title: '',\r\n    programStructure: 'single',\r\n    category: 'Hackathon',"
);

// 3. UPDATE addSubEvent to include new fields
content = content.replace(
  `  const addSubEvent = () => {\r\n    setSubEvents((prev) => [\r\n      ...prev,\r\n      {\r\n        title: '',\r\n        startDate: '',\r\n        endDate: '',\r\n        description: '',\r\n        milestones: [{ title: '', date: '', description: '' }],\r\n      },\r\n    ]);\r\n  };`,
  `  const addSubEvent = () => {\r\n    setSubEvents((prev) => [\r\n      ...prev,\r\n      {\r\n        title: '',\r\n        startDate: '',\r\n        endDate: '',\r\n        time: '',\r\n        entryFee: '',\r\n        prizeMoney: '',\r\n        description: '',\r\n        milestones: [{ title: '', date: '', description: '' }],\r\n      },\r\n    ]);\r\n  };`
);

// 4. UPDATE validateStep - Step 1 just checks category, old step 1 becomes step 2, old step 2 becomes step 3, old step 3 becomes step 4
content = content.replace(
  `  const validateStep = (step) => {\r\n    if (step === 1) {\r\n      if (!form.title.trim()) return { ok: false, reason: 'Add an event title to continue.' };\r\n      if (!form.shortDescription.trim()) return { ok: false, reason: 'Add a short description to continue.' };\r\n      if (!form.description.trim()) return { ok: false, reason: 'Add a full description to continue.' };\r\n      if (!form.organizerContactEmail.trim()) return { ok: false, reason: 'Organizer contact email is required.' };\r\n      if (!isValidEmail(form.organizerContactEmail)) return { ok: false, reason: 'Enter a valid organizer contact email.' };\r\n      if (!form.organizerContactPhone.trim()) return { ok: false, reason: 'Organizer contact phone is required.' };\r\n      if (!isValidPhone(form.organizerContactPhone)) return { ok: false, reason: 'Enter a valid 10-digit organizer contact phone number.' };\r\n      return { ok: true };\r\n    }\r\n\r\n    if (step === 2) {`,
  `  const validateStep = (step) => {\r\n    if (step === 1) { return !!form.category; }\r\n    if (step === 2) {\r\n      if (!form.title.trim()) return { ok: false, reason: 'Add an event title to continue.' };\r\n      if (!form.shortDescription.trim()) return { ok: false, reason: 'Add a short description to continue.' };\r\n      if (!form.description.trim()) return { ok: false, reason: 'Add a full description to continue.' };\r\n      if (!form.organizerContactEmail.trim()) return { ok: false, reason: 'Organizer contact email is required.' };\r\n      if (!isValidEmail(form.organizerContactEmail)) return { ok: false, reason: 'Enter a valid organizer contact email.' };\r\n      if (!form.organizerContactPhone.trim()) return { ok: false, reason: 'Organizer contact phone is required.' };\r\n      if (!isValidPhone(form.organizerContactPhone)) return { ok: false, reason: 'Enter a valid 10-digit organizer contact phone number.' };\r\n      return { ok: true };\r\n    }\r\n\r\n    if (step === 3) {`
);

// Fix remaining step numbers in validateStep
content = content.replace(
  "    if (step === 3) {\r\n      if (sections.media) {",
  "    if (step === 4) {\r\n      if (sections.media) {"
);

// 5. UPDATE subEvents in payload to include new fields
content = content.replace(
  "          endDate: String(subEvent.endDate || '').trim(),\r\n          description: String(subEvent.description || '').trim(),",
  "          endDate: String(subEvent.endDate || '').trim(),\r\n          time: String(subEvent.time || '').trim(),\r\n          entryFee: String(subEvent.entryFee || '').trim(),\r\n          prizeMoney: String(subEvent.prizeMoney || '').trim(),\r\n          description: String(subEvent.description || '').trim(),"
);

// 6. UPDATE hero subtitle
content = content.replace(
  "Build your event in 3 guided steps.",
  "Define the structural core of your event to unlock specialized management tools."
);

// 7. REPLACE Step 1 content - find the old Step 1 and replace with new Program Structure + Category + Mini Events
const oldStep1 = `          <Step>\r\n            <div className="create-event__step-content">\r\n              <h2>Basic Information</h2>\r\n              <div className="create-event__fields">\r\n                <Input\r\n                  label="Event Title"\r\n                  icon={Type}\r\n                  placeholder="e.g. Neural Nexus Hackathon"\r\n                  value={form.title}\r\n                  onChange={(e) => update('title', e.target.value)}\r\n                  required\r\n                />\r\n\r\n                <div className="create-event__row">\r\n                  <div className="create-event__select-group">\r\n                    <label className="input-label">Category</label>\r\n                    <select className="create-event__select" value={form.category} onChange={(e) => update('category', e.target.value)}>\r\n                      {eventCategories.map((category) => (\r\n                        <option key={category} value={category}>{category}</option>\r\n                      ))}\r\n                    </select>\r\n                  </div>\r\n\r\n                  <div className="create-event__select-group">\r\n                    <label className="input-label">Mode</label>\r\n                    <select className="create-event__select" value={form.mode} onChange={(e) => update('mode', e.target.value)}>\r\n                      {eventModes.map((eventMode) => (\r\n                        <option key={eventMode} value={eventMode}>{eventMode}</option>\r\n                      ))}\r\n                    </select>\r\n                  </div>\r\n                </div>\r\n\r\n                <Input\r\n                  label="Short Description"\r\n                  placeholder="One-liner about your event"\r\n                  value={form.shortDescription}\r\n                  onChange={(e) => update('shortDescription', e.target.value)}\r\n                />\r\n\r\n                <Input\r\n                  label="Full Description"\r\n                  type="textarea"\r\n                  placeholder="Detailed event description"\r\n                  value={form.description}\r\n                  onChange={(e) => update('description', e.target.value)}\r\n                />\r\n\r\n                <Input\r\n                  label="Themes (comma separated)"\r\n                  icon={Tag}\r\n                  placeholder="Hackathon, Coding Competition, AI Sprint"\r\n                  value={form.themes}\r\n                  onChange={(e) => update('themes', e.target.value)}\r\n                />\r\n\r\n                <div className="create-event__row">\r\n                  <Input\r\n                    label="Organizer Contact Email"\r\n                    icon={Mail}\r\n                    placeholder="organizer@institution.edu"\r\n                    value={form.organizerContactEmail}\r\n                    onChange={(e) => update('organizerContactEmail', e.target.value)}\r\n                    required\r\n                  />\r\n                  <Input\r\n                    label="Organizer Contact Phone"\r\n                    icon={Phone}\r\n                    placeholder="9876543210"\r\n                    value={form.organizerContactPhone}\r\n                    onChange={(e) => update('organizerContactPhone', e.target.value)}\r\n                    required\r\n                  />\r\n                </div>\r\n              </div>\r\n            </div>\r\n          </Step>`;

const newStep1AndStep2 = `          <Step>
            <div className="create-event__step-content animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', marginTop: '1rem' }}>
                <Layers size={20} style={{ color: '#ff6b00' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1a1f36' }}>Program Structure</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '3rem' }}>
                <div 
                  onClick={() => update('programStructure', 'single')}
                  style={{ 
                    border: form.programStructure === 'single' ? '2px solid #ff6b00' : '2px solid transparent',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.04)', 
                    background: '#fff',
                    borderRadius: '12px', 
                    padding: '1.5rem', 
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <div style={{ background: '#f5f7fa', display: 'inline-flex', padding: '0.5rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <CheckSquare size={24} style={{ color: form.programStructure === 'single' ? '#ff6b00' : '#6b7280' }} />
                  </div>
                  {form.programStructure === 'single' && <div style={{ position: 'absolute', top: '1rem', right: '1rem', width: '20px', height: '20px', borderRadius: '50%', border: '5px solid #ff6b00' }}></div>}
                  {form.programStructure !== 'single' && <div style={{ position: 'absolute', top: '1rem', right: '1rem', width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #e5e7eb' }}></div>}
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', color: '#ff6b00' }}>Single Program</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.5 }}>A focused event with one set of tracks, submissions, and judging rounds. Best for classic weekend hackathons.</p>
                </div>
                
                <div 
                  onClick={() => update('programStructure', 'multi')}
                  style={{ 
                    border: form.programStructure === 'multi' ? '2px solid #ff6b00' : '2px solid transparent',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.04)', 
                    background: '#fff',
                    borderRadius: '12px', 
                    padding: '1.5rem', 
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <div style={{ background: '#f0f5ff', display: 'inline-flex', padding: '0.5rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <Network size={24} style={{ color: form.programStructure === 'multi' ? '#ff6b00' : '#2559bd' }} />
                  </div>
                  {form.programStructure === 'multi' && <div style={{ position: 'absolute', top: '1rem', right: '1rem', width: '20px', height: '20px', borderRadius: '50%', border: '5px solid #ff6b00' }}></div>}
                  {form.programStructure !== 'multi' && <div style={{ position: 'absolute', top: '1rem', right: '1rem', width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #e5e7eb' }}></div>}
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', color: '#ff6b00' }}>Multi-Program Hub</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.5 }}>Orchestrate multiple sub-hackathons or concurrent programs under one umbrella brand. Ideal for global series.</p>
                </div>
              </div>

              {/* Mini Events section - visible only when Multi-Program Hub is selected */}
              {form.programStructure === 'multi' && (
                <div style={{
                  background: 'linear-gradient(135deg, #fff8f0 0%, #fff 100%)',
                  border: '2px solid #ffe0c2',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  marginBottom: '2rem',
                  animation: 'fadeSlideDown 0.35s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ListPlus size={20} style={{ color: '#ff6b00' }} />
                      <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1a1f36' }}>Mini Events</h3>
                    </div>
                    <button
                      type="button"
                      onClick={addSubEvent}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        background: '#ff6b00', color: '#fff', border: 'none',
                        borderRadius: '8px', padding: '0.5rem 1rem',
                        fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#e55d00'}
                      onMouseLeave={e => e.currentTarget.style.background = '#ff6b00'}
                    >
                      <Plus size={16} /> Add Mini Event
                    </button>
                  </div>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                    Add individual sub-events that run under this program hub. Each mini event gets its own listing.
                  </p>

                  {subEvents.length === 0 && (
                    <div style={{
                      border: '2px dashed #e5e7eb', borderRadius: '12px',
                      padding: '2rem', textAlign: 'center', color: '#9ca3af'
                    }}>
                      <Network size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>No mini events yet. Click "Add Mini Event" to create one.</p>
                    </div>
                  )}

                  {subEvents.map((sub, idx) => (
                    <div key={idx} style={{
                      background: '#fff', border: '1px solid #e5e7eb',
                      borderRadius: '12px', padding: '1.25rem',
                      marginBottom: idx < subEvents.length - 1 ? '1rem' : 0,
                      position: 'relative',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ff6b00', background: '#fff3e8', padding: '0.25rem 0.75rem', borderRadius: '20px' }}>
                          Mini Event {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSubEvent(idx)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#ef4444', padding: '0.25rem'
                          }}
                          title="Remove mini event"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Event Name *</label>
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
                            <span style={{ padding: '0.5rem', background: '#f9fafb', display: 'flex' }}><Type size={16} style={{ color: '#6b7280' }} /></span>
                            <input
                              type="text"
                              placeholder="e.g. AI Sprint"
                              value={sub.title}
                              onChange={e => updateSubEvent(idx, 'title', e.target.value)}
                              style={{ border: 'none', outline: 'none', padding: '0.5rem', width: '100%', fontSize: '0.9rem' }}
                            />
                          </div>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Date *</label>
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
                            <span style={{ padding: '0.5rem', background: '#f9fafb', display: 'flex' }}><Calendar size={16} style={{ color: '#6b7280' }} /></span>
                            <input
                              type="date"
                              value={sub.startDate}
                              onChange={e => updateSubEvent(idx, 'startDate', e.target.value)}
                              style={{ border: 'none', outline: 'none', padding: '0.5rem', width: '100%', fontSize: '0.9rem' }}
                            />
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Time</label>
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
                            <span style={{ padding: '0.5rem', background: '#f9fafb', display: 'flex' }}><Clock size={16} style={{ color: '#6b7280' }} /></span>
                            <input
                              type="time"
                              value={sub.time || ''}
                              onChange={e => updateSubEvent(idx, 'time', e.target.value)}
                              style={{ border: 'none', outline: 'none', padding: '0.5rem', width: '100%', fontSize: '0.9rem' }}
                            />
                          </div>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Entry Fee</label>
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
                            <span style={{ padding: '0.5rem', background: '#f9fafb', display: 'flex' }}><DollarSign size={16} style={{ color: '#6b7280' }} /></span>
                            <input
                              type="text"
                              placeholder="e.g. Free / \u20b9500"
                              value={sub.entryFee || ''}
                              onChange={e => updateSubEvent(idx, 'entryFee', e.target.value)}
                              style={{ border: 'none', outline: 'none', padding: '0.5rem', width: '100%', fontSize: '0.9rem' }}
                            />
                          </div>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Prize Money</label>
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
                            <span style={{ padding: '0.5rem', background: '#f9fafb', display: 'flex' }}><Trophy size={16} style={{ color: '#6b7280' }} /></span>
                            <input
                              type="text"
                              placeholder="e.g. \u20b950,000"
                              value={sub.prizeMoney || ''}
                              onChange={e => updateSubEvent(idx, 'prizeMoney', e.target.value)}
                              style={{ border: 'none', outline: 'none', padding: '0.5rem', width: '100%', fontSize: '0.9rem' }}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Short Description</label>
                        <textarea
                          placeholder="Brief description of this mini event..."
                          value={sub.description}
                          onChange={e => updateSubEvent(idx, 'description', e.target.value)}
                          rows={2}
                          style={{
                            width: '100%', border: '1px solid #d1d5db', borderRadius: '8px',
                            padding: '0.5rem 0.75rem', fontSize: '0.9rem', resize: 'vertical',
                            outline: 'none', fontFamily: 'inherit'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Layers size={20} style={{ color: '#ff6b00' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1a1f36' }}>Event Category</h3>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                {[
                  { name: 'Hackathon', icon: Code },
                  { name: 'Innovation Challenge', icon: Rocket },
                  { name: 'Datathon', icon: Code }, 
                  { name: 'Ideathon', icon: Rocket },
                  { name: 'Competition', icon: Trophy },
                  { name: 'Workshop', icon: MonitorPlay },
                  { name: 'Bootcamp', icon: GraduationCap },
                  { name: 'Hiring Challenge', icon: Briefcase },
                  { name: 'Fellowship', icon: Award },
                  { name: 'Other', icon: MoreHorizontal },
                ].map(cat => (
                  <div
                    key={cat.name}
                    onClick={() => update('category', cat.name)}
                    style={{
                      border: form.category === cat.name ? '2px solid #ff6b00' : '2px solid transparent',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                      background: '#fff',
                      borderRadius: '12px',
                      padding: '1.5rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '1rem',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <cat.icon size={28} style={{ color: form.category === cat.name ? '#ff6b00' : '#1a1f36' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: form.category === cat.name ? '600' : '500', color: form.category === cat.name ? '#ff6b00' : '#4b5563' }}>{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </Step>
          <Step>
            <div className="create-event__step-content">
              <h2>Basic Information</h2>
              <div className="create-event__fields">
                <Input
                  label="Event Title"
                  icon={Type}
                  placeholder="e.g. Neural Nexus Hackathon"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  required
                />

                <div className="create-event__row">
                  <div className="create-event__select-group" style={{ width: '100%' }}>
                    <label className="input-label">Mode</label>
                    <select className="create-event__select" value={form.mode} onChange={(e) => update('mode', e.target.value)}>
                      {eventModes.map((eventMode) => (
                        <option key={eventMode} value={eventMode}>{eventMode}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Input
                  label="Short Description"
                  placeholder="One-liner about your event"
                  value={form.shortDescription}
                  onChange={(e) => update('shortDescription', e.target.value)}
                />

                <Input
                  label="Full Description"
                  type="textarea"
                  placeholder="Detailed event description"
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                />

                <Input
                  label="Themes (comma separated)"
                  icon={Tag}
                  placeholder="Hackathon, Coding Competition, AI Sprint"
                  value={form.themes}
                  onChange={(e) => update('themes', e.target.value)}
                />

                <div className="create-event__row">
                  <Input
                    label="Organizer Contact Email"
                    icon={Mail}
                    placeholder="organizer@institution.edu"
                    value={form.organizerContactEmail}
                    onChange={(e) => update('organizerContactEmail', e.target.value)}
                    required
                  />
                  <Input
                    label="Organizer Contact Phone"
                    icon={Phone}
                    placeholder="9876543210"
                    value={form.organizerContactPhone}
                    onChange={(e) => update('organizerContactPhone', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </Step>`;

if (!content.includes(oldStep1)) {
  console.error('ERROR: Could not find old Step 1 content to replace!');
  process.exit(1);
}

content = content.replace(oldStep1, newStep1AndStep2);

fs.writeFileSync(filePath, content, 'utf8');

// Also update the CSS
const cssPath = path.join(__dirname, 'src', 'pages', 'organizer', 'CreateEvent.css');
let css = fs.readFileSync(cssPath, 'utf8');
if (!css.includes('fadeSlideDown')) {
  css = css.replace(
    '@keyframes createEventToastIn {',
    `@keyframes fadeSlideDown {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes createEventToastIn {`
  );
  fs.writeFileSync(cssPath, css, 'utf8');
}

console.log('All changes applied successfully!');
console.log('File length:', content.split('\n').length, 'lines');
