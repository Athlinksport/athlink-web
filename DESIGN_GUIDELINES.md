# Athlink Design Guidelines

## Brand Philosophy

Athlink is a premium social platform built for athletes. It should help people express their athletic identity, discover others, build meaningful connections, and stay engaged with their communities.

The product experience should feel:

- **Calm:** Information is easy to scan, interfaces are composed, and visual noise is limited.
- **Modern:** Patterns feel current and purposeful without depending on short-lived trends.
- **Trustworthy:** Actions are predictable, states are clear, and users remain confident about what will happen next.
- **Energetic:** Lime accents, responsive feedback, and selective motion convey momentum and athletic ambition.
- **Elegant:** Every element earns its place through careful hierarchy, proportion, and restraint.

Athlink should project confidence without appearing aggressive. Its premium character comes from clarity, consistency, and attention to detail—not decoration or excess.

---

## Core Design Principles

### Simplicity Over Decoration

Prioritize user goals and content. Remove elements that do not improve understanding, navigation, or task completion. Decoration must never compete with athletic achievements, conversations, profiles, or calls to action.

### Motion Supports Content

Use motion to explain changes, preserve context, and acknowledge actions. Animation should make the interface easier to understand, never become the focus itself.

### Consistency Everywhere

The same action, state, or content type should look and behave consistently across the product. Reuse established patterns before introducing new ones. Consistency applies to language, spacing, hierarchy, interaction, and feedback.

### Fast Interactions

Athlink should feel immediate. Make primary actions easy to find, reduce unnecessary steps, and provide prompt feedback. When waiting is unavoidable, communicate progress without blocking unrelated activity.

### Accessibility First

Accessibility is a design requirement from the beginning, not a final review step. Information and actions must remain understandable across different abilities, devices, input methods, and user preferences.

### Mobile-First Mindset

Design the essential experience for the smallest supported screen first. Larger layouts should add breathing room, context, or efficiency rather than merely enlarging mobile interfaces.

---

## Color System

Color communicates hierarchy, interaction, and state. It should not be the only means of conveying meaning.

### Primary Accent: Lime

Lime represents energy, progress, and connection. Use it for primary actions, active navigation states, selected controls, important progress indicators, and concise moments of emphasis.

Avoid applying lime to large surfaces, long passages of text, or many competing elements. Its impact depends on restraint. Ensure lime foreground and background combinations meet contrast requirements.

### Background: Dark Navy

Dark navy is the foundation of the Athlink experience. Use it for primary page backgrounds and immersive application areas. It should feel softer and more distinctive than pure black while providing stable contrast for content.

### Elevated Surfaces: Brighter Navy

Use a slightly brighter navy for cards, menus, dialogs, navigation surfaces, and other content that sits above the page background. Differences between elevation levels should be subtle but perceptible, supported by borders or shadow only when needed.

### Muted Text

Muted text supports secondary information such as timestamps, metadata, hints, and supplementary labels. It must remain legible and should never be used for essential instructions, primary content, or critical states.

### Borders

Borders should use low-contrast navy or neutral tones. Use them to define structure, separate adjacent surfaces, and clarify interactive boundaries. Avoid heavy outlines and excessive dividers; spacing should provide separation whenever possible.

### Status Colors

- **Success:** Use for completed actions, positive outcomes, verified states, and healthy progress.
- **Warning:** Use for situations requiring attention that do not yet prevent progress.
- **Error:** Use for failed actions, invalid input, destructive consequences, and critical problems.
- **Information:** Use for neutral guidance, updates, and contextual notices.

Status colors must be reserved for their defined meaning throughout the product. Pair every status color with clear language and, where helpful, a recognizable symbol. Do not use status colors as general decoration.

---

## Typography

Typography should create an immediate, dependable hierarchy while remaining highly readable across screen sizes.

### Titles

Titles identify pages, major views, and significant content. They should be concise, confident, and visually dominant without becoming oversized. Use one clear primary title per view whenever possible.

### Subtitles

Subtitles provide context or explain the purpose of a title. Keep them brief and visually subordinate. Avoid repeating information already conveyed by the title.

### Body Text

Body text should favor comfortable reading over density. Use clear sentence structure, moderate line length, and sufficient line spacing. Primary content should have stronger contrast than supporting information.

### Captions

Captions are appropriate for timestamps, labels, media descriptions, and supporting metadata. They should remain readable and should not carry information required to complete a task.

### Hierarchy

