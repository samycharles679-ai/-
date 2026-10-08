export interface CountryOption {
  code: string;
  dialCode: string; // e.g. '225', or '' for full manual entry
  flag: string;
  name: string;
  placeholder: string;
}

export const COUNTRIES: CountryOption[] = [
  { code: 'ALL', dialCode: '', flag: '🌐', name: 'Indicatif libre (Numéro complet)', placeholder: '225 07 00 00 00 00' },
  { code: 'CI', dialCode: '225', flag: '🇨🇮', name: "Côte d'Ivoire", placeholder: '07 00 00 00 00' },
  { code: 'SN', dialCode: '221', flag: '🇸🇳', name: 'Sénégal', placeholder: '77 000 00 00' },
  { code: 'CM', dialCode: '237', flag: '🇨🇲', name: 'Cameroun', placeholder: '6 90 00 00 00' },
  { code: 'CD', dialCode: '243', flag: '🇨🇩', name: 'RD Congo', placeholder: '99 000 0000' },
  { code: 'FR', dialCode: '33', flag: '🇫🇷', name: 'France', placeholder: '6 12 34 56 78' },
  { code: 'MA', dialCode: '212', flag: '🇲🇦', name: 'Maroc', placeholder: '6 12 34 56 78' },
  { code: 'BJ', dialCode: '229', flag: '🇧🇯', name: 'Bénin', placeholder: '01 97 00 00 00' },
  { code: 'TG', dialCode: '228', flag: '🇹🇬', name: 'Togo', placeholder: '90 00 00 00' },
  { code: 'BF', dialCode: '226', flag: '🇧🇫', name: 'Burkina Faso', placeholder: '70 00 00 00' },
  { code: 'ML', dialCode: '223', flag: '🇲🇱', name: 'Mali', placeholder: '70 00 00 00' },
  { code: 'GN', dialCode: '224', flag: '🇬🇳', name: 'Guinée', placeholder: '620 00 00 00' },
  { code: 'GA', dialCode: '241', flag: '🇬🇦', name: 'Gabon', placeholder: '07 00 00 00' },
  { code: 'CG', dialCode: '242', flag: '🇨🇬', name: 'Congo-Brazzaville', placeholder: '06 000 0000' },
  { code: 'NE', dialCode: '227', flag: '🇳🇪', name: 'Niger', placeholder: '90 00 00 00' },
  { code: 'TD', dialCode: '235', flag: '🇹🇩', name: 'Tchad', placeholder: '66 00 00 00' },
  { code: 'CF', dialCode: '236', flag: '🇨🇫', name: 'Centrafrique', placeholder: '75 00 00 00' },
  { code: 'MG', dialCode: '261', flag: '🇲🇬', name: 'Madagascar', placeholder: '34 00 000 00' },
  { code: 'DZ', dialCode: '213', flag: '🇩🇿', name: 'Algérie', placeholder: '5 50 00 00 00' },
  { code: 'TN', dialCode: '216', flag: '🇹🇳', name: 'Tunisie', placeholder: '20 000 000' },
  { code: 'HT', dialCode: '509', flag: '🇭🇹', name: 'Haïti', placeholder: '34 00 0000' },
  { code: 'BE', dialCode: '32', flag: '🇧🇪', name: 'Belgique', placeholder: '470 12 34 56' },
  { code: 'CH', dialCode: '41', flag: '🇨🇭', name: 'Suisse', placeholder: '79 123 45 67' },
  { code: 'CA', dialCode: '1', flag: '🇨🇦', name: 'Canada / USA', placeholder: '514 000 0000' },
  { code: 'GB', dialCode: '44', flag: '🇬🇧', name: 'Royaume-Uni', placeholder: '7700 900000' },
  { code: 'BR', dialCode: '55', flag: '🇧🇷', name: 'Brésil', placeholder: '11 98000 0000' },
  { code: 'IN', dialCode: '91', flag: '🇮🇳', name: 'Inde', placeholder: '98765 43210' },
];
