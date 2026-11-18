import { useMemo, useState } from 'react';
import { Mail, Phone, UserRound, Edit3, ShieldCheck } from 'lucide-react';
import { useBusiness } from '@/hooks/use-workspace';
import { AddButton, DeleteButton, EmptyState, inputClass, PageFrame, PageIntro, SearchField, SectionCard } from '@/components/record-ui';
import type { TeamMember, TeamRole } from '@/domain/types';

const blank: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'> = { name: '', email: '', phone: '', role: 'Staff', department: '', status: 'Active' };

export default function Team() {
  const { state, saveTeamMember, deleteTeamMember } = useBusiness();
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState('');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [error, setError] = useState('');
  const members = useMemo(() => state.teamMembers.filter((member) => (filter === 'All' || member.status === filter) && `${member.name} ${member.email} ${member.phone} ${member.department} ${member.role}`.toLowerCase().includes(search.toLowerCase())), [filter, search, state.teamMembers]);
  const activeCount = state.teamMembers.filter((member) => member.status === 'Active').length;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      saveTeamMember({ ...form, name: form.name.trim(), email: form.email.trim(), id: editingId || undefined });
      setForm({ ...blank }); setEditingId(''); setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save team member.');
    }
  };
  const edit = (member: TeamMember) => {
    setEditingId(member.id);
    setForm({ name: member.name, email: member.email, phone: member.phone, role: member.role, department: member.department, status: member.status });
    setOpen(true);
    setError('');
  };
  return <PageFrame>
    <PageIntro eyebrow="People operations" title="Team directory" description="Maintain your team roster, contact details, departments and internal role labels." action={<AddButton label="Add team member" onClick={() => { setForm({ ...blank }); setEditingId(''); setOpen(true); setError(''); }} />} />
    <div className="mb-4 grid grid-cols-2 gap-3"><SectionCard><p className="text-xs text-[hsl(var(--muted-foreground))]">Total members</p><p className="mt-2 text-2xl font-semibold">{state.teamMembers.length}</p></SectionCard><SectionCard><p className="text-xs text-[hsl(var(--muted-foreground))]">Active members</p><p className="mt-2 text-2xl font-semibold">{activeCount}</p></SectionCard></div>
    {open && <SectionCard className="mb-4"><div className="mb-4 flex items-center gap-2"><UserRound className="size-4"/><h3 className="text-sm font-semibold">{editingId ? 'Edit team member' : 'Add team member'}</h3></div><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2 text-xs font-semibold">Full name<input required autoComplete="name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className={inputClass}/></label>
      <label className="grid gap-2 text-xs font-semibold">Email<input type="email" autoComplete="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className={inputClass}/></label>
      <label className="grid gap-2 text-xs font-semibold">Phone<input type="tel" autoComplete="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className={inputClass}/></label>
      <label className="grid gap-2 text-xs font-semibold">Department<input value={form.department} onChange={e=>setForm({...form,department:e.target.value})} placeholder="Sales, Operations, Marketing" className={inputClass}/></label>
      <label className="grid gap-2 text-xs font-semibold">Role label<select value={form.role} onChange={e=>setForm({...form,role:e.target.value as TeamRole})} className={inputClass}><option>Owner</option><option>Admin</option><option>Manager</option><option>Executive</option><option>Staff</option></select></label>
      <label className="grid gap-2 text-xs font-semibold">Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as 'Active'|'Inactive'})} className={inputClass}><option>Active</option><option>Inactive</option></select></label>
      {error && <p role="alert" className="text-xs font-semibold text-[hsl(var(--destructive))] sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2"><button type="submit" className="min-h-11 rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-[hsl(var(--primary-foreground))]">{editingId ? 'Save changes' : 'Save member'}</button><button type="button" onClick={()=>setOpen(false)} className="min-h-11 rounded-xl border border-[hsl(var(--border))] px-4 text-sm font-semibold">Cancel</button></div>
    </form></SectionCard>}
    <SectionCard><div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]"><SearchField value={search} onChange={setSearch} placeholder="Search people, roles or departments"/><select value={filter} onChange={e=>setFilter(e.target.value as 'All'|'Active'|'Inactive')} className={inputClass}><option>All</option><option>Active</option><option>Inactive</option></select></div>
      {members.length===0?<EmptyState title={state.teamMembers.length ? 'No matching members' : 'Your team directory is empty'} description={state.teamMembers.length ? 'Try a different search or status filter.' : 'Add team members to keep their roles and contact details organised.'}/>:<div className="grid gap-2 md:grid-cols-2">{members.map(member=><div key={member.id} className="rounded-xl border border-[hsl(var(--border))] p-4"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[hsl(var(--muted))] text-sm font-bold">{member.name.slice(0,1).toUpperCase()}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold">{member.name}</p><span className={['rounded-full px-2 py-0.5 text-[10px] font-semibold',member.status==='Active'?'bg-emerald-500/10 text-emerald-700':'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'].join(' ')}>{member.status}</span></div><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{member.role}{member.department ? ` · ${member.department}` : ''}</p></div><button type="button" aria-label={`Edit ${member.name}`} onClick={()=>edit(member)} className="grid size-9 place-items-center rounded-lg border border-[hsl(var(--border))]"><Edit3 className="size-4"/></button></div><div className="mt-4 grid gap-2 text-xs text-[hsl(var(--muted-foreground))]">{member.email && <p className="flex items-center gap-2"><Mail className="size-3.5"/>{member.email}</p>}{member.phone && <p className="flex items-center gap-2"><Phone className="size-3.5"/>{member.phone}</p>}{!member.email&&!member.phone&&<p>No contact details added</p>}</div><div className="mt-3 flex items-center justify-between border-t border-[hsl(var(--border))] pt-3"><span className="flex items-center gap-1 text-[10px] text-[hsl(var(--muted-foreground))]"><ShieldCheck className="size-3"/> Directory record only</span><DeleteButton label="Remove" onClick={()=>deleteTeamMember(member.id)}/></div></div>)}</div>}
    </SectionCard>
    <p className="mt-3 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">This directory does not yet create login accounts, send invitations, or enforce access permissions. Those require the authenticated team backend in a later phase.</p>
  </PageFrame>;
}