Establish hierarchy through a consistent combination of size, weight, contrast, and placement. Do not rely on size alone. Limit the number of visually competing text styles within a single view.

### Typographic Spacing

Keep related headings and content close together, with more space between distinct groups. Text spacing should create a predictable rhythm. Avoid isolated headings, cramped paragraphs, and inconsistent gaps between equivalent elements.

---

## Layout

### Page Width

Use a readable maximum width for primary content on large screens. Data-rich or social views may use more horizontal space when it improves context, but content should not stretch simply because space is available.

### Padding

Page and container padding should protect content from screen edges and remain consistent at each responsive size. Compact screens require efficient padding without making the interface feel crowded.

### Spacing

Use a shared spacing rhythm across the product. Small gaps communicate close relationships; larger gaps separate groups and sections. Equivalent relationships should use equivalent spacing.

### Cards

Cards should group related information or actions, not serve as default containers for every element. Keep card hierarchy shallow. Use restrained elevation, soft borders, and rounded corners consistently.

### Sections

Each section should have a clear purpose and visual beginning. Separate sections primarily through whitespace and hierarchy, adding dividers or surfaces only where they improve comprehension.

### Alignment

Align content to a deliberate grid. Text, controls, and media should share clear edges. Center alignment is best reserved for focused, low-density moments such as empty states or confirmations; content-heavy layouts should generally use leading alignment.

### Whitespace

Whitespace is an active part of the interface. Use it to improve focus, pacing, and perceived quality. Do not fill empty space without a product need, but avoid generous spacing that pushes essential content or actions out of reach.

---

## Components

### Buttons

Buttons must communicate priority and consequence clearly. Each focused area should have one obvious primary action. Secondary and quiet actions should carry less visual weight. Destructive actions require unmistakable labeling and appropriate confirmation when consequences are difficult to reverse.

Use concise, action-oriented labels. Disabled states must remain recognizable, and loading states should preserve the button's context and dimensions.

### Inputs

Inputs need persistent, descriptive labels. Placeholder text may provide an example but must not replace a label. Clearly distinguish default, focused, completed, disabled, and error states. Validation should be specific, respectful, and placed near the relevant field.

### Navbar

Navigation should make the user's current location obvious and keep core destinations predictable. Prioritize the most frequent destinations, maintain consistent ordering, and avoid overcrowding. Mobile navigation should favor reachability and clarity over exposing every option.

### Dialogs

Dialogs are for focused decisions, short tasks, and important confirmations. They should have a clear title, concise context, an obvious primary action, and a safe way to dismiss when appropriate. Avoid stacking dialogs or using them for complex, exploratory workflows.

### Cards

Card content should follow a consistent order: identity or context, primary information, supporting metadata, then actions. Entire-card interactions and embedded controls must remain distinguishable. Avoid excessive nested surfaces.

### Badges

Badges communicate compact status, category, or identity information. Keep labels short and meanings stable. Use emphasis proportional to importance, and avoid filling interfaces with badges that compete for attention.

### Lists

Lists should support rapid scanning with consistent row height, alignment, and metadata placement. Clearly distinguish selectable, navigational, and informational rows. Provide meaningful empty, loading, and error states.

### Forms

Forms should follow a logical sequence and ask only for necessary information. Group related fields, explain unfamiliar requirements, and make completion progress clear in longer flows. Preserve user input when recoverable errors occur. Submission feedback must be immediate and unambiguous.

---

## Motion Guidelines

Animations should never distract from content or delay a user's intent.

- Keep most interface animation durations between **150 and 350 milliseconds**.
- Use shorter durations for direct feedback and longer durations for meaningful transitions.
- Prefer changes based on transform and opacity for smooth, stable motion.
- Use consistent easing so interactions feel related across the product.
- Preserve spatial context when surfaces open, close, enter, leave, or reorganize.
- Avoid continuous, ornamental, or simultaneous animations that compete for attention.
- Never make essential information dependent on animation.
- Respect the user's reduced-motion preference and provide an equivalent experience with motion minimized or removed.

Motion should feel responsive and composed: energetic enough to express the brand, restrained enough to preserve trust.

---

## Background Animation System

Background animation gives major Athlink areas a distinct emotional identity while preserving a unified visual language. It should act as atmosphere, not content.

Each page may express its purpose through a restrained motion concept:

