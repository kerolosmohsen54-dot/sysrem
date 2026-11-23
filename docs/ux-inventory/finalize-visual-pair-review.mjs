import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, access } from 'node:fs/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const csvPath = path.join(root, 'docs/ux-inventory/VISUAL_PAIR_REVIEW.csv');
const screenIds = {
  collections: 'SCR-009', containers: 'SCR-018', customers: 'SCR-002', dashboard: 'SCR-001',
  deliveries: 'SCR-010', 'delivery-create': 'SCR-011', finance: 'SCR-017', 'inventory-summary': 'SCR-015',
  'invoice-create': 'SCR-007', 'invoice-print': 'SCR-008', invoices: 'SCR-006', movements: 'SCR-016',
  'order-create': 'SCR-004', 'order-detail': 'SCR-005', orders: 'SCR-003', products: 'SCR-014',
  reports: 'SCR-019', 'reports-financial': 'SCR-025', 'reports-inventory': 'SCR-024',
  'reports-profit': 'SCR-021', 'reports-sales': 'SCR-020', 'return-create': 'SCR-013', returns: 'SCR-012',
  users: 'SCR-022', warehouses: 'SCR-023', login: 'SCR-000',
};
const findings = {
  collections: ['GAP-0040', 'تسلسل المرجع: مؤشرات التحصيل ثم المستحقات والدفعات؛ النظام يبدأ بالبحث/التاريخ وجدول الفواتير. اختلاف بيانات الاختبار مستبعد من المقارنة.'],
  containers: ['GAP-0037', 'المرجع يعرض قائمة مباشرة ومختصرة؛ النظام يضع مرشحات أكبر ويحوّل الصفوف إلى بطاقات أطول على الهاتف.'],
  customers: ['GAP-0036', 'لوحة المرشحات والجدول أعرض في النظام؛ على الهاتف تتحول الصفوف إلى بطاقات طويلة بدل كثافة جدول المرجع.'],
  dashboard: ['GAP-0031; GAP-0027', 'بنية لوحة المؤشرات والرسوم وترتيبها تختلف؛ بيانات الأرقام غير موحّدة، واختلاف شريط تنقل الهاتف موثق منفصلًا.'],
  deliveries: ['GAP-0041', 'شبكة المؤشرات وإجراءات المرجع لا تظهر بنفس الترتيب؛ حالة القائمة الفارغة في التطبيق تأخذ مساحة أكبر.'],
  'delivery-create': ['GAP-0042', 'المرجع يوزع الحقول في عمودين ويعرض الأصناف؛ النظام يكدس الأقسام والحقول رأسيًا.'],
  finance: ['GAP-0029', 'ترتيب أقسام المالية وبطاقاتها يختلف عن تسلسل المرجع؛ لا تُقارن الأرصدة بسبب اختلاف fixtures.'],
  'inventory-summary': ['GAP-0045', 'النظام يضيف بحثًا وترتيبًا ومرشحات بارزة قبل المحتوى؛ المرجع يبدأ بملخص المخزون وبنية أقصر.'],
  'invoice-create': ['GAP-0034', 'شريط الإجراءات ونوع العملية وأقسام العميل والفاتورة تتراكم رأسيًا في النظام بدل التوزيع المرجعي.'],
  'invoice-print': ['GAP-0052', 'توزيع الورقة ومواضع بيانات المستند والعلامة المائية تختلف؛ اختلاف سجلات الفاتورة يمنع التحقق من المحتوى والأرقام.'],
  invoices: ['GAP-0033', 'تكوين ملخصات الفواتير والمرشحات والجدول يختلف بصريًا؛ أعداد الصفوف والقيم مستبعدة لاختلاف البيانات.'],
  movements: ['GAP-0046', 'النظام يعرض لوحة مرشحات متعددة الحقول؛ المرجع يقدّم حالات الحركة والسجل بكثافة أكبر.'],
  'order-create': ['GAP-0030', 'ترتيب مجموعات حقول الطلب والملخص مختلف؛ التطبيق يطيل النموذج رأسيًا قبل إظهار الأصناف.'],
  'order-detail': ['GAP-0053', 'الصورة تعرض حالة تحقق/تحميل بدل التفاصيل، لكن الالتقاط انتظر 350ms فقط وسجل الطلب غير موحد؛ النتيجة غير محسومة.'],
  orders: ['GAP-0032', 'صف البحث والمرشحات والجدول وترقيم الصفحات أكثر اتساعًا من بنية المرجع؛ القيم والصفوف مستبعدة.'],
  products: ['GAP-0038', 'النظام يعرض مرشحات وأعمدة أكثر وبطاقات طويلة على الهاتف مقابل جدول المرجع؛ قيم الأصناف ليست fixture مشتركة.'],
  reports: ['GAP-0039', 'المرجع يستخدم شبكة بطاقات تقارير، بينما النظام يعرض قائمة مجموعات رأسية أطول.'],
  'reports-financial': ['GAP-0044', 'لقطة النظام تعرض خطأ/إعادة محاولة؛ لا توجد لقطة ناجحة بنفس fixture، لذلك لا يُحكم على محتوى الصفحة.'],
  'reports-inventory': ['GAP-0047', 'المرجع يعرض مؤشرات وملخصًا وجدولًا؛ النظام يعرض البحث/المرشحات وقائمة تفاصيل. لا تُقارن أرقام المخزون لاختلاف البيانات.'],
  'reports-profit': ['GAP-0048', 'المرجع يعرض مؤشرات ومخططات تحليلية؛ لقطة النظام تعرض نطاق تاريخ وحالة بلا بيانات. القيم غير قابلة للمقارنة.'],
  'reports-sales': ['GAP-0049', 'المرجع يجمع الفلاتر والمؤشرات والمخطط والجداول؛ النظام يعرض بحثًا وتاريخًا وقائمة فواتير.'],
  'return-create': ['GAP-0050', 'ترتيب أقسام مصدر المرتجع والعميل والبنود وتوزيع النموذج مختلف عن المرجع.'],
  returns: ['GAP-0035', 'حالة القائمة الفارغة في النظام أكبر بصريًا من الجدول وزر الإنشاء في المرجع؛ Screen ID المعتمد SCR-012.'],
  users: ['GAP-0051', 'المرجع يعرض قائمة مستخدمين وصلاحيات؛ لقطة النظام تركز على نموذج/بطاقة تفاصيل. قيم المستخدمين غير موحدة.'],
  warehouses: ['GAP-0043', 'النظام يضيف لوحة بحث/ترتيب وجدولًا أكثر اتساعًا بدل القائمة المباشرة المختصرة في المرجع.'],
};

