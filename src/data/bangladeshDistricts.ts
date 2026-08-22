export interface DivisionWithDistricts {
  division: string;
  districts: string[];
}

export const BANGLADESH_DIVISIONS_AND_DISTRICTS: DivisionWithDistricts[] = [
  {
    division: 'Dhaka Division',
    districts: [
      'Dhaka',
      'Faridpur',
      'Gazipur',
      'Gopalganj',
      'Kishoreganj',
      'Madaripur',
      'Manikganj',
      'Munshiganj',
      'Narayanganj',
      'Narsingdi',
      'Rajbari',
      'Shariatpur',
      'Tangail'
    ]
  },
  {
    division: 'Chattogram Division',
    districts: [
      'Bandarban',
      'Brahmanbaria',
      'Chandpur',
      'Chattogram',
      'Cumilla',
      'Cox\'s Bazar',
      'Feni',
      'Khagrachhari',
      'Lakshmipur',
      'Noakhali',
      'Rangamati'
    ]
  },
  {
    division: 'Rajshahi Division',
    districts: [
      'Bogura',
      'Chapainawabganj',
      'Joypurhat',
      'Naogaon',
      'Natore',
      'Pabna',
      'Rajshahi',
      'Sirajganj'
    ]
  },
  {
    division: 'Khulna Division',
    districts: [
      'Bagerhat',
      'Chuadanga',
      'Jashore',
      'Jhenaidah',
      'Khulna',
      'Kushtia',
      'Magura',
      'Meherpur',
      'Narail',
      'Satkhira'
    ]
  },
  {
    division: 'Barishal Division',
    districts: [
      'Barguna',
      'Barishal',
      'Bhola',
      'Jhalokathi',
      'Patuakhali',
      'Pirojpur'
    ]
  },
  {
    division: 'Sylhet Division',
    districts: [
      'Habiganj',
      'Moulvibazar',
      'Sunamganj',
      'Sylhet'
    ]
  },
  {
    division: 'Rangpur Division',
    districts: [
      'Dinajpur',
      'Gaibandha',
      'Kurigram',
      'Lalmonirhat',
      'Nilphamari',
      'Panchagarh',
      'Rangpur',
      'Thakurgaon'
    ]
  },
  {
    division: 'Mymensingh Division',
    districts: [
      'Jamalpur',
      'Mymensingh',
      'Netrokona',
      'Sherpur'
    ]
  }
];

// Flat array of all 64 unique districts in Bangladesh
export const ALL_64_BD_DISTRICTS: string[] = BANGLADESH_DIVISIONS_AND_DISTRICTS.flatMap(
  (group) => group.districts
);

// Map common aliases or legacy spellings to standard official names to ensure backwards compatibility
export const normalizeDistrictName = (district?: string): string => {
  if (!district) return 'Dhaka';
  const trimmed = district.trim();
  const lower = trimmed.toLowerCase();
  
  if (lower === 'chittagong') return 'Chattogram';
  if (lower === 'comilla') return 'Cumilla';
  if (lower === 'jessore') return 'Jashore';
  if (lower === 'bogra') return 'Bogura';
  if (lower === 'barisal') return 'Barishal';
  
  const match = ALL_64_BD_DISTRICTS.find(d => d.toLowerCase() === lower);
  return match || trimmed;
};
