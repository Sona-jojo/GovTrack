/**
 * Civic Issue Categories & Subcategories
 * Used for the multi-step form
 */

export const ISSUE_CATEGORIES = [
  {
    id: "roads-infrastructure-department",
    name: "Roads & Infrastructure Department",
    nameMl: "Roads & Infrastructure Department",
    icon: "\uD83D\uDEE3\uFE0F",
    color: "from-amber-400 to-orange-500",
    borderColor: "border-amber-300",
    bgColor: "bg-amber-50",
    textColor: "text-amber-900",
    subcategories: [
      {
        id: "broken-roads",
        name: "Broken roads",
        nameMl: "Broken roads",
        description: "Road surface damaged or unusable",
        descriptionMl: "Road surface damaged or unusable",
      },
      {
        id: "potholes",
        name: "Potholes",
        nameMl: "Potholes",
        description: "Potholes creating safety risk",
        descriptionMl: "Potholes creating safety risk",
      },
      {
        id: "bridge-safety-issues",
        name: "Bridge safety issues",
        nameMl: "Bridge safety issues",
        description: "Unsafe bridge structure, rails, or access",
        descriptionMl: "Unsafe bridge structure, rails, or access",
      },
      {
        id: "landslide-risk",
        name: "Landslide risk",
        nameMl: "Landslide risk",
        description: "Slope failure or landslide hazard near roads",
        descriptionMl: "Slope failure or landslide hazard near roads",
      },
      {
        id: "public-property-damage",
        name: "Public property damage",
        nameMl: "Public property damage",
        description: "Damage to public assets",
        descriptionMl: "Damage to public assets",
      },
      {
        id: "construction-debris-blocking-roads",
        name: "Construction debris blocking roads",
        nameMl: "Construction debris blocking roads",
        description: "Debris obstructing road movement",
        descriptionMl: "Debris obstructing road movement",
      },
    ],
    aiTip: "Upload clear images of the affected road area.",
  },
  {
    id: "water-sanitation-department",
    name: "Water & Sanitation Department",
    nameMl: "Water & Sanitation Department",
    icon: "\uD83D\uDCA7",
    color: "from-blue-400 to-cyan-500",
    borderColor: "border-blue-300",
    bgColor: "bg-blue-50",
    textColor: "text-blue-900",
    subcategories: [
      {
        id: "water-leakage",
        name: "Water leakage",
        nameMl: "Water leakage",
        description: "Pipeline or connection leakage",
        descriptionMl: "Pipeline or connection leakage",
      },
      {
        id: "drinking-water-shortage",
        name: "Drinking water shortage",
        nameMl: "Drinking water shortage",
        description: "Insufficient drinking water supply",
        descriptionMl: "Insufficient drinking water supply",
      },
      {
        id: "water-stagnation",
        name: "Water stagnation",
        nameMl: "Water stagnation",
        description: "Standing water due to poor drainage",
        descriptionMl: "Standing water due to poor drainage",
      },
      {
        id: "public-toilet-issues",
        name: "Public toilet issues",
        nameMl: "Public toilet issues",
        description: "Public toilet cleanliness or maintenance problems",
        descriptionMl: "Public toilet cleanliness or maintenance problems",
      },
      {
        id: "mosquito-breeding",
        name: "Mosquito breeding",
        nameMl: "Mosquito breeding",
        description: "Mosquito breeding hotspots",
        descriptionMl: "Mosquito breeding hotspots",
      },
      {
        id: "water-source-contamination",
        name: "Water source contamination",
        nameMl: "Water source contamination",
        description: "Contamination in wells, tanks, or other sources",
        descriptionMl: "Contamination in wells, tanks, or other sources",
      },
    ],
    aiTip: "Include photos or videos showing the sanitation or leakage issue.",
  },
  {
    id: "health-phc-department",
    name: "Health / Primary Health Centre (PHC) Department",
    nameMl: "Health / Primary Health Centre (PHC) Department",
    icon: "\uD83C\uDFE5",
    color: "from-rose-400 to-red-500",
    borderColor: "border-rose-300",
    bgColor: "bg-rose-50",
    textColor: "text-rose-900",
    subcategories: [
      {
        id: "medicine-shortage",
        name: "Medicine shortage",
        nameMl: "Medicine shortage",
        description: "Essential medicines not available",
        descriptionMl: "Essential medicines not available",
      },
      {
        id: "staff-unavailable",
        name: "Doctors or nurses unavailable",
        nameMl: "Doctors or nurses unavailable",
        description: "No doctor or nurse available when needed",
        descriptionMl: "No doctor or nurse available when needed",
      },
      {
        id: "medical-equipment-nonfunctional",
        name: "Non-functional medical equipment",
        nameMl: "Non-functional medical equipment",
        description: "Medical equipment is not working",
        descriptionMl: "Medical equipment is not working",
      },
      {
        id: "ambulance-delays",
        name: "Ambulance delays",
        nameMl: "Ambulance delays",
        description: "Delay in ambulance availability or arrival",
        descriptionMl: "Delay in ambulance availability or arrival",
      },
      {
        id: "unhygienic-hospital-conditions",
        name: "Unhygienic hospital conditions",
        nameMl: "Unhygienic hospital conditions",
        description: "Poor hygiene in PHC or health centre",
        descriptionMl: "Poor hygiene in PHC or health centre",
      },
    ],
    aiTip: "Mention time and department desk visited for faster action.",
  },
  {
    id: "education-child-welfare-department",
    name: "Education & Child Welfare Department",
    nameMl: "Education & Child Welfare Department",
    icon: "\uD83C\uDF93",
    color: "from-indigo-400 to-blue-500",
    borderColor: "border-indigo-300",
    bgColor: "bg-indigo-50",
    textColor: "text-indigo-900",
    subcategories: [
      {
        id: "broken-school-furniture",
        name: "Broken school furniture",
        nameMl: "Broken school furniture",
        description: "Damaged desks, benches, or classroom furniture",
        descriptionMl: "Damaged desks, benches, or classroom furniture",
      },
      {
        id: "midday-meal-issues",
        name: "Mid-day meal issues",
        nameMl: "Mid-day meal issues",
        description: "Meal quality, supply, or distribution problems",
        descriptionMl: "Meal quality, supply, or distribution problems",
      },
      {
        id: "unsafe-school-buildings",
        name: "Unsafe school buildings",
        nameMl: "Unsafe school buildings",
        description: "Building structural safety issues in schools",
        descriptionMl: "Building structural safety issues in schools",
      },
      {
        id: "no-drinking-water-in-schools",
        name: "Lack of drinking water in schools",
        nameMl: "Lack of drinking water in schools",
        description: "No safe drinking water access for students",
        descriptionMl: "No safe drinking water access for students",
      },
      {
        id: "anganwadi-related-issues",
        name: "Anganwadi-related issues",
        nameMl: "Anganwadi-related issues",
        description: "Infrastructure, nutrition, or staffing issues in Anganwadi",
        descriptionMl: "Infrastructure, nutrition, or staffing issues in Anganwadi",
      },
    ],
    aiTip: "Attach photos/documents when reporting school or Anganwadi issues.",
  },
  {
    id: "agriculture-environment-department",
    name: "Agriculture & Environmental Protection Department",
    nameMl: "Agriculture & Environmental Protection Department",
    icon: "\uD83C\uDF31",
    color: "from-teal-400 to-emerald-500",
    borderColor: "border-teal-300",
    bgColor: "bg-teal-50",
    textColor: "text-teal-900",
    subcategories: [
      {
        id: "irrigation-issues",
        name: "Irrigation issues",
        nameMl: "Irrigation issues",
        description: "Irrigation supply or channel functioning issues",
        descriptionMl: "Irrigation supply or channel functioning issues",
      },
      {
        id: "canal-blockages",
        name: "Canal blockages",
        nameMl: "Canal blockages",
        description: "Blocked canals affecting water flow",
        descriptionMl: "Blocked canals affecting water flow",
      },
      {
        id: "illegal-sand-mining-complaints",
        name: "Illegal sand mining complaints",
        nameMl: "Illegal sand mining complaints",
        description: "Illegal sand extraction activities",
        descriptionMl: "Illegal sand extraction activities",
      },
      {
        id: "waste-burning-complaints",
        name: "Waste burning complaints",
        nameMl: "Waste burning complaints",
        description: "Open waste burning causing pollution",
        descriptionMl: "Open waste burning causing pollution",
      },
      {
        id: "environmental-pollution-affecting-water-bodies",
        name: "Environmental pollution affecting water bodies",
        nameMl: "Environmental pollution affecting water bodies",
        description: "Pollution impacting rivers, ponds, or canals",
        descriptionMl: "Pollution impacting rivers, ponds, or canals",
      },
    ],
    aiTip: "Provide photos/video evidence with exact location.",
  },
  {
    id: "electricity-streetlight-maintenance",
    name: "Electricity & Streetlight Maintenance (Panchayath Electrical Section)",
    nameMl: "Electricity & Streetlight Maintenance (Panchayath Electrical Section)",
    icon: "\uD83D\uDCA1",
    color: "from-yellow-400 to-amber-500",
    borderColor: "border-yellow-300",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-900",
    subcategories: [
      {
        id: "streetlight-not-working",
        name: "Streetlight not working",
        nameMl: "Streetlight not working",
        description: "Streetlights not functioning",
        descriptionMl: "Streetlights not functioning",
      },
      {
        id: "local-electricity-infrastructure",
        name: "Local electricity infrastructure complaint",
        nameMl: "Local electricity infrastructure complaint",
        description: "Electrical infrastructure issues under Panchayath scope",
        descriptionMl: "Electrical infrastructure issues under Panchayath scope",
      },
    ],
    aiTip: "Share nearest pole number or landmark if visible.",
  },
  {
    id: "panchayath-admin-document-section",
    name: "Panchayath Administrative Services & Document Section",
    nameMl: "Panchayath Administrative Services & Document Section",
    icon: "\uD83D\uDDD2\uFE0F",
    color: "from-slate-500 to-gray-600",
    borderColor: "border-slate-300",
    bgColor: "bg-slate-50",
    textColor: "text-slate-900",
    subcategories: [
      {
        id: "birth-death-certificate-delays",
        name: "Birth/death certificate delays",
        nameMl: "Birth/death certificate delays",
        description: "Delays in issuing birth or death certificates",
        descriptionMl: "Delays in issuing birth or death certificates",
      },
      {
        id: "building-permit-delays",
        name: "Building permit delays",
        nameMl: "Building permit delays",
        description: "Delay in processing building permits",
        descriptionMl: "Delay in processing building permits",
      },
      {
        id: "panchayath-tax-related-issues",
        name: "Panchayath tax-related issues",
        nameMl: "Panchayath tax-related issues",
        description: "Assessment, billing, or payment issue for Panchayath tax",
        descriptionMl: "Assessment, billing, or payment issue for Panchayath tax",
      },
      {
        id: "trade-license-processing-complaints",
        name: "Trade license processing complaints",
        nameMl: "Trade license processing complaints",
        description: "Delays or issues in trade license processing",
        descriptionMl: "Delays or issues in trade license processing",
      },
    ],
    aiTip: "Mention application number and submission date if available.",
  },
  {
    id: "other",
    name: "Other",
    nameMl: "Other",
    icon: "\u2795",
    color: "from-slate-500 to-gray-600",
    borderColor: "border-slate-300",
    bgColor: "bg-slate-50",
    textColor: "text-slate-900",
    subcategories: [
      {
        id: "other-issue",
        name: "Other issue",
        nameMl: "Other issue",
        description: "Any issue that does not fit the listed departments",
        descriptionMl: "Any issue that does not fit the listed departments",
      },
    ],
    aiTip: "Provide clear details so this can be routed correctly.",
  },
];

/**
 * Get all categories
 */
export function getCategories() {
  return ISSUE_CATEGORIES;
}

/**
 * Get category by ID
 */
export function getCategoryById(categoryId) {
  return ISSUE_CATEGORIES.find((cat) => cat.id === categoryId);
}

/**
 * Get subcategories for a category
 */
export function getSubcategories(categoryId) {
  const category = getCategoryById(categoryId);
  return category?.subcategories || [];
}

/**
 * Get subcategory details
 */
export function getSubcategoryDetails(categoryId, subcategoryId) {
  const subcategories = getSubcategories(categoryId);
  return subcategories.find((sub) => sub.id === subcategoryId);
}

/**
 * Get category with localization support
 */
export function getCategoryLabel(categoryId, lang = "en") {
  const category = getCategoryById(categoryId);
  if (!category) return null;
  return lang === "ml" ? category.nameMl : category.name;
}

/**
 * Get subcategory label with localization
 */
export function getSubcategoryLabel(categoryId, subcategoryId, lang = "en") {
  const subcategory = getSubcategoryDetails(categoryId, subcategoryId);
  if (!subcategory) return null;
  return lang === "ml" ? subcategory.nameMl : subcategory.name;
}
