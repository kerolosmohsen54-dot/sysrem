# 11 — Master Gap Register

Recovery note: The expanded entries below were reconstructed from the persisted implementation backlog, feature matrix, screen inventory, and screenshot-pair register. Any detail that cannot be supported by those records is explicitly marked unknown or not verified; this reconstruction does not claim the lost prose was recovered verbatim.

71 unique Gap IDs are retained. The status and confidence of each entry remain evidence-scoped; a completed audit record does not imply implementation success.

## GAP-0001 — حجز كميات الطلب غير منفذ

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P1
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** SCR-005 — طلب مؤكد ومعتمد #ORD-2024-001
- **Affected Screen IDs:** SCR-005
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-009
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** docs/ux-inventory/screenshots/reference/screens/order-detail-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/order-detail-1280.png; docs/ux-inventory/screenshots/system-mock/all-order-detail-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/order-detail-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/order-detail-390.png; docs/ux-inventory/screenshots/system-mock/all-order-detail-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/order-detail-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/order-detail-768.png; docs/ux-inventory/screenshots/system-mock/all-order-detail-768-side-by-side.png
- **Expected Behavior:** حفظ حجز فعلي وإظهاره ثم تحريره وفق انتقالات معتمدة.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** حجز كميات الطلب غير منفذ
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** تعريف D8 والإلغاء والفوترة والتزامن.
- **Suggested Corrective Action:** حجز كميات الطلب غير منفذ: حفظ حجز فعلي وإظهاره ثم تحريره وفق انتقالات معتمدة.
- **Acceptance Criteria:** حجز محفوظ واحد، عرض واضح، لا تجاوز للمتاح، وتحرير مرة واحدة عند الإلغاء/التحول.
- **Recommended Verification Method:** مراجعة معاملات concurrent في قاعدة اختبار بعد اعتماد القرار.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0005 — دليل الحسابات صفحة انتظار

- **Category:** PARTIAL_FEATURE
- **Priority:** P1
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Accounting
- **Affected Screen IDs:** SCR-044
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-029
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** SCR-044
- **Current System Evidence:** Mapped page/entry exists but renders waiting or mock behavior; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** قراءة وإدارة شجرة الحسابات وفق صلاحية وقواعد محاسبية.
- **Actual Behavior:** UI_ONLY; Source-only comparison; no browser/API/database execution.
- **Exact Missing or Incorrect Detail:** دليل الحسابات صفحة انتظار
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** صلاحيات وقواعد الكود والحساب المرحّل.
- **Suggested Corrective Action:** دليل الحسابات صفحة انتظار: قراءة وإدارة شجرة الحسابات وفق صلاحية وقواعد محاسبية.
- **Acceptance Criteria:** عرض الشجرة، الحالات الفارغة/الخطأ، وأفعال مسموحة دون تكرار/دورة.
- **Recommended Verification Method:** اختبارات شجرة صغيرة مع حساب مستخدم محدود.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0007 — لا واجهة/API لقيود اليومية

- **Category:** MISSING_FEATURE
- **Priority:** P1
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Accounting
- **Affected Screen IDs:** SCR-045
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-031
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** SCR-045
- **Current System Evidence:** No implementing web page/interaction found in static route/component search; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** إنشاء قيد متوازن واعتماده/عكسه وربطه بمصدر.
- **Actual Behavior:** MISSING; Source-only comparison; no browser/API/database execution.
- **Exact Missing or Incorrect Detail:** لا واجهة/API لقيود اليومية
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** قواعد double-entry والصلاحيات والرقم والتكرار والعكس.
- **Suggested Corrective Action:** لا واجهة/API لقيود اليومية: إنشاء قيد متوازن واعتماده/عكسه وربطه بمصدر.
- **Acceptance Criteria:** كل قيد متوازن ومصدره واضح ولا يكرر ولا يترحل بلا صلاحية.
- **Recommended Verification Method:** اختبارات ميزان وتكرار وعكس.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0008 — دفتر الأستاذ غير متاح

- **Category:** MISSING_FEATURE
- **Priority:** P1
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Accounting
- **Affected Screen IDs:** SCR-046
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-032
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** SCR-046
- **Current System Evidence:** No implementing web page/interaction found in static route/component search; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** حركة كل حساب ورصيد افتتاحي وختامي ضمن فترة مع رابط القيد.
- **Actual Behavior:** MISSING; Source-only comparison; no browser/API/database execution.
- **Exact Missing or Incorrect Detail:** دفتر الأستاذ غير متاح
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** قيود يومية معتمدة وتعريف العملة والفترة.
- **Suggested Corrective Action:** دفتر الأستاذ غير متاح: حركة كل حساب ورصيد افتتاحي وختامي ضمن فترة مع رابط القيد.
- **Acceptance Criteria:** يعرض القيود المرحّلة فقط ويتطابق مجموع الحركة والرصيد.
- **Recommended Verification Method:** مطابقة حركة fixture مع دفاترها.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0009 — ميزان المراجعة غير متاح

- **Category:** MISSING_FEATURE
- **Priority:** P1
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Accounting
- **Affected Screen IDs:** SCR-047
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-033
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** SCR-047
- **Current System Evidence:** No implementing web page/interaction found in static route/component search; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** تجميع أرصدة الحسابات المدينة والدائنة للفترة.
- **Actual Behavior:** MISSING; Source-only comparison; no browser/API/database execution.
- **Exact Missing or Incorrect Detail:** ميزان المراجعة غير متاح
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** دفتر قيود مرحّل وقاعدة رصيد.
- **Suggested Corrective Action:** ميزان المراجعة غير متاح: تجميع أرصدة الحسابات المدينة والدائنة للفترة.
- **Acceptance Criteria:** المدين يساوي الدائن للفترة المحددة؛ تعرض الأرصدة والحسابات بوضوح.
- **Recommended Verification Method:** حساب fixture معروف مع قيود متوازنة وغير متوازنة.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0010 — التقرير المالي لا يعرض القوائم الثلاث

- **Category:** PARTIAL_FEATURE
- **Priority:** P1
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Accounting
- **Affected Screen IDs:** SCR-048
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-034
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** SCR-048
- **Current System Evidence:** Source contains the partial flow identified in gap register; runtime unverified.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** قوائم مالية بفترة مع تفصيل البنود ومصدرها.
- **Actual Behavior:** PARTIALLY_IMPLEMENTED; Source-only comparison; no browser/API/database execution.
- **Exact Missing or Incorrect Detail:** التقرير المالي لا يعرض القوائم الثلاث
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** دفتر القيود وتعريفات البنود والفترات وموافقة محاسبية.
- **Suggested Corrective Action:** التقرير المالي لا يعرض القوائم الثلاث: قوائم مالية بفترة مع تفصيل البنود ومصدرها.
- **Acceptance Criteria:** الثلاثة متاحة وتطابق القيود وتعرض فترة ومصدرًا وحالات فارغة/خطأ.
- **Recommended Verification Method:** مطابقة مجاميع نتائج بقيد fixture معتمد.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0056 — ميزة ملصقات الباركود غائبة من الواجهة

- **Category:** MISSING_FEATURE
- **Priority:** P1
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Catalog
- **Affected Screen IDs:** SCR-063
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-014
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/barcode-labels-1280.png; docs/ux-inventory/screenshots/reference/activated/barcode-labels-768.png; docs/ux-inventory/screenshots/reference/activated/barcode-labels-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round5/products-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/products-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/products-390.png; Runtime screenshot and click evidence in docs/ux-inventory; نقرة رابط تكلفة المنتج فتحت السجل؛ لم يظهر تحكم باركود/ملصقات. الصور: round5-product-cost-history وround5-barcode-labels.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** بحث/مسح كاميرا وطباعة جماعية وجدول ملصقات.
- **Actual Behavior:** المرجع يعرض البحث/مسح الكاميرا والطباعة الجماعية وجدول الملصقات؛ صفحة المنتجات لا تعرض أداة أو مسارًا مطابقًا بعد فحص الواجهة.
- **Exact Missing or Incorrect Detail:** ميزة ملصقات الباركود غائبة من الواجهة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** ميزة ملصقات الباركود غائبة من الواجهة: بحث/مسح كاميرا وطباعة جماعية وجدول ملصقات.
- **Acceptance Criteria:** التحكم ظاهر ويتيح البحث/المسح والطباعة وحالات الفراغ.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-barcode-labels-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-barcode-labels-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-barcode-labels-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0002 — ملف العميل لا يعرض تبويبات السجل

- **Category:** PARTIAL_FEATURE
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Customers
- **Affected Screen IDs:** SCR-030
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-004
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** SCR-030
- **Current System Evidence:** Source contains the partial flow identified in gap register; runtime unverified.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** عرض تبويبات سجل العميل مع فتح العناصر أو تصفيتها عليه.
- **Actual Behavior:** PARTIALLY_IMPLEMENTED; Source-only comparison; no browser/API/database execution.
- **Exact Missing or Incorrect Detail:** ملف العميل لا يعرض تبويبات السجل
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** تحديد عناصر التاريخ وواجهات query.
- **Suggested Corrective Action:** ملف العميل لا يعرض تبويبات السجل: عرض تبويبات سجل العميل مع فتح العناصر أو تصفيتها عليه.
- **Acceptance Criteria:** تظهر التبويبات والروابط والفراغ/التحميل/الخطأ لكل سجل.
- **Recommended Verification Method:** اختبار مصدر كل تبويب وعميل بلا حركات.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0003 — مرفقات العميل غير متاحة

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** SCR-002 — العملاء
- **Affected Screen IDs:** SCR-002
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-043
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** docs/ux-inventory/screenshots/reference/screens/customers-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/customers-1280.png; docs/ux-inventory/screenshots/system-mock/all-customers-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/customers-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/customers-390.png; docs/ux-inventory/screenshots/system-mock/all-customers-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/customers-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/customers-768.png; docs/ux-inventory/screenshots/system-mock/all-customers-768-side-by-side.png
- **Expected Behavior:** رفع ملف مرتبط بالعميل وعرض بياناته للمستخدم المصرح.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** مرفقات العميل غير متاحة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** سياسة التخزين والأنواع والأحجام والصلاحيات والاحتفاظ.
- **Suggested Corrective Action:** مرفقات العميل غير متاحة: رفع ملف مرتبط بالعميل وعرض بياناته للمستخدم المصرح.
- **Acceptance Criteria:** الرفع والحذف/العرض والصلاحية وحالات الفشل تحفظ الارتباط الصحيح.
- **Recommended Verification Method:** اختبارات أنواع/أحجام/مستخدم ممنوع في تخزين محلي.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0004 — route إنشاء المرتجع لا يستخدم النموذج المستقل

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** SCR-013 — إنشاء مرتجع مبيعات جديد
- **Affected Screen IDs:** SCR-013
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-012
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** docs/ux-inventory/screenshots/reference/screens/return-create-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/return-create-1280.png; docs/ux-inventory/screenshots/system-mock/all-return-create-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/return-create-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/return-create-390.png; docs/ux-inventory/screenshots/system-mock/all-return-create-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/return-create-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/return-create-768.png; docs/ux-inventory/screenshots/system-mock/all-return-create-768-side-by-side.png
- **Expected Behavior:** يفتح زر الإنشاء نموذجًا موحدًا يغطي الحالات المعتمدة.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** route إنشاء المرتجع لا يستخدم النموذج المستقل
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** تحديد النموذج المقصود ونطاق المرتجع الحر.
- **Suggested Corrective Action:** route إنشاء المرتجع لا يستخدم النموذج المستقل: يفتح زر الإنشاء نموذجًا موحدًا يغطي الحالات المعتمدة.
- **Acceptance Criteria:** الرابط والمسار المباشر يفتحان النموذج المعتمد؛ linked/free مطابقان للقرار.
- **Recommended Verification Method:** مراجعة route وتجربة preview/create ببيئة معزولة.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0006 — التسويات المالية صفحة انتظار

