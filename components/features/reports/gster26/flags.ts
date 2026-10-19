// @ts-nocheck
/* eslint-disable */
import React from 'react';

// Helper function to detect if the current system supports emoji flags well
const shouldUseSvgFlags = () => {
  if (typeof navigator === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Use SVG flags on Windows systems (known to have poor emoji flag support)
  return userAgent.includes('windows');
};

// Same emoji/SVG choice as `getCountryFlag`, but keyed on an ISO-3166 alpha-2
// code rather than a country name — for callers that already resolved a code
// through their own lookup. Returns null for anything that isn't a code, so
// the caller can render nothing instead of the white "unknown" flag.
export const getFlagByCountryCode = (code: string | null | undefined) => {
  const cc = (code ?? '').trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(cc)) return null;

  if (shouldUseSvgFlags()) {
    return React.createElement('span', {
      className: `fi fi-${cc}`,
      style: { width: '1em', height: '1em', display: 'inline-block' }
    });
  }
  // Regional indicator symbols: 'a' → U+1F1E6, and so on.
  return String.fromCodePoint(
    ...Array.from(cc, (ch) => 0x1f1e6 + ch.charCodeAt(0) - 97)
  );
};

// Helper function to get country flag with automatic emoji/SVG fallback
export const getCountryFlag = (country: string) => {
  // Emoji flag mappings
  const emojiFlags: { [key: string]: string } = {
    'USA': '🇺🇸', 'UK': '🇬🇧', 'Canada': '🇨🇦', 'Germany': '🇩🇪', 'France': '🇫🇷',
    'Italy': '🇮🇹', 'Spain': '🇪🇸', 'Netherlands': '🇳🇱', 'Sweden': '🇸🇪', 'Norway': '🇳🇴',
    'Denmark': '🇩🇰', 'Finland': '🇫🇮', 'Switzerland': '🇨🇭', 'Austria': '🇦🇹', 'Belgium': '🇧🇪',
    'Ireland': '🇮🇪', 'Portugal': '🇵🇹', 'Australia': '🇦🇺', 'New Zealand': '🇳🇿', 'Japan': '🇯🇵',
    'South Korea': '🇰🇷', 'China': '🇨🇳', 'India': '🇮🇳', 'Singapore': '🇸🇬', 'Israel': '🇮🇱',
    'Brazil': '🇧🇷', 'Argentina': '🇦🇷', 'Mexico': '🇲🇽', 'Chile': '🇨🇱', 'South Africa': '🇿🇦',
    'UAE': '🇦🇪', 'Saudi Arabia': '🇸🇦', 'Turkey': '🇹🇷', 'Russia': '🇷🇺', 'Poland': '🇵🇱',
    'Czech Republic': '🇨🇿', 'Hungary': '🇭🇺', 'Romania': '🇷🇴', 'Bulgaria': '🇧🇬', 'Croatia': '🇭🇷',
    'Serbia': '🇷🇸', 'Slovenia': '🇸🇮', 'Slovakia': '🇸🇰', 'Estonia': '🇪🇪', 'Latvia': '🇱🇻',
    'Lithuania': '🇱🇹', 'Ukraine': '🇺🇦', 'Belarus': '🇧🇾', 'Moldova': '🇲🇩', 'Georgia': '🇬🇪',
    'Armenia': '🇦🇲', 'Azerbaijan': '🇦🇿', 'Kazakhstan': '🇰🇿', 'Uzbekistan': '🇺🇿', 'Kyrgyzstan': '🇰🇬',
    'Tajikistan': '🇹🇯', 'Turkmenistan': '🇹🇲', 'Mongolia': '🇲🇳', 'North Korea': '🇰🇵', 'Myanmar': '🇲🇲',
    'Thailand': '🇹🇭', 'Vietnam': '🇻🇳', 'Laos': '🇱🇦', 'Cambodia': '🇰🇭', 'Malaysia': '🇲🇾',
    'Indonesia': '🇮🇩', 'Philippines': '🇵🇭', 'Brunei': '🇧🇳', 'Taiwan': '🇹🇼', 'Hong Kong': '🇭🇰',
    'Macau': '🇲🇴', 'Sri Lanka': '🇱🇰', 'Bangladesh': '🇧🇩', 'Pakistan': '🇵🇰', 'Afghanistan': '🇦🇫',
    'Iran': '🇮🇷', 'Iraq': '🇮🇶', 'Jordan': '🇯🇴', 'Lebanon': '🇱🇧', 'Syria': '🇸🇾',
    'Yemen': '🇾🇪', 'Oman': '🇴🇲', 'Qatar': '🇶🇦', 'Bahrain': '🇧🇭', 'Kuwait': '🇰🇼',
    'Egypt': '🇪🇬', 'Libya': '🇱🇾', 'Tunisia': '🇹🇳', 'Algeria': '🇩🇿', 'Morocco': '🇲🇦',
    'Sudan': '🇸🇩', 'Ethiopia': '🇪🇹', 'Kenya': '🇰🇪', 'Uganda': '🇺🇬', 'Tanzania': '🇹🇿',
    'Rwanda': '🇷🇼', 'Burundi': '🇧🇮', 'Madagascar': '🇲🇬', 'Mauritius': '🇲🇺', 'Seychelles': '🇸🇨',
    'Nigeria': '🇳🇬', 'Ghana': '🇬🇭', 'Ivory Coast': '🇨🇮', 'Senegal': '🇸🇳', 'Mali': '🇲🇱',
    'Burkina Faso': '🇧🇫', 'Niger': '🇳🇪', 'Chad': '🇹🇩', 'Cameroon': '🇨🇲', 'Central African Republic': '🇨🇫',
    'Democratic Republic of Congo': '🇨🇩', 'Republic of Congo': '🇨🇬', 'Gabon': '🇬🇦', 'Equatorial Guinea': '🇬🇶',
    'Sao Tome and Principe': '🇸🇹', 'Cape Verde': '🇨🇻', 'Guinea-Bissau': '🇬🇼', 'Guinea': '🇬🇳',
    'Sierra Leone': '🇸🇱', 'Liberia': '🇱🇷', 'Togo': '🇹🇬', 'Benin': '🇧🇯', 'Zambia': '🇿🇲',
    'Malawi': '🇲🇼', 'Mozambique': '🇲🇿', 'Zimbabwe': '🇿🇼', 'Botswana': '🇧🇼', 'Namibia': '🇳🇦',
    'Lesotho': '🇱🇸', 'Eswatini': '🇸🇿', 'Angola': '🇦🇴', 'Colombia': '🇨🇴', 'Venezuela': '🇻🇪',
    'Guyana': '🇬🇾', 'Suriname': '🇸🇷', 'French Guiana': '🇬🇫', 'Ecuador': '🇪🇨', 'Peru': '🇵🇪',
    'Bolivia': '🇧🇴', 'Paraguay': '🇵🇾', 'Uruguay': '🇺🇾', 'Costa Rica': '🇨🇷', 'Panama': '🇵🇦',
    'Nicaragua': '🇳🇮', 'Honduras': '🇭🇳', 'El Salvador': '🇸🇻', 'Guatemala': '🇬🇹', 'Belize': '🇧🇿',
    'Jamaica': '🇯🇲', 'Haiti': '🇭🇹', 'Dominican Republic': '🇩🇴', 'Cuba': '🇨🇺', 'Bahamas': '🇧🇸',
    'Barbados': '🇧🇧', 'Trinidad and Tobago': '🇹🇹', 'Saint Lucia': '🇱🇨', 'Saint Vincent and the Grenadines': '🇻🇨',
    'Grenada': '🇬🇩', 'Antigua and Barbuda': '🇦🇬', 'Saint Kitts and Nevis': '🇰🇳', 'Dominica': '🇩🇲',
    'Puerto Rico': '🇵🇷', 'Virgin Islands': '🇻🇮', 'Aruba': '🇦🇼', 'Curacao': '🇨🇼', 'Sint Maarten': '🇸🇽',
    'Cayman Islands': '🇰🇾', 'Bermuda': '🇧🇲', 'Greenland': '🇬🇱', 'Faroe Islands': '🇫🇴', 'Iceland': '🇮🇸',
    'Malta': '🇲🇹', 'Cyprus': '🇨🇾', 'Monaco': '🇲🇨', 'San Marino': '🇸🇲', 'Vatican City': '🇻🇦',
    'Liechtenstein': '🇱🇮', 'Andorra': '🇦🇩', 'Luxembourg': '🇱🇺', 'Fiji': '🇫🇯', 'Papua New Guinea': '🇵🇬',
    'Solomon Islands': '🇸🇧', 'Vanuatu': '🇻🇺', 'Samoa': '🇼🇸', 'Tonga': '🇹🇴', 'Kiribati': '🇰🇮',
    'Tuvalu': '🇹🇻', 'Nauru': '🇳🇷', 'Palau': '🇵🇼', 'Marshall Islands': '🇲🇭', 'Micronesia': '🇫🇲',
    'Maldives': '🇲🇻', 'Bhutan': '🇧🇹', 'Nepal': '🇳🇵', 'Timor-Leste': '🇹🇱', 'Comoros': '🇰🇲', 'Djibouti': '🇩🇯',
    'Eritrea': '🇪🇷', 'Somalia': '🇸🇴', 'Gambia': '🇬🇲',
    // Alternative names for common countries
    'United States': '🇺🇸',
    'United Kingdom': '🇬🇧'
  };

  // SVG flag country code mappings
  const countryCodeMap: { [key: string]: string } = {
    'USA': 'us', 'UK': 'gb', 'Canada': 'ca', 'Germany': 'de', 'France': 'fr',
    'Italy': 'it', 'Spain': 'es', 'Netherlands': 'nl', 'Sweden': 'se', 'Norway': 'no',
    'Denmark': 'dk', 'Finland': 'fi', 'Switzerland': 'ch', 'Austria': 'at', 'Belgium': 'be',
    'Ireland': 'ie', 'Portugal': 'pt', 'Australia': 'au', 'New Zealand': 'nz', 'Japan': 'jp',
    'South Korea': 'kr', 'China': 'cn', 'India': 'in', 'Singapore': 'sg', 'Israel': 'il',
    'Brazil': 'br', 'Argentina': 'ar', 'Mexico': 'mx', 'Chile': 'cl', 'South Africa': 'za',
    'UAE': 'ae', 'Saudi Arabia': 'sa', 'Turkey': 'tr', 'Russia': 'ru', 'Poland': 'pl',
    'Czech Republic': 'cz', 'Hungary': 'hu', 'Romania': 'ro', 'Bulgaria': 'bg', 'Croatia': 'hr',
    'Serbia': 'rs', 'Slovenia': 'si', 'Slovakia': 'sk', 'Estonia': 'ee', 'Latvia': 'lv',
    'Lithuania': 'lt', 'Ukraine': 'ua', 'Belarus': 'by', 'Moldova': 'md', 'Georgia': 'ge',
    'Armenia': 'am', 'Azerbaijan': 'az', 'Kazakhstan': 'kz', 'Uzbekistan': 'uz', 'Kyrgyzstan': 'kg',
    'Tajikistan': 'tj', 'Turkmenistan': 'tm', 'Mongolia': 'mn', 'North Korea': 'kp', 'Myanmar': 'mm',
    'Thailand': 'th', 'Vietnam': 'vn', 'Laos': 'la', 'Cambodia': 'kh', 'Malaysia': 'my',
    'Indonesia': 'id', 'Philippines': 'ph', 'Brunei': 'bn', 'Taiwan': 'tw', 'Hong Kong': 'hk',
    'Macau': 'mo', 'Sri Lanka': 'lk', 'Bangladesh': 'bd', 'Pakistan': 'pk', 'Afghanistan': 'af',
    'Iran': 'ir', 'Iraq': 'iq', 'Jordan': 'jo', 'Lebanon': 'lb', 'Syria': 'sy',
    'Yemen': 'ye', 'Oman': 'om', 'Qatar': 'qa', 'Bahrain': 'bh', 'Kuwait': 'kw',
    'Egypt': 'eg', 'Libya': 'ly', 'Tunisia': 'tn', 'Algeria': 'dz', 'Morocco': 'ma',
    'Sudan': 'sd', 'Ethiopia': 'et', 'Kenya': 'ke', 'Uganda': 'ug', 'Tanzania': 'tz',
    'Rwanda': 'rw', 'Burundi': 'bi', 'Madagascar': 'mg', 'Mauritius': 'mu', 'Seychelles': 'sc',
    'Nigeria': 'ng', 'Ghana': 'gh', 'Ivory Coast': 'ci', 'Senegal': 'sn', 'Mali': 'ml',
    'Burkina Faso': 'bf', 'Niger': 'ne', 'Chad': 'td', 'Cameroon': 'cm', 'Central African Republic': 'cf',
    'Democratic Republic of Congo': 'cd', 'Republic of Congo': 'cg', 'Gabon': 'ga', 'Equatorial Guinea': 'gq',
    'Sao Tome and Principe': 'st', 'Cape Verde': 'cv', 'Guinea-Bissau': 'gw', 'Guinea': 'gn',
    'Sierra Leone': 'sl', 'Liberia': 'lr', 'Togo': 'tg', 'Benin': 'bj', 'Zambia': 'zm',
    'Malawi': 'mw', 'Mozambique': 'mz', 'Zimbabwe': 'zw', 'Botswana': 'bw', 'Namibia': 'na',
    'Lesotho': 'ls', 'Eswatini': 'sz', 'Angola': 'ao', 'Colombia': 'co', 'Venezuela': 've',
    'Guyana': 'gy', 'Suriname': 'sr', 'French Guiana': 'gf', 'Ecuador': 'ec', 'Peru': 'pe',
    'Bolivia': 'bo', 'Paraguay': 'py', 'Uruguay': 'uy', 'Costa Rica': 'cr', 'Panama': 'pa',
    'Nicaragua': 'ni', 'Honduras': 'hn', 'El Salvador': 'sv', 'Guatemala': 'gt', 'Belize': 'bz',
    'Jamaica': 'jm', 'Haiti': 'ht', 'Dominican Republic': 'do', 'Cuba': 'cu', 'Bahamas': 'bs',
    'Barbados': 'bb', 'Trinidad and Tobago': 'tt', 'Saint Lucia': 'lc', 'Saint Vincent and the Grenadines': 'vc',
    'Grenada': 'gd', 'Antigua and Barbuda': 'ag', 'Saint Kitts and Nevis': 'kn', 'Dominica': 'dm',
    'Puerto Rico': 'pr', 'Virgin Islands': 'vi', 'Aruba': 'aw', 'Curacao': 'cw', 'Sint Maarten': 'sx',
    'Cayman Islands': 'ky', 'Bermuda': 'bm', 'Greenland': 'gl', 'Faroe Islands': 'fo', 'Iceland': 'is',
    'Malta': 'mt', 'Cyprus': 'cy', 'Monaco': 'mc', 'San Marino': 'sm', 'Vatican City': 'va',
    'Liechtenstein': 'li', 'Andorra': 'ad', 'Luxembourg': 'lu', 'Fiji': 'fj', 'Papua New Guinea': 'pg',
    'Solomon Islands': 'sb', 'Vanuatu': 'vu', 'Samoa': 'ws', 'Tonga': 'to', 'Kiribati': 'ki',
    'Tuvalu': 'tv', 'Nauru': 'nr', 'Palau': 'pw', 'Marshall Islands': 'mh', 'Micronesia': 'fm',
    'Maldives': 'mv', 'Bhutan': 'bt', 'Nepal': 'np', 'Timor-Leste': 'tl', 'Comoros': 'km', 'Djibouti': 'dj',
    'Eritrea': 'er', 'Somalia': 'so', 'Gambia': 'gm',
    // Alternative names for common countries
    'United States': 'us',
    'United Kingdom': 'gb'
  };

  // Choose rendering method based on platform
  if (shouldUseSvgFlags()) {
    // Use SVG flags for Windows systems
    const countryCode = countryCodeMap[country] || 'xx';
    return React.createElement('span', {
      className: `fi fi-${countryCode}`,
      style: { width: '1em', height: '1em', display: 'inline-block' }
    });
  } else {
    // Use emoji flags for Mac/iPhone/Android systems
    return emojiFlags[country] || '🏳️';
  }
};