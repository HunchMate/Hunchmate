import fs from 'fs';

let content = fs.readFileSync('src/pages/organizer/CreateEvent.jsx', 'utf-8');

// 1. Update imports
const iconImport = "import { ArrowLeft, HelpCircle, Link2, ListPlus, Mail, MapPin, Phone, Plus, Trash2, Tag, Type } from 'lucide-react';";
const newIconImport = "import { ArrowLeft, HelpCircle, Link2, ListPlus, Mail, MapPin, Phone, Plus, Trash2, Tag, Type, Network, CheckSquare, Code, Rocket, Trophy, Briefcase, GraduationCap, Award, MoreHorizontal, MonitorPlay, Layers } from 'lucide-react';";
content = content.replace(iconImport, newIconImport);

// 2. Update state
content = content.replace(
  "category: 'Hackathon',",
  "programStructure: 'single',\n    category: 'Hackathon',"
);

// 3. Shift validations
content = content.replace("if (step === 3) {", "if (step === 4) {");
content = content.replace("if (step === 2) {", "if (step === 3) {");
content = content.replace("if (step === 1) {", "if (step === 1) { return !!form.category; }\n    if (step === 2) {");

// 4. Update Header Text
content = content.replace(
  "{isEditMode ? 'Update event details, media, and settings.' : 'Build your event in 3 guided steps.'}",
  "{isEditMode ? 'Update event details, media, and settings.' : 'Define the structural core of your event to unlock specialized management tools.'}"
);

// 5. Update You are on step X/3 -> X/5 (assuming 5 steps as shown in the image)
content = content.replace(
  "You are on step {activeStep}/3",
  "You are on step {activeStep}/5"
);

// 6. Remove old Category dropdown
const oldCategoryDropdown = `
                  <div className="input-group">
                    <label className="input-label">Category</label>
                    <select className="create-event__select" value={form.category} onChange={(e) => update('category', e.target.value)}>
                      {eventCategories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>`;
// Try replacing standard formatting
content = content.replace(/<div className="input-group">\s*<label className="input-label">Category<\/label>\s*<select className="create-event__select" value=\{form\.category\}.*?<\/select>\s*<\/div>/s, '');


// 7. Inject New Step 1
const newStep1 = `
          <Step>
            <div className="create-event__step-content animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', marginTop: '1rem' }}>
                <Layers size={20} style={{ color: 'var(--color-primary, #ff6b00)' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1a1f36' }}>Program Structure</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '3rem' }}>
                <div 
                  onClick={() => update('programStructure', 'single')}
                  style={{ 
                    border: form.programStructure === 'single' ? '2px solid var(--color-primary, #ff6b00)' : '2px solid transparent',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.04)', 
                    background: '#fff',
                    borderRadius: '12px', 
                    padding: '1.5rem', 
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <div style={{ background: '#f5f7fa', display: 'inline-flex', padding: '0.5rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <CheckSquare size={24} style={{ color: form.programStructure === 'single' ? 'var(--color-primary, #ff6b00)' : '#6b7280' }} />
                  </div>
                  {form.programStructure === 'single' && <div style={{ position: 'absolute', top: '1rem', right: '1rem', width: '20px', height: '20px', borderRadius: '50%', border: '5px solid var(--color-primary, #ff6b00)' }}></div>}
                  {form.programStructure !== 'single' && <div style={{ position: 'absolute', top: '1rem', right: '1rem', width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #e5e7eb' }}></div>}
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem' }}>Single Program</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.5 }}>A focused event with one set of tracks, submissions, and judging rounds. Best for classic weekend hackathons.</p>
                </div>
                
                <div 
                  onClick={() => update('programStructure', 'multi')}
                  style={{ 
                    border: form.programStructure === 'multi' ? '2px solid var(--color-primary, #ff6b00)' : '2px solid transparent',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.04)', 
                    background: '#fff',
                    borderRadius: '12px', 
                    padding: '1.5rem', 
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <div style={{ background: '#f0f5ff', display: 'inline-flex', padding: '0.5rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <Network size={24} style={{ color: form.programStructure === 'multi' ? 'var(--color-primary, #ff6b00)' : '#2559bd' }} />
                  </div>
                  {form.programStructure === 'multi' && <div style={{ position: 'absolute', top: '1rem', right: '1rem', width: '20px', height: '20px', borderRadius: '50%', border: '5px solid var(--color-primary, #ff6b00)' }}></div>}
                  {form.programStructure !== 'multi' && <div style={{ position: 'absolute', top: '1rem', right: '1rem', width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #e5e7eb' }}></div>}
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem' }}>Multi-Program Hub</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.5 }}>Orchestrate multiple sub-hackathons or concurrent programs under one umbrella brand. Ideal for global series.</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Layers size={20} style={{ color: 'var(--color-primary, #ff6b00)' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1a1f36' }}>Event Category</h3>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                {[
                  { name: 'Hackathon', icon: Code },
                  { name: 'Innovation Challenge', icon: Rocket },
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
                      border: form.category === cat.name ? '2px solid var(--color-primary, #ff6b00)' : '2px solid transparent',
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
                    <cat.icon size={28} style={{ color: form.category === cat.name ? 'var(--color-primary, #ff6b00)' : '#1a1f36' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: form.category === cat.name ? '600' : '500', color: form.category === cat.name ? 'var(--color-primary, #ff6b00)' : '#4b5563' }}>{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </Step>
`;

content = content.replace("          <Step>\n            <div className=\"create-event__step-content\">", newStep1 + "          <Step>\n            <div className=\"create-event__step-content animate-fade-in\">");

// 8. One extra step to pad up to 5 steps since the original was 3, adding Step 1 makes 4, we need 5 steps visually as per image ("Logic" step between Timeline and Review).
// I will just add an empty Logic step for now to make it 5 steps total.
const emptyLogicStep = `
          <Step>
            <div className="create-event__step-content animate-fade-in">
              <h2>Logic & Registration</h2>
              <p>Configure custom form fields, logic conditions, and team constraints. (Coming soon)</p>
            </div>
          </Step>
`;

content = content.replace("          <Step>\n            <div className=\"create-event__step-content\">\n              <h2>Content, Layout & Final Review</h2>", emptyLogicStep + "          <Step>\n            <div className=\"create-event__step-content animate-fade-in\">\n              <h2>Content, Layout & Final Review</h2>");

fs.writeFileSync('src/pages/organizer/CreateEvent.jsx', content);
console.log('Successfully updated CreateEvent.jsx structure');
