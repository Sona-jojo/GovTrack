# Track Complaint Page - Architecture & Structure

## 🏗️ Component Architecture

```
TrackingView (Main Component)
├── Header Section
│   ├── Back Arrow Navigation
│   ├── Page Title & Subtitle
│   └── Language Switcher
│
├── Primary Search Section (Glassmorphic Blue Gradient)
│   ├── Form Container
│   │   ├── Label & Format Helper
│   │   ├── Text Input (Track ID)
│   │   │   └── Auto-uppercase handler
│   │   ├── Search Button (with SearchIcon)
│   │   └── Error Message (with AlertIcon)
│   └── Validation & API Call
│
├── Alternative Search Toggle Button
│   └── Collapsible Section (Glassmorphic Amber Gradient)
│       ├── Description Text
│       ├── Form Container
│       │   ├── Phone Input
│       │   ├── Email Input
│       │   ├── Find Button (with SearchIcon)
│       │   └── Status Messages
│       └── Results Grid
│           ├── Card Item (repeated)
│           │   ├── Tracking ID
│           │   ├── Category
│           │   ├── Date
│           │   └── Status Badge
│           └── Result Count Display
│
└── Results Section (shown if record found)
    ├── Status Card Section (Glassmorphic gradient)
    │   ├── Title & Status Badge
    │   │   └── Animated status dot
    │   └── Interactive Cards Grid (sm:2 lg:4 cols)
    │       ├── Track ID Card
    │       │   ├── Icon (edit pencil)
    │       │   └── Monospace ID
    │       ├── Current Status Card
    │       │   └── Color-coded status text
    │       ├── Department Card
    │       │   └── Assignment info
    │       └── Deadline Card (conditional red if overdue)
    │           ├── Formatted deadline
    │           ├── Countdown timer
    │           └── ClockIcon
    │   └── Overdue Alert (conditional)
    │       ├── AlertIcon
    │       └── Escalation message
    │
    ├── Timeline Section
    │   ├── Section Title
    │   ├── Steps Grid (grid-cols-2 sm:4)
    │   │   ├── Step Card (x4)
    │   │   │   ├── Step Indicator (CheckIcon or number)
    │   │   │   └── Step Label
    │   │   └── Connection Lines (between steps)
    │   └── Reported Date Display
    │
    ├── Resolution Images Section (conditional)
    │   ├── Section Title
    │   └── Image Grid (grid-cols-2 sm:3 lg:4)
    │       ├── Image Link (repeated)
    │       │   ├── Image Element
    │       │   └── Hover Overlay (gradient + text)
    │       └── Image Type Label
    │
    └── Call-to-Action Section
        └── Full Details Button
            ├── Text
            └── Arrow Icon (animates on hover)

```

---

## 📊 State Management

```
TrackingView State Variables
│
├─ Search Form State
│  ├─ trackingId: string (user input)
│  ├─ loading: boolean (search in progress)
│  ├─ error: string (error message)
│  └─ record: object | null (search result)
│
├─ Alternative Search State
│  ├─ showFinder: boolean (section visibility)
│  ├─ lookupPhone: string (user input)
│  ├─ lookupEmail: string (user input)
│  ├─ lookupLoading: boolean (search in progress)
│  ├─ lookupError: string (error message)
│  ├─ lookupResults: array (search results)
│  └─ lookupSearched: boolean (searched flag)
│
├─ Computed Values
│  ├─ citizenStatus: string (normalized status)
│  ├─ timelineSteps: array (computed timeline)
│  └─ resolutionImages: array (filtered images)
│
└─ Effects
   ├─ useEffect: searchParams (prefill tracking ID)
   └─ useMemo: Various (computed values)
```

---

## 🔄 Data Flow

