import { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import { Input } from '../components/Input';
import api from '../services/api';
import ChipInput from '../components/ChipInput';
import MemberSelect from '../components/MemberSelect';   // ← new import

export default function NewGroupModal({ open, onClose, onCreated }) {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ name: '', members: [], goals: [] });
  const [file, setFile] = useState(null);

  /* fetch clients when modal opens */
  useEffect(() => {
    if (open) api.get('/clients').then(r => setClients(r.data));
  }, [open]);

  /* create group */
  const submit = async e => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', form.name);
    form.members.forEach(id => fd.append('patients', id));
    form.goals.forEach(g   => fd.append('goals', g));
    if (file) fd.append('avatar', file);

    const { data } = await api.post('/groups', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    onCreated(data);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Create New Group">
      <form onSubmit={submit} className="space-y-5">
        {/* avatar */}
        <input
          type="file"
          accept="image/*"
          onChange={e => setFile(e.target.files[0])}
          className="w-full border rounded-xl p-4 text-center text-sm cursor-pointer"
        />

        {/* name */}
        <Input
          label="Group Name"
          name="name"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          required
        />

        {/* searchable member picker */}
        <MemberSelect
          clients={clients}
          value={form.members}
          onChange={v => setForm(f => ({ ...f, members: v }))}
        />

        {/* goals */}
        <ChipInput
          label="Goals"
          value={form.goals}
          onChange={v => setForm(f => ({ ...f, goals: v }))}
          placeholder="Type and press Enter or Add"
        />

        {/* footer */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-primary text-primary">
            Cancel
          </button>
          <button className="px-6 py-2 rounded-xl bg-primary text-white">
            Confirm
          </button>
        </div>
      </form>
    </Modal>
  );
}
