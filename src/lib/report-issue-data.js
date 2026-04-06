export const REPORT_DEPARTMENTS = [
  {
    slug: "roads-infrastructure",
    name: "Roads & Infrastructure",
    nameMl: "റോഡുകളും അടിസ്ഥാന സൗകര്യങ്ങളും",
    icon: "RD",
    issues: [
      {
        slug: "broken-roads",
        label: "Broken road",
        labelMl: "തകർന്ന റോഡ്",
        description: "Damaged road surface affecting safe travel.",
        descriptionMl: "സുരക്ഷിത യാത്രയെ ബാധിക്കുന്ന തകർന്ന റോഡ് മേൽപ്പുറം.",
      },
      {
        slug: "pothole",
        label: "Pothole",
        labelMl: "കുഴി റോഡ്",
        description: "Pits on road creating risk for vehicles and pedestrians.",
        descriptionMl: "വാഹനങ്ങൾക്കും നടപ്പാതക്കാർക്കും അപകടം സൃഷ്ടിക്കുന്ന റോഡ് കുഴികൾ.",
      },
      {
        slug: "bridge-safety",
        label: "Bridge safety",
        labelMl: "പാലം സുരക്ഷ",
        description: "Unsafe bridge structure, railings, or warning signage.",
        descriptionMl: "അസുരക്ഷിത പാല ഘടന, കൈവരികൾ, അല്ലെങ്കിൽ മുന്നറിയിപ്പ് ബോർഡുകൾ.",
      },
      {
        slug: "landslide-risk",
        label: "Landslide risk",
        labelMl: "മണ്ണിടിച്ചിൽ സാധ്യത",
        description: "Slope failure risk near roads and access paths.",
        descriptionMl: "റോഡിനും പ്രവേശനപാതകൾക്കും സമീപമുള്ള മണ്ണിടിച്ചിൽ അപകടസാധ്യത.",
      },
      {
        slug: "public-property-damage",
        label: "Public property damage",
        labelMl: "പൊതു സ്വത്ത് നാശം",
        description: "Damage to public assets under Panchayath maintenance.",
        descriptionMl: "പഞ്ചായത്ത് പരിപാലനത്തിലുള്ള പൊതു ആസ്തികൾക്ക് സംഭവിച്ച നാശം.",
      },
      {
        slug: "construction-debris-blocking-roads",
        label: "Construction debris blocking roads",
        labelMl: "നിർമാണ മാലിന്യം റോഡ് തടസ്സപ്പെടുത്തുന്നു",
        description: "Road blockage due to dumped materials or debris.",
        descriptionMl: "തള്ളിയിട്ട നിർമാണ വസ്തുക്കൾ കാരണം റോഡ് തടസ്സം.",
      },
    ],
  },
  {
    slug: "water-sanitation",
    name: "Water & Sanitation",
    nameMl: "ജലവും ശുചിത്വവും",
    icon: "WS",
    issues: [
      {
        slug: "water-leakage",
        label: "Water leakage",
        labelMl: "വെള്ളം ചോർച്ച",
        description: "Leakage from public water pipelines or taps.",
        descriptionMl: "പൊതു പൈപ്പ് ലൈൻ/കുഴൽ വഴി വെള്ളം ചോർച്ച.",
      },
      {
        slug: "drinking-water-shortage",
        label: "Drinking water shortage",
        labelMl: "കുടിവെള്ള ക്ഷാമം",
        description: "Insufficient drinking water supply in local area.",
        descriptionMl: "പ്രദേശത്ത് മതിയായ കുടിവെള്ള വിതരണം ഇല്ല.",
      },
      {
        slug: "water-stagnation",
        label: "Water stagnation",
        labelMl: "വെള്ളക്കെട്ട്",
        description: "Standing water in roads, drains, or public spaces.",
        descriptionMl: "റോഡിലും ചാലുകളിലും പൊതുസ്ഥലങ്ങളിലും നിലച്ച വെള്ളം.",
      },
      {
        slug: "public-toilet-issues",
        label: "Public toilet issues",
        labelMl: "പൊതു ശൗചാലയ പ്രശ്നങ്ങൾ",
        description: "Unclean or non-functional public sanitation units.",
        descriptionMl: "അശുചിയായോ പ്രവർത്തനരഹിതമായോ ഉള്ള പൊതു ശൗചാലയങ്ങൾ.",
      },
      {
        slug: "mosquito-breeding",
        label: "Mosquito breeding",
        labelMl: "കൊതുക് വളർച്ച",
        description: "Stagnant areas causing mosquito growth risk.",
        descriptionMl: "കൊതുക് വളർച്ചയ്ക്ക് കാരണമാകുന്ന വെള്ളക്കെട്ടുള്ള പ്രദേശങ്ങൾ.",
      },
      {
        slug: "water-source-contamination",
        label: "Water source contamination",
        labelMl: "ജലസ്രോതസ് മലിനീകരണം",
        description: "Contamination in wells, tanks, canals, or other sources.",
        descriptionMl: "കിണർ, ടാങ്ക്, കനാൽ മുതലായ ജലസ്രോതസുകളിൽ മലിനീകരണം.",
      },
    ],
  },
  {
    slug: "health-phc",
    name: "Health / PHC",
    nameMl: "ആരോഗ്യം / പി.എച്ച്.സി",
    icon: "HP",
    issues: [
      {
        slug: "medicine-shortage",
        label: "Medicine shortage",
        labelMl: "മരുന്ന് ക്ഷാമം",
        description: "Essential medicine shortage in PHC or local facility.",
        descriptionMl: "പി.എച്ച്.സി/പ്രാദേശിക കേന്ദ്രങ്ങളിൽ അത്യാവശ്യ മരുന്നുകളുടെ കുറവ്.",
      },
      {
        slug: "unavailable-doctors-nurses",
        label: "Unavailable doctors/nurses",
        labelMl: "ഡോക്ടർ/നഴ്സ് ലഭ്യമല്ല",
        description: "Medical staff not available during service hours.",
        descriptionMl: "സേവന സമയത്ത് മെഡിക്കൽ സ്റ്റാഫ് ലഭ്യമല്ല.",
      },
      {
        slug: "non-functional-medical-equipment",
        label: "Non-functional medical equipment",
        labelMl: "പ്രവർത്തിക്കാത്ത മെഡിക്കൽ ഉപകരണങ്ങൾ",
        description: "Important medical equipment not working.",
        descriptionMl: "പ്രധാന മെഡിക്കൽ ഉപകരണങ്ങൾ പ്രവർത്തനരഹിതം.",
      },
      {
        slug: "ambulance-delays",
        label: "Ambulance delays",
        labelMl: "ആംബുലൻസ് വൈകൽ",
        description: "Significant delay in ambulance response.",
        descriptionMl: "ആംബുലൻസ് പ്രതികരണത്തിൽ ഗണ്യമായ വൈകൽ.",
      },
      {
        slug: "unhygienic-hospital-conditions",
        label: "Unhygienic hospital conditions",
        labelMl: "അശുചിയായ ആശുപത്രി സാഹചര്യം",
        description: "Poor hygiene and sanitation in health centers.",
        descriptionMl: "ആരോഗ്യ കേന്ദ്രങ്ങളിൽ ശുചിത്വം/സാനിറ്റേഷൻ മോശം.",
      },
    ],
  },
  {
    slug: "education-child-welfare",
    name: "Education & Child Welfare",
    nameMl: "വിദ്യാഭ്യാസവും ശിശുക്ഷേമവും",
    icon: "ED",
    issues: [
      {
        slug: "broken-school-furniture",
        label: "Broken school furniture",
        labelMl: "തകർന്ന സ്കൂൾ ഫർണിച്ചർ",
        description: "Damaged desks, chairs, or essential classroom items.",
        descriptionMl: "തകർന്ന ബെഞ്ചുകൾ, കസേരകൾ, ക്ലാസ് മുറി ഉപകരണങ്ങൾ.",
      },
      {
        slug: "mid-day-meal-issues",
        label: "Mid-day meal issues",
        labelMl: "മിഡ്-ഡേ മീൽ പ്രശ്നങ്ങൾ",
        description: "Meal quality, quantity, hygiene, or timing concerns.",
        descriptionMl: "ഭക്ഷണ ഗുണമേന്മ, അളവ്, ശുചിത്വം, സമയ പ്രശ്നങ്ങൾ.",
      },
      {
        slug: "unsafe-school-buildings",
        label: "Unsafe school buildings",
        labelMl: "അസുരക്ഷിത സ്കൂൾ കെട്ടിടങ്ങൾ",
        description: "Safety concerns in school structural conditions.",
        descriptionMl: "സ്കൂൾ കെട്ടിടങ്ങളുടെ ഘടനാസുരക്ഷയെക്കുറിച്ചുള്ള ആശങ്കകൾ.",
      },
      {
        slug: "lack-of-drinking-water",
        label: "Lack of drinking water",
        labelMl: "കുടിവെള്ളത്തിന്റെ അഭാവം",
        description: "No safe drinking water in school or child center.",
        descriptionMl: "സ്കൂൾ/ശിശുകേന്ദ്രങ്ങളിൽ സുരക്ഷിത കുടിവെള്ളം ലഭ്യമല്ല.",
      },
      {
        slug: "anganwadi-issues",
        label: "Anganwadi issues",
        labelMl: "അങ്കണവാടി പ്രശ്നങ്ങൾ",
        description: "Infrastructure, service, or staffing related complaints.",
        descriptionMl: "അടിസ്ഥാന സൗകര്യം, സേവനം, സ്റ്റാഫ് സംബന്ധമായ പരാതികൾ.",
      },
    ],
  },
  {
    slug: "agriculture-environment",
    name: "Agriculture & Environmental Protection",
    nameMl: "കൃഷിയും പരിസ്ഥിതി സംരക്ഷണവും",
    icon: "AE",
    issues: [
      {
        slug: "irrigation-issues",
        label: "Irrigation issues",
        labelMl: "സേചന പ്രശ്നങ്ങൾ",
        description: "Irrigation supply or infrastructure problems.",
        descriptionMl: "സേചന വിതരണം അല്ലെങ്കിൽ അടിസ്ഥാന സൗകര്യ പ്രശ്നങ്ങൾ.",
      },
      {
        slug: "canal-blockages",
        label: "Canal blockages",
        labelMl: "കനാൽ തടസ്സങ്ങൾ",
        description: "Blocked canals affecting water flow.",
        descriptionMl: "വെള്ളപ്രവാഹത്തെ ബാധിക്കുന്ന കനാൽ തടസ്സങ്ങൾ.",
      },
      {
        slug: "illegal-sand-mining",
        label: "Illegal sand mining",
        labelMl: "അനധികൃത മണൽ ഖനനം",
        description: "Unauthorized mining affecting ecology and safety.",
        descriptionMl: "പരിസ്ഥിതിയെയും സുരക്ഷയെയും ബാധിക്കുന്ന അനധികൃത ഖനനം.",
      },
      {
        slug: "waste-burning-complaints",
        label: "Waste burning complaints",
        labelMl: "മാലിന്യ ദഹന പരാതികൾ",
        description: "Open burning causing smoke and air pollution.",
        descriptionMl: "പുക/വായു മലിനീകരണം സൃഷ്ടിക്കുന്ന തുറന്ന മാലിന്യ ദഹനം.",
      },
      {
        slug: "environmental-water-pollution",
        label: "Environmental pollution affecting water bodies",
        labelMl: "ജലാശയങ്ങളെ ബാധിക്കുന്ന പരിസ്ഥിതി മലിനീകരണം",
        description: "Pollution impacting ponds, canals, rivers, or streams.",
        descriptionMl: "കുളം, കനാൽ, നദി മുതലായ ജലാശയങ്ങളെ ബാധിക്കുന്ന മലിനീകരണം.",
      },
    ],
  },
  {
    slug: "electricity-streetlight",
    name: "Electricity & Streetlight Maintenance",
    nameMl: "വൈദ്യുതിയും തെരുവ് ലൈറ്റ് പരിപാലനവും",
    icon: "EL",
    issues: [
      {
        slug: "streetlights-not-working",
        label: "Streetlights not working",
        labelMl: "തെരുവ് ലൈറ്റുകൾ പ്രവർത്തിക്കുന്നില്ല",
        description: "Streetlights are off, damaged, or flickering.",
        descriptionMl: "തെരുവ് ലൈറ്റുകൾ ഓഫ്, തകർന്നത്, അല്ലെങ്കിൽ മിന്നിമറയുന്നത്.",
      },
      {
        slug: "local-electricity-complaints",
        label: "Local electricity complaints",
        labelMl: "പ്രാദേശിക വൈദ്യുതി പരാതികൾ",
        description: "Panchayath-level local electricity issues.",
        descriptionMl: "പഞ്ചായത്ത് പരിധിയിലുള്ള പ്രാദേശിക വൈദ്യുതി പ്രശ്നങ്ങൾ.",
      },
    ],
  },
  {
    slug: "administrative-services-documents",
    name: "Panchayath Administrative Services & Documents",
    nameMl: "പഞ്ചായത്ത് ഭരണസേവനങ്ങളും രേഖകളും",
    icon: "AD",
    issues: [
      {
        slug: "delays-in-certificates",
        label: "Delays in certificates",
        labelMl: "സർട്ടിഫിക്കറ്റ് വൈകൽ",
        description: "Delay in processing or issuing certificates.",
        descriptionMl: "സർട്ടിഫിക്കറ്റ് പ്രോസസ്സിംഗ്/നൽകുന്നതിൽ വൈകൽ.",
      },
      {
        slug: "building-permits",
        label: "Building permits",
        labelMl: "ബിൽഡിംഗ് പെർമിറ്റുകൾ",
        description: "Permit approval delays or process issues.",
        descriptionMl: "പെർമിറ്റ് അംഗീകാരത്തിൽ വൈകൽ അല്ലെങ്കിൽ പ്രക്രിയാപ്രശ്നങ്ങൾ.",
      },
      {
        slug: "taxes",
        label: "Taxes",
        labelMl: "നികുതികൾ",
        description: "Tax-related corrections, disputes, or delays.",
        descriptionMl: "നികുതി സംബന്ധമായ തിരുത്തൽ, തർക്കം, വൈകൽ.",
      },
      {
        slug: "trade-license-issues",
        label: "Trade license issues",
        labelMl: "ട്രേഡ് ലൈസൻസ് പ്രശ്നങ്ങൾ",
        description: "Application, renewal, or approval problems.",
        descriptionMl: "അപേക്ഷ, പുതുക്കൽ, അംഗീകാരം സംബന്ധമായ പ്രശ്നങ്ങൾ.",
      },
    ],
  },
];

export const DISTRICT_OPTIONS = {
  Thiruvananthapuram: [
    "Neyyattinkara",
    "Kilimanoor",
    "Vellanad",
    "Kattakada",
  ],
  Kollam: ["Chadayamangalam", "Anchal", "Pathanapuram", "Mukhathala"],
  Pathanamthitta: ["Ranni", "Konni", "Mallappally", "Elanthoor"],
  Alappuzha: ["Ambalappuzha", "Chengannur", "Mavelikkara", "Kuttanad"],
  Kottayam: ["Ettumanoor", "Vaikom", "Pala", "Erattupetta"],
};

export function getDepartmentBySlug(departmentSlug) {
  return REPORT_DEPARTMENTS.find((dept) => dept.slug === departmentSlug) ?? null;
}

export function getIssueBySlug(departmentSlug, issueSlug) {
  const department = getDepartmentBySlug(departmentSlug);
  if (!department) return null;
  return department.issues.find((issue) => issue.slug === issueSlug) ?? null;
}

export function buildTrackId() {
  const stamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SPIRS-${stamp}${random}`;
}
