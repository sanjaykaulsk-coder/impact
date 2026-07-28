// Founder request: State suggestions shouldn't depend on this campaign already having used a
// state before ("if I type U it shows states with U like Uttar Pradesh"). This is the full,
// stable list of India's 28 states + 8 union territories — small and well-established enough to
// state directly, unlike a full District/Tehsil dataset (~750+ districts, boundaries and names
// that do genuinely change over time), which would risk real inaccuracy if hand-typed here.
// District/Tehsil/Location suggestions stay sourced from this campaign's own PJP history instead
// (see PjpPage's knownLocations) — an honest choice given no canonical dataset exists in this
// repo (see docs/ASSUMPTIONS.md).
export const INDIA_STATES_AND_UNION_TERRITORIES: string[] = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];
