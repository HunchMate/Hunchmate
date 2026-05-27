import fs from 'fs';

let css = fs.readFileSync('src/pages/organizer/OrganizerDashboard.css', 'utf-8');

// The original UI was very blue-heavy. The user wants Orange as primary, Blue as secondary, White as bg.

// 1. Page background (#eff2f8 -> #f8f9ff)
css = css.replace(/#eff2f8/gi, 'var(--color-surface, #f8f9ff)');

// 2. Primary CTAs & Gradients (which were blue #4f79d2 / #3a61b5) -> Orange
css = css.replace(/linear-gradient\\([^)]+\\)/g, (match) => {
    if (match.includes('#4f79d2') || match.includes('#3a61b5') || match.includes('#5a82d6')) {
        return 'var(--color-primary, #ff6b00)'; // Flatten gradient to primary orange
    }
    return match;
});

css = css.replace(/#4f79d2/gi, 'var(--color-primary, #ff6b00)');
css = css.replace(/#3a61b5/gi, 'var(--color-accent-dark, #a04100)');
css = css.replace(/#3c67be/gi, 'var(--color-primary, #ff6b00)'); // borders/links
css = css.replace(/#3362b3/gi, 'var(--color-primary, #ff6b00)');

// 3. Keep white as white
css = css.replace(/#ffffff/gi, 'var(--color-card, #ffffff)');

// 4. Secondary accents (were maybe lighter blues or darks) -> New Blue (#2559bd)
css = css.replace(/#e7f0ff/gi, '#e5eeff'); // surface-container from snippet
css = css.replace(/#245ca6/gi, 'var(--color-secondary, #2559bd)'); // secondary blue
css = css.replace(/#153157/gi, 'var(--color-secondary, #2559bd)'); 

fs.writeFileSync('src/pages/organizer/OrganizerDashboard.css', css);
console.log('Successfully remapped colors in OrganizerDashboard.css');
