# Before & After Comparison - Track Complaint Page

## Quick Comparison

### Search Section

**BEFORE:**
```jsx
<form onSubmit={search} className="mt-5 rounded-2xl border border-blue-100 bg-white p-4 sm:p-5">
  <label className="text-sm font-semibold text-gray-800">
    Enter Track ID
  </label>
  <div className="mt-2 flex flex-col gap-3 sm:flex-row">
    <input
      type="text"
      value={trackingId}
      onChange={(e) => setTrackingId(e.target.value)}
      placeholder="NP-KTM-2026-0001"
      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm"
    />
    <button disabled={loading} className="ui-button-primary">
      {loading ? "Loading..." : "Track Issue"}
    </button>
  </div>
</form>
```

**AFTER:**
```jsx
<div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-lg ring-1 ring-white/50 backdrop-blur-sm sm:p-8">
  <form onSubmit={search} className="space-y-4">
    <div>
      <label className="block text-sm font-semibold text-gray-800">
        {pick(lang, "Enter Your Track ID", "...")}
      </label>
      <p className="mt-1 text-xs text-gray-600">Format: NP-KTM-YYYY-XXXX</p>
    </div>
    
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <input
          type="text"
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
          placeholder="NP-KTM-2024-0001"
          className="w-full rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm font-medium outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
      </div>
      <button
        disabled={loading || !trackingId.trim()}
        className="ui-button-primary flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        <SearchIcon />
        {loading ? "Searching..." : "Track Issue"}
      </button>
    </div>
  </form>
</div>
```

**Key Improvements:**
- ✅ Gradient background with glassmorphism effect
- ✅ Helper text explaining the format
- ✅ 2px borders instead of 1px (more prominent)
- ✅ Auto-uppercase for Track ID input
- ✅ Icon in search button for better clarity
- ✅ Better visual hierarchy with subtitle
- ✅ Thicker padding and better spacing
- ✅ Hover scale effect on button
- ✅ Disabled state with clear visual feedback

---

## Status Display Section

**BEFORE:**
```jsx
<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
    <p className="text-xs font-semibold uppercase text-gray-500">Track ID</p>
    <p className="mt-1 text-sm font-bold text-gray-900">{record.tracking_id}</p>
  </div>
  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
    <p className="text-xs font-semibold uppercase text-gray-500">Status</p>
    <p className="mt-1 text-sm font-bold text-gray-900">{status}</p>
  </div>
  {/* ...more cards... */}
</div>
```

