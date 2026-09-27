export type Country = { code: string; name: string; continent: string }

export const COUNTRIES: Country[] = [
  // Africa
  { code: 'NG', name: 'Nigeria', continent: 'Africa' },
  { code: 'GH', name: 'Ghana', continent: 'Africa' },
  { code: 'TG', name: 'Togo', continent: 'Africa' },
  { code: 'CI', name: "Côte d'Ivoire", continent: 'Africa' },
  { code: 'SN', name: 'Senegal', continent: 'Africa' },
  { code: 'BJ', name: 'Benin', continent: 'Africa' },
  { code: 'CM', name: 'Cameroon', continent: 'Africa' },
  { code: 'KE', name: 'Kenya', continent: 'Africa' },
  { code: 'ZA', name: 'South Africa', continent: 'Africa' },
  { code: 'EG', name: 'Egypt', continent: 'Africa' },
  { code: 'MA', name: 'Morocco', continent: 'Africa' },
  { code: 'DZ', name: 'Algeria', continent: 'Africa' },
  { code: 'TN', name: 'Tunisia', continent: 'Africa' },
  { code: 'ET', name: 'Ethiopia', continent: 'Africa' },
  { code: 'TZ', name: 'Tanzania', continent: 'Africa' },
  { code: 'UG', name: 'Uganda', continent: 'Africa' },
  { code: 'ML', name: 'Mali', continent: 'Africa' },
  { code: 'BF', name: 'Burkina Faso', continent: 'Africa' },
  { code: 'NE', name: 'Niger', continent: 'Africa' },
  { code: 'RW', name: 'Rwanda', continent: 'Africa' },

  // Asia
  { code: 'CN', name: 'China', continent: 'Asia' },
  { code: 'IN', name: 'India', continent: 'Asia' },
  { code: 'JP', name: 'Japan', continent: 'Asia' },
  { code: 'KR', name: 'South Korea', continent: 'Asia' },
  { code: 'ID', name: 'Indonesia', continent: 'Asia' },
  { code: 'PH', name: 'Philippines', continent: 'Asia' },
  { code: 'VN', name: 'Vietnam', continent: 'Asia' },
  { code: 'TH', name: 'Thailand', continent: 'Asia' },
  { code: 'MY', name: 'Malaysia', continent: 'Asia' },
  { code: 'SG', name: 'Singapore', continent: 'Asia' },
  { code: 'PK', name: 'Pakistan', continent: 'Asia' },
  { code: 'BD', name: 'Bangladesh', continent: 'Asia' },
  { code: 'LK', name: 'Sri Lanka', continent: 'Asia' },
  { code: 'NP', name: 'Nepal', continent: 'Asia' },
  { code: 'TW', name: 'Taiwan', continent: 'Asia' },
  { code: 'HK', name: 'Hong Kong', continent: 'Asia' },

  // Europe
  { code: 'GB', name: 'United Kingdom', continent: 'Europe' },
  { code: 'FR', name: 'France', continent: 'Europe' },
  { code: 'DE', name: 'Germany', continent: 'Europe' },
  { code: 'IT', name: 'Italy', continent: 'Europe' },
  { code: 'ES', name: 'Spain', continent: 'Europe' },
  { code: 'PT', name: 'Portugal', continent: 'Europe' },
  { code: 'NL', name: 'Netherlands', continent: 'Europe' },
  { code: 'BE', name: 'Belgium', continent: 'Europe' },
  { code: 'CH', name: 'Switzerland', continent: 'Europe' },
  { code: 'AT', name: 'Austria', continent: 'Europe' },
  { code: 'SE', name: 'Sweden', continent: 'Europe' },
  { code: 'NO', name: 'Norway', continent: 'Europe' },
  { code: 'DK', name: 'Denmark', continent: 'Europe' },
  { code: 'FI', name: 'Finland', continent: 'Europe' },
  { code: 'PL', name: 'Poland', continent: 'Europe' },
  { code: 'IE', name: 'Ireland', continent: 'Europe' },
  { code: 'GR', name: 'Greece', continent: 'Europe' },
  { code: 'RO', name: 'Romania', continent: 'Europe' },
  { code: 'UA', name: 'Ukraine', continent: 'Europe' },
  { code: 'RU', name: 'Russia', continent: 'Europe' },

  // Americas
  { code: 'US', name: 'United States', continent: 'Americas' },
  { code: 'CA', name: 'Canada', continent: 'Americas' },
  { code: 'MX', name: 'Mexico', continent: 'Americas' },
  { code: 'BR', name: 'Brazil', continent: 'Americas' },
  { code: 'AR', name: 'Argentina', continent: 'Americas' },
  { code: 'CO', name: 'Colombia', continent: 'Americas' },
  { code: 'CL', name: 'Chile', continent: 'Americas' },
  { code: 'PE', name: 'Peru', continent: 'Americas' },
  { code: 'VE', name: 'Venezuela', continent: 'Americas' },
  { code: 'EC', name: 'Ecuador', continent: 'Americas' },
  { code: 'CU', name: 'Cuba', continent: 'Americas' },
  { code: 'DO', name: 'Dominican Republic', continent: 'Americas' },
  { code: 'JM', name: 'Jamaica', continent: 'Americas' },
  { code: 'HT', name: 'Haiti', continent: 'Americas' },

  // Middle East
  { code: 'SA', name: 'Saudi Arabia', continent: 'Middle East' },
  { code: 'AE', name: 'United Arab Emirates', continent: 'Middle East' },
  { code: 'IL', name: 'Israel', continent: 'Middle East' },
  { code: 'TR', name: 'Turkey', continent: 'Middle East' },
  { code: 'QA', name: 'Qatar', continent: 'Middle East' },
  { code: 'KW', name: 'Kuwait', continent: 'Middle East' },
  { code: 'JO', name: 'Jordan', continent: 'Middle East' },
  { code: 'LB', name: 'Lebanon', continent: 'Middle East' },
  { code: 'IQ', name: 'Iraq', continent: 'Middle East' },
  { code: 'IR', name: 'Iran', continent: 'Middle East' },
  { code: 'OM', name: 'Oman', continent: 'Middle East' },

  // Oceania
  { code: 'AU', name: 'Australia', continent: 'Oceania' },
  { code: 'NZ', name: 'New Zealand', continent: 'Oceania' },
  { code: 'FJ', name: 'Fiji', continent: 'Oceania' },
  { code: 'PG', name: 'Papua New Guinea', continent: 'Oceania' },
]

export function countryToFlag(code?: string): string {
  if (!code || code.length !== 2) return '🏳️'
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

export function countryToContinent(code?: string): string | null {
  const c = COUNTRIES.find(c => c.code === code)
  return c ? c.continent : null
}