- **Dashboard — Energy:** Controlled pulses, momentum, and subtle directional movement suggest activity and progress.
- **Discover — Connections:** Gentle points, paths, or converging movement suggest finding people and opportunities.
- **Messages — Calm Flow:** Slow, fluid movement supports the rhythm of conversation without creating urgency.
- **Profile — Identity:** Focused forms or quiet radiance reinforce individuality and personal presence.
- **Connections — Network:** Subtle relational movement suggests a living athletic community.

All background treatments must:

- Remain visually subordinate to page content.
- Preserve text, control, and status contrast in every state.
- Avoid interfering with reading, selection, navigation, or media.
- Adapt gracefully to different screen sizes and content densities.
- Reduce or stop when motion preferences, performance conditions, or task focus require it.
- Share a coherent palette, softness, and motion character across the product.

Page identity should come from concept and behavior, not from louder colors or added complexity.

---

## Responsive Design

### Mobile

Mobile is the baseline experience. Prioritize primary content, reachable controls, concise navigation, and linear task flows. Avoid horizontal overflow and ensure fixed interface elements do not obscure content or input.

### Tablet

Tablet layouts may introduce additional context, wider content, or split views when these improve efficiency. Preserve touch comfort and avoid layouts that feel like scaled-up mobile screens or compressed desktop screens.

### Desktop

Desktop layouts should use space to improve navigation, comparison, and multitasking. Introduce supporting columns or persistent context only when they reduce effort. Keep primary content focused and readable.

### Large Desktop

Large screens should gain balanced margins, purposeful secondary content, or controlled multi-column layouts. Do not stretch text, forms, cards, or navigation beyond comfortable proportions.

### Touch Targets

Interactive targets must be large enough to select reliably and spaced to prevent accidental activation. Compact visual controls may use a larger invisible interaction area. Important actions should remain comfortably reachable on mobile devices.

### Safe Areas

Respect device safe areas, browser controls, display cutouts, and on-screen keyboards. Essential navigation, actions, and composer controls must remain visible and operable without colliding with system UI.

---

## Accessibility

### Keyboard Navigation

Every interactive flow must be fully operable by keyboard. Focus order should match the visual and logical order. Avoid keyboard traps, and restore focus appropriately when temporary surfaces close.

### Accessible Names and ARIA

Controls need clear accessible names, roles, states, and relationships. Use ARIA to clarify behavior when native meaning is insufficient, not to compensate for unclear interaction design. Dynamic feedback should be announced appropriately without overwhelming users.

### Contrast

Text, icons, controls, focus indicators, and meaningful boundaries must meet recognized contrast standards. Verify contrast across default, hover, active, disabled, and error states, including over animated backgrounds.

### Focus Rings

Focus indicators must be visible, consistent, and distinct from selection or hover states. Never remove focus indication without providing an equally clear replacement.

### Reduced Motion

Honor reduced-motion preferences throughout the experience, including page transitions, ambient backgrounds, loading feedback, and content updates. Reduced motion must not reduce clarity or remove essential status feedback.

Accessibility also requires clear language, predictable behavior, scalable text, meaningful alternatives for media, and independence from color, sound, gesture, or motion alone.

---

## Performance

Performance is part of perceived design quality. Athlink should feel stable and responsive under realistic device and network conditions.

- Avoid unnecessary rendering and visual updates.
- Favor GPU-friendly motion based on transform and opacity.
- Minimize layout shifts by reserving space for content, media, and loading states.
- Maintain **60 frames per second whenever possible**, especially during scrolling and direct manipulation.
- Keep background effects lightweight and reduce their complexity on constrained devices.
- Prioritize visible and interactive content before decorative or secondary elements.
- Use stable loading states that preserve context and avoid flashing or abrupt reflow.
- Ensure degraded performance never blocks essential actions or obscures feedback.

Design decisions should be evaluated on both their visual value and their cost to responsiveness.

---

## Future Vision

Athlink should mature into a product whose quality feels comparable to Linear, Notion, Strava, and Arc Browser without copying their visual language or interaction patterns.

The goal is not resemblance. The goal is the same level of coherence, craft, speed, confidence, and product judgment. Athlink should build its own recognizable identity around athletic ambition, genuine connection, and calm momentum.

As the platform grows:

- New experiences should extend the shared system before introducing exceptions.
- Product complexity should not become interface complexity.
- Personalization should preserve predictability and accessibility.
- New visual expressions should remain recognizably Athlink.
- Quality should be measured across complete journeys, not isolated screens.

These guidelines are a living standard. They should evolve through user research, accessibility review, product learning, and deliberate design critique while preserving the principles that make Athlink distinctive.
