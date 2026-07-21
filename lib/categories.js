// Category catalogue for obligations. Colors are drawn from the app palette
// so every category reads as part of the same family, not a random rainbow.
export const CATEGORIES = {
  passport_id: {
    label: "Passport & ID",
    icon: "IdCard",
    color: "#7AE2CF",
  },
  insurance: {
    label: "Insurance",
    icon: "ShieldCheck",
    color: "#077A7D",
  },
  bills_fees: {
    label: "Bills & fees",
    icon: "Receipt",
    color: "#FDEB9E",
  },
  vehicle: {
    label: "Vehicle maintenance",
    icon: "Car",
    color: "#7AE2CF",
  },
  home_maintenance: {
    label: "Home maintenance",
    icon: "Home",
    color: "#077A7D",
  },
  software_security: {
    label: "Antivirus & software",
    icon: "MonitorCheck",
    color: "#FDEB9E",
  },
  other: {
    label: "Other",
    icon: "CircleDot",
    color: "#06202B",
  },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES);

export function categoryMeta(key) {
  return CATEGORIES[key] || CATEGORIES.other;
}