function parseCsv(text) {
  const rows=[]; let row=[], field='', quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i]; if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}else if(c==='"')quoted=true;else if(c===','){row.push(field);field='';}else if(c==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}else field+=c;}
  if(field.length||row.length){row.push(field.replace(/\r$/,''));rows.push(row);} const [headers,...data]=rows;
  return data.filter(r=>r.length).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
}
const cell=v=>`"${String(v??'').replaceAll('"','""')}"`;
const serialize=(rows,headers)=>[headers,...rows.map(row=>headers.map(h=>row[h]??''))].map(r=>r.map(cell).join(',')).join('\r\n')+'\r\n';
const rows=parseCsv(await readFile(csvPath,'utf8'));
const statusFor = slug => slug==='order-detail'||slug==='reports-financial' ? 'NOT_VERIFIED_STATE_OR_DATA' : 'CONFIRMED_VISUAL_DIFFERENCE';
for(const row of rows){
  const file=path.basename(row.Reference);
  const slug=file.match(/^(.*)-\d+\.png$/)?.[1]??(file.startsWith('login-')?'login':'');
  row.Slug=slug;
  row['Screen ID']=screenIds[slug]??'UNKNOWN';
  const finding=findings[slug];
  if(finding){row['Gap IDs']=finding[0];row.Observation=finding[1];}
  row.Status='REVIEWED_MANUAL_PAIR';
  row['Visual Result']=statusFor(slug);
  if(row['Review Method']?.includes('Full-size')) row['Review Method']='Full-size matched-viewport side-by-side visual inspection; no pixel-diff values inferred.';
  else row['Review Method']='Matched viewport image pair inspected in a 2x2 contact sheet; detailed pixel measurement not performed.';
  row.Confidence=statusFor(slug)==='CONFIRMED_VISUAL_DIFFERENCE'?'High for layout/composition; fixture values excluded.':'Not Verified: capture state or records are not comparable.';
}
const added=[];
for(const viewport of ['1280','768','390']){
  const screen=`docs/ux-inventory/screenshots/reference/states/interaction-global-search-invoice-create-${viewport}.png`;
  const system=`docs/ux-inventory/screenshots/system-mock/react/states/interaction-global-search-invoice-create-${viewport}.png`;
  const evidence=`docs/ux-inventory/screenshots/system-mock/state-comparisons/global-search-${viewport}-side-by-side.png`;
  added.push({Slug:'state-global-search','Screen ID':'SCR-007',Viewport:viewport,Status:'REVIEWED_MANUAL_PAIR','Visual Result':'CONFIRMED_VISUAL_DIFFERENCE',Reference:screen,System:system,Diff:'',Evidence:evidence,Observation:viewport==='768'?'المرجع يفتح قائمة البحث قرب شريط الرأس؛ التطبيق يعرض نافذة بحث مركزية مع طبقة تعتيم. الخلفية هي صفحة إنشاء فاتورة في الطرفين.':'المرجع يفتح قائمة بحث ضيقة متصلة بشريط الرأس؛ التطبيق يفتح نافذة مركزية أعرض وتعتيمًا يغطي بقية الصفحة.', 'Gap IDs':'GAP-0054','Review Method':'Control opened by click in each product at the same route and viewport; matched screenshots inspected side by side.','Confidence':'High for overlay geometry; dynamic search results not compared.'});
}
for(const viewport of ['1280','768','390']){
  added.push({Slug:'state-notifications','Screen ID':'SCR-007',Viewport:viewport,Status:'REVIEWED_MANUAL_PAIR','Visual Result':'NOT_VERIFIED_FIXTURE_MISMATCH',Reference:`docs/ux-inventory/screenshots/reference/states/interaction-notifications-invoice-create-${viewport}.png`,System:`docs/ux-inventory/screenshots/system-mock/react/states/interaction-notifications-invoice-create-${viewport}.png`,Diff:'',Evidence:`docs/ux-inventory/screenshots/system-mock/state-comparisons/notifications-${viewport}-side-by-side.png`,Observation:'تم فتح اللوحة بالنقر في الطرفين. المرجع يعرض إشعارات تجريبية والنظام يعرض حالة فارغة؛ مجموعة البيانات غير موحدة، لذلك محتوى اللوحة وارتفاعها غير محسومين. موضع الفتح قابل للمشاهدة فقط.', 'Gap IDs':'','Review Method':'Actual notification-button click in each product at the same route and viewport; screenshot pair inspected; data content excluded.','Confidence':'Not Verified for content parity because fixtures differ.'});
}
for(const item of added){await access(path.join(root,item.Reference));await access(path.join(root,item.System));await access(path.join(root,item.Evidence));}
const headers=['Slug','Screen ID','Viewport','Status','Visual Result','Reference','System','Diff','Evidence','Observation','Gap IDs','Review Method','Confidence'];
const out=[...rows,...added];
await writeFile(csvPath,serialize(out,headers),'utf8');
console.log(JSON.stringify({routePairs:rows.filter(r=>!r.Slug.startsWith('login')).length,loginPairs:rows.filter(r=>r.Slug==='login').length,referenceSystemStatePairs:added.length,totalPairs:out.length,unknownScreenIds:out.filter(r=>r['Screen ID']==='UNKNOWN').length,notVerified:out.filter(r=>r['Visual Result'].startsWith('NOT_VERIFIED')).length,confirmedVisual:out.filter(r=>r['Visual Result']==='CONFIRMED_VISUAL_DIFFERENCE').length},null,2));
