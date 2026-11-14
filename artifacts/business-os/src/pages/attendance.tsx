import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Camera, CheckCircle2, Clock3, MapPin, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell.legacy';

type GeoPoint = { latitude: number; longitude: number };
type AttendanceSite = GeoPoint & { radius: number; label: string };
type AttendanceRecord = {
  id: string;
  employee: string;
  date: string;
  checkInAt: string;
  checkOutAt?: string;
  checkInLocation: GeoPoint;
  checkOutLocation?: GeoPoint;
  selfie: string;
  checkOutSelfie?: string;
  status: 'Present' | 'Late';
};
const SITE_KEY = 'business-sutra-attendance-site-v1';
const RECORDS_KEY = 'business-sutra-attendance-records-v1';

function distanceMetres(a: GeoPoint, b: GeoPoint) {
  const rad = (n: number) => n * Math.PI / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please select an image.'));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read selfie.'));
    reader.readAsDataURL(file);
  });
}
function getLocation(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location is not supported by this browser.'));
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => reject(new Error(error.code === 1 ? 'Allow location permission to continue.' : 'Could not get your location. Try again outside or check GPS.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}
function readSite(): AttendanceSite | null {
  try { return JSON.parse(localStorage.getItem(SITE_KEY) || 'null') as AttendanceSite | null; } catch { return null; }
}
function readRecords(): AttendanceRecord[] {
  try { const value = JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
}

export default function Attendance() {
  const [site, setSite] = useState<AttendanceSite | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employee, setEmployee] = useState('');
  const [siteLabel, setSiteLabel] = useState('Main branch');
  const [radius, setRadius] = useState('100');
  const [selfie, setSelfie] = useState('');
  const [busy, setBusy] = useState(false);
  const today = new Date().toLocaleDateString('en-CA');

  useEffect(() => { setSite(readSite()); setRecords(readRecords()); }, []);
  useEffect(() => { localStorage.setItem(RECORDS_KEY, JSON.stringify(records)); }, [records]);

  const todaysRecord = useMemo(() => records.find((r) => r.date === today && r.employee.trim().toLowerCase() === employee.trim().toLowerCase()), [records, today, employee]);
  const checkedIn = !!todaysRecord?.checkInAt && !todaysRecord.checkOutAt;

  async function configureSite() {
    setBusy(true);
    try {
      const point = await getLocation();
      const next = { ...point, radius: Math.max(25, Math.min(1000, Number(radius) || 100)), label: siteLabel.trim() || 'Main branch' };
      localStorage.setItem(SITE_KEY, JSON.stringify(next));
      setSite(next);
      toast.success('Branch location saved on this device');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save location'); }
    finally { setBusy(false); }
  }

  async function onSelfie(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try { setSelfie(await readPhoto(file)); toast.success('Selfie attached'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not attach selfie'); }
    event.target.value = '';
  }

  async function markAttendance() {
    if (!employee.trim()) return toast.error('Enter your employee name first.');
    if (!site) return toast.error('Ask your manager to set the branch location first.');
    if (!selfie) return toast.error('Take or upload a selfie to continue.');
    setBusy(true);
    try {
      const current = await getLocation();
      const distance = distanceMetres(site, current);
      if (distance > site.radius) return toast.error(`You are ${Math.round(distance)}m away. Attendance is allowed within ${site.radius}m of ${site.label}.`);
      const now = new Date();
      if (checkedIn && todaysRecord) {
        setRecords((old) => old.map((r) => r.id === todaysRecord.id ? { ...r, checkOutAt: now.toISOString(), checkOutLocation: current, checkOutSelfie: selfie } : r));
        toast.success('Check-out saved');
      } else {
        const record: AttendanceRecord = {
          id: crypto.randomUUID(),
          employee: employee.trim(),
          date: today,
          checkInAt: now.toISOString(),
          checkInLocation: current,
          selfie,
          status: now.getHours() >= 10 ? 'Late' : 'Present',
        };
        setRecords((old) => [record, ...old]);
        toast.success('Check-in saved');
      }
      setSelfie('');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not verify location'); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 pb-28 sm:px-6 sm:py-8 lg:px-9 lg:pb-10">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">People operations</p><h2 className="mt-1 text-2xl font-semibold tracking-[-0.045em]">Attendance</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">GPS-based check-in and check-out with selfie evidence.</p></div>
        <span className="inline-flex items-center gap-2 self-start rounded-full bg-[hsl(var(--accent)/0.14)] px-3 py-2 text-xs font-semibold text-[hsl(var(--accent-foreground))]"><MapPin className="size-3.5" /> {site ? site.label + ' · ' + site.radius + 'm' : 'Branch location not set'}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:p-6">
          <div className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent-foreground))]"><Clock3 className="size-5" /></span><div><h3 className="font-semibold">Employee check-in</h3><p className="text-xs text-[hsl(var(--muted-foreground))]">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div></div>
          <label className="mb-4 grid gap-2 text-sm font-semibold">Employee name<input value={employee} onChange={(e) => setEmployee(e.target.value)} placeholder="Enter your name" className="min-h-12 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm font-normal" /></label>
          <div className="mb-4 rounded-xl border border-dashed border-[hsl(var(--border))] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {selfie ? <img src={selfie} alt="Attendance selfie preview" className="size-20 rounded-xl object-cover" /> : <span className="grid size-20 place-items-center rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"><Camera className="size-6" /></span>}
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Selfie verification</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Use your device camera. A selfie is required for each check-in and check-out.</p><label className="mt-3 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-[hsl(var(--border))] px-3 text-xs font-semibold"><Camera className="size-4" /> Take selfie<input type="file" accept="image/*" capture="user" onChange={onSelfie} className="sr-only" /></label></div>
            </div>
          </div>
          {todaysRecord && <div className="mb-4 flex items-center gap-2 rounded-xl bg-[hsl(var(--muted)/0.55)] p-3 text-xs"><CheckCircle2 className="size-4 text-[hsl(var(--chart-2))]" /> Checked in at {new Date(todaysRecord.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{todaysRecord.checkOutAt ? ' · Checked out at ' + new Date(todaysRecord.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>}
          <button type="button" onClick={markAttendance} disabled={busy || !site} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Verifying…' : checkedIn ? 'Check out' : 'Check in'}</button>
        </section>

        <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:p-6">
          <div className="mb-4"><h3 className="font-semibold">Branch geofence setup</h3><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">A manager should set this while physically at the branch. Employees can check in only within this radius.</p></div>
          <label className="mb-3 grid gap-2 text-sm font-semibold">Branch name<input value={siteLabel} onChange={(e) => setSiteLabel(e.target.value)} className="min-h-11 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm font-normal" /></label>
          <label className="mb-4 grid gap-2 text-sm font-semibold">Allowed radius (metres)<input type="number" min="25" max="1000" value={radius} onChange={(e) => setRadius(e.target.value)} className="min-h-11 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm font-normal" /></label>
          <button type="button" onClick={configureSite} disabled={busy} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] px-4 text-sm font-semibold disabled:opacity-50"><MapPin className="size-4" /> Save this device's current location</button>
          {site && <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">Saved: {site.latitude.toFixed(5)}, {site.longitude.toFixed(5)} · {site.radius}m radius</p>}
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between"><div><h3 className="font-semibold">Attendance history</h3><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Records stored in this browser on this device.</p></div><span className="rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-xs font-semibold">{records.length} records</span></div>
        {records.length === 0 ? <div className="rounded-xl border border-dashed border-[hsl(var(--border))] px-4 py-10 text-center text-sm text-[hsl(var(--muted-foreground))]">No attendance records yet.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]"><th className="px-3 py-3 font-semibold">Employee</th><th className="px-3 py-3 font-semibold">Date</th><th className="px-3 py-3 font-semibold">Check in</th><th className="px-3 py-3 font-semibold">Check out</th><th className="px-3 py-3 font-semibold">Status</th></tr></thead><tbody>{records.map((r) => <tr key={r.id} className="border-b border-[hsl(var(--border)/0.7)]"><td className="px-3 py-3 font-medium">{r.employee}</td><td className="px-3 py-3">{r.date}</td><td className="px-3 py-3">{new Date(r.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td><td className="px-3 py-3">{r.checkOutAt ? new Date(r.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td><td className="px-3 py-3">{r.status}</td></tr>)}</tbody></table></div>}
      </section>
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-[hsl(var(--chart-4)/0.4)] bg-[hsl(var(--chart-4)/0.08)] p-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]"><ShieldAlert className="mt-0.5 size-4 shrink-0" /><p><strong className="text-[hsl(var(--foreground))]">Prototype limitation:</strong> This first version stores branch coordinates, selfies and attendance in this browser only. It is useful for a supervised trial, but is not tamper-resistant or shared between devices. Production attendance needs employee login, server-side geofence validation, secure photo storage, consent and audit logs.</p></div>
    </div>
  );
}
