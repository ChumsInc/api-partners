"use strict";
const countryCodes = [
    {
        "alpha2": "AW",
        "alpha3": "ABW",
        "CountryName": "Aruba"
    },
    {
        "alpha2": "AF",
        "alpha3": "AFG",
        "CountryName": "Afghanistan"
    },
    {
        "alpha2": "AO",
        "alpha3": "AGO",
        "CountryName": "Angola"
    },
    {
        "alpha2": "AI",
        "alpha3": "AIA",
        "CountryName": "Anguilla"
    },
    {
        "alpha2": "AX",
        "alpha3": "ALA",
        "CountryName": "Åland Islands"
    },
    {
        "alpha2": "AL",
        "alpha3": "ALB",
        "CountryName": "Albania"
    },
    {
        "alpha2": "AD",
        "alpha3": "AND",
        "CountryName": "Andorra"
    },
    {
        "alpha2": "AN",
        "alpha3": "ANT",
        "CountryName": "Netherlands Antilles"
    },
    {
        "alpha2": "AE",
        "alpha3": "ARE",
        "CountryName": "United Arab Emirates"
    },
    {
        "alpha2": "AR",
        "alpha3": "ARG",
        "CountryName": "Argentina"
    },
    {
        "alpha2": "AM",
        "alpha3": "ARM",
        "CountryName": "Armenia"
    },
    {
        "alpha2": "AS",
        "alpha3": "ASM",
        "CountryName": "American Samoa"
    },
    {
        "alpha2": "AQ",
        "alpha3": "ATA",
        "CountryName": "Antarctica"
    },
    {
        "alpha2": "TF",
        "alpha3": "ATF",
        "CountryName": "French Southern Territories"
    },
    {
        "alpha2": "AG",
        "alpha3": "ATG",
        "CountryName": "Antigua and Barbuda"
    },
    {
        "alpha2": "AU",
        "alpha3": "AUS",
        "CountryName": "Australia"
    },
    {
        "alpha2": "AT",
        "alpha3": "AUT",
        "CountryName": "Austria"
    },
    {
        "alpha2": "AZ",
        "alpha3": "AZE",
        "CountryName": "Azerbaijan"
    },
    {
        "alpha2": "BI",
        "alpha3": "BDI",
        "CountryName": "Burundi"
    },
    {
        "alpha2": "BE",
        "alpha3": "BEL",
        "CountryName": "Belgium"
    },
    {
        "alpha2": "BJ",
        "alpha3": "BEN",
        "CountryName": "Benin"
    },
    {
        "alpha2": "BQ",
        "alpha3": "BES",
        "CountryName": "Bonaire"
    },
    {
        "alpha2": "BF",
        "alpha3": "BFA",
        "CountryName": "Burkina Faso"
    },
    {
        "alpha2": "BD",
        "alpha3": "BGD",
        "CountryName": "Bangladesh"
    },
    {
        "alpha2": "BG",
        "alpha3": "BGR",
        "CountryName": "Bulgaria"
    },
    {
        "alpha2": "BH",
        "alpha3": "BHR",
        "CountryName": "Bahrain"
    },
    {
        "alpha2": "BS",
        "alpha3": "BHS",
        "CountryName": "Bahamas"
    },
    {
        "alpha2": "BA",
        "alpha3": "BIH",
        "CountryName": "Bosnia and Herzegovina"
    },
    {
        "alpha2": "BL",
        "alpha3": "BLM",
        "CountryName": "Saint Barthélemy"
    },
    {
        "alpha2": "BY",
        "alpha3": "BLR",
        "CountryName": "Belarus"
    },
    {
        "alpha2": "BZ",
        "alpha3": "BLZ",
        "CountryName": "Belize"
    },
    {
        "alpha2": "BM",
        "alpha3": "BMU",
        "CountryName": "Bermuda"
    },
    {
        "alpha2": "BO",
        "alpha3": "BOL",
        "CountryName": "Bolivia"
    },
    {
        "alpha2": "BR",
        "alpha3": "BRA",
        "CountryName": "Brazil"
    },
    {
        "alpha2": "BB",
        "alpha3": "BRB",
        "CountryName": "Barbados"
    },
    {
        "alpha2": "BN",
        "alpha3": "BRN",
        "CountryName": "Brunei Darussalam"
    },
    {
        "alpha2": "BT",
        "alpha3": "BTN",
        "CountryName": "Bhutan"
    },
    {
        "alpha2": "BV",
        "alpha3": "BVT",
        "CountryName": "Bouvet Island"
    },
    {
        "alpha2": "BW",
        "alpha3": "BWA",
        "CountryName": "Botswana"
    },
    {
        "alpha2": "CF",
        "alpha3": "CAF",
        "CountryName": "Central African Republic"
    },
    {
        "alpha2": "CA",
        "alpha3": "CAN",
        "CountryName": "Canada"
    },
    {
        "alpha2": "CC",
        "alpha3": "CCK",
        "CountryName": "Cocos (Keeling) Islands"
    },
    {
        "alpha2": "CH",
        "alpha3": "CHE",
        "CountryName": "Switzerland"
    },
    {
        "alpha2": "CL",
        "alpha3": "CHL",
        "CountryName": "Chile"
    },
    {
        "alpha2": "CN",
        "alpha3": "CHN",
        "CountryName": "China"
    },
    {
        "alpha2": "CI",
        "alpha3": "CIV",
        "CountryName": "Côte d'Ivoire"
    },
    {
        "alpha2": "CM",
        "alpha3": "CMR",
        "CountryName": "Cameroon"
    },
    {
        "alpha2": "CD",
        "alpha3": "COD",
        "CountryName": "Congo"
    },
    {
        "alpha2": "CG",
        "alpha3": "COG",
        "CountryName": "Congo"
    },
    {
        "alpha2": "CK",
        "alpha3": "COK",
        "CountryName": "Cook Islands"
    },
    {
        "alpha2": "CO",
        "alpha3": "COL",
        "CountryName": "Colombia"
    },
    {
        "alpha2": "KM",
        "alpha3": "COM",
        "CountryName": "Comoros"
    },
    {
        "alpha2": "CV",
        "alpha3": "CPV",
        "CountryName": "Cape Verde"
    },
    {
        "alpha2": "CR",
        "alpha3": "CRI",
        "CountryName": "Costa Rica"
    },
    {
        "alpha2": "CU",
        "alpha3": "CUB",
        "CountryName": "Cuba"
    },
    {
        "alpha2": "CW",
        "alpha3": "CUW",
        "CountryName": "Curaçao"
    },
    {
        "alpha2": "CX",
        "alpha3": "CXR",
        "CountryName": "Christmas Island"
    },
    {
        "alpha2": "KY",
        "alpha3": "CYM",
        "CountryName": "Cayman Islands"
    },
    {
        "alpha2": "CY",
        "alpha3": "CYP",
        "CountryName": "Cyprus"
    },
    {
        "alpha2": "CZ",
        "alpha3": "CZE",
        "CountryName": "Czech Republic"
    },
    {
        "alpha2": "DE",
        "alpha3": "DEU",
        "CountryName": "Germany"
    },
    {
        "alpha2": "DJ",
        "alpha3": "DJI",
        "CountryName": "Djibouti"
    },
    {
        "alpha2": "DM",
        "alpha3": "DMA",
        "CountryName": "Dominica"
    },
    {
        "alpha2": "DK",
        "alpha3": "DNK",
        "CountryName": "Denmark"
    },
    {
        "alpha2": "DO",
        "alpha3": "DOM",
        "CountryName": "Dominican Republic"
    },
    {
        "alpha2": "DZ",
        "alpha3": "DZA",
        "CountryName": "Algeria"
    },
    {
        "alpha2": "EC",
        "alpha3": "ECU",
        "CountryName": "Ecuador"
    },
    {
        "alpha2": "EG",
        "alpha3": "EGY",
        "CountryName": "Egypt"
    },
    {
        "alpha2": "ER",
        "alpha3": "ERI",
        "CountryName": "Eritrea"
    },
    {
        "alpha2": "EH",
        "alpha3": "ESH",
        "CountryName": "Western Sahara"
    },
    {
        "alpha2": "ES",
        "alpha3": "ESP",
        "CountryName": "Spain"
    },
    {
        "alpha2": "EE",
        "alpha3": "EST",
        "CountryName": "Estonia"
    },
    {
        "alpha2": "ET",
        "alpha3": "ETH",
        "CountryName": "Ethiopia"
    },
    {
        "alpha2": "FI",
        "alpha3": "FIN",
        "CountryName": "Finland"
    },
    {
        "alpha2": "FJ",
        "alpha3": "FJI",
        "CountryName": "Fiji"
    },
    {
        "alpha2": "FK",
        "alpha3": "FLK",
        "CountryName": "Falkland Islands (Malvinas)"
    },
    {
        "alpha2": "FR",
        "alpha3": "FRA",
        "CountryName": "France"
    },
    {
        "alpha2": "FO",
        "alpha3": "FRO",
        "CountryName": "Faroe Islands"
    },
    {
        "alpha2": "FM",
        "alpha3": "FSM",
        "CountryName": "Micronesia"
    },
    {
        "alpha2": "FX",
        "alpha3": "FXX",
        "CountryName": "France"
    },
    {
        "alpha2": "GA",
        "alpha3": "GAB",
        "CountryName": "Gabon"
    },
    {
        "alpha2": "GB",
        "alpha3": "GBR",
        "CountryName": "United Kingdom"
    },
    {
        "alpha2": "GE",
        "alpha3": "GEO",
        "CountryName": "Georgia"
    },
    {
        "alpha2": "GG",
        "alpha3": "GGY",
        "CountryName": "Guernsey"
    },
    {
        "alpha2": "GH",
        "alpha3": "GHA",
        "CountryName": "Ghana"
    },
    {
        "alpha2": "GI",
        "alpha3": "GIB",
        "CountryName": "Gibraltar"
    },
    {
        "alpha2": "GN",
        "alpha3": "GIN",
        "CountryName": "Guinea"
    },
    {
        "alpha2": "GP",
        "alpha3": "GLP",
        "CountryName": "Guadeloupe"
    },
    {
        "alpha2": "GM",
        "alpha3": "GMB",
        "CountryName": "Gambia"
    },
    {
        "alpha2": "GW",
        "alpha3": "GNB",
        "CountryName": "Guinea-Bissau"
    },
    {
        "alpha2": "GQ",
        "alpha3": "GNQ",
        "CountryName": "Equatorial Guinea"
    },
    {
        "alpha2": "GR",
        "alpha3": "GRC",
        "CountryName": "Greece"
    },
    {
        "alpha2": "GD",
        "alpha3": "GRD",
        "CountryName": "Grenada"
    },
    {
        "alpha2": "GL",
        "alpha3": "GRL",
        "CountryName": "Greenland"
    },
    {
        "alpha2": "GT",
        "alpha3": "GTM",
        "CountryName": "Guatemala"
    },
    {
        "alpha2": "GF",
        "alpha3": "GUF",
        "CountryName": "French Guiana"
    },
    {
        "alpha2": "GU",
        "alpha3": "GUM",
        "CountryName": "Guam"
    },
    {
        "alpha2": "GY",
        "alpha3": "GUY",
        "CountryName": "Guyana"
    },
    {
        "alpha2": "HK",
        "alpha3": "HKG",
        "CountryName": "Hong Kong"
    },
    {
        "alpha2": "HM",
        "alpha3": "HMD",
        "CountryName": "Heard Island and McDonald Iss"
    },
    {
        "alpha2": "HN",
        "alpha3": "HND",
        "CountryName": "Honduras"
    },
    {
        "alpha2": "HR",
        "alpha3": "HRV",
        "CountryName": "Croatia"
    },
    {
        "alpha2": "HT",
        "alpha3": "HTI",
        "CountryName": "Haiti"
    },
    {
        "alpha2": "HU",
        "alpha3": "HUN",
        "CountryName": "Hungary"
    },
    {
        "alpha2": "ID",
        "alpha3": "IDN",
        "CountryName": "Indonesia"
    },
    {
        "alpha2": "IM",
        "alpha3": "IMN",
        "CountryName": "Isle of Man"
    },
    {
        "alpha2": "IN",
        "alpha3": "IND",
        "CountryName": "India"
    },
    {
        "alpha2": "IO",
        "alpha3": "IOT",
        "CountryName": "British Indian Ocean Territory"
    },
    {
        "alpha2": "IE",
        "alpha3": "IRL",
        "CountryName": "Ireland"
    },
    {
        "alpha2": "IR",
        "alpha3": "IRN",
        "CountryName": "Iran, Islamic Republic of"
    },
    {
        "alpha2": "IQ",
        "alpha3": "IRQ",
        "CountryName": "Iraq"
    },
    {
        "alpha2": "IS",
        "alpha3": "ISL",
        "CountryName": "Iceland"
    },
    {
        "alpha2": "IL",
        "alpha3": "ISR",
        "CountryName": "Israel"
    },
    {
        "alpha2": "IT",
        "alpha3": "ITA",
        "CountryName": "Italy"
    },
    {
        "alpha2": "JM",
        "alpha3": "JAM",
        "CountryName": "Jamaica"
    },
    {
        "alpha2": "JE",
        "alpha3": "JEY",
        "CountryName": "Jersey"
    },
    {
        "alpha2": "JO",
        "alpha3": "JOR",
        "CountryName": "Jordan"
    },
    {
        "alpha2": "JP",
        "alpha3": "JPN",
        "CountryName": "Japan"
    },
    {
        "alpha2": "KZ",
        "alpha3": "KAZ",
        "CountryName": "Kazakhstan"
    },
    {
        "alpha2": "KE",
        "alpha3": "KEN",
        "CountryName": "Kenya"
    },
    {
        "alpha2": "KG",
        "alpha3": "KGZ",
        "CountryName": "Kyrgyzstan"
    },
    {
        "alpha2": "KH",
        "alpha3": "KHM",
        "CountryName": "Cambodia"
    },
    {
        "alpha2": "KI",
        "alpha3": "KIR",
        "CountryName": "Kiribati"
    },
    {
        "alpha2": "KN",
        "alpha3": "KNA",
        "CountryName": "Saint Kitts and Nevis"
    },
    {
        "alpha2": "KR",
        "alpha3": "KOR",
        "CountryName": "Korea, Republic of"
    },
    {
        "alpha2": "KW",
        "alpha3": "KWT",
        "CountryName": "Kuwait"
    },
    {
        "alpha2": "LA",
        "alpha3": "LAO",
        "CountryName": "Lao People's Democratic Rep"
    },
    {
        "alpha2": "LB",
        "alpha3": "LBN",
        "CountryName": "Lebanon"
    },
    {
        "alpha2": "LR",
        "alpha3": "LBR",
        "CountryName": "Liberia"
    },
    {
        "alpha2": "LY",
        "alpha3": "LBY",
        "CountryName": "Libyan Arab Jamahiriya"
    },
    {
        "alpha2": "LC",
        "alpha3": "LCA",
        "CountryName": "Saint Lucia"
    },
    {
        "alpha2": "LI",
        "alpha3": "LIE",
        "CountryName": "Liechtenstein"
    },
    {
        "alpha2": "LK",
        "alpha3": "LKA",
        "CountryName": "Sri Lanka"
    },
    {
        "alpha2": "LS",
        "alpha3": "LSO",
        "CountryName": "Lesotho"
    },
    {
        "alpha2": "LT",
        "alpha3": "LTU",
        "CountryName": "Lithuania"
    },
    {
        "alpha2": "LU",
        "alpha3": "LUX",
        "CountryName": "Luxembourg"
    },
    {
        "alpha2": "LV",
        "alpha3": "LVA",
        "CountryName": "Latvia"
    },
    {
        "alpha2": "MO",
        "alpha3": "MAC",
        "CountryName": "Macao"
    },
    {
        "alpha2": "MF",
        "alpha3": "MAF",
        "CountryName": "Saint Martin"
    },
    {
        "alpha2": "MA",
        "alpha3": "MAR",
        "CountryName": "Morocco"
    },
    {
        "alpha2": "MC",
        "alpha3": "MCO",
        "CountryName": "Monaco"
    },
    {
        "alpha2": "MD",
        "alpha3": "MDA",
        "CountryName": "Moldova, Republic of"
    },
    {
        "alpha2": "MG",
        "alpha3": "MDG",
        "CountryName": "Madagascar"
    },
    {
        "alpha2": "MV",
        "alpha3": "MDV",
        "CountryName": "Maldives"
    },
    {
        "alpha2": "MX",
        "alpha3": "MEX",
        "CountryName": "Mexico"
    },
    {
        "alpha2": "MH",
        "alpha3": "MHL",
        "CountryName": "Marshall Islands"
    },
    {
        "alpha2": "MK",
        "alpha3": "MKD",
        "CountryName": "Macedonia"
    },
    {
        "alpha2": "ML",
        "alpha3": "MLI",
        "CountryName": "Mali"
    },
    {
        "alpha2": "MT",
        "alpha3": "MLT",
        "CountryName": "Malta"
    },
    {
        "alpha2": "MM",
        "alpha3": "MMR",
        "CountryName": "Myanmar"
    },
    {
        "alpha2": "ME",
        "alpha3": "MNE",
        "CountryName": "Montenegro"
    },
    {
        "alpha2": "MN",
        "alpha3": "MNG",
        "CountryName": "Mongolia"
    },
    {
        "alpha2": "MP",
        "alpha3": "MNP",
        "CountryName": "Northern Mariana Islands"
    },
    {
        "alpha2": "MZ",
        "alpha3": "MOZ",
        "CountryName": "Mozambique"
    },
    {
        "alpha2": "MR",
        "alpha3": "MRT",
        "CountryName": "Mauritania"
    },
    {
        "alpha2": "MS",
        "alpha3": "MSR",
        "CountryName": "Montserrat"
    },
    {
        "alpha2": "MQ",
        "alpha3": "MTQ",
        "CountryName": "Martinique"
    },
    {
        "alpha2": "MU",
        "alpha3": "MUS",
        "CountryName": "Mauritius"
    },
    {
        "alpha2": "MW",
        "alpha3": "MWI",
        "CountryName": "Malawi"
    },
    {
        "alpha2": "MY",
        "alpha3": "MYS",
        "CountryName": "Malaysia"
    },
    {
        "alpha2": "YT",
        "alpha3": "MYT",
        "CountryName": "Mayotte"
    },
    {
        "alpha2": "NA",
        "alpha3": "NAM",
        "CountryName": "Namibia"
    },
    {
        "alpha2": "NC",
        "alpha3": "NCL",
        "CountryName": "New Caledonia"
    },
    {
        "alpha2": "NE",
        "alpha3": "NER",
        "CountryName": "Niger"
    },
    {
        "alpha2": "NF",
        "alpha3": "NFK",
        "CountryName": "Norfolk Island"
    },
    {
        "alpha2": "NG",
        "alpha3": "NGA",
        "CountryName": "Nigeria"
    },
    {
        "alpha2": "NI",
        "alpha3": "NIC",
        "CountryName": "Nicaragua"
    },
    {
        "alpha2": "NU",
        "alpha3": "NIU",
        "CountryName": "Niue"
    },
    {
        "alpha2": "NL",
        "alpha3": "NLD",
        "CountryName": "Netherlands"
    },
    {
        "alpha2": "NO",
        "alpha3": "NOR",
        "CountryName": "Norway"
    },
    {
        "alpha2": "NP",
        "alpha3": "NPL",
        "CountryName": "Nepal"
    },
    {
        "alpha2": "NR",
        "alpha3": "NRU",
        "CountryName": "Nauru"
    },
    {
        "alpha2": "NZ",
        "alpha3": "NZL",
        "CountryName": "New Zealand"
    },
    {
        "alpha2": "OM",
        "alpha3": "OMN",
        "CountryName": "Oman"
    },
    {
        "alpha2": "PK",
        "alpha3": "PAK",
        "CountryName": "Pakistan"
    },
    {
        "alpha2": "PA",
        "alpha3": "PAN",
        "CountryName": "Panama"
    },
    {
        "alpha2": "PN",
        "alpha3": "PCN",
        "CountryName": "Pitcairn"
    },
    {
        "alpha2": "PE",
        "alpha3": "PER",
        "CountryName": "Peru"
    },
    {
        "alpha2": "PH",
        "alpha3": "PHL",
        "CountryName": "Philippines"
    },
    {
        "alpha2": "PW",
        "alpha3": "PLW",
        "CountryName": "Palau"
    },
    {
        "alpha2": "PG",
        "alpha3": "PNG",
        "CountryName": "Papua New Guinea"
    },
    {
        "alpha2": "PL",
        "alpha3": "POL",
        "CountryName": "Poland"
    },
    {
        "alpha2": "PR",
        "alpha3": "PRI",
        "CountryName": "Puerto Rico"
    },
    {
        "alpha2": "KP",
        "alpha3": "PRK",
        "CountryName": "Korea People's Democratic Rep"
    },
    {
        "alpha2": "PT",
        "alpha3": "PRT",
        "CountryName": "Portugal"
    },
    {
        "alpha2": "PY",
        "alpha3": "PRY",
        "CountryName": "Paraguay"
    },
    {
        "alpha2": "PS",
        "alpha3": "PSE",
        "CountryName": "Palestine"
    },
    {
        "alpha2": "PF",
        "alpha3": "PYF",
        "CountryName": "French Polynesia"
    },
    {
        "alpha2": "QA",
        "alpha3": "QAT",
        "CountryName": "Qatar"
    },
    {
        "alpha2": "RE",
        "alpha3": "REU",
        "CountryName": "Réunion"
    },
    {
        "alpha2": "RO",
        "alpha3": "ROU",
        "CountryName": "Romania"
    },
    {
        "alpha2": "RU",
        "alpha3": "RUS",
        "CountryName": "Russian Federation"
    },
    {
        "alpha2": "RW",
        "alpha3": "RWA",
        "CountryName": "Rwanda"
    },
    {
        "alpha2": "SA",
        "alpha3": "SAU",
        "CountryName": "Saudi Arabia"
    },
    {
        "alpha2": "SD",
        "alpha3": "SDN",
        "CountryName": "Sudan"
    },
    {
        "alpha2": "SN",
        "alpha3": "SEN",
        "CountryName": "Senegal"
    },
    {
        "alpha2": "SG",
        "alpha3": "SGP",
        "CountryName": "Singapore"
    },
    {
        "alpha2": "GS",
        "alpha3": "SGS",
        "CountryName": "So. Georgia & So. Sandwich Iss"
    },
    {
        "alpha2": "SH",
        "alpha3": "SHN",
        "CountryName": "Saint Helena"
    },
    {
        "alpha2": "SJ",
        "alpha3": "SJM",
        "CountryName": "Svalbard and Jan Mayen"
    },
    {
        "alpha2": "SB",
        "alpha3": "SLB",
        "CountryName": "Solomon Islands"
    },
    {
        "alpha2": "SL",
        "alpha3": "SLE",
        "CountryName": "Sierra Leone"
    },
    {
        "alpha2": "SV",
        "alpha3": "SLV",
        "CountryName": "El Salvador"
    },
    {
        "alpha2": "SM",
        "alpha3": "SMR",
        "CountryName": "San Marino"
    },
    {
        "alpha2": "SO",
        "alpha3": "SOM",
        "CountryName": "Somalia"
    },
    {
        "alpha2": "PM",
        "alpha3": "SPM",
        "CountryName": "Saint Pierre and Miquelon"
    },
    {
        "alpha2": "RS",
        "alpha3": "SRB",
        "CountryName": "Serbia"
    },
    {
        "alpha2": "SS",
        "alpha3": "SSD",
        "CountryName": "South Sudan"
    },
    {
        "alpha2": "ST",
        "alpha3": "STP",
        "CountryName": "Sao Tome and Principe"
    },
    {
        "alpha2": "SR",
        "alpha3": "SUR",
        "CountryName": "Suriname"
    },
    {
        "alpha2": "SK",
        "alpha3": "SVK",
        "CountryName": "Slovakia"
    },
    {
        "alpha2": "SI",
        "alpha3": "SVN",
        "CountryName": "Slovenia"
    },
    {
        "alpha2": "SE",
        "alpha3": "SWE",
        "CountryName": "Sweden"
    },
    {
        "alpha2": "SZ",
        "alpha3": "SWZ",
        "CountryName": "Swaziland"
    },
    {
        "alpha2": "SX",
        "alpha3": "SXM",
        "CountryName": "Sint Maarten"
    },
    {
        "alpha2": "SC",
        "alpha3": "SYC",
        "CountryName": "Seychelles"
    },
    {
        "alpha2": "SY",
        "alpha3": "SYR",
        "CountryName": "Syrian Arab Republic"
    },
    {
        "alpha2": "TC",
        "alpha3": "TCA",
        "CountryName": "Turks and Caicos Islands"
    },
    {
        "alpha2": "TD",
        "alpha3": "TCD",
        "CountryName": "Chad"
    },
    {
        "alpha2": "TG",
        "alpha3": "TGO",
        "CountryName": "Togo"
    },
    {
        "alpha2": "TH",
        "alpha3": "THA",
        "CountryName": "Thailand"
    },
    {
        "alpha2": "TJ",
        "alpha3": "TJK",
        "CountryName": "Tajikistan"
    },
    {
        "alpha2": "TK",
        "alpha3": "TKL",
        "CountryName": "Tokelau"
    },
    {
        "alpha2": "TM",
        "alpha3": "TKM",
        "CountryName": "Turkmenistan"
    },
    {
        "alpha2": "TL",
        "alpha3": "TLS",
        "CountryName": "Timor-Leste"
    },
    {
        "alpha2": "TP",
        "alpha3": "TMP",
        "CountryName": "East Timor"
    },
    {
        "alpha2": "TO",
        "alpha3": "TON",
        "CountryName": "Tonga"
    },
    {
        "alpha2": "TT",
        "alpha3": "TTO",
        "CountryName": "Trinidad and Tobago"
    },
    {
        "alpha2": "TN",
        "alpha3": "TUN",
        "CountryName": "Tunisia"
    },
    {
        "alpha2": "TR",
        "alpha3": "TUR",
        "CountryName": "Turkey"
    },
    {
        "alpha2": "TV",
        "alpha3": "TUV",
        "CountryName": "Tuvalu"
    },
    {
        "alpha2": "TW",
        "alpha3": "TWN",
        "CountryName": "Taiwan, Province of China"
    },
    {
        "alpha2": "TZ",
        "alpha3": "TZA",
        "CountryName": "Tanzania, United Republic of"
    },
    {
        "alpha2": "UG",
        "alpha3": "UGA",
        "CountryName": "Uganda"
    },
    {
        "alpha2": "UA",
        "alpha3": "UKR",
        "CountryName": "Ukraine"
    },
    {
        "alpha2": "UM",
        "alpha3": "UMI",
        "CountryName": "U.S. Minor Outlying Islands"
    },
    {
        "alpha2": "UY",
        "alpha3": "URY",
        "CountryName": "Uruguay"
    },
    {
        "alpha2": "US",
        "alpha3": "USA",
        "CountryName": "United States"
    },
    {
        "alpha2": "UZ",
        "alpha3": "UZB",
        "CountryName": "Uzbekistan"
    },
    {
        "alpha2": "VA",
        "alpha3": "VAT",
        "CountryName": "Holy See (Vatican City State)"
    },
    {
        "alpha2": "VC",
        "alpha3": "VCT",
        "CountryName": "St. Vincent and the Grenadines"
    },
    {
        "alpha2": "VE",
        "alpha3": "VEN",
        "CountryName": "Venezuela, Bolivarian Rep of"
    },
    {
        "alpha2": "VG",
        "alpha3": "VGB",
        "CountryName": "Virgin Islands, British"
    },
    {
        "alpha2": "VI",
        "alpha3": "VIR",
        "CountryName": "Virgin Islands, U.S."
    },
    {
        "alpha2": "VN",
        "alpha3": "VNM",
        "CountryName": "Viet Nam"
    },
    {
        "alpha2": "VU",
        "alpha3": "VUT",
        "CountryName": "Vanuatu"
    },
    {
        "alpha2": "WF",
        "alpha3": "WLF",
        "CountryName": "Wallis and Futuna"
    },
    {
        "alpha2": "WS",
        "alpha3": "WSM",
        "CountryName": "Samoa"
    },
    {
        "alpha2": "YE",
        "alpha3": "YEM",
        "CountryName": "Yemen"
    },
    {
        "alpha2": "YU",
        "alpha3": "YUG",
        "CountryName": "Yugoslavia"
    },
    {
        "alpha2": "ZA",
        "alpha3": "ZAF",
        "CountryName": "South Africa"
    },
    {
        "alpha2": "ZM",
        "alpha3": "ZMB",
        "CountryName": "Zambia"
    },
    {
        "alpha2": "ZW",
        "alpha3": "ZWE",
        "CountryName": "Zimbabwe"
    }
];
exports.countryCodes = countryCodes;
exports.sageCountryCode = (countryCode) => {
    const [country] = countryCodes.filter(cc => cc.alpha3 === countryCode || cc.alpha2 === countryCode);
    if (!country) {
        return countryCode;
    }
    return country.alpha3;
};
