# تقرير المرحلة 4: تدفقات المالية والتحصيل

## الحالة

اكتملت الفجوات الثماني: GAP-0011 وGAP-0012 وGAP-0013 وGAP-0014 وGAP-0015 وGAP-0016 وGAP-0029 وGAP-0040.

| الفجوة | الحالة والنتيجة | الملفات المعدلة | الاختبارات |
|---|---|---|---|
| GAP-0029 | DONE — شاشة المالية مرتبة بحسب المرجع وتتكيف مع الهاتف والحاسوب. | `frontend/src/features/finance/FinancePage.tsx`، `frontend/src/styles/global.css`، `frontend/e2e/finance-planning.spec.ts` | T4: ترتيب الروابط ولقطتا العرضين؛ ناجح، اختبار واحد. |
| GAP-0040 | DONE — المؤشرات ثم المستحقات ثم الدفعات؛ تسجيل التحصيل والتخصيص والعكس محفوظ في الداتابيز. | `backend/app/Http/Controllers/SalesController.php`، `backend/app/Services/SalesService.php`، `backend/routes/api_v1.php`، `frontend/src/features/sales/CollectionsPage.tsx`، `frontend/tests/integration/collections-page.test.tsx` | T1 وT3 وT4: اختبارات API والمكون وتدفق المتصفح؛ كلها ناجحة. |
| GAP-0011 | DONE — المصادر والاستحقاق والحالة والاستلام الجزئي محفوظة؛ المبلغ المتوقع مفصول عن الفعلي. | `backend/database/migrations/2026_10_30_000005_create_finance_planning_workflows.php`، `backend/database/migrations/2026_10_30_000006_make_finance_receipt_entries_linkable_after_creation.php`، `backend/app/Models/PendingFund.php`، `backend/app/Http/Controllers/FinancialPlanningController.php`، `backend/app/Services/FinancialPlanningService.php`، `backend/app/Policies/FinancialPlanningPolicy.php`، `frontend/src/features/finance/FinancialPlanningPages.tsx`، `frontend/src/features/finance/financialPlanningApi.ts` | T1 وT3 وT4: حفظ واستلام جزئي ومصدر التوقع؛ كلها ناجحة. |
| GAP-0012 | DONE — الخطة تولد أقساطاً، وتوزع الدفعات FIFO، وتحدّث الأرصدة والحالات. | `backend/database/migrations/2026_10_30_000005_create_finance_planning_workflows.php`، `backend/app/Models/PartnerInstallmentPlan.php`، `backend/app/Models/PartnerInstallment.php`، `backend/app/Services/FinancialPlanningService.php`، `backend/app/Http/Controllers/FinancialPlanningController.php`، `frontend/src/features/finance/FinancialPlanningPages.tsx`، `frontend/src/features/finance/financialPlanningApi.ts` | T1 وT3 وT4: خطة من ثلاثة أقساط وتسجيل دفعة فعلية؛ كلها ناجحة. |
| GAP-0013 | DONE — ميزانية شهرية لكل تصنيف مع الفعلي المرحّل والفرق والاستخدام. | `backend/database/migrations/2026_10_30_000005_create_finance_planning_workflows.php`، `backend/app/Models/ExpenseBudget.php`، `backend/app/Services/FinancialPlanningService.php`، `backend/app/Http/Controllers/FinancialPlanningController.php`، `frontend/src/features/finance/FinancialPlanningPages.tsx`، `frontend/src/features/finance/financialPlanningApi.ts` | T1 وT3 وT4: حفظ الميزانية ومقارنتها؛ كلها ناجحة. |
| GAP-0014 | DONE — قالب وجدولة يومية مع استحقاق واحد فريد لكل دورة، وإيقاف بسجل تدقيق. | `backend/database/migrations/2026_10_30_000005_create_finance_planning_workflows.php`، `backend/app/Models/RecurringExpenseTemplate.php`، `backend/app/Models/RecurringExpenseOccurrence.php`، `backend/app/Services/FinancialPlanningService.php`، `backend/app/Console/Commands/MaterializeRecurringExpenses.php`، `backend/routes/console.php`، `frontend/src/features/finance/FinancialPlanningPages.tsx` | T1 وT3 وT4: تشغيل المجدول مرتين؛ الجولة الثانية أنشأت صفر استحقاقات جديدة. |
| GAP-0015 | DONE — القيم الصفرية والفترات الخالية تنتج فرقاً صفرياً ونسبة `null`. | `backend/app/Support/FinancialComparisonMath.php`، `backend/app/Services/FinancialPlanningService.php`، `backend/tests/Unit/FinancialComparisonMathTest.php`، `frontend/src/features/finance/FinancialPlanningPages.tsx` | T2 وT3 وT4: 5 assertions حسابية وطلب المقارنة من المتصفح؛ كلها ناجحة. |
| GAP-0016 | DONE — التوقع يجمع الرصيد والتدفقات الفعلية والمصادر المتوقعة والميزانية أسبوعياً. | `backend/app/Services/FinancialPlanningService.php`، `backend/app/Http/Controllers/FinancialPlanningController.php`، `frontend/src/features/finance/FinancialPlanningPages.tsx`، `frontend/src/features/finance/financialPlanningApi.ts`، `frontend/e2e/finance-planning.spec.ts` | T1 وT3 وT4: اختبار حساب المصدر والاستحقاق والرصيد؛ كلها ناجحة. |

## الملفات الرئيسية

