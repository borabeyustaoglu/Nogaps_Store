export interface CategorySpecField {
  key: string;
  label: string;
  options: string[];
}

export interface CategorySpecDefinition {
  categoryName: string;
  fields: CategorySpecField[];
}

export const CATEGORY_SPEC_DEFINITIONS: CategorySpecDefinition[] = [
  {
    categoryName: 'Mouse',
    fields: [
      { key: 'dpi', label: 'DPI', options: ['8000', '12000', '16000', '26000'] },
      { key: 'sensor', label: 'Sensor', options: ['Optical', 'PWM3395', 'HERO 2'] },
      { key: 'weight_g', label: 'Weight (g)', options: ['58', '63', '69', '74'] },
      { key: 'connection', label: 'Connection', options: ['Wired', 'Wireless', 'Hybrid'] },
      { key: 'buttons', label: 'Buttons', options: ['5', '6', '7', '8'] },
    ],
  },
  {
    categoryName: 'Klavye',
    fields: [
      { key: 'switch_type', label: 'Switch Type', options: ['Red', 'Brown', 'Blue', 'Optical'] },
      { key: 'layout', label: 'Layout', options: ['TKL', '75%', '96%', 'Full Size'] },
      { key: 'key_count', label: 'Key Count', options: ['84', '87', '96', '104'] },
      { key: 'backlight', label: 'Backlight', options: ['RGB', 'White', 'None'] },
      { key: 'connection', label: 'Connection', options: ['USB-C', 'Wireless', 'Hybrid'] },
    ],
  },
  {
    categoryName: 'Kulaklik',
    fields: [
      { key: 'driver_mm', label: 'Driver (mm)', options: ['40', '50', '53'] },
      { key: 'impedance_ohm', label: 'Impedance (ohm)', options: ['32', '45', '60'] },
      {
        key: 'microphone',
        label: 'Microphone',
        options: ['Integrated', 'Detachable', 'Noise Cancelling'],
      },
      { key: 'connection', label: 'Connection', options: ['3.5mm', 'USB', 'Wireless'] },
      { key: 'weight_g', label: 'Weight (g)', options: ['240', '280', '320'] },
    ],
  },
  {
    categoryName: 'Ekran',
    fields: [
      { key: 'inch', label: 'Screen Size (inch)', options: ['24', '27', '31.5', '34'] },
      { key: 'refresh_hz', label: 'Refresh Rate (Hz)', options: ['144', '165', '240', '360'] },
      { key: 'panel', label: 'Panel Type', options: ['IPS', 'VA', 'OLED'] },
      {
        key: 'resolution',
        label: 'Resolution',
        options: ['1920x1080', '2560x1440', '3440x1440', '3840x2160'],
      },
      { key: 'weight_kg', label: 'Weight (kg)', options: ['3.6', '4.8', '6.2', '7.5'] },
    ],
  },
  {
    categoryName: 'Kasa',
    fields: [
      { key: 'form_factor', label: 'Form Factor', options: ['Mini ITX', 'Mid Tower', 'Full Tower'] },
      {
        key: 'motherboard_support',
        label: 'Motherboard Support',
        options: ['ATX', 'mATX', 'Mini-ITX', 'E-ATX'],
      },
      { key: 'fan_slots', label: 'Fan Slots', options: ['4', '6', '8', '10'] },
      { key: 'max_gpu_mm', label: 'Max GPU Length (mm)', options: ['320', '360', '400'] },
      {
        key: 'material',
        label: 'Material',
        options: ['Mesh + Steel', 'Aluminum + Tempered', 'Steel + Tempered'],
      },
    ],
  },
  {
    categoryName: 'Kasa Icerikleri',
    fields: [
      { key: 'ram_gb', label: 'RAM (GB)', options: ['16', '32', '64'] },
      { key: 'ssd_gb', label: 'SSD (GB)', options: ['512', '1000', '2000'] },
      {
        key: 'cpu_model',
        label: 'CPU',
        options: ['Ryzen 5 7600', 'Ryzen 7 7800X3D', 'Core i7 14700K'],
      },
      { key: 'gpu_model', label: 'GPU', options: ['RTX 4070 Super', 'RTX 4080', 'RX 7900 XT'] },
      { key: 'psu_w', label: 'PSU (W)', options: ['650', '750', '850', '1000'] },
    ],
  },
];

export const getCategorySpecDefinition = (categoryName: string) =>
  CATEGORY_SPEC_DEFINITIONS.find((item) => item.categoryName === categoryName);
