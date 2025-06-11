// client/src/pages/NewAppointmentModal.jsx
import { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import { Select } from '../components/Select';
import api from '../services/api';
import { formatISO } from 'date-fns';

export default function NewAppointmentModal({ open, onClose, onCreated }) {
  const [clients, setClients] = useState([]);
  const [selection, setSelection] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  // fetch clients and reset on open
  useEffect(() => {
    if (!open) return;
    api.get('/clients').then(r => setClients(r.data));
    setSelection('');
    setDate('');
    setStart('');
    setEnd('');
  }, [open]);

  const submit = async e => {
    e.preventDefault();
    const payload = {
      type: 'individual',
      patient: selection,
      dateTimeStart: formatISO(new Date(`${date}T${start}`)),
      dateTimeEnd:   formatISO(new Date(`${date}T${end}`)),
    };
    const { data } = await api.post('/appointments', payload);
    onCreated(data);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Appointment">
      <form onSubmit={submit} className="space-y-4">
        {/* Patient selector */}
        <Select
          label="Patient"
          value={selection}
          onChange={e => setSelection(e.target.value)}
          required
        >
          <option value="">Select patient…</option>
          {clients.map(c => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </Select>

        {/* Date */}
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full px-4 py-2 bg-gray-100 rounded-xl"
          required
        />

        {/* Time */}
        <div className="flex gap-2">
          <input
            type="time"
            value={start}
            onChange={e => setStart(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-100 rounded-xl"
            required
          />
          <input
            type="time"
            value={end}
            onChange={e => setEnd(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-100 rounded-xl"
            required
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-primary text-primary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 rounded-xl bg-primary text-white"
          >
            Confirm
          </button>
        </div>
      </form>
    </Modal>
  );
}