- **Category:** PARTIAL_FEATURE
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Accounting
- **Affected Screen IDs:** SCR-054
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-030
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** SCR-054
- **Current System Evidence:** Mapped page/entry exists but renders waiting or mock behavior; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** إنشاء تسوية بمرجع وسبب ثم عرض أثرها وسجلها.
- **Actual Behavior:** UI_ONLY; Source-only comparison; no browser/API/database execution.
- **Exact Missing or Incorrect Detail:** التسويات المالية صفحة انتظار
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** تعريف التسوية والترحيل والعكس.
- **Suggested Corrective Action:** التسويات المالية صفحة انتظار: إنشاء تسوية بمرجع وسبب ثم عرض أثرها وسجلها.
- **Acceptance Criteria:** العملية تسجل مرة واحدة وسببًا ومنفذًا وأثرًا قابلًا للمراجعة.
- **Recommended Verification Method:** حالات قبول/رفض/تكرار في test fixture.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0011 — الأموال المنتظرة غير متاحة

- **Category:** MISSING_FEATURE
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Finance
- **Affected Screen IDs:** SCR-017/035
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-035
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** المالية
- **Current System Evidence:** No implementing web page/interaction found in static route/component search; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** قائمة مبالغ متوقعة بمصدر واستحقاق وحالة وتسوية.
- **Actual Behavior:** MISSING; Source-only comparison; no browser/API/database execution.
- **Exact Missing or Incorrect Detail:** الأموال المنتظرة غير متاحة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** تعريف مصادر الأموال والتمييز عن الذمم.
- **Suggested Corrective Action:** الأموال المنتظرة غير متاحة: قائمة مبالغ متوقعة بمصدر واستحقاق وحالة وتسوية.
- **Acceptance Criteria:** كل مبلغ له مصدر وتاريخ وحالة وانتقال موثق دون تكرار.
- **Recommended Verification Method:** مراجعة قواعد العمل وسيناريوهات وصول/تأخر.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0012 — خطط أقساط الشركاء غير متاحة

- **Category:** MISSING_FEATURE
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Finance
- **Affected Screen IDs:** SCR-017
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-036
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** المالية
- **Current System Evidence:** No implementing web page/interaction found in static route/component search; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** متابعة قسط مستحق ومدفوع ومتأخر ومتبقي.
- **Actual Behavior:** MISSING; Source-only comparison; no browser/API/database execution.
- **Exact Missing or Incorrect Detail:** خطط أقساط الشركاء غير متاحة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** قواعد الشريك والاعتماد والربط بالدفعات.
- **Suggested Corrective Action:** خطط أقساط الشركاء غير متاحة: متابعة قسط مستحق ومدفوع ومتأخر ومتبقي.
- **Acceptance Criteria:** تعرض الاستحقاق والمدفوع والمتبقي والحالة مع سجل تعديل.
- **Recommended Verification Method:** اختبار قسط متأخر ومدفوع جزئيًا على بيانات fixture.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0013 — ميزانية المصروفات غير متاحة

- **Category:** MISSING_SCREEN
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Finance
- **Affected Screen IDs:** SCR-056
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-037
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/expense-budget-1280.png; docs/ux-inventory/screenshots/reference/activated/expense-budget-768.png; docs/ux-inventory/screenshots/reference/activated/expense-budget-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-390.png; No implementing web page/interaction found in static route/component search; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** مبلغ مخطط حسب تصنيف وفترة مع مقارنة الفعلي والانحراف.
- **Actual Behavior:** المرجع يعرض ميزانية حسب البند والسقف/الفعلي والنسبة/الحالة؛ النظام يعلن عدم ارتباط الميزة ولا يفتح شاشة.
- **Exact Missing or Incorrect Detail:** ميزانية المصروفات غير متاحة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** سياسة تجاوز الحد والعملة والفترة والتصنيف.
- **Suggested Corrective Action:** ميزانية المصروفات غير متاحة: مبلغ مخطط حسب تصنيف وفترة مع مقارنة الفعلي والانحراف.
- **Acceptance Criteria:** تعرض المخطط والفعلي والمتبقي والفارق بمصدر واضح.
- **Recommended Verification Method:** مقارنة حسابات على مجموعة مصروفات معلومة.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-expense-budget-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-expense-budget-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-expense-budget-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0014 — المصروفات المتكررة غير متاحة

- **Category:** MISSING_SCREEN
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Finance
- **Affected Screen IDs:** SCR-057
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-038
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/recurring-expenses-1280.png; docs/ux-inventory/screenshots/reference/activated/recurring-expenses-768.png; docs/ux-inventory/screenshots/reference/activated/recurring-expenses-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-390.png; No implementing web page/interaction found in static route/component search; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** جدولة دورية مع مراجعة أو تسجيل محدد.
- **Actual Behavior:** المرجع يعرض إعداد المصروف المتكرر وجدول السجلات؛ النظام يعلن عدم ارتباط الميزة ولا يعرض صفحة/نموذجًا.
- **Exact Missing or Incorrect Detail:** المصروفات المتكررة غير متاحة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** اعتماد بشري أو تلقائي وسياسة إيقاف وتعديل.
- **Suggested Corrective Action:** المصروفات المتكررة غير متاحة: جدولة دورية مع مراجعة أو تسجيل محدد.
- **Acceptance Criteria:** الاستحقاق ينشأ مرة واحدة ويمكن إيقافه وتعديله مع سجل.
- **Recommended Verification Method:** اختبار استحقاق واحد وإعادة تشغيل scheduler بلا ازدواج.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-recurring-expenses-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-recurring-expenses-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-recurring-expenses-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0015 — مقارنة شهر بشهر غير موجودة

- **Category:** MISSING_SCREEN
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Finance
- **Affected Screen IDs:** SCR-058
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-039
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/monthly-comparison-1280.png; docs/ux-inventory/screenshots/reference/activated/monthly-comparison-768.png; docs/ux-inventory/screenshots/reference/activated/monthly-comparison-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-390.png; No implementing web page/interaction found in static route/component search; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** اختيار فترتين وعرض المؤشر والفارق العددي/النسبي.
- **Actual Behavior:** المرجع يعرض مقارنة مبيعات ومصروفات وربح شهري؛ النظام يعلن عدم ارتباط الميزة ولا يعرض شاشة مقارنة.
- **Exact Missing or Incorrect Detail:** مقارنة شهر بشهر غير موجودة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** قائمة المقاييس وقاعدة الفترات والصفر.
- **Suggested Corrective Action:** مقارنة شهر بشهر غير موجودة: اختيار فترتين وعرض المؤشر والفارق العددي/النسبي.
- **Acceptance Criteria:** الفترة والقيمة والفارق مع معالجة صفر/فترة بلا بيانات.
- **Recommended Verification Method:** مقارنة فترتين fixture مع إجمالي محسوب يدويًا.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-monthly-comparison-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-monthly-comparison-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-monthly-comparison-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0016 — توقع السيولة غير موجود

- **Category:** MISSING_SCREEN
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Finance
- **Affected Screen IDs:** SCR-059
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-040
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/cash-forecast-1280.png; docs/ux-inventory/screenshots/reference/activated/cash-forecast-768.png; docs/ux-inventory/screenshots/reference/activated/cash-forecast-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-390.png; No implementing web page/interaction found in static route/component search; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** توقع الداخل والخارج بفترة مع فصل المتوقع عن الفعلي والمصدر.
- **Actual Behavior:** المرجع يعرض رصيدًا وتدفقات أسبوعية؛ النظام يعلن عدم ارتباط الميزة ولا يعرض شاشة توقع.
- **Exact Missing or Incorrect Detail:** توقع السيولة غير موجود
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** تعريف الذمم والأقساط والمصروفات المتكررة.
- **Suggested Corrective Action:** توقع السيولة غير موجود: توقع الداخل والخارج بفترة مع فصل المتوقع عن الفعلي والمصدر.
- **Acceptance Criteria:** كل مبلغ متوقع موسوم ومصدره معروف ومجموعه قابل للمراجعة.
- **Recommended Verification Method:** reconciliation على سيناريو تواريخ ومصادر معروف.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-cash-forecast-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-cash-forecast-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-cash-forecast-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0017 — أدوات البيانات في الويب mock وليست متصلة

