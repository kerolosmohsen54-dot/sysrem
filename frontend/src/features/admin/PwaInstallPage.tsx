import { useEffect, useState } from 'react';
import { ar } from '../../shared/i18n/ar';
import { clearDeferredInstallPrompt, getDeferredInstallPrompt, type InstallPromptEvent } from './pwaInstallStore';

export function PwaInstallPage() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(() => getDeferredInstallPrompt());
  const [installed, setInstalled] = useState(() =>
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
  );
  const [message, setMessage] = useState('');
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const securePage = window.isSecureContext;

  useEffect(() => {
    const available = () => setInstallEvent(getDeferredInstallPrompt());
    const complete = () => { setInstalled(true); setInstallEvent(null); };
    window.addEventListener('pwa-install-ready', available);
    window.addEventListener('pwa-install-complete', complete);
    return () => {
      window.removeEventListener('pwa-install-ready', available);
      window.removeEventListener('pwa-install-complete', complete);
    };
  }, []);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setMessage(choice.outcome === 'accepted' ? 'بدأ تثبيت التطبيق.' : 'تم إلغاء التثبيت. يمكنك المحاولة مرة أخرى.');
    clearDeferredInstallPrompt();
    setInstallEvent(null);
  };

  return <section className="page inventory-page">
    <header className="page-heading"><div><h1>تثبيت كتطبيق</h1><p>أيقونة على شاشة الموبايل للوصول السريع.</p></div></header>
    <article className="summary-card">
      {installed ? <p className="inline-success" role="status">البرنامج مثبّت ويعمل كتطبيق ✓</p> : <>
        <h2>{ar.app.name}</h2>
        <p>ثبّت النظام كتطبيق مستقل على الجهاز.</p>
        <button className="button button-primary" disabled={!installEvent || !securePage} onClick={() => void install()} type="button">📲 تثبيت التطبيق</button>
      </>}
      {message && <p role="status">{message}</p>}
    </article>
    {!securePage && <p className="inline-alert">التثبيت يحتاج فتح النظام من رابط آمن HTTPS، أو من localhost أثناء التطوير.</p>}
    <section className="dashboard-panel"><h2>لو الزر مش شغال</h2>
      {isIos ? <p>على iPhone أو iPad في Safari: اضغط زر المشاركة ثم اختر «إضافة إلى الشاشة الرئيسية».</p> : <p>على Android في Chrome: افتح قائمة ⋮ ثم اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية». في متصفحات الحاسوب استخدم أيقونة التثبيت بجانب شريط العنوان إذا ظهرت.</p>}
      <p className="page-note">يعمل التثبيت عبر HTTPS مع ملفات manifest وsw.js والأيقونات المرفقة. فتح ملفات الموقع مباشرة من الجهاز لا يدعم التثبيت.</p>
    </section>
  </section>;
}
