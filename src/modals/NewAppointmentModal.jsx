import { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import { Select } from '../components/Select';
import api from '../services/api';
import { formatISO } from 'date-fns';

export default function NewAppointmentModal({ open, onClose, onCreated }) {
  const [type, setType] = useState('group');
  const [clients, setClients] = useState([]);
  const [groups,  setGroups]  = useState([]);
  const [selection,setSelection]=useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [end,   setEnd]   = useState('');

  useEffect(()=>{
    if (open) {
      api.get('/clients').then(r=>setClients(r.data));
      api.get('/groups').then(r=>setGroups(r.data));
    }
  },[open]);

  const submit = async e => {
    e.preventDefault();
    const payload = {
      type,
      dateTimeStart: formatISO(new Date(`${date} ${start}`)),
      dateTimeEnd:   formatISO(new Date(`${date} ${end}`))
    };
    if (type==='group')     payload.group   = selection;
    if (type==='individual')payload.patient = selection;

    const { data } = await api.post('/appointments', payload);
    onCreated(data);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Appointment">
      <form onSubmit={submit} className="space-y-4">
        {/* Visit type toggle */}
        <div className="flex gap-2">
          {['group','individual'].map(v=>(
            <button key={v} type="button"
              onClick={()=>setType(v)}
              className={`flex-1 py-2 rounded-xl border
                          ${type===v
                            ? 'bg-primary text-white border-primary'
                            : 'bg-gray-100'}`}>
              {v.charAt(0).toUpperCase()+v.slice(1)}
            </button>
          ))}
        </div>

        <Select label={type==='group' ? 'Group' : 'Patient'}
                value={selection} onChange={e=>setSelection(e.target.value)} required>
          <option value="">Select…</option>
          {(type==='group'?groups:clients).map(o=>
            <option key={o._id} value={o._id}>{o.name}</option>
          )}
        </Select>

        <input type="date" value={date} onChange={e=>setDate(e.target.value)}
               className="w-full px-4 py-2 bg-gray-100 rounded-xl"/>

        <div className="flex gap-2">
          <input type="time" value={start} onChange={e=>setStart(e.target.value)}
                 className="flex-1 px-4 py-2 bg-gray-100 rounded-xl"/>
          <input type="time" value={end} onChange={e=>setEnd(e.target.value)}
                 className="flex-1 px-4 py-2 bg-gray-100 rounded-xl"/>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-primary text-primary">Cancel</button>
          <button className="px-6 py-2 rounded-xl bg-primary text-white">Confirm</button>
        </div>
      </form>
    </Modal>
  );
}