```
User Input (Search)
    ↓
Validation Check
    ↓
API Call (/api/complaints/track/{id})
    ├─ Error Response → Error state → Display error message
    ├─ Success Response → Record state → Display results
    │   ↓
    │   ├─ Normalize status → citizenStatus
    │   ├─ Compute timeline → timelineSteps
    │   ├─ Filter images → resolutionImages
    │   ├─ Render Status Cards
    │   ├─ Render Timeline
    │   └─ Render Images
    │
    └─ Loading state throughout

Alternative Search
    ↓
Validation Check (phone OR email)
    ↓
API Call (/api/complaints/find)
    ├─ Error → Display error
    ├─ Success Empty → Display "not found" message
    └─ Success With Data → Map results to cards
        └─ Link to /complaint/{id}
```

---

## 🎨 Visual Design System

```
Color Scheme Hierarchy
│
├─ Primary Colors
│  ├─ Blue: #3B82F6 (main brand)
│  ├─ Indigo: #6366F1 (accent)
│  └─ Gray: Used throughout for text/borders
│
├─ Status Colors
│  ├─ Green: Resolved ✓
│  ├─ Blue: Assigned/In Progress
│  ├─ Amber: Pending/Warning
│  └─ Red: Overdue/Error
│
├─ Interactive Colors
│  ├─ Hover: Lighter shade + shadow
│  ├─ Focus: Ring + border color
│  ├─ Disabled: Opacity 60% + no hover
│  └─ Active: Scale 105% effect
│
├─ Background Gradients
│  ├─ Primary Search: Blue-50 → Indigo-50
│  ├─ Alternative: Amber-50 → Orange-50
│  └─ Status: White → Blue-50 → Indigo-50
│
└─ Border & Shadow System
   ├─ Borders: 1px (default) | 2px (interactive cards)
   ├─ Shadows: None (default) | md (hover) | lg (focused)
   └─ Radius: xl (11px) | 2xl (16px) | full (pills)
```

---

## 📱 Responsive Grid System

```
Status Cards Layout
┌──────────────────────────────────────┐
│ Desktop (lg: ≥1024px)                │
├─────────┬─────────┬─────────┬────────┤
│  Card1  │  Card2  │  Card3  │ Card4  │
└─────────┴─────────┴─────────┴────────┘

┌──────────────────────────────┐
│ Tablet (sm: 640-1024px)      │
├────────────────┬─────────────┤
│     Card1      │    Card2    │
├────────────────┼─────────────┤
│     Card3      │    Card4    │
└────────────────┴─────────────┘

┌──────────────────────────┐
│ Mobile (< 640px)         │
├──────────────────────────┤
│        Card 1            │
├──────────────────────────┤
│        Card 2            │
├──────────────────────────┤
│        Card 3            │
├──────────────────────────┤
│        Card 4            │
└──────────────────────────┘
```

---

## 🎯 User Interaction Flow

```
Landing Page
    ↓
User Sees: "Track Your Complaint" with subtitle
    ↓
┌─────────────────────────────────────┐
│ Option 1: Have Track ID?            │
├─────────────────────────────────────┤
│  Enter → Track Issue → (Loading)    │
│  ├─ Success → Show status details   │
│  └─ Error → Show error message      │
└─────────────────────────────────────┘
         ↓ OR ↓
┌─────────────────────────────────────┐
│ Option 2: Don't have Track ID?      │
├─────────────────────────────────────┤
│ Expand section → Enter phone/email  │
│ → Find Complaints → (Loading)       │
│  ├─ Success → Show card grid        │
│  │   └─ Click card → View full page │
│  └─ Error/Empty → Show message      │
└─────────────────────────────────────┘
         ↓
     View Full Details (CTA)
         ↓
     Navigate to /complaint/{id}
```

---

## 🔌 API Integration Points

