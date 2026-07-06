export interface ProductSpec {
  label: string
  value: string
}

export interface ContainerLoad {
  container: string
  qty: number
}

export interface Product {
  id: string
  category: string
  name: string
  model: string
  description: string
  features: string[]
  specs: ProductSpec[]
  exwPrice: string
  moq: string
  containerLoads: ContainerLoad[]
  image?: string
}

export const PRODUCTS: Product[] = [
  // ── ACDC Solar Air Conditioners ──
  {
    id: "acdc-9k",
    category: "ACDC Solar Air Conditioner",
    name: "9,000 BTU ACDC Hybrid Solar AC",
    model: "UNI-AC09-ACDC",
    description: "Entry-level solar hybrid air conditioner, perfect for small rooms and cabins. Operates on both solar and grid power with zero export capability.",
    features: [
      "AC/DC hybrid — runs directly on solar panels",
      "208-230V / 50-60Hz, plug & play for US market",
      "T3 rated — operates in extreme heat up to 56°C (132°F)",
      "Built-in WiFi for remote monitoring",
      "Zero export to grid, saves electricity bills",
    ],
    specs: [
      { label: "Cooling Capacity", value: "9,000 BTU (2.6 kW)" },
      { label: "Power Input", value: "208-230V / 50-60Hz" },
      { label: "Solar Input", value: "150-400V DC" },
      { label: "EER", value: "3.5 (Cooling)" },
      { label: "Max Ambient", value: "56°C (T3)" },
      { label: "Refrigerant", value: "R32" },
      { label: "WiFi", value: "Built-in" },
    ],
    exwPrice: "$387",
    moq: "10 units",
    containerLoads: [
      { container: "20GP", qty: 72 },
      { container: "40GP", qty: 156 },
      { container: "40HQ", qty: 186 },
    ],
  },
  {
    id: "acdc-12k",
    category: "ACDC Solar Air Conditioner",
    name: "12,000 BTU ACDC Hybrid Solar AC",
    model: "UNI-AC12-ACDC",
    description: "Mid-range solar hybrid AC for standard bedrooms and small offices. Excellent energy savings with smart hybrid power management.",
    features: [
      "AC/DC hybrid with intelligent power switching",
      "208-230V / 50-60Hz, US standard compatible",
      "T3 rated — reliable in extreme climates",
      "WiFi smart control via mobile app",
      "Low power consumption, high efficiency",
    ],
    specs: [
      { label: "Cooling Capacity", value: "12,000 BTU (3.5 kW)" },
      { label: "Power Input", value: "208-230V / 50-60Hz" },
      { label: "Solar Input", value: "150-400V DC" },
      { label: "EER", value: "3.6 (Cooling)" },
      { label: "Max Ambient", value: "56°C (T3)" },
      { label: "Refrigerant", value: "R32" },
      { label: "WiFi", value: "Built-in" },
    ],
    exwPrice: "$467",
    moq: "10 units",
    containerLoads: [
      { container: "20GP", qty: 56 },
      { container: "40GP", qty: 120 },
      { container: "40HQ", qty: 144 },
    ],
  },
  {
    id: "acdc-18k",
    category: "ACDC Solar Air Conditioner",
    name: "18,000 BTU ACDC Hybrid Solar AC",
    model: "UNI-AC18-ACDC",
    description: "High-power solar hybrid AC for living rooms and small commercial spaces. Exceptional cooling with maximum solar utilization.",
    features: [
      "AC/DC hybrid — high efficiency cooling",
      "208-230V / 50-60Hz, US market ready",
      "Extreme temperature operation (56°C)",
      "Smart WiFi control with energy monitoring",
      "Ideal for residential and light commercial",
    ],
    specs: [
      { label: "Cooling Capacity", value: "18,000 BTU (5.3 kW)" },
      { label: "Power Input", value: "208-230V / 50-60Hz" },
      { label: "Solar Input", value: "150-400V DC" },
      { label: "EER", value: "3.4 (Cooling)" },
      { label: "Max Ambient", value: "56°C (T3)" },
      { label: "Refrigerant", value: "R32" },
      { label: "WiFi", value: "Built-in" },
    ],
    exwPrice: "$579",
    moq: "10 units",
    containerLoads: [
      { container: "20GP", qty: 40 },
      { container: "40GP", qty: 88 },
      { container: "40HQ", qty: 108 },
    ],
  },
  {
    id: "acdc-24k",
    category: "ACDC Solar Air Conditioner",
    name: "24,000 BTU ACDC Hybrid Solar AC",
    model: "UNI-AC24-ACDC",
    description: "The flagship solar hybrid AC for large spaces and commercial use. Maximum cooling power with advanced hybrid inverter technology.",
    features: [
      "AC/DC hybrid inverter — highest efficiency",
      "208-230V / 50-60Hz, heavy-duty US spec",
      "56°C extreme temperature performance",
      "WiFi smart control + energy analytics",
      "Perfect for large rooms, open plans, and commercial",
    ],
    specs: [
      { label: "Cooling Capacity", value: "24,000 BTU (7.0 kW)" },
      { label: "Power Input", value: "208-230V / 50-60Hz" },
      { label: "Solar Input", value: "150-400V DC" },
      { label: "EER", value: "3.3 (Cooling)" },
      { label: "Max Ambient", value: "56°C (T3)" },
      { label: "Refrigerant", value: "R32" },
      { label: "WiFi", value: "Built-in" },
    ],
    exwPrice: "$691",
    moq: "10 units",
    containerLoads: [
      { container: "20GP", qty: 32 },
      { container: "40GP", qty: 72 },
      { container: "40HQ", qty: 88 },
    ],
  },

  // ── Solar Water Heaters ──
  {
    id: "pvswh-60l",
    category: "Hybrid Pressurized Water Heater",
    name: "60L PVSWH Hybrid Solar Water Heater",
    model: "UNI-PVSWH-60",
    description: "Compact pressurized solar water heater for small families. Hybrid electric backup ensures hot water even on cloudy days.",
    features: [
      "Pressurized system — constant water pressure",
      "Hybrid: solar + electric backup (1.5kW)",
      "CE certified, high-quality insulation",
      "Anti-freeze protection for cold climates",
      "Easy installation, low maintenance",
    ],
    specs: [
      { label: "Tank Volume", value: "60 Liters" },
      { label: "Pressure", value: "0.6 MPa (6 bar)" },
      { label: "Heat Exchanger", value: "Copper coil" },
      { label: "Backup", value: "1.5 kW Electric" },
      { label: "Insulation", value: "55mm Polyurethane" },
      { label: "Certification", value: "CE, Solar Keymark" },
    ],
    exwPrice: "$131",
    moq: "20 units",
    containerLoads: [
      { container: "20GP", qty: 84 },
      { container: "40GP", qty: 176 },
      { container: "40HQ", qty: 210 },
    ],
  },
  {
    id: "pvswh-80l",
    category: "Hybrid Pressurized Water Heater",
    name: "80L PVSWH Hybrid Solar Water Heater",
    model: "UNI-PVSWH-80",
    description: "Mid-size pressurized hybrid solar water heater for standard family homes. Perfect balance of capacity and efficiency.",
    features: [
      "Pressurized — consistent output pressure",
      "Solar + 1.5kW electric hybrid backup",
      "CE certified with superior insulation",
      "Suitable for 2-3 person households",
      "Durable stainless steel inner tank",
    ],
    specs: [
      { label: "Tank Volume", value: "80 Liters" },
      { label: "Pressure", value: "0.6 MPa (6 bar)" },
      { label: "Heat Exchanger", value: "Copper coil" },
      { label: "Backup", value: "1.5 kW Electric" },
      { label: "Insulation", value: "55mm Polyurethane" },
      { label: "Certification", value: "CE, Solar Keymark" },
    ],
    exwPrice: "$141",
    moq: "20 units",
    containerLoads: [
      { container: "20GP", qty: 64 },
      { container: "40GP", qty: 138 },
      { container: "40HQ", qty: 168 },
    ],
  },
  {
    id: "pvswh-100l",
    category: "Hybrid Pressurized Water Heater",
    name: "100L PVSWH Hybrid Solar Water Heater",
    model: "UNI-PVSWH-100",
    description: "Large capacity pressurized solar water heater for families. Ample hot water supply with efficient hybrid operation.",
    features: [
      "Large capacity pressurized system",
      "Solar + 2.0kW electric hybrid backup",
      "Premium insulation for heat retention",
      "Suitable for 3-4 person households",
      "High quality connections and fittings",
    ],
    specs: [
      { label: "Tank Volume", value: "100 Liters" },
      { label: "Pressure", value: "0.6 MPa (6 bar)" },
      { label: "Heat Exchanger", value: "Copper coil" },
      { label: "Backup", value: "2.0 kW Electric" },
      { label: "Insulation", value: "55mm Polyurethane" },
      { label: "Certification", value: "CE, Solar Keymark" },
    ],
    exwPrice: "$149",
    moq: "20 units",
    containerLoads: [
      { container: "20GP", qty: 48 },
      { container: "40GP", qty: 104 },
      { container: "40HQ", qty: 126 },
    ],
  },
  {
    id: "s02-100l",
    category: "Non-Pressurized Water Heater",
    name: "100L S02 Non-Pressurized Solar Water Heater",
    model: "UNI-S02-100",
    description: "Cost-effective non-pressurized solar water heater. Ideal for off-grid cabins, RVs, and budget-conscious installations.",
    features: [
      "Non-pressurized — simple and reliable",
      "Stainless steel tank (SUS304-2B)",
      "CE certified, basic solar thermal system",
      "Perfect for off-grid and rural applications",
      "Very competitive pricing",
    ],
    specs: [
      { label: "Tank Volume", value: "100 Liters" },
      { label: "Material", value: "SUS304-2B Stainless" },
      { label: "Vacuum Tubes", value: "15 tubes x 58mm" },
      { label: "Insulation", value: "50mm Polyurethane" },
      { label: "Certification", value: "CE" },
    ],
    exwPrice: "$58",
    moq: "30 units",
    containerLoads: [
      { container: "20GP", qty: 96 },
      { container: "40GP", qty: 216 },
      { container: "40HQ", qty: 252 },
    ],
  },
]

export const CATEGORIES = [
  { key: "ACDC Solar Air Conditioner", label: "Solar Air Conditioners", icon: "❄️" },
  { key: "Hybrid Pressurized Water Heater", label: "Pressurized Water Heaters", icon: "🔥" },
  { key: "Non-Pressurized Water Heater", label: "Non-Pressurized Water Heaters", icon: "☀️" },
]
