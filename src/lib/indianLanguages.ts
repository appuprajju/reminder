export interface IndianLanguageOption {
  /** BCP-47 primary code used as preference key */
  id: string;
  /** SpeechRecognition BCP-47 locale (falls back to closest supported Web Speech locale when needed) */
  speechLocale: string;
  /** English name */
  name: string;
  /** Native script display name */
  nativeName: string;
  /** Short chip label for compact headers */
  shortLabel: string;
  /** Whether the language is one of India's 22 Eighth Schedule languages */
  scheduled: boolean;
  /** Primary states / union territories where this language is widely spoken or official */
  states: string[];
  /** Right-to-left script hint */
  rtl?: boolean;
}

export interface IndianStateRegion {
  id: string;
  name: string;
  kind: 'state' | 'ut';
  /** Primary official/most widely used language ID */
  primaryLanguageId: string;
  /** Additional official or widely spoken regional language IDs */
  otherLanguageIds: string[];
}

export const APP_LANGUAGES: IndianLanguageOption[] = [
  {
    id: 'en-IN',
    speechLocale: 'en-IN',
    name: 'English (India)',
    nativeName: 'English (IN)',
    shortLabel: 'EN (IN)',
    scheduled: false,
    states: ['Pan-India', 'Nagaland', 'Meghalaya', 'Arunachal Pradesh', 'Mizoram', 'Delhi', 'Chandigarh'],
  },
  {
    id: 'hi-IN',
    speechLocale: 'hi-IN',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    shortLabel: 'हिन्दी',
    scheduled: true,
    states: [
      'Uttar Pradesh',
      'Bihar',
      'Madhya Pradesh',
      'Rajasthan',
      'Haryana',
      'Himachal Pradesh',
      'Uttarakhand',
      'Jharkhand',
      'Chhattisgarh',
      'Delhi',
      'Chandigarh',
      'Andaman & Nicobar Islands',
    ],
  },
  {
    id: 'kn-IN',
    speechLocale: 'kn-IN',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    shortLabel: 'ಕನ್ನಡ',
    scheduled: true,
    states: ['Karnataka'],
  },
  {
    id: 'ta-IN',
    speechLocale: 'ta-IN',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    shortLabel: 'தமிழ்',
    scheduled: true,
    states: ['Tamil Nadu', 'Puducherry'],
  },
  {
    id: 'te-IN',
    speechLocale: 'te-IN',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    shortLabel: 'తెలుగు',
    scheduled: true,
    states: ['Andhra Pradesh', 'Telangana', 'Puducherry'],
  },
  {
    id: 'ml-IN',
    speechLocale: 'ml-IN',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    shortLabel: 'മലയാളം',
    scheduled: true,
    states: ['Kerala', 'Lakshadweep', 'Puducherry'],
  },
  {
    id: 'mr-IN',
    speechLocale: 'mr-IN',
    name: 'Marathi',
    nativeName: 'मराठी',
    shortLabel: 'मराठी',
    scheduled: true,
    states: ['Maharashtra', 'Goa', 'Dadra & Nagar Haveli and Daman & Diu'],
  },
  {
    id: 'gu-IN',
    speechLocale: 'gu-IN',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    shortLabel: 'ગુજરાતી',
    scheduled: true,
    states: ['Gujarat', 'Dadra & Nagar Haveli and Daman & Diu'],
  },
  {
    id: 'bn-IN',
    speechLocale: 'bn-IN',
    name: 'Bengali',
    nativeName: 'বাংলা',
    shortLabel: 'বাংলা',
    scheduled: true,
    states: ['West Bengal', 'Tripura', 'Assam', 'Andaman & Nicobar Islands'],
  },
  {
    id: 'pa-IN',
    speechLocale: 'pa-IN',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    shortLabel: 'ਪੰਜਾਬੀ',
    scheduled: true,
    states: ['Punjab', 'Chandigarh', 'Haryana', 'Delhi'],
  },
  {
    id: 'or-IN',
    speechLocale: 'or-IN',
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    shortLabel: 'ଓଡ଼ିଆ',
    scheduled: true,
    states: ['Odisha'],
  },
  {
    id: 'as-IN',
    speechLocale: 'as-IN',
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    shortLabel: 'অসমীয়া',
    scheduled: true,
    states: ['Assam'],
  },
  {
    id: 'ur-IN',
    speechLocale: 'ur-IN',
    name: 'Urdu',
    nativeName: 'اردو',
    shortLabel: 'اردو',
    scheduled: true,
    rtl: true,
    states: ['Jammu & Kashmir', 'Telangana', 'Uttar Pradesh', 'Bihar', 'Delhi', 'Jharkhand'],
  },
  {
    id: 'kok-IN',
    speechLocale: 'mr-IN',
    name: 'Konkani',
    nativeName: 'कोंकणी',
    shortLabel: 'कोंकणी',
    scheduled: true,
    states: ['Goa', 'Karnataka', 'Maharashtra'],
  },
  {
    id: 'mni-IN',
    speechLocale: 'bn-IN',
    name: 'Manipuri (Meitei)',
    nativeName: 'মৈতৈলোন্',
    shortLabel: 'মৈতৈলোন্',
    scheduled: true,
    states: ['Manipur'],
  },
  {
    id: 'ne-IN',
    speechLocale: 'ne-NP',
    name: 'Nepali',
    nativeName: 'नेपाली',
    shortLabel: 'नेपाली',
    scheduled: true,
    states: ['Sikkim', 'West Bengal'],
  },
  {
    id: 'sa-IN',
    speechLocale: 'hi-IN',
    name: 'Sanskrit',
    nativeName: 'संस्कृतम्',
    shortLabel: 'संस्कृतम्',
    scheduled: true,
    states: ['Uttarakhand', 'Himachal Pradesh'],
  },
  {
    id: 'ks-IN',
    speechLocale: 'ur-IN',
    name: 'Kashmiri',
    nativeName: 'कॉशुर / کٲشُر',
    shortLabel: 'कॉशुर',
    scheduled: true,
    states: ['Jammu & Kashmir'],
  },
  {
    id: 'doi-IN',
    speechLocale: 'hi-IN',
    name: 'Dogri',
    nativeName: 'डोगरी',
    shortLabel: 'डोगरी',
    scheduled: true,
    states: ['Jammu & Kashmir', 'Himachal Pradesh', 'Punjab'],
  },
  {
    id: 'brx-IN',
    speechLocale: 'hi-IN',
    name: 'Bodo',
    nativeName: 'बड़ो',
    shortLabel: 'बड़ो',
    scheduled: true,
    states: ['Assam'],
  },
  {
    id: 'mai-IN',
    speechLocale: 'hi-IN',
    name: 'Maithili',
    nativeName: 'मैथिली',
    shortLabel: 'मैथिली',
    scheduled: true,
    states: ['Bihar', 'Jharkhand'],
  },
  {
    id: 'sat-IN',
    speechLocale: 'hi-IN',
    name: 'Santali',
    nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ',
    shortLabel: 'ᱥᱟᱱᱛᱟᱲᱤ',
    scheduled: true,
    states: ['Jharkhand', 'Odisha', 'West Bengal'],
  },
  {
    id: 'sd-IN',
    speechLocale: 'hi-IN',
    name: 'Sindhi',
    nativeName: 'सिंधी / سنڌي',
    shortLabel: 'सिंधी',
    scheduled: true,
    states: ['Gujarat', 'Maharashtra', 'Rajasthan'],
  },
  {
    id: 'lus-IN',
    speechLocale: 'en-IN',
    name: 'Mizo',
    nativeName: 'Mizo ṭawng',
    shortLabel: 'Mizo',
    scheduled: false,
    states: ['Mizoram'],
  },
  {
    id: 'kha-IN',
    speechLocale: 'en-IN',
    name: 'Khasi',
    nativeName: 'Ka Ktien Khasi',
    shortLabel: 'Khasi',
    scheduled: false,
    states: ['Meghalaya'],
  },
  {
    id: 'trp-IN',
    speechLocale: 'bn-IN',
    name: 'Kokborok',
    nativeName: 'ককবরক',
    shortLabel: 'ককবরক',
    scheduled: false,
    states: ['Tripura'],
  },
  {
    id: 'lbj-IN',
    speechLocale: 'hi-IN',
    name: 'Ladakhi (Bhoti)',
    nativeName: 'ལ་དྭགས་སྐད',
    shortLabel: 'ལ་དྭགས',
    scheduled: false,
    states: ['Ladakh'],
  },
  {
    id: 'en-US',
    speechLocale: 'en-US',
    name: 'English (US)',
    nativeName: 'English (US)',
    shortLabel: 'EN (US)',
    scheduled: false,
    states: ['Global'],
  },
];