```
1. Primary Search
   ├─ Endpoint: /api/complaints/track/{id}
   ├─ Method: GET
   ├─ Input: trackingId (URL param)
   ├─ Output: { success, data: { tracking_id, status, ... } }
   └─ Error Handling: Display error message

2. Alternative Search
   ├─ Endpoint: /api/complaints/find
   ├─ Method: POST
   ├─ Input: { phone?, email? }
   ├─ Output: { success, data: { complaints: [...] } }
   └─ Error Handling: Show error or "not found"

3. Result Data Structure
   ├─ tracking_id: string
   ├─ status: string (normalized)
   ├─ category: string
   ├─ created_at: ISO date
   ├─ resolution_deadline: ISO date
   ├─ assigned_role: string
   ├─ local_bodies: { name: string, ... }
   ├─ complaint_images: [{ id, image_url, image_type }, ...]
   └─ [other fields as needed]
```

---

## 📚 Key Helper Functions

```
1. fmt(value: string | Date): string
   ├─ Input: ISO date string or Date object
   ├─ Output: "DD-MM-YYYY, HH:MM AM/PM"
   └─ Usage: Format all dates in display

2. normalizeCitizenStatus(status: string): string
   ├─ Input: Raw status from API
   ├─ Output: Normalized status for display
   ├─ Values: "pending", "assigned", "in_progress", "resolved", "overdue"
   └─ Usage: Determine color and display text

3. pick(lang, en, other): string
   ├─ Input: lang code, English text, other language text
   ├─ Output: Appropriate language text
   └─ Usage: Translate all UI strings

4. Countdown Component
   ├─ Input: deadline (date), status (string)
   ├─ Output: "Xd Yh Zm remaining" or "Overdue by..."
   ├─ Updates: Every 60 seconds
   └─ Usage: Real-time deadline display
```

---

## 🔐 Security Considerations

```
✓ Input Handling
  ├─ trackingId: URL encoded
  ├─ phone/email: Validated before sending
  └─ params: Sanitized on backend

✓ Data Protection
  ├─ API calls: HTTPS only
  ├─ No sensitive data in localStorage
  └─ Links: Safe navigation with encodeURIComponent

✓ XSS Prevention
  ├─ User input: Never directly rendered
  ├─ API data: Assumed safe from backend
  └─ Images: Safe from Next.js Image component

✓ CSRF Protection
  └─ Handled by Next.js framework
```

---

## 🧩 Component Dependencies

```
TrackingView
├─ React: useEffect, useMemo, useState
├─ Next.js: Link, Image, useSearchParams, useNavigation
│
├─ Local Components
│  ├─ BackArrowButton (navigation)
│  └─ LanguageSwitcher (i18n)
│
├─ Utilities
│  ├─ pick (language support)
│  └─ STATUS_COLORS, STATUS_LABELS (constants)
│
└─ SVG Icons (inline)
   ├─ SearchIcon
   ├─ CheckIcon
   ├─ ClockIcon
   ├─ AlertIcon
   └─ Various arrow/chevron icons
```

---

## ✅ Implementation Checklist

```
Phase 1: Component Updates
├─ [✓] Add icon components
├─ [✓] Update search form styling
├─ [✓] Update alternative search UI
├─ [✓] Update status card display
├─ [✓] Update timeline formatting
├─ [✓] Update image gallery
└─ [✓] Add new interactive effects

Phase 2: Testing
├─ [ ] Test on mobile devices
├─ [ ] Test on tablets
├─ [ ] Test on desktop
├─ [ ] Verify all interactions work
├─ [ ] Test error scenarios
└─ [ ] Verify accessibility

Phase 3: Deployment
├─ [ ] Code review
├─ [ ] QA sign-off
├─ [ ] Staging test
├─ [ ] Production deployment
└─ [ ] Monitor for issues
```

---

## 📈 Metrics to Track

```
Performance
├─ Page load time
├─ Interactive elements response
├─ Animation FPS (target: 60)
└─ Bundle size impact

User Experience
├─ Search completion rate
├─ Alternative search usage
├─ Time to find information
└─ User satisfaction score

Business
├─ Issues tracked per day
├─ Search success rate
├─ Conversion to full details
└─ Support ticket reduction
```

---

**Status:** ✅ Complete architecture documentation