- **Category:** PARTIAL_FEATURE
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Data tools
- **Affected Screen IDs:** أدوات البيانات الديناميكية؛ لا SCR ثابت.
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-042
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/excel-import-1280.png; docs/ux-inventory/screenshots/reference/activated/excel-import-768.png; docs/ux-inventory/screenshots/reference/activated/excel-import-390.png; docs/ux-inventory/screenshots/reference/activated/daily-summary-1280.png; docs/ux-inventory/screenshots/reference/activated/daily-summary-768.png; docs/ux-inventory/screenshots/reference/activated/daily-summary-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round6/locked-excel-import-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/locked-excel-import-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/locked-excel-import-390.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/locked-daily-summary-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/locked-daily-summary-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/locked-daily-summary-390.png; Runtime screenshot and click evidence in docs/ux-inventory; نقر النافذتين عند 1280/768/390 ثم Escape؛ نافذة تجريبية عامة بلا استيراد أو تقرير يومي.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** رفع ومعاينة وتحقق ثم تطبيق بعد تأكيد وعرض ملخص يومي.
- **Actual Behavior:** النقر عند 1280/768/390 يفتح نافذة تجريبية عامة بلا رفع/معاينة؛ المرجع يعرض التبويبات وحقل الملف والقالب. / النقر عند 1280/768/390 يفتح نافذة عامة؛ المرجع يعرض التقرير وخيارات النسخ والتذكير.
- **Exact Missing or Incorrect Detail:** أدوات البيانات في الويب mock وليست متصلة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** أمان الرفع والمعاينة والصلاحيات وidempotency.
- **Suggested Corrective Action:** أدوات البيانات في الويب mock وليست متصلة: رفع ومعاينة وتحقق ثم تطبيق بعد تأكيد وعرض ملخص يومي.
- **Acceptance Criteria:** preview لا يكتب؛ apply مؤكد؛ أخطاء الصفوف والنتيجة تظهر بوضوح.
- **Recommended Verification Method:** ملف اختبار سليم ومعيب؛ لا apply على أي بيانات حقيقية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-excel-import-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-excel-import-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-excel-import-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-daily-summary-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-daily-summary-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-daily-summary-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0018 — النسخ والاستعادة لا تظهر للمستخدم

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** SCR-025 — التقارير المالية
- **Affected Screen IDs:** SCR-025
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-044
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** docs/ux-inventory/screenshots/reference/screens/reports-financial-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-financial-1280.png; docs/ux-inventory/screenshots/system-mock/all-reports-financial-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/reports-financial-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-financial-390.png; docs/ux-inventory/screenshots/system-mock/all-reports-financial-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/reports-financial-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-financial-768.png; docs/ux-inventory/screenshots/system-mock/all-reports-financial-768-side-by-side.png
- **Expected Behavior:** استعراض حالة النسخ وإنشاء نسخة محكومة وإظهار النتيجة.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** النسخ والاستعادة لا تظهر للمستخدم
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** صلاحيات، سجلات تدقيق، نطاق scratch للاستعادة.
- **Suggested Corrective Action:** النسخ والاستعادة لا تظهر للمستخدم: استعراض حالة النسخ وإنشاء نسخة محكومة وإظهار النتيجة.
- **Acceptance Criteria:** يظهر آخر وقت ونتيجة؛ لا restore بلا تأكيد وفحص scratch وتسجيل أثر.
- **Recommended Verification Method:** مراجعة أوامر read-only الآن؛ sandbox مستقل بعد التنفيذ.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0019 — عدد التقارير المعلن بلا فهرس تقارير مكتمل

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** See screen and feature inventory.
- **Affected Screen IDs:** SCR-019 وما يرتبط به
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-027/F-028
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** See source and screen inventory references in the feature matrix.
- **Expected Behavior:** قائمة canonical باسم وهدف وفلاتر ومخرجات وصلاحية كل تقرير.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** عدد التقارير المعلن بلا فهرس تقارير مكتمل
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** اعتماد مالك المنتج للتصميم.
- **Suggested Corrective Action:** عدد التقارير المعلن بلا فهرس تقارير مكتمل: قائمة canonical باسم وهدف وفلاتر ومخرجات وصلاحية كل تقرير.
- **Acceptance Criteria:** كل رقم يطابق قائمة محددة؛ كل بطاقة لها target وحقول ومصدر.
- **Recommended Verification Method:** مقارنة الفهرس المعتمد مع routes وواجهات ReportsPage.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0020 — بيانات التحليل بلوحة التحكم تنتظر schema

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** SCR-001 — لوحة التحكم
- **Affected Screen IDs:** SCR-001
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-002
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** docs/ux-inventory/screenshots/reference/screens/dashboard-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/dashboard-1280.png; docs/ux-inventory/screenshots/system-mock/dashboard_visible_1280.png; docs/ux-inventory/screenshots/system-mock/dashboard_visible_390.png; docs/ux-inventory/screenshots/system-mock/all-dashboard-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/dashboard-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/dashboard-390.png; docs/ux-inventory/screenshots/system-mock/all-dashboard-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/dashboard-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/dashboard-768.png; docs/ux-inventory/screenshots/system-mock/all-dashboard-768-side-by-side.png
- **Expected Behavior:** إظهار تحليلات وتنبيهات مستمدة من endpoints.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** بيانات التحليل بلوحة التحكم تنتظر schema
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** تعريف مؤشرات وفترات وصلاحيات البيانات.
- **Suggested Corrective Action:** بيانات التحليل بلوحة التحكم تنتظر schema: إظهار تحليلات وتنبيهات مستمدة من endpoints.
- **Acceptance Criteria:** بيانات موثقة مع تاريخ تحديث وحالات empty/loading/error/retry.
- **Recommended Verification Method:** مطابقة values لتجميعة بيانات fixture.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0021 — إعدادات أقل من نطاق المرجع

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** SCR-025 — التقارير المالية
- **Affected Screen IDs:** SCR-025
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-041
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** docs/ux-inventory/screenshots/reference/screens/reports-financial-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-financial-1280.png; docs/ux-inventory/screenshots/system-mock/all-reports-financial-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/reports-financial-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-financial-390.png; docs/ux-inventory/screenshots/system-mock/all-reports-financial-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/reports-financial-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-financial-768.png; docs/ux-inventory/screenshots/system-mock/all-reports-financial-768-side-by-side.png
- **Expected Behavior:** تقسيم الإعدادات المرجعية مع حفظ وتغذية من API.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** إعدادات أقل من نطاق المرجع
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** تعريف الحقول المسموحة لكل دور وAPI.
- **Suggested Corrective Action:** إعدادات أقل من نطاق المرجع: تقسيم الإعدادات المرجعية مع حفظ وتغذية من API.
- **Acceptance Criteria:** كل field إما موصول بخدمة أو موضح أنه غير متاح؛ حالات حفظ/خطأ سليمة.
- **Recommended Verification Method:** مقارنة مصدر tab-by-tab مع صفحات/مسارات API.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0022 — handlers في المرجع تصل إلى panels غير موجودة

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** See screen and feature inventory.
- **Affected Screen IDs:** SCR-001 ومقاطع الإعدادات والتنقل
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-027/F-041
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** See source and screen inventory references in the feature matrix.
- **Expected Behavior:** كل رابط إلى شاشة موجودة أو وجهة موثقة.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** handlers في المرجع تصل إلى panels غير موجودة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** قرار target لكل عنصر.
- **Suggested Corrective Action:** handlers في المرجع تصل إلى panels غير موجودة: كل رابط إلى شاشة موجودة أو وجهة موثقة.
- **Acceptance Criteria:** كل handler يجد panel/route صالحًا أو يصنف صراحة خارج النطاق.
- **Recommended Verification Method:** مقارنة handler targets بقائمة panel IDs ثم تفاعل prototype لاحقًا.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0027 — Mobile navigation differs from the v43 reference

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Dashboard
- **Affected Screen IDs:** SCR-001 and mobile shell
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-002
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/dashboard-1280.png; docs/ux-inventory/screenshots/reference/screens/dashboard-390.png; docs/ux-inventory/screenshots/reference/screens/dashboard-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/dashboard-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/dashboard-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/dashboard-768.png; Source contains the partial flow identified in gap register; runtime unverified.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** At 390px, use the navigation controls and placement shown in the approved reference.
- **Actual Behavior:** بنية لوحة المؤشرات والرسوم وترتيبها تختلف؛ بيانات الأرقام غير موحّدة، واختلاف شريط تنقل الهاتف موثق منفصلًا.
- **Exact Missing or Incorrect Detail:** Mobile navigation differs from the v43 reference
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** None identified for the visual correction.
- **Suggested Corrective Action:** Mobile navigation differs from the v43 reference: At 390px, use the navigation controls and placement shown in the approved reference.
- **Acceptance Criteria:** At 390px the same navigation controls appear in the same locations as v43 and do not cover screen content.
- **Recommended Verification Method:** Matched screenshots plus touch and keyboard navigation through each item.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-dashboard-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-dashboard-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-dashboard-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0028 — Login form presentation differs from the v43 reference

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Auth
- **Affected Screen IDs:** SCR-000
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-001
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/states/login-1280.png; docs/ux-inventory/screenshots/reference/states/login-768.png; docs/ux-inventory/screenshots/reference/states/login-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/login/login-1280.png; docs/ux-inventory/screenshots/system-mock/react/login/login-768.png; docs/ux-inventory/screenshots/system-mock/react/login/login-390.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** Match the reference username control, labels, logo scale, and submit-button copy/layout.
- **Actual Behavior:** موضع/حجم العلامة وبطاقة الدخول والحقل الافتراضي وتوزيع المساحة تختلف بين المرجع وReact عند هذا المقاس.
- **Exact Missing or Incorrect Detail:** Login form presentation differs from the v43 reference
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** Live valid/invalid authentication remains unverified.
- **Suggested Corrective Action:** Login form presentation differs from the v43 reference: Match the reference username control, labels, logo scale, and submit-button copy/layout.
- **Acceptance Criteria:** At 390px the field type, copy, logo scale, and spacing match v43; valid login still uses the API.
- **Recommended Verification Method:** Matched screenshots and live isolated-account valid/invalid login tests.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/visual-review-round2/login-1280-side-by-side.png; docs/ux-inventory/screenshots/visual-review-round2/login-768-side-by-side.png; docs/ux-inventory/screenshots/visual-review-round2/login-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0029 — Finance screen hierarchy differs from the v43 reference

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** SCR-017 — المالية
- **Affected Screen IDs:** SCR-017
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** Finance feature records in INVENTORY.csv
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/finance-1280.png; docs/ux-inventory/screenshots/reference/screens/finance-390.png; docs/ux-inventory/screenshots/reference/screens/finance-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/finance-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/finance-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/finance-768.png
- **Expected Behavior:** Preserve the reference finance tabs, customer-account table, expense section, and their hierarchy at 390px.
- **Actual Behavior:** ترتيب أقسام المالية وبطاقاتها يختلف عن تسلسل المرجع؛ لا تُقارن الأرصدة بسبب اختلاف fixtures.
- **Exact Missing or Incorrect Detail:** Finance screen hierarchy differs from the v43 reference
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** Matching finance fixtures are needed to compare values and rows.
- **Suggested Corrective Action:** Finance screen hierarchy differs from the v43 reference: Preserve the reference finance tabs, customer-account table, expense section, and their hierarchy at 390px.
- **Acceptance Criteria:** Tabs, table, and expense section follow reference order at 390px; all current actions remain reachable.
- **Recommended Verification Method:** Matched 390px images and API-backed interaction checks for each section.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-finance-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-finance-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-finance-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0030 — Order creation omits reference form sections and controls

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Sales
- **Affected Screen IDs:** SCR-004
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-008
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/order-create-1280.png; docs/ux-inventory/screenshots/reference/screens/order-create-390.png; docs/ux-inventory/screenshots/reference/screens/order-create-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/order-create-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/order-create-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/order-create-768.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** Show the reference order-number/customer/date/currency/sales-representative/payment-terms/warehouse groups, item table, and financial summary.
- **Actual Behavior:** ترتيب مجموعات حقول الطلب والملخص مختلف؛ التطبيق يطيل النموذج رأسيًا قبل إظهار الأصناف.
- **Exact Missing or Incorrect Detail:** Order creation omits reference form sections and controls
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** Same seeded customer/catalog/order data is needed for behavior comparison.
- **Suggested Corrective Action:** Order creation omits reference form sections and controls: Show the reference order-number/customer/date/currency/sales-representative/payment-terms/warehouse groups, item table, and financial summary.
- **Acceptance Criteria:** Each reference field is present or its unsupported contract is explicitly documented; item rows and totals follow the reference hierarchy.
- **Recommended Verification Method:** Same-fixture screenshots, then create/cancel/confirm in an isolated backend fixture.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-order-create-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-order-create-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-order-create-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0031 — اختلاف ترتيب ومحتوى لوحة التحكم

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Dashboard
- **Affected Screen IDs:** SCR-001
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-002
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/dashboard-1280.png; docs/ux-inventory/screenshots/reference/screens/dashboard-390.png; docs/ux-inventory/screenshots/reference/screens/dashboard-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/dashboard-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/dashboard-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/dashboard-768.png; Source contains the partial flow identified in gap register; runtime unverified.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** عرض مؤشرات الأداء والرسم والنشاط والخزينة وفق ترتيب مرجع v43.
- **Actual Behavior:** بنية لوحة المؤشرات والرسوم وترتيبها تختلف؛ بيانات الأرقام غير موحّدة، واختلاف شريط تنقل الهاتف موثق منفصلًا.
- **Exact Missing or Incorrect Detail:** اختلاف ترتيب ومحتوى لوحة التحكم
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف ترتيب ومحتوى لوحة التحكم: عرض مؤشرات الأداء والرسم والنشاط والخزينة وفق ترتيب مرجع v43.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض مؤشرات الأداء والرسم والنشاط والخزينة وفق ترتيب مرجع v43.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-dashboard-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-dashboard-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-dashboard-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0032 — اختلاف تكوين قائمة الطلبات

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Sales
- **Affected Screen IDs:** SCR-003
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-007
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/orders-1280.png; docs/ux-inventory/screenshots/reference/screens/orders-390.png; docs/ux-inventory/screenshots/reference/screens/orders-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/orders-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/orders-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/orders-768.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** تجميع البحث والمرشحات والجدول والترقيم وفق بنية المرجع.
- **Actual Behavior:** صف البحث والمرشحات والجدول وترقيم الصفحات أكثر اتساعًا من بنية المرجع؛ القيم والصفوف مستبعدة.
- **Exact Missing or Incorrect Detail:** اختلاف تكوين قائمة الطلبات
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف تكوين قائمة الطلبات: تجميع البحث والمرشحات والجدول والترقيم وفق بنية المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: تجميع البحث والمرشحات والجدول والترقيم وفق بنية المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-orders-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-orders-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-orders-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0033 — اختلاف تكوين قائمة الفواتير

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Sales
- **Affected Screen IDs:** SCR-006
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-010
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/invoices-1280.png; docs/ux-inventory/screenshots/reference/screens/invoices-390.png; docs/ux-inventory/screenshots/reference/screens/invoices-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/invoices-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/invoices-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/invoices-768.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** عرض ملخصات الفواتير والمرشحات والجدول حسب ترتيب المرجع.
- **Actual Behavior:** تكوين ملخصات الفواتير والمرشحات والجدول يختلف بصريًا؛ أعداد الصفوف والقيم مستبعدة لاختلاف البيانات.
- **Exact Missing or Incorrect Detail:** اختلاف تكوين قائمة الفواتير
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف تكوين قائمة الفواتير: عرض ملخصات الفواتير والمرشحات والجدول حسب ترتيب المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض ملخصات الفواتير والمرشحات والجدول حسب ترتيب المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-invoices-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-invoices-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-invoices-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0034 — اختلاف توزيع نموذج إنشاء الفاتورة

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** SCR-007 — إنشاء فاتورة مبيعات جديدة
- **Affected Screen IDs:** SCR-007
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** Not mapped; see 05_FEATURE_GAP_MATRIX.csv.
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/invoice-create-1280.png; docs/ux-inventory/screenshots/reference/screens/invoice-create-390.png; docs/ux-inventory/screenshots/reference/screens/invoice-create-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/invoice-create-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/invoice-create-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/invoice-create-768.png
- **Expected Behavior:** توزيع شريط الإجراءات ونوع العملية وأقسام العميل والفاتورة على نحو المرجع.
- **Actual Behavior:** شريط الإجراءات ونوع العملية وأقسام العميل والفاتورة تتراكم رأسيًا في النظام بدل التوزيع المرجعي.
- **Exact Missing or Incorrect Detail:** اختلاف توزيع نموذج إنشاء الفاتورة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف توزيع نموذج إنشاء الفاتورة: توزيع شريط الإجراءات ونوع العملية وأقسام العميل والفاتورة على نحو المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: توزيع شريط الإجراءات ونوع العملية وأقسام العميل والفاتورة على نحو المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-invoice-create-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-invoice-create-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-invoice-create-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0035 — اختلاف حالة قائمة المرتجعات

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Sales
- **Affected Screen IDs:** SCR-012
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-012
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/returns-1280.png; docs/ux-inventory/screenshots/reference/screens/returns-390.png; docs/ux-inventory/screenshots/reference/screens/returns-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/returns-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/returns-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/returns-768.png; Source contains the partial flow identified in gap register; runtime unverified.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** إبراز زر الإنشاء والجدول كما في المرجع حتى عند عدم وجود صفوف.
- **Actual Behavior:** حالة القائمة الفارغة في النظام أكبر بصريًا من الجدول وزر الإنشاء في المرجع؛ Screen ID المعتمد SCR-012.
- **Exact Missing or Incorrect Detail:** اختلاف حالة قائمة المرتجعات
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف حالة قائمة المرتجعات: إبراز زر الإنشاء والجدول كما في المرجع حتى عند عدم وجود صفوف.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: إبراز زر الإنشاء والجدول كما في المرجع حتى عند عدم وجود صفوف.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-returns-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-returns-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-returns-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0036 — اختلاف كثافة قائمة العملاء ومرشحاتها

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Customer files
- **Affected Screen IDs:** SCR-002
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-043
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/customers-1280.png; docs/ux-inventory/screenshots/reference/screens/customers-390.png; docs/ux-inventory/screenshots/reference/screens/customers-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/customers-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/customers-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/customers-768.png; No implementing web page/interaction found in static route/component search; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** الحفاظ على ترتيب المرشحات وكثافة الجدول المرجعي مع سلوك هاتف مناسب.
- **Actual Behavior:** لوحة المرشحات والجدول أعرض في النظام؛ على الهاتف تتحول الصفوف إلى بطاقات طويلة بدل كثافة جدول المرجع.
- **Exact Missing or Incorrect Detail:** اختلاف كثافة قائمة العملاء ومرشحاتها
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف كثافة قائمة العملاء ومرشحاتها: الحفاظ على ترتيب المرشحات وكثافة الجدول المرجعي مع سلوك هاتف مناسب.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: الحفاظ على ترتيب المرشحات وكثافة الجدول المرجعي مع سلوك هاتف مناسب.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-customers-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-customers-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-customers-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0037 — اختلاف بنية قائمة الحاويات

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Containers
- **Affected Screen IDs:** SCR-018
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-019
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/containers-1280.png; docs/ux-inventory/screenshots/reference/screens/containers-390.png; docs/ux-inventory/screenshots/reference/screens/containers-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/containers-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/containers-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/containers-768.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** عرض القائمة المختصرة وترتيب بيانات الحاويات كما في المرجع.
- **Actual Behavior:** المرجع يعرض قائمة مباشرة ومختصرة؛ النظام يضع مرشحات أكبر ويحوّل الصفوف إلى بطاقات أطول على الهاتف.
- **Exact Missing or Incorrect Detail:** اختلاف بنية قائمة الحاويات
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف بنية قائمة الحاويات: عرض القائمة المختصرة وترتيب بيانات الحاويات كما في المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض القائمة المختصرة وترتيب بيانات الحاويات كما في المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-containers-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-containers-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-containers-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0038 — اختلاف مرشحات وأعمدة شاشة المنتجات

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Catalog
- **Affected Screen IDs:** SCR-014
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-014
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/products-1280.png; docs/ux-inventory/screenshots/reference/screens/products-390.png; docs/ux-inventory/screenshots/reference/screens/products-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/products-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/products-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/products-768.png; Runtime screenshot and click evidence in docs/ux-inventory; نقرة رابط تكلفة المنتج فتحت السجل؛ لم يظهر تحكم باركود/ملصقات. الصور: round5-product-cost-history وround5-barcode-labels.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** مطابقة كثافة جدول المنتجات ومرشحاته وأعمدته للمرجع عند المقاسات الثلاثة.
- **Actual Behavior:** النظام يعرض مرشحات وأعمدة أكثر وبطاقات طويلة على الهاتف مقابل جدول المرجع؛ قيم الأصناف ليست fixture مشتركة.
- **Exact Missing or Incorrect Detail:** اختلاف مرشحات وأعمدة شاشة المنتجات
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف مرشحات وأعمدة شاشة المنتجات: مطابقة كثافة جدول المنتجات ومرشحاته وأعمدته للمرجع عند المقاسات الثلاثة.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: مطابقة كثافة جدول المنتجات ومرشحاته وأعمدته للمرجع عند المقاسات الثلاثة.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-products-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-products-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-products-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0039 — اختلاف شبكة مركز التقارير

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Reports
- **Affected Screen IDs:** SCR-019
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-027
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/reports-1280.png; docs/ux-inventory/screenshots/reference/screens/reports-390.png; docs/ux-inventory/screenshots/reference/screens/reports-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-768.png; Source contains the partial flow identified in gap register; runtime unverified.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** عرض بطاقات التقارير في شبكة وترتيب المرجع.
- **Actual Behavior:** المرجع يستخدم شبكة بطاقات تقارير، بينما النظام يعرض قائمة مجموعات رأسية أطول.
- **Exact Missing or Incorrect Detail:** اختلاف شبكة مركز التقارير
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف شبكة مركز التقارير: عرض بطاقات التقارير في شبكة وترتيب المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض بطاقات التقارير في شبكة وترتيب المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-reports-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-reports-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-reports-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0040 — اختلاف تسلسل لوحة التحصيل

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Finance
- **Affected Screen IDs:** SCR-009
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-011
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/collections-1280.png; docs/ux-inventory/screenshots/reference/screens/collections-390.png; docs/ux-inventory/screenshots/reference/screens/collections-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/collections-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/collections-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/collections-768.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** عرض مؤشرات التحصيل ثم المستحقات والدفعات وفق المرجع.
- **Actual Behavior:** تسلسل المرجع: مؤشرات التحصيل ثم المستحقات والدفعات؛ النظام يبدأ بالبحث/التاريخ وجدول الفواتير. اختلاف بيانات الاختبار مستبعد من المقارنة.
- **Exact Missing or Incorrect Detail:** اختلاف تسلسل لوحة التحصيل
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف تسلسل لوحة التحصيل: عرض مؤشرات التحصيل ثم المستحقات والدفعات وفق المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض مؤشرات التحصيل ثم المستحقات والدفعات وفق المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-collections-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-collections-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-collections-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0041 — اختلاف مؤشرات وإجراءات أذونات التسليم

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Sales
- **Affected Screen IDs:** SCR-010
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-013
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/deliveries-1280.png; docs/ux-inventory/screenshots/reference/screens/deliveries-390.png; docs/ux-inventory/screenshots/reference/screens/deliveries-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/deliveries-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/deliveries-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/deliveries-768.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** عرض شبكة المؤشرات وإجراءات المرجع مع حالة فراغ مدمجة.
- **Actual Behavior:** شبكة المؤشرات وإجراءات المرجع لا تظهر بنفس الترتيب؛ حالة القائمة الفارغة في التطبيق تأخذ مساحة أكبر.
- **Exact Missing or Incorrect Detail:** اختلاف مؤشرات وإجراءات أذونات التسليم
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف مؤشرات وإجراءات أذونات التسليم: عرض شبكة المؤشرات وإجراءات المرجع مع حالة فراغ مدمجة.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض شبكة المؤشرات وإجراءات المرجع مع حالة فراغ مدمجة.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-deliveries-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-deliveries-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-deliveries-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0042 — اختلاف توزيع نموذج إذن التسليم

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** SCR-011 — إنشاء إذن صرف وتوصيل جديد
- **Affected Screen IDs:** SCR-011
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** Not mapped; see 05_FEATURE_GAP_MATRIX.csv.
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/delivery-create-1280.png; docs/ux-inventory/screenshots/reference/screens/delivery-create-390.png; docs/ux-inventory/screenshots/reference/screens/delivery-create-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/delivery-create-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/delivery-create-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/delivery-create-768.png
- **Expected Behavior:** توزيع الحقول في العمودين وعرض الأصناف حسب المرجع.
- **Actual Behavior:** المرجع يوزع الحقول في عمودين ويعرض الأصناف؛ النظام يكدس الأقسام والحقول رأسيًا.
- **Exact Missing or Incorrect Detail:** اختلاف توزيع نموذج إذن التسليم
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف توزيع نموذج إذن التسليم: توزيع الحقول في العمودين وعرض الأصناف حسب المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: توزيع الحقول في العمودين وعرض الأصناف حسب المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-delivery-create-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-delivery-create-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-delivery-create-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0043 — اختلاف قائمة المخازن ومرشحاتها

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Reports
- **Affected Screen IDs:** SCR-023
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-028
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/warehouses-1280.png; docs/ux-inventory/screenshots/reference/screens/warehouses-390.png; docs/ux-inventory/screenshots/reference/screens/warehouses-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/warehouses-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/warehouses-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/warehouses-768.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** عرض قائمة المخازن المختصرة دون مساحة بحث وترتيب زائدة عن المرجع.
- **Actual Behavior:** النظام يضيف لوحة بحث/ترتيب وجدولًا أكثر اتساعًا بدل القائمة المباشرة المختصرة في المرجع.
- **Exact Missing or Incorrect Detail:** اختلاف قائمة المخازن ومرشحاتها
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف قائمة المخازن ومرشحاتها: عرض قائمة المخازن المختصرة دون مساحة بحث وترتيب زائدة عن المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض قائمة المخازن المختصرة دون مساحة بحث وترتيب زائدة عن المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-warehouses-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-warehouses-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-warehouses-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0044 — حالة التقرير المالي لم تسمح بمقارنة صالحة

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Administration
- **Affected Screen IDs:** SCR-025
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-044
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/reports-financial-1280.png; docs/ux-inventory/screenshots/reference/screens/reports-financial-390.png; docs/ux-inventory/screenshots/reference/screens/reports-financial-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-financial-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-financial-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-financial-768.png; No implementing web page/interaction found in static route/component search; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** إظهار التقرير المالي المرجعي وحالاته على بيانات fixture موحدة.
- **Actual Behavior:** لقطة النظام تعرض خطأ/إعادة محاولة؛ لا توجد لقطة ناجحة بنفس fixture، لذلك لا يُحكم على محتوى الصفحة.
- **Exact Missing or Incorrect Detail:** حالة التقرير المالي لم تسمح بمقارنة صالحة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** حالة/fixture متطابقة أو إتاحة محتوى لوحة المرجع.
- **Suggested Corrective Action:** حالة التقرير المالي لم تسمح بمقارنة صالحة: إظهار التقرير المالي المرجعي وحالاته على بيانات fixture موحدة.
- **Acceptance Criteria:** لقطة مرجع ونظام ناجحتان على بيانات موحدة، مع نتيجة مصنفة ومسنودة بالأدلة.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-reports-financial-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-reports-financial-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-reports-financial-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0045 — اختلاف بنية شاشة المحافظات

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** SCR-026 — المحافظات
- **Affected Screen IDs:** SCR-026
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** راجع مصفوفة الميزات
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/governorates-1280.png; docs/ux-inventory/screenshots/reference/activated/governorates-768.png; docs/ux-inventory/screenshots/reference/activated/governorates-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round3/governorates-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/governorates-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/governorates-390.png
- **Expected Behavior:** جدول مضغوط وإضافة قريبة من القائمة.
- **Actual Behavior:** المرجع يعرض جدول محافظات مضغوطًا وإضافة قريبة؛ النظام يعرض حالة فارغة ونموذج إضافة منفصلًا. قيم الصفوف غير مقارنة.
- **Exact Missing or Incorrect Detail:** اختلاف بنية شاشة المحافظات
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف بنية شاشة المحافظات: جدول مضغوط وإضافة قريبة من القائمة.
- **Acceptance Criteria:** الترتيب والفراغ والإضافة تطابق المرجع بالمقاسات الثلاثة.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-governorates-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-governorates-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-governorates-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0046 — اختلاف نموذج الرصيد الافتتاحي

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** SCR-027 — إضافة إلى المخزون
- **Affected Screen IDs:** SCR-027
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** راجع مصفوفة الميزات
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/opening-stock-1280.png; docs/ux-inventory/screenshots/reference/activated/opening-stock-768.png; docs/ux-inventory/screenshots/reference/activated/opening-stock-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round3/opening-stock-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/opening-stock-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/opening-stock-390.png
- **Expected Behavior:** نموذج افتتاحي مختصر.
- **Actual Behavior:** المرجع يقدّم نموذجًا مختصرًا؛ نموذج النظام أطول ومتباعد ويعرض حقول تكلفة/تاريخ/سبب إضافية.
- **Exact Missing or Incorrect Detail:** اختلاف نموذج الرصيد الافتتاحي
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف نموذج الرصيد الافتتاحي: نموذج افتتاحي مختصر.
- **Acceptance Criteria:** الحقول المرجعية بالترتيب أو توثيق إضافات النظام.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-opening-stock-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-opening-stock-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-opening-stock-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0047 — اختلاف شاشة سلة المحذوفات

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Administration
- **Affected Screen IDs:** SCR-029
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-041
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/trash-1280.png; docs/ux-inventory/screenshots/reference/activated/trash-768.png; docs/ux-inventory/screenshots/reference/activated/trash-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round3/trash-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/trash-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/trash-390.png; Runtime screenshot and click evidence in docs/ux-inventory; تصحيح Screen IDs: المستخدمون SCR-022، السلة SCR-029، السائقون SCR-032، سجل العمليات SCR-033، PWA SCR-067.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** قائمة مضغوطة وإجراءاتها.
- **Actual Behavior:** المرجع يقدّم جدولًا مضغوطًا؛ النظام يعرض حالة فارغة كبيرة وبطاقة وترقيمًا. لم تُنفذ استعادة أو حذف.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة سلة المحذوفات
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف شاشة سلة المحذوفات: قائمة مضغوطة وإجراءاتها.
- **Acceptance Criteria:** تطابق كثافة القائمة ومساحة الفراغ.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-trash-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-trash-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-trash-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0048 — اختلاف شاشة سائقي الشحن

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Administration
- **Affected Screen IDs:** SCR-032
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-041
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/drivers-1280.png; docs/ux-inventory/screenshots/reference/activated/drivers-768.png; docs/ux-inventory/screenshots/reference/activated/drivers-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round3/drivers-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/drivers-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/drivers-390.png; Runtime screenshot and click evidence in docs/ux-inventory; تصحيح Screen IDs: المستخدمون SCR-022، السلة SCR-029، السائقون SCR-032، سجل العمليات SCR-033، PWA SCR-067.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** سجل السائقين وإجراءات مضمنة.
- **Actual Behavior:** المرجع يركّز على سجل السائقين وإجراءاته؛ النظام يعرض empty state ونموذجًا منفصلًا.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة سائقي الشحن
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف شاشة سائقي الشحن: سجل السائقين وإجراءات مضمنة.
- **Acceptance Criteria:** السجل والإجراءات في مواضع المرجع.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-drivers-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-drivers-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-drivers-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0049 — اختلاف سجل العمليات

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Administration
- **Affected Screen IDs:** SCR-033
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-041
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/audit-1280.png; docs/ux-inventory/screenshots/reference/activated/audit-768.png; docs/ux-inventory/screenshots/reference/activated/audit-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round3/audit-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/audit-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/audit-390.png; Runtime screenshot and click evidence in docs/ux-inventory; تصحيح Screen IDs: المستخدمون SCR-022، السلة SCR-029، السائقون SCR-032، سجل العمليات SCR-033، PWA SCR-067.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** مرشحات وسجل جدولي.
- **Actual Behavior:** ترتيب المرشحات وبنية الجدول في النظام يختلفان عن المرجع؛ قيم fixtures مستبعدة.
- **Exact Missing or Incorrect Detail:** اختلاف سجل العمليات
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف سجل العمليات: مرشحات وسجل جدولي.
- **Acceptance Criteria:** ترتيب المرشحات والأعمدة مثل المرجع.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-audit-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-audit-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-audit-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0050 — اختلاف شاشة مرتجعات المخازن

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Inventory
- **Affected Screen IDs:** SCR-051
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-018
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/warehouse-returns-1280.png; docs/ux-inventory/screenshots/reference/activated/warehouse-returns-768.png; docs/ux-inventory/screenshots/reference/activated/warehouse-returns-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round3/warehouse-returns-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/warehouse-returns-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/warehouse-returns-390.png; Runtime screenshot and click evidence in docs/ux-inventory; SCR-028 مرشحها /warehouse-returns لكن تطابقها مع SCR-051 غير محسوم.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** سجل مرتجعات مع اعتماد/كمية.
- **Actual Behavior:** المرجع يعرض سجل مرتجعات وإجراءات اعتماد/كمية؛ النظام يعرض جدولًا فارغًا ونموذج إنشاء منفصلًا. لم يُحفظ نموذج.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة مرتجعات المخازن
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف شاشة مرتجعات المخازن: سجل مرتجعات مع اعتماد/كمية.
- **Acceptance Criteria:** أعمدة السجل وإجراءاته حسب المرجع.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-warehouse-returns-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-warehouse-returns-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-warehouse-returns-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0051 — اختلاف شاشة أموال الحاويات

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** SCR-052 — أموال الحاويات
- **Affected Screen IDs:** SCR-052
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** راجع مصفوفة الميزات
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/container-funds-1280.png; docs/ux-inventory/screenshots/reference/activated/container-funds-768.png; docs/ux-inventory/screenshots/reference/activated/container-funds-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-funds-selected-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-funds-selected-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-funds-selected-390.png
- **Expected Behavior:** نموذج حركة عمودان وسجل حركة.
- **Actual Behavior:** بعد اختيار الحاوية بالنقر، يعرض النظام النموذج رأسيًا وقائمة فارغة؛ المرجع يعرض نموذج عمودين وسجل حركة. لم تُسجل حركة.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة أموال الحاويات
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف شاشة أموال الحاويات: نموذج حركة عمودان وسجل حركة.
- **Acceptance Criteria:** تخطيط قريب من المرجع؛ لا يشترط حفظ في مقارنة الشكل.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-container-funds-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-container-funds-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-container-funds-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0052 — اختلاف شاشة الحد الأدنى للمخزون

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Inventory
- **Affected Screen IDs:** SCR-061
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-018
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/minimum-stock-1280.png; docs/ux-inventory/screenshots/reference/activated/minimum-stock-768.png; docs/ux-inventory/screenshots/reference/activated/minimum-stock-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round3/minimum-stock-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/minimum-stock-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/minimum-stock-390.png; Runtime screenshot and click evidence in docs/ux-inventory; SCR-028 مرشحها /warehouse-returns لكن تطابقها مع SCR-051 غير محسوم.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** تنبيه وجدول حدود منتجات.
- **Actual Behavior:** المرجع يعرض تنبيهًا وجدول حدود المنتجات؛ النظام يعرض empty state ونموذج تحديد حد منتج/مخزن.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة الحد الأدنى للمخزون
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف شاشة الحد الأدنى للمخزون: تنبيه وجدول حدود منتجات.
- **Acceptance Criteria:** الجدول/حالة الفراغ مثل المرجع.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-minimum-stock-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-minimum-stock-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-minimum-stock-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0053 — اختلاف شاشة الجرد الدوري

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Inventory
- **Affected Screen IDs:** SCR-062
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-018
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/inventory-counts-1280.png; docs/ux-inventory/screenshots/reference/activated/inventory-counts-768.png; docs/ux-inventory/screenshots/reference/activated/inventory-counts-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round3/inventory-counts-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/inventory-counts-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/inventory-counts-390.png; Runtime screenshot and click evidence in docs/ux-inventory; SCR-028 مرشحها /warehouse-returns لكن تطابقها مع SCR-051 غير محسوم.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** قائمة كمية النظام/الفعلي/الفارق وإجراء إنهاء.
- **Actual Behavior:** المرجع يعرض كمية النظام والفعلي والفارق وإجراء إنهاء؛ النظام يعرض حالة فارغة ونموذج جلسة.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة الجرد الدوري
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف شاشة الجرد الدوري: قائمة كمية النظام/الفعلي/الفارق وإجراء إنهاء.
- **Acceptance Criteria:** الكميات والفارق وسجل الجلسة في التسلسل المرجعي.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-inventory-counts-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-inventory-counts-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-inventory-counts-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0054 — قائمة تتبع الحاويات لا تعرض تسلسل المرجع

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** SCR-060 — تتبع الحاويات
- **Affected Screen IDs:** SCR-060
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** راجع مصفوفة الميزات
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/container-tracking-1280.png; docs/ux-inventory/screenshots/reference/activated/container-tracking-768.png; docs/ux-inventory/screenshots/reference/activated/container-tracking-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-tracking-candidate-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-tracking-candidate-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-tracking-candidate-390.png
- **Expected Behavior:** مراحل وحالة وETA/تأخير وإجراء المرحلة التالية.
- **Actual Behavior:** المسار المرتبط موجود؛ نقرة رقم الحاوية فتحت /containers/16016. القائمة لا تعرض مراحل الحالة وETA/التأخير وإجراء المرحلة التالية كما في المرجع.
- **Exact Missing or Incorrect Detail:** قائمة تتبع الحاويات لا تعرض تسلسل المرجع
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** قائمة تتبع الحاويات لا تعرض تسلسل المرجع: مراحل وحالة وETA/تأخير وإجراء المرحلة التالية.
- **Acceptance Criteria:** تظهر المرحلة التالية والموعد وتفتح التفاصيل الصحيحة.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-container-tracking-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-container-tracking-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-container-tracking-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0055 — اختلاف شاشة سجل تكلفة المنتج

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Catalog
- **Affected Screen IDs:** SCR-064
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-014
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/product-cost-history-1280.png; docs/ux-inventory/screenshots/reference/activated/product-cost-history-768.png; docs/ux-inventory/screenshots/reference/activated/product-cost-history-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round5/product-cost-history-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/product-cost-history-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/product-cost-history-390.png; Runtime screenshot and click evidence in docs/ux-inventory; نقرة رابط تكلفة المنتج فتحت السجل؛ لم يظهر تحكم باركود/ملصقات. الصور: round5-product-cost-history وround5-barcode-labels.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** سجل تاريخ شراء/صنف/حاوية وتغيرات.
- **Actual Behavior:** نقرة رابط تكلفة المنتج تفتح السجل؛ أعمدة التاريخ/النوع/المخزن/الكمية/تكلفة الوحدة وترتيبها تختلف عن المرجع.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة سجل تكلفة المنتج
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف شاشة سجل تكلفة المنتج: سجل تاريخ شراء/صنف/حاوية وتغيرات.
- **Acceptance Criteria:** نقرة رابط المنتج تفتح سجلًا بهيكل المرجع.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-product-cost-history-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-product-cost-history-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-product-cost-history-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0057 — اختلاف شاشة تثبيت التطبيق

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Administration
- **Affected Screen IDs:** SCR-067
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-041
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/install-app-1280.png; docs/ux-inventory/screenshots/reference/activated/install-app-768.png; docs/ux-inventory/screenshots/reference/activated/install-app-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round3/pwa-install-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/pwa-install-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/pwa-install-390.png; Runtime screenshot and click evidence in docs/ux-inventory; تصحيح Screen IDs: المستخدمون SCR-022، السلة SCR-029، السائقون SCR-032، سجل العمليات SCR-033، PWA SCR-067.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** خطوات وحالات تثبيت لكل منصة.
- **Actual Behavior:** المرجع يشرح خطوات وحالات تثبيت بحسب المنصة؛ النظام يعرض تعليمات عامة لتشغيل MASTER كتطبيق مستقل.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة تثبيت التطبيق
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف شاشة تثبيت التطبيق: خطوات وحالات تثبيت لكل منصة.
- **Acceptance Criteria:** حالات التثبيت تتبع PWA الفعلية وتطابق المرجع.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-install-app-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-install-app-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-install-app-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0058 — مطابقة مسار المخزون المرتجع غير محسومة

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Inventory
- **Affected Screen IDs:** SCR-028
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-018
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/stock-returns-1280.png; docs/ux-inventory/screenshots/reference/activated/stock-returns-768.png; docs/ux-inventory/screenshots/reference/activated/stock-returns-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round3/warehouse-returns-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/warehouse-returns-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/warehouse-returns-390.png; Runtime screenshot and click evidence in docs/ux-inventory; SCR-028 مرشحها /warehouse-returns لكن تطابقها مع SCR-051 غير محسوم.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** لوحة sec-stock-ret تعرض تاريخًا ومنتجًا ومخزنًا وكمية ومرجعًا.
- **Actual Behavior:** /warehouse-returns أقرب دلاليًا لكنه يخدم أيضًا SCR-051؛ لا يمكن تأكيد أن هذا هو تنفيذ sec-stock-ret أو أن اللوحتين متكافئتان.
- **Exact Missing or Incorrect Detail:** مطابقة مسار المخزون المرتجع غير محسومة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ حسم علاقة SCR-028 وSCR-051.
- **Suggested Corrective Action:** مطابقة مسار المخزون المرتجع غير محسومة: لوحة sec-stock-ret تعرض تاريخًا ومنتجًا ومخزنًا وكمية ومرجعًا.
- **Acceptance Criteria:** قرار يوضح إن كان لكل لوحة route مستقل ثم تُعاد المقارنة.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-stock-returns-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-stock-returns-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-stock-returns-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0059 — اختلاف شاشة نقل الحاويات بين المواقع

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Containers/Finance
- **Affected Screen IDs:** SCR-050
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-022
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/transfers-1280.png; docs/ux-inventory/screenshots/reference/screens/transfers-768.png; docs/ux-inventory/screenshots/reference/screens/transfers-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round3/container-transfers-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/container-transfers-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/container-transfers-390.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** نموذج داخل بطاقة من عمودين.
- **Actual Behavior:** بطاقة المرجع ذات عمودين؛ النظام يعرض قائمة فارغة ونموذجًا رأسيًا منفصلًا. استخدام صورة اللوحة المرجعية الساكنة لأن النقرة لم تفعّلها.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة نقل الحاويات بين المواقع
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف شاشة نقل الحاويات بين المواقع: نموذج داخل بطاقة من عمودين.
- **Acceptance Criteria:** تجميع الحقول والمسافات حسب المرجع.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round3-container-transfers-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round3-container-transfers-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round3-container-transfers-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0060 — تنقل لوحة نقل الحاويات في المرجع لا يثبت فتح هدفه

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** SCR-050 — نقل الحاويات بين المواقع
- **Affected Screen IDs:** SCR-050
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** راجع مصفوفة الميزات
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** docs/ux-inventory/screenshots/reference/screens/transfers-1280.png; docs/ux-inventory/screenshots/reference/screens/transfers-768.png; docs/ux-inventory/screenshots/reference/screens/transfers-390.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/container-transfers.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/container-transfers-1280.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round3-container-transfers-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/container-transfers-768.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round3-container-transfers-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/container-transfers-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round3-container-transfers-390-side-by-side.png
- **Expected Behavior:** النقرة كان يجب أن تفعّل sec-transfers.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** تنقل لوحة نقل الحاويات في المرجع لا يثبت فتح هدفه
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** تنقل لوحة نقل الحاويات في المرجع لا يثبت فتح هدفه: النقرة كان يجب أن تفعّل sec-transfers.
- **Acceptance Criteria:** نقرة مرئية تفتح sec-transfers أو alias واضح.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0061 — اختلاف ملخص المخزون ومرشحاته

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Inventory
- **Affected Screen IDs:** SCR-015
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-016
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/inventory-summary-1280.png; docs/ux-inventory/screenshots/reference/screens/inventory-summary-390.png; docs/ux-inventory/screenshots/reference/screens/inventory-summary-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/inventory-summary-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/inventory-summary-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/inventory-summary-768.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** إبراز ملخص المخزون وبنيته المختصرة كما في المرجع.
- **Actual Behavior:** النظام يضيف بحثًا وترتيبًا ومرشحات بارزة قبل المحتوى؛ المرجع يبدأ بملخص المخزون وبنية أقصر.
- **Exact Missing or Incorrect Detail:** اختلاف ملخص المخزون ومرشحاته
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف ملخص المخزون ومرشحاته: إبراز ملخص المخزون وبنيته المختصرة كما في المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: إبراز ملخص المخزون وبنيته المختصرة كما في المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-inventory-summary-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-inventory-summary-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-inventory-summary-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0062 — اختلاف سجل حركات المخزون

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Inventory
- **Affected Screen IDs:** SCR-016
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-017
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/movements-1280.png; docs/ux-inventory/screenshots/reference/screens/movements-390.png; docs/ux-inventory/screenshots/reference/screens/movements-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/movements-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/movements-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/movements-768.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** إبراز حالات الحركة وسجلها بكثافة وترتيب المرجع.
- **Actual Behavior:** النظام يعرض لوحة مرشحات متعددة الحقول؛ المرجع يقدّم حالات الحركة والسجل بكثافة أكبر.
- **Exact Missing or Incorrect Detail:** اختلاف سجل حركات المخزون
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف سجل حركات المخزون: إبراز حالات الحركة وسجلها بكثافة وترتيب المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: إبراز حالات الحركة وسجلها بكثافة وترتيب المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-movements-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-movements-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-movements-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0063 — اختلاف شاشة تقرير المخزون

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** SCR-024 — تقرير المخزون
- **Affected Screen IDs:** SCR-024
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** Not mapped; see 05_FEATURE_GAP_MATRIX.csv.
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/reports-inventory-1280.png; docs/ux-inventory/screenshots/reference/screens/reports-inventory-390.png; docs/ux-inventory/screenshots/reference/screens/reports-inventory-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-inventory-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-inventory-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-inventory-768.png
- **Expected Behavior:** عرض المؤشرات والملخص والجدول كما في مرجع التقرير.
- **Actual Behavior:** المرجع يعرض مؤشرات وملخصًا وجدولًا؛ النظام يعرض البحث/المرشحات وقائمة تفاصيل. لا تُقارن أرقام المخزون لاختلاف البيانات.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة تقرير المخزون
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف شاشة تقرير المخزون: عرض المؤشرات والملخص والجدول كما في مرجع التقرير.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض المؤشرات والملخص والجدول كما في مرجع التقرير.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-reports-inventory-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-reports-inventory-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-reports-inventory-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0064 — اختلاف شاشة تقرير الأرباح والخسائر

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Containers
- **Affected Screen IDs:** SCR-021
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-021
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/reports-profit-1280.png; docs/ux-inventory/screenshots/reference/screens/reports-profit-390.png; docs/ux-inventory/screenshots/reference/screens/reports-profit-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-profit-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-profit-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-profit-768.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** عرض المؤشرات ومخططات التحليل المرجعية بعد توحيد بيانات التقرير.
- **Actual Behavior:** المرجع يعرض مؤشرات ومخططات تحليلية؛ لقطة النظام تعرض نطاق تاريخ وحالة بلا بيانات. القيم غير قابلة للمقارنة.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة تقرير الأرباح والخسائر
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف شاشة تقرير الأرباح والخسائر: عرض المؤشرات ومخططات التحليل المرجعية بعد توحيد بيانات التقرير.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض المؤشرات ومخططات التحليل المرجعية بعد توحيد بيانات التقرير.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-reports-profit-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-reports-profit-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-reports-profit-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0065 — اختلاف شاشة تقرير المبيعات

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Containers
- **Affected Screen IDs:** SCR-020
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-020
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/reports-sales-1280.png; docs/ux-inventory/screenshots/reference/screens/reports-sales-390.png; docs/ux-inventory/screenshots/reference/screens/reports-sales-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-sales-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-sales-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-sales-768.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** جمع المرشحات والمؤشرات والمخطط والجداول في ترتيب المرجع.
- **Actual Behavior:** المرجع يجمع الفلاتر والمؤشرات والمخطط والجداول؛ النظام يعرض بحثًا وتاريخًا وقائمة فواتير.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة تقرير المبيعات
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف شاشة تقرير المبيعات: جمع المرشحات والمؤشرات والمخطط والجداول في ترتيب المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: جمع المرشحات والمؤشرات والمخطط والجداول في ترتيب المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-reports-sales-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-reports-sales-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-reports-sales-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0066 — اختلاف ترتيب نموذج إنشاء مرتجع المبيعات

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** SCR-013 — إنشاء مرتجع مبيعات جديد
- **Affected Screen IDs:** SCR-013
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** Not mapped; see 05_FEATURE_GAP_MATRIX.csv.
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/return-create-1280.png; docs/ux-inventory/screenshots/reference/screens/return-create-390.png; docs/ux-inventory/screenshots/reference/screens/return-create-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/return-create-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/return-create-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/return-create-768.png
- **Expected Behavior:** عرض مصدر المرتجع والعميل والبنود وتوزيع النموذج حسب المرجع.
- **Actual Behavior:** ترتيب أقسام مصدر المرتجع والعميل والبنود وتوزيع النموذج مختلف عن المرجع.
- **Exact Missing or Incorrect Detail:** اختلاف ترتيب نموذج إنشاء مرتجع المبيعات
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف ترتيب نموذج إنشاء مرتجع المبيعات: عرض مصدر المرتجع والعميل والبنود وتوزيع النموذج حسب المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض مصدر المرتجع والعميل والبنود وتوزيع النموذج حسب المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-return-create-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-return-create-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-return-create-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0067 — اختلاف شاشة المستخدمين والصلاحيات

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Administration
- **Affected Screen IDs:** SCR-022
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-041
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/users-1280.png; docs/ux-inventory/screenshots/reference/screens/users-390.png; docs/ux-inventory/screenshots/reference/screens/users-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/users-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/users-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/users-768.png; Runtime screenshot and click evidence in docs/ux-inventory; تصحيح Screen IDs: المستخدمون SCR-022، السلة SCR-029، السائقون SCR-032، سجل العمليات SCR-033، PWA SCR-067.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** عرض قائمة المستخدمين والصلاحيات وفق مرجع التصميم.
- **Actual Behavior:** المرجع يعرض قائمة مستخدمين وصلاحيات؛ لقطة النظام تركز على نموذج/بطاقة تفاصيل. قيم المستخدمين غير موحدة.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة المستخدمين والصلاحيات
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف شاشة المستخدمين والصلاحيات: عرض قائمة المستخدمين والصلاحيات وفق مرجع التصميم.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض قائمة المستخدمين والصلاحيات وفق مرجع التصميم.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-users-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-users-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-users-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0068 — اختلاف مواضع عناصر معاينة الطباعة

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** SCR-008 — معاينة الطباعة
- **Affected Screen IDs:** SCR-008
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** Not mapped; see 05_FEATURE_GAP_MATRIX.csv.
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/invoice-print-1280.png; docs/ux-inventory/screenshots/reference/screens/invoice-print-390.png; docs/ux-inventory/screenshots/reference/screens/invoice-print-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/invoice-print-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/invoice-print-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/invoice-print-768.png
- **Expected Behavior:** مطابقة توزيع بيانات المستند والورقة والعلامة المائية ببيانات الفاتورة نفسها.
- **Actual Behavior:** توزيع الورقة ومواضع بيانات المستند والعلامة المائية تختلف؛ اختلاف سجلات الفاتورة يمنع التحقق من المحتوى والأرقام.
- **Exact Missing or Incorrect Detail:** اختلاف مواضع عناصر معاينة الطباعة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** حالة/fixture متطابقة أو إتاحة محتوى لوحة المرجع.
- **Suggested Corrective Action:** اختلاف مواضع عناصر معاينة الطباعة: مطابقة توزيع بيانات المستند والورقة والعلامة المائية ببيانات الفاتورة نفسها.
- **Acceptance Criteria:** لقطة مرجع ونظام ناجحتان على بيانات موحدة، مع نتيجة مصنفة ومسنودة بالأدلة.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-invoice-print-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-invoice-print-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-invoice-print-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0069 — اختلاف موضع وحجم نافذة البحث الشامل

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** SCR-007 — إنشاء فاتورة مبيعات جديدة
- **Affected Screen IDs:** SCR-007
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** Not mapped; see 05_FEATURE_GAP_MATRIX.csv.
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/states/interaction-global-search-invoice-create-1280.png; docs/ux-inventory/screenshots/reference/states/interaction-global-search-invoice-create-768.png; docs/ux-inventory/screenshots/reference/states/interaction-global-search-invoice-create-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/states/interaction-global-search-invoice-create-1280.png; docs/ux-inventory/screenshots/system-mock/react/states/interaction-global-search-invoice-create-768.png; docs/ux-inventory/screenshots/system-mock/react/states/interaction-global-search-invoice-create-390.png
- **Expected Behavior:** فتح البحث كقائمة ضيقة متصلة بالشريط العلوي وفق المرجع.
- **Actual Behavior:** المرجع يفتح قائمة بحث ضيقة متصلة بشريط الرأس؛ التطبيق يفتح نافذة مركزية أعرض وتعتيمًا يغطي بقية الصفحة. / المرجع يفتح قائمة البحث قرب شريط الرأس؛ التطبيق يعرض نافذة بحث مركزية مع طبقة تعتيم. الخلفية هي صفحة إنشاء فاتورة في الطرفين.
- **Exact Missing or Incorrect Detail:** اختلاف موضع وحجم نافذة البحث الشامل
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف موضع وحجم نافذة البحث الشامل: فتح البحث كقائمة ضيقة متصلة بالشريط العلوي وفق المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: فتح البحث كقائمة ضيقة متصلة بالشريط العلوي وفق المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/global-search-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/global-search-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/global-search-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0070 — تفاصيل الطلب لم تصل إلى حالة قابلة للمقارنة

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Inventory
- **Affected Screen IDs:** SCR-005
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-009
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/order-detail-1280.png; docs/ux-inventory/screenshots/reference/screens/order-detail-390.png; docs/ux-inventory/screenshots/reference/screens/order-detail-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/order-detail-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/order-detail-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/order-detail-768.png; Source contains the partial flow identified in gap register; runtime unverified.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** عرض تفاصيل الطلب المعتمد وحالته وبنوده كما في مرجع الشاشة.
- **Actual Behavior:** الصورة تعرض حالة تحقق/تحميل بدل التفاصيل، لكن الالتقاط انتظر 350ms فقط وسجل الطلب غير موحد؛ النتيجة غير محسومة.
- **Exact Missing or Incorrect Detail:** تفاصيل الطلب لم تصل إلى حالة قابلة للمقارنة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** حالة/fixture متطابقة أو إتاحة محتوى لوحة المرجع.
- **Suggested Corrective Action:** تفاصيل الطلب لم تصل إلى حالة قابلة للمقارنة: عرض تفاصيل الطلب المعتمد وحالته وبنوده كما في مرجع الشاشة.
- **Acceptance Criteria:** لقطة مرجع ونظام ناجحتان على بيانات موحدة، مع نتيجة مصنفة ومسنودة بالأدلة.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-order-detail-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-order-detail-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-order-detail-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0071 — محتوى لوحة الإشعارات لم يقارن ببيانات موحدة

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** SCR-007 — إنشاء فاتورة مبيعات جديدة
- **Affected Screen IDs:** SCR-007
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** Not mapped; see 05_FEATURE_GAP_MATRIX.csv.
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/states/interaction-notifications-invoice-create-1280.png; docs/ux-inventory/screenshots/reference/states/interaction-notifications-invoice-create-768.png; docs/ux-inventory/screenshots/reference/states/interaction-notifications-invoice-create-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/states/interaction-notifications-invoice-create-1280.png; docs/ux-inventory/screenshots/system-mock/react/states/interaction-notifications-invoice-create-768.png; docs/ux-inventory/screenshots/system-mock/react/states/interaction-notifications-invoice-create-390.png
- **Expected Behavior:** مطابقة محتوى الإشعارات وارتفاع اللوحة بعد توفير نفس fixture في الطرفين.
- **Actual Behavior:** تم فتح اللوحة بالنقر في الطرفين. المرجع يعرض إشعارات تجريبية والنظام يعرض حالة فارغة؛ مجموعة البيانات غير موحدة، لذلك محتوى اللوحة وارتفاعها غير محسومين. موضع الفتح قابل للمشاهدة فقط.
- **Exact Missing or Incorrect Detail:** محتوى لوحة الإشعارات لم يقارن ببيانات موحدة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** حالة/fixture متطابقة أو إتاحة محتوى لوحة المرجع.
- **Suggested Corrective Action:** محتوى لوحة الإشعارات لم يقارن ببيانات موحدة: مطابقة محتوى الإشعارات وارتفاع اللوحة بعد توفير نفس fixture في الطرفين.
- **Acceptance Criteria:** لقطة مرجع ونظام ناجحتان على بيانات موحدة، مع نتيجة مصنفة ومسنودة بالأدلة.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/notifications-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/notifications-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/notifications-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0023 — فرق token الخط الأساسي

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P3
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** See screen and feature inventory.
- **Affected Screen IDs:** كل الشاشات
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-001–F-044
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** See source and screen inventory references in the feature matrix.
- **Expected Behavior:** توافق المقاس المحسوب مع التصميم المعتمد.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** فرق token الخط الأساسي
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** حسم إصدار الواجهة المعتمد.
- **Suggested Corrective Action:** فرق token الخط الأساسي: توافق المقاس المحسوب مع التصميم المعتمد.
- **Acceptance Criteria:** مقاس المصدر المعتمد متحقق على عناصر نموذجية.
- **Recommended Verification Method:** browser computed style ولقطات عند viewport ثابت.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0024 — عرض الشريط الجانبي مختلف

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P3
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** See screen and feature inventory.
- **Affected Screen IDs:** كل الشاشات الرئيسية
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-001–F-044
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** See source and screen inventory references in the feature matrix.
- **Expected Behavior:** عرض يطابق مصدر التصميم المعتمد.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** عرض الشريط الجانبي مختلف
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** اعتماد 240 أم 248 كقيمة نهائية.
- **Suggested Corrective Action:** عرض الشريط الجانبي مختلف: عرض يطابق مصدر التصميم المعتمد.
- **Acceptance Criteria:** computed width يطابق القيمة المعتمدة على desktop.
- **Recommended Verification Method:** لقطة متطابقة وقياس DOM بعد render.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0025 — ارتفاع الشريط العلوي مختلف

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P3
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** See screen and feature inventory.
- **Affected Screen IDs:** كل الشاشات الرئيسية
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-001–F-044
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** See source and screen inventory references in the feature matrix.
- **Expected Behavior:** تطابق ارتفاع الرأس مع design baseline المعتمد.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** ارتفاع الشريط العلوي مختلف
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** اعتماد baseline النهائي.
- **Suggested Corrective Action:** ارتفاع الشريط العلوي مختلف: تطابق ارتفاع الرأس مع design baseline المعتمد.
- **Acceptance Criteria:** الارتفاع المحسوب يطابق المرجع النهائي ولا يقص محتوى.
- **Recommended Verification Method:** تصوير DOM عند viewport نفسه.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0026 — سلم radius مختلف

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P3
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** See screen and feature inventory.
- **Affected Screen IDs:** كل البطاقات والأزرار والمودالات
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-001–F-044
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** See source and screen inventory references in the feature matrix.
- **Expected Behavior:** زوايا المكونات توافق قيم design baseline.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** سلم radius مختلف
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** اعتماد مصدر القيم.
- **Suggested Corrective Action:** سلم radius مختلف: زوايا المكونات توافق قيم design baseline.
- **Acceptance Criteria:** computed radius للمكونات النموذجية يطابق المرجع المعتمد.
- **Recommended Verification Method:** browser computed style وصور للمكونات عند حالة ثابتة.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0072 — اختلاف تكوين تفاصيل الفاتورة

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for visible layout; status and record-state difference are not resolved.
- **Affected Module:** الفواتير
- **Affected Screen IDs:** SCR-031
- **Affected Element IDs:** عناصر تفاصيل الفاتورة؛ لم يُنشأ جرد مستقل لكل زر في هذه الجولة.
- **Related Feature IDs:** F-010
- **Related Flow IDs:** FLOW-003; لم يُختبر مسار الحفظ أو التحصيل.
- **Design Reference:** لقطات فتح تفاصيل الفاتورة بالنقر من صف مرجعي: docs/ux-inventory/screenshots/reference/row-click-details/invoice-detail-{1280,768,390}.png.
- **Current System Evidence:** النقر من قائمة النظام يفتح /invoices/:documentId عند المقاسات الثلاثة؛ docs/ux-inventory/screenshots/system-mock/react/visual-round7/invoice-detail-{1280,768,390}.png؛ المقارنات docs/ux-inventory/screenshots/comparisons/row-click-details/scr-031-{1280,768,390}-side-by-side.png.
- **Expected Behavior:** عرض بيانات الفاتورة ثم بنودها وجدول المدفوعات المرتبطة والمخزن، مع ترتيب إجراءات المرجع.
- **Actual Behavior:** يعرض النظام بيانات الفاتورة وبطاقات الإجمالي والمدفوع والمتبقي، ثم رسالة أن تفاصيل الأصناف غير متاحة وكتلة سجل تعديلات. المرجع يعرض سطر صنف ومدفوعة مرتبطة ومخزنًا. حالة المرجع «مدفوعة جزئيًا» وحالة النظام «صادرة» رغم تطابق بعض قيم العينة.
- **Exact Missing or Incorrect Detail:** ترتيب المحتوى مختلف، وبيانات بنود الفاتورة/الدفعة/المخزن غير ظاهرة في واجهة النظام لهذه العينة؛ نص الحالة مختلف ويحتاج توحيد fixture قبل تفسيره كخلل وظيفي.
- **Why This Is a Gap:** لقطات المقاسات الثلاثة تبين تكوينًا مختلفًا بوضوح؛ الأرقام المتطابقة لا تثبت تطابق البيانات أو حفظ العمليات.
- **User Impact:** يصعب مراجعة الصنف والمدفوعات والمخزن من شاشة التفاصيل بالطريقة المعروضة في المرجع.
- **Business Impact:** لا يُستنتج أثر محاسبي؛ حالة المستند تحتاج تحققًا ببيانات موحدة.
- **Technical Impact:** يلزم إكمال عرض البيانات وربط التخطيط بالمراجع المناسبة بعد التحقق من توفر بيانات العينة.
- **Root Cause:** Unknown؛ طبقة API/قاعدة البيانات لم تُختبر.
- **Dependencies:** fixture موحد لحالة الفاتورة وبنودها ومدفوعاتها ومخزنها.
- **Suggested Corrective Action:** مطابقة توزيع قسم البيانات وبنود الفاتورة والمدفوعات المرتبطة والمخزن مع المرجع، ثم توحيد حالة العينة قبل الحكم على الحالة الوظيفية.
- **Acceptance Criteria:** على البيانات نفسها تظهر بيانات الفاتورة وسطر الصنف والمدفوعات والمخزن بالترتيب المرجعي عند 1280 و768 و390، وتعرض حالة مستند واحدة متسقة مع مصدرها.
- **Recommended Verification Method:** إعادة فتح الفاتورة بالنقر من القائمة والتقاط المقاسات الثلاثة على fixture موحد؛ تحقق من الاستجابة الفعلية للبيانات دون اعتماد Toast وحده.
- **Implementation Complexity:** Medium
- **Open Questions:** هل حالة «صادرة» في النظام تمثل حالة غير مسددة أم أن عينة النظام لم تُحمّل دفعتها؟ لا يمكن حسمه من MSW.

