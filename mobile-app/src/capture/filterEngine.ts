import { CaptureSource, matchingNotificationSource, matchingSmsSources } from './sourceMatcher';

export type FilterOutcome = 'DEPOSIT' | 'WITHDRAWAL' | 'NEEDS_REVIEW' | 'IGNORED';
export type FilterResult = { outcome: FilterOutcome; channelId: number | null; matchingChannelIds: number[]; amount: string | null; dedupeKey: string | null; reason?: string };
type FilterSource = CaptureSource & { deposit_keywords?: string[] | null; withdrawal_keywords?: string[] | null };
type CaptureApi = { post: <T>(path: string, body: unknown, key?: string) => Promise<T> };

export function normalizeDigits(value: string): string {
  return value.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, digit => {
    const code = digit.charCodeAt(0); return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

export function extractAmount(rawText: string): string | null {
  const normalized = normalizeDigits(rawText).replace(/\u066c/g, ',').replace(/\u066b/g, '.');
  const matches = normalized.match(/(?:\d{1,3}(?:[, ]\d{3})+|\d+)(?:\.\d{1,2})?/g);
  if (!matches?.length) return null;
  const token = matches[0].replace(/[ ,]/g, '');
  const [wholePart, fraction = ''] = token.split('.');
  const whole = wholePart.replace(/^0+(?=\d)/, '');
  if (!whole || !/^[0-9]+$/.test(whole) || !/^[0-9]{0,2}$/.test(fraction)) return null;
  const decimal = `${whole}.${fraction.padEnd(2, '0')}`;
  return decimal === '0.00' ? null : decimal;
}

function utf8Bytes(value: string): number[] {
  const encoded = unescape(encodeURIComponent(value));
  return Array.from(encoded, character => character.charCodeAt(0));
}

export function sha256Hex(text: string): string {
  const bytes = utf8Bytes(text); const bitLength = bytes.length * 8;
  bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
  const high = Math.floor(bitLength / 0x100000000); const low = bitLength >>> 0;
  bytes.push((high >>> 24)&255,(high >>> 16)&255,(high >>> 8)&255,high&255,(low >>> 24)&255,(low >>> 16)&255,(low >>> 8)&255,low&255);
  const k=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const r=(x:number,n:number)=>(x>>>n)|(x<<(32-n)); const w=new Array<number>(64);
  for(let o=0;o<bytes.length;o+=64){
    for(let i=0;i<16;i++){const j=o+i*4;w[i]=((bytes[j]<<24)|(bytes[j+1]<<16)|(bytes[j+2]<<8)|bytes[j+3])>>>0;}
    for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2],s0=r(x,7)^r(x,18)^(x>>>3),s1=r(y,17)^r(y,19)^(y>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0;}
    let [a,b,c,d,e,f,g,hh]=h;
    for(let i=0;i<64;i++){const s1=r(e,6)^r(e,11)^r(e,25),ch=(e&f)^(~e&g),t1=(hh+s1+ch+k[i]+w[i])>>>0,s0=r(a,2)^r(a,13)^r(a,22),maj=(a&b)^(a&c)^(b&c),t2=(s0+maj)>>>0;hh=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
    h[0]=(h[0]+a)>>>0;h[1]=(h[1]+b)>>>0;h[2]=(h[2]+c)>>>0;h[3]=(h[3]+d)>>>0;h[4]=(h[4]+e)>>>0;h[5]=(h[5]+f)>>>0;h[6]=(h[6]+g)>>>0;h[7]=(h[7]+hh)>>>0;
  }
  return h.map(value=>value.toString(16).padStart(8,'0')).join('');
}

export function buildDedupeKey(sender: string, amount: string | null, receivedAt: string, rawText: string): string {
  const date=new Date(receivedAt); const minute=Number.isNaN(date.getTime())?receivedAt.slice(0,16):date.toISOString().slice(0,16);
  return sha256Hex(`${sender.trim()}|${amount??''}|${minute.replace('T', ' ')}|${sha256Hex(rawText)}`);
}

export function isVerificationMessage(rawText: string): boolean {
  const normalized = normalizeDigits(rawText).normalize('NFKC').toLocaleLowerCase();
  const englishPattern = /\b(?:otp|one[\s-]?time\s+(?:password|passcode|code)|verification\s+(?:code|passcode|password)|security\s+(?:code|passcode)|login\s+(?:code|passcode)|reset\s+code|password\s+reset|forgot\s+password|passcode)\b/i;
  const shortCodePattern = /(?:\b(?:code|pin|passcode)\b|رمز|كود|رقم\s+(?:التحقق|التفعيل|الدخول))[^0-9]{0,24}\d{4,8}\b|\b\d{4,8}\b[^a-z0-9]{0,24}(?:\b(?:code|pin|passcode)\b|رمز|كود)/i;
  const arabicPhrases = [
    'رمز التحقق', 'كود التحقق', 'رمز التأكيد', 'كود التأكيد', 'رمز التاكيد', 'كود التاكيد',
    'رمز التفعيل', 'كود التفعيل', 'رمز الدخول', 'كود الدخول', 'رمز الأمان', 'كود الأمان',
    'رمز لمرة واحدة', 'كود لمرة واحدة', 'كلمة المرور المؤقتة', 'كلمة السر المؤقتة',
    'إعادة تعيين كلمة المرور', 'اعادة تعيين كلمة المرور', 'استعادة كلمة المرور',
    'نسيت كلمة المرور', 'رمزك هو', 'كودك هو',
  ];
  return englishPattern.test(normalized) || shortCodePattern.test(normalized) || arabicPhrases.some(phrase => normalized.includes(phrase));
}

export function classifyMessage(sources: FilterSource[], sender: string, rawText: string, receivedAt: string, sourceKind: 'sms'|'notification'='sms'): FilterResult {
  const matching = sourceKind === 'sms'
    ? matchingSmsSources(sources.filter(source=>source.source_kind==='sms'),sender) as FilterSource[]
    : [matchingNotificationSource(sources,sender)].filter(Boolean) as FilterSource[];
  if(!matching.length) return {outcome:'IGNORED',channelId:null,matchingChannelIds:[],amount:null,dedupeKey:null,reason:'sender_unmatched'};
  if (sourceKind === 'sms') {
    const ids=[...new Set(matching.map(source=>source.channel_id))];
    // Every SMS from the configured sender goes to the inbox for an explicit human decision.
    // Avoid pre-filling a likely verification code as a monetary amount.
    const amount=isVerificationMessage(rawText)?null:extractAmount(rawText);
    return review(ids[0],ids,amount,sender,receivedAt,rawText,ids.length>1?'sender_matches_multiple_channels':'manual_direction_required');
  }
  if (isVerificationMessage(rawText)) return {outcome:'IGNORED',channelId:null,matchingChannelIds:[],amount:null,dedupeKey:null,reason:'verification_message'};
  const body = rawText.trim().toLocaleLowerCase();
  const hasEnabledTransactionKeyword = matching.some(source =>
    (source.read_deposits && (source.deposit_keywords??[]).some(word=>word.trim()&&body.includes(word.trim().toLocaleLowerCase())))
    || (source.read_withdrawals && (source.withdrawal_keywords??[]).some(word=>word.trim()&&body.includes(word.trim().toLocaleLowerCase()))),
  );
  if (!hasEnabledTransactionKeyword) return {outcome:'IGNORED',channelId:null,matchingChannelIds:[],amount:null,dedupeKey:null,reason:'transaction_keyword_missing'};
  const ids=[...new Set(matching.map(source=>source.channel_id))]; const amount=extractAmount(rawText);
  if(ids.length>1) return review(ids[0],ids,amount,sender,receivedAt,rawText,'sender_matches_multiple_channels');
  const source=matching[0];
  const deposit=(source.deposit_keywords??[]).some(word=>word.trim()&&body.includes(word.trim().toLocaleLowerCase()));
  const withdrawal=(source.withdrawal_keywords??[]).some(word=>word.trim()&&body.includes(word.trim().toLocaleLowerCase()));
  if(!amount||deposit===withdrawal) return review(source.channel_id,ids,amount,sender,receivedAt,rawText,!amount?'amount_missing':'direction_ambiguous');
  if((deposit&&!source.read_deposits)||(withdrawal&&!source.read_withdrawals)) return {outcome:'IGNORED',channelId:null,matchingChannelIds:[],amount,dedupeKey:null,reason:'direction_disabled'};
  return {outcome:deposit?'DEPOSIT':'WITHDRAWAL',channelId:source.channel_id,matchingChannelIds:ids,amount,dedupeKey:buildDedupeKey(sender,amount,receivedAt,rawText)};
}
function review(channelId:number,ids:number[],amount:string|null,sender:string,receivedAt:string,rawText:string,reason:string):FilterResult{return {outcome:'NEEDS_REVIEW',channelId,matchingChannelIds:ids,amount,dedupeKey:buildDedupeKey(sender,amount,receivedAt,rawText),reason};}
export async function postCapturedMessage(api:CaptureApi,result:FilterResult,sender:string,rawText:string,receivedAt:string){
  if(result.outcome==='IGNORED'||!result.channelId||!result.dedupeKey)return null;
  return api.post('/mobile/messages/capture',{channel_id:result.channelId,amount:result.amount,raw_text:rawText,sender,received_at:receivedAt,dedupe_key:result.dedupeKey},result.dedupeKey);
}
