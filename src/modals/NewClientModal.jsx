import { useState } from 'react';
import Modal from '../components/Modal';
import { Input } from '../components/Input';
import api from '../services/api';
import ChipInput from '../components/ChipInput';

export default function NewClientModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', age: '', pastHistory: [], goals: []
  });
  const [file, setFile] = useState(null);

  const change = e =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('age', form.age);
    form.pastHistory.forEach(h => fd.append('pastHistory', h));
    form.goals.forEach(g => fd.append('goals', g));
    if (file) fd.append('avatar', file);

    const { data } = await api.post('/clients', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    onCreated(data);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Create New Client">
      <form onSubmit={submit} className="space-y-5">
        {/* avatar */}
        <input
          type="file"
          accept="image/*"
          onChange={e => setFile(e.target.files[0])}
          className="w-full border rounded-xl p-4 text-center text-sm cursor-pointer"
        />

        <Input label="Name" name="name" value={form.name} onChange={change} required />
        <Input label="Age"  name="age"  value={form.age}  onChange={change} />

        {/* multi-chips */}
        <ChipInput
          label="Past History"
          value={form.pastHistory}
          onChange={v => setForm(f => ({ ...f, pastHistory: v }))}
          placeholder="Type and press Enter or Add"
        />
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