## GAP-0073 — تفاصيل حركة المخزون لا تفتح من السجل

- **Category:** MISSING_SCREEN
- **Priority:** P2
- **Confidence:** High for the current React/MSW UI route and the tested row controls; backend support is not verified.
- **Affected Module:** المخزون
- **Affected Screen IDs:** SCR-053
- **Affected Element IDs:** مرجع الحركة في صف السجل؛ لا يوجد عنصر تفاعلي في الصف الحالي.
- **Related Feature IDs:** F-016
- **Related Flow IDs:** FLOW-004
- **Design Reference:** تفاصيل الحركة المفتوحة بنقرة مرئية من سجل المرجع: docs/ux-inventory/screenshots/reference/row-click-details/movement-detail-{1280,768,390}.png.
- **Current System Evidence:** النظام يعرض /inventory/movements عبر رابط بحث مرئي؛ صفوف الجدول بلا link/button/role=button عند 1280 و768 و390. نقر الصف على 1280 لا يغير المسار، وتعذر locator click عند 768 و390. الأدلة: docs/ux-inventory/SYSTEM_MOVEMENT_CLICK_REVIEW.json وصور النظام وside-by-side ضمن docs/ux-inventory/screenshots/comparisons/row-click-details/.
- **Expected Behavior:** اختيار مرجع الحركة يفتح شاشة تفاصيل تعرض المرجع المرتبط ونوع الحركة والصنف والمخزن والكمية والتاريخ.
- **Actual Behavior:** لا توجد شاشة تفاصيل أو وسيلة تفاعل في صفوف السجل في واجهة React المرصودة؛ النقر لا ينقل إلى مسار آخر.
- **Exact Missing or Incorrect Detail:** غياب رابط/إجراء مرجع الحركة، ومسار أو شاشة تفاصيل الحركة.
- **Why This Is a Gap:** سلوك المرجع يؤكد فتح التفاصيل من صف حركة، بينما فحص DOM والنقر في النظام يثبت بقاء المستخدم في قائمة الحركات.
- **User Impact:** لا يستطيع المستخدم مراجعة مصدر الحركة وتفاصيلها من السجل.
- **Business Impact:** لا يُفترض فقدان بيانات أو غياب دعم backend؛ تم تأكيد غياب واجهة التفاصيل فقط.
- **Technical Impact:** يلزم تحديد وجهة تفاصيل مرتبطة بمعرّف الحركة وإضافة عنصر تنقل مع حالات تحميل/خطأ/عودة.
- **Root Cause:** Confirmed for UI absence; backend support unknown.
- **Dependencies:** تحديد معرف الحركة والوجهة من API قبل التنفيذ.
- **Suggested Corrective Action:** أضف عنصرًا قابلًا للوحة المفاتيح في مرجع الصف يفتح تفاصيل الحركة، مع رجوع واضح وحالة عدم وجود الحركة.
- **Acceptance Criteria:** من أي صف ذي مرجع يمكن فتح صفحة التفاصيل بالنقر والكيبورد في desktop/mobile، وتعرض بيانات الحركة الصحيحة، ويمكن الرجوع للقائمة دون فقد المرشحات.
- **Recommended Verification Method:** تحقق من عناصر DOM ثم اختبر النقر والكيبورد عند 1280 و768 و390 على بيانات اصطناعية؛ تحقق من تفاصيل الصف المعروض.
- **Implementation Complexity:** Medium
- **Open Questions:** ما معرف الحركة المستقر الذي يعيده API؟ لم يُختبر backend.
