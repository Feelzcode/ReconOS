/** NIBSS NQR / EMVCo TLV payload for Nigerian bank-transfer QR codes. */

const NIBSS_GUID = 'A000000727';

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return id + len + value;
}

function crc16ccitt(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

const BANK_CODES: Record<string, string> = {
  'wema bank': '035',
  'wema': '035',
  'gtbank': '058',
  'guaranty trust bank': '058',
  'access bank': '044',
  'zenith bank': '057',
  'first bank': '011',
  'uba': '033',
  'united bank for africa': '033',
  'fidelity bank': '070',
  'sterling bank': '232',
  'fcmb': '214',
  'nombank mfb': '090645',
  'nomba mfb': '090645',
};

export function bankCodeFromName(bankName: string | null | undefined): string {
  if (!bankName?.trim()) return '035';
  const key = bankName.trim().toLowerCase();
  if (BANK_CODES[key]) return BANK_CODES[key];
  for (const [name, code] of Object.entries(BANK_CODES)) {
    if (key.includes(name) || name.includes(key)) return code;
  }
  return '035';
}

export function buildNqrTransferPayload(input: {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  amount?: number;
  reference?: string;
}): string {
  const account = input.accountNumber.replace(/\D/g, '');
  const bankCode = input.bankCode.replace(/\D/g, '');
  const name = input.accountName.trim().slice(0, 25);
  const hasAmount = input.amount != null && input.amount > 0;

  const merchantAccount = tlv('00', NIBSS_GUID) + tlv('01', bankCode) + tlv('02', account);

  let payload = tlv('00', '01');
  payload += tlv('01', hasAmount ? '12' : '11');
  payload += tlv('26', merchantAccount);

  if (hasAmount) {
    payload += tlv('54', input.amount!.toFixed(2));
  }

  payload += tlv('58', 'NG');
  payload += tlv('59', name || 'Payment');
  payload += tlv('60', 'Lagos');

  if (input.reference?.trim()) {
    payload += tlv('62', tlv('05', input.reference.trim().slice(0, 25)));
  }

  payload += '6304';
  return payload + crc16ccitt(payload);
}