**AFTER:**
```jsx
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  {/* Track ID Card */}
  <div className="group rounded-xl border-2 border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-md hover:scale-105">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase text-gray-500">Track ID</p>
        <p className="mt-2 font-mono text-sm font-bold text-gray-900">{record.tracking_id}</p>
      </div>
      <svg className="h-5 w-5 text-gray-400 transition group-hover:text-blue-600">
        {/* Edit icon */}
      </svg>
    </div>
  </div>
  
  {/* Status Card */}
  <div className="group rounded-xl border-2 border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-md hover:scale-105">
    <p className="text-xs font-semibold uppercase text-gray-500">Current Status</p>
    <p className={`mt-2 text-sm font-bold ${...colorClass}`}>
      {citizenStatus}
    </p>
  </div>
  
  {/* Department Card */}
  <div className="group rounded-xl border-2 border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-md hover:scale-105">
    <p className="text-xs font-semibold uppercase text-gray-500">Assigned To</p>
    <p className="mt-2 text-sm font-bold text-gray-900">{record.assigned_role}</p>
  </div>
  
  {/* Deadline Card */}
  <div className={`group rounded-xl border-2 p-4 transition hover:shadow-md hover:scale-105 ${overdue ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
    <p className="text-xs font-semibold uppercase text-gray-500">Deadline</p>
    <p className={`mt-2 text-sm font-bold ${overdue ? 'text-red-700' : 'text-gray-900'}`}>{deadline}</p>
    <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${overdue ? 'text-red-700' : 'text-blue-700'}`}>
      <ClockIcon />
      <Countdown deadline={deadline} />
    </p>
  </div>
</div>
```

**Key Improvements:**
- ✅ 2px borders for better prominence
- ✅ Interactive hover effects (scale, border color, shadow)
- ✅ Icons for visual clarity (edit, status dot, clock)
- ✅ Better typography hierarchy with more padding
- ✅ Color-coded deadline (red if overdue)
- ✅ Clearer status values with language support
- ✅ Countdown timer with icon
- ✅ Group class for coordinated hover effects

---

## Alternative Search Results

**BEFORE:**
```jsx
{lookupResults.length > 0 && (
  <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
    <table className="min-w-full text-left text-sm">
      <thead className="bg-gray-50 text-gray-700">
        <tr>
          <th className="px-4 py-3 font-semibold">Track ID</th>
          <th className="px-4 py-3 font-semibold">Status</th>
          <th className="px-4 py-3 font-semibold">Category</th>
          <th className="px-4 py-3 font-semibold">Date</th>
        </tr>
      </thead>
      <tbody>
        {lookupResults.map((item) => (
          <tr key={item.tracking_id} className="border-t border-gray-200">
            <td className="px-4 py-3 font-semibold text-blue-700">
              <Link href={`/complaint/${item.tracking_id}`}>
                {item.tracking_id}
              </Link>
            </td>
            <td className="px-4 py-3">{STATUS_LABELS[item.status]}</td>
            <td className="px-4 py-3">{item.category}</td>
            <td className="px-4 py-3">{fmt(item.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
```

**AFTER:**
```jsx
{lookupResults.length > 0 && (
  <div className="mt-4">
    <h4 className="mb-3 text-sm font-semibold text-gray-900">
      Found Complaints ({lookupResults.length})
    </h4>
    <div className="grid gap-3 sm:grid-cols-2">
      {lookupResults.map((item) => (
        <Link
          key={item.tracking_id}
          href={`/complaint/${encodeURIComponent(item.tracking_id)}`}
          className="group rounded-lg border-2 border-gray-200 bg-white p-4 transition hover:border-amber-400 hover:shadow-md hover:scale-105"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-700 group-hover:text-blue-900">
                {item.tracking_id}
              </p>
              <p className="mt-1 text-xs text-gray-600">{item.category || "-"}</p>
              <p className="mt-2 text-xs text-gray-500">{fmt(item.created_at)}</p>
            </div>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[item.status]}`}>
              {STATUS_LABELS[item.status]}
            </span>
          </div>
        </Link>
      ))}
    </div>
  </div>
)}
```

**Key Improvements:**
- ✅ Card-based grid layout instead of table
- ✅ Mobile-friendly (automatically wraps on small screens)
- ✅ Better visual hierarchy with inline information
- ✅ Status badge positioned on the right
- ✅ Hover effects with scale and border color change
- ✅ Better spacing and typography
- ✅ Result count displayed
- ✅ More touch-friendly tap targets

---

## Timeline Section

**BEFORE:**
```jsx
<div className="mt-4 grid gap-3 sm:grid-cols-4">
  {timelineSteps.map((step, index) => (
    <div key={step.id} className="relative rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center gap-2">
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${step.done ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-700"}`}>
          {step.done ? "✓" : index + 1}
        </span>
        <p className="text-sm font-semibold text-gray-800">{step.label}</p>
      </div>
    </div>
  ))}
</div>
```

**AFTER:**
```jsx
<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
  {timelineSteps.map((step, index) => (
    <div key={step.id} className="relative">
      <div className={`rounded-xl border-2 p-4 transition ${step.done ? "border-green-300 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
        <div className="flex flex-col items-center gap-2 text-center">
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              step.done ? "bg-green-600 text-white" : "bg-gray-300 text-gray-700"
            }`}
          >
            {step.done ? <CheckIcon /> : index + 1}
          </span>
          <p className="text-xs font-semibold text-gray-800">{step.label}</p>
        </div>
      </div>
      {index < timelineSteps.length - 1 && (
        <div className={`absolute -right-1.5 top-1/2 h-1 w-3 -translate-y-1/2 transform ${step.done ? "bg-green-600" : "bg-gray-300"}`} />
      )}
    </div>
  ))}
</div>
```

**Key Improvements:**
- ✅ Center-aligned content for better visual flow
- ✅ SVG CheckIcon instead of text checkmark
- ✅ Connection lines between steps
- ✅ Green styling for completed (not blue)
- ✅ Larger indicator (h-8 w-8 instead of h-7 w-7)
- ✅ Connection lines aligned to completed/pending state
- ✅ Better spacing and typography
- ✅ Grid layout is now explicit (grid-cols-2)

---

## Image Gallery

**BEFORE:**
```jsx
<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
  {resolutionImages.map((img) => (
    <a href={img.image_url} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-xl border border-gray-200">
      <Image 
        src={img.image_url} 
        alt={img.image_type} 
        width={360} 
        height={220} 
        className="h-28 w-full object-cover transition group-hover:scale-105" 
        unoptimized 
      />
      <p className="px-2 py-1 text-center text-xs text-gray-500">{img.image_type}</p>
    </a>
  ))}
</div>
```

**AFTER:**
```jsx
<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
  {resolutionImages.map((img) => (
    <a
      href={img.image_url}
      target="_blank"
      rel="noreferrer"
      className="group relative overflow-hidden rounded-xl border-2 border-gray-200 transition hover:border-blue-300 hover:shadow-lg"
    >
      <Image
        src={img.image_url}
        alt={img.image_type}
        width={360}
        height={220}
        className="h-32 w-full object-cover transition group-hover:scale-110"
        unoptimized
      />
      <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/50 to-transparent opacity-0 transition group-hover:opacity-100">
        <p className="pb-2 text-center text-xs font-semibold text-white">{img.image_type}</p>
      </div>
    </a>
  ))}
</div>
```

**Key Improvements:**
- ✅ 4-column layout on desktop (lg:grid-cols-4)
- ✅ 2px border for better visibility
- ✅ Gradient overlay on hover with text
- ✅ Image label appears on hover (not below)
- ✅ Better scale effect (scale-110 vs scale-105)
- ✅ Border color changes on hover
- ✅ Taller image display (h-32 vs h-28)
- ✅ Shadow effect on hover

---

## Error Messages

**BEFORE:**
```jsx
{error && (
  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
    {error}
  </p>
)}
```

**AFTER:**
```jsx
{error && (
  <div className="flex gap-3 rounded-lg border-l-4 border-red-500 bg-red-50 p-3">
    <AlertIcon className="text-red-600 flex-shrink-0" />
    <p className="text-sm text-red-700">{error}</p>
  </div>
)}
```

**Key Improvements:**
- ✅ Icon for visual clarity
- ✅ Left border accent instead of full border
- ✅ Better flex layout with gap
- ✅ Better visual hierarchy
- ✅ More prominent appearance

---

## Call-to-Action Button

**BEFORE:**
```jsx
<div className="text-center">
  <Link href={`/complaint/${record.tracking_id}`} className="text-sm font-semibold text-blue-700 hover:underline">
    View Full Complaint Details →
  </Link>
</div>
```

**AFTER:**
```jsx
<div className="flex justify-center">
  <Link
    href={`/complaint/${record.tracking_id}`}
    className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:shadow-xl hover:scale-105"
  >
    View Full Complaint Details
    <svg className="h-5 w-5 transition group-hover:translate-x-1">
      {/* Arrow right icon */}
    </svg>
  </Link>
</div>
```

**Key Improvements:**
- ✅ Prominent button styling (not just text link)
- ✅ Gradient background
- ✅ Arrow icon that animates on hover
- ✅ Scale effect on hover
- ✅ Shadow effects for depth
- ✅ Better visual hierarchy and accessibility

---

## Summary of Changes

| Aspect | Change | Benefit |
|--------|--------|---------|
| **Visual Design** | Glassmorphism + gradients | Modern, engaging appearance |
| **Borders** | 1px → 2px | Better visibility and emphasis |
| **Interactions** | Scale, shadow, color shifts | More responsive feel |
| **Layout** | Adjusted spacing & padding | Better visual breathing room |
| **Cards** | Hover effects added | Better interactivity feedback |
| **Icons** | Added throughout | Enhanced visual communication |
| **Typography** | Better hierarchy | Clearer information prioritization |
| **Forms** | Better focus states | Improved input clarity |
| **Errors** | Icon + border accent | Better error communication |
| **Results** | Table → Grid | Better mobile responsiveness |
| **Images** | Overlay on hover | Enhanced gallery experience |
| **CTA** | Text link → Button | Better conversion potential |
| **Accessibility** | Improved labels | Better screen reader support |

---

## Implementation Notes

### Files Modified
- ✅ `src/components/citizen/tracking-view.jsx` - Complete redesign

### Dependencies
- No new dependencies added
- Uses existing Tailwind CSS utilities
- Compatible with existing API structure
- No breaking changes to component props

### Browser Support
- Modern browsers with CSS Grid support
- Gradient backgrounds (IE11+ with fallbacks)
- Backdrop filters (Chrome 76+, Safari 9+)
- SVG icons throughout

### Testing Checklist
- [ ] Test on mobile devices
- [ ] Test on tablet devices
- [ ] Test on desktop browsers
- [ ] Verify all interactive elements
- [ ] Test error states
- [ ] Test search functionality
- [ ] Verify image loading
- [ ] Test language switching
- [ ] Verify accessibility (WCAG)
- [ ] Performance check