/** Complete registry of all 28 States + 8 Union Territories of India (36 regions) */
export const INDIA_STATES_AND_UTS: IndianStateRegion[] = [
  // 28 States
  { id: 'andhra-pradesh', name: 'Andhra Pradesh', kind: 'state', primaryLanguageId: 'te-IN', otherLanguageIds: ['ur-IN', 'en-IN'] },
  { id: 'arunachal-pradesh', name: 'Arunachal Pradesh', kind: 'state', primaryLanguageId: 'en-IN', otherLanguageIds: ['hi-IN', 'as-IN'] },
  { id: 'assam', name: 'Assam', kind: 'state', primaryLanguageId: 'as-IN', otherLanguageIds: ['brx-IN', 'bn-IN', 'en-IN'] },
  { id: 'bihar', name: 'Bihar', kind: 'state', primaryLanguageId: 'hi-IN', otherLanguageIds: ['mai-IN', 'ur-IN'] },
  { id: 'chhattisgarh', name: 'Chhattisgarh', kind: 'state', primaryLanguageId: 'hi-IN', otherLanguageIds: ['en-IN'] },
  { id: 'goa', name: 'Goa', kind: 'state', primaryLanguageId: 'kok-IN', otherLanguageIds: ['mr-IN', 'en-IN'] },
  { id: 'gujarat', name: 'Gujarat', kind: 'state', primaryLanguageId: 'gu-IN', otherLanguageIds: ['hi-IN', 'sd-IN'] },
  { id: 'haryana', name: 'Haryana', kind: 'state', primaryLanguageId: 'hi-IN', otherLanguageIds: ['pa-IN', 'en-IN'] },
  { id: 'himachal-pradesh', name: 'Himachal Pradesh', kind: 'state', primaryLanguageId: 'hi-IN', otherLanguageIds: ['sa-IN', 'doi-IN'] },
  { id: 'jharkhand', name: 'Jharkhand', kind: 'state', primaryLanguageId: 'hi-IN', otherLanguageIds: ['sat-IN', 'mai-IN', 'ur-IN', 'bn-IN'] },
  { id: 'karnataka', name: 'Karnataka', kind: 'state', primaryLanguageId: 'kn-IN', otherLanguageIds: ['kok-IN', 'ur-IN', 'en-IN'] },
  { id: 'kerala', name: 'Kerala', kind: 'state', primaryLanguageId: 'ml-IN', otherLanguageIds: ['en-IN', 'ta-IN'] },
  { id: 'madhya-pradesh', name: 'Madhya Pradesh', kind: 'state', primaryLanguageId: 'hi-IN', otherLanguageIds: ['mr-IN', 'ur-IN'] },
  { id: 'maharashtra', name: 'Maharashtra', kind: 'state', primaryLanguageId: 'mr-IN', otherLanguageIds: ['hi-IN', 'kok-IN', 'sd-IN', 'en-IN'] },
  { id: 'manipur', name: 'Manipur', kind: 'state', primaryLanguageId: 'mni-IN', otherLanguageIds: ['en-IN', 'hi-IN'] },
  { id: 'meghalaya', name: 'Meghalaya', kind: 'state', primaryLanguageId: 'kha-IN', otherLanguageIds: ['en-IN', 'bn-IN'] },
  { id: 'mizoram', name: 'Mizoram', kind: 'state', primaryLanguageId: 'lus-IN', otherLanguageIds: ['en-IN', 'hi-IN'] },
  { id: 'nagaland', name: 'Nagaland', kind: 'state', primaryLanguageId: 'en-IN', otherLanguageIds: ['hi-IN', 'as-IN'] },
  { id: 'odisha', name: 'Odisha', kind: 'state', primaryLanguageId: 'or-IN', otherLanguageIds: ['sat-IN', 'hi-IN', 'en-IN'] },
  { id: 'punjab', name: 'Punjab', kind: 'state', primaryLanguageId: 'pa-IN', otherLanguageIds: ['hi-IN', 'en-IN'] },
  { id: 'rajasthan', name: 'Rajasthan', kind: 'state', primaryLanguageId: 'hi-IN', otherLanguageIds: ['sd-IN', 'en-IN'] },
  { id: 'sikkim', name: 'Sikkim', kind: 'state', primaryLanguageId: 'ne-IN', otherLanguageIds: ['en-IN', 'hi-IN'] },
  { id: 'tamil-nadu', name: 'Tamil Nadu', kind: 'state', primaryLanguageId: 'ta-IN', otherLanguageIds: ['en-IN'] },
  { id: 'telangana', name: 'Telangana', kind: 'state', primaryLanguageId: 'te-IN', otherLanguageIds: ['ur-IN', 'en-IN'] },
  { id: 'tripura', name: 'Tripura', kind: 'state', primaryLanguageId: 'bn-IN', otherLanguageIds: ['trp-IN', 'en-IN'] },
  { id: 'uttar-pradesh', name: 'Uttar Pradesh', kind: 'state', primaryLanguageId: 'hi-IN', otherLanguageIds: ['ur-IN', 'en-IN'] },
  { id: 'uttarakhand', name: 'Uttarakhand', kind: 'state', primaryLanguageId: 'hi-IN', otherLanguageIds: ['sa-IN', 'en-IN'] },
  { id: 'west-bengal', name: 'West Bengal', kind: 'state', primaryLanguageId: 'bn-IN', otherLanguageIds: ['ne-IN', 'sat-IN', 'ur-IN', 'hi-IN'] },
  // 8 Union Territories
  { id: 'andaman-nicobar', name: 'Andaman & Nicobar Islands', kind: 'ut', primaryLanguageId: 'hi-IN', otherLanguageIds: ['bn-IN', 'ta-IN', 'te-IN', 'en-IN'] },
  { id: 'chandigarh', name: 'Chandigarh', kind: 'ut', primaryLanguageId: 'en-IN', otherLanguageIds: ['hi-IN', 'pa-IN'] },
  { id: 'dnh-dd', name: 'Dadra & Nagar Haveli and Daman & Diu', kind: 'ut', primaryLanguageId: 'gu-IN', otherLanguageIds: ['mr-IN', 'hi-IN', 'en-IN'] },
  { id: 'delhi', name: 'Delhi (NCT)', kind: 'ut', primaryLanguageId: 'hi-IN', otherLanguageIds: ['en-IN', 'pa-IN', 'ur-IN'] },
  { id: 'jammu-kashmir', name: 'Jammu & Kashmir', kind: 'ut', primaryLanguageId: 'ks-IN', otherLanguageIds: ['doi-IN', 'ur-IN', 'hi-IN', 'en-IN'] },
  { id: 'ladakh', name: 'Ladakh', kind: 'ut', primaryLanguageId: 'lbj-IN', otherLanguageIds: ['hi-IN', 'ur-IN', 'en-IN'] },
  { id: 'lakshadweep', name: 'Lakshadweep', kind: 'ut', primaryLanguageId: 'ml-IN', otherLanguageIds: ['en-IN'] },
  { id: 'puducherry', name: 'Puducherry', kind: 'ut', primaryLanguageId: 'ta-IN', otherLanguageIds: ['te-IN', 'ml-IN', 'en-IN'] },
];