- الباك: `backend/database/migrations/2026_10_30_000005_create_finance_planning_workflows.php` و`2026_10_30_000006_make_finance_receipt_entries_linkable_after_creation.php`، نماذج التخطيط المالي، `FinancialPlanningService`، `FinancialPlanningController`، `FinancialPlanningPolicy`، أمر `finance:recurring-expenses:materialize`، مسارات API والجدولة، وصلاحيات الأدوار.
- التحصيل: تحديث `SalesService` و`SalesController` لملخص التحصيل والتخصيص والعكس.
- الواجهة: `FinancePage.tsx` و`FinancialPlanningPages.tsx` و`financialPlanningApi.ts` و`CollectionsPage.tsx` ومسارات `App.tsx` وتنسيقات RTL المتجاوبة.
- التحقق: `FinancialPlanningApiTest.php` و`FinancialComparisonMathTest.php` واختبارات React للتخطيط المالي والتحصيل و`e2e/finance-planning.spec.ts`.
- بيانات القبول مخصصة لقاعدة `erp_acceptance_tests` في `FinanceWorkflowAcceptanceSeeder.php`. الـseeder يرفض العمل على قاعدة أخرى.

## الاختبارات

شُغلت اختبارات Laravel بالتتابع على MariaDB لتجنب تعارض بذور الأدوار المشتركة:

| الرمز | الأمر | النتيجة |
|---|---|
| T1 | `php artisan test --filter=FinancialPlanningApiTest` | ناجح: 5 اختبارات، 65 assertion. يشمل المال المنتظر والتوقع، الدفعات الجزئية، خطط الأقساط، ميزانيات المصروفات، جدولة الاستحقاقات مرة واحدة، والتحصيل والتخصيص والعكس. |
| T2 | `php artisan test --filter=FinancialComparisonMathTest` | ناجح: اختبار واحد، 5 assertions للقيم الصفرية والفترات الخالية. |
| T3 | `npm test -- --run tests/integration/financial-planning.test.tsx tests/integration/collections-page.test.tsx` | ناجح: ملفان، 4 اختبارات مكونات. |
| T4 | `npm exec playwright test -- --config=playwright.config.ts e2e/finance-planning.spec.ts` | ناجح: تدفق Chromium واحد على Laravel وMariaDB الحقيقيين، `1 passed`. |
| — | `npm run typecheck` | ناجح. |

أمر Playwright شُغل مع PHP 8.3 و`DB_CONNECTION=mysql_test` و`DB_DATABASE=erp_acceptance_tests` و`APP_ENV=testing` و`CACHE_STORE=array`، مع Edge Chromium المثبت محلياً. إعداد الاختبار يرفع مهلة بدء خادم Laravel إلى 90 ثانية ويشغّل بذر القبول المخصص تلقائياً.

## المشي على الشاشة ونتيجة قاعدة البيانات

نفذ المتصفح الدخول بحساب مالك الاختبار، وفحص ترتيب شاشة المالية على الحاسوب والهاتف، ثم أنشأ مبلغاً منتظراً واستلم جزءاً منه، وأنشأ خطة أقساط وسجل دفعة، وحفظ ميزانية، وأنشأ قالب مصروف متكرر. شغّل أمر الجدولة مرتين للفترة نفسها: الجولة الأولى أنشأت الاستحقاق، والثانية أنشأت `0` استحقاق إضافي. بعدها فحص مصادر توقع السيولة، وقارن فترتين صفريتين، وأنشأ تحصيلاً وخصصه ثم عكس جزءاً من التخصيص.

بعد الجولة، أثبت استعلام القراءة أن قاعدة البيانات المختارة هي `erp_acceptance_tests`. من السجلات الفعلية الأحدث:

- مبلغ منتظر: `120.0000`، المستلم `20.0000`، الحالة `partially_received`، والمتبقي `100.0000` بتاريخ `2027-01-06`.
- خطة أقساط: الإجمالي `90.0000`، ثلاثة أقساط، والمدفوع `10.0000`؛ سجل الدفعة وحالة القسط محفوظان.
- ميزانية تصنيف: `200.0000` لفترة `2027-01-01`.
- قالب المصروف الاختباري له استحقاق واحد لفترة `2027-01-01`؛ وعدد دورات القالب المكررة في قاعدة القبول `0`.
- إيصال التحصيل: `40.0000`، تخصيصان، عكس واحد، صافي تخصيص فعّال `35.0000` والمتبقي غير المخصص `5.0000`.
- قاعدة القبول احتوت وقت الفحص على 92 حركة خزينة و571 سجل تدقيق. اختبارات API تحققت من بقاء المال المنتظر خارج التدفق النقدي الفعلي قبل تسجيل الاستلام، ومن ظهور رصيده المتبقي كمصدر مستقل في التوقع.

## لقطات الشاشة

حفظ Playwright اللقطات بعد اكتمال تحميل البيانات، ومرر شاشة الهاتف إلى عنوان قسم الترتيب قبل الالتقاط:

- [المالية على الحاسوب](screenshots/finance-hierarchy-desktop.png)
- [المالية على الهاتف](screenshots/finance-hierarchy-mobile.png)
- [استلام مال منتظر](screenshots/pending-funds-received.png)
- [دفعة قسط شريك](screenshots/partner-installments-paid.png)
- [ميزانية المصروفات](screenshots/expense-budgets.png)
- [استحقاق المصروف المتكرر](screenshots/recurring-expense-once-per-cycle.png)
- [توقع السيولة الأسبوعي](screenshots/cash-forecast-weeks.png)
- [مقارنة فترة صفرية](screenshots/monthly-comparison-zero-period.png)
- [التخصيص وعكسه في التحصيل](screenshots/collections-allocation-reversal.png)
