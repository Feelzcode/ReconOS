/** Common Nigerian bank codes for treasury transfers (CBN / NIP). */
export type NigerianBank = {
  code: string;
  name: string;
  logo: string;
};

const LOGO = (slug: string) => `https://nigerianbanks.xyz/logo/${slug}.png`;
const DEFAULT_LOGO = LOGO('default-image');

export const NIGERIAN_BANKS: NigerianBank[] = [
  { code: '044', name: 'Access Bank', logo: LOGO('access-bank') },
  { code: '058', name: 'GTBank', logo: LOGO('guaranty-trust-bank') },
  { code: '033', name: 'UBA', logo: LOGO('united-bank-for-africa') },
  { code: '057', name: 'Zenith Bank', logo: LOGO('zenith-bank') },
  { code: '011', name: 'First Bank', logo: LOGO('first-bank-of-nigeria') },
  { code: '035', name: 'Wema Bank', logo: LOGO('wema-bank') },
  { code: '232', name: 'Sterling Bank', logo: LOGO('sterling-bank') },
  { code: '070', name: 'Fidelity Bank', logo: LOGO('fidelity-bank') },
  { code: '214', name: 'FCMB', logo: LOGO('first-city-monument-bank') },
  { code: '221', name: 'Stanbic IBTC', logo: LOGO('stanbic-ibtc-bank') },
  { code: '999992', name: 'OPay', logo: LOGO('paycom') },
  { code: '090405', name: 'Moniepoint MFB', logo: LOGO('moniepoint-mfb-ng') },
  { code: '50211', name: 'Kuda MFB', logo: LOGO('kuda-bank') },
  { code: '100033', name: 'PalmPay', logo: LOGO('palmpay') },
  { code: '50515', name: 'Moniepoint (50515)', logo: LOGO('moniepoint-mfb-ng') },
  { code: '999991', name: 'PalmPay (999991)', logo: LOGO('palmpay') },
  { code: '082', name: 'Keystone Bank', logo: LOGO('keystone-bank') },
  { code: '076', name: 'Polaris Bank', logo: LOGO('polaris-bank') },
  { code: '101', name: 'Providus Bank', logo: DEFAULT_LOGO },
  { code: '050', name: 'Ecobank Nigeria', logo: LOGO('ecobank-nigeria') },
  { code: '030', name: 'Heritage Bank', logo: LOGO('heritage-bank') },
  { code: '084', name: 'Unity Bank', logo: DEFAULT_LOGO },
  { code: '063', name: 'Access Bank (Diamond)', logo: LOGO('access-bank-diamond') },
  { code: '068', name: 'Standard Chartered', logo: LOGO('standard-chartered-bank') },
  { code: '023', name: 'Citibank Nigeria', logo: LOGO('citibank-nigeria') },
  { code: '000027', name: 'Globus Bank', logo: LOGO('globus-bank') },
  { code: '090267', name: 'Kuda (090267)', logo: LOGO('kuda-bank') },
  { code: '120001', name: '9PSB', logo: DEFAULT_LOGO },
  { code: '100039', name: 'Paycom (OPay alt)', logo: LOGO('paycom') },
];

export function bankNameForCode(code: string): string {
  return NIGERIAN_BANKS.find((b) => b.code === code)?.name ?? `Bank ${code}`;
}

export function bankForCode(code: string): NigerianBank | undefined {
  return NIGERIAN_BANKS.find((b) => b.code === code);
}