const LANG_BY_ID = new Map<string, IndianLanguageOption>(
  APP_LANGUAGES.map((lang) => [lang.id, lang])
);

export function getLanguageOption(code?: string | null): IndianLanguageOption {
  if (code && LANG_BY_ID.has(code)) {
    return LANG_BY_ID.get(code)!;
  }
  return APP_LANGUAGES[0]; // en-IN default
}

export function getSpeechRecognitionLocale(code?: string | null): string {
  return getLanguageOption(code).speechLocale;
}

export function getLanguagesForState(stateId: string): IndianLanguageOption[] {
  const region = INDIA_STATES_AND_UTS.find((s) => s.id === stateId);
  if (!region) return [APP_LANGUAGES[0]];
  const ids = [region.primaryLanguageId, ...region.otherLanguageIds];
  return ids
    .map((id) => LANG_BY_ID.get(id))
    .filter((item): item is IndianLanguageOption => Boolean(item));
}

export function filterStatesByQuery(query: string): IndianStateRegion[] {
  const q = query.trim().toLowerCase();
  if (!q) return INDIA_STATES_AND_UTS;
  return INDIA_STATES_AND_UTS.filter((region) => {
    if (region.name.toLowerCase().includes(q)) return true;
    const langs = getLanguagesForState(region.id);
    return langs.some(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q)
    );
  });
}

export function filterLanguagesByQuery(query: string): IndianLanguageOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return APP_LANGUAGES;
  return APP_LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(q) ||
      lang.nativeName.toLowerCase().includes(q) ||
      lang.id.toLowerCase().includes(q) ||
      lang.states.some((s) => s.toLowerCase().includes(q))
  );
}